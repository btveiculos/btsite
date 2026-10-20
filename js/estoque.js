// ===== PÁGINA DE ESTOQUE (TELA CHEIA) =====
// Script próprio: o app.js depende de elementos que só existem na landing page
// (carrossel, formulários, depoimentos) e quebraria aqui.

const fmt = p => 'R$ ' + Number(p || 0).toLocaleString('pt-BR');
const km = n => Number(n || 0).toLocaleString('pt-BR') + ' km';
// 5511993662724 -> (11) 99366-2724
const fmtPhone = n => String(n).replace(/^55/, '').replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');
const cap = s => { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };
const nomeCarro = v => `${v.marca} ${v.modelo} ${v.ano || ''}`.replace(/"/g, '').trim();
const wpp = msg => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;

const carSVG = `<svg viewBox="0 0 430 155" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M45 118C45 118 52 88 75 78 95 70 125 60 162 54 190 50 225 48 255 48 285 48 315 52 338 60 355 66 367 76 374 90 380 102 382 114 382 118L45 118Z" fill="#b9b9b4"/><circle cx="108" cy="124" r="22" fill="#8f8f8a"/><circle cx="318" cy="124" r="22" fill="#8f8f8a"/></svg>`;

// Imagem segura: sem caminho válido devolve o placeholder direto.
// src='' faria o browser requisitar a própria página sem disparar onerror.
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

// Lista sempre válida, mesmo que data.js falhe em carregar
const STOCK = (typeof VEHICLES !== 'undefined' && Array.isArray(VEHICLES)) ? VEHICLES : [];

// ===== HEADER / NAV =====
const mobileToggle = document.getElementById('mobileToggle');
const mobileMenu = document.getElementById('mobileMenu');
if (mobileToggle && mobileMenu) {
  const closeMobileMenu = () => mobileMenu.classList.remove('open');
  mobileToggle.onclick = () => mobileMenu.classList.toggle('open');
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobileMenu));
  // O header é fixo: sem isto o menu aberto fica parado em cima dos carros ao rolar
  window.addEventListener('scroll', closeMobileMenu, { passive: true });
  document.addEventListener('click', e => {
    if (!mobileMenu.contains(e.target) && !mobileToggle.contains(e.target)) closeMobileMenu();
  });
}

const wppMsg = 'Olá! Vi o site da BT Veículos e gostaria de mais informações.';
['headerWhatsapp', 'mobileWhatsapp', 'whatsappFloat'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.onclick = e => { e.preventDefault(); window.open(wpp(wppMsg), '_blank'); };
});

document.querySelectorAll('[data-whats]').forEach(el => { el.textContent = fmtPhone(WHATSAPP); });

const floatBtn = document.getElementById('whatsappFloat');
const onScroll = () => floatBtn && floatBtn.classList.toggle('show', window.scrollY > 400);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const backToTop = document.getElementById('backToTop');
if (backToTop) {
  backToTop.onclick = e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
}

const totalCount = document.getElementById('totalCount');
if (totalCount) totalCount.textContent = STOCK.length;

// ===== FILTROS =====
const grid = document.getElementById('estoqueGrid');
const resultsCount = document.getElementById('resultsCount');
const searchInput = document.getElementById('searchInput');
const filterMarca = document.getElementById('filterMarca');
const filterUso = document.getElementById('filterUso');
const filterCambio = document.getElementById('filterCambio');
const filterCombustivel = document.getElementById('filterCombustivel');
const filterPreco = document.getElementById('filterPreco');
const filterOrder = document.getElementById('filterOrder');

// Popula marcas e combustíveis a partir do estoque real
function fillSelect(select, values) {
  if (!select) return;
  values.forEach(val => {
    const o = document.createElement('option');
    o.value = val;
    o.textContent = val;
    select.appendChild(o);
  });
}
fillSelect(filterMarca, [...new Set(STOCK.map(v => v.marca).filter(Boolean))].sort());
fillSelect(filterCombustivel, [...new Set(STOCK.map(v => v.combustivel).filter(Boolean))].sort());

