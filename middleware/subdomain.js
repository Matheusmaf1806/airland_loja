// middleware/subdomain.js
module.exports = (req, res, next) => {
  const host = req.headers.host; // Exemplo: "lucastur.airland.com.br"
  const mainDomain = 'airland.com.br';
  if (host && host.endsWith(mainDomain)) {
    // Separa a parte que antecede o mainDomain (subdomínio)
    const parts = host.split('.' + mainDomain);
    req.subdomain = parts[0];
  } else {
    req.subdomain = null;
  }
  next();
};
