// middleware/subdomain.js
module.exports = function (req, res, next) {
  let host = req.headers.host;
  req.subdomain = host ? host.toLowerCase() : null;
  next();
};
