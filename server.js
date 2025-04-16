// server.js
const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const subdomainMiddleware = require('./middleware/subdomain');
const authMiddleware    = require('./middleware/authMiddleware');

const app = express();

// 1) Sessão via cookie (1h de vida)
app.use(cookieSession({
  name: 'session',
  secret: process.env.SUPABASE_JWT_SECRET,
  maxAge: 60 * 60 * 1000,        // 1 hora
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax'
}));

// 2) Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3) White‑label por subdomínio (se usar)
app.use(subdomainMiddleware);

// 4) Estáticos públicos: CSS, JS, imagens
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// 5) Rota pública de login (dentro de /agente, mas sem exigir sessão)
app.get('/agente/loginagente.html', (req, res) => {
  return res.sendFile(path.join(__dirname, 'agente', 'loginagente.html'));
});

// 6) Protege tudo em /agente (exceto login acima)
//    - se não estiver logado, authMiddleware fará redirect para '/agente/loginagente.html'
app.use(
  '/agente',
  authMiddleware,
  express.static(path.join(__dirname, 'agente'))
);

// 7) Demais arquivos estáticos públicos (home, páginas de marketing, etc.)
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

// --- ENDPOINTS ---

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const subdomain = req.subdomain;
  if (!subdomain) {
    return res.status(400).json({ error: 'Subdomínio não identificado.' });
  }

  // 1) Busca afiliado
  const { data: affiliate, error: affErr } = await supabase
    .from('affiliates')
    .select('*')
    .or(`subdomain.eq.${subdomain},subdomain.eq.${subdomain}.airland.com.br`)
    .single();
  if (affErr || !affiliate) {
    return res.status(400).json({ error: 'Afiliado não encontrado.' });
  }

  // 2) Limita 5 tentativas a cada 3h
  const key = `${email}_${affiliate.id}`;
  const current = loginAttempts[key] || { count: 0, lastAttempt: 0 };
  const threeHours = 3 * 60 * 60 * 1000;
  if (current.count >= 5 && (Date.now() - current.lastAttempt) < threeHours) {
    return res.status(429).json({ error: 'Muitas tentativas falhas. Tente mais tarde.' });
  }

  // 3) Busca usuário
  const { data: user, error: userErr } = await supabase
    .from('user_affiliates')
    .select('*')
    .eq('email', email)
    .eq('affiliate_id', affiliate.id)
    .single();
  if (userErr || !user) {
    loginAttempts[key] = { count: current.count + 1, lastAttempt: Date.now() };
    return res.status(400).json({ error: 'Email ou senha inválidos.' });
  }

  // 4) Valida senha
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    loginAttempts[key] = { count: current.count + 1, lastAttempt: Date.now() };
    return res.status(400).json({ error: 'Email ou senha inválidos.' });
  }

  // 5) Autenticação OK: zera contador e guarda sessão
  loginAttempts[key] = { count: 0, lastAttempt: Date.now() };
  req.session.user = {
    id:           user.id,
    email:        user.email,
    affiliate_id: affiliate.id,
    nome:         `${user.primeiro_nome} ${user.ultimo_nome}`
  };

  return res.json({ success: true, redirect: '/agente/painel-vendas.html' });
});

// POST /api/logout
app.post('/api/logout', (req, res) => {
  req.session = null;
  return res.json({ success: true, redirect: '/agente/loginagente.html' });
});

// GET /api/gerar-hash (apenas para teste)
app.get('/api/gerar-hash', async (req, res) => {
  try {
    const hash = await bcrypt.hash('Teste123!', 10);
    return res.json({ hash });
  } catch (err) {
    console.error('Erro ao gerar hash:', err);
    return res.status(500).json({ error: 'Erro ao gerar hash' });
  }
});

// Inicia servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
