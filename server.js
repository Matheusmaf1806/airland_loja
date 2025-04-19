///////////////////////////////////////////////////////////
// server.js - Versão Única Integrada (ESM + CJS)
// Integrações: Hotelbeds, PayPal, Braintree, Malga (tokenização + 3DS), hbacti,
// Rotas: /api/checkoutComplete, /api/orderInit, /api/orderComplete, /api/autocomplete, /api/footer
// Sessão, subdomínio, Supabase, White‑label, /agente, /api/me, /api/login, /api/agent/pedidos
///////////////////////////////////////////////////////////

import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import cookieSession from 'cookie-session'
import bcrypt from 'bcrypt'
import fetch from 'node-fetch'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Middlewares customizados
import subdomainMiddleware from './middleware/subdomain.js'
import authMiddleware from './middleware/authMiddleware.js'

// Rotas modulares
import ticketsGenieRouter from './routes/ticketsgenie.routes.js'
import hbdetailRouter from './routes/hbdetail.js'
import cartRoutes from './routes/cart.routes.js'
import getLatestDollar from './routes/getLatestDollar.js'
import userRoutes from './routes/user.routes.js'
import { getAffiliateColors } from './routes/affiliateColors.js'
import payRouter from './routes/pay.routes.js'               // PayPal
import { malgaRouter } from './routes/malga.routes.js'       // Malga tokenização + 3DS
import hbactiRouter from './routes/hbacti.js'               // Hotelbeds Activities
import checkoutRouter from './routes/checkoutRoutes.js'     // /api/checkoutComplete
import orderInitRoutes from './routes/orderInit.js'         // /api/orderInit
import orderCompleteRoutes from './routes/orderComplete.js' // /api/orderComplete
import autocompleteRouter from './routes/autocomplete.js'    // /api/autocomplete
import ticketsRouter from './routes/tickets.routes.js'      // /api/tickets

// Braintree
import { gateway } from './api/braintree.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())

// 1) Sessão via cookie (1h de vida)
app.use(cookieSession({
  name:       'session',
  secret:     process.env.SESSION_SECRET,
  maxAge:     60 * 60 * 1000,
  httpOnly:   true,
  sameSite:   'lax',
}))

// 2) Body parsers
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 3) White‑label por subdomínio
app.use(subdomainMiddleware)

// 4) Assets públicos
app.use('/assets', express.static(path.join(__dirname, 'assets')))
app.use(express.static(path.join(__dirname, 'public')))

// 5) Rota pública de login
app.get('/agente/loginagente.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'agente', 'loginagente.html'))
})

// 6) Protege todas as rotas em /agente (exceto o login acima)
app.use(
  '/agente',
  authMiddleware,
  express.static(path.join(__dirname, 'agente'))
)

// 7) Inicializa Supabase (Service Role Key)
const supabaseUrl    = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Faltam SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nas vars de ambiente')
}
const supabase = createClient(supabaseUrl, serviceRoleKey)

// Em memória: controle de tentativas de login
let loginAttempts = {}

/**
 * GET /api/me
 * Retorna dados do usuário logado *e* do afiliado (logo_url) para popular o perfil
 */
app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const sessionUser = req.session.user
    if (sessionUser.primeiro_nome && sessionUser.fotodeperfil && sessionUser.affiliate_id) {
      const { data: aff, error: affErr } = await supabase
        .from('affiliates')
        .select('logo_url')
        .eq('id', sessionUser.affiliate_id)
        .single()
      if (affErr) throw affErr

      return res.json({
        primeiro_nome: sessionUser.primeiro_nome,
        ultimo_nome:   sessionUser.ultimo_nome,
        email:         sessionUser.email,
        fotodeperfil:  sessionUser.fotodeperfil,
        logo_url:      aff.logo_url
      })
    }

    const { data: user, error: userErr } = await supabase
      .from('user_affiliates')
      .select('primeiro_nome, ultimo_nome, email, fotodeperfil, affiliate_id')
      .eq('id', req.session.user.id)
      .single()
    if (userErr) throw userErr

    const { data: aff2, error: aff2Err } = await supabase
      .from('affiliates')
      .select('logo_url')
      .eq('id', user.affiliate_id)
      .single()
    if (aff2Err) throw aff2Err

    req.session.user = {
      ...req.session.user,
      primeiro_nome: user.primeiro_nome,
      ultimo_nome:   user.ultimo_nome,
      email:         user.email,
      fotodeperfil:  user.fotodeperfil,
      affiliate_id:  user.affiliate_id
    }

    res.json({
      primeiro_nome: user.primeiro_nome,
      ultimo_nome:   user.ultimo_nome,
      email:         user.email,
      fotodeperfil:  user.fotodeperfil,
      logo_url:      aff2.logo_url
    })
  } catch (err) {
    console.error('Erro em GET /api/me:', err)
    res.status(500).json({ error: 'Não foi possível obter perfil' })
  }
})

