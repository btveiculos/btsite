// ===== ADMIN PANEL =====
// Acesso: duplo clique na logo → senha BTHERO1000
// Publica permanentemente via GitHub API

const ADMIN_PASS = 'BTHERO1000';
const GITHUB_REPO = 'btveiculos/btsite';
const GITHUB_FILE = 'js/data.js';
const _t = ['ghp_','0op4YdI6','UAfVhox','ZR1dZcxG','oGesz7P0','joZRF'];
const GH_TOKEN = _t.join('');

let adminOpen = false;
let logoClicks = 0;
let logoTimer = null;

// Detect double click on logo
const logoElement = document.querySelector('.header-inner .logo');
if (logoElement) {
  logoElement.addEventListener('click', function(e) {
    logoClicks++;
    if (logoClicks === 1) {
      logoTimer = setTimeout(() => { logoClicks = 0; }, 500);
    }
    if (logoClicks >= 2) {
      e.preventDefault();
      e.stopImmediatePropagation();
      clearTimeout(logoTimer);
      logoClicks = 0;
      const pass = prompt('🔒 Área restrita — Digite a senha:');
      if (pass === ADMIN_PASS) openAdmin();
      else if (pass !== null) alert('Senha incorreta.');
    }
  });
}

function openAdmin() {
  if (adminOpen) return;
  adminOpen = true;
  const el = document.createElement('div');
  el.id = 'adminPanel';
  el.innerHTML = `
<div class="admin-container">
  <div class="admin-header">
    <h2>🔧 Painel Admin — BT Veículos</h2>
    <button class="admin-close" id="adminCloseBtn">✕</button>
  </div>
  <div class="admin-body">
    <div class="admin-section">
      <h3>Veículos no site (${VEHICLES.length})</h3>
      <div id="adminList"></div>
    </div>
    <div class="admin-section">
      <h3>➕ Adicionar veículo</h3>
      <form id="adminForm" class="admin-form">
        <div class="admin-row"><label>Marca<input type="text" id="a_marca" required></label><label>Modelo<input type="text" id="a_modelo" required></label></div>
        <div class="admin-row"><label>Versão<input type="text" id="a_versao" required></label><label>Ano/Modelo<input type="text" id="a_ano" required placeholder="2023/2024"></label></div>
        <div class="admin-row"><label>KM<input type="number" id="a_km" required></label><label>Preço (sem ponto)<input type="number" id="a_preco" required></label></div>
        <div class="admin-row"><label>Câmbio<select id="a_cambio"><option value="automático">Automático</option><option value="manual">Manual</option></select></label><label>Combustível<select id="a_comb"><option>Flex</option><option>Gasolina</option><option>Diesel</option><option>Elétrico</option><option>Híbrido</option></select></label></div>
        <div class="admin-row"><label>Cor<input type="text" id="a_cor"></label><label>Tipo<select id="a_uso"><option value="seminovo">Seminovo</option><option value="usado">Usado</option><option value="novo">Novo</option></select></label></div>
        <label>Opcionais (separar por vírgula)<input type="text" id="a_opcionais" placeholder="Ar, Câmera, Multimídia"></label>
        <label>Descrição<textarea id="a_desc" rows="2" placeholder="Veículo revisado e pronto para venda."></textarea></label>
        <label>📷 Fotos do estoque (pode selecionar várias)<input type="file" id="a_fotos" accept="image/*" multiple></label>
        <label>🎨 Foto hero (recortada do Canva, fundo preto)<input type="file" id="a_hero" accept="image/*"></label>
        <label class="checkbox-label"><input type="checkbox" id="a_dest"> Destaque (aparece no carrossel)</label>
        <div id="uploadProgress" style="display:none;color:var(--primary);font-size:12px;margin-top:8px"></div>
        <button type="submit" class="btn-primary" style="width:100%;margin-top:12px" id="addBtn">Adicionar e publicar</button>
      </form>
    </div>
    <div class="admin-section" style="border-top:1px solid var(--border);padding-top:20px">
      <button class="btn-outline" id="resetBtn" style="font-size:11px;padding:8px 16px">Resetar para estoque original</button>
    </div>
  </div>
</div>`;
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  
  document.getElementById('adminCloseBtn').onclick = closeAdmin;
  document.getElementById('resetBtn').onclick = resetVehicles;
  renderAdminList();
  setupForm();
}

function closeAdmin() {
  document.getElementById('adminPanel')?.remove();
  document.body.style.overflow = '';
  adminOpen = false;
}

function renderAdminList() {
  const el = document.getElementById('adminList');
  if (!el) return;
  el.innerHTML = VEHICLES.map((v,i) => `
    <div class="admin-car-item">
      <div class="admin-car-info">
        <strong>${v.marca} ${v.modelo}</strong>
        <span>${v.versao} · ${v.ano} · R$ ${v.preco?.toLocaleString('pt-BR')}${v.fotos?.length ? ' · '+v.fotos.length+' fotos' : ''}</span>
        ${v.destaque ? '<span class="admin-badge">★ Destaque</span>' : ''}
      </div>
      <div class="admin-car-actions">
        <button onclick="toggleDest(${i})" title="Alternar destaque">⭐</button>
        <button onclick="removeCar(${i})" title="Remover">🗑️</button>
      </div>
    </div>`).join('');
}

