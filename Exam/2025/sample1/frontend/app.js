const API = "http://127.0.0.1:8000";

let state = {
  page: 1,
  pageSize: 25,
  totalPages: 1,
  lastItems: [],
};

const els = {
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  errorBox: document.getElementById("errorBox"),

  date_from: document.getElementById("date_from"),
  date_to: document.getElementById("date_to"),
  sector: document.getElementById("sector"),
  direction: document.getElementById("direction"),
  source_type: document.getElementById("source_type"),
  min_intensity: document.getElementById("min_intensity"),
  bucket: document.getElementById("bucket"),

  applyBtn: document.getElementById("applyBtn"),
  resetBtn: document.getElementById("resetBtn"),

  kpiTotal: document.getElementById("kpiTotal"),
  kpiRounds: document.getElementById("kpiRounds"),
  kpiAvg: document.getElementById("kpiAvg"),
  kpiTopDir: document.getElementById("kpiTopDir"),

  trendChart: document.getElementById("trendChart"),
  anomalyBox: document.getElementById("anomalyBox"),

  bySourceChart: document.getElementById("bySourceChart"),
  byDirChart: document.getElementById("byDirChart"),

  heatmap: document.getElementById("heatmap"),
  topSectors: document.getElementById("topSectors"),

  rows: document.getElementById("rows"),
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  pageNum: document.getElementById("pageNum"),
  pageTotal: document.getElementById("pageTotal"),
  pageSize: document.getElementById("pageSize"),

  modal: document.getElementById("modal"),
  closeModal: document.getElementById("closeModal"),
  modalBody: document.getElementById("modalBody"),
};

function setStatus(mode, text) {
  els.statusDot.className = "dot " + mode;
  els.statusText.textContent = text;
}

function showError(msg) {
  els.errorBox.textContent = msg;
  els.errorBox.classList.remove("hidden");
  setStatus("err", "помилка");
}

function clearError() {
  els.errorBox.classList.add("hidden");
  els.errorBox.textContent = "";
}

function qs(params) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    u.set(k, v);
  }
  return u.toString();
}

function getFilters() {
  const minI = els.min_intensity.value ? Number(els.min_intensity.value) : null;
  return {
    date_from: els.date_from.value || null,
    date_to: els.date_to.value || null,
    sector: (els.sector.value || "").trim() || null,
    direction: els.direction.value || null,
    source_type: els.source_type.value || null,
    min_intensity: Number.isFinite(minI) ? minI : null,
  };
}

async function apiGet(path, params) {
  const url = `${API}${path}?${qs(params || {})}`;
  const res = await fetch(url);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    const detail = (data && (data.detail || data.message)) ? (data.detail || data.message) : text;
    throw new Error(`${res.status} ${res.statusText}: ${detail}`);
  }
  return data;
}

