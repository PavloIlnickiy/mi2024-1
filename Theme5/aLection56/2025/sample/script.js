async function loadData() {
  try {
    const response = await fetch("data.json?_=" + new Date().getTime()); // запобігає кешуванню
    const data = await response.json();
    updateDashboard(data);
  } catch (err) {
    console.error("Помилка завантаження даних:", err);
  }
}

function updateDashboard(data) {
  document.getElementById("intensityValue").textContent = data.intensity;

  drawMap(data.regions);
  drawBarChart(data.losses);
}

// ====== Карта ======
function drawMap(regions) {
  const canvas = document.getElementById("bubbleMap");
  const ctx = canvas.getContext("2d");
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  regions.forEach((r) => {
    const radius = r.attacks * 2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(200, 0, 0, 0.6)";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "16px sans-serif";
    ctx.fillText(r.name, r.x + radius + 5, r.y);
  });
}

// ====== Інфографіка ======
function drawBarChart(losses) {
  const chartCanvas = document.getElementById("lossesChart");
  const ctx = chartCanvas.getContext("2d");
  chartCanvas.width = chartCanvas.clientWidth;
  chartCanvas.height = chartCanvas.clientHeight;

  const entries = Object.entries(losses);
  const labels = entries.map(([key]) => key);
  const values = entries.map(([_, value]) => value);

  const barWidth = chartCanvas.width / labels.length - 20;
  const maxVal = Math.max(...values);
  ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);

  values.forEach((v, i) => {
    const barHeight = (v / maxVal) * (chartCanvas.height - 50);
    const x = i * (barWidth + 20) + 30;
    const y = chartCanvas.height - barHeight - 20;
    ctx.fillStyle = "#c9d79f";
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(labels[i], x + barWidth / 2, chartCanvas.height - 5);
    ctx.fillText(v, x + barWidth / 2, y - 10);
  });
}

// ====== Автооновлення кожні 5 хвилин ======
loadData();
setInterval(loadData, 5 * 60 * 1000);
