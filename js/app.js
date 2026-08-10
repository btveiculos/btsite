// ===== UTILITIES =====
const fmt = p => 'R$ ' + p.toLocaleString('pt-BR');
const wpp = msg => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
const carSVG = `<svg viewBox="0 0 430 155" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="215" cy="148" rx="175" ry="7" fill="black" opacity=".3"/><path d="M45 118C45 118 52 88 75 78 95 70 125 60 162 54 190 50 225 48 255 48 285 48 315 52 338 60 355 66 367 76 374 90 380 102 382 114 382 118L45 118Z" fill="#222"/><path d="M158 56C175 52 205 50 240 50 272 50 300 52 320 58 337 63 348 70 352 80L352 88C352 90 350 92 347 92L152 92C149 92 147 90 147 88L147 74C147 66 151 60 158 56Z" fill="rgba(0,0,0,.5)"/><circle cx="108" cy="124" r="22" fill="#0d0d0d" stroke="#222" stroke-width="2"/><circle cx="108" cy="124" r="13" fill="#181818"/><circle cx="318" cy="124" r="22" fill="#0d0d0d" stroke="#222" stroke-width="2"/><circle cx="318" cy="124" r="13" fill="#181818"/></svg>`;

function carImg(v) {
  const img = document.createElement('img');
  img.src = v.img;
  img.alt = v.marca + ' ' + v.modelo;
  img.loading = 'lazy';
  img.onerror = function() { this.outerHTML = carSVG; };
  return img;
}

function carHeroImg(v) {
  const img = document.createElement('img');
  img.src = v.heroImg || v.img;
  img.alt = v.marca + ' ' + v.modelo;
  img.onerror = function() { this.outerHTML = carSVG; };
  return img;
}

// ===== HEADER =====
window.addEventListener('scroll', () => {
  document.getElementById('header').classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

document.getElementById('mobileToggle').onclick = () => {
  document.getElementById('mobileMenu').classList.toggle('open');
};
document.querySelectorAll('.nav-mobile a').forEach(a => {
  a.addEventListener('click', () => document.getElementById('mobileMenu').classList.remove('open'));
});

// ===== WHATSAPP =====
const wppMsg = 'Olá, gostaria de mais informações sobre os veículos da BT Veículos.';
['headerWhatsapp','mobileWhatsapp','heroWhatsapp','contatoWhatsapp','whatsappFloat'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.onclick = e => { e.preventDefault(); window.open(wpp(wppMsg), '_blank'); };
});

// ===== HERO CAROUSEL =====
const featured = VEHICLES.filter(v => v.destaque);
let heroIdx = 0, heroAnim = false, heroTimer;
const track = document.getElementById('carouselTrack');
const infoEl = document.getElementById('heroInfo');
const dotsEl = document.getElementById('heroDots');

function renderHero() {
  const prev = featured[(heroIdx - 1 + featured.length) % featured.length];
  const cur = featured[heroIdx];
  const next = featured[(heroIdx + 1) % featured.length];

  track.innerHTML = '';
  const left = document.createElement('div');
  left.className = 'car-slide side';
  left.appendChild(carHeroImg(prev));
  left.innerHTML += '<div class="car-platform"></div>';
  left.onclick = () => heroGo('p');
  
  const center = document.createElement('div');
  center.className = 'car-slide center';
  center.appendChild(carHeroImg(cur));
  center.innerHTML += '<div class="car-platform"></div>';
  
  const right = document.createElement('div');
  right.className = 'car-slide side';
  right.appendChild(carHeroImg(next));
  right.innerHTML += '<div class="car-platform"></div>';
  right.onclick = () => heroGo('n');
  
  track.append(left, center, right);
  infoEl.querySelector('.hero-car-name').textContent = `${cur.marca} ${cur.modelo} · ${cur.versao} · ${cur.ano}`;
  infoEl.querySelector('.hero-car-price').textContent = fmt(cur.preco);

  dotsEl.innerHTML = '';
  featured.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'dot' + (i === heroIdx ? ' active' : '');
    dot.onclick = () => heroGoTo(i);
    dotsEl.appendChild(dot);
  });
}