// ----------- SVG charts (minimal) -----------
function renderBarChart(container, items, opts = {}) {
  // items: [{key,label,count}] or [{key,count}]
  container.innerHTML = "";
  if (!items || items.length === 0) {
    container.innerHTML = `<div class="muted">Немає даних</div>`;
    return;
  }

  const width = 900;
  const barH = 18;
  const gap = 8;
  const pad = 10;
  const labelW = 110;
  const valueW = 60;

  const max = Math.max(...items.map(x => x.count));
  const h = pad*2 + items.length * (barH + gap);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${h}`);
  svg.style.width = "100%";
  svg.style.height = "auto";

  items.forEach((it, i) => {
    const y = pad + i * (barH + gap);
    const w = max ? Math.round((width - pad*2 - labelW - valueW) * (it.count / max)) : 0;

    const label = document.createElementNS(svg.namespaceURI, "text");
    label.setAttribute("x", pad);
    label.setAttribute("y", y + barH - 4);
    label.setAttribute("fill", "#cbd2e6");
    label.setAttribute("font-size", "11");
    label.textContent = it.key;
    svg.appendChild(label);

    const rect = document.createElementNS(svg.namespaceURI, "rect");
    rect.setAttribute("x", pad + labelW);
    rect.setAttribute("y", y);
    rect.setAttribute("width", w);
    rect.setAttribute("height", barH);
    rect.setAttribute("rx", 6);
    rect.setAttribute("fill", "#2d6cdf");
    svg.appendChild(rect);

    const val = document.createElementNS(svg.namespaceURI, "text");
    val.setAttribute("x", pad + labelW + w + 8);
    val.setAttribute("y", y + barH - 4);
    val.setAttribute("fill", "#e7e9ee");
    val.setAttribute("font-size", "11");
    val.textContent = String(it.count);
    svg.appendChild(val);
  });

  container.appendChild(svg);
}

function renderTrend(container, series) {
  container.innerHTML = "";
  if (!series || series.length === 0) {
    container.innerHTML = `<div class="muted">Немає даних</div>`;
    return;
  }

  const width = 900, height = 260, pad = 30;
  const xs = series.map(s => new Date(s.period_start).getTime());
  const ys = series.map(s => s.count);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const maxY = Math.max(...ys, 1);

  const xScale = (t) => pad + (width - pad*2) * ((t - minX) / (maxX - minX || 1));
  const yScale = (v) => height - pad - (height - pad*2) * (v / maxY);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.width = "100%";

  // axis
  const axis = document.createElementNS(svg.namespaceURI, "line");
  axis.setAttribute("x1", pad); axis.setAttribute("y1", height - pad);
  axis.setAttribute("x2", width - pad); axis.setAttribute("y2", height - pad);
  axis.setAttribute("stroke", "#2a3140");
  svg.appendChild(axis);

  // polyline
  const pts = series.map(s => `${xScale(new Date(s.period_start).getTime())},${yScale(s.count)}`).join(" ");
  const pl = document.createElementNS(svg.namespaceURI, "polyline");
  pl.setAttribute("points", pts);
  pl.setAttribute("fill", "none");
  pl.setAttribute("stroke", "#2d6cdf");
  pl.setAttribute("stroke-width", "2");
  svg.appendChild(pl);

  // points
  series.forEach(s => {
    const cx = xScale(new Date(s.period_start).getTime());
    const cy = yScale(s.count);
    const c = document.createElementNS(svg.namespaceURI, "circle");
    c.setAttribute("cx", cx); c.setAttribute("cy", cy);
    c.setAttribute("r", 3);
    c.setAttribute("fill", "#e7e9ee");
    svg.appendChild(c);
  });

  container.appendChild(svg);
}

// ----------- Analytics: anomaly (> mean + 2σ) -----------
function computeAnomalies(series) {
  const vals = series.map(s => s.count);
  const n = vals.length;
  if (n < 2) return { threshold: null, anomalies: [] };

  const mean = vals.reduce((a,b)=>a+b,0) / n;
  const variance = vals.reduce((a,b)=>a+(b-mean)*(b-mean),0) / (n-1);
  const sd = Math.sqrt(variance);
  const threshold = mean + 2*sd;

  const anomalies = series.filter(s => s.count > threshold).map(s => ({
    period_start: s.period_start,
    count: s.count
  }));

  return { threshold, anomalies, mean, sd };
}

// ----------- Heatmap table -----------
function renderHeatmap(container, cells, bucket) {
  container.innerHTML = "";
  if (!cells || cells.length === 0) {
    container.innerHTML = `<div class="muted">Немає даних</div>`;
    return;
  }

  // Build unique sorted periods and sectors
  const periods = [...new Set(cells.map(c => new Date(c.period_start).toISOString()))]
    .sort();
  const sectors = [...new Set(cells.map(c => c.sector_code))].sort();

  // value map
  const map = new Map();
  let max = 1;
  for (const c of cells) {
    const p = new Date(c.period_start).toISOString();
    const key = `${c.sector_code}__${p}`;
    map.set(key, c.count);
    if (c.count > max) max = c.count;
  }

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const trh = document.createElement("tr");
  const th0 = document.createElement("th");
  th0.textContent = "sector \\ " + bucket;
  trh.appendChild(th0);

  // limit columns if huge
  const periodsLimited = periods.slice(-12); // останні 12 періодів для читабельності
  periodsLimited.forEach(p => {
    const th = document.createElement("th");
    th.textContent = p.slice(0,10); // YYYY-MM-DD
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  sectors.slice(0, 30).forEach(sec => { // обмежимо 30 секторів (мінімально)
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = sec;
    tr.appendChild(th);

    periodsLimited.forEach(p => {
      const td = document.createElement("td");
      const v = map.get(`${sec}__${p}`) || 0;
      // просте затемнення: чим більше v, тим світліше
      const a = v / max; // 0..1
      td.style.background = `rgba(45,108,223,${0.12 + a*0.55})`;
      td.style.borderColor = "#22262e";
      td.textContent = v ? String(v) : "";
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);

  const note = document.createElement("div");
  note.className = "muted note";
  note.textContent = "Показано: останні 12 періодів і до 30 секторів (щоб не перевантажувати сторінку).";
  container.appendChild(note);
}

// ----------- Table + modal -----------
function renderRows(items) {
  els.rows.innerHTML = "";
  if (!items || items.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="8" class="muted">Немає записів</td>`;
    els.rows.appendChild(tr);
    return;
  }

  items.forEach(it => {
    const tr = document.createElement("tr");
    const dt = new Date(it.event_time);
    tr.innerHTML = `
      <td>${it.id}</td>
      <td>${dt.toISOString().replace("T"," ").slice(0,19)}</td>
      <td>${it.sector_code}</td>
      <td>${it.direction}</td>
      <td>${it.source_type}</td>
      <td>${it.intensity}</td>
      <td>${it.rounds_est}</td>
      <td><button class="ghost" data-id="${it.id}">деталі</button></td>
    `;
    els.rows.appendChild(tr);
  });

  els.rows.querySelectorAll("button[data-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-id"));
      const item = state.lastItems.find(x => x.id === id);
      els.modalBody.textContent = JSON.stringify(item, null, 2);
      els.modal.classList.remove("hidden");
    });
  });
}

