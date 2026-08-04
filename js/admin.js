// ===== ADMIN PANEL =====
// Acesso: duplo clique na logo → senha BTHERO1000
// Os veículos são salvos no localStorage e mesclados com os do data.js

const ADMIN_PASS = 'BTHERO1000';
let adminOpen = false;

// Double click on logo to open admin
document.querySelector('.logo').addEventListener('dblclick', e => {
  e.preventDefault();
  const pass = prompt('🔒 Acesso restrito. Digite a senha:');
  if (pass === ADMIN_PASS) {
    openAdmin();
  } else if (pass !== null) {
    alert('Senha incorreta.');
  }
});

function getStoredVehicles() {
  try {
    return JSON.parse(localStorage.getItem('bt_vehicles') || '[]');
  } catch { return []; }
}

function saveStoredVehicles(list) {
  localStorage.setItem('bt_vehicles', JSON.stringify(list));
}

// Merge stored vehicles with default ones
function getAllVehicles() {
  const stored = getStoredVehicles();
  if (stored.length > 0) return stored;
  return VEHICLES;
}

// Override VEHICLES on page load
(function() {
  const stored = getStoredVehicles();
  if (stored.length > 0) {
    VEHICLES.length = 0;
    stored.forEach(v => VEHICLES.push(v));
  }
})();

