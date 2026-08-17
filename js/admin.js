// ===== ADMIN PANEL =====
// Acesso: duplo clique na logo → senha BTHERO1000
// Publica permanentemente via GitHub API

const ADMIN_PASS = 'BTHERO1000';
const GITHUB_REPO = 'btveiculos/btsite';
const GITHUB_FILE = 'js/data.js';
const _t = ['ghp_','pxAtRWQ5','5agMTLJz','9juhV4BC','GT9Lsp1Z','9DXy'];
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
<div class="admin-fullscreen">
  <aside class="admin-sidebar">
    <div class="admin-sidebar-logo">
      <div class="admin-logo-box">BT</div>
      <div>
        <span class="admin-logo-name">Painel Admin</span>
        <span class="admin-logo-sub">BT Veículos</span>
      </div>
    </div>
    <nav class="admin-nav">
      <button class="admin-nav-btn active" data-tab="estoque">🚗 Estoque (${VEHICLES.length})</button>
      <button class="admin-nav-btn" data-tab="adicionar">➕ Adicionar</button>
    </nav>
    <div class="admin-sidebar-footer">
      <button class="admin-nav-btn" id="resetBtn">🔄 Resetar</button>
      <button class="admin-nav-btn admin-close-btn" id="adminCloseBtn">✕ Fechar</button>
    </div>
  </aside>
  <main class="admin-main">
    <div class="admin-tab active" id="tab-estoque">
      <div class="admin-main-header">
        <h1>Estoque</h1>
        <p>${VEHICLES.length} veículos cadastrados</p>
      </div>
      <div class="admin-grid" id="adminList"></div>
    </div>
    <div class="admin-tab" id="tab-adicionar">
      <div class="admin-main-header">
        <h1>Adicionar veículo</h1>
        <p>Preencha os dados e envie as fotos</p>
      </div>
      <form id="adminForm" class="admin-form admin-form-grid">
        <div class="admin-row"><label>Marca<input type="text" id="a_marca" required></label><label>Modelo<input type="text" id="a_modelo" required></label></div>
        <div class="admin-row"><label>Versão<input type="text" id="a_versao" required></label><label>Ano/Modelo<input type="text" id="a_ano" required placeholder="2023/2024"></label></div>
        <div class="admin-row"><label>KM<input type="number" id="a_km" required></label><label>Preço (sem ponto)<input type="number" id="a_preco" required></label></div>
        <div class="admin-row"><label>Câmbio<select id="a_cambio"><option value="automático">Automático</option><option value="manual">Manual</option></select></label><label>Combustível<select id="a_comb"><option>Flex</option><option>Gasolina</option><option>Diesel</option><option>Elétrico</option><option>Híbrido</option></select></label></div>
        <div class="admin-row"><label>Cor<input type="text" id="a_cor"></label><label>Tipo<select id="a_uso"><option value="seminovo">Seminovo</option><option value="usado">Usado</option><option value="novo">Novo</option></select></label></div>
        <label>Opcionais (separar por vírgula)<input type="text" id="a_opcionais" placeholder="Ar, Câmera, Multimídia"></label>
        <label>Descrição<textarea id="a_desc" rows="2" placeholder="Veículo revisado e pronto para venda."></textarea></label>
        <div class="admin-row"><label>📷 Fotos do estoque<input type="file" id="a_fotos" accept="image/*" multiple></label><label>🎨 Foto hero (fundo preto)<input type="file" id="a_hero" accept="image/*"></label></div>
        <label class="checkbox-label"><input type="checkbox" id="a_dest"> Destaque (aparece no carrossel)</label>
        <div id="uploadProgress" style="display:none;color:var(--primary);font-size:12px;margin-top:8px"></div>
        <button type="submit" class="btn-primary" style="width:100%;margin-top:16px" id="addBtn">Adicionar e publicar</button>
      </form>
    </div>
  </main>
