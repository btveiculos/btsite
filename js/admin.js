// ===== ADMIN PANEL =====
// Acesso: clique duplo rápido na logo → senha BTHERO1000
// Veículos salvos em localStorage, visíveis apenas neste navegador
// Botão "Publicar" gera o código para atualizar permanentemente

const ADMIN_PASS = 'BTHERO1000';
let adminOpen = false;
let logoClicks = 0;
let logoTimer = null;

// Detect double click on logo (bypass link behavior)
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

// Load stored vehicles on page load
(function loadStored() {
  try {
    const stored = JSON.parse(localStorage.getItem('bt_vehicles'));
    if (stored && stored.length > 0) {
      VEHICLES.length = 0;
      stored.forEach(v => VEHICLES.push(v));
    }
  } catch(e) {}
})();

function saveToStorage() {
  localStorage.setItem('bt_vehicles', JSON.stringify(VEHICLES));
}

function openAdmin() {
  if (adminOpen) return;
  adminOpen = true;
  const el = document.createElement('div');
  el.id = 'adminPanel';
  el.innerHTML = `
<div class="admin-container">
  <div class="admin-header">
    <h2>🔧 Painel Admin</h2>
    <button class="admin-close" id="adminCloseBtn">✕</button>
  </div>
  <div class="admin-body">
    <div class="admin-section">
      <h3>Veículos (${VEHICLES.length})</h3>
      <div id="adminList"></div>
    </div>
    <div class="admin-section">
      <h3>➕ Adicionar veículo</h3>
      <form id="adminForm" class="admin-form">
        <div class="admin-row"><label>Marca<input type="text" id="a_marca" required></label><label>Modelo<input type="text" id="a_modelo" required></label></div>
        <div class="admin-row"><label>Versão<input type="text" id="a_versao" required></label><label>Ano<input type="number" id="a_ano" required></label></div>
        <div class="admin-row"><label>KM<input type="number" id="a_km" required></label><label>Preço (sem ponto)<input type="number" id="a_preco" required></label></div>
        <div class="admin-row"><label>Câmbio<select id="a_cambio"><option value="automático">Automático</option><option value="manual">Manual</option></select></label><label>Combustível<select id="a_comb"><option>Flex</option><option>Gasolina</option><option>Diesel</option><option>Elétrico</option><option>Híbrido</option></select></label></div>
        <div class="admin-row"><label>Cor<input type="text" id="a_cor"></label><label>Tipo<select id="a_uso"><option value="seminovo">Seminovo</option><option value="usado">Usado</option><option value="novo">Novo</option></select></label></div>
        <label>Opcionais (vírgula)<input type="text" id="a_opcionais" placeholder="Ar, Câmera, Multimídia"></label>
        <label>Descrição<textarea id="a_desc" rows="2"></textarea></label>
        <div class="admin-row">
          <label>📷 Foto estoque<input type="file" id="a_img" accept="image/*"></label>
          <label>🎨 Foto hero (recortada)<input type="file" id="a_hero" accept="image/*"></label>
        </div>
        <label class="checkbox-label"><input type="checkbox" id="a_dest"> Destaque (aparece no carrossel)</label>
        <button type="submit" class="btn-primary" style="width:100%;margin-top:12px">Adicionar</button>
      </form>
    </div>
    <div class="admin-section">
      <h3>📤 Publicar alterações</h3>
      <p style="color:var(--text3);font-size:12px;margin-bottom:12px">Clique abaixo para gerar o código atualizado. Copie e cole no arquivo <code>js/data.js</code> do repositório GitHub.</p>
      <button class="btn-primary" id="exportBtn" style="font-size:12px;padding:12px 20px">Gerar código para publicar</button>
      <textarea id="exportArea" style="display:none;width:100%;height:200px;margin-top:12px;background:var(--bg);color:#4ade80;border:1px solid var(--border);border-radius:10px;padding:14px;font-family:monospace;font-size:11px;resize:vertical"></textarea>
    </div>
    <div class="admin-section">
      <button class="btn-outline" id="resetBtn" style="font-size:11px;padding:8px 16px">Resetar para estoque original</button>
    </div>
  </div>
</div>`;
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  
  document.getElementById('adminCloseBtn').onclick = closeAdmin;
  document.getElementById('resetBtn').onclick = resetVehicles;
  document.getElementById('exportBtn').onclick = exportData;
  renderAdminList();
  setupForm();
}