function openAdmin() {
  if (adminOpen) return;
  adminOpen = true;

  const overlay = document.createElement('div');
  overlay.id = 'adminPanel';
  overlay.innerHTML = `
    <div class="admin-container">
      <div class="admin-header">
        <h2>🔧 Painel Admin — BT Veículos</h2>
        <button class="admin-close" onclick="closeAdmin()">✕</button>
      </div>
      <div class="admin-body">
        <div class="admin-section">
          <h3>Veículos cadastrados (${VEHICLES.length})</h3>
          <div id="adminList"></div>
        </div>
        <div class="admin-section">
          <h3>➕ Adicionar novo veículo</h3>
          <form id="adminForm" class="admin-form">
            <div class="admin-row">
              <label>Marca<input type="text" id="adm_marca" required placeholder="Ex: Toyota"></label>
              <label>Modelo<input type="text" id="adm_modelo" required placeholder="Ex: Corolla"></label>
            </div>
            <div class="admin-row">
              <label>Versão<input type="text" id="adm_versao" required placeholder="Ex: XEi 2.0 Flex"></label>
              <label>Ano<input type="number" id="adm_ano" required placeholder="2023"></label>
            </div>
            <div class="admin-row">
              <label>KM<input type="number" id="adm_km" required placeholder="50000"></label>
              <label>Preço (R$)<input type="number" id="adm_preco" required placeholder="69900"></label>
            </div>
            <div class="admin-row">
              <label>Câmbio
                <select id="adm_cambio"><option value="automático">Automático</option><option value="manual">Manual</option></select>
              </label>
              <label>Combustível
                <select id="adm_combustivel"><option value="Flex">Flex</option><option value="Gasolina">Gasolina</option><option value="Diesel">Diesel</option><option value="Elétrico">Elétrico</option><option value="Híbrido">Híbrido</option></select>
              </label>
            </div>
            <div class="admin-row">
              <label>Cor<input type="text" id="adm_cor" placeholder="Ex: Branco"></label>
              <label>Uso
                <select id="adm_uso"><option value="seminovo">Seminovo</option><option value="usado">Usado</option><option value="novo">Novo</option></select>
              </label>
            </div>
            <label>Opcionais (separados por vírgula)<input type="text" id="adm_opcionais" placeholder="Ar-condicionado, Câmera de ré, Central multimídia"></label>
            <label>Descrição<textarea id="adm_desc" rows="2" placeholder="Descrição comercial do veículo"></textarea></label>
            <div class="admin-row">
              <label class="file-label">📷 Foto do estoque (normal)
                <input type="file" id="adm_img" accept="image/*">
                <span class="file-name" id="adm_img_name">Nenhum arquivo</span>
              </label>
              <label class="file-label">🎨 Foto hero (recortada/Canva)
                <input type="file" id="adm_heroImg" accept="image/*">
                <span class="file-name" id="adm_heroImg_name">Nenhum arquivo</span>
              </label>
            </div>
            <label class="checkbox-label"><input type="checkbox" id="adm_destaque"> Marcar como destaque (aparece no carrossel)</label>
            <button type="submit" class="btn-primary" style="width:100%;margin-top:12px">Adicionar veículo</button>
          </form>
        </div>
        <div class="admin-section">
          <h3>⚠️ Ações</h3>
          <button class="btn-outline" onclick="resetVehicles()" style="font-size:12px;padding:10px 20px">Resetar estoque (voltar ao original)</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  renderAdminList();
  setupAdminForm();
}

function closeAdmin() {
  const panel = document.getElementById('adminPanel');
  if (panel) panel.remove();
  document.body.style.overflow = '';
  adminOpen = false;
  // Refresh page to reflect changes
  location.reload();
}

function renderAdminList() {
  const list = document.getElementById('adminList');
  if (!list) return;
  
  list.innerHTML = VEHICLES.map((v, i) => `
    <div class="admin-car-item">
      <div class="admin-car-info">
        <strong>${v.marca} ${v.modelo}</strong>
        <span>${v.versao} · ${v.ano} · ${v.km.toLocaleString('pt-BR')} km · R$ ${v.preco.toLocaleString('pt-BR')}</span>
        ${v.destaque ? '<span class="admin-badge">★ Destaque</span>' : ''}
      </div>
      <div class="admin-car-actions">
        <button onclick="toggleDestaque(${i})" title="Alternar destaque">⭐</button>
        <button onclick="removeVehicle(${i})" title="Remover">🗑️</button>
      </div>
    </div>
  `).join('');
}

function setupAdminForm() {
  // File input names
  document.getElementById('adm_img').onchange = e => {
    document.getElementById('adm_img_name').textContent = e.target.files[0]?.name || 'Nenhum arquivo';
  };
  document.getElementById('adm_heroImg').onchange = e => {
    document.getElementById('adm_heroImg_name').textContent = e.target.files[0]?.name || 'Nenhum arquivo';
  };

  document.getElementById('adminForm').onsubmit = async e => {
    e.preventDefault();
    
    const img = await fileToBase64(document.getElementById('adm_img').files[0]);
    const heroImg = await fileToBase64(document.getElementById('adm_heroImg').files[0]);

    const newVehicle = {
      id: Date.now(),
      destaque: document.getElementById('adm_destaque').checked,
      marca: document.getElementById('adm_marca').value,
      modelo: document.getElementById('adm_modelo').value,
      versao: document.getElementById('adm_versao').value,
      ano: parseInt(document.getElementById('adm_ano').value),
      anoModelo: parseInt(document.getElementById('adm_ano').value),
      km: parseInt(document.getElementById('adm_km').value),
      uso: document.getElementById('adm_uso').value,
      cambio: document.getElementById('adm_cambio').value,
      combustivel: document.getElementById('adm_combustivel').value,
      cor: document.getElementById('adm_cor').value || 'Não informado',
      preco: parseInt(document.getElementById('adm_preco').value),
      img: img || '/carros/placeholder.jpg',
      heroImg: heroImg || img || '/carros/placeholder.jpg',
      opcionais: document.getElementById('adm_opcionais').value.split(',').map(s => s.trim()).filter(Boolean),
      desc: document.getElementById('adm_desc').value || 'Veículo revisado e pronto para venda.'
    };

    VEHICLES.push(newVehicle);
    saveStoredVehicles(VEHICLES);
    renderAdminList();
    document.getElementById('adminForm').reset();
    document.getElementById('adm_img_name').textContent = 'Nenhum arquivo';
    document.getElementById('adm_heroImg_name').textContent = 'Nenhum arquivo';
    alert('✅ Veículo adicionado com sucesso!');
  };
}

function fileToBase64(file) {
  return new Promise(resolve => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function removeVehicle(index) {
  if (!confirm(`Remover ${VEHICLES[index].marca} ${VEHICLES[index].modelo}?`)) return;
  VEHICLES.splice(index, 1);
  saveStoredVehicles(VEHICLES);
  renderAdminList();
}

function toggleDestaque(index) {
  VEHICLES[index].destaque = !VEHICLES[index].destaque;
  saveStoredVehicles(VEHICLES);
  renderAdminList();
}

function resetVehicles() {
  if (!confirm('Isso vai resetar o estoque para o original. Veículos adicionados pelo painel serão removidos. Continuar?')) return;
  localStorage.removeItem('bt_vehicles');
  alert('Estoque resetado. A página vai recarregar.');
  location.reload();
}
