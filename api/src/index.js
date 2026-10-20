// Servidor da BT Veículos (Cloudflare Worker + banco D1).
//
// Público:  POST /e                 registra visita ou clique vindo do site
// Painel:   POST /admin/login       troca a senha por uma sessão de 12 h
//           GET  /admin/stats       números de visitas e cliques
//           GET  /admin/stock       estoque atual (lido do GitHub)
//           POST /admin/photo       envia uma foto ao GitHub e devolve o sha
//           POST /admin/publish     publica o estoque (e as fotos já enviadas) em um único commit
// Agendado: apaga eventos com mais de 400 dias (cron em wrangler.toml).
//
// Segredos (wrangler secret put): ADMIN_PASSWORD, SESSION_SECRET, GITHUB_TOKEN.

const TIPOS = new Set(['visit', 'page', 'car', 'whats']);
const APARELHOS = new Set(['celular', 'computador', 'tablet']);
const BOTOES = new Set(['detalhes-veiculo', 'topo-do-site', 'menu-topo', 'menu-celular', 'botao-flutuante', 'como-chegar', 'form-financiamento', 'form-troca']);
const ROBOS = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|python|curl|wget/i;
const HORAS_SESSAO = 12;
const DIAS_GUARDADOS = 400;
const CAMPOS_VEICULO = {
  id: 'number', destaque: 'boolean', marca: 'string', modelo: 'string', versao: 'string',
  ano: 'number', anoModelo: 'number', km: 'number', uso: 'string', cambio: 'string',
  combustivel: 'string', cor: 'string', preco: 'number', img: 'string',
  opcionais: 'array', desc: 'string', fotos: 'array',
};
const FOTO_NO_SITE = /^\/carros\/[a-z0-9._-]+\.(jpe?g|png|webp)$/i;
const FOTO_NO_REPO = /^carros\/[a-z0-9._-]+\.(jpe?g|png|webp)$/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = cabecalhosCors(request, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      if (url.pathname === '/e' && request.method === 'POST') return await registrarEvento(request, env, cors);
      if (url.pathname === '/admin/login' && request.method === 'POST') return await entrar(request, env, cors);

      if (url.pathname.startsWith('/admin/')) {
        if (!(await autorizado(request, env))) return json({ erro: 'Sessão expirada. Entre de novo.' }, 401, cors);
        if (url.pathname === '/admin/stats' && request.method === 'GET') return await numeros(url, env, cors);
        if (url.pathname === '/admin/stock' && request.method === 'GET') return await lerEstoque(env, cors);
        if (url.pathname === '/admin/photo' && request.method === 'POST') return await enviarFoto(request, env, cors);
        if (url.pathname === '/admin/publish' && request.method === 'POST') return await publicar(request, env, cors);
      }
      return json({ erro: 'Não encontrado' }, 404, cors);
    } catch (e) {
      if (e.status && e.status < 500) return json({ erro: e.message }, e.status, cors);
      console.error(e);
      // Mensagens próprias (GitHub fora do ar, configuração faltando) vão para o painel; o resto fica no log
      return json({ erro: e.status ? e.message : 'Erro interno. Tente de novo em instantes.' }, e.status || 500, cors);
    }
  },

  // Limpeza diária: o painel mostra no máximo 1 ano
  async scheduled(event, env) {
    await env.DB.prepare('DELETE FROM events WHERE ts < ?').bind(Date.now() - DIAS_GUARDADOS * 86400000).run();
  },
};

// ---------------------------------------------------------------- utilidades

