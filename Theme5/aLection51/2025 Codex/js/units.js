const DATA_URL = './sample.json';
let allUnits = [];

const typeSelect = document.querySelector('#filter-type');
const statusSelect = document.querySelector('#filter-status');
const grid = document.querySelector('#units-grid');

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error('Помилка завантаження JSON');
    const data = await response.json();
    allUnits = data.geo?.units ?? [];
    populateFilters();
    renderUnits();
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<p class="muted">Не вдалося завантажити дані.</p>';
  }
}

function populateFilters() {
  const types = Array.from(new Set(allUnits.map((u) => u.type))).sort();
  const statuses = Array.from(new Set(allUnits.map((u) => u.status))).sort();

  types.forEach((type) => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type.replace(/_/g, ' ');
    typeSelect.appendChild(option);
  });

  statuses.forEach((status) => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    statusSelect.appendChild(option);
  });

  typeSelect.addEventListener('change', renderUnits);
  statusSelect.addEventListener('change', renderUnits);
}

function renderUnits() {
  if (!grid) return;
  const typeFilter = typeSelect.value;
  const statusFilter = statusSelect.value;

  const filtered = allUnits.filter((unit) => {
    const typeMatch = typeFilter === 'all' || unit.type === typeFilter;
    const statusMatch = statusFilter === 'all' || unit.status === statusFilter;
    return typeMatch && statusMatch;
  });

  if (!filtered.length) {
    grid.innerHTML = '<p class="muted">Підрозділи не знайдено.</p>';
    return;
  }

  grid.innerHTML = filtered
    .map((unit) => createUnitCard(unit))
    .join('');
}

function createUnitCard(unit) {
  const equipment = Array.isArray(unit.equipment) ? unit.equipment.join(', ') : '—';
  return `
    <article class="unit-card">
      <h3>${unit.name}</h3>
      <div>
        <span class="badge type">${unit.type}</span>
        <span class="badge status">${unit.status}</span>
      </div>
      <p>Координати: <strong>${unit.lat}, ${unit.lon}</strong></p>
      <p>Чисельність: <strong>${unit.strength ?? '—'}</strong></p>
      <p>Останній контакт: <strong>${unit.last_seen ?? '—'}</strong></p>
      <p>Обладнання: <span class="muted">${equipment}</span></p>
      <p class="muted">${unit.notes ?? ''}</p>
    </article>
  `;
}

init();