/**
 * POST /api/login
 */
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body
  const subdomain = req.subdomain
  if (!subdomain) {
    return res.status(400).json({ error: 'Subdomínio não identificado.' })
  }

  const { data: affiliate, error: affErr } = await supabase
    .from('affiliates')
    .select('id')
    .or(`subdomain.eq.${subdomain},subdomain.eq.${subdomain}.airland.com.br`)
    .single()
  if (affErr || !affiliate) {
    return res.status(400).json({ error: 'Afiliado não encontrado.' })
  }

  const key = `${email}_${affiliate.id}`
  const curr = loginAttempts[key] || { count: 0, lastAttempt: 0 }
  const threeHours = 3 * 60 * 60 * 1000
  if (curr.count >= 5 && (Date.now() - curr.lastAttempt) < threeHours) {
    return res.status(429).json({ error: 'Muitas tentativas falhas. Tente mais tarde.' })
  }

  const { data: user, error: usrErr } = await supabase
    .from('user_affiliates')
    .select('id, primeiro_nome, ultimo_nome, email, password, fotodeperfil')
    .eq('email', email)
    .eq('affiliate_id', affiliate.id)
    .single()
  if (usrErr || !user) {
    loginAttempts[key] = { count: curr.count + 1, lastAttempt: Date.now() }
    return res.status(400).json({ error: 'Email ou senha inválidos.' })
  }

  const match = await bcrypt.compare(password, user.password)
  if (!match) {
    loginAttempts[key] = { count: curr.count + 1, lastAttempt: Date.now() }
    return res.status(400).json({ error: 'Email ou senha inválidos.' })
  }

  loginAttempts[key] = { count: 0, lastAttempt: Date.now() }
  req.session.user = {
    id:             user.id,
    email:          user.email,
    affiliate_id:   affiliate.id,
    primeiro_nome:  user.primeiro_nome,
    ultimo_nome:    user.ultimo_nome,
    fotodeperfil:   user.fotodeperfil
  }

  res.json({ success: true, redirect: '/agente/painel-vendas.html' })
})

/**
 * POST /api/logout
 */
app.post('/api/logout', (req, res) => {
  req.session = null
  res.json({ success: true, redirect: '/agente/loginagente.html' })
})

/**
 * GET /api/gerar-hash (teste)
 */
app.get('/api/gerar-hash', async (req, res) => {
  try {
    const hash = await bcrypt.hash('Teste123!', 10)
    res.json({ hash })
  } catch (err) {
    console.error('Erro ao gerar hash:', err)
    res.status(500).json({ error: 'Erro ao gerar hash' })
  }
})

/**
 * GET /api/agent/pedidos
 */
app.get('/api/agent/pedidos', authMiddleware, async (req, res) => {
  try {
    const user = req.session.user
    if (!user || !user.affiliate_id) {
      return res.status(401).json({ error: 'Não autorizado.' })
    }
    const affiliateId = user.affiliate_id

    const rawQuery = req.url.split('?')[1] || ''
    const params   = new URLSearchParams(rawQuery)

    let id        = params.get('id')
    let startDate = params.get('startDate')
    let endDate   = params.get('endDate')

    if (!id && !startDate && !endDate && rawQuery) {
      if (/^\d+$/.test(rawQuery)) {
        id = rawQuery
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawQuery)) {
        startDate = endDate = rawQuery
      }
    }

    let data, error

    if (id) {
      ({ data, error } = await supabase
        .from('supplier_pedidos')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .eq('id', id)
        .single()
      )
    } else {
      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'Informe id (ex: ?id=47), data (ex: ?2023-04-17) ou intervalo (?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD).'
        })
      }
      ({ data, error } = await supabase
        .from('supplier_pedidos')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .gte('data_venda', startDate)
        .lte('data_venda', endDate)
        .order('data_venda', { ascending: false })
      )
    }

    if (error) throw error
    res.status(200).json(data)
  } catch (err) {
    console.error('Erro em GET /api/agent/pedidos:', err)
    res.status(500).json({ error: err.message })
  }
})

