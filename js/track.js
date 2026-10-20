// ===== CONTAGEM ANÔNIMA DE VISITAS E CLIQUES =====
// Cada navegador recebe um código aleatório (sem nome, telefone ou IP).
// Visita = cada vez que o site é aberto numa aba; página = cada carregamento.
(function () {
  var api = (window.BT_API || '').replace(/\/$/, '');
  var robo = navigator.webdriver || /bot|crawl|spider|headless|lighthouse/i.test(navigator.userAgent);
  // Testes no computador do desenvolvedor não entram na conta
  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  function guardado(store, key, criar) {
    try {
      var v = store.getItem(key);
      if (!v && criar) { v = criar(); store.setItem(key, v); }
      return v;
    } catch (e) { return criar ? criar() : null; }
  }
  var novoId = function () {
    return (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
      : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  };
  var vid = guardado(localStorage, 'bt_vid', novoId);

  // Tipo de aparelho, para o painel separar celular de computador
  var aparelho = /iPad|Tablet/i.test(navigator.userAgent) || (matchMedia('(pointer:coarse)').matches && Math.min(screen.width, screen.height) >= 700) ? 'tablet'
    : matchMedia('(pointer:coarse)').matches || innerWidth < 768 ? 'celular' : 'computador';

  // De onde a pessoa veio: link com ?utm_source= ou a página anterior
  function origem() {
    var utm = new URLSearchParams(location.search).get('utm_source');
    if (utm) return utm.toLowerCase();
    var host = '';
    try { host = new URL(document.referrer).hostname.replace(/^www\./, ''); } catch (e) {}
    if (!host || host === location.hostname.replace(/^www\./, '')) return 'direto';
    var conhecidos = [['google', 'google'], ['instagram', 'instagram'], ['facebook', 'facebook'], ['fb.', 'facebook'],
      ['whatsapp', 'whatsapp'], ['wa.me', 'whatsapp'], ['bing', 'bing'], ['youtube', 'youtube'], ['tiktok', 'tiktok'],
      ['olx', 'olx'], ['webmotors', 'webmotors'], ['icarros', 'icarros'], ['mercadolivre', 'mercadolivre']];
    for (var i = 0; i < conhecidos.length; i++) if (host.indexOf(conhecidos[i][0]) > -1) return conhecidos[i][1];
    return host;
  }

  function envia(t, g, l, c) {
    if (!api || robo || local) return;
    var dados = JSON.stringify({ t: t, v: vid, p: location.pathname, g: g == null ? null : String(g), l: l || null,
      d: aparelho, r: t === 'visit' ? origem() : null, c: c == null ? null : String(c) });
    try {
      // text/plain evita a pré-checagem de CORS e o sendBeacon sobrevive à troca de página
      var blob = new Blob([dados], { type: 'text/plain' });
      if (navigator.sendBeacon && navigator.sendBeacon(api + '/e', blob)) return;
      fetch(api + '/e', { method: 'POST', body: dados, keepalive: true, headers: { 'Content-Type': 'text/plain' } });
    } catch (e) { /* contagem nunca pode quebrar o site */ }
  }
  window.btTrack = envia;

  // Uma visita por sessão, uma página por carregamento
  var sessao = null;
  try { sessao = sessionStorage.getItem('bt_sessao'); sessionStorage.setItem('bt_sessao', '1'); } catch (e) {}
  if (!sessao) envia('visit');
  envia('page');

  // Botões de WhatsApp: o nome que aparece no painel
  var botoes = {
    headerWhatsapp: 'menu-topo',
    mobileWhatsapp: 'menu-celular',
    heroWhatsapp: 'topo-do-site',
    contatoWhatsapp: 'como-chegar',
    whatsappFloat: 'botao-flutuante'
  };
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('a, button');
    if (!el) return;
    if (botoes[el.id]) return envia('whats', botoes[el.id]);
    if (el.dataset.trackWhats) return envia('whats', el.dataset.trackWhats, el.dataset.carro || null, el.dataset.carroId || null);
  }, true);

  // Formulários de financiamento e troca abrem o WhatsApp
  document.addEventListener('submit', function (e) {
    if (e.target.id === 'formFinanciamento') envia('whats', 'form-financiamento');
    if (e.target.id === 'formVenda') envia('whats', 'form-troca');
  }, true);
})();
