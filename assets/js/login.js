// assets/js/login.js
document.getElementById("login-form").addEventListener("submit", async function(e) {
  e.preventDefault();
  
  const form = e.target;
  const email = form.email.value;
  const password = form.password.value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const result = await response.json();
    if (result.success) {
      // Redireciona para painel-vendas.html
      window.location.href = result.redirect;
    } else {
      // Exibe a mensagem de erro na div "error-message"
      const errorMessage = document.getElementById("error-message");
      errorMessage.style.display = "block";
      errorMessage.textContent = result.error || "Erro ao efetuar login.";
    }
  } catch (err) {
    console.error(err);
    const errorMessage = document.getElementById("error-message");
    errorMessage.style.display = "block";
    errorMessage.textContent = "Erro na conexão com o servidor.";
  }
});