//
// ==== Rotas de Integrações e APIs Modulares ====
//

// TicketsGenie
app.use('/api/ticketsgenie', ticketsGenieRouter)
// Hotelbeds detail
app.use('/api/hbdetail', hbdetailRouter)
// Carrinho genérico
app.use('/api', cartRoutes)
// Cotação do dólar
app.get('/api/getLatestDollar', getLatestDollar)
// Usuários
app.use('/api/users', userRoutes)
// Cores do afiliado
app.get('/api/affiliateColors', getAffiliateColors)
// PayPal
app.use('/api/pay', payRouter)
// Malga (tokenização + 3DS)
app.use('/api/malga', malgaRouter)
// Hotelbeds Activities
app.use('/api/hbacti', hbactiRouter)
// Checkout completo
app.use('/api', checkoutRouter)
// Order Init
app.use('/api/orderInit', orderInitRoutes)
// Order Complete
app.use('/api/orderComplete', orderCompleteRoutes)
// Autocomplete
app.use('/api/autocomplete', autocompleteRouter)
// Tickets Hotelbeds
app.use('/api/tickets', ticketsRouter)

/**
 * GET /api/footer
 */
app.get('/api/footer', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('footer')
      .select('cnpj, whatsapp1, whatsapp2, whatsapp3, email, facebook, instagram, youtube, tiktok, linkedin')
      .order('id', { ascending: true })
      .limit(1)
    if (error) throw error
    res.json(data[0] || {})
  } catch (err) {
    console.error('Erro ao buscar footer:', err)
    res.status(500).json({ error: 'Erro interno ao buscar dados do footer' })
  }
})

/**
 * Rota de teste raiz
 */
app.get('/', (req, res) => {
  res.send('Olá, API rodando com ESM, Express e integrações Hotelbeds, PayPal, Braintree, Malga e Autocomplete!')
})

/**
 * POST /checkout (form-handling-tokenization Malga)
 */
app.post('/checkout', async (req, res) => {
  try {
    console.log('Dados recebidos do formulário Malga:', req.body)
    return res.json({ data: JSON.stringify(req.body, null, 2) })
  } catch (error) {
    console.error('Erro no /checkout:', error)
    return res.json({ status: 'failed', error: error.message })
  }
})

/**
 * Função para gerar assinatura (Hotelbeds - Hotels API)
 */
function generateSignature() {
  const publicKey  = process.env.API_KEY_HH
  const privateKey = process.env.SECRET_KEY_HH
  const utcDate    = Math.floor(Date.now() / 1000)
  const assemble   = `${publicKey}${privateKey}${utcDate}`
  return crypto.createHash('sha256').update(assemble).digest('hex')
}

/**
 * GET /api/hotelbeds/hotels
 */
app.get('/api/hotelbeds/hotels', async (req, res) => {
  try {
    const { checkIn, checkOut, destination } = req.query
    const roomsCount = parseInt(req.query.rooms || '1')

    let occupancies = []
    for (let i = 1; i <= roomsCount; i++) {
      const adParam = `adults${i}`
      const chParam = `children${i}`
      const ad = parseInt(req.query[adParam] || '2')
      const ch = parseInt(req.query[chParam] || '0')
      occupancies.push({ rooms: 1, adults: ad, children: ch })
    }

    const finalCheckIn  = checkIn  || '2025-06-15'
    const finalCheckOut = checkOut || '2025-06-16'
    const finalDest     = destination || 'MCO'

    const signature = generateSignature()
    const url       = 'https://api.test.hotelbeds.com/hotel-api/1.0/hotels'
    const myHeaders = {
      'Api-key':       process.env.API_KEY_HH,
      'X-Signature':   signature,
      'Content-Type':  'application/json',
      Accept:          'application/json'
    }

    const bodyData = {
      stay:        { checkIn: finalCheckIn, checkOut: finalCheckOut },
      occupancies,
      destination: { code: finalDest }
    }

    const response = await fetch(url, {
      method:  'POST',
      headers: myHeaders,
      body:    JSON.stringify(bodyData)
    })

    const result = await response.json()
    if (!response.ok) {
      return res.status(response.status).json({
        error: result.error || 'Erro na API Hotelbeds (Booking)'
      })
    }
    return res.json(result)
  } catch (err) {
    console.error('Erro ao buscar hotéis:', err)
    res.status(500).json({ error: 'Erro interno ao buscar hotéis' })
  }
})

