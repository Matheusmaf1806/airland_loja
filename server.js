// server.js
const express          = require('express');
const path             = require('path');
const cookieSession    = require('cookie-session');
const { createClient } = require('@supabase/supabase-js');
const bcrypt           = require('bcrypt');

const subdomainMiddleware = require('./middleware/subdomain');
const authMiddleware     = require('./middleware/authMiddleware');

const app = express();

// 1) Sessão via cookie (1h de vida)
app.use(cookieSession({
  name:       'session',
  secret:     process.env.SESSION_SECRET,
  maxAge:     60 * 60 * 1000, // 1 hora
  httpOnly:   true,
  sameSite:   'lax',
}));

// 2) Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3) White‑label por subdomínio
app.use(subdomainMiddleware);

// 4) Assets públicos
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// 5) Rota pública de login
app.get('/agente/loginagente.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'agente', 'loginagente.html'));
});

// 6) Protege todas as rotas em /agente (exceto o login acima)
app.use(
  '/agente',
  authMiddleware,
  express.static(path.join(__dirname, 'agente'))
);

// 7) Outras páginas públicas
app.use(express.static(path.join(__dirname)));

// 8) Inicializa Supabase
const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Faltam SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nas vars de ambiente');
}
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Em memória: controle de tentativas de login
let loginAttempts = {};

/**
 * GET /api/me
 * Retorna dados do usuário logado *e* do afiliado (logo_url) para popular o perfil
 */
app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const sessionUser = req.session.user;
    // já temos tudo salvo na sessão?
    if (sessionUser.primeiro_nome && sessionUser.fotodeperfil && sessionUser.affiliate_id) {
      // busca também o logo do afiliado
      const { data: aff, error: affErr } = await supabase
        .from('affiliates')
        .select('logo_url')
        .eq('id', sessionUser.affiliate_id)
        .single();
      if (affErr) throw affErr;

      return res.json({
        primeiro_nome: sessionUser.primeiro_nome,
        ultimo_nome:   sessionUser.ultimo_nome,
        email:         sessionUser.email,
        fotodeperfil:  sessionUser.fotodeperfil,
        logo_url:      aff.logo_url
      });
    }

    // caso contrário, refazemos a consulta ao Supabase
    const { data: user, error: userErr } = await supabase
      .from('user_affiliates')
      .select('primeiro_nome, ultimo_nome, email, fotodeperfil, affiliate_id')
      .eq('id', req.session.user.id)
      .single();
    if (userErr) throw userErr;

    const { data: aff2, error: aff2Err } = await supabase
      .from('affiliates')
      .select('logo_url')
      .eq('id', user.affiliate_id)
      .single();
    if (aff2Err) throw aff2Err;

    // atualiza sessão para próximas requisições
    req.session.user = {
      ...req.session.user,
      primeiro_nome: user.primeiro_nome,
      ultimo_nome:   user.ultimo_nome,
      email:         user.email,
      fotodeperfil:  user.fotodeperfil,
      affiliate_id:  user.affiliate_id
    };

    res.json({
      primeiro_nome: user.primeiro_nome,
      ultimo_nome:   user.ultimo_nome,
      email:         user.email,
      fotodeperfil:  user.fotodeperfil,
      logo_url:      aff2.logo_url
    });

  } catch (err) {
    console.error('Erro em GET /api/me:', err);
    res.status(500).json({ error: 'Não foi possível obter perfil' });
  }
});

// --- POST /api/login ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const subdomain = req.subdomain;
  if (!subdomain) {
    return res.status(400).json({ error: 'Subdomínio não identificado.' });
  }

  // Busca afiliado
  const { data: affiliate, error: affErr } = await supabase
    .from('affiliates')
    .select('id')
    .or(`subdomain.eq.${subdomain},subdomain.eq.${subdomain}.airland.com.br`)
    .single();
  if (affErr || !affiliate) {
    return res.status(400).json({ error: 'Afiliado não encontrado.' });
  }

  // Limita 5 tentativas em 3h
  const key = `${email}_${affiliate.id}`;
  const curr = loginAttempts[key] || { count: 0, lastAttempt: 0 };
  const threeHours = 3 * 60 * 60 * 1000;
  if (curr.count >= 5 && (Date.now() - curr.lastAttempt) < threeHours) {
    return res.status(429).json({ error: 'Muitas tentativas falhas. Tente mais tarde.' });
  }

  // Busca usuário
  const { data: user, error: usrErr } = await supabase
    .from('user_affiliates')
    .select('id, primeiro_nome, ultimo_nome, email, password, fotodeperfil')
    .eq('email', email)
    .eq('affiliate_id', affiliate.id)
    .single();
  if (usrErr || !user) {
    loginAttempts[key] = { count: curr.count + 1, lastAttempt: Date.now() };
    return res.status(400).json({ error: 'Email ou senha inválidos.' });
  }

  // Verifica senha
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    loginAttempts[key] = { count: curr.count + 1, lastAttempt: Date.now() };
    return res.status(400).json({ error: 'Email ou senha inválidos.' });
  }

  // Autenticação OK: zera contador e salva campos na sessão
  loginAttempts[key] = { count: 0, lastAttempt: Date.now() };
  req.session.user = {
    id:             user.id,
    email:          user.email,
    affiliate_id:   affiliate.id,
    primeiro_nome:  user.primeiro_nome,
    ultimo_nome:    user.ultimo_nome,
    fotodeperfil:   user.fotodeperfil
  };

  res.json({ success: true, redirect: '/agente/painel-vendas.html' });
});

// --- POST /api/logout ---
app.post('/api/logout', (req, res) => {
  req.session = null;
  res.json({ success: true, redirect: '/agente/loginagente.html' });
});

// --- GET /api/gerar-hash (teste) ---
app.get('/api/gerar-hash', async (req, res) => {
  try {
    const hash = await bcrypt.hash('Teste123!', 10);
    res.json({ hash });
  } catch (err) {
    console.error('Erro ao gerar hash:', err);
    res.status(500).json({ error: 'Erro ao gerar hash' });
  }
});

// --- GET /api/agent/pedidos ---
// Filtra por data_venda e só retorna do affiliate logado
app.get('/api/agent/pedidos', authMiddleware, async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || !user.affiliate_id) {
      return res.status(401).json({ error: 'Não autorizado.' });
    }

    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate e endDate são obrigatórios.' });
    }

    const { data, error } = await supabase
      .from('supplier_pedidos')
      .select('*')
      .eq('affiliate_id', user.affiliate_id)
      .gte('data_venda', startDate)
      .lte('data_venda', endDate)
      .order('data_venda', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Erro em GET /api/agent/pedidos:', err);
    res.status(500).json({ error: err.message });
  }
});

// Inicia servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
