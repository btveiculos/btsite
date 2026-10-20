// ===== PÁGINA INICIAL =====
// Usa as funções de comum.js (card, detalhes do veículo, WhatsApp).

document.querySelectorAll('.js-count').forEach(el => { if (STOCK.length) el.textContent = STOCK.length; });

// ===== BUSCA RÁPIDA (leva para o estoque já filtrado) =====
const buscaMarca = document.getElementById('buscaMarca');
[...new Set(STOCK.map(v => v.marca).filter(Boolean))].sort().forEach(m => {
  const o = document.createElement('option');
  o.value = m;
  o.textContent = m;
  buscaMarca.appendChild(o);
});

// ===== DESTAQUES =====
// Os marcados no painel primeiro, depois os que têm mais fotos
const nFotos = v => (v.fotos && v.fotos.length) ? v.fotos.length : (v.img ? 1 : 0);
const destGrid = document.getElementById('destaquesGrid');
const marcados = STOCK.filter(v => v.destaque);
const outros = STOCK.filter(v => !v.destaque).sort((a, b) => nFotos(b) - nFotos(a));
marcados.concat(outros).slice(0, 6).forEach((v, i) => {
  const card = carCard(v);
  card.classList.add('rv');
  if (i % 3) card.classList.add('d' + (i % 3));
  destGrid.appendChild(card);
});
if (!STOCK.length) destGrid.innerHTML = '<div class="empty-state"><p>Estoque sendo atualizado. Fale com a gente no WhatsApp para saber o que está disponível.</p></div>';

// ===== FINANCIAMENTO E TROCA =====
const abas = [['tabFin', 'formFinanciamento'], ['tabTroca', 'formVenda']];
function mostrarAba(tabId) {
  abas.forEach(([t, f]) => {
    document.getElementById(t).setAttribute('aria-selected', String(t === tabId));
    document.getElementById(f).hidden = t !== tabId;
  });
}
abas.forEach(([tabId]) => { document.getElementById(tabId).onclick = () => mostrarAba(tabId); });
// "Troca" e "Financiamento" no menu (inclusive vindo da página de estoque) abrem o formulário certo
const abaDoEndereco = () => {
  if (location.hash === '#venda') mostrarAba('tabTroca');
  if (location.hash === '#financiamento') mostrarAba('tabFin');
};
window.addEventListener('hashchange', abaDoEndereco);
abaDoEndereco();

// Chegando de outra página com #secao: os scripts carregam depois do HTML,
// então o navegador não acerta a posição sozinho
function irParaSecao(hash, suave) {
  let alvo = null;
  try { alvo = hash.length > 1 && document.querySelector(hash); } catch (e) { return; }
  if (!alvo) return;
  const top = alvo.getBoundingClientRect().top + window.pageYOffset - header.offsetHeight;
  window.scrollTo({ top, behavior: suave ? 'smooth' : 'instant' });
}
if (location.hash) {
  // Espera o carregamento terminar: o navegador ainda reposiciona a página até lá
  const irAoCarregar = () => setTimeout(() => irParaSecao(location.hash, false), 0);
  if (document.readyState === 'complete') irAoCarregar(); else window.addEventListener('load', irAoCarregar);
}
document.querySelectorAll('a[href="#venda"]').forEach(a => a.addEventListener('click', () => mostrarAba('tabTroca')));
document.querySelectorAll('a[href="#financiamento"]').forEach(a => a.addEventListener('click', () => mostrarAba('tabFin')));

const val = id => document.getElementById(id).value.trim();
function enviarForm(form, msg) {
  window.open(wpp(msg), '_blank');
  form.classList.add('submitted');
  setTimeout(() => { form.classList.remove('submitted'); form.reset(); }, 2500);
}
document.getElementById('formFinanciamento').onsubmit = e => {
  e.preventDefault();
  enviarForm(e.target, `Olá! Quero simular um financiamento.\n\nNome: ${val('fNome')}\nWhatsApp: ${val('fFone')}\nCarro de interesse: ${val('fCarro') || '-'}\nEntrada aproximada: ${val('fEntrada') || '-'}`);
};
document.getElementById('formVenda').onsubmit = e => {
  e.preventDefault();
  enviarForm(e.target, `Olá! Quero avaliar meu carro na troca.\n\nNome: ${val('tNome')}\nWhatsApp: ${val('tFone')}\nCarro: ${val('tCarro')}\nQuilometragem: ${val('tKm') || '-'}`);
};

// ===== ROLAGEM ATÉ AS SEÇÕES (desconta o cabeçalho fixo) =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href === '#' || !document.querySelector(href)) return;
    e.preventDefault();
    history.replaceState(null, '', href);
    irParaSecao(href, true);
  });
});

// ===== MENU, PARALLAX E REVELAÇÃO =====
const calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Fundo desliza mais devagar que a página dentro da própria moldura
const parallax = [['heroBg', .18], ['lojaFoto', .07], ['fechoBg', .07]]
  .map(([id, k]) => [document.getElementById(id), k]).filter(([el]) => el);

function aoRolar() {
  header.classList.toggle('rol', window.scrollY > 40);
  if (calmo) return;
  const vh = window.innerHeight;
  parallax.forEach(([el, k]) => {
    const r = el.parentElement.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    const centro = r.top + r.height / 2 - vh / 2;
    // Nunca desloca mais que a sobra da foto (inset negativo no CSS), senão aparece borda vazia
    const sobra = Math.max(0, (el.offsetHeight - el.parentElement.offsetHeight) / 2);
    const d = Math.max(-sobra, Math.min(sobra, -centro * k));
    el.style.translate = `0 ${d.toFixed(1)}px`;
  });
}
window.addEventListener('scroll', aoRolar, { passive: true });
aoRolar();

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));
} else {
  document.querySelectorAll('.rv').forEach(el => el.classList.add('in'));
}
