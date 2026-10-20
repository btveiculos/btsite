// ===== PAINEL DA LOJA =====
// Fala só com o servidor da BT (Cloudflare). Senha e token do GitHub ficam lá,
// nunca neste arquivo.

const $ = id => document.getElementById(id);
const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const API = ((local && new URLSearchParams(location.search).get('api')) || window.BT_API || '').replace(/\/$/, '');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Number(n || 0).toLocaleString('pt-BR');
const reais = n => 'R$ ' + num(n);
const soDigitos = s => Number(String(s ?? '').replace(/\D/g, '')) || 0;
const clone = o => JSON.parse(JSON.stringify(o));
const hojeSP = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const dataBR = d => d.slice(8, 10) + '/' + d.slice(5, 7);

let avisoTimer;
function aviso(texto, erro) {
  const el = $('aviso');
  el.textContent = texto;
  el.className = 'aviso on' + (erro ? ' erro' : '');
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => el.classList.remove('on'), erro ? 6000 : 3500);
}

// ---------------------------------------------------------------- sessão

let token = null;
try { token = localStorage.getItem('bt_painel'); } catch (e) {}

async function api(caminho, opcoes = {}) {
  const res = await fetch(API + caminho, {
    ...opcoes,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
  });
  const dados = await res.json().catch(() => ({}));
  if (res.status === 401 && caminho !== '/admin/login') { sair('Sua sessão expirou. Entre de novo.'); throw new Error('sessão'); }
  if (!res.ok) { const e = new Error(dados.erro || 'Erro ' + res.status); e.status = res.status; throw e; }
  return dados;
}

function mostrarLogin(msg) {
  $('telaPainel').hidden = true;
  $('telaLogin').hidden = false;
  $('loginErro').textContent = msg || (API ? '' : 'O servidor do painel ainda não foi configurado.');
  $('senha').value = '';
  $('senha').focus();
}

function sair(msg) {
  token = null;
  try { localStorage.removeItem('bt_painel'); } catch (e) {}
  mostrarLogin(msg);
}

