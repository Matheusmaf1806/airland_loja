const bcrypt = require('bcrypt');
const senha = "Teste123!";
bcrypt.hash(senha, 10, (err, hash) => {
  if (err) return console.error(err);
  console.log("Hash gerada:", hash);
});