function cabecalhosCors(request, env) {
  const origem = request.headers.get('Origin') || '';
  const permitidas = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
  return {
    'Access-Control-Allow-Origin': permitidas.includes(origem) ? origem : permitidas[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(dados, status = 200, headers = {}) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function erro(mensagem, status = 400) {
  const e = new Error(mensagem);
  e.status = status;
  return e;
}

async function lerJson(request, limiteBytes) {
  if (Number(request.headers.get('Content-Length') || 0) > limiteBytes) throw erro('Envio grande demais', 413);
  const texto = await request.text();
  if (texto.length > limiteBytes) throw erro('Envio grande demais', 413);
  let dados;
  try { dados = JSON.parse(texto); } catch { throw erro('JSON inválido'); }
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw erro('JSON inválido');
  return dados;
}

// Limite de pedidos por IP (bindings [[ratelimits]] em wrangler.toml). O IP não é guardado.
async function dentroDoLimite(limitador, request) {
  if (!limitador) return true;
  const { success } = await limitador.limit({ key: request.headers.get('CF-Connecting-IP') || 'local' });
  return success;
}

// Dia no fuso de São Paulo (UTC-3, sem horário de verão desde 2019)
const FUSO = 3 * 3600 * 1000;
const diaSP = ts => new Date(ts - FUSO).toISOString().slice(0, 10);
const inicioDoDiaSP = dia => Date.parse(dia + 'T00:00:00Z') + FUSO;
const corta = (v, n) => (typeof v === 'string' && v ? v.slice(0, n) : null);

const enc = new TextEncoder();
const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(segredo, texto) {
  const chave = await crypto.subtle.importKey('raw', enc.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', chave, enc.encode(texto)));
}

function iguais(a, b) {
  // Comparação em tempo constante para não vazar a senha pelo tempo de resposta
  const x = enc.encode(String(a)), y = enc.encode(String(b));
  let dif = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) dif |= (x[i] || 0) ^ (y[i] || 0);
  return dif === 0;
}

// ---------------------------------------------------------------- eventos do site

async function registrarEvento(request, env, cors) {
  const vazio = new Response(null, { status: 204, headers: cors });
  if (ROBOS.test(request.headers.get('User-Agent') || '')) return vazio;
  if (!(await dentroDoLimite(env.LIMITE_EVENTOS, request))) return vazio;

  const b = await lerJson(request, 1024);
  const tipo = b.t;
  const vid = b.v;
  if (!TIPOS.has(tipo)) throw erro('Tipo inválido');
  if (typeof vid !== 'string' || !/^[a-z0-9-]{8,40}$/i.test(vid)) throw erro('Identificador inválido');

  // Só aceita alvos conhecidos: id numérico de carro ou um dos botões de WhatsApp
  let alvo = null;
  if (tipo === 'car') {
    if (!/^\d{1,15}$/.test(String(b.g))) throw erro('Carro inválido');
    alvo = String(b.g);
  }
  if (tipo === 'whats') {
    if (!BOTOES.has(b.g)) throw erro('Botão inválido');
    alvo = b.g;
  }
  const carro = b.c != null && /^\d{1,15}$/.test(String(b.c)) ? String(b.c) : null;
  const rotulo = tipo === 'car' || carro ? corta(b.l, 80) : null;
  const pagina = typeof b.p === 'string' && /^\/[\w./-]{0,60}$/.test(b.p) ? b.p : null;
  const aparelho = APARELHOS.has(b.d) ? b.d : null;
  const origem = typeof b.r === 'string' ? b.r.toLowerCase().replace(/[^a-z0-9.-]/g, '').slice(0, 60) || null : null;

  const ts = Date.now();
  await env.DB.prepare('INSERT INTO events (ts, day, type, vid, page, target, label, dev, ref, car) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(ts, diaSP(ts), tipo, vid, pagina, alvo, rotulo, aparelho, origem, carro)
    .run();
  return vazio;
}

// ---------------------------------------------------------------- login do painel

async function entrar(request, env, cors) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) throw erro('Servidor sem senha configurada', 500);
  if (!(await dentroDoLimite(env.LIMITE_LOGIN, request))) return json({ erro: 'Muitas tentativas. Espere um minuto e tente de novo.' }, 429, cors);
  const b = await lerJson(request, 1024);

  if (!iguais(b.senha || '', env.ADMIN_PASSWORD)) {
    await new Promise(r => setTimeout(r, 900));
    return json({ erro: 'Senha incorreta.' }, 401, cors);
  }
  const conteudo = b64url(enc.encode(JSON.stringify({ exp: Date.now() + HORAS_SESSAO * 3600 * 1000 })));
  return json({ token: `${conteudo}.${await hmac(env.SESSION_SECRET, conteudo)}` }, 200, cors);
}

async function autorizado(request, env) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const [conteudo, assinatura] = token.split('.');
  if (!conteudo || !assinatura || !env.SESSION_SECRET) return false;
  if (!iguais(assinatura, await hmac(env.SESSION_SECRET, conteudo))) return false;
  try {
    const dados = JSON.parse(atob(conteudo.replace(/-/g, '+').replace(/_/g, '/')));
    return dados.exp > Date.now();
  } catch { return false; }
}

// ---------------------------------------------------------------- estatísticas

async function numeros(url, env, cors) {
  const dias = Math.min(Math.max(parseInt(url.searchParams.get('dias') || '30', 10) || 30, 1), 366);
  const agora = Date.now();
  const desde = diaSP(agora - (dias - 1) * 86400000);
  const inicio = inicioDoDiaSP(desde);
  // Período anterior com o mesmo tempo decorrido: às 10h, "hoje" compara com ontem até as 10h
  const inicioAnterior = inicio - dias * 86400000;
  const fimAnterior = agora - dias * 86400000;
  const q = (sql, ...args) => env.DB.prepare(sql).bind(...args);
  const RESUMO = `SELECT
      COUNT(DISTINCT CASE WHEN type IN ('visit','page') THEN vid END) AS visitantes,
      SUM(type = 'visit') AS visitas,
      SUM(type = 'page') AS paginas,
      SUM(type = 'car') AS cliquesCarros,
      COUNT(DISTINCT CASE WHEN type = 'car' THEN vid END) AS pessoasCarros,
      SUM(type = 'whats') AS cliquesWhats,
      COUNT(DISTINCT CASE WHEN type = 'whats' THEN vid END) AS pessoasWhats
    FROM events`;

  const [resumo, anterior, online, porDia, carros, whatsCarro, botoes, origens, aparelhos, horas, paginas] = await env.DB.batch([
    q(`${RESUMO} WHERE ts >= ?`, inicio),
    q(`${RESUMO} WHERE ts >= ? AND ts <= ?`, inicioAnterior, fimAnterior),
    q(`SELECT COUNT(DISTINCT vid) AS pessoas FROM events WHERE ts >= ?`, agora - 30 * 60000),
    q(`SELECT day, COUNT(DISTINCT vid) AS visitantes, SUM(type = 'visit') AS visitas
       FROM events WHERE day >= ? AND type IN ('visit','page') GROUP BY day ORDER BY day`, desde),
    q(`SELECT target AS id, MAX(label) AS nome, COUNT(*) AS total, COUNT(DISTINCT vid) AS unicos
       FROM events WHERE type = 'car' AND day >= ? GROUP BY target ORDER BY total DESC`, desde),
    q(`SELECT COALESCE(car, label) AS chave, MAX(car) AS id, MAX(label) AS nome, COUNT(*) AS total, COUNT(DISTINCT vid) AS unicos
       FROM events WHERE type = 'whats' AND target = 'detalhes-veiculo' AND day >= ? AND (car IS NOT NULL OR label IS NOT NULL)
       GROUP BY chave ORDER BY total DESC`, desde),
    q(`SELECT target AS botao, COUNT(*) AS total, COUNT(DISTINCT vid) AS unicos
       FROM events WHERE type = 'whats' AND day >= ? GROUP BY target ORDER BY total DESC`, desde),
    q(`SELECT COALESCE(ref, 'direto') AS origem, COUNT(*) AS visitas, COUNT(DISTINCT vid) AS pessoas
       FROM events WHERE type = 'visit' AND day >= ? GROUP BY origem ORDER BY visitas DESC`, desde),
    q(`SELECT COALESCE(dev, 'desconhecido') AS aparelho, COUNT(DISTINCT vid) AS pessoas
       FROM events WHERE type = 'visit' AND day >= ? GROUP BY aparelho ORDER BY pessoas DESC`, desde),
    q(`SELECT CAST(((ts - ${FUSO}) / 1000 % 86400) / 3600 AS INTEGER) AS hora, COUNT(*) AS visitas
       FROM events WHERE type = 'visit' AND day >= ? GROUP BY hora`, desde),
    q(`SELECT page, COUNT(*) AS total, COUNT(DISTINCT vid) AS pessoas
       FROM events WHERE type = 'page' AND day >= ? GROUP BY page ORDER BY total DESC`, desde),
  ]);

  const n = v => Number(v || 0);
  const resumoDe = r => ({
    visitantes: n(r.visitantes), visitas: n(r.visitas), paginas: n(r.paginas),
    cliquesCarros: n(r.cliquesCarros), pessoasCarros: n(r.pessoasCarros),
    cliquesWhats: n(r.cliquesWhats), pessoasWhats: n(r.pessoasWhats),
  });
  const conta = (lista, ...campos) => lista.results.map(x => { for (const c of campos) x[c] = n(x[c]); return x; });
  return json({
    dias,
    desde,
    agora: n((online.results[0] || {}).pessoas),
    resumo: resumoDe(resumo.results[0] || {}),
    anterior: resumoDe(anterior.results[0] || {}),
    porDia: porDia.results.map(d => ({ dia: d.day, visitantes: n(d.visitantes), visitas: n(d.visitas) })),
    carros: conta(carros, 'total', 'unicos'),
    whatsPorCarro: conta(whatsCarro, 'total', 'unicos'),
    botoes: conta(botoes, 'total', 'unicos'),
    origens: conta(origens, 'visitas', 'pessoas'),
    aparelhos: conta(aparelhos, 'pessoas'),
    horas: conta(horas, 'hora', 'visitas'),
    paginas: conta(paginas, 'total', 'pessoas'),
  }, 200, cors);
}

// ---------------------------------------------------------------- estoque no GitHub

async function gh(env, caminho, init = {}) {
  // Ler o repositório público funciona sem token; gravar exige o token
  if (!env.GITHUB_TOKEN && init.method) throw erro('Servidor sem token do GitHub configurado', 500);
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}${caminho}`, {
    ...init,
    headers: {
      ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'bt-veiculos-painel',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!res.ok) {
    const detalhe = await res.text().catch(() => '');
    console.error('GitHub', res.status, caminho, detalhe.slice(0, 300));
    if (res.status === 409 || res.status === 422) throw erro('O site foi alterado em outro lugar ao mesmo tempo. Recarregue o painel e tente de novo.', 409);
    if (res.status === 401 || res.status === 403) throw erro('O GitHub recusou o token do painel. Confira se ele não expirou ou foi apagado.', 502);
    throw erro(`O GitHub não respondeu (erro ${res.status}). Tente de novo em instantes.`, 502);
  }
  return res.json();
}

function lerDataJs(texto) {
  const whatsapp = (texto.match(/const\s+WHATSAPP\s*=\s*'([^']*)'/) || [])[1] || '';
  const inicio = texto.indexOf('[', texto.indexOf('VEHICLES'));
  const fim = texto.lastIndexOf(']');
  if (inicio < 0 || fim < inicio) throw erro('Não consegui ler o js/data.js', 500);
  return { whatsapp, vehicles: JSON.parse(texto.slice(inicio, fim + 1)) };
}

const base64ParaTexto = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, '')), c => c.charCodeAt(0)));

// data.js de um commit exato, para comparar e gravar sobre a mesma versão
async function dataJsEm(env, ref) {
  const arquivo = await gh(env, `/contents/js/data.js?ref=${encodeURIComponent(ref)}`);
  return { sha: arquivo.sha, ...lerDataJs(base64ParaTexto(arquivo.content)) };
}

async function lerEstoque(env, cors) {
  const { sha, whatsapp, vehicles } = await dataJsEm(env, env.GITHUB_BRANCH);
  return json({ sha, whatsapp, vehicles }, 200, cors);
}

function limpaTexto(v, max) {
  // Tira < e > para os textos nunca virarem código na página
  return String(v ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function limpaVeiculo(v, i) {
  if (!v || typeof v !== 'object') throw erro(`Veículo ${i + 1} inválido`);
  const out = {};
  for (const [k, tipo] of Object.entries(CAMPOS_VEICULO)) {
    const val = v[k];
    if (val === undefined || val === null) continue;
    if (tipo === 'number') { const n = Number(val); if (Number.isFinite(n)) out[k] = n; }
    else if (tipo === 'boolean') out[k] = Boolean(val);
    else if (tipo === 'string') out[k] = limpaTexto(val, k === 'desc' ? 1000 : 160);
    else if (tipo === 'array') out[k] = (Array.isArray(val) ? val : []).map(x => limpaTexto(x, 160)).filter(Boolean).slice(0, 40);
  }
  for (const obrigatorio of ['id', 'marca', 'modelo', 'preco', 'ano']) {
    if (out[obrigatorio] === undefined || out[obrigatorio] === '') throw erro(`Veículo ${i + 1}: falta "${obrigatorio}"`);
  }
  for (const p of [out.img, ...(out.fotos || [])]) {
    if (p && !FOTO_NO_SITE.test(p)) throw erro(`Veículo ${i + 1}: caminho de foto inválido (${p})`);
  }
  return out;
}

async function enviarFoto(request, env, cors) {
  const b = await lerJson(request, 6_000_000);
  if (!FOTO_NO_REPO.test(b.path || '')) throw erro('Nome de foto inválido');
  if (typeof b.data !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(b.data)) throw erro('Foto inválida');
  if (env.DRY_RUN === '1') return json({ path: b.path, sha: '0'.repeat(40) }, 200, cors);
  const blob = await gh(env, '/git/blobs', { method: 'POST', body: JSON.stringify({ content: b.data, encoding: 'base64' }) });
  return json({ path: b.path, sha: blob.sha }, 200, cors);
}

async function publicar(request, env, cors) {
  const b = await lerJson(request, 1_000_000);
  if (!Array.isArray(b.vehicles)) throw erro('Lista de veículos ausente');
  if (!b.vehicles.length && !b.confirmarVazio) throw erro('A lista de veículos está vazia.');
  const vehicles = b.vehicles.map(limpaVeiculo);
  const ids = vehicles.map(v => v.id);
  if (new Set(ids).size !== ids.length) throw erro('Há dois veículos com o mesmo código. Recarregue o painel.');

  // Fotos já enviadas por /admin/photo: só o caminho e o sha entram no commit
  const fotos = Array.isArray(b.photos) ? b.photos : [];
  if (fotos.length > 200) throw erro('Fotos demais em uma publicação');
  for (const f of fotos) {
    if (!FOTO_NO_REPO.test(f.path || '') || !/^[0-9a-f]{40}$/.test(f.sha || '')) throw erro('Foto inválida na publicação');
  }

  // Tudo a partir do mesmo commit: confere a versão e grava em cima dela
  const ref = await gh(env, `/git/ref/heads/${env.GITHUB_BRANCH}`);
  const atual = await dataJsEm(env, ref.object.sha);
  if (b.baseSha && b.baseSha !== atual.sha) {
    throw erro('O estoque foi alterado em outro lugar depois que você abriu o painel. Recarregue e refaça a alteração.', 409);
  }
  const conteudo = `const WHATSAPP = '${atual.whatsapp}';\n\nconst VEHICLES = ${JSON.stringify(vehicles, null, 2)};\n`;
  const mensagem = limpaTexto(b.message || 'Atualização do estoque pelo painel', 120);

  if (env.DRY_RUN === '1') {
    return json({ ok: true, simulacao: true, veiculos: vehicles.length, fotos: fotos.length, vehicles }, 200, cors);
  }

  const head = await gh(env, `/git/commits/${ref.object.sha}`);
  const blobDados = await gh(env, '/git/blobs', { method: 'POST', body: JSON.stringify({ content: conteudo, encoding: 'utf-8' }) });
  const tree = fotos.map(f => ({ path: f.path, mode: '100644', type: 'blob', sha: f.sha }));
  tree.push({ path: 'js/data.js', mode: '100644', type: 'blob', sha: blobDados.sha });

  const novaArvore = await gh(env, '/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: head.tree.sha, tree }) });
  const commit = await gh(env, '/git/commits', { method: 'POST', body: JSON.stringify({ message: mensagem, tree: novaArvore.sha, parents: [head.sha] }) });
  // Sem force: se outro commit entrou no meio, o GitHub recusa (422) e o painel avisa
  await gh(env, `/git/refs/heads/${env.GITHUB_BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });

  return json({ ok: true, commit: commit.sha, sha: blobDados.sha, veiculos: vehicles.length, fotos: fotos.length, vehicles }, 200, cors);
}