function closeAdmin() {
  document.getElementById('adminPanel')?.remove();
  document.body.style.overflow = '';
  adminOpen = false;
  location.reload();
}

function renderAdminList() {
  const el = document.getElementById('adminList');
  if (!el) return;
  el.innerHTML = VEHICLES.map((v,i) => `
    <div class="admin-car-item">
      <div class="admin-car-info">
        <strong>${v.marca} ${v.modelo}</strong>
        <span>${v.versao} · ${v.ano} · ${v.km?.toLocaleString('pt-BR')} km · R$ ${v.preco?.toLocaleString('pt-BR')}</span>
        ${v.destaque ? '<span class="admin-badge">★ Destaque</span>' : ''}
      </div>
      <div class="admin-car-actions">
        <button onclick="toggleDest(${i})" title="Destaque">⭐</button>
        <button onclick="removeCar(${i})" title="Remover">🗑️</button>
      </div>
    </div>`).join('');
}

function setupForm() {
  document.getElementById('adminForm').onsubmit = async e => {
    e.preventDefault();
    const img = await toBase64(document.getElementById('a_img').files[0]);
    const hero = await toBase64(document.getElementById('a_hero').files[0]);
    VEHICLES.push({
      id: Date.now(),
      destaque: document.getElementById('a_dest').checked,
      marca: document.getElementById('a_marca').value,
      modelo: document.getElementById('a_modelo').value,
      versao: document.getElementById('a_versao').value,
      ano: +document.getElementById('a_ano').value,
      anoModelo: +document.getElementById('a_ano').value,
      km: +document.getElementById('a_km').value,
      preco: +document.getElementById('a_preco').value,
      cambio: document.getElementById('a_cambio').value,
      combustivel: document.getElementById('a_comb').value,
      cor: document.getElementById('a_cor').value || 'N/I',
      uso: document.getElementById('a_uso').value,
      img: img || '',
      heroImg: hero || img || '',
      opcionais: document.getElementById('a_opcionais').value.split(',').map(s=>s.trim()).filter(Boolean),
      desc: document.getElementById('a_desc').value || 'Veículo revisado.'
    });
    saveToStorage();
    renderAdminList();
    e.target.reset();
    alert('✅ Veículo adicionado! As alterações estão salvas localmente. Use "Publicar" para tornar permanente.');
  };
}

function toBase64(file) {
  return new Promise(r => {
    if (!file) return r(null);
    const reader = new FileReader();
    reader.onload = () => r(reader.result);
    reader.readAsDataURL(file);
  });
}

function toggleDest(i) { VEHICLES[i].destaque = !VEHICLES[i].destaque; saveToStorage(); renderAdminList(); }
function removeCar(i) { if(confirm(`Remover ${VEHICLES[i].marca} ${VEHICLES[i].modelo}?`)){VEHICLES.splice(i,1);saveToStorage();renderAdminList();} }
function resetVehicles() { if(confirm('Resetar estoque?')){localStorage.removeItem('bt_vehicles');location.reload();} }

function exportData() {
  const area = document.getElementById('exportArea');
  const code = `const WHATSAPP = '5511947717447';\n\nconst VEHICLES = ${JSON.stringify(VEHICLES, null, 2)};`;
  area.style.display = 'block';
  area.value = code;
  area.select();
  try { document.execCommand('copy'); alert('✅ Código copiado! Cole no arquivo js/data.js do GitHub.'); }
  catch(e) { alert('Código gerado abaixo. Copie manualmente.'); }
}
