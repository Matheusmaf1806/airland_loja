// middleware/authMiddleware.js
module.exports = (req, res, next) => {
  if (!req.session || !req.session.user) {
    // Se não estiver logado, redireciona para o login
    return res.redirect('/loginagente.html');
  }
  next();
};