function heroGo(dir) {
  if (heroAnim) return;
  heroAnim = true;
  track.classList.add('animating');
  infoEl.classList.add('animating');
  setTimeout(() => {
    heroIdx = dir === 'n' ? (heroIdx + 1) % featured.length : (heroIdx - 1 + featured.length) % featured.length;
    renderHero();
    track.classList.remove('animating');
    infoEl.classList.remove('animating');
    heroAnim = false;
  }, 400);
  resetHeroTimer();
}

function heroGoTo(i) {
  if (heroAnim || i === heroIdx) return;
  heroAnim = true;
  track.classList.add('animating');
  infoEl.classList.add('animating');
  setTimeout(() => {
    heroIdx = i;
    renderHero();
    track.classList.remove('animating');
    infoEl.classList.remove('animating');
    heroAnim = false;
  }, 400);
  resetHeroTimer();
}

function resetHeroTimer() {
  clearInterval(heroTimer);
  heroTimer = setInterval(() => heroGo('n'), 6000);
}

document.getElementById('prevBtn').onclick = () => heroGo('p');
document.getElementById('nextBtn').onclick = () => heroGo('n');
renderHero();
heroTimer = setInterval(() => heroGo('n'), 6000);

// Keyboard support
document.addEventListener('keydown', e => {
  if (document.getElementById('modal').classList.contains('open')) {
    if (e.key === 'Escape') { document.getElementById('modal').classList.remove('open'); document.body.style.overflow = ''; }
    return;
  }
  if (e.key === 'ArrowLeft') heroGo('p');
  if (e.key === 'ArrowRight') heroGo('n');
});

// Touch
let touchX = 0;
document.querySelector('.hero-carousel').addEventListener('touchstart', e => touchX = e.touches[0].clientX, { passive: true });
document.querySelector('.hero-carousel').addEventListener('touchend', e => {
  const diff = touchX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) heroGo(diff > 0 ? 'n' : 'p');
});

// ===== DESTAQUES =====
const destGrid = document.getElementById('destaquesGrid');
featured.forEach(v => {
  const card = document.createElement('div');
  card.className = 'destaque-card';
  card.innerHTML = `<div class="card-img"></div><div class="card-body"><h3>${v.marca} ${v.modelo}</h3><p>${v.ano} | ${v.combustivel} | ${v.cambio}</p><div class="price">${fmt(v.preco)}</div></div>`;
  card.querySelector('.card-img').appendChild(carImg(v));
  card.onclick = () => openModal(v);
  destGrid.appendChild(card);
});

// ===== ESTOQUE =====
const estoqueGrid = document.getElementById('estoqueGrid');
const filterMarca = document.getElementById('filterMarca');
const marcas = [...new Set(VEHICLES.map(v => v.marca))].sort();
marcas.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; filterMarca.appendChild(o); });

function renderEstoque() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const marca = filterMarca.value;
  const cambio = document.getElementById('filterCambio').value;
  const preco = document.getElementById('filterPreco').value;
  const order = document.getElementById('filterOrder').value;

  let list = [...VEHICLES];
  if (search) list = list.filter(v => `${v.marca} ${v.modelo} ${v.versao}`.toLowerCase().includes(search));
  if (marca) list = list.filter(v => v.marca === marca);
  if (cambio) list = list.filter(v => v.cambio === cambio);
  if (preco) list = list.filter(v => v.preco <= parseInt(preco));
  if (order === 'menor') list.sort((a,b) => a.preco - b.preco);
  if (order === 'maior') list.sort((a,b) => b.preco - a.preco);
  if (order === 'km') list.sort((a,b) => a.km - b.km);
  if (order === 'ano') list.sort((a,b) => b.ano - a.ano);

  document.getElementById('resultsCount').innerHTML = `<strong>${list.length}</strong> ${list.length === 1 ? 'veículo encontrado' : 'veículos encontrados'}`;
  window._filteredList = list;
  window._showCount = 6;
  renderCards();
}