$('formLogin').onsubmit = async e => {
  e.preventDefault();
  const btn = $('btnEntrar');
  btn.disabled = true;
  btn.textContent = 'Entrando…';
  $('loginErro').textContent = '';
  try {
    const r = await api('/admin/login', { method: 'POST', body: JSON.stringify({ senha: $('senha').value }) });
    token = r.token;
    try { localStorage.setItem('bt_painel', token); } catch (e) {}
    abrirPainel();
  } catch (err) {
    $('loginErro').textContent = err.message === 'Failed to fetch' ? 'Sem conexão com o servidor do painel.' : err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
};

$('btnSair').onclick = () => {
  if (alteracoes().total && !confirm('Há alterações no estoque que não foram publicadas. Sair mesmo assim?')) return;
  sair();
};

function abrirPainel() {
  $('telaLogin').hidden = true;
  $('telaPainel').hidden = false;
  carregarNumeros();
  carregarEstoque();
}

// ---------------------------------------------------------------- abas

function irPara(tela) {
  document.querySelectorAll('.aba').forEach(a => a.setAttribute('aria-selected', String(a.dataset.tela === tela)));
  $('telaVisao').hidden = tela !== 'visao';
  $('telaVeiculos').hidden = tela !== 'veiculos';
  $('telaEstoque').hidden = tela !== 'estoque';
  atualizarBarra();
  window.scrollTo(0, 0);
  if (tela === 'visao' && ultimoNumeros) desenharGrafico(ultimoNumeros);
}
document.querySelectorAll('.aba').forEach(aba => { aba.onclick = () => irPara(aba.dataset.tela); });
document.querySelectorAll('[data-ir]').forEach(b => { b.onclick = () => irPara(b.dataset.ir); });

// ---------------------------------------------------------------- números

const NOMES_BOTOES = {
  'detalhes-veiculo': 'Botão nos detalhes do veículo',
  'topo-do-site': 'Botão grande do início do site',
  'menu-topo': 'Botão do menu (computador)',
  'menu-celular': 'Botão do menu (celular)',
  'botao-flutuante': 'Botão verde flutuante (celular)',
  'como-chegar': 'Seção "Como chegar"',
  'form-financiamento': 'Formulário de financiamento',
  'form-troca': 'Formulário de troca',
};
const NOMES_ORIGENS = {
  direto: 'Direto', google: 'Google', instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp',
  bing: 'Bing', youtube: 'YouTube', tiktok: 'TikTok', olx: 'OLX', webmotors: 'Webmotors', icarros: 'iCarros', mercadolivre: 'Mercado Livre',
};
const DICA_ORIGENS = { direto: 'digitou o endereço, favorito ou QR code', whatsapp: 'link enviado por alguém', google: 'pesquisa no Google' };

let dias = 30;
let ultimoNumeros = null;
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

document.querySelectorAll('.periodos button').forEach(b => {
  b.onclick = () => {
    dias = Number(b.dataset.dias);
    document.querySelectorAll('.periodos button').forEach(x => x.classList.toggle('on', Number(x.dataset.dias) === dias));
    carregarNumeros();
  };
});

async function carregarNumeros(silencioso) {
  const telas = document.querySelectorAll('.tela-numeros');
  if (!silencioso) telas.forEach(t => t.classList.add('carregando'));
  try {
    const d = await api('/admin/stats?dias=' + dias);
    ultimoNumeros = d;
    desenharNumeros(d);
  } catch (err) {
    if (err.message !== 'sessão' && !silencioso) aviso('Não consegui carregar os números: ' + err.message, true);
  } finally {
    telas.forEach(t => t.classList.remove('carregando'));
  }
}

// Atualiza sozinho enquanto uma aba de números está aberta
setInterval(() => {
  if (token && !document.hidden && $('telaEstoque').hidden && !$('telaPainel').hidden) carregarNumeros(true);
}, 60000);

function variacao(atual, antes) {
  const quando = dias === 1 ? 'ontem' : `os ${dias} dias anteriores`;
  if (!antes && !atual) return '';
  if (!antes) return `<span class="var var-sobe" title="Comparado com ${quando}">novo</span>`;
  const v = Math.round((atual - antes) / antes * 100);
  if (v === 0) return `<span class="var" title="Comparado com ${quando}">= igual</span>`;
  return `<span class="var ${v > 0 ? 'var-sobe' : 'var-desce'}" title="Comparado com ${quando}">${v > 0 ? '▲' : '▼'} ${Math.abs(v)}%</span>`;
}

function desenharNumeros(d) {
  const r = d.resumo, a = d.anterior;
  const texto = dias === 1 ? 'Hoje · setas comparam com ontem' : `Últimos ${dias} dias (${dataBR(d.desde)} a ${dataBR(hojeSP())}) · setas comparam com os ${dias} dias anteriores`;
  const curto = dias === 1 ? 'Hoje' : `Últimos ${dias} dias (${dataBR(d.desde)} a ${dataBR(hojeSP())})`;
  document.querySelectorAll('.periodo-texto').forEach(el => { el.textContent = el.closest('#telaVisao') ? texto : curto; });
  $('aoVivo').hidden = !d.agora;
  $('aoVivo').textContent = `${d.agora} ${d.agora === 1 ? 'pessoa' : 'pessoas'} no site agora`;

  $('kpis').innerHTML = `
    <div class="kpi kpi-destaque"><small>Pessoas que entraram</small><strong>${num(r.visitantes)}</strong><p>visitantes únicos ${variacao(r.visitantes, a.visitantes)}</p></div>
    <div class="kpi"><small>Visitas</small><strong>${num(r.visitas)}</strong><p><b>${num(r.paginas)}</b> páginas vistas ${variacao(r.visitas, a.visitas)}</p></div>
    <div class="kpi"><small>Cliques em veículos</small><strong>${num(r.cliquesCarros)}</strong><p><b>${num(r.pessoasCarros)}</b> pessoas ${variacao(r.cliquesCarros, a.cliquesCarros)}</p></div>
    <div class="kpi"><small>Cliques no WhatsApp</small><strong>${num(r.cliquesWhats)}</strong><p><b>${num(r.pessoasWhats)}</b> pessoas ${variacao(r.cliquesWhats, a.cliquesWhats)}</p></div>`;

  // Funil: de quem entrou, quantos abriram um carro e quantos chamaram
  const etapas = [
    ['Entraram no site', r.visitantes, 'pessoas diferentes'],
    ['Abriram um veículo', r.pessoasCarros, `${pct(r.pessoasCarros, r.visitantes)}% de quem entrou`],
    ['Chamaram no WhatsApp', r.pessoasWhats, `${pct(r.pessoasWhats, r.visitantes)}% de quem entrou`],
  ];
  $('funil').innerHTML = etapas.map(([nome, v, sub], i) => `
    <div class="etapa">
      <div class="etapa-num">${num(v)}</div>
      <div class="etapa-nome">${nome}</div>
      <div class="barra"><i style="width:${Math.max(pct(v, r.visitantes), v ? 2 : 0)}%"></i></div>
      <div class="etapa-sub">${sub}</div>
    </div>${i < 2 ? '<div class="etapa-seta" aria-hidden="true">›</div>' : ''}`).join('');

  // Origens
  const totalOrig = d.origens.reduce((s, o) => s + o.visitas, 0);
  $('origens').innerHTML = d.origens.length ? `<ul class="barras">${d.origens.slice(0, 7).map(o => `
    <li><div class="barras-topo"><span>${esc(NOMES_ORIGENS[o.origem] || o.origem)}${DICA_ORIGENS[o.origem] ? ` <span class="dica">· ${DICA_ORIGENS[o.origem]}</span>` : ''}</span><b>${pct(o.visitas, totalOrig)}%</b></div>
    <div class="barra"><i style="width:${pct(o.visitas, d.origens[0].visitas)}%"></i></div>
    <div class="barras-sub">${num(o.visitas)} ${o.visitas === 1 ? 'visita' : 'visitas'} · ${num(o.pessoas)} ${o.pessoas === 1 ? 'pessoa' : 'pessoas'}</div></li>`).join('')}</ul>`
    : '<p class="vazio">Sem visitas neste período.</p>';

  // Aparelhos (rosca)
  const totalAp = d.aparelhos.reduce((s, x) => s + x.pessoas, 0);
  const cores = { celular: 'var(--red)', computador: '#fff', tablet: '#8a8f98', desconhecido: '#44484f' };
  const C = 2 * Math.PI * 42;
  let acum = 0;
  $('aparelhos').innerHTML = totalAp ? `<div class="rosca">
      <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="12"/>${d.aparelhos.map(x => {
        const parte = x.pessoas / totalAp * C;
        const arco = `<circle cx="50" cy="50" r="42" fill="none" stroke="${cores[x.aparelho] || '#666'}" stroke-width="12" stroke-dasharray="${parte} ${C - parte}" stroke-dashoffset="${-acum}" transform="rotate(-90 50 50)"/>`;
        acum += parte;
        return arco;
      }).join('')}</svg>
      <div class="rosca-centro"><strong>${pct((d.aparelhos.find(x => x.aparelho === 'celular') || {}).pessoas || 0, totalAp)}%</strong><span>no celular</span></div>
    </div>
    <ul class="rosca-leg">${d.aparelhos.map(x => `<li><i style="background:${cores[x.aparelho] || '#666'}"></i>${esc(x.aparelho.charAt(0).toUpperCase() + x.aparelho.slice(1))}<b>${pct(x.pessoas, totalAp)}%</b></li>`).join('')}</ul>`
    : '<p class="vazio">Sem visitas neste período.</p>';

  // Horários
  const porHora = Array.from({ length: 24 }, (_, h) => (d.horas.find(x => x.hora === h) || {}).visitas || 0);
  const maxH = Math.max(...porHora);
  const pico = porHora.indexOf(maxH);
  $('horas').innerHTML = maxH ? `<p class="horas-pico">Mais movimento por volta das <b>${pico}h</b></p>
    <div class="horas">${porHora.map((v, h) => `<div class="hora ${h === pico ? 'pico' : ''}" title="${h}h: ${v} ${v === 1 ? 'visita' : 'visitas'}"><i style="height:${Math.max(v / maxH * 100, v ? 4 : 1)}%"></i></div>`).join('')}</div>
    <div class="horas-eixo"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span></div>`
    : '<p class="vazio">Sem visitas neste período.</p>';

  // Top veículos e botões
  const linhas = linhasVeiculos(d).filter(l => l.vistos).sort((x, y) => y.vistos - x.vistos);
  const maxV = Math.max(...linhas.map(l => l.vistos), 1);
  $('topCarros').innerHTML = linhas.length ? `<ul class="top">${linhas.slice(0, 5).map((l, i) => `
    <li><span class="top-pos">${i + 1}</span>${miniFoto(l)}<div class="top-info"><span class="nome">${esc(l.nome)}</span>
      <span class="barra"><i style="width:${pct(l.vistos, maxV)}%"></i></span>
      <span class="top-sub">${num(l.vistos)} ${l.vistos === 1 ? 'clique' : 'cliques'} · ${num(l.whats)} no WhatsApp</span></div></li>`).join('')}</ul>`
    : '<p class="vazio">Ninguém abriu os detalhes de um veículo neste período.</p>';
  tabela('tabBotoes', d.botoes.map(b => ({ nome: NOMES_BOTOES[b.botao] || b.botao, total: b.total, unicos: b.unicos })), 'Nenhum clique no WhatsApp neste período.');

  desenharRanking();
  if (!$('telaVisao').hidden) desenharGrafico(d);
}

// Junta cliques e WhatsApp de cada carro, incluindo os do estoque que ninguém viu
function linhasVeiculos(d) {
  const mapa = new Map();
  (estoque.vehicles || []).forEach(v => mapa.set(String(v.id), {
    id: String(v.id), nome: `${v.marca} ${v.modelo} ${v.ano}`, versao: v.versao, preco: v.preco,
    foto: v.img || (v.fotos || [])[0], noEstoque: !removidos.has(v.id), vistos: 0, pessoas: 0, whats: 0, pessoasWhats: 0,
  }));
  const pegar = (id, nome) => {
    let l = (id != null && mapa.get(String(id))) || (nome && [...mapa.values()].find(x => x.nome === nome));
    if (!l) {
      l = { id: String(id ?? nome), nome: nome || 'Veículo ' + id, vistos: 0, pessoas: 0, whats: 0, pessoasWhats: 0, noEstoque: false };
      mapa.set(l.id, l);
    }
    return l;
  };
  d.carros.forEach(c => { const l = pegar(c.id, c.nome); l.vistos += c.total; l.pessoas += c.unicos; });
  d.whatsPorCarro.forEach(c => { const l = pegar(c.id, c.nome); l.whats += c.total; l.pessoasWhats += c.unicos; });
  return [...mapa.values()];
}

const miniFoto = l => `<span class="mini-foto">${l.foto ? `<img src="${esc(srcFoto(l.foto))}" alt="" loading="lazy">` : ''}</span>`;

$('buscaDesempenho').oninput = () => desenharRanking();
$('ordemDesempenho').onchange = () => desenharRanking();

function desenharRanking() {
  if (!ultimoNumeros) return;
  const termo = $('buscaDesempenho').value.trim().toLowerCase();
  const todas = linhasVeiculos(ultimoNumeros);
  const taxa = l => l.pessoas ? l.pessoasWhats / l.pessoas : 0;
  const ord = {
    vistos: (a, b) => b.vistos - a.vistos || b.whats - a.whats,
    whats: (a, b) => b.whats - a.whats || b.vistos - a.vistos,
    conversao: (a, b) => taxa(b) - taxa(a) || b.pessoas - a.pessoas,
    menos: (a, b) => a.vistos - b.vistos,
  }[$('ordemDesempenho').value];
  const lista = todas.filter(l => (l.noEstoque || l.vistos || l.whats) && (!termo || `${l.nome} ${l.versao || ''}`.toLowerCase().includes(termo))).sort(ord);
  const semVisita = todas.filter(l => l.noEstoque && !l.vistos).length;
  $('resumoVeiculos').innerHTML = semVisita
    ? `<b>${semVisita}</b> ${semVisita === 1 ? 'veículo do estoque ainda não foi aberto' : 'veículos do estoque ainda não foram abertos'} por ninguém neste período.`
    : 'Todos os veículos do estoque foram abertos neste período.';
  const maxV = Math.max(...lista.map(l => l.vistos), 1);
  $('ranking').innerHTML = lista.length ? lista.map((l, i) => `
    <div class="rk ${l.vistos ? '' : 'rk-zero'}">
      <span class="top-pos">${i + 1}</span>${miniFoto(l)}
      <div class="rk-nome"><span class="nome">${esc(l.nome)}${l.noEstoque ? '' : ' <span class="etq etq-rem">fora do estoque</span>'}</span>
        <span class="rk-versao">${esc(l.versao || '')}${l.preco ? ` · ${reais(l.preco)}` : ''}</span>
        <span class="barra"><i style="width:${pct(l.vistos, maxV)}%"></i></span></div>
      <div class="rk-num"><b>${num(l.vistos)}</b><span>cliques</span><small>${num(l.pessoas)} ${l.pessoas === 1 ? 'pessoa' : 'pessoas'}</small></div>
      <div class="rk-num rk-whats"><b>${num(l.whats)}</b><span>WhatsApp</span><small>${num(l.pessoasWhats)} ${l.pessoasWhats === 1 ? 'pessoa' : 'pessoas'}</small></div>
      <div class="rk-num"><b>${l.pessoas ? pct(l.pessoasWhats, l.pessoas) + '%' : '—'}</b><span>chamaram</span><small>de quem abriu</small></div>
    </div>`).join('') : '<p class="vazio">Nenhum veículo encontrado.</p>';
}

function tabela(id, linhas, vazio) {
  const el = $(id);
  if (!linhas.length) { el.innerHTML = `<p class="vazio">${vazio}</p>`; return; }
  const max = Math.max(...linhas.map(l => l.total), 1);
  const montar = lista => `<table class="tabela"><thead><tr><th>Nome</th><th>Total</th><th>Pessoas</th></tr></thead><tbody>${lista.map(l => `
    <tr><td><span class="nome">${esc(l.nome)}${l.extra ? ` <span class="dica">· ${esc(l.extra)}</span>` : ''}</span><span class="barra"><i style="width:${(l.total / max * 100).toFixed(1)}%"></i></span></td>
    <td class="total">${num(l.total)}</td><td class="unicos">${num(l.unicos)}</td></tr>`).join('')}</tbody></table>`;
  el.innerHTML = montar(linhas.slice(0, 8));
  if (linhas.length > 8) {
    const b = document.createElement('button');
    b.className = 'mais';
    b.textContent = `Ver todos (${linhas.length})`;
    b.onclick = () => { el.innerHTML = montar(linhas); };
    el.appendChild(b);
  }
}

function desenharGrafico(d) {
  const el = $('grafico');
  if (!el.offsetWidth) return;
  // Preenche os dias sem movimento com zero
  const mapa = Object.fromEntries(d.porDia.map(x => [x.dia, x]));
  const serie = [];
  for (let t = Date.parse(d.desde + 'T12:00:00Z'); ; t += 86400e3) {
    const dia = new Date(t).toISOString().slice(0, 10);
    serie.push(mapa[dia] || { dia, visitantes: 0, visitas: 0 });
    if (dia >= hojeSP() || serie.length > 400) break;
  }
  if (!serie.some(s => s.visitas || s.visitantes)) { el.innerHTML = '<p class="vazio">Ainda não há visitas registradas neste período.</p>'; return; }

  const W = el.offsetWidth, H = el.offsetHeight, esq = 34, base = 22;
  const topo = Math.max(...serie.map(s => Math.max(s.visitas, s.visitantes)));
  const passo = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000].find(p => topo / p <= 4) || Math.ceil(topo / 4);
  const maxY = Math.max(passo * Math.ceil(topo / passo), passo);
  const y = v => (H - base) - v / maxY * (H - base - 8);
  const larg = (W - esq) / serie.length;
  const barra = Math.max(Math.min(larg * .7, 28), 1);

  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Visitas por dia">`;
  for (let v = 0; v <= maxY; v += passo) svg += `<line class="guia" x1="${esq}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text class="eixo" x="${esq - 8}" y="${y(v) + 4}" text-anchor="end">${num(v)}</text>`;
  const cadaRotulo = Math.ceil(serie.length / Math.max(Math.floor((W - esq) / 64), 1));
  serie.forEach((s, i) => {
    const x = esq + i * larg + (larg - barra) / 2;
    svg += `<g class="col" data-i="${i}"><rect x="${esq + i * larg}" y="0" width="${larg}" height="${H - base}" fill="transparent"/>
      <rect class="b-total" x="${x}" y="${y(s.visitas)}" width="${barra}" height="${(H - base) - y(s.visitas)}" rx="${Math.min(3, barra / 2)}"/>
      <rect class="b-unico" x="${x + barra * .2}" y="${y(s.visitantes)}" width="${barra * .6}" height="${(H - base) - y(s.visitantes)}" rx="${Math.min(2, barra / 4)}"/></g>`;
    if (i % cadaRotulo === 0 || serie.length === 1) svg += `<text class="eixo" x="${esq + i * larg + larg / 2}" y="${H - 4}" text-anchor="middle">${dataBR(s.dia)}</text>`;
  });
  el.innerHTML = svg + '</svg><div class="dica-graf" hidden></div>';

  const dica = el.querySelector('.dica-graf');
  const mostrar = alvo => {
    const g = alvo.closest && alvo.closest('.col');
    if (!g) { dica.hidden = true; return; }
    const s = serie[g.dataset.i];
    dica.innerHTML = `<b>${dataBR(s.dia)}</b><br>${num(s.visitas)} ${s.visitas === 1 ? 'visita' : 'visitas'} · ${num(s.visitantes)} ${s.visitantes === 1 ? 'pessoa' : 'pessoas'}`;
    dica.hidden = false;
    const cx = esq + Number(g.dataset.i) * larg + larg / 2;
    dica.style.left = Math.min(Math.max(cx, 70), W - 70) + 'px';
    dica.style.top = (y(Math.max(s.visitas, s.visitantes)) - 8) + 'px';
  };
  el.onmousemove = e => mostrar(e.target);
  el.onmouseleave = () => { dica.hidden = true; };
  el.ontouchstart = e => mostrar(document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY));
}

