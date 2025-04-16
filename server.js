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

// Configuração do cookie de sessão (expira em 1 hora)
app.use(cookieSession({
  name: 'session',
  secret: process.env.SUPABASE_JWT_SECRET,
  maxAge: 60 * 60 * 1000,   // 1 hora
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax'
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Aplica o middleware para extrair o subdomínio da requisição
app.use(subdomainMiddleware);

console.log("Assets folder path: ", path.join(__dirname, 'assets'));

// Monta explicitamente a pasta "assets" para servir arquivos estáticos
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Serve os arquivos estáticos da raiz (HTML, etc.)
app.use(express.static(path.join(__dirname)));

// Protege as rotas da área "agente": somente usuários autenticados podem acessá-las.
app.use('/agente', authMiddleware, express.static(path.join(__dirname, 'agente')));

// Inicializa o cliente do Supabase utilizando as variáveis de ambiente configuradas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Objeto para controlar as tentativas de login (em memória)
let loginAttempts = {};

// Endpoint para login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const subdomain = req.subdomain;
  
  if (!subdomain) {
    return res.status(400).json({ error: "Subdomínio não identificado." });
  }
  
  const { data: affiliate, error: affiliateError } = await supabase
    .from('affiliates')
    .select('*')
    .or(`subdomain.eq.${subdomain},subdomain.eq.${subdomain}.airland.com.br`)
    .single();
  
  if (affiliateError || !affiliate) {
    return res.status(400).json({ error: "Afiliado não encontrado." });
  }
  
  const attemptKey = `${email}_${affiliate.id}`;
  const currentAttempt = loginAttempts[attemptKey] || { count: 0, lastAttempt: 0 };
  const threeHours = 3 * 60 * 60 * 1000;
  
  if (currentAttempt.count >= 5 && (Date.now() - currentAttempt.lastAttempt) < threeHours) {
    return res.status(429).json({ error: "Muitas tentativas falhas. Tente novamente mais tarde." });
  }
  
  const { data: user, error: userError } = await supabase
    .from('user_affiliates')
    .select('*')
    .eq('email', email)
    .eq('affiliate_id', affiliate.id)
    .single();
  
  if (userError || !user) {
    loginAttempts[attemptKey] = { count: currentAttempt.count + 1, lastAttempt: Date.now() };
    return res.status(400).json({ error: "Email ou senha inválidos." });
  }
  
  // Logs para depuração da comparação da senha
  const passwordMatch = await bcrypt.compare(password, user.password);
  console.log("Senha digitada:", password);
  console.log("Hash armazenado:", user.password);
  console.log("passwordMatch:", passwordMatch);

  if (!passwordMatch) {
    loginAttempts[attemptKey] = { count: currentAttempt.count + 1, lastAttempt: Date.now() };
    return res.status(400).json({ error: "Email ou senha inválidos." });
  }
  
  loginAttempts[attemptKey] = { count: 0, lastAttempt: Date.now() };
  
  req.session.user = {
    id: user.id,
    email: user.email,
    affiliate_id: affiliate.id,
    nome: user.primeiro_nome + " " + user.ultimo_nome,
  };
  
  return res.json({ success: true, redirect: "/agente/painel-vendas.html" });
});

// Endpoint para logout
app.post('/api/logout', (req, res) => {
  req.session = null;
  return res.json({ success: true, redirect: '/loginagente.html' });
});

// Endpoint temporário para gerar hash para "Teste123!"
app.get('/api/gerar-hash', async (req, res) => {
  const senha = "Teste123!";
  try {
    const hash = await bcrypt.hash(senha, 10);
    return res.json({ hash });
  } catch (err) {
    console.error("Erro ao gerar hash:", err);
    return res.status(500).json({ error: "Erro ao gerar hash" });
  }
});

// Define a porta e inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