function renderCards() {
  const list = window._filteredList || [];
  const count = window._showCount || 6;
  const visible = list.slice(0, count);

  estoqueGrid.innerHTML = '';
  if (list.length === 0) {
    estoqueGrid.innerHTML = `<div class="empty-state"><p>Nenhum veículo encontrado com esses filtros.</p><button class="btn-outline" onclick="clearFilters()">Limpar filtros</button></div>`;
    document.getElementById('loadMoreWrap').style.display = 'none';
    return;
  }

  visible.forEach(v => {
    const card = document.createElement('div');
    card.className = 'vehicle-card';
    const destaqueTag = v.destaque ? '<span class="tag-destaque">★ Destaque</span>' : '';
    card.innerHTML = `
      <div class="card-img">${destaqueTag}<span class="badge badge-${v.uso}">${v.uso}</span></div>
      <div class="card-body">
        <div class="marca">${v.marca}</div>
        <h3>${v.modelo}</h3>
        <div class="versao">${v.versao}</div>
        <div class="specs">
          <span>📅 ${v.ano}/${v.anoModelo}</span>
          <span>🛣️ ${v.km.toLocaleString('pt-BR')} km</span>
          <span>⚙️ ${v.cambio}</span>
          <span>⛽ ${v.combustivel}</span>
        </div>
        <div class="price">${fmt(v.preco)}</div>
        <div class="card-actions">
          <button class="btn-detail">Ver detalhes</button>
          <button class="btn-wpp">💬 WhatsApp</button>
        </div>
      </div>`;
    card.querySelector('.card-img').prepend(carImg(v));
    card.querySelector('.btn-detail').onclick = () => openModal(v);
    card.querySelector('.btn-wpp').onclick = () => window.open(wpp(`Olá, tenho interesse no ${v.marca} ${v.modelo} ${v.versao} que vi no site da BT Veículos.`), '_blank');
    estoqueGrid.appendChild(card);
  });

  document.getElementById('loadMoreWrap').style.display = count < list.length ? 'block' : 'none';
}

document.getElementById('loadMoreBtn').onclick = () => {
  window._showCount += 6;
  renderCards();
};

function clearFilters() {
  document.getElementById('searchInput').value = '';
  filterMarca.value = '';
  document.getElementById('filterCambio').value = '';
  document.getElementById('filterPreco').value = '';
  document.getElementById('filterOrder').value = '';
  renderEstoque();
}

document.getElementById('searchInput').addEventListener('input', renderEstoque);
filterMarca.addEventListener('change', renderEstoque);
document.getElementById('filterCambio').addEventListener('change', renderEstoque);
document.getElementById('filterPreco').addEventListener('change', renderEstoque);
document.getElementById('filterOrder').addEventListener('change', renderEstoque);
renderEstoque();

