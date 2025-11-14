const DATA_URL = './sample.json';
const mapElement = document.querySelector('#map');
const layerCheckboxes = document.querySelectorAll(
  '.map-controls input[type="checkbox"][data-layer]'
);
const heatSlider = document.querySelector('#heat-radius');

let mapInstance;
const layerGroups = {
  units: L.layerGroup(),
  routes: L.layerGroup(),
  clusters: L.layerGroup(),
};
let heatLayer;
let heatSource = [];
let heatRadius = Number(heatSlider?.value) || 25;
const layerVisibility = {
  units: true,
  routes: true,
  clusters: true,
  heat: true,
};

if (mapElement) {
  mapInstance = L.map('map', {
    zoomSnap: 0.5,
    worldCopyJump: true,
  }).setView([48.1, 37.9], 11);

  mapInstance.createPane('heatmap');
  const heatPane = mapInstance.getPane('heatmap');
  heatPane.style.zIndex = 450;
  heatPane.style.pointerEvents = 'none';

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap, &copy; CartoDB',
  }).addTo(mapInstance);

  Object.values(layerGroups).forEach((group) => group.addTo(mapInstance));

  fetch(DATA_URL)
    .then((res) => {
      if (!res.ok) throw new Error('JSON недоступний');
      return res.json();
    })
    .then((data) => drawMap(data))
    .catch((error) => {
      console.error(error);
      const message = L.control({ position: 'topright' });
      message.onAdd = () => {
        const div = L.DomUtil.create('div', 'panel');
        div.innerHTML = '<strong>Помилка карти:</strong> немає даних.';
        return div;
      };
      message.addTo(mapInstance);
    });

  initControls();
}

function initControls() {
  layerCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      const layer = event.target.dataset.layer;
      const checked = event.target.checked;
      layerVisibility[layer] = checked;
      toggleLayer(layer, checked);
    });
  });

  heatSlider?.addEventListener('input', (event) => {
    heatRadius = Number(event.target.value);
    updateHeatLayer();
  });
}

function toggleLayer(layer, visible) {
  if (layer === 'heat') {
    if (visible) {
      updateHeatLayer();
    } else if (heatLayer) {
      mapInstance.removeLayer(heatLayer);
    }
    return;
  }
  const targetLayer = layerGroups[layer];
  if (!targetLayer) return;
  if (visible) {
    targetLayer.addTo(mapInstance);
  } else {
    mapInstance.removeLayer(targetLayer);
  }
}

function drawMap(data) {
  drawUnitMarkers(data.geo?.units ?? []);
  heatSource = data.geo?.activity_points ?? [];
  updateHeatLayer();
  drawRoutes(data.geo?.routes ?? []);
  drawClusters(data.geo?.clusters ?? []);
}

function drawUnitMarkers(units) {
  layerGroups.units.clearLayers();
  units.forEach((unit) => {
    if (!unit.lat || !unit.lon) return;
    const color = colorByType(unit.type);
    const marker = L.circleMarker([unit.lat, unit.lon], {
      radius: 9,
      color,
      fillColor: color,
      fillOpacity: 0.95,
      weight: 1.2,
    });
    marker.bindPopup(
      `
        <strong>${unit.name}</strong><br>
        Тип: ${unit.type}<br>
        Статус: ${unit.status}<br>
        Сила: ${unit.strength ?? '—'}<br>
        Останній контакт: ${unit.last_seen ?? '—'}
      `.trim()
    );
    marker.addTo(layerGroups.units);
  });
  if (!layerVisibility.units) toggleLayer('units', false);
}

function updateHeatLayer() {
  if (!mapInstance || !window.L || !L.heatLayer) return;
  if (heatLayer) {
    mapInstance.removeLayer(heatLayer);
  }
  if (!heatSource.length) return;
  const heatData = heatSource.map((pt) => {
    const intensity = Math.max((pt.activity ?? 30) / 100, 0.25);
    return [pt.lat, pt.lon, Math.min(intensity, 1)];
  });
  heatLayer = L.heatLayer(heatData, {
    radius: heatRadius,
    blur: heatRadius + 10,
    pane: 'heatmap',
    maxZoom: 14,
    minOpacity: 0.35,
    gradient: {
      0.1: '#8bc34a',
      0.4: '#ffeb3b',
      0.7: '#ff9800',
      0.95: '#d32f2f',
    },
  });
  if (layerVisibility.heat) {
    heatLayer.addTo(mapInstance);
  }
}

function drawRoutes(routes) {
  layerGroups.routes.clearLayers();
  routes.forEach((route) => {
    const coords = (route.path ?? []).map((pt) => [pt.lat, pt.lon]);
    if (coords.length < 2) return;
    L.polyline(coords, {
      color: '#8fb996',
      weight: 2.2,
      opacity: 0.85,
      dashArray: '8 4',
    })
      .bindPopup(`Маршрут підрозділу ${route.unit_id}`)
      .addTo(layerGroups.routes);
  });
  if (!layerVisibility.routes) toggleLayer('routes', false);
}

function drawClusters(clusters) {
  layerGroups.clusters.clearLayers();
  clusters.forEach((cluster) => {
    if (!cluster.center_lat || !cluster.center_lon) return;
    const color = colorByThreat(cluster.threat_level);
    L.circle([cluster.center_lat, cluster.center_lon], {
      radius: 1000 + (cluster.count ?? 1) * 50,
      color,
      fillColor: color,
      fillOpacity: 0.18,
      weight: 2,
    })
      .bindPopup(`<strong>${cluster.label}</strong><br>Рівень: ${cluster.threat_level}`)
      .addTo(layerGroups.clusters);
  });
  if (!layerVisibility.clusters) toggleLayer('clusters', false);
}

function colorByType(type = '') {
  if (type.includes('tank')) return '#4b6d2a';
  if (type.includes('artillery') || type.includes('mlrs')) return '#6f5235';
  if (type.includes('uav') || type.includes('ew') || type.includes('air')) return '#3b7a72';
  return '#718047';
}

function colorByThreat(level = '') {
  switch (level.toLowerCase()) {
    case 'high':
      return '#a5423f';
    case 'critical':
      return '#d76b60';
    case 'medium':
      return '#c9a635';
    case 'low':
    default:
      return '#6d8048';
  }
}
