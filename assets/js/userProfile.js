// assets/js/userProfile.js
(async function loadUserProfile() {
  try {
    const res = await fetch('/api/me', {
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error('Não foi possível obter perfil');
    const user = await res.json();
    // user.primeiro_nome, user.ultimo_nome, user.email, user.fotodeperfil, user.logo_url

    // 1) Perfil no header e dropdown
    document.querySelectorAll('.profile-box .profile-image')
      .forEach(img => img.src = user.fotodeperfil);

    const elFirst = document.querySelector('.profile-firstname');
    if (elFirst) elFirst.textContent = user.primeiro_nome;

    const elLast = document.querySelector('.profile-lastname');
    if (elLast) elLast.textContent = user.ultimo_nome;

    const elFirstDD = document.querySelector('.profile-firstname-dropdown');
    if (elFirstDD) elFirstDD.textContent = user.primeiro_nome;

    const elEmail = document.querySelector('.profile-email');
    if (elEmail) {
      elEmail.textContent = user.email;
      if (elEmail.textContent.length > 20) {
        elEmail.textContent = elEmail.textContent.slice(0, 20) + '...';
      }
    }

    // 2) Promo‑box na sidebar
    const promoImg = document.querySelector('.promo-box .promo-icon img');
    if (promoImg) {
      promoImg.src = user.fotodeperfil;
      // aplica os estilos obrigatórios
      Object.assign(promoImg.style, {
        width:           '75px',
        height:          '75px',
        display:         'block',
        margin:          '0px auto',
        borderRadius:    '100%',
        objectFit:       'cover'
      });
    }

    // 3) Nome no promo‑box
    const promoName = document.querySelector('.promo-box h3');
    if (promoName) promoName.textContent = user.primeiro_nome;

    // 4) Logo da sidebar (navbar-logo)
    const sidebarLogo = document.querySelector('.navbar-logo img');
    if (sidebarLogo) {
      sidebarLogo.src = user.logo_url;
      Object.assign(sidebarLogo.style, {
        width:           '75px',
        height:          '75px',
        display:         'block',
        margin:          '0px auto',
        objectFit:       'cover'
      });
    }

  } catch (err) {
    console.error('Erro ao carregar perfil do usuário:', err);
  }
})();
