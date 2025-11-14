const DATA_URL = './sample.json';

const numberFormatter = new Intl.NumberFormat('uk-UA');

async function loadDashboard() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error('Не вдалося отримати дані');
    const data = await response.json();
    renderIndicators(data.enemyStrength);
  } catch (error) {
    console.error(error);
    document.querySelectorAll('.indicator .value').forEach((node) => {
      node.textContent = 'N/A';
    });
  }
}

function renderIndicators(strength) {
  if (!strength) return;
  const indicators = [
    { id: 'indicator-personnel', value: strength.personnel_total },
    { id: 'indicator-tanks', value: strength.equipment?.tanks },
    { id: 'indicator-artillery', value: strength.equipment?.artillery },
  ];

  indicators.forEach(({ id, value }) => {
    const el = document.querySelector(`#${id} .value`);
    if (!el) return;
    el.textContent = typeof value === 'number' ? numberFormatter.format(value) : '—';
  });
}

loadDashboard();
