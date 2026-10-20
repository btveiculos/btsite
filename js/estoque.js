// ===== PÁGINA DE ESTOQUE =====
// Usa as funções de comum.js (card, detalhes do veículo, WhatsApp).

document.getElementById('totalCount').textContent = STOCK.length;

// ===== FILTROS =====
const grid = document.getElementById('estoqueGrid');
const resultsCount = document.getElementById('resultsCount');
const searchInput = document.getElementById('searchInput');
const filterMarca = document.getElementById('filterMarca');
const filterCambio = document.getElementById('filterCambio');
const filterPreco = document.getElementById('filterPreco');
const filterOrder = document.getElementById('filterOrder');
const clearBtn = document.getElementById('clearFiltersBtn');
const filtros = [searchInput, filterMarca, filterCambio, filterPreco, filterOrder];

// Marcas a partir do estoque real
[...new Set(STOCK.map(v => v.marca).filter(Boolean))].sort().forEach(m => {
  const o = document.createElement('option');
  o.value = m;
  o.textContent = m;
  filterMarca.appendChild(o);
});

function applyFilters() {
  clearBtn.hidden = !filtros.some(el => el.value);
  const busca = searchInput.value.toLowerCase().trim();
  let list = [...STOCK];

  if (busca) list = list.filter(v => `${v.marca} ${v.modelo} ${v.versao}`.toLowerCase().includes(busca));
  if (filterMarca.value) list = list.filter(v => v.marca === filterMarca.value);
  if (filterCambio.value) list = list.filter(v => v.cambio === filterCambio.value);
  if (filterPreco.value) list = list.filter(v => v.preco <= parseInt(filterPreco.value, 10));

  const ordem = filterOrder.value;
  if (ordem === 'menor') list.sort((a, b) => a.preco - b.preco);
  if (ordem === 'maior') list.sort((a, b) => b.preco - a.preco);
  if (ordem === 'km') list.sort((a, b) => a.km - b.km);
  if (ordem === 'ano') list.sort((a, b) => b.ano - a.ano);

  render(list);
}

function render(list) {
  grid.innerHTML = '';
  resultsCount.innerHTML = `<strong>${list.length}</strong> ${list.length === 1 ? 'veículo' : 'veículos'}`;

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state">
      <p>${STOCK.length ? 'Nenhum veículo encontrado com esses filtros.' : 'Estoque sendo atualizado. Fale com a gente no WhatsApp para saber o que está disponível.'}</p>
      ${STOCK.length ? '<button class="btn-outline" id="emptyClearBtn">Limpar filtros</button>' : ''}
    </div>`;
    const b = document.getElementById('emptyClearBtn');
    if (b) b.onclick = clearFilters;
    return;
  }
  list.forEach(v => grid.appendChild(carCard(v)));
}

function clearFilters() {
  filtros.forEach(el => { el.value = ''; });
  applyFilters();
}

clearBtn.onclick = clearFilters;
searchInput.addEventListener('input', applyFilters);
[filterMarca, filterCambio, filterPreco, filterOrder].forEach(s => s.addEventListener('change', applyFilters));

// Busca rápida da página inicial chega como ?marca=...&preco=...
const params = new URLSearchParams(location.search);
if (params.get('marca')) filterMarca.value = params.get('marca');
if (params.get('preco')) filterPreco.value = params.get('preco');

applyFilters();
