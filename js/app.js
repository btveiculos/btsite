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

document.querySelectorAll('.js-count').forEach(el => { el.textContent = STOCK.length || ''; });
const footerYearEl = document.getElementById('footerYear');
if (footerYearEl) footerYearEl.textContent = new Date().getFullYear();

// ===== DESTAQUE DO TOPO =====
// Os veículos marcados como destaque no painel; sem nenhum, os primeiros do estoque.
const featured = STOCK.filter(v => v.destaque).length ? STOCK.filter(v => v.destaque) : STOCK.slice(0, 5);
const heroSlide = document.getElementById('heroSlide');
const heroDots = document.getElementById('heroDots');
let heroIdx = 0, heroTimer = null;

function renderHero() {
  const v = featured[heroIdx];
  const old = heroSlide.querySelector('img, svg, .car-img-placeholder');
  if (old) old.remove();
  // Sempre a foto real do carro (v.img): o enquadramento fica igual em todos
  heroSlide.prepend(makeImg(v.img || (v.fotos && v.fotos[0]), `${v.marca} ${v.modelo}`, false));
  document.getElementById('heroLabel').textContent = v.marca;
  document.getElementById('heroName').textContent = v.modelo;
  document.getElementById('heroMeta').textContent = `${v.ano}/${v.anoModelo} · ${km(v.km)} · ${cap(v.cambio)}`;
  document.getElementById('heroPrice').textContent = fmt(v.preco);
  heroDots.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === heroIdx));
}

function heroGo(step) {
  heroIdx = (heroIdx + step + featured.length) % featured.length;
  renderHero();
  clearInterval(heroTimer);
  if (featured.length > 1) heroTimer = setInterval(() => heroGo(1), 6000);
}

if (featured.length) {
  featured.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'dot';
    dot.setAttribute('aria-label', `Destaque ${i + 1}`);
    dot.onclick = () => heroGo(i - heroIdx);
    heroDots.appendChild(dot);
  });
  heroSlide.onclick = () => openModal(featured[heroIdx]);
  document.getElementById('prevBtn').onclick = () => heroGo(-1);
  document.getElementById('nextBtn').onclick = () => heroGo(1);
  if (featured.length < 2) document.querySelector('.hero-nav').style.display = 'none';
  heroGo(0);

  let tx = 0;
  heroSlide.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  heroSlide.addEventListener('touchend', e => {
    const diff = tx - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) heroGo(diff > 0 ? 1 : -1);
  });
} else {
  document.getElementById('heroFeature').style.display = 'none';
}

// ===== DESTAQUES DO ESTOQUE =====
function vehicleCard(v) {
  const nFotos = (v.fotos && v.fotos.length) ? v.fotos.length : (v.img ? 1 : 0);
  const card = document.createElement('article');
  card.className = 'vehicle-card';
  card.innerHTML = `
    <div class="card-img">
      <span class="badge badge-${v.uso}">${v.uso}</span>
      ${nFotos > 1 ? `<span class="gallery-counter"><svg class="ico" width="13" height="13"><use href="#i-camera"/></svg>${nFotos}</span>` : ''}
    </div>
    <div class="card-body">
      <div class="marca">${v.marca}</div>
      <h3>${v.modelo}</h3>
      <div class="versao">${v.versao}</div>
      <div class="specs">
        <span><svg class="ico"><use href="#i-cal"/></svg>${v.ano}/${v.anoModelo}</span>
        <span><svg class="ico"><use href="#i-gauge"/></svg>${km(v.km)}</span>
        <span><svg class="ico"><use href="#i-gear"/></svg>${cap(v.cambio)}</span>
        <span><svg class="ico"><use href="#i-fuel"/></svg>${v.combustivel}</span>
      </div>
      <div class="price">${fmt(v.preco)}</div>
      <div class="card-actions">
        <button type="button" class="btn-detail">Ver detalhes</button>
        <button type="button" class="btn-wpp" aria-label="Chamar no WhatsApp sobre este veículo"><svg class="ico ico-fill" width="17" height="17"><use href="#i-whats"/></svg>WhatsApp</button>
      </div>
    </div>`;
  const imgBox = card.querySelector('.card-img');
  imgBox.prepend(makeImg(v.img, `${v.marca} ${v.modelo}`, true));
  imgBox.style.cursor = 'pointer';
  imgBox.onclick = () => openModal(v);
  card.querySelector('.btn-detail').onclick = () => openModal(v);
  card.querySelector('.btn-wpp').onclick = () =>
    window.open(wpp(`Olá, tenho interesse no ${v.marca} ${v.modelo} ${v.versao} que vi no site da BT Veículos.`), '_blank');
  return card;
}

const homeGrid = document.getElementById('homeGrid');
if (homeGrid) {
  // Destaques primeiro; completa com o restante do estoque até fechar 8 cards
  const marked = STOCK.filter(v => v.destaque);
  // Do restante, primeiro os que já têm galeria de fotos
  const nf = v => (v.fotos ? v.fotos.length : 0);
  const rest = STOCK.filter(v => !v.destaque).sort((a, b) => (nf(b) > 2) - (nf(a) > 2));
  marked.concat(rest).slice(0, 8).forEach(v => homeGrid.appendChild(vehicleCard(v)));
  if (!STOCK.length) homeGrid.innerHTML = '<div class="empty-state"><p>Estoque sendo atualizado. Chame no WhatsApp para saber o que está disponível.</p></div>';
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
