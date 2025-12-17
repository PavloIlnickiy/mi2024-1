const metricLabels = {
  enemy_fire_intensity: 'Інтенсивність обстрілів',
  counter_battery_effectiveness: 'Контрбатарейна ефективність',
  breakthrough_risk_index: 'Ризик прориву',
  kill_chain_time: 'Kill-chain (хв)',
  uav_recon_coverage: 'Розвідка БпЛА',
  ew_effectiveness_against_uav: 'РЕБ проти БпЛА',
  air_defence_intercept_rate: 'Перехоплення ППО',
  ammo_expenditure_vs_norm: 'Боєкомплект / норма',
  logistics_timely_deliveries: 'Логістика вчасно',
  medevac_time: 'Медевак (хв)',
  combat_readiness_index: 'Боєготовність',
  hq_response_time: 'Час реакції HQ (хв)',
  forecast_accuracy: 'Точність прогнозу',
  reserve_movement_tempo: 'Рух резервів'
};

let metricMap = {};
let sectors = [];
let brigades = [];
let selectedSector = 'all';
let charts = {};

fetch('../data.json')
  .then(res => res.json())
  .then(data => initDashboard(data))
  .catch(err => {
    console.error('Не вдалося завантажити дані', err);
    document.getElementById('directionTitle').textContent = 'Помилка завантаження даних';
  });

function initDashboard(data) {
  metricMap = data.metrics.reduce((acc, m) => ({ ...acc, [m.id]: m }), {});
  sectors = data.sectors || [];
  brigades = data.brigades || [];

  paintMeta(data.meta);
  buildSectorSelect();
  renderKeyMetrics();
  renderSectors();
  renderAlerts();
  buildCharts();
}

function paintMeta(meta) {
  const direction = hasReadableLetters(meta.direction_name)
    ? meta.direction_name
    : 'Оперативний напрямок «Степ»';
  const week = `${formatDate(meta.week_start)} — ${formatDate(meta.week_end)}`;

  document.getElementById('directionTitle').textContent = direction;
  document.getElementById('weekRange').textContent = week;
  document.getElementById('sectorCount').textContent = `${meta.classifier?.sectors_count || sectors.length} секторів`;
  document.getElementById('brigadeCount').textContent = `${meta.classifier?.brigades_count || brigades.length} бригад`;
  document.getElementById('noteChip').textContent = 'Нотатка штабу';
  document.getElementById('noteText').textContent = meta.note || 'Без приміток';
}

function hasReadableLetters(text = '') {
  return /[A-Za-zА-Яа-яЇїЄєҐґІі]/.test(text);
}

function formatDate(str) {
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str;
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
}

function buildSectorSelect() {
  const select = document.getElementById('sectorSelect');
  select.innerHTML = '';
  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = 'Усі сектори';
  select.appendChild(allOpt);
  sectors.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => {
    selectedSector = select.value;
    renderSectors();
    renderAlerts();
    updateCharts();
  });
}

function renderKeyMetrics() {
  const host = document.getElementById('keyMetrics');
  host.innerHTML = '';
  const cards = [
    {
      id: 'enemy_fire_intensity',
      label: 'Інтенсивність',
      mode: 'sum',
      suffix: ' уд.',
      invert: false
    },
    {
      id: 'kill_chain_time',
      label: 'Kill-chain',
      mode: 'avg',
      suffix: ' хв',
      invert: true
    },
    {
      id: 'air_defence_intercept_rate',
      label: 'Перехоплення ППО',
      mode: 'avg',
      percent: true
    },
    {
      id: 'medevac_time',
      label: 'Медевак',
      mode: 'avg',
      suffix: ' хв',
      invert: true
    }
  ];

  cards.forEach(cfg => {
    const { current, prev } = aggregateMetric(cfg.id, cfg.mode);
    const delta = deltaBadge(current, prev, cfg.invert);
    const value = cfg.percent ? `${Math.round(current * 100)}%` : `${current.toFixed(1)}${cfg.suffix || ''}`;
    const card = document.createElement('div');
    card.className = 'metric';
    card.innerHTML = `
      <div class="label">${cfg.label}</div>
      <div class="value">${value} <span class="badge ${delta.cls}">${delta.icon} ${delta.text}</span></div>
      <div class="muted">Минулого тижня: ${cfg.percent ? `${Math.round(prev * 100)}%` : `${prev.toFixed(1)}${cfg.suffix || ''}`}</div>
    `;
    host.appendChild(card);
  });
}

function aggregateMetric(metricId, mode = 'avg') {
  const metric = metricMap[metricId];
  if (!metric) return { current: 0, prev: 0 };
  const vals = metric.values || [];
  const currentSum = vals.reduce((acc, v) => acc + (v.current_week || 0), 0);
  const prevSum = vals.reduce((acc, v) => acc + (v.prev_week || 0), 0);
  const divisor = mode === 'sum' ? 1 : Math.max(vals.length, 1);
  return {
    current: currentSum / divisor,
    prev: prevSum / divisor
  };
}

