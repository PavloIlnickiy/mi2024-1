const charts = {
  'Кількісні дані': [
    { title: 'Стовпчиковий', hint: 'Порівняння підрозділів за готовністю або запасами.' },
    { title: 'Лінійний', hint: 'Тренд боєготовності / втрат у часі.' },
    { title: 'Area chart', hint: 'Обсяг поставок чи накопичення ресурсів.' }
  ],
  'Якісні дані': [
    { title: 'Груповані бари', hint: 'Статус готовності за категоріями (зв’язок, логістика, медичне забезпечення).' },
    { title: 'Горизонтальні бари', hint: 'Ранжування завдань / черги запитів.' },
    { title: 'Санкей/алuvial', hint: 'Потоки або переходи станів (якщо є).' }
  ],
  'Часові': [
    { title: 'Лінія / area', hint: 'Динаміка ротацій, частота атак, робота конвоїв.' },
    { title: 'Гант / timeline', hint: 'Планування операцій, етапи підготовки.' },
    { title: 'Спарклайни', hint: 'Малі тренди в картках без перевантаження.' }
  ],
  'Просторові': [
    { title: 'Карта + heat/точки', hint: 'Концентрація подій, логістичні вузли.' },
    { title: 'Маршрутні лінії', hint: 'Шляхи конвоїв, час до прибуття.' },
    { title: 'Хороплет', hint: 'Щільність чи забезпечення по районах.' }
  ],
  'Порівняння/структура': [
    { title: 'Стовпчики з однаковою нульовою лінією', hint: 'Чесне порівняння станів підрозділів.' },
    { title: '100% stacked', hint: 'Частки у складі ресурсів/витрат.' },
    { title: 'Dot plot', hint: 'Порівняння «було/стало» з мінімумом шуму.' }
  ]
};

const quizAnswers = {
  q1: 'b',
  q2: 'b',
  q3: 'b'
};

function renderBars(containerId, values, noise = 0) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const noiseFactor = Math.max(0, Math.min(1, noise / 100));

  values.forEach((value, idx) => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    if (noiseFactor > 0.45 && idx % 2 === 0) {
      bar.classList.add('bar--noise');
    }
    const height = Math.max(24, value * (1 - noiseFactor * 0.6));
    bar.style.height = `${height}px`;
    bar.style.opacity = `${1 - noiseFactor * 0.6}`;
    container.appendChild(bar);
  });
}

function renderChartButtons() {
  const buttons = document.getElementById('chartButtons');
  const list = document.getElementById('chartList');
  const categories = Object.keys(charts);
  let active = categories[0];

  const drawList = (category) => {
    list.innerHTML = '';
    charts[category].forEach((item) => {
      const card = document.createElement('div');
      card.className = 'chart-card';
      card.innerHTML = `<h4>${item.title}</h4><p>${item.hint}</p>`;
      list.appendChild(card);
    });
  };

  categories.forEach((category) => {
    const btn = document.createElement('button');
    btn.className = `btn ghost${category === active ? ' active' : ''}`;
    btn.textContent = category;
    btn.addEventListener('click', () => {
      active = category;
      Array.from(buttons.children).forEach((child) => child.classList.remove('active'));
      btn.classList.add('active');
      drawList(category);
    });
    buttons.appendChild(btn);
  });

  drawList(active);
}

function setupNoiseControl() {
  const slider = document.getElementById('noiseSlider');
  const noiseValue = document.getElementById('noiseValue');
  const signalValue = document.getElementById('signalValue');

  const update = () => {
    const noise = Number(slider.value);
    const signal = 100 - noise;
    noiseValue.textContent = `${noise}%`;
    signalValue.textContent = `${signal}%`;
    renderBars('demoBars', [90, 72, 66, 58, 80, 64], noise);
    document.getElementById('signalNote').textContent = (signal / 100).toFixed(2);
  };

  slider.addEventListener('input', update);
  update();
}

function setupQuiz() {
  const button = document.getElementById('checkQuiz');
  const result = document.getElementById('quizResult');

  button.addEventListener('click', () => {
    let score = 0;
    Object.keys(quizAnswers).forEach((id) => {
      const checked = document.querySelector(`input[name="${id}"]:checked`);
      if (checked && checked.value === quizAnswers[id]) {
        score += 1;
      }
    });
    if (score === 3) {
      result.textContent = '3/3 — чудово! Дизайн без шуму.';
      result.style.color = 'var(--accent)';
    } else {
      result.textContent = `${score}/3 — перегляньте принципи та чек-ліст.`;
      result.style.color = 'var(--accent-2)';
    }
  });
}

function setupNavScroll() {
  document.querySelectorAll('.nav a').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

function initHeroViz() {
  renderBars('heroBars', [60, 78, 52, 90, 68, 82]);
  renderBars('rotationBars', [50, 62, 58, 70, 66, 74]);
}

document.addEventListener('DOMContentLoaded', () => {
  renderChartButtons();
  setupNoiseControl();
  setupQuiz();
  setupNavScroll();
  initHeroViz();
});