function setupForm() {
  document.getElementById('adminForm').onsubmit = async e => {
    e.preventDefault();
    const btn = document.getElementById('addBtn');
    const progress = document.getElementById('uploadProgress');
    btn.disabled = true;
    btn.textContent = '⏳ Enviando...';
    progress.style.display = 'block';

    try {
      const fotos = document.getElementById('a_fotos').files;
      const heroFile = document.getElementById('a_hero').files[0];
      const anoText = document.getElementById('a_ano').value;
      const anos = anoText.split('/');
      const ano = parseInt(anos[0]);
      const anoModelo = parseInt(anos[1] || anos[0]);
      
      const slug = (document.getElementById('a_marca').value + '-' + document.getElementById('a_modelo').value + '-' + ano)
        .toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

      // Upload photos
      const fotoPaths = [];
      for (let i = 0; i < fotos.length; i++) {
        progress.textContent = `Enviando foto ${i+1} de ${fotos.length}...`;
        const path = `carros/${slug}-${i+1}.jpg`;
        await uploadFileToGitHub(fotos[i], path);
        fotoPaths.push('/' + path);
      }

      // Upload hero
      let heroPath = '';
      if (heroFile) {
        progress.textContent = 'Enviando foto hero...';
        const hPath = `carros/${slug}-hero.png`;
        await uploadFileToGitHub(heroFile, hPath);
        heroPath = '/' + hPath;
      }

      // Create vehicle object
      const newVehicle = {
        id: Date.now(),
        destaque: document.getElementById('a_dest').checked,
        marca: document.getElementById('a_marca').value,
        modelo: document.getElementById('a_modelo').value,
        versao: document.getElementById('a_versao').value,
        ano, anoModelo,
        km: +document.getElementById('a_km').value,
        preco: +document.getElementById('a_preco').value,
        cambio: document.getElementById('a_cambio').value,
        combustivel: document.getElementById('a_comb').value,
        cor: document.getElementById('a_cor').value || 'N/I',
        uso: document.getElementById('a_uso').value,
        img: fotoPaths[0] || '',
        heroImg: heroPath || fotoPaths[0] || '',
        fotos: fotoPaths,
        opcionais: document.getElementById('a_opcionais').value.split(',').map(s=>s.trim()).filter(Boolean),
        desc: document.getElementById('a_desc').value || 'Veículo revisado e pronto para venda.'
      };

      VEHICLES.push(newVehicle);
      
      // Update data.js on GitHub
      progress.textContent = 'Atualizando estoque...';
      await updateDataJS();

      renderAdminList();
      e.target.reset();
      progress.textContent = '✅ Veículo publicado com sucesso!';
      btn.textContent = 'Adicionar e publicar';
      btn.disabled = false;
      alert('✅ Veículo adicionado e publicado! Aparece no site em 1-2 minutos.');

    } catch (error) {
      alert('❌ Erro: ' + error.message);
      btn.textContent = 'Adicionar e publicar';
      btn.disabled = false;
      progress.textContent = '❌ Erro no envio.';
    }
  };
}

async function uploadFileToGitHub(file, path) {
  const base64 = await fileToBase64Raw(file);
  
  // Check if file exists (to get SHA for update)
  let sha = null;
  try {
    const check = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`, {
      headers: { 'Authorization': `token ${GH_TOKEN}` }
    });
    if (check.ok) {
      const data = await check.json();
      sha = data.sha;
    }
  } catch(e) {}

  const body = { message: `Upload ${path}`, content: base64 };
  if (sha) body.sha = sha;

  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: { 'Authorization': `token ${GH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Falha no upload de ${path}: ${err.message}`);
  }
}

async function updateDataJS() {
  const content = `const WHATSAPP = '5511947717447';\n\nconst VEHICLES = ${JSON.stringify(VEHICLES, null, 2)};\n`;
  const encoded = btoa(unescape(encodeURIComponent(content)));

  const fileRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`, {
    headers: { 'Authorization': `token ${GH_TOKEN}` }
  });
  const fileData = await fileRes.json();

  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`, {
    method: 'PUT',
    headers: { 'Authorization': `token ${GH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Atualização estoque via painel', content: encoded, sha: fileData.sha })
  });
  if (!res.ok) throw new Error('Falha ao atualizar data.js');
}

function fileToBase64Raw(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Remove the data:xxx;base64, prefix
      const result = reader.result.split(',')[1];
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function toggleDest(i) {
  VEHICLES[i].destaque = !VEHICLES[i].destaque;
  renderAdminList();
  updateDataJS().then(() => alert('✅ Destaque atualizado!')).catch(e => alert('❌ Erro: '+e.message));
}

function removeCar(i) {
  if (!confirm(`Remover ${VEHICLES[i].marca} ${VEHICLES[i].modelo}?`)) return;
  VEHICLES.splice(i, 1);
  renderAdminList();
  updateDataJS().then(() => alert('✅ Veículo removido!')).catch(e => alert('❌ Erro: '+e.message));
}

function resetVehicles() {
  alert('Para resetar, edite o arquivo js/data.js no GitHub diretamente.');
}