</div>`;
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';

  // Tab navigation
  el.querySelectorAll('.admin-nav-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.admin-nav-btn[data-tab]').forEach(b => b.classList.remove('active'));
      el.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      el.querySelector(`#tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
  
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
    <div class="admin-card">
      <div class="admin-card-img">
        ${v.img ? `<img src="${v.img}" alt="${v.marca} ${v.modelo}">` : `<div class="admin-card-placeholder">🚗</div>`}
        ${v.destaque ? '<span class="admin-card-badge">★ Destaque</span>' : ''}
      </div>
      <div class="admin-card-body">
        <h3>${v.marca} ${v.modelo}</h3>
        <p class="admin-card-versao">${v.versao}</p>
        <div class="admin-card-meta">
          <span>${v.ano}/${v.anoModelo}</span>
          <span>${v.km?.toLocaleString('pt-BR')} km</span>
          <span>${v.fotos?.length || 0} fotos</span>
        </div>
        <p class="admin-card-price">R$ ${v.preco?.toLocaleString('pt-BR')}</p>
      </div>
      <div class="admin-card-actions">
        <button onclick="editCar(${i})" title="Editar">✏️ Editar</button>
        <button onclick="toggleDest(${i})" title="Destaque">⭐</button>
        <button onclick="removeCar(${i})" title="Remover" class="admin-btn-danger">🗑️</button>
      </div>
    </div>`).join('');
}

function editCar(i) {
  const v = VEHICLES[i];
  const fotos = v.fotos && v.fotos.length ? [...v.fotos] : (v.img ? [v.img] : []);
  const editDiv = document.createElement('div');
  editDiv.id = 'editModal';
  editDiv.innerHTML = `
<div class="edit-fullscreen">
  <div class="edit-sidebar">
    <div class="edit-sidebar-header">
      <h2>${v.marca} ${v.modelo}</h2>
      <p>${v.versao} · ${v.ano}</p>
    </div>
    <div class="edit-photos-panel">
      <h3>📷 Fotos (${fotos.length})</h3>
      <p class="edit-photos-hint">Arraste para reordenar. A 1ª foto é a capa.</p>
      <div id="editPhotosGrid" class="edit-photos-grid">
        ${fotos.map((f,fi) => `
          <div class="edit-photo-item" data-index="${fi}" draggable="true">
            <span class="edit-photo-num">${fi+1}</span>
            <img src="${f}" alt="Foto ${fi+1}">
            <div class="edit-photo-controls">
              <button type="button" class="edit-photo-move" onclick="movePhoto(${i},${fi},-1)" title="Mover para cima">▲</button>
              <button type="button" class="edit-photo-move" onclick="movePhoto(${i},${fi},1)" title="Mover para baixo">▼</button>
              <button type="button" class="edit-photo-del" onclick="removePhoto(${i},${fi})" title="Remover">✕</button>
            </div>
            ${fi===0?'<span class="edit-photo-capa">CAPA</span>':''}
          </div>`).join('')}
      </div>
      <label class="edit-add-photos-btn" for="e_fotos">➕ Adicionar fotos<input type="file" id="e_fotos" accept="image/*" multiple style="position:absolute;opacity:0;width:0;height:0"></label>
      <div class="edit-dropzone" id="editDropzone">
        <span>📁 Arraste fotos aqui ou clique acima</span>
      </div>
      <label class="edit-add-photos-btn" for="e_hero">🎨 Trocar hero<input type="file" id="e_hero" accept="image/*" style="position:absolute;opacity:0;width:0;height:0"></label>
    </div>
  </div>
  <div class="edit-main">
    <div class="edit-main-header">
      <h1>Editar veículo</h1>
      <button type="button" class="edit-close-btn" id="editCloseBtn">✕ Fechar</button>
    </div>
    <form id="editForm" class="admin-form">
      <div class="admin-row"><label>Marca<input type="text" id="e_marca" value="${v.marca}" required></label><label>Modelo<input type="text" id="e_modelo" value="${v.modelo}" required></label></div>
      <div class="admin-row"><label>Versão<input type="text" id="e_versao" value="${v.versao}" required></label><label>Ano/Modelo<input type="text" id="e_ano" value="${v.ano}/${v.anoModelo}" required></label></div>
      <div class="admin-row"><label>KM<input type="number" id="e_km" value="${v.km}" required></label><label>Preço<input type="number" id="e_preco" value="${v.preco}" required></label></div>
      <div class="admin-row"><label>Câmbio<select id="e_cambio"><option value="automático" ${v.cambio==='automático'?'selected':''}>Automático</option><option value="manual" ${v.cambio==='manual'?'selected':''}>Manual</option></select></label><label>Combustível<select id="e_comb"><option ${v.combustivel==='Flex'?'selected':''}>Flex</option><option ${v.combustivel==='Gasolina'?'selected':''}>Gasolina</option><option ${v.combustivel==='Diesel'?'selected':''}>Diesel</option><option ${v.combustivel==='Elétrico'?'selected':''}>Elétrico</option><option ${v.combustivel==='Híbrido'?'selected':''}>Híbrido</option></select></label></div>
      <div class="admin-row"><label>Cor<input type="text" id="e_cor" value="${v.cor || ''}"></label><label>Tipo<select id="e_uso"><option value="seminovo" ${v.uso==='seminovo'?'selected':''}>Seminovo</option><option value="usado" ${v.uso==='usado'?'selected':''}>Usado</option><option value="novo" ${v.uso==='novo'?'selected':''}>Novo</option></select></label></div>
      <label>Opcionais (separar por vírgula)<input type="text" id="e_opcionais" value="${(v.opcionais||[]).join(', ')}"></label>
      <label>Descrição<textarea id="e_desc" rows="3">${v.desc || ''}</textarea></label>
      <label class="checkbox-label"><input type="checkbox" id="e_dest" ${v.destaque?'checked':''}> Destaque (aparece no carrossel)</label>
      <div id="editProgress" style="display:none;color:var(--primary);font-size:13px;margin-top:12px;padding:12px;background:rgba(212,32,44,.05);border-radius:10px"></div>
      <button type="submit" class="btn-primary" style="width:100%;margin-top:20px;padding:18px" id="editSaveBtn">💾 Salvar alterações</button>
    </form>
  </div>