function applyFilters() {
  const btnLimpar = document.getElementById('clearFiltersBtn');
  if (btnLimpar) btnLimpar.hidden = ![searchInput, filterMarca, filterUso, filterCambio, filterCombustivel, filterPreco, filterOrder].some(el => el && el.value);
  const search = (searchInput?.value || '').toLowerCase().trim();
  let list = [...STOCK];

  if (search) {
    list = list.filter(v => `${v.marca} ${v.modelo} ${v.versao}`.toLowerCase().includes(search));
  }
  if (filterMarca?.value) list = list.filter(v => v.marca === filterMarca.value);
  if (filterUso?.value) list = list.filter(v => v.uso === filterUso.value);
  if (filterCambio?.value) list = list.filter(v => v.cambio === filterCambio.value);
  if (filterCombustivel?.value) list = list.filter(v => v.combustivel === filterCombustivel.value);
  if (filterPreco?.value) list = list.filter(v => v.preco <= parseInt(filterPreco.value, 10));

  const order = filterOrder?.value;
  if (order === 'menor') list.sort((a, b) => a.preco - b.preco);
  if (order === 'maior') list.sort((a, b) => b.preco - a.preco);
  if (order === 'km') list.sort((a, b) => a.km - b.km);
  if (order === 'ano') list.sort((a, b) => b.ano - a.ano);

  render(list);
}