// ===== MODAL =====
function openModal(v) {
  const modal = document.getElementById('modal');
  const imgDiv = document.getElementById('modalImg');
  const body = document.getElementById('modalBody');
  
  // Gallery with multiple photos
  const photos = v.fotos && v.fotos.length > 0 ? v.fotos : [v.img];
  let currentPhoto = 0;
  
  function renderPhoto() {
    imgDiv.innerHTML = '';
    const img = document.createElement('img');
    img.src = photos[currentPhoto];
    img.alt = v.marca + ' ' + v.modelo;
    img.onerror = function() { this.outerHTML = carSVG; };
    imgDiv.appendChild(img);
    
    if (photos.length > 1) {
      imgDiv.innerHTML += `
        <button class="modal-nav modal-nav-left" onclick="modalPrevPhoto()">&#10094;</button>
        <button class="modal-nav modal-nav-right" onclick="modalNextPhoto()">&#10095;</button>
        <div class="modal-photo-counter">${currentPhoto+1} / ${photos.length}</div>
      `;
    }
  }
  
  window.modalPrevPhoto = () => { currentPhoto = (currentPhoto - 1 + photos.length) % photos.length; renderPhoto(); };
  window.modalNextPhoto = () => { currentPhoto = (currentPhoto + 1) % photos.length; renderPhoto(); };
  
  renderPhoto();
  
  body.innerHTML = `
    <h2>${v.marca} ${v.modelo}</h2>
    <p style="color:var(--text2);margin-bottom:4px">${v.versao}</p>
    <div class="modal-price">${fmt(v.preco)}</div>
    <div class="modal-specs">
      <div class="spec"><small>Ano</small><strong>${v.ano}/${v.anoModelo}</strong></div>
      <div class="spec"><small>Km</small><strong>${v.km.toLocaleString('pt-BR')} km</strong></div>
      <div class="spec"><small>Câmbio</small><strong>${v.cambio}</strong></div>
      <div class="spec"><small>Combustível</small><strong>${v.combustivel}</strong></div>
      <div class="spec"><small>Cor</small><strong>${v.cor}</strong></div>
      <div class="spec"><small>Uso</small><strong style="text-transform:capitalize">${v.uso}</strong></div>
    </div>
    ${v.opcionais && v.opcionais.length ? `<h4 style="font-size:12px;margin-bottom:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;font-weight:600">Opcionais e equipamentos</h4><div class="modal-opcionais">${v.opcionais.map(o => `<span>✓ ${o}</span>`).join('')}</div>` : ''}
    <div class="modal-desc">${v.desc}</div>
    <a href="${wpp(`Olá, tenho interesse no ${v.marca} ${v.modelo} ${v.versao} (${v.ano}) - ${fmt(v.preco)} que vi no site da BT Veículos. Pode me passar mais informações?`)}" target="_blank" class="btn-whatsapp">💬 Tenho interesse neste veículo</a>
    <p style="text-align:center;color:var(--text3);font-size:11px;margin-top:10px">Você será direcionado ao WhatsApp da BT Veículos</p>
  `;
  
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

document.getElementById('modalClose').onclick = () => {
  document.getElementById('modal').classList.remove('open');
  document.body.style.overflow = '';
};
document.getElementById('modal').onclick = e => {
  if (e.target === e.currentTarget) { document.getElementById('modal').classList.remove('open'); document.body.style.overflow = ''; }
};

// ===== FORMS =====
document.getElementById('formFinanciamento').onsubmit = e => {
  e.preventDefault();
  const f = e.target;
  const msg = `*Simulação de Financiamento - BT Veículos*\n\nNome: ${f[0].value}\nWhatsApp: ${f[1].value}\nVeículo de interesse: ${f[2].value}\nEntrada disponível: ${f[3].value}\nMensagem: ${f[4].value}`;
  window.open(wpp(msg), '_blank');
  f.classList.add('submitted');
  setTimeout(() => { f.classList.remove('submitted'); f.reset(); }, 2000);
};

document.getElementById('formVenda').onsubmit = e => {
  e.preventDefault();
  const f = e.target;
  const msg = `*Avaliação de Veículo - BT Veículos*\n\nNome: ${f[0].value}\nWhatsApp: ${f[1].value}\nMarca: ${f[2].value}\nModelo: ${f[3].value}\nAno: ${f[4].value}\nQuilometragem: ${f[5].value}\nObservações: ${f[6].value}`;
  window.open(wpp(msg), '_blank');
  f.classList.add('submitted');
  setTimeout(() => { f.classList.remove('submitted'); f.reset(); }, 2000);
};

// ===== SCROLL REVEAL =====
const revealElements = document.querySelectorAll('.section-title, .section-sub, .form-block, .destaque-card, .vehicle-card, .contato-info, .contato-map, .cta-inner, .depoimento-card');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

revealElements.forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = `opacity .5s ease ${(i % 6) * .06}s, transform .5s ease ${(i % 6) * .06}s`;
  revealObserver.observe(el);
});

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ===== LAZY LOAD IMAGES =====
if ('IntersectionObserver' in window) {
  const imgObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        imgObserver.unobserve(img);
      }
    });
  });
  document.querySelectorAll('img[data-src]').forEach(img => imgObserver.observe(img));
}

// ===== ANIMATED COUNTERS =====
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.dataset.target);
      let current = 0;
      const duration = 2000;
      const step = target / (duration / 16);
      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        el.textContent = Math.floor(current);
      }, 16);
      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.numero-value[data-target]').forEach(el => counterObserver.observe(el));

// ===== COOKIE BANNER =====
const cookieBanner = document.getElementById('cookieBanner');
if (!localStorage.getItem('bt_cookies_accepted')) {
  setTimeout(() => cookieBanner.classList.add('show'), 2000);
}
document.getElementById('acceptCookies').onclick = () => {
  localStorage.setItem('bt_cookies_accepted', 'true');
  cookieBanner.classList.remove('show');
};

// ===== PRELOAD HERO IMAGES =====
featured.forEach(v => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = v.img;
  document.head.appendChild(link);
});