let redim;
window.addEventListener('resize', () => { clearTimeout(redim); redim = setTimeout(() => ultimoNumeros && desenharGrafico(ultimoNumeros), 150); });

// ---------------------------------------------------------------- estoque

let estoque = { sha: null, original: [], vehicles: [] };
let removidos = new Set();
let fotosNovas = {}; // 'carros/arquivo.jpg' -> dataURL ainda não publicada

const srcFoto = p => (p && fotosNovas[p.replace(/^\//, '')]) || p;

async function carregarEstoque() {
  $('estoqueTexto').textContent = 'Carregando…';
  try {
    const d = await api('/admin/stock');
    estoque = { sha: d.sha, original: d.vehicles, vehicles: clone(d.vehicles) };
    removidos = new Set();
    fotosNovas = {};
    $('listaMarcas').innerHTML = [...new Set(d.vehicles.map(v => v.marca))].sort().map(m => `<option value="${esc(m)}">`).join('');
    desenharLista();
    if (ultimoNumeros) desenharNumeros(ultimoNumeros);
  } catch (err) {
    if (err.message !== 'sessão') $('estoqueTexto').textContent = 'Não consegui carregar o estoque: ' + err.message;
  }
}

function situacao(v) {
  if (removidos.has(v.id)) return 'removido';
  const o = estoque.original.find(x => x.id === v.id);
  if (!o) return 'novo';
  return JSON.stringify(o) === JSON.stringify(v) ? '' : 'mudou';
}

function alteracoes() {
  const c = { novo: 0, mudou: 0, removido: 0 };
  estoque.vehicles.forEach(v => { const s = situacao(v); if (s) c[s]++; });
  const ordem = estoque.vehicles.filter(v => !removidos.has(v.id) && situacao(v) !== 'novo').map(v => v.id).join() !==
    estoque.original.filter(o => estoque.vehicles.some(v => v.id === o.id && !removidos.has(v.id))).map(o => o.id).join();
  c.total = c.novo + c.mudou + c.removido + (ordem ? 1 : 0);
  return c;
}

const ICONES = {
  estrela: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  editar: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>',
  lixo: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  voltar: '<svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/></svg>',
};

function desenharLista() {
  const termo = $('busca').value.trim().toLowerCase();
  const ativos = estoque.vehicles.filter(v => !removidos.has(v.id));
  $('estoqueTexto').textContent = `${ativos.length} ${ativos.length === 1 ? 'veículo' : 'veículos'} no site · ${ativos.filter(v => v.destaque).length} em destaque`;

  const lista = estoque.vehicles.filter(v => !termo || `${v.marca} ${v.modelo} ${v.versao} ${v.ano}`.toLowerCase().includes(termo));
  $('lista').innerHTML = lista.length ? lista.map(v => {
    const s = situacao(v);
    const etq = { novo: '<span class="etq etq-novo">Novo</span>', mudou: '<span class="etq etq-mudou">Alterado</span>', removido: '<span class="etq etq-rem">Será removido</span>' }[s] || '';
    const foto = srcFoto(v.img || (v.fotos || [])[0]);
    return `<div class="item ${s}" data-id="${v.id}">
      <div class="item-foto">${foto ? `<img src="${esc(foto)}" alt="" loading="lazy">` : ''}</div>
      <div><div class="item-nome">${esc(v.marca)} ${esc(v.modelo)} ${v.destaque && !s ? '<span class="etq etq-dest">Destaque</span>' : ''}${etq}</div>
        <div class="item-info">${esc(v.versao || '')} · ${v.ano}/${v.anoModelo || v.ano} · ${num(v.km)} km · ${(v.fotos || []).length} fotos</div></div>
      <div class="item-preco">${reais(v.preco)}</div>
      <div class="item-acoes">${s === 'removido'
        ? `<button class="icone" data-acao="desfazer" title="Desfazer remoção" aria-label="Desfazer remoção">${ICONES.voltar}</button>`
        : `<button class="icone ${v.destaque ? 'on' : ''}" data-acao="destaque" title="${v.destaque ? 'Tirar dos destaques' : 'Colocar nos destaques'}" aria-label="Destaque" aria-pressed="${!!v.destaque}">${ICONES.estrela}</button>
           <button class="icone" data-acao="editar" title="Editar" aria-label="Editar">${ICONES.editar}</button>
           <button class="icone" data-acao="remover" title="Remover do site" aria-label="Remover">${ICONES.lixo}</button>`}</div>
    </div>`;
  }).join('') : `<p class="vazio">${termo ? 'Nenhum veículo encontrado.' : 'Nenhum veículo no estoque.'}</p>`;
  atualizarBarra();
}

$('busca').oninput = desenharLista;

$('lista').onclick = e => {
  const btn = e.target.closest('[data-acao]');
  if (!btn) return;
  const id = Number(btn.closest('.item').dataset.id);
  const v = estoque.vehicles.find(x => x.id === id);
  const acao = btn.dataset.acao;
  if (acao === 'destaque') v.destaque = !v.destaque;
  if (acao === 'editar') return abrirEditor(v);
  if (acao === 'remover') {
    if (situacao(v) === 'novo') estoque.vehicles = estoque.vehicles.filter(x => x !== v);
    else removidos.add(id);
  }
  if (acao === 'desfazer') removidos.delete(id);
  desenharLista();
};

function atualizarBarra() {
  const c = alteracoes();
  $('contPendente').hidden = !c.total;
  $('contPendente').textContent = c.total;
  $('barraPublicar').hidden = !c.total || $('telaEstoque').hidden;
  const partes = [];
  if (c.novo) partes.push(`${c.novo} ${c.novo === 1 ? 'novo' : 'novos'}`);
  if (c.mudou) partes.push(`${c.mudou} ${c.mudou === 1 ? 'alterado' : 'alterados'}`);
  if (c.removido) partes.push(`${c.removido} para remover`);
  $('publicarTexto').textContent = 'Alterações ainda não publicadas' + (partes.length ? ': ' + partes.join(', ') : '');
}

window.addEventListener('beforeunload', e => { if (alteracoes().total) { e.preventDefault(); e.returnValue = ''; } });

$('btnDescartar').onclick = () => {
  if (!confirm('Descartar todas as alterações que ainda não foram publicadas?')) return;
  estoque.vehicles = clone(estoque.original);
  removidos = new Set();
  fotosNovas = {};
  desenharLista();
};

$('btnPublicar').onclick = async () => {
  const btn = $('btnPublicar');
  const c = alteracoes();
  btn.disabled = true;
  btn.textContent = 'Publicando…';
  try {
    const vehicles = estoque.vehicles.filter(v => !removidos.has(v.id));
    const usadas = new Set(vehicles.flatMap(v => [v.img, ...(v.fotos || [])]).filter(Boolean).map(p => p.replace(/^\//, '')));
    const photos = Object.entries(fotosNovas).filter(([p]) => usadas.has(p)).map(([path, url]) => ({ path, data: url.split(',')[1] }));
    const partes = [];
    if (c.novo) partes.push(`${c.novo} novo(s)`);
    if (c.mudou) partes.push(`${c.mudou} alterado(s)`);
    if (c.removido) partes.push(`${c.removido} removido(s)`);
    const r = await api('/admin/publish', {
      method: 'POST',
      body: JSON.stringify({ baseSha: estoque.sha, vehicles, photos, message: 'Estoque pelo painel: ' + (partes.join(', ') || 'nova ordem') }),
    });
    if (r.simulacao) { aviso(`Simulação ok: ${r.veiculos} veículos e ${r.fotos.length} fotos seriam publicados.`); return; }
    estoque = { sha: r.sha, original: clone(vehicles), vehicles: clone(vehicles) };
    removidos = new Set();
    // As fotos novas continuam em memória até o site terminar de atualizar
    desenharLista();
    aviso('Publicado! O site mostra as mudanças em cerca de 1 minuto.');
  } catch (err) {
    if (err.message !== 'sessão') aviso(err.status === 409 ? err.message : 'Não foi possível publicar: ' + err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Publicar no site';
  }
};

// ---------------------------------------------------------------- editor

const form = $('formVeiculo');
let editando = null; // veículo em edição (null = novo)
let fotosEditor = [];

$('btnNovo').onclick = () => abrirEditor(null);
$('btnFecharEditor').onclick = $('btnCancelar').onclick = fecharEditor;
$('editor').onclick = e => { if (e.target === $('editor')) fecharEditor(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('editor').hidden) fecharEditor(); });

function abrirEditor(v) {
  editando = v;
  form.reset();
  $('editorErro').textContent = '';
  form.querySelectorAll('.invalido').forEach(el => el.classList.remove('invalido'));
  $('editorTitulo').textContent = v ? `${v.marca} ${v.modelo}` : 'Novo veículo';
  const d = v || { cambio: 'manual', combustivel: 'Flex', uso: 'seminovo' };
  for (const el of form.elements) {
    if (!el.name) continue;
    const val = d[el.name];
    if (el.type === 'checkbox') el.checked = !!val;
    else if (el.name === 'opcionais') el.value = (val || []).join(', ');
    else if (el.name === 'preco' || el.name === 'km') el.value = val ? num(val) : '';
    else if (val !== undefined) el.value = val;
  }
  fotosEditor = v ? [...(v.fotos && v.fotos.length ? v.fotos : [v.img].filter(Boolean))] : [];
  desenharFotos();
  $('editor').hidden = false;
  document.body.style.overflow = 'hidden';
  $('editor').querySelector('.editor-corpo').scrollTop = 0;
}

function fecharEditor() {
  $('editor').hidden = true;
  document.body.style.overflow = '';
}

// Formata preço e km enquanto digita
['preco', 'km'].forEach(n => {
  form.elements[n].addEventListener('input', e => {
    const d = soDigitos(e.target.value);
    e.target.value = d ? num(d) : '';
  });
});

form.onsubmit = e => {
  e.preventDefault();
  const f = form.elements;
  const faltando = ['marca', 'modelo', 'ano', 'preco'].filter(n => !String(f[n].value).trim() || (n === 'preco' && !soDigitos(f[n].value)));
  form.querySelectorAll('.invalido').forEach(el => el.classList.remove('invalido'));
  faltando.forEach(n => f[n].classList.add('invalido'));
  if (faltando.length) { $('editorErro').textContent = 'Preencha marca, modelo, ano e preço.'; return; }
  if (!fotosEditor.length && !confirm('Este veículo está sem fotos. Salvar mesmo assim?')) return;

  const ano = Number(f.ano.value);
  const dados = {
    destaque: f.destaque.checked,
    marca: f.marca.value.trim(),
    modelo: f.modelo.value.trim(),
    versao: f.versao.value.trim(),
    ano,
    anoModelo: Number(f.anoModelo.value) || ano,
    km: soDigitos(f.km.value),
    uso: f.uso.value,
    cambio: f.cambio.value,
    combustivel: f.combustivel.value,
    cor: f.cor.value.trim(),
    preco: soDigitos(f.preco.value),
    img: fotosEditor[0] || '',
    opcionais: f.opcionais.value.split(',').map(s => s.trim()).filter(Boolean),
    desc: f.desc.value.trim(),
    fotos: [...fotosEditor],
  };
  if (editando) {
    // Mantém a ordem original das chaves para não marcar "alterado" à toa
    Object.assign(editando, dados);
  } else {
    const id = Math.max(0, ...estoque.vehicles.map(v => Number(v.id) || 0)) + 1;
    estoque.vehicles.unshift({ id, ...dados, heroImg: '' });
  }
  fecharEditor();
  desenharLista();
  aviso(editando ? 'Alterações salvas. Clique em "Publicar no site" quando terminar.' : 'Veículo adicionado. Clique em "Publicar no site" quando terminar.');
};

// ---------------------------------------------------------------- fotos

function desenharFotos() {
  $('fotos').innerHTML = fotosEditor.map((p, i) => `
    <div class="foto" draggable="true" data-i="${i}">
      <img src="${esc(srcFoto(p))}" alt="Foto ${i + 1}">
      <div class="foto-acoes">
        ${i ? `<button type="button" class="mover" data-mover="${i}" title="Mover para a esquerda" aria-label="Mover para a esquerda">‹</button>` : ''}
        <button type="button" data-tirar="${i}" title="Tirar foto" aria-label="Tirar foto">×</button>
      </div>
    </div>`).join('');
}

$('fotos').onclick = e => {
  const t = e.target.closest('[data-tirar], [data-mover]');
  if (!t) return;
  if (t.dataset.tirar) fotosEditor.splice(Number(t.dataset.tirar), 1);
  if (t.dataset.mover) { const i = Number(t.dataset.mover); [fotosEditor[i - 1], fotosEditor[i]] = [fotosEditor[i], fotosEditor[i - 1]]; }
  desenharFotos();
};

let arrastada = null;
$('fotos').addEventListener('dragstart', e => {
  const f = e.target.closest('.foto');
  if (!f) return;
  arrastada = Number(f.dataset.i);
  f.classList.add('arrastando');
  e.dataTransfer.effectAllowed = 'move';
});
$('fotos').addEventListener('dragover', e => {
  if (arrastada === null) return;
  e.preventDefault();
  document.querySelectorAll('.foto.alvo').forEach(x => x.classList.remove('alvo'));
  const f = e.target.closest('.foto');
  if (f) f.classList.add('alvo');
});
$('fotos').addEventListener('drop', e => {
  e.preventDefault();
  const f = e.target.closest('.foto');
  if (f && arrastada !== null) {
    const [p] = fotosEditor.splice(arrastada, 1);
    fotosEditor.splice(Number(f.dataset.i), 0, p);
  }
  arrastada = null;
  desenharFotos();
});
$('fotos').addEventListener('dragend', () => { arrastada = null; desenharFotos(); });

const soltar = $('soltar');
['dragenter', 'dragover'].forEach(ev => soltar.addEventListener(ev, e => { if (arrastada === null) { e.preventDefault(); soltar.classList.add('sobre'); } }));
['dragleave', 'drop'].forEach(ev => soltar.addEventListener(ev, () => soltar.classList.remove('sobre')));
soltar.addEventListener('drop', e => { if (arrastada === null) { e.preventDefault(); receberFotos(e.dataTransfer.files); } });
$('arquivos').onchange = e => { receberFotos(e.target.files); e.target.value = ''; };

const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function receberFotos(arquivos) {
  const lista = [...arquivos].filter(a => a.type.startsWith('image/') || /\.(heic|heif)$/i.test(a.name));
  if (!lista.length) return;
  const f = form.elements;
  const base = slug(`${f.marca.value} ${f.modelo.value} ${f.ano.value}`) || 'veiculo';
  const marca = Date.now();
  soltar.querySelector('strong').textContent = `Preparando ${lista.length} ${lista.length === 1 ? 'foto' : 'fotos'}…`;
  let falhas = 0;
  for (let i = 0; i < lista.length; i++) {
    try {
      const url = await comprimir(lista[i]);
      const caminho = `carros/${base}-${marca}-${i + 1}.jpg`;
      fotosNovas[caminho] = url;
      fotosEditor.push('/' + caminho);
      desenharFotos();
    } catch (e) { falhas++; }
  }
  soltar.querySelector('strong').textContent = 'Escolher fotos';
  if (falhas) aviso(`${falhas} ${falhas === 1 ? 'foto não pôde' : 'fotos não puderam'} ser lida(s). Tente enviar em JPG.`, true);
}

// Reduz para no máximo 1600 px e JPG: fotos de celular chegam com 4–8 MB
async function comprimir(arquivo) {
  let fonte;
  try { fonte = await createImageBitmap(arquivo, { imageOrientation: 'from-image' }); } catch (e) {
    fonte = await new Promise((ok, erro) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = erro;
      img.src = URL.createObjectURL(arquivo);
    });
  }
  const w0 = fonte.width, h0 = fonte.height;
  const k = Math.min(1, 1600 / Math.max(w0, h0));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w0 * k);
  canvas.height = Math.round(h0 * k);
  canvas.getContext('2d').drawImage(fonte, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

// ---------------------------------------------------------------- início

if (token && API) abrirPainel(); else mostrarLogin();
