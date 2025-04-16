// server.js
const express         = require('express');
const path            = require('path');
const cookieSession   = require('cookie-session');
const { createClient } = require('@supabase/supabase-js');
const bcrypt          = require('bcrypt');

const subdomainMiddleware = require('./middleware/subdomain');
const authMiddleware     = require('./middleware/authMiddleware');

const app = express();

// 1) Sessão via cookie (1h de vida)
app.use(cookieSession({
  name: 'session',
  secret: process.env.SESSION_SECRET,
  maxAge: 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax',
}));

// 2) Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3) White‑label por subdomínio (se usar)
app.use(subdomainMiddleware);

// 4) Arquivos públicos não-sensiveis (CSS, JS, imagens)
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// 5) Rota pública de login (antes do authMiddleware!)
app.get('/agente/loginagente.html', (req, res) => {
  return res.sendFile(path.join(__dirname, 'agente', 'loginagente.html'));
});

// 6) Protege tudo que vier em /agente **exceto** o login acima
app.use(
  '/agente',
  authMiddleware,                                  // só continua se estiver logado
  express.static(path.join(__dirname, 'agente'))   // então serve painel, etc.
);

// 7) Demais estáticos públicos (home, marketing, outras páginas fora de /agente)
app.use(express.static(path.join(__dirname)));

// 8) Inicializa cliente Supabase
const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Faltam SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nas vars de ambiente');
}
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Em memória: controle de tentativas de login
let loginAttempts = {};

// --- ENDPOINT: LOGIN ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const subdomain = req.subdomain;
  if (!subdomain) {
    return res.status(400).json({ error: 'Subdomínio não identificado.' });
  }

  // Busca afiliado
  const { data: affiliate, error: affErr } = await supabase
    .from('affiliates')
    .select('*')
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
    .select('*')
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

  // Autenticação OK
  loginAttempts[key] = { count: 0, lastAttempt: Date.now() };
  req.session.user = {
    id:           user.id,
    email:        user.email,
    affiliate_id: affiliate.id,
    nome:         `${user.primeiro_nome} ${user.ultimo_nome}`
  };

  return res.json({ success: true, redirect: '/agente/painel-vendas.html' });
});

// --- ENDPOINT: LOGOUT ---
app.post('/api/logout', (req, res) => {
  req.session = null;
  return res.json({ success: true, redirect: '/agente/loginagente.html' });
});

// --- ENDPOINT: GERAR HASH (teste) ---
app.get('/api/gerar-hash', async (req, res) => {
  try {
    const hash = await bcrypt.hash('Teste123!', 10);
    return res.json({ hash });
  } catch (err) {
    console.error('Erro ao gerar hash:', err);
    return res.status(500).json({ error: 'Erro ao gerar hash' });
  }
});

// --- ENDPOINT: BUSCA DE PEDIDOS ---
app.get('/api/agent/pedidos', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Parâmetros startDate e endDate são obrigatórios.' });
    }

    const { data, error } = await supabase
      .from('supplier_pedidos')
      .select('*')
      .gte('data_venda', startDate)
      .lte('data_venda', endDate)
      .order('data_venda', { ascending: false });

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('Erro ao buscar pedidos:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Inicia servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
