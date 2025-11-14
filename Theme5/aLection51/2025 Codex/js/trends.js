const DATA_URL = './sample.json';
const chartCanvas = document.querySelector('#trendChart');
const summaryList = document.querySelector('#trend-summary');
const rangeSelect = document.querySelector('#range-select');
const seriesCheckboxes = document.querySelectorAll('.toggles input[type="checkbox"]');

let chartInstance;
let allTrends = [];
const seriesVisibility = {
  uav: true,
  artillery: true,
  sorties: true,
};

async function initTrends() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error('Не вдалося отримати тренди');
    const data = await response.json();
    allTrends = data.dailyTrends ?? [];
    setupControls();
    updateViews();
  } catch (error) {
    console.error(error);
    if (summaryList) summaryList.innerHTML = '<li>Помилка завантаження даних.</li>';
  }
}

function setupControls() {
  rangeSelect?.addEventListener('change', updateViews);
  seriesCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      const key = event.target.dataset.series;
      seriesVisibility[key] = event.target.checked;
      updateViews();
    });
  });
}

function updateViews() {
  const filtered = getFilteredTrends();
  renderChart(filtered);
  renderSummary(filtered);
}

function getFilteredTrends() {
  if (!rangeSelect) return allTrends;
  const value = rangeSelect.value;
  if (value === 'all') return allTrends;
  const days = Number(value);
  return allTrends.slice(-days);
}

function renderChart(trends) {
  if (!chartCanvas || !trends.length) return;
  const labels = trends.map((t) => t.date);
  const datasets = [];

  if (seriesVisibility.uav) {
    const dataset = buildNormalizedDataset(trends, 'uav', 'UAV', '#81a04f', 'rgba(129, 160, 79, 0.15)');
    if (dataset) datasets.push(dataset);
  }

  if (seriesVisibility.artillery) {
    const dataset = buildNormalizedDataset(
      trends,
      'artillery',
      'Артилерія',
      '#c9a635',
      'rgba(201, 166, 53, 0.2)'
    );
    if (dataset) datasets.push(dataset);
  }

  if (seriesVisibility.sorties) {
    const dataset = buildNormalizedDataset(
      trends,
      'sorties',
      'Sorties',
      '#a5423f',
      'rgba(165, 66, 63, 0.2)'
    );
    if (dataset) datasets.push(dataset);
  }

  const placeholder = chartCanvas.parentElement.querySelector('.chart-placeholder');
  const noData = datasets.length === 0;
  if (noData) {
    if (!placeholder) {
      const note = document.createElement('p');
      note.className = 'chart-placeholder muted';
      note.textContent = 'Увімкніть принаймні одну серію для відображення.';
      chartCanvas.parentElement.appendChild(note);
    }
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }
  placeholder?.remove();

  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(chartCanvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#f0f0e8',
          },
        },
        tooltip: {
          backgroundColor: '#2a3619',
          callbacks: {
            label: (ctx) => {
              const raw = ctx.dataset.metaRaw?.[ctx.dataIndex] ?? ctx.parsed.y;
              return `${ctx.dataset.label}: ${raw} (${ctx.formattedValue}%)`;
            },
          },
        },
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          ticks: { color: '#c7d3a9' },
          grid: { color: 'rgba(255,255,255,0.05)' },
        },
        y: {
          ticks: { color: '#c7d3a9' },
          grid: { color: 'rgba(255,255,255,0.05)' },
          suggestedMin: 0,
          suggestedMax: 100,
          title: {
            display: true,
            text: 'Нормалізована інтенсивність (%)',
            color: '#c7d3a9',
          },
        },
      },
    },
  });
}

function buildNormalizedDataset(trends, key, label, borderColor, backgroundColor) {
  const raw = trends.map((t) => Number(t[key] ?? 0));
  const max = Math.max(...raw, 0);
  if (max <= 0) return null;
  const normalized = raw.map((value) => (value / max) * 100);
  return {
    label,
    data: normalized,
    borderColor,
    backgroundColor,
    tension: 0.25,
    metaRaw: raw,
  };
}

function renderSummary(trends) {
  if (!summaryList || !trends.length) return;
  const recent = trends.slice(-5).reverse();
  summaryList.innerHTML = recent
    .map((entry) => {
      const peak = Math.max(entry.uav ?? 0, entry.artillery ?? 0, entry.sorties ?? 0);
      const dominant =
        peak === entry.uav ? 'UAV' : peak === entry.artillery ? 'Арта' : 'Sorties';
      return `<li><strong>${entry.date}</strong> — UAV: ${entry.uav}, Арта: ${entry.artillery}, Sorties: ${entry.sorties} • Домінує: ${dominant}</li>`;
    })
    .join('');
}

initTrends();