function renderSectors() {
  const host = document.getElementById('sectorCards');
  host.innerHTML = '';
  const intensityMetric = metricMap.enemy_fire_intensity;
  const riskMetric = metricMap.breakthrough_risk_index;
  const medevacMetric = metricMap.medevac_time;
  const maxIntensity = Math.max(...(intensityMetric?.values || []).map(v => v.current_week || 0), 1);

  const list = sectors.filter(s => selectedSector === 'all' || s.id === selectedSector);
  list.forEach(s => {
    const intensity = findValue('enemy_fire_intensity', 'sector_id', s.id);
    const prevIntensity = findValue('enemy_fire_intensity', 'sector_id', s.id, 'prev_week');
    const risk = findValue('breakthrough_risk_index', 'sector_id', s.id);
    const medevac = findValue('medevac_time', 'sector_id', s.id);
    const medevacPrev = findValue('medevac_time', 'sector_id', s.id, 'prev_week');
    const riskBadge = risk > 0.65 ? 'bad' : risk > 0.5 ? 'warn' : 'good';
    const delta = deltaBadge(intensity, prevIntensity);
    const card = document.createElement('div');
    card.className = `sector-card ${selectedSector === s.id ? 'active' : ''}`;
    card.innerHTML = `
      <div class="sector-head">
        <div>
          <div class="label">${s.name}</div>
          <div class="muted">${metricLabels.enemy_fire_intensity}</div>
        </div>
        <span class="badge ${riskBadge}">${Math.round(risk * 100)}%</span>
      </div>
      <div class="bar">
        <div class="bar-fill" style="width:${(intensity / maxIntensity) * 100}%"></div>
        <div class="bar-prev" style="left:${(prevIntensity / maxIntensity) * 100}%"></div>
      </div>
      <div class="stat-row">
        <span>Поточний: ${intensity}</span>
        <span>Минулого: ${prevIntensity}</span>
      </div>
      <div class="stat-row">
        <span>Медевак: ${medevac} хв</span>
        <span class="badge ${delta.cls}">${delta.icon} ${delta.text}</span>
      </div>
      <div class="muted">Тренд медеваку: ${trendText(medevac, medevacPrev, true)}</div>
    `;
    host.appendChild(card);
  });
}

function trendText(current, prev, invert = false) {
  const diff = current - prev;
  if (!Number.isFinite(diff) || prev === 0) return 'немає даних';
  const dir = diff > 0 ? 'зросло' : diff < 0 ? 'знизилось' : 'без змін';
  const good = invert ? diff < 0 : diff > 0;
  return `${dir} (${Math.abs(diff).toFixed(1)}), ${good ? 'краще' : 'гірше'}`;
}

function renderAlerts() {
  const host = document.getElementById('alerts');
  host.innerHTML = '';
  const riskMetric = metricMap.breakthrough_risk_index;
  if (!riskMetric) return;
  const entries = riskMetric.values
    .map(v => ({
      sectorId: v.sector_id,
      value: v.current_week,
      prev: v.prev_week
    }))
    .filter(Boolean)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  entries.forEach(entry => {
    const sectorName = sectors.find(s => s.id === entry.sectorId)?.name || entry.sectorId;
    const delta = deltaBadge(entry.value, entry.prev);
    const card = document.createElement('div');
    card.className = 'alert';
    card.innerHTML = `
      <div>
        <div class="label">${sectorName}</div>
        <div class="meta">Ризик прориву: ${(entry.value * 100).toFixed(0)}%</div>
      </div>
        <span class="badge pill ${delta.cls}">${delta.icon} ${delta.text}</span>
    `;
    host.appendChild(card);
  });
}