// ----------- Top sectors (from heatmap cells) -----------
function renderTopSectors(cells) {
  els.topSectors.innerHTML = "";
  if (!cells || cells.length === 0) return;

  const by = new Map();
  for (const c of cells) {
    by.set(c.sector_code, (by.get(c.sector_code) || 0) + c.count);
  }
  const top = [...by.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
  top.forEach(([sec, cnt]) => {
    const li = document.createElement("li");
    li.textContent = `${sec} — ${cnt}`;
    els.topSectors.appendChild(li);
  });
}

// ----------- Main load pipeline -----------
async function loadAll() {
  clearError();
  setStatus("loading", "завантаження…");

  const f = getFilters();
  const bucket = els.bucket.value;

  try {
    // 1) KPI summary
    const summary = await apiGet("/api/metrics/summary", f);
    els.kpiTotal.textContent = summary.total_incidents ?? "—";
    els.kpiRounds.textContent = summary.total_rounds_est ?? "—";
    els.kpiAvg.textContent = (summary.avg_intensity ?? 0).toFixed(2);
    els.kpiTopDir.textContent = summary.top_direction ?? "—";

    // 2) trend
    const series = await apiGet("/api/metrics/timeseries", { ...f, bucket });
    renderTrend(els.trendChart, series);

    const an = computeAnomalies(series);
    if (an.threshold == null) {
      els.anomalyBox.textContent = "Недостатньо даних для розрахунку аномалій.";
    } else if (an.anomalies.length === 0) {
      els.anomalyBox.textContent = `Порог (mean + 2σ) = ${an.threshold.toFixed(2)}. Аномалій не знайдено.`;
    } else {
      const list = an.anomalies
        .slice(0, 6)
        .map(x => `${String(x.period_start).slice(0,10)} → ${x.count}`)
        .join(", ");
      els.anomalyBox.textContent = `Порог (mean + 2σ) = ${an.threshold.toFixed(2)}. Аномалії: ${list}`;
    }

    // 3) distributions
    const bySource = await apiGet("/api/metrics/by_source", f);
    renderBarChart(els.bySourceChart, bySource);

    const byDir = await apiGet("/api/metrics/by_direction", f);
    renderBarChart(els.byDirChart, byDir);

    // 4) heatmap (also for top sectors)
    const heat = await apiGet("/api/metrics/heatmap", { ...f, bucket });
    renderHeatmap(els.heatmap, heat, bucket);
    renderTopSectors(heat);

    // 5) incidents table
    const pageData = await apiGet("/api/incidents", { ...f, page: state.page, page_size: state.pageSize });
    state.totalPages = pageData.total_pages || 1;
    state.lastItems = pageData.items || [];

    els.pageNum.textContent = String(state.page);
    els.pageTotal.textContent = String(state.totalPages);
    els.prevPage.disabled = state.page <= 1;
    els.nextPage.disabled = state.page >= state.totalPages;

    renderRows(state.lastItems);

    setStatus("ok", "ok");
  } catch (e) {
    showError(e.message || String(e));
  }
}

// ----------- UX wiring -----------
els.applyBtn.addEventListener("click", () => { state.page = 1; loadAll(); });

els.resetBtn.addEventListener("click", () => {
  els.date_from.value = "";
  els.date_to.value = "";
  els.sector.value = "";
  els.direction.value = "";
  els.source_type.value = "";
  els.min_intensity.value = "";
  els.bucket.value = "week";
  state.page = 1;
  loadAll();
});

els.pageSize.addEventListener("change", () => {
  state.pageSize = Number(els.pageSize.value);
  state.page = 1;
  loadAll();
});

els.prevPage.addEventListener("click", () => {
  if (state.page > 1) { state.page--; loadAll(); }
});
els.nextPage.addEventListener("click", () => {
  if (state.page < state.totalPages) { state.page++; loadAll(); }
});

els.closeModal.addEventListener("click", () => els.modal.classList.add("hidden"));
els.modal.addEventListener("click", (e) => {
  if (e.target === els.modal) els.modal.classList.add("hidden");
});

// старт
(async function init() {
  setStatus("idle", "перевірка…");
  try {
    await apiGet("/api/health");
    setStatus("ok", "готово");
  } catch {
    setStatus("err", "нема бекенда");
  }
  loadAll();
})();
