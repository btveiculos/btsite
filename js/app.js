// ===== PÁGINA INICIAL =====
const STOCK = (typeof VEHICLES !== 'undefined' && Array.isArray(VEHICLES)) ? VEHICLES : [];

const fmt = p => 'R$ ' + Number(p || 0).toLocaleString('pt-BR');
const km = n => Number(n || 0).toLocaleString('pt-BR') + ' km';
const cap = s => { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };
const wpp = msg => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
// 5511993662724 -> (11) 99366-2724
const fmtPhone = n => String(n).replace(/^55/, '').replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');

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

// ===== CABEÇALHO =====
const mobileMenuEl = document.getElementById('mobileMenu');
const mobileToggleEl = document.getElementById('mobileToggle');
const closeMobileMenu = () => mobileMenuEl.classList.remove('open');
mobileToggleEl.onclick = () => mobileMenuEl.classList.toggle('open');
document.querySelectorAll('.nav-mobile a').forEach(a => a.addEventListener('click', closeMobileMenu));
// O header é fixo: sem isto o menu aberto fica parado em cima do conteúdo ao rolar
window.addEventListener('scroll', closeMobileMenu, { passive: true });
document.addEventListener('click', e => {
  if (!mobileMenuEl.contains(e.target) && !mobileToggleEl.contains(e.target)) closeMobileMenu();
});

// ===== WHATSAPP =====
const wppMsg = 'Olá! Vi o site da BT Veículos e gostaria de mais informações.';
['headerWhatsapp', 'mobileWhatsapp', 'heroWhatsapp', 'contatoWhatsapp', 'whatsappFloat'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.onclick = e => { e.preventDefault(); window.open(wpp(wppMsg), '_blank'); };
});
document.querySelectorAll('[data-whats]').forEach(el => { el.textContent = fmtPhone(WHATSAPP); });

// Botão flutuante (só no celular) aparece depois que o topo sai da tela
const floatBtn = document.getElementById('whatsappFloat');
const onScroll = () => floatBtn && floatBtn.classList.toggle('show', window.scrollY > 500);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

document.querySelectorAll('.js-count').forEach(el => { if (STOCK.length) el.textContent = STOCK.length; });
const footerYearEl = document.getElementById('footerYear');
if (footerYearEl) footerYearEl.textContent = new Date().getFullYear();

// ===== BUSCA RÁPIDA (leva para o estoque já filtrado) =====
const buscaMarca = document.getElementById('buscaMarca');
if (buscaMarca) {
  [...new Set(STOCK.map(v => v.marca).filter(Boolean))].sort().forEach(m => {
    const o = document.createElement('option');
    o.value = m;
    o.textContent = m;
    buscaMarca.appendChild(o);
  });
}

// ===== CARD DE CARRO =====
function carCard(v) {
  const card = document.createElement('article');
  card.className = 'car';
  card.innerHTML = `
    <button type="button" class="car-link" aria-label="Ver detalhes: ${v.marca} ${v.modelo}, ${fmt(v.preco)}">
      <div class="car-photo"></div>
      <div class="car-info">
        <h3>${v.marca} ${v.modelo}</h3>
        <p class="car-versao">${v.versao || ''}</p>
        <p class="car-meta">${v.ano}/${v.anoModelo} · ${km(v.km)} · ${cap(v.cambio)}</p>
        <div class="car-bottom"><span class="car-price">${fmt(v.preco)}</span></div>
      </div>
    </button>`;
  card.querySelector('.car-photo').prepend(makeImg(v.img, `${v.marca} ${v.modelo}`, true));
  card.querySelector('.car-link').onclick = () => openModal(v);
  return card;
}

// Destaques: os marcados no painel primeiro, depois os que têm mais fotos
const nFotos = v => (v.fotos && v.fotos.length) ? v.fotos.length : (v.img ? 1 : 0);
const destGrid = document.getElementById('destaquesGrid');
if (destGrid) {
  const marked = STOCK.filter(v => v.destaque);
  const others = STOCK.filter(v => !v.destaque).sort((a, b) => nFotos(b) - nFotos(a));
  marked.concat(others).slice(0, 6).forEach((v, i) => {
    const card = carCard(v);
    card.classList.add('rv');
    if (i % 3) card.classList.add('d' + (i % 3));
    destGrid.appendChild(card);
  });
  if (!STOCK.length) destGrid.innerHTML = '<div class="empty-state"><p>Estoque sendo atualizado. Fale com a gente no WhatsApp para saber o que está disponível.</p></div>';
}

// ===== DETALHES DO VEÍCULO =====
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modalImg');
const modalBody = document.getElementById('modalBody');

