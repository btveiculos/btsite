// ===== PARTES COMUNS ÀS DUAS PÁGINAS =====
// Cabeçalho, botões de WhatsApp, card de carro e janela de detalhes.
// Carregado depois de data.js e antes de app.js / estoque.js.

const STOCK = (typeof VEHICLES !== 'undefined' && Array.isArray(VEHICLES)) ? VEHICLES : [];

// Todo texto do estoque passa por aqui antes de entrar no HTML
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = p => 'R$ ' + Number(p || 0).toLocaleString('pt-BR');
const km = n => Number(n || 0).toLocaleString('pt-BR') + ' km';
const cap = s => { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };
const nomeCarro = v => `${v.marca} ${v.modelo} ${v.ano || ''}`.trim();
const wpp = msg => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
// 5511993662724 -> (11) 99366-2724
const fmtPhone = n => String(n).replace(/^55/, '').replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');

const carSVG = `<svg viewBox="0 0 430 155" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M45 118C45 118 52 88 75 78 95 70 125 60 162 54 190 50 225 48 255 48 285 48 315 52 338 60 355 66 367 76 374 90 380 102 382 114 382 118L45 118Z" fill="#b9b9b4"/><circle cx="108" cy="124" r="22" fill="#8f8f8a"/><circle cx="318" cy="124" r="22" fill="#8f8f8a"/></svg>`;

// Sem caminho válido devolve o desenho no lugar da foto.
// src='' faria o navegador pedir a própria página sem disparar onerror.
function makeImg(src, alt, lazy) {
  if (!src || typeof src !== 'string' || !src.trim()) {
    const ph = document.createElement('div');
    ph.className = 'car-img-placeholder';
    ph.innerHTML = carSVG;
    return ph;
  }
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt || '';
  if (lazy) img.loading = 'lazy';
  img.onerror = function () { this.outerHTML = carSVG; };
  return img;
}

// ===== CABEÇALHO =====
const header = document.getElementById('header');
const mobileMenu = document.getElementById('mobileMenu');
const mobileToggle = document.getElementById('mobileToggle');
function menuMobile(abrir) {
  mobileMenu.classList.toggle('open', abrir);
  mobileToggle.setAttribute('aria-expanded', String(abrir));
  mobileToggle.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
}
mobileToggle.onclick = () => menuMobile(!mobileMenu.classList.contains('open'));
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menuMobile(false)));
// O cabeçalho é fixo: sem isto o menu aberto ficaria parado em cima do conteúdo ao rolar
window.addEventListener('scroll', () => { if (mobileMenu.classList.contains('open')) menuMobile(false); }, { passive: true });
document.addEventListener('click', e => {
  if (!mobileMenu.contains(e.target) && !mobileToggle.contains(e.target) && mobileMenu.classList.contains('open')) menuMobile(false);
});

// ===== WHATSAPP =====
// Os links já apontam para o WhatsApp no HTML; aqui só entra a mensagem pronta
const wppMsg = 'Olá! Vi o site da BT Veículos e gostaria de mais informações.';
['headerWhatsapp', 'mobileWhatsapp', 'heroWhatsapp', 'contatoWhatsapp', 'whatsappFloat'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.href = wpp(wppMsg);
});
document.querySelectorAll('[data-whats]').forEach(el => { el.textContent = fmtPhone(WHATSAPP); });

// Botão flutuante (só no celular) aparece depois que o topo sai da tela
const floatBtn = document.getElementById('whatsappFloat');
const mostrarFlutuante = () => floatBtn && floatBtn.classList.toggle('show', window.scrollY > 400);
window.addEventListener('scroll', mostrarFlutuante, { passive: true });
mostrarFlutuante();

const anoRodape = document.getElementById('footerYear');
if (anoRodape) anoRodape.textContent = new Date().getFullYear();

// ===== CARD DE CARRO =====
function carCard(v) {
  const nFotos = (v.fotos && v.fotos.length) ? v.fotos.length : (v.img ? 1 : 0);
  const card = document.createElement('article');
  card.className = 'car';
  card.innerHTML = `
    <button type="button" class="car-link" aria-label="Ver detalhes: ${esc(v.marca)} ${esc(v.modelo)}, ${fmt(v.preco)}">
      <div class="car-photo">${nFotos > 1 ? `<span class="car-count">${nFotos} fotos</span>` : ''}</div>
      <div class="car-info">
        <h3>${esc(v.marca)} ${esc(v.modelo)}</h3>
        <p class="car-versao">${esc(v.versao)}</p>
        <p class="car-meta">${esc(v.ano)}/${esc(v.anoModelo)} · ${km(v.km)} · ${esc(cap(v.cambio))}</p>
        <div class="car-bottom"><span class="car-price">${fmt(v.preco)}</span></div>
      </div>
    </button>`;
  card.querySelector('.car-photo').prepend(makeImg(v.img, `${v.marca} ${v.modelo}`, true));
  card.querySelector('.car-link').onclick = e => openModal(v, e.currentTarget);
  return card;
}

