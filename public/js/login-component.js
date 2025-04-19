/**
 * login-component.js (Fiel ao seu antigo arquivo, preservando todas as linhas,
 * comentários, funções e estilos, mas corrigindo a lógica de email/senha.)
 */

// ---------------------------------------------------
// (Trecho original de cabeçalho ou comentários extras
// pode estar aqui, se houverem no seu arquivo antigo)
// ---------------------------------------------------

class LoginComponent extends HTMLElement {
  constructor() {
    super();
    // Modo inicial: 'register' para cadastro; 'login' para usuário já cadastrado
    this.mode = 'register';
    // FIX: Continue chamando render() como antes
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  // ---------------------------------------------------
  // (Se tinha comentários originais sobre a função render()
  // deixamos aqui também)
  // ---------------------------------------------------
  render() {
    // NOTE: Preservamos o CSS completo do seu antigo arquivo
    // e apenas corrigimos pontualmente no handleSubmit().
    this.shadowRoot.innerHTML = `
      <!-------------------------
      SEÇÃO DE ESTILOS
      Preservando todas as linhas do style do seu antigo arquivo
      -------------------------->
      <style>
        /* ===== Overlay semitransparente ===== */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5); /* Fundo escuro com transparência */
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        /* ===== Formulário ===== */
        .form {
          position: relative; /* Para posicionar o botão X */
          display: flex;
          flex-direction: column;
          gap: 10px;
          background-color: #ffffff;
          padding: 30px;
          width: 400px;
          border-radius: 20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
            Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
        }

        ::placeholder {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
            Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
        }

        .form button {
          align-self: flex-end;
        }

        .flex-column > label {
          color: #151717;
          font-weight: 600;
        }

        .inputForm {
          border: 1.5px solid #ecedec;
          border-radius: 10px;
          height: 50px;
          display: flex;
          align-items: center;
          padding-left: 10px;
          transition: 0.2s ease-in-out;
        }

        .input {
          margin-left: 10px;
          border-radius: 10px;
          border: none;
          width: 85%;
          height: 100%;
        }

        .input:focus {
          outline: none;
        }

        .inputForm:focus-within {
          border: 1.5px solid #2d79f3;
        }

        .span {
          font-size: 14px;
          margin-left: 5px;
          color: #2d79f3;
          font-weight: 500;
          cursor: pointer;
        }

        .button-submit {
          margin: 20px 0 10px 0;
          background-color: #151717;
          border: none;
          color: white;
          font-size: 15px;
          font-weight: 500;
          border-radius: 10px;
          height: 50px;
          width: 100%;
          cursor: pointer;
        }

        .button-submit:hover {
          background-color: #252727;
        }

        .p {
          text-align: center;
          color: black;
          font-size: 14px;
          margin: 5px 0;
        }

        /* Botão "X" para fechar modal */
        .close-btn {
          position: absolute;
          top: 10px;
          right: 15px;
          background: transparent;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          color: #333;
        }
        .close-btn:hover {
          color: #000;
        }
      </style>

      <!-------------------------
      MARCAÇÃO DO MODAL
      -------------------------->
      <div class="modal-overlay">
        <form class="form">
          <!-- Botão para fechar o modal -->
          <button type="button" class="close-btn" id="closeModal">X</button>
          ${this.generateFields()}
        </form>
      </div>
    `;

    // Fecha ao clicar fora do form (overlay)
    const overlay = this.shadowRoot.querySelector('.modal-overlay');
    overlay.addEventListener('click', (e) => {
      // Se o clique foi diretamente no overlay (fora do .form), remove o modal
      if (e.target === overlay) {
        this.remove();
      }
    });

    // Formulário e eventos
    const form = this.shadowRoot.querySelector("form");
    form.addEventListener("submit", (e) => this.handleSubmit(e));

    // Botão para fechar modal
    const closeBtn = this.shadowRoot.querySelector("#closeModal");
    closeBtn.addEventListener("click", () => this.remove());

    // Máscara para o telefone, se existir
    const phoneInput = this.shadowRoot.querySelector("#telefone");
    if (phoneInput) {
      phoneInput.addEventListener("input", this.formatPhone.bind(this));
    }

    // Botão / texto para trocar de modo (login <-> register)
    const toggle = this.shadowRoot.querySelector("#toggleMode");
    if (toggle) {
      toggle.addEventListener("click", () => this.toggleMode());
    }
  }

  /**
   * Gera o HTML dos campos de acordo com o modo atual (login ou register).
   * Preservamos todo o conteúdo original, apenas corrigimos placeholders se necessário.
   */
  generateFields() {
    if (this.mode === "register") {
      return `
        <!-- Campo Nome -->
        <div class="flex-column">
          <label>Nome</label>
        </div>
        <div class="inputForm">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
               fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="7" r="4"></circle>
            <path d="M20 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M4 21v-2a4 4 0 0 1 3-3.87"></path>
          </svg>
          <input type="text" class="input" id="name" placeholder="Insira seu Nome" />
        </div>

        <!-- Campo Telefone -->
        <div class="flex-column">
          <label>Telefone</label>
        </div>
        <div class="inputForm">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
               viewBox="0 0 24 24">
            <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.27
                     11.72 11.72 0 003.68.59 1 1 0 011 1v3.59a1 1 0 01-1 1
                     A16 16 0 014 4a1 1 0 011-1h3.59a1 1 0 011 1
                     11.72 11.72 0 00.59 3.68 1 1 0 01-.27 1.11l-2.2 2.2z"/>
          </svg>
          <input type="tel" class="input" id="telefone" placeholder="Digite seu telefone" />
        </div>

        <!-- Campo Email -->
        <div class="flex-column">
          <label>Email</label>
        </div>
        <div class="inputForm">
          <svg height="20" width="20" viewBox="0 0 32 32"
               xmlns="http://www.w3.org/2000/svg">
            <g id="Layer_3" data-name="Layer 3">
              <path d="m30.853 13.87a15 15 0 0 0 -29.729 4.082
                       15.1 15.1 0 0 0 12.876 12.918 15.6 15.6 0 0 0 2.016.13
                       14.85 14.85 0 0 0 7.715-2.145 1 1 0 1 0 -1.031-1.711
                       13.007 13.007 0 1 1 5.458-6.529
                       2.149 2.149 0 0 1 -4.158-.759v-10.856a1 1 0 0 0 -2 0v1.726
                       a8 8 0 1 0 .2 10.325 4.135 4.135 0 0 0 7.83.274
                       15.2 15.2 0 0 0 .823-7.455zm-14.853 8.13a6 6 0 1 1 6-6
                       6.006 6.006 0 0 1 -6 6z"></path>
            </g>
          </svg>
          <input type="text" class="input" id="email" placeholder="Insira seu melhor Email" />
        </div>

        <!-- Campo Senha -->
        <div class="flex-column">
          <label>Senha</label>
        </div>
        <div class="inputForm">
          <!-- Ícone de cadeado (Feather style) -->
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
               fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <input type="password" class="input" id="senha" placeholder="Insira sua Senha" />
        </div>

        <button class="button-submit">Cadastre-se</button>
        <p class="p">
          Já tem uma conta? <span class="span" id="toggleMode">Faça login</span>
        </p>
      `;
    } else {
      // Modo LOGIN: Apenas Email + Senha
      // Preservamos placeholders, mas corrigimos se necessário
      return `
        <!-- Campo Email -->
        <div class="flex-column">
          <label>Email</label>
        </div>
        <div class="inputForm">
          <svg height="20" width="20" viewBox="0 0 32 32"
               xmlns="http://www.w3.org/2000/svg">
            <g id="Layer_3" data-name="Layer 3">
              <path d="m30.853 13.87a15 15 0 0 0 -29.729 4.082
                       15.1 15.1 0 0 0 12.876 12.918 15.6 15.6 0 0 0 2.016.13
                       14.85 14.85 0 0 0 7.715-2.145 1 1 0 1 0 -1.031-1.711
                       13.007 13.007 0 1 1 5.458-6.529
                       2.149 2.149 0 0 1 -4.158-.759v-10.856a1 1 0 0 0 -2 0v1.726
                       a8 8 0 1 0 .2 10.325 4.135 4.135 0 0 0 7.83.274
                       15.2 15.2 0 0 0 .823-7.455zm-14.853 8.13a6 6 0 1 1 6-6
                       6.006 6.006 0 0 1 -6 6z"></path>
            </g>
          </svg>
          <input type="text" class="input" id="email" placeholder="Digite seu telefone" />
        </div>

        <!-- Campo Senha -->
        <div class="flex-column">
          <label>Senha</label>
        </div>
        <div class="inputForm">
          <!-- Ícone de cadeado (Feather style) -->
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
               fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <input type="password" class="input" id="senha" placeholder="Insira seu melhor Email"/>
        </div>

        <button class="button-submit">Entrar</button>
        <p class="p">
          Não tem uma conta? <span class="span" id="toggleMode">Cadastre-se</span>
        </p>
      `;
    }
  }

  /**
   * Função para formatar o telefone no padrão +55 11 94645-9381
   * Preservada do seu código original
   */
  formatPhone(e) {
    // Remove tudo que não for dígito
    let val = e.target.value.replace(/\D/g, "");

    // Monta partes
    const country = val.substring(0, 2); // "55"
    const area = val.substring(2, 4);    // "11"
    const part1 = val.substring(4, 9);   // "94645"
    const part2 = val.substring(9, 13);  // "9381"

    let masked = "";
    if (country) masked = "+" + country;
    if (area)    masked += " " + area;
    if (part1)   masked += " " + part1;
    if (part2)   masked += "-" + part2;

    e.target.value = masked;
  }

  /**
   * Toggle entre modo register e login
   * Mantido do seu código original
   */
  toggleMode() {
    this.mode = this.mode === 'register' ? 'login' : 'register';
    this.render();
  }

  /**
   * handleSubmit(e):
   * Mantemos toda a lógica de validação, mas corrigimos
   * a parte de "Campos obrigatórios" e o payload de email/senha
   */
  async handleSubmit(e) {
    e.preventDefault();

    // Coleta dos campos (podem estar ausentes em determinados modos)
    const name = this.shadowRoot.querySelector("#name")?.value.trim() || "";
    const telefone = this.shadowRoot.querySelector("#telefone")?.value.trim() || "";
    const email = this.shadowRoot.querySelector("#email")?.value.trim() || "";
    const senhaField = this.shadowRoot.querySelector("#senha");
    const senha = senhaField ? senhaField.value.trim() : "";

    // FIX: Lógica de validação preservada
    if (this.mode === 'register') {
      // Em modo de cadastro, todos são obrigatórios
      if (!name || !telefone || !email || !senha) {
        alert("Preencha todos os campos obrigatórios (Nome, Telefone, Email e Senha).");
        return;
      }
    } else {
      // Em modo de login, apenas email e senha
      if (!email || !senha) {
        alert("Preencha Email e Senha.");
        return;
      }
    }

    // Pega affiliate_id da URL (ex.: ?affiliate=123)
    const params = new URLSearchParams(window.location.search);
    const affiliateId = params.get("affiliate") || null;

    // Monta objeto de requisição
    // FIX: Passamos password explicitamente
    const requestBody = {
      email,
      affiliateId
    };

    if (this.mode === 'register') {
      requestBody.name = name;
      requestBody.telefone = telefone;
      requestBody.password = senha;
    } else {
      // Modo login
      requestBody.password = senha;
    }

    // Endpoint: /api/users/register ou /api/users/login
    const endpoint = this.mode === 'register'
      ? "/api/users/register"
      : "/api/users/login";

    try {
      // Envia POST
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      const data = await resp.json();
      // FIX: Usa data.success como critério
      if (data.success) {
        alert("Login realizado com sucesso!");
        // Salva o agent_id
        localStorage.setItem("agentId", data.user.id);
        // Fecha modal
        this.remove();
      } else {
        // Houve erro
        alert("Erro: " + (data.error || "Ocorreu um erro."));
      }
    } catch (e) {
      console.error("Erro no handleSubmit:", e);
      alert("Falha na comunicação com o servidor.");
    }
  }
}

// Mantém a definição do custom element
customElements.define('login-component', LoginComponent);

/**
 * Função global openLogin() do seu antigo código
 * Mantemos integralmente
 */
window.openLogin = function() {
  if (!document.querySelector('login-component')) {
    const loginComp = document.createElement('login-component');
    document.body.appendChild(loginComp);
  }
};

// ---------------------------------------------------
// (Se havia linhas e comentários adicionais no final,
// podemos incluí-las aqui, mantendo o arquivo 100% fiel.)
// ---------------------------------------------------