function openModal(v) {
  // Só caminhos válidos: sem foto a galeria fica vazia e mostra o placeholder
  const photos = ((v.fotos && v.fotos.length > 0) ? v.fotos : [v.img])
    .filter(p => p && typeof p === 'string' && p.trim());
  let current = 0;
  let touchAbort = new AbortController();

  function renderPhoto() {
    // Cancela os listeners de toque da foto anterior antes de recriar
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

    let mTouchX = 0;
    modalImg.addEventListener('touchstart', e => { mTouchX = e.touches[0].clientX; }, { passive: true, signal: touchAbort.signal });
    modalImg.addEventListener('touchend', e => {
      const diff = mTouchX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40 && photos.length > 1) {
        current = diff > 0 ? (current + 1) % photos.length : (current - 1 + photos.length) % photos.length;
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
    <a href="${wpp(`Olá, tenho interesse no ${v.marca} ${v.modelo} ${v.versao} (${v.ano}) - ${fmt(v.preco)} que vi no site da BT Veículos. Pode me passar mais informações?`)}" target="_blank" rel="noopener" class="btn-whatsapp"><svg class="ico ico-fill" width="18" height="18"><use href="#i-whats"/></svg>Perguntar sobre este carro no WhatsApp</a>`;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('open');
  document.body.style.overflow = '';
}
document.getElementById('modalClose').onclick = closeModal;
modal.onclick = e => { if (e.target === modal) closeModal(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ===== FINANCIAMENTO E TROCA =====
const tabs = [['tabFin', 'formFinanciamento'], ['tabTroca', 'formVenda']];
tabs.forEach(([tabId, formId]) => {
  document.getElementById(tabId).onclick = () => tabs.forEach(([t, f]) => {
    document.getElementById(t).setAttribute('aria-selected', String(t === tabId));
    document.getElementById(f).hidden = f !== formId;
  });
});
// Links "Troca" e "Financiamento" do menu já abrem o formulário certo
document.querySelectorAll('a[href="#venda"]').forEach(a => a.addEventListener('click', () => document.getElementById('tabTroca').click()));
document.querySelectorAll('a[href="#financiamento"]').forEach(a => a.addEventListener('click', () => document.getElementById('tabFin').click()));

const val = id => document.getElementById(id).value.trim();
function sendForm(form, msg) {
  window.open(wpp(msg), '_blank');
  form.classList.add('submitted');
  setTimeout(() => { form.classList.remove('submitted'); form.reset(); }, 2500);
}
document.getElementById('formFinanciamento').onsubmit = e => {
  e.preventDefault();
  sendForm(e.target, `Olá! Quero simular um financiamento.\n\nNome: ${val('fNome')}\nWhatsApp: ${val('fFone')}\nCarro de interesse: ${val('fCarro') || '-'}\nEntrada aproximada: ${val('fEntrada') || '-'}`);
};
document.getElementById('formVenda').onsubmit = e => {
  e.preventDefault();
  sendForm(e.target, `Olá! Quero avaliar meu carro na troca.\n\nNome: ${val('tNome')}\nWhatsApp: ${val('tFone')}\nCarro: ${val('tCarro')}\nQuilometragem: ${val('tKm') || '-'}`);
};

// ===== ROLAGEM ATÉ AS SEÇÕES (desconta o cabeçalho fixo) =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.pageYOffset - document.getElementById('header').offsetHeight;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// ===== MENU, PARALLAX E REVELAÇÃO =====
const header = document.getElementById('header');
const calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Fundo desliza mais devagar que a página dentro da própria moldura
const parallax = [['heroBg', .18], ['lojaFoto', .07], ['fechoBg', .07]]
  .map(([id, k]) => [document.getElementById(id), k]).filter(([el]) => el);

function onScrollCine() {
  header.classList.toggle('rol', window.scrollY > 40);
  if (calmo) return;
  const vh = window.innerHeight;
  parallax.forEach(([el, k]) => {
    const r = el.parentElement.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    const centro = r.top + r.height / 2 - vh / 2;
    // Nunca desloca mais que a sobra da foto (inset negativo no CSS), senão aparece borda vazia
    const sobra = (el.offsetHeight - el.parentElement.offsetHeight) / 2;
    const d = Math.max(-sobra, Math.min(sobra, -centro * k));
    el.style.translate = `0 ${d.toFixed(1)}px`;
  });
}
window.addEventListener('scroll', onScrollCine, { passive: true });
onScrollCine();

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));
} else {
  document.querySelectorAll('.rv').forEach(el => el.classList.add('in'));
}