function render(list) {
  if (!grid) return;
  grid.innerHTML = '';

  if (resultsCount) {
    resultsCount.innerHTML = `<strong>${list.length}</strong> ${list.length === 1 ? 'veículo' : 'veículos'}`;
  }

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state">
      <p>${STOCK.length ? 'Nenhum veículo encontrado com esses filtros.' : 'Estoque sendo atualizado. Fale com a gente no WhatsApp para saber o que está disponível.'}</p>
      ${STOCK.length ? '<button class="btn-outline" id="emptyClearBtn">Limpar filtros</button>' : ''}
    </div>`;
    const b = document.getElementById('emptyClearBtn');
    if (b) b.onclick = clearFilters;
    return;
  }

  list.forEach(v => {
    const nFotos = (v.fotos && v.fotos.length) ? v.fotos.length : (v.img ? 1 : 0);
    const card = document.createElement('article');
    card.className = 'car';
    card.innerHTML = `
      <button type="button" class="car-link" aria-label="Ver detalhes: ${v.marca} ${v.modelo}, ${fmt(v.preco)}">
        <div class="car-photo">${nFotos > 1 ? `<span class="car-count">${nFotos} fotos</span>` : ''}</div>
        <div class="car-info">
          <h3>${v.marca} ${v.modelo}</h3>
          <p class="car-versao">${v.versao || ''}</p>
          <p class="car-meta">${v.ano}/${v.anoModelo} · ${km(v.km)} · ${cap(v.cambio)}</p>
          <div class="car-bottom"><span class="car-price">${fmt(v.preco)}</span></div>
        </div>
      </button>`;
    card.querySelector('.car-photo').prepend(makeImg(v.img, `${v.marca} ${v.modelo}`, true));
    card.querySelector('.car-link').onclick = () => openModal(v);
    grid.appendChild(card);
  });
}

function clearFilters() {
  if (searchInput) searchInput.value = '';
  [filterMarca, filterUso, filterCambio, filterCombustivel, filterPreco, filterOrder].forEach(s => { if (s) s.value = ''; });
  applyFilters();
}

const clearBtn = document.getElementById('clearFiltersBtn');
if (clearBtn) clearBtn.onclick = clearFilters;

if (searchInput) searchInput.addEventListener('input', applyFilters);
[filterMarca, filterUso, filterCambio, filterCombustivel, filterPreco, filterOrder]
  .forEach(s => { if (s) s.addEventListener('change', applyFilters); });

// ===== MODAL =====
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modalImg');
const modalBody = document.getElementById('modalBody');

function openModal(v) {
  if (!modal || !modalImg || !modalBody) return;

  // Só caminhos válidos: sem foto a galeria fica vazia e mostra o placeholder
  const photos = ((v.fotos && v.fotos.length > 0) ? v.fotos : [v.img])
    .filter(p => p && typeof p === 'string' && p.trim());
  let current = 0;
  // AbortController para limpar event listeners de touch ao trocar de foto
  let touchAbort = new AbortController();

  function renderPhoto() {
    // Cancela listeners de touch da renderização anterior
    touchAbort.abort();
    touchAbort = new AbortController();

    modalImg.innerHTML = '';
    modalImg.appendChild(makeImg(photos[current], `${v.marca} ${v.modelo}`, false));
    if (photos.length > 1) {
      modalImg.insertAdjacentHTML('beforeend', `
        <button class="modal-nav modal-nav-left" id="mPrev" aria-label="Foto anterior"><svg class="ico"><use href="#i-chev-l"/></svg></button>
        <button class="modal-nav modal-nav-right" id="mNext" aria-label="Próxima foto"><svg class="ico"><use href="#i-chev-r"/></svg></button>
        <div class="modal-photo-counter">${current + 1} de ${photos.length}</div>`);
      document.getElementById('mPrev').onclick = () => { current = (current - 1 + photos.length) % photos.length; renderPhoto(); };
      document.getElementById('mNext').onclick = () => { current = (current + 1) % photos.length; renderPhoto(); };
    }

    // Swipe de fotos no modal (mobile) — signal garante remoção ao re-render
    let mTouchX = 0;
    modalImg.addEventListener('touchstart', e => { mTouchX = e.touches[0].clientX; }, { passive: true, signal: touchAbort.signal });
    modalImg.addEventListener('touchend', e => {
      const diff = mTouchX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40 && photos.length > 1) {
        current = diff > 0
          ? (current + 1) % photos.length
          : (current - 1 + photos.length) % photos.length;
        renderPhoto();
      }
    }, { signal: touchAbort.signal });
  }
  renderPhoto();

  modalBody.innerHTML = `
    <h2>${v.marca} ${v.modelo}</h2>
    <p style="color:var(--text2);margin-top:4px">${v.versao || ''}</p>
    <div class="modal-price">${fmt(v.preco)}</div>
    <div class="modal-specs">
      <div class="spec"><small>Ano</small><strong>${v.ano}/${v.anoModelo}</strong></div>
      <div class="spec"><small>Quilometragem</small><strong>${km(v.km)}</strong></div>
      <div class="spec"><small>Câmbio</small><strong>${cap(v.cambio)}</strong></div>
      <div class="spec"><small>Combustível</small><strong>${v.combustivel || '—'}</strong></div>
      <div class="spec"><small>Cor</small><strong>${v.cor || 'Não informada'}</strong></div>
    </div>
    ${v.opcionais && v.opcionais.length ? `<h4 class="modal-subtitle">Opcionais</h4><div class="modal-opcionais">${v.opcionais.map(o => `<span>${o}</span>`).join('')}</div>` : ''}
    <div class="modal-desc">${v.desc || ''}</div>
    <a href="${wpp(`Olá, tenho interesse no ${v.marca} ${v.modelo} ${v.versao} (${v.ano}) - ${fmt(v.preco)} que vi no site da BT Veículos. Pode me passar mais informações?`)}" target="_blank" rel="noopener" class="btn-whatsapp" data-track-whats="detalhes-veiculo" data-carro="${nomeCarro(v)}" data-carro-id="${v.id}"><svg class="ico ico-fill" width="18" height="18"><use href="#i-whats"/></svg>Perguntar sobre este carro no WhatsApp</a>`;

  if (window.btTrack) btTrack('car', v.id, nomeCarro(v));
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

const modalClose = document.getElementById('modalClose');
if (modalClose) modalClose.onclick = closeModal;
if (modal) modal.onclick = e => { if (e.target === modal) closeModal(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// Busca rápida da página inicial chega como ?marca=...&preco=...
const params = new URLSearchParams(location.search);
if (filterMarca && params.get('marca')) filterMarca.value = params.get('marca');
if (filterPreco && params.get('preco')) filterPreco.value = params.get('preco');

// Primeira renderização
applyFilters();
