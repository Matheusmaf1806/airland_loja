// footer.js

(function renderFooter() {
  // 1. Insere o CSS necessário
  const css = `
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Inter', sans-serif; background-color: #fff; color: #222; }
    footer { background: #fff; border-top: 1px solid #eaeaea; }
    .footer-wrapper { max-width: 1200px; margin: 0 auto; padding: 32px 16px 16px; }
    .footer-top { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; border-bottom: 1px solid #e0e0e0; padding-bottom: 24px; margin-bottom: 32px; }
    .footer-icons { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; opacity: 0.85; }
    .footer-icons a { display: flex; align-items: center; }
    .footer-icons i, .footer-icons img { font-size: 22px; color: #444; transition: opacity 0.2s ease; }
    .footer-icons i:hover, .footer-icons img:hover { opacity: 1; }
    .footer-columns { display: flex; flex-wrap: wrap; justify-content: space-between; border-bottom: 1px solid #e0e0e0; padding-bottom: 32px; margin-bottom: 16px; }
    .footer-col { flex: 1 1 240px; padding: 0 16px; min-width: 220px; border-right: 1px solid #e0e0e0; }
    .footer-col:last-child { border-right: none; }
    .footer-col h4 { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
    .footer-col p, .footer-col a { font-size: 14px; color: #444; text-decoration: none; margin-bottom: 8px; display: block; }
    .footer-col a:hover { color: #0077cc; }
    .footer-bottom { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #888; flex-wrap: wrap; gap: 16px; }
    .footer-bottom img { opacity: 0.8; }
    .footer-bottom .guarantee { height: 40px; width: auto; }
    .footer-bottom span:last-child img { height: 20px; width: auto; }
    .footer-bottom span:last-child { display: flex; align-items: center; justify-content: flex-end; gap: 8px; text-align: right; }
    @media (max-width: 768px) {
      .footer-columns { flex-direction: column; }
      .footer-col { border-right: none !important; border-bottom: 1px solid #eee; margin-bottom: 16px; }
      .footer-bottom { flex-direction: column; gap: 12px; text-align: center; }
    }
  `;
  const styleTag = document.createElement('style');
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  // 2. Cria o HTML do footer
  const footerHTML = `
    <footer>
      <div class="footer-wrapper">
        <div class="footer-top">
          <div class="footer-icons" id="social-icons">
            <a id="footer-facebook" class="footer-icon" target="_blank" title="Facebook"><i class="bi bi-facebook"></i></a>
            <a id="footer-instagram" class="footer-icon" target="_blank" title="Instagram"><i class="bi bi-instagram"></i></a>
            <a id="footer-youtube" class="footer-icon" target="_blank" title="YouTube"><i class="bi bi-youtube"></i></a>
            <a id="footer-tiktok" class="footer-icon" target="_blank" title="TikTok"><i class="bi bi-tiktok"></i></a>
            <a id="footer-linkedin" class="footer-icon" target="_blank" title="LinkedIn"><i class="bi bi-linkedin"></i></a>
          </div>
          <div class="footer-icons">
            <img width="48" height="48" src="https://img.icons8.com/color/48/mastercard.png"       alt="mastercard" />
            <img width="48" height="48" src="https://img.icons8.com/color/48/visa.png"             alt="visa" />
            <img width="48" height="48" src="https://img.icons8.com/color/48/amex.png"             alt="amex" />
            <img width="48" height="48" src="https://upload.wikimedia.org/wikipedia/commons/5/51/Elo_logo.png" alt="cartao-elo" />
            <img width="48" height="48" src="https://img.icons8.com/ios-filled/50/pix.png"         alt="pix" />
            <img width="48" height="48" src="https://img.icons8.com/hatch/50/boleto-bankario.png"  alt="boleto-bankario" />
          </div>
        </div>
        <div class="footer-columns">
          <div class="footer-col">
            <img width="100" height="50" src="file:///Users/matheusalvarengamaf/Downloads/reservasvpoexperiencecom65eba72b830d265eba72c6a3f6.webp" alt="Airland" />
            <p id="footer-cnpj"></p>
            <div id="footer-whatsapp"></div>
            <p id="footer-email"></p>
          </div>
          <div class="footer-col">
            <h4>Institucional</h4>
            <a href="#">Quem somos</a>
            <a href="#">Política de Privacidade</a>
            <a href="#">Termos de uso</a>
            <a href="#">Política de Cancelamento</a>
          </div>
          <div class="footer-col">
            <h4>Destinos Populares</h4>
            <a href="#">Paris</a>
            <a href="#">Orlando</a>
            <a href="#">Maldivas</a>
          </div>
          <div class="footer-col">
            <h4>Segurança</h4>
            <p>Adotamos os padrões PCI‑DSS para garantir a segurança das informações de pagamento.</p>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2025 Airland. Todos os direitos reservados.</span>
          <img class="guarantee" src="https://stenisinvest.com/wp-content/uploads/2022/01/GARANTIA-STENIS.png" alt="Garantia Stenis" />
          <span>
            Powered by
            <a href="https://airland.com.br" target="_blank">
              <img width="100" height="50" src="https://businessplace.airland.com.br/assets/images/logo/logo.svg" alt="Airland" />
            </a>
          </span>
        </div>
      </div>
    </footer>
  `;
  document.body.insertAdjacentHTML('beforeend', footerHTML);

  // 3. Busca dados dinâmicos e preenche o conteúdo
  document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/footer')
      .then(res => {
        if (!res.ok) throw new Error('Falha ao carregar dados do footer');
        return res.json();
      })
      .then(data => {
        // CNPJ
        if (data.cnpj) {
          document.getElementById('footer-cnpj').textContent = 'CNPJ ' + data.cnpj;
        }
        // WhatsApps
        const wsContainer = document.getElementById('footer-whatsapp');
        ['whatsapp1', 'whatsapp2', 'whatsapp3'].forEach(key => {
          if (data[key]) {
            const p = document.createElement('p');
            p.innerHTML = '<i class="bi bi-whatsapp"></i> ' + data[key];
            wsContainer.appendChild(p);
          }
        });
        // Email
        if (data.email) {
          document.getElementById('footer-email').innerHTML =
            '<i class="bi bi-envelope"></i> ' + data.email;
        }
        // Redes sociais
        ['facebook','instagram','youtube','tiktok','linkedin'].forEach(site => {
          const a = document.getElementById('footer-' + site);
          if (data[site]) {
            a.href = data[site];
          } else if (a) {
            a.remove();
          }
        });
      })
      .catch(err => console.error(err));
  });
})();
