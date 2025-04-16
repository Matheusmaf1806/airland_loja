// assets/js/login.js
document.getElementById("login-form").addEventListener("submit", async function(e) {
  e.preventDefault();
  
  const form = e.target;
  const email = form.email.value;
  const password = form.password.value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      credentials: 'same-origin',           // ← isto faz o browser aceitar o Set-Cookie
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (result.success) {
      // redireciona para o painel agora que o cookie existe
      window.location.href = result.redirect;
    } else {
      const err = document.getElementById("error-message");
      err.style.display = "block";
      err.textContent = result.error || "Erro ao efetuar login.";
    }
  } catch (err) {
    console.error(err);
    const errorMessage = document.getElementById("error-message");
    errorMessage.style.display = "block";
    errorMessage.textContent = "Erro na conexão com o servidor.";
  }
});
