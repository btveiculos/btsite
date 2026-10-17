// ===== PÁGINA INICIAL =====
const STOCK = (typeof VEHICLES !== 'undefined' && Array.isArray(VEHICLES)) ? VEHICLES : [];

const fmt = p => 'R$ ' + Number(p || 0).toLocaleString('pt-BR');
const km = n => Number(n || 0).toLocaleString('pt-BR') + ' km';
const cap = s => { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };
const wpp = msg => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
// 5511993662724 -> (11) 99366-2724
const fmtPhone = n => String(n).replace(/^55/, '').replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');

const carSVG = `<svg viewBox="0 0 430 155" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M45 118C45 118 52 88 75 78 95 70 125 60 162 54 190 50 225 48 255 48 285 48 315 52 338 60 355 66 367 76 374 90 380 102 382 114 382 118L45 118Z" fill="#3a3f46"/><circle cx="108" cy="124" r="22" fill="#2a2e34"/><circle cx="318" cy="124" r="22" fill="#2a2e34"/></svg>`;

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

document.querySelectorAll('.js-count').forEach(el => { el.textContent = STOCK.length || ''; });
const footerYearEl = document.getElementById('footerYear');
if (footerYearEl) footerYearEl.textContent = new Date().getFullYear();

// ===== NÚMEROS DO HERO (sempre calculados do estoque real) =====
if (STOCK.length) {
  const marcas = document.getElementById('dadoMarcas');
  const menor = document.getElementById('dadoMenor');
  if (marcas) marcas.textContent = new Set(STOCK.map(v => v.marca).filter(Boolean)).size;
  if (menor) menor.textContent = fmt(Math.min(...STOCK.map(v => Number(v.preco) || Infinity)));
} else {
  const dados = document.getElementById('heroDados');
  if (dados) dados.style.display = 'none';
}

// Faixa: o conteúdo é duplicado para o loop de translateX(-50%) não ter emenda
const faixa = document.getElementById('faixaTrack');
if (faixa) faixa.innerHTML = faixa.innerHTML.repeat(4);

// ===== DESTAQUES =====
// Os marcados como destaque no painel; completa com os que têm mais fotos até fechar 3.
const nFotos = v => (v.fotos && v.fotos.length) ? v.fotos.length : (v.img ? 1 : 0);
const marked = STOCK.filter(v => v.destaque);
const others = STOCK.filter(v => !v.destaque).sort((a, b) => nFotos(b) - nFotos(a));
const featured = marked.concat(others);

const destGrid = document.getElementById('destaquesGrid');
if (destGrid) {
  featured.slice(0, 3).forEach((v, i) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'cine-card rv' + (i ? ' d' + i : '');
    card.setAttribute('aria-label', `Ver detalhes: ${v.marca} ${v.modelo}, ${fmt(v.preco)}`);
    card.innerHTML = `
      <div class="tx">
        <small>${v.ano}/${v.anoModelo} · ${km(v.km)}</small>
        <h3>${v.marca} ${v.modelo}</h3>
        <div class="preco"><span>${fmt(v.preco)}</span><svg class="ico"><use href="#i-arrow"/></svg></div>
      </div>`;
    card.prepend(makeImg(v.img, `${v.marca} ${v.modelo}`, true));
    card.onclick = () => openModal(v);
    destGrid.appendChild(card);
  });
}

// Lista "modelo · ano ........ preço" da seção revisados: os quatro seguintes
const lista = document.getElementById('listaPrecos');
if (lista) {
  featured.slice(3, 7).forEach(v => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button"><span>${v.marca} ${v.modelo} · ${v.ano}</span><b>${fmt(v.preco)}</b></button>`;
    li.querySelector('button').onclick = () => openModal(v);
    lista.appendChild(li);
  });
}

// ===== NAVEGAÇÃO, REVELAÇÃO E PARALLAX =====
const header = document.getElementById('header');
const heroBg = document.getElementById('heroBg');
const duoFoto = document.getElementById('duoFoto');
const calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function onScroll() {
  const y = window.scrollY;
  header.classList.toggle('rol', y > 60);
  if (calmo) return;
  if (heroBg && y < window.innerHeight) heroBg.style.translate = `0 ${y * .22}px`;
  if (duoFoto) {
    const r = duoFoto.parentElement.getBoundingClientRect();
    // p vai de 0 (entrando por baixo) a 1 (saindo por cima); a foto tem 118% de altura e desliza 15%
    const p = Math.min(1, Math.max(0, (window.innerHeight - r.top) / (window.innerHeight + r.height)));
    duoFoto.style.translate = `0 ${(-p * 15).toFixed(2)}%`;
  }
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .14 });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));
} else {
  document.querySelectorAll('.rv').forEach(el => el.classList.add('in'));
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
        <div class="modal-photo-counter">${current + 1} / ${photos.length}</div>`);
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
    <p style="color:var(--text2);margin-top:4px">${v.versao}</p>
    <div class="modal-price">${fmt(v.preco)}</div>
    <div class="modal-specs">
      <div class="spec"><small>Ano</small><strong>${v.ano}/${v.anoModelo}</strong></div>
      <div class="spec"><small>Km</small><strong>${km(v.km)}</strong></div>
      <div class="spec"><small>Câmbio</small><strong>${cap(v.cambio)}</strong></div>
      <div class="spec"><small>Combustível</small><strong>${v.combustivel}</strong></div>
      <div class="spec"><small>Cor</small><strong>${v.cor || 'Não informada'}</strong></div>
      <div class="spec"><small>Tipo</small><strong>${cap(v.uso)}</strong></div>
    </div>
    ${v.opcionais && v.opcionais.length ? `<h4 class="modal-subtitle">Opcionais</h4><div class="modal-opcionais">${v.opcionais.map(o => `<span>${o}</span>`).join('')}</div>` : ''}
    <div class="modal-desc">${v.desc || ''}</div>
    <a href="${wpp(`Olá, tenho interesse no ${v.marca} ${v.modelo} ${v.versao} (${v.ano}) - ${fmt(v.preco)} que vi no site da BT Veículos. Pode me passar mais informações?`)}" target="_blank" rel="noopener" class="btn-whatsapp"><svg class="ico ico-fill" width="18" height="18"><use href="#i-whats"/></svg>Tenho interesse neste veículo</a>`;

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

// ===== FORMULÁRIOS (abrem o WhatsApp com a mensagem pronta) =====
function sendForm(form, msg) {
  window.open(wpp(msg), '_blank');
  form.classList.add('submitted');
  setTimeout(() => { form.classList.remove('submitted'); form.reset(); }, 2500);
}
document.getElementById('formFinanciamento').onsubmit = e => {
  e.preventDefault();
  const f = e.target;
  sendForm(f, `*Simulação de financiamento*\n\nNome: ${f[0].value}\nWhatsApp: ${f[1].value}\nVeículo de interesse: ${f[2].value}\nEntrada disponível: ${f[3].value}\nMensagem: ${f[4].value}`);
};
document.getElementById('formVenda').onsubmit = e => {
  e.preventDefault();
  const f = e.target;
  sendForm(f, `*Avaliação de veículo para troca*\n\nNome: ${f[0].value}\nWhatsApp: ${f[1].value}\nMarca: ${f[2].value}\nModelo: ${f[3].value}\nAno: ${f[4].value}\nQuilometragem: ${f[5].value}\nObservações: ${f[6].value}`);
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
