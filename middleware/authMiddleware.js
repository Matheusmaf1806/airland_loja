// middleware/authMiddleware.js

/**
 * Middleware de autenticação.
 * Verifica se existe sessão de usuário ativa e:
 *  - em requisições AJAX/fetch retorna 401 JSON;
 *  - em navegação normal redireciona para a página de login.
 */
module.exports = function authMiddleware(req, res, next) {
  if (!req.session || !req.session.user) {
    // Requisição AJAX ou que espera JSON?
    const accept = req.get('Accept') || '';
    if (req.xhr || accept.includes('application/json')) {
      return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }
    // Navegação normal: redireciona ao login
    return res.redirect('/loginagente.html');
  }
  // Sessão válida: segue adiante
  next();
};
