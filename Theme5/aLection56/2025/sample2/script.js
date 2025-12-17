async function loadData() {
  try {
    const response = await fetch("./data.json?_=" + new Date().getTime());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    updateDashboard(data);
  } catch (err) {
    console.error("Помилка завантаження даних:", err);
  }
}

function updateDashboard(data) {
  document.getElementById("intensityValue").textContent = data.intensity + "%";
  document.getElementById("logisticsText").textContent = data.logistics;
  document.getElementById("weatherText").textContent = data.weather;

  drawLossesChart(data.losses);
  updateMap(data.regions);
}

// === Втрати противника ===
function drawLossesChart(losses) {
  const canvas = document.getElementById("lossesChart");
  const ctx = canvas.getContext("2d");
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  const entries = Object.entries(losses);
  const labels = entries.map(([key]) => key);
  const values = entries.map(([_, val]) => val);

  const barWidth = canvas.width / labels.length - 10;
  const maxVal = Math.max(...values);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  values.forEach((v, i) => {
    const x = i * (barWidth + 15) + 20;
    const h = (v / maxVal) * (canvas.height - 40);
    const y = canvas.height - h - 20;
    ctx.fillStyle = "#b9c788";
    ctx.fillRect(x, y, barWidth, h);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(labels[i], x + barWidth / 2, canvas.height - 5);
  });
}

// === Карта ===
let map;
function initMap() {
  map = L.map("map").setView([48.5, 32], 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
}

function updateMap(regions) {
  if (!map) initMap();
  map.eachLayer((layer) => {
    if (layer instanceof L.Circle) map.removeLayer(layer);
  });

  regions.forEach((r) => {
    const circle = L.circle([r.lat, r.lon], {
      color: "red",
      fillColor: "#f03",
      fillOpacity: 0.5,
      radius: r.attacks * 1200,
    }).addTo(map);
    circle.bindPopup(`<b>${r.name}</b><br>Атак: ${r.attacks}`);
  });
}

loadData();
setInterval(loadData, 5 * 60 * 1000);
