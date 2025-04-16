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
// Utilize uma variável de ambiente adequada para a chave, como SUPABASE_JWT_SECRET
app.use(cookieSession({
  name: 'session',
  secret: process.env.SUPABASE_JWT_SECRET, // ou process.env.SESSION_SECRET se preferir uma variável separada
  maxAge: 60 * 60 * 1000, // 1 hora
}));

// Permite o parsing de JSON e de dados codificados em URL
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Aplica o middleware para extrair o subdomínio da requisição
app.use(subdomainMiddleware);

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
  
  // Busca o afiliado na tabela "affiliates" com base no subdomínio extraído
  const { data: affiliate, error: affiliateError } = await supabase
    .from('affiliates')
    .select('*')
    .eq('subdomain', subdomain)
    .single();
  
  if (affiliateError || !affiliate) {
    return res.status(400).json({ error: "Afiliado não encontrado." });
  }
  
  // Define uma chave única para rastrear as tentativas de login deste usuário (por email e affiliate)
  const attemptKey = `${email}_${affiliate.id}`;
  const currentAttempt = loginAttempts[attemptKey] || { count: 0, lastAttempt: 0 };
  
  // Se já houver 5 ou mais tentativas e não tiver passado 3 horas, bloqueia o login
  const threeHours = 3 * 60 * 60 * 1000;
  if (currentAttempt.count >= 5 && (Date.now() - currentAttempt.lastAttempt) < threeHours) {
    return res.status(429).json({ error: "Muitas tentativas falhas. Tente novamente mais tarde." });
  }
  
  // Busca o usuário na tabela "user_affiliates" filtrando por email e affiliate_id
  const { data: user, error: userError } = await supabase
    .from('user_affiliates')
    .select('*')
    .eq('email', email)
    .eq('affiliate_id', affiliate.id)
    .single();
  
  if (userError || !user) {
    // Incrementa as tentativas em caso de erro
    loginAttempts[attemptKey] = { count: currentAttempt.count + 1, lastAttempt: Date.now() };
    return res.status(400).json({ error: "Email ou senha inválidos." });
  }
  
  // Compara a senha enviada com a senha hash armazenada (usando bcrypt)
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    loginAttempts[attemptKey] = { count: currentAttempt.count + 1, lastAttempt: Date.now() };
    return res.status(400).json({ error: "Email ou senha inválidos." });
  }
  
  // Login efetuado com sucesso: reseta as tentativas para este usuário
  loginAttempts[attemptKey] = { count: 0, lastAttempt: Date.now() };
  
  // Cria a sessão do usuário
  req.session.user = {
    id: user.id,
    email: user.email,
    affiliate_id: affiliate.id,
    nome: user.primeiro_nome + " " + user.ultimo_nome,
  };
  
  // Responde com sucesso e instrui o redirecionamento para a área protegida
  return res.json({ success: true, redirect: "/agente/painel-vendas.html" });
});

// Endpoint para logout
app.post('/api/logout', (req, res) => {
  req.session = null; // Limpa a sessão
  return res.json({ success: true, redirect: '/loginagente.html' });
});

// Define a porta e inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
