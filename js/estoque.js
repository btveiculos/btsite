// ===== PÁGINA DE ESTOQUE (TELA CHEIA) =====
// Script próprio: o app.js depende de elementos que só existem na landing page
// (carrossel, formulários, depoimentos) e quebraria aqui.

const fmt = p => 'R$ ' + Number(p || 0).toLocaleString('pt-BR');
const wpp = msg => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;

const carSVG = `<svg viewBox="0 0 430 155" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="215" cy="148" rx="175" ry="7" fill="black" opacity=".3"/><path d="M45 118C45 118 52 88 75 78 95 70 125 60 162 54 190 50 225 48 255 48 285 48 315 52 338 60 355 66 367 76 374 90 380 102 382 114 382 118L45 118Z" fill="#222"/><path d="M158 56C175 52 205 50 240 50 272 50 300 52 320 58 337 63 348 70 352 80L352 88C352 90 350 92 347 92L152 92C149 92 147 90 147 88L147 74C147 66 151 60 158 56Z" fill="rgba(0,0,0,.5)"/><circle cx="108" cy="124" r="22" fill="#0d0d0d" stroke="#222" stroke-width="2"/><circle cx="108" cy="124" r="13" fill="#181818"/><circle cx="318" cy="124" r="22" fill="#0d0d0d" stroke="#222" stroke-width="2"/><circle cx="318" cy="124" r="13" fill="#181818"/></svg>`;

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
  mobileToggle.onclick = () => mobileMenu.classList.toggle('open');
}

const wppMsg = 'Olá, gostaria de mais informações sobre os veículos da BT Veículos.';
['headerWhatsapp', 'mobileWhatsapp', 'whatsappFloat'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.onclick = e => { e.preventDefault(); window.open(wpp(wppMsg), '_blank'); };
});

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
    resultsCount.innerHTML = `<strong>${list.length}</strong> ${list.length === 1 ? 'veículo encontrado' : 'veículos encontrados'}`;
  }

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state">
      <p>${STOCK.length ? 'Nenhum veículo encontrado com esses filtros.' : 'Estoque sendo atualizado. Fale com um consultor.'}</p>
      ${STOCK.length ? '<button class="btn-outline" id="emptyClearBtn">Limpar filtros</button>' : ''}
    </div>`;
    const b = document.getElementById('emptyClearBtn');
    if (b) b.onclick = clearFilters;
    return;
  }

  list.forEach(v => {
    const nFotos = (v.fotos && v.fotos.length) ? v.fotos.length : (v.img ? 1 : 0);
    const card = document.createElement('div');
    card.className = 'vehicle-card';
    card.innerHTML = `
      <div class="card-img">
        ${v.destaque ? '<span class="tag-destaque">★ Destaque</span>' : ''}
        <span class="badge badge-${v.uso}">${v.uso}</span>
        ${nFotos > 1 ? `<span class="gallery-counter">📷 ${nFotos}</span>` : ''}
      </div>
      <div class="card-body">
        <div class="marca">${v.marca}</div>
        <h3>${v.modelo}</h3>
        <div class="versao">${v.versao}</div>
        <div class="specs">
          <span>📅 ${v.ano}/${v.anoModelo}</span>
          <span>🛣️ ${Number(v.km || 0).toLocaleString('pt-BR')} km</span>
          <span>⚙️ ${v.cambio}</span>
          <span>⛽ ${v.combustivel}</span>
        </div>
        <div class="price">${fmt(v.preco)}</div>
        <div class="card-actions">
          <button class="btn-detail">Ver detalhes</button>
          <button class="btn-wpp">💬 WhatsApp</button>
        </div>
      </div>`;

    card.querySelector('.card-img').prepend(makeImg(v.img, `${v.marca} ${v.modelo}`, true));
    card.querySelector('.btn-detail').onclick = () => openModal(v);
    card.querySelector('.btn-wpp').onclick = () =>
      window.open(wpp(`Olá, tenho interesse no ${v.marca} ${v.modelo} ${v.versao} que vi no site da BT Veículos.`), '_blank');

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

  function renderPhoto() {
    modalImg.innerHTML = '';
    modalImg.appendChild(makeImg(photos[current], `${v.marca} ${v.modelo}`, false));
    if (photos.length > 1) {
      modalImg.innerHTML += `
        <button class="modal-nav modal-nav-left" id="mPrev">&#10094;</button>
        <button class="modal-nav modal-nav-right" id="mNext">&#10095;</button>
        <div class="modal-photo-counter">${current + 1} / ${photos.length}</div>`;
      const p = document.getElementById('mPrev');
      const n = document.getElementById('mNext');
      if (p) p.onclick = () => { current = (current - 1 + photos.length) % photos.length; renderPhoto(); };
      if (n) n.onclick = () => { current = (current + 1) % photos.length; renderPhoto(); };
    }
  }
  renderPhoto();

  modalBody.innerHTML = `
    <h2>${v.marca} ${v.modelo}</h2>
    <p style="color:var(--text2);margin-bottom:4px">${v.versao}</p>
    <div class="modal-price">${fmt(v.preco)}</div>
    <div class="modal-specs">
      <div class="spec"><small>Ano</small><strong>${v.ano}/${v.anoModelo}</strong></div>
      <div class="spec"><small>Km</small><strong>${Number(v.km || 0).toLocaleString('pt-BR')} km</strong></div>
      <div class="spec"><small>Câmbio</small><strong>${v.cambio}</strong></div>
      <div class="spec"><small>Combustível</small><strong>${v.combustivel}</strong></div>
      <div class="spec"><small>Cor</small><strong>${v.cor || 'N/I'}</strong></div>
      <div class="spec"><small>Uso</small><strong style="text-transform:capitalize">${v.uso}</strong></div>
    </div>
    ${v.opcionais && v.opcionais.length ? `<h4 style="font-size:12px;margin-bottom:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;font-weight:600">Opcionais e equipamentos</h4><div class="modal-opcionais">${v.opcionais.map(o => `<span>✓ ${o}</span>`).join('')}</div>` : ''}
    <div class="modal-desc">${v.desc || ''}</div>
    <a href="${wpp(`Olá, tenho interesse no ${v.marca} ${v.modelo} ${v.versao} (${v.ano}) - ${fmt(v.preco)} que vi no site da BT Veículos. Pode me passar mais informações?`)}" target="_blank" class="btn-whatsapp">💬 Tenho interesse neste veículo</a>
    <p style="text-align:center;color:var(--text3);font-size:11px;margin-top:10px">Você será direcionado ao WhatsApp da BT Veículos</p>`;

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

// Primeira renderização
applyFilters();
