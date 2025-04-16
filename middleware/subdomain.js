module.exports = (req, res, next) => {
  const host = req.headers.host; // ex.: "maf.airland.com.br"
  const mainDomain = "airland.com.br";
  
  if (host && host.endsWith(mainDomain)) {
    const sub = host.slice(0, host.length - mainDomain.length - 1); // Remove ".airland.com.br"
    req.subdomain = sub || null;
  } else {
    req.subdomain = null;
  }

  next();
};
