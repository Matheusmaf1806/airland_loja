// middleware/subdomain.js
module.exports = (req, res, next) => {
  const host = req.headers.host; // Por exemplo: lucastur.airland.com.br
  if (host && host.endsWith('airland.com.br')) {
    const parts = host.split('.');
    // Se o host for composto por 4 partes, assumimos que a primeira é o subdomínio:
    // Ex.: [lucastur, airland, com, br]
    req.subdomain = parts.length >= 4 ? parts[0] : null;
  } else {
    req.subdomain = null;
  }
  next();
};
