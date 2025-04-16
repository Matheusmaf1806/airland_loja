// server.js
const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

// Middleware para extrair o subdomínio da requisição
const subdomainMiddleware = require('./middleware/subdomain');
// Middleware para proteger as rotas (verifica se o usuário está logado)
const authMiddleware = require('./middleware/authMiddleware');

const app = express();

// 1) Configuração do cookie de sessão (expira em 1 hora)
app.use(cookieSession({
  name: 'session',
  secret: process.env.SUPABASE_JWT_SECRET,
  maxAge: 60 * 60 * 1000,   // 1 hora
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax'
}));

// 2) Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3) Extrai subdomínio (se você usa white‑label por subdomínio)
app.use(subdomainMiddleware);

// 4) Serve estáticos públicos não sensíveis (CSS, JS, imagens)
console.log("Assets folder path: ", path.join(__dirname, 'assets'));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// 5) Protege todas as rotas e páginas em /agente
app.use(
  '/agente',
  authMiddleware,                                  // só continua se estiver logado
  express.static(path.join(__dirname, 'agente'))   // então serve painel, etc.
);

// 6) Serve o restante dos arquivos estáticos públicos (loginagente.html, etc.)
app.use(express.static(path.join(__dirname)));

// 7) Inicializa o cliente Supabase
const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias.');
}
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Em memória para controle de tentativas de login
let loginAttempts = {};

// --- ENDPOINTS ---

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const subdomain = req.subdomain;
  if (!subdomain) {
    return res.status(400).json({ error: "Subdomínio não identificado." });
  }

  // Busca afiliado pelo subdomínio
  const { data: affiliate, error: affErr } = await supabase
    .from('affiliates')
    .select('*')
    .or(`subdomain.eq.${subdomain},subdomain.eq.${subdomain}.airland.com.br`)
    .single();
  if (affErr || !affiliate) {
    return res.status(400).json({ error: "Afiliado não encontrado." });
  }

  // Limita 5 tentativas a cada 3h
  const key = `${email}_${affiliate.id}`;
  const current = loginAttempts[key] || { count: 0, lastAttempt: 0 };
  const threeHours = 3 * 60 * 60 * 1000;
  if (current.count >= 5 && (Date.now() - current.lastAttempt) < threeHours) {
    return res.status(429).json({ error: "Muitas tentativas falhas. Tente mais tarde." });
  }

  // Busca usuário
  const { data: user, error: userErr } = await supabase
    .from('user_affiliates')
    .select('*')
    .eq('email', email)
    .eq('affiliate_id', affiliate.id)
    .single();
  if (userErr || !user) {
    loginAttempts[key] = { count: current.count + 1, lastAttempt: Date.now() };
    return res.status(400).json({ error: "Email ou senha inválidos." });
  }

  // Verifica senha
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    loginAttempts[key] = { count: current.count + 1, lastAttempt: Date.now() };
    return res.status(400).json({ error: "Email ou senha inválidos." });
  }

  // Zera contador e grava sessão
  loginAttempts[key] = { count: 0, lastAttempt: Date.now() };
  req.session.user = {
    id:           user.id,
    email:        user.email,
    affiliate_id: affiliate.id,
    nome:         `${user.primeiro_nome} ${user.ultimo_nome}`,
  };

  return res.json({ success: true, redirect: "/agente/painel-vendas.html" });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session = null;
  return res.json({ success: true, redirect: '/agente/loginagente.html' });
});

// Gera hash de teste
app.get('/api/gerar-hash', async (req, res) => {
  try {
    const hash = await bcrypt.hash("Teste123!", 10);
    return res.json({ hash });
  } catch (err) {
    console.error("Erro ao gerar hash:", err);
    return res.status(500).json({ error: "Erro ao gerar hash" });
  }
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