function renderBrigades() {
  const tbody = document.querySelector('#brigadeTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const ammoMetric = metricMap.ammo_expenditure_vs_norm;
  const readinessMetric = metricMap.combat_readiness_index;
  const bySector = selectedSector === 'all' ? brigades : brigades.filter(b => b.sector_id === selectedSector);

  bySector.forEach(br => {
    const ammo = findValue('ammo_expenditure_vs_norm', 'brigade_id', br.id);
    const ammoPrev = findValue('ammo_expenditure_vs_norm', 'brigade_id', br.id, 'prev_week');
    const readiness = findValue('combat_readiness_index', 'brigade_id', br.id);
    const readinessPrev = findValue('combat_readiness_index', 'brigade_id', br.id, 'prev_week');
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${br.name}</td>
      <td class="muted">${sectors.find(s => s.id === br.sector_id)?.name || '-'}</td>
      <td>
        <div class="progress"><div style="width:${Math.min(ammo * 100, 140)}%;"></div></div>
        <div class="muted">${(ammo * 100).toFixed(0)}% норми</div>
      </td>
      <td>
        <div class="progress"><div style="width:${readiness * 100}%;"></div></div>
        <div class="muted">${(readiness * 100).toFixed(0)}%</div>
      </td>
      <td class="delta">${deltaBadge(readiness, readinessPrev).icon} ${deltaBadge(readiness, readinessPrev).text}</td>
    `;
    tbody.appendChild(row);
  });
}

function findValue(metricId, key, id, field = 'current_week') {
  const metric = metricMap[metricId];
  if (!metric) return 0;
  const entry = metric.values.find(v => v[key] === id);
  return entry ? entry[field] || 0 : 0;
}

function deltaBadge(current, prev, invert = false) {
  if (prev === 0 || !Number.isFinite(prev)) return { text: 'нова', cls: 'warn', icon: '•' };
  const diff = current - prev;
  const pct = prev !== 0 ? Math.round((diff / prev) * 100) : 0;
  const rising = diff > 0;
  const good = invert ? !rising : rising;
  const cls = good ? 'good' : 'bad';
  const icon = rising ? '▲' : diff < 0 ? '▼' : '•';
  return { text: `${Math.abs(pct)}%`, cls, icon };
}

function buildCharts() {
  const fireCtx = document.getElementById('fireChart');
  const timeCtx = document.getElementById('timeChart');
  const accCtx = document.getElementById('accuracyChart');

  charts.fire = new Chart(fireCtx, fireChartConfig());
  charts.time = new Chart(timeCtx, timeChartConfig());
  charts.acc = new Chart(accCtx, accuracyChartConfig());
}

function updateCharts() {
  charts.fire.data = fireChartConfig().data;
  charts.fire.update();
  charts.time.data = timeChartConfig().data;
  charts.time.update();
  charts.acc.data = accuracyChartConfig().data;
  charts.acc.update();
}

function fireChartConfig() {
  const list = sectors.filter(s => selectedSector === 'all' || s.id === selectedSector);
  const labels = list.map(s => s.name);
  const current = list.map(s => findValue('enemy_fire_intensity', 'sector_id', s.id));
  const prev = list.map(s => findValue('enemy_fire_intensity', 'sector_id', s.id, 'prev_week'));
  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Поточний тиждень',
          data: current,
          backgroundColor: 'rgba(192, 90, 43, 0.7)',
          borderRadius: 8,
          maxBarThickness: 36
        },
        {
          label: 'Минулий тиждень',
          data: prev,
          backgroundColor: 'rgba(141, 166, 115, 0.7)',
          borderRadius: 8,
          maxBarThickness: 36
        }
      ]
    },
    options: chartCommonOptions('удари / тиждень')
  };
}

function timeChartConfig() {
  const list = sectors.filter(s => selectedSector === 'all' || s.id === selectedSector);
  const labels = list.map(s => s.name);
  return {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Kill-chain (хв)',
          data: list.map(s => findValue('kill_chain_time', 'sector_id', s.id)),
          borderColor: '#c05a2b',
          backgroundColor: 'rgba(192, 90, 43, 0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 4
        },
        {
          label: 'Медевак (хв)',
          data: list.map(s => findValue('medevac_time', 'sector_id', s.id)),
          borderColor: '#556b2f',
          backgroundColor: 'rgba(85, 107, 47, 0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 4
        }
      ]
    },
    options: chartCommonOptions('хвилини', true)
  };
}

function accuracyChartConfig() {
  const list = sectors.filter(s => selectedSector === 'all' || s.id === selectedSector);
  const labels = list.map(s => s.name);
  return {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Перехоплення ППО',
          data: list.map(s => findValue('air_defence_intercept_rate', 'sector_id', s.id) * 100),
          borderColor: '#8da673',
          backgroundColor: 'rgba(141, 166, 115, 0.14)',
          tension: 0.3,
          pointRadius: 4,
          fill: true
        },
        {
          label: 'Точність прогнозу',
          data: list.map(s => findValue('forecast_accuracy', 'sector_id', s.id) * 100),
          borderColor: '#c05a2b',
          backgroundColor: 'rgba(192, 90, 43, 0.14)',
          tension: 0.3,
          pointRadius: 4,
          fill: true
        }
      ]
    },
    options: chartCommonOptions('%')
  };
}

function chartCommonOptions(label, suggestedMinZero = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Manrope' } } },
      tooltip: {
        backgroundColor: '#1f1f1a',
        titleColor: '#f5f2ea',
        bodyColor: '#f5f2ea',
        padding: 10,
        cornerRadius: 8
      }
    },
    scales: {
      y: {
        beginAtZero: suggestedMinZero,
        ticks: {
          font: { family: 'Manrope' },
          callback: value => `${value} ${label}`
        },
        grid: { color: 'rgba(33,33,33,0.08)' }
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Manrope' } }
      }
    }
  };
}