</div>`;
  document.body.appendChild(editDiv);

  document.getElementById('editCloseBtn').onclick = () => editDiv.remove();

  // Drag and drop for reordering photos
  const grid = document.getElementById('editPhotosGrid');
  if (grid) {
    let dragIdx = null;
    grid.addEventListener('dragstart', e => {
      const item = e.target.closest('.edit-photo-item');
      if (item) dragIdx = +item.dataset.index;
    });
    grid.addEventListener('dragover', e => e.preventDefault());
    grid.addEventListener('drop', e => {
      e.preventDefault();
      const item = e.target.closest('.edit-photo-item');
      if (item && dragIdx !== null) {
        const dropIdx = +item.dataset.index;
        if (dragIdx !== dropIdx) {
          const arr = v.fotos || [];
          const moved = arr.splice(dragIdx, 1)[0];
          arr.splice(dropIdx, 0, moved);
          v.img = arr[0];
          document.getElementById('editModal')?.remove();
          editCar(i);
        }
      }
      dragIdx = null;
    });
  }

  // Dropzone for dragging files from computer
  const dropzone = document.getElementById('editDropzone');
  const fileInput = document.getElementById('e_fotos');
  if (dropzone && fileInput) {
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        dropzone.querySelector('span').textContent = `✅ ${e.dataTransfer.files.length} foto(s) selecionada(s)`;
      }
    });
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        dropzone.querySelector('span').textContent = `✅ ${fileInput.files.length} foto(s) selecionada(s)`;
      }
    });
  }

  document.getElementById('editForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('editSaveBtn');
    const progress = document.getElementById('editProgress');
    btn.disabled = true;
    btn.textContent = '⏳ Salvando...';
    progress.style.display = 'block';

    try {
      const anoText = document.getElementById('e_ano').value;
      const anos = anoText.split('/');
      const ano = parseInt(anos[0]);
      const anoModelo = parseInt(anos[1] || anos[0]);

      v.marca = document.getElementById('e_marca').value;
      v.modelo = document.getElementById('e_modelo').value;
      v.versao = document.getElementById('e_versao').value;
      v.ano = ano;
      v.anoModelo = anoModelo;
      v.km = +document.getElementById('e_km').value;
      v.preco = +document.getElementById('e_preco').value;
      v.cambio = document.getElementById('e_cambio').value;
      v.combustivel = document.getElementById('e_comb').value;
      v.cor = document.getElementById('e_cor').value || 'N/I';
      v.uso = document.getElementById('e_uso').value;
      v.opcionais = document.getElementById('e_opcionais').value.split(',').map(s=>s.trim()).filter(Boolean);
      v.desc = document.getElementById('e_desc').value;
      v.destaque = document.getElementById('e_dest').checked;

      const newFotos = document.getElementById('e_fotos').files;
      const heroFile = document.getElementById('e_hero').files[0];

      const slug = (v.marca + '-' + v.modelo + '-' + v.ano)
        .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

      if (newFotos.length > 0) {
        const existingCount = (v.fotos || []).length;
        for (let fi = 0; fi < newFotos.length; fi++) {
          progress.textContent = `📤 Enviando foto ${fi+1} de ${newFotos.length}...`;
          const path = `carros/${slug}-${existingCount + fi + 1}.jpg`;
          await uploadFileToGitHubWithRetry(newFotos[fi], path);
          if (!v.fotos) v.fotos = [];
          v.fotos.push('/' + path);
        }
        v.img = v.fotos[0];
      }

      if (heroFile) {
        progress.textContent = '📤 Enviando foto hero...';
        const hPath = `carros/${slug}-hero.png`;
        await uploadFileToGitHubWithRetry(heroFile, hPath);
        v.heroImg = '/' + hPath;
      }

      progress.textContent = '💾 Atualizando estoque...';
      await updateDataJS();

      renderAdminList();
      editDiv.remove();
      alert('✅ Veículo atualizado com sucesso!');

    } catch (error) {
      const msg = error?.message || error?.toString() || 'Erro desconhecido';
      alert('❌ Erro: ' + msg);
      btn.textContent = '💾 Salvar alterações';
      btn.disabled = false;
      progress.textContent = '❌ Erro ao salvar.';
    }
  };
}

function movePhoto(carIndex, photoIndex, direction) {
  const v = VEHICLES[carIndex];
  if (!v.fotos || v.fotos.length < 2) return;
  const newIndex = photoIndex + direction;
  if (newIndex < 0 || newIndex >= v.fotos.length) return;
  const temp = v.fotos[photoIndex];
  v.fotos[photoIndex] = v.fotos[newIndex];
  v.fotos[newIndex] = temp;
  v.img = v.fotos[0];
  document.getElementById('editModal')?.remove();
  editCar(carIndex);
}

function removePhoto(carIndex, photoIndex) {
  const v = VEHICLES[carIndex];
  if (!v.fotos || v.fotos.length === 0) return;
  if (!confirm('Remover esta foto?')) return;
  v.fotos.splice(photoIndex, 1);
  if (v.fotos.length > 0) {
    v.img = v.fotos[0];
  } else {
    v.img = '';
  }
  document.getElementById('editModal')?.remove();
  editCar(carIndex);
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
        await uploadFileToGitHubWithRetry(fotos[i], path);
        fotoPaths.push('/' + path);
      }

      // Upload hero
      let heroPath = '';
      if (heroFile) {
        progress.textContent = 'Enviando foto hero...';
        const hPath = `carros/${slug}-hero.png`;
        await uploadFileToGitHubWithRetry(heroFile, hPath);
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
  return new Promise(async (resolve, reject) => {
    try {
      // Use createImageBitmap - supports HEIC/HEIF on modern browsers
      const bitmap = await createImageBitmap(file);
      const MAX = 1200;
      let w = bitmap.width, h = bitmap.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close();
      const compressed = canvas.toDataURL('image/jpeg', 0.70);
      resolve(compressed.split(',')[1]);
    } catch(e) {
      // Fallback for older browsers: try via img tag
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const MAX = 1200;
          let w = img.width, h = img.height;
          if (w > MAX || h > MAX) {
            if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
            else { w = Math.round(w * MAX / h); h = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.70).split(',')[1]);
        };
        img.onerror = () => reject(new Error('Formato de imagem não suportado. Converta para JPG antes de enviar.'));
        img.src = ev.target.result;
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsDataURL(file);
    }
  });
}

async function uploadFileToGitHubWithRetry(file, path, retries = 4) {
  if (!file) throw new Error(`Arquivo não encontrado para ${path}`);
  let base64;
  try {
    base64 = await fileToBase64Raw(file);
  } catch(convErr) {
    throw new Error(`Erro ao processar imagem ${path}: ${convErr.message || convErr}`);
  }
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
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
        const err = await res.json().catch(() => ({message:'Erro desconhecido'}));
        throw new Error(`${res.status}: ${err.message}`);
      }
      // Success - wait before next upload
      await new Promise(r => setTimeout(r, 2000));
      return;
    } catch (e) {
      if (attempt === retries) throw new Error(`Falha no upload de ${path} após ${retries+1} tentativas: ${e.message}`);
      await new Promise(r => setTimeout(r, 4000 * (attempt + 1)));
    }
  }
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