// ===== DETALHES DO VEÍCULO =====
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modalImg');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');
let voltarFoco = null;

function openModal(v, origem) {
  // Só caminhos válidos: sem foto a galeria mostra o desenho
  const photos = ((v.fotos && v.fotos.length > 0) ? v.fotos : [v.img])
    .filter(p => p && typeof p === 'string' && p.trim());
  let current = 0;
  let touchAbort = new AbortController();

  function renderPhoto() {
    // Cancela os toques da foto anterior antes de recriar
    touchAbort.abort();
    touchAbort = new AbortController();

    modalImg.innerHTML = '';
    modalImg.appendChild(makeImg(photos[current], `${v.marca} ${v.modelo}`, false));
    if (photos.length > 1) {
      modalImg.insertAdjacentHTML('beforeend', `
        <button class="modal-nav modal-nav-left" id="mPrev" aria-label="Foto anterior"><svg class="ico"><use href="#i-chev-l"/></svg></button>
        <button class="modal-nav modal-nav-right" id="mNext" aria-label="Próxima foto"><svg class="ico"><use href="#i-chev-r"/></svg></button>
        <div class="modal-photo-counter">${current + 1} de ${photos.length}</div>`);
      document.getElementById('mPrev').onclick = () => trocarFoto(-1);
      document.getElementById('mNext').onclick = () => trocarFoto(1);
    }

    let toqueX = 0;
    modalImg.addEventListener('touchstart', e => { toqueX = e.touches[0].clientX; }, { passive: true, signal: touchAbort.signal });
    modalImg.addEventListener('touchend', e => {
      const diff = toqueX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) trocarFoto(diff > 0 ? 1 : -1);
    }, { signal: touchAbort.signal });
  }
  function trocarFoto(passo) {
    if (photos.length < 2) return;
    current = (current + passo + photos.length) % photos.length;
    renderPhoto();
  }
  modal.onkeydown = e => {
    if (e.key === 'ArrowRight') trocarFoto(1);
    if (e.key === 'ArrowLeft') trocarFoto(-1);
  };
  renderPhoto();

  const msg = `Olá, tenho interesse no ${v.marca} ${v.modelo} ${v.versao || ''} (${v.ano}) - ${fmt(v.preco)} que vi no site da BT Veículos. Pode me passar mais informações?`;
  modalBody.innerHTML = `
    <h2>${esc(v.marca)} ${esc(v.modelo)}</h2>
    <p class="modal-versao">${esc(v.versao)}</p>
    <div class="modal-price">${fmt(v.preco)}</div>
    <div class="modal-specs">
      <div class="spec"><small>Ano</small><strong>${esc(v.ano)}/${esc(v.anoModelo)}</strong></div>
      <div class="spec"><small>Quilometragem</small><strong>${km(v.km)}</strong></div>
      <div class="spec"><small>Câmbio</small><strong>${esc(cap(v.cambio))}</strong></div>
      <div class="spec"><small>Combustível</small><strong>${esc(v.combustivel || '—')}</strong></div>
      <div class="spec"><small>Cor</small><strong>${esc(v.cor || 'Não informada')}</strong></div>
    </div>
    ${v.opcionais && v.opcionais.length ? `<h4 class="modal-subtitle">Opcionais</h4><div class="modal-opcionais">${v.opcionais.map(o => `<span>${esc(o)}</span>`).join('')}</div>` : ''}
    ${v.desc ? `<div class="modal-desc">${esc(v.desc)}</div>` : ''}
    <a href="${wpp(msg)}" target="_blank" rel="noopener" class="btn-whatsapp" data-track-whats="detalhes-veiculo" data-carro="${esc(nomeCarro(v))}" data-carro-id="${esc(v.id)}"><svg class="ico ico-fill" width="18" height="18"><use href="#i-whats"/></svg>Perguntar sobre este carro no WhatsApp</a>`;

  if (window.btTrack) btTrack('car', v.id, nomeCarro(v));
  voltarFoco = origem || document.activeElement;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  modal.querySelector('.modal-content').scrollTop = 0;
  modalClose.focus({ preventScroll: true });
}

function closeModal() {
  if (!modal.classList.contains('open')) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
  if (voltarFoco && voltarFoco.focus) voltarFoco.focus({ preventScroll: true });
}
modalClose.onclick = closeModal;
modal.onclick = e => { if (e.target === modal) closeModal(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
