// server.js
const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const subdomainMiddleware = require('./middleware/subdomain');

const app = express();

// Configuração do cookie de sessão (expira em 1 hora)
// OBS: Substitua 'CHAVE_SECRETA_ALEATORIA' por uma chave forte e secreta.
app.use(cookieSession({
  name: 'session',
  secret: process.env.SUPABASE_JWT_SECRET, // Ou use uma variável separada, como process.env.SESSION_SECRET
  maxAge: 60 * 60 * 1000, // 1 hora
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Aplica o middleware para extrair o subdomínio da requisição
app.use(subdomainMiddleware);

// Serve arquivos estáticos da raiz (HTML, CSS, JS, imagens)
app.use(express.static(path.join(__dirname)));

// Inicializa o cliente do Supabase com as variáveis de ambiente configuradas (no Vercel)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Objeto para controlar as tentativas de login (armazenado em memória – para produção, idealmente use um banco ou cache)
let loginAttempts = {};

// Endpoint para o login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const subdomain = req.subdomain;
  
  if (!subdomain) {
    return res.status(400).json({ error: "Subdomínio não identificado." });
  }
  
  // Busca o afiliado na tabela 'affiliates' com base no subdomínio extraído
  const { data: affiliate, error: affiliateError } = await supabase
    .from('affiliates')
    .select('*')
    .eq('subdomain', subdomain)
    .single();
  
  if (affiliateError || !affiliate) {
    return res.status(400).json({ error: "Afiliado não encontrado." });
  }
  
  // Define uma chave única para rastrear as tentativas de login deste usuário (por email e afiliado)
  const attemptKey = `${email}_${affiliate.id}`;
  const currentAttempt = loginAttempts[attemptKey] || { count: 0, lastAttempt: 0 };
  
  // Se já houver 5 ou mais tentativas e não se passaram 3 horas, bloqueia o login
  const threeHours = 3 * 60 * 60 * 1000;
  if (currentAttempt.count >= 5 && (Date.now() - currentAttempt.lastAttempt) < threeHours) {
    return res.status(429).json({ error: "Muitas tentativas falhas. Tente novamente mais tarde." });
  }
  
  // Busca o usuário na tabela 'user_affiliates' filtrando por email e affiliate_id
  const { data: user, error: userError } = await supabase
    .from('user_affiliates')
    .select('*')
    .eq('email', email)
    .eq('affiliate_id', affiliate.id)
    .single();
  
  if (userError || !user) {
    // Incrementa a contagem de tentativas falhas
    loginAttempts[attemptKey] = { count: currentAttempt.count + 1, lastAttempt: Date.now() };
    return res.status(400).json({ error: "Email ou senha inválidos." });
  }
  
  // Compara a senha enviada com a senha hash armazenada (usando bcrypt)
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    loginAttempts[attemptKey] = { count: currentAttempt.count + 1, lastAttempt: Date.now() };
    return res.status(400).json({ error: "Email ou senha inválidos." });
  }
  
  // Login efetuado com sucesso – reseta as tentativas para este usuário
  loginAttempts[attemptKey] = { count: 0, lastAttempt: Date.now() };
  
  // Cria a sessão do usuário (armazenando dados que podem ser usados depois)
  req.session.user = {
    id: user.id,
    email: user.email,
    affiliate_id: affiliate.id,
    nome: user.primeiro_nome + " " + user.ultimo_nome,
  };
  
  // Responde informando sucesso e a URL para redirecionamento (painel-vendas.html)
  return res.json({ success: true, redirect: "/painel-vendas.html" });
});

// Define a porta (para testes locais use 3000; no Vercel, a porta é definida automaticamente)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
