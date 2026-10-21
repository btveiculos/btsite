// ===== AVISO DE COOKIES (Modo de Consentimento do Google) =====
// O padrão "negado" é definido no <head>, antes do GTM. Aqui só aparece o aviso
// e a escolha da pessoa é enviada ao GTM e guardada no navegador.
(function () {
  var CHAVE = 'bt_cookies';
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  function escolha() {
    try { return localStorage.getItem(CHAVE); } catch (e) { return null; }
  }

  function aplicar(aceitou) {
    var valor = aceitou ? 'granted' : 'denied';
    gtag('consent', 'update', { ad_storage: valor, ad_user_data: valor, ad_personalization: valor, analytics_storage: valor });
    window.dataLayer.push({ event: 'consentimento_atualizado', consentimento: aceitou ? 'aceito' : 'recusado' });
    try { localStorage.setItem(CHAVE, aceitou ? 'aceito' : 'recusado'); } catch (e) {}
  }

  function mostrarAviso() {
    if (document.getElementById('avisoCookies')) return;
    var aviso = document.createElement('div');
    aviso.className = 'aviso-cookies';
    aviso.id = 'avisoCookies';
    aviso.setAttribute('role', 'dialog');
    aviso.setAttribute('aria-label', 'Aviso de cookies');
    aviso.innerHTML =
      '<p>Usamos cookies para medir as visitas e melhorar nossos anúncios. ' +
      '<a href="/privacidade.html">Saiba mais</a></p>' +
      '<div class="aviso-cookies-botoes">' +
      '<button type="button" class="btn-light" data-cookies="nao">Recusar</button>' +
      '<button type="button" class="btn-primary" data-cookies="sim">Aceitar</button>' +
      '</div>';
    aviso.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cookies]');
      if (!b) return;
      aplicar(b.getAttribute('data-cookies') === 'sim');
      aviso.remove();
    });
    document.body.appendChild(aviso);
  }

  if (!escolha()) mostrarAviso();

  // Links "Preferências de cookies" reabrem o aviso
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('[data-abrir-cookies]');
    if (!link) return;
    e.preventDefault();
    mostrarAviso();
  });
})();