/**
 * GET /api/hotelbeds/hotel-content
 */
app.get('/api/hotelbeds/hotel-content', async (req, res) => {
  try {
    const { hotelCode } = req.query
    if (!hotelCode) {
      return res.status(400).json({
        error: "O parâmetro 'hotelCode' é obrigatório."
      })
    }

    const signature = generateSignature()
    const url       = `https://api.test.hotelbeds.com/hotel-content-api/1.0/hotels/${hotelCode}`
    const headers   = {
      'Api-key':       process.env.API_KEY_HH,
      'X-Signature':   signature,
      'Content-Type':  'application/json',
      Accept:          'application/json'
    }

    const response = await fetch(url, { method: 'GET', headers })
    const result   = await response.json()
    if (!response.ok) {
      return res.status(response.status).json({
        error: result.error || 'Erro na API Hotelbeds (Content)'
      })
    }
    return res.json(result)
  } catch (err) {
    console.error('Erro ao buscar conteúdo detalhado do hotel:', err)
    res.status(500).json({ error: 'Erro interno ao buscar conteúdo detalhado do hotel' })
  }
})

/**
 * POST /proxy-hotelbeds (opcional)
 */
app.post('/proxy-hotelbeds', async (req, res) => {
  try {
    const signature = generateSignature()
    const url       = 'https://api.test.hotelbeds.com/hotel-api/1.0/hotels'
    const myHeaders = {
      'Api-key':       process.env.API_KEY_HH,
      'X-Signature':   signature,
      'Content-Type':  'application/json',
      Accept:          'application/json'
    }

    const bodyData = {
      stay:        {
        checkIn:  req.body.checkIn  || '2025-06-15',
        checkOut: req.body.checkOut || '2025-06-16'
      },
      occupancies: [{ rooms: 1, adults: 1, children: 0 }],
      destination: { code: req.body.destination || 'MCO' }
    }

    const response = await fetch(url, {
      method:  'POST',
      headers: myHeaders,
      body:    JSON.stringify(bodyData)
    })

    const result = await response.json()
    if (!response.ok) {
      return res.status(response.status).json({
        error: result.error || 'Erro na API Hotelbeds'
      })
    }
    return res.json(result)
  } catch (err) {
    console.error('Erro ao buscar dados dos hotéis:', err)
    res.status(500).json({ error: 'Erro interno ao buscar hotéis' })
  }
})

//
// ==== Braintree ====
//

app.get('/api/braintree/get-client-token', async (req, res) => {
  try {
    const response = await gateway.clientToken.generate({})
    res.json({ clientToken: response.clientToken })
  } catch (error) {
    console.error('Erro ao gerar client token Braintree:', error)
    res.status(500).json({ error: 'Erro ao gerar client token' })
  }
})

app.post('/api/braintree/create-transaction', async (req, res) => {
  const { paymentMethodNonce, amount } = req.body
  try {
    const saleRequest = {
      amount,
      paymentMethodNonce,
      options: { submitForSettlement: true }
    }
    const result = await gateway.transaction.sale(saleRequest)
    if (result.success) {
      return res.json({
        success:       true,
        transactionId: result.transaction.id
      })
    } else {
      return res.status(500).json({ success: false, message: result.message })
    }
  } catch (error) {
    console.error('Erro ao criar transação Braintree:', error)
    res.status(500).json({ success: false, message: error.toString() })
  }
})

// Inicia servidor
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})

export default app
