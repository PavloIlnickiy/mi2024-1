const blocks = [
  { id: 'structure', name: 'Структура', duration: 3 },
  { id: 'intro', name: 'Вступ', duration: 5 },
  { id: 'basics', name: 'Основи дизайну', duration: 20 },
  { id: 'examples', name: 'Приклади', duration: 15 },
  { id: 'break', name: 'Перерва', duration: 10 },
  { id: 'data', name: 'Дизайн для даних', duration: 20 },
  { id: 'interactive', name: 'Інтерактив', duration: 15 },
  { id: 'summary', name: 'Підсумки', duration: 5 }
];

const galleryItems = [
  { title: 'Дашборд готовності', tag: 'контраст', quality: 'good' },
  { title: 'Перевантажений графік', tag: 'ієрархія', quality: 'bad' },
  { title: 'Сітка карток', tag: 'композиція', quality: 'good' },
  { title: 'Кольоровий шум', tag: 'колір', quality: 'bad' },
  { title: 'Читабельна таблиця', tag: 'типографіка', quality: 'good' }
];

const dataCases = [
  { type: 'Кількісні', bad: 'Стовпчики без підписів і масштабування.', good: 'Стовпчики з нульовою лінією, одиниці виміру, сортування.', note: 'Контекст і одиниці зменшують помилки.' },
  { type: 'Часові', bad: 'Кругова діаграма з місяцями.', good: 'Лінія/area з помітками піків.', note: 'Час — лінія, показує ритм.' },
  { type: 'Просторові', bad: 'Теплова карта без легенди.', good: 'Карта з точками + легенда й підписи секторів.', note: 'Не більше 5 відтінків.' }
];

const cases = [
  {
    id: 'case1',
    title: 'Готовність підрозділів (кількісні)',
    desc: 'Дані: % готовності батальйонів за тиждень.',
    tag: 'Кількісні'
  },
  {
    id: 'case2',
    title: 'Черги запитів (категоріальні)',
    desc: 'Дані: категорії запитів (зв’язок, медик, логістика) + статус.',
    tag: 'Якісні'
  },
  {
    id: 'case3',
    title: 'Маршрути конвоїв (час/простір)',
    desc: 'Дані: ETA конвоїв, напрямок, ризики маршруту.',
    tag: 'Часові/просторові'
  }
];

let timerInterval = null;
let remainingSeconds = 0;
let currentBlock = 'structure';

const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));

function renderTimeline() {
  const container = qs('#timeline');
  container.innerHTML = '';
  blocks.forEach((block) => {
    const card = document.createElement('div');
    card.className = 'timeline-card';
    card.dataset.goto = block.id;
    card.innerHTML = `
      <div class="time">${block.duration ? `${block.duration} хв` : ''}</div>
      <div>
        <h4>${block.name}</h4>
        <p>Блок ${block.id === 'structure' ? '— огляд' : ''}</p>
      </div>
    `;
    card.addEventListener('click', () => gotoSection(block.id));
    container.appendChild(card);
  });
}

function renderGallery(filters = []) {
  const container = qs('#gallery');
  container.innerHTML = '';
  galleryItems
    .filter((item) => filters.length === 0 || filters.includes(item.tag))
    .forEach((item) => {
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.innerHTML = `
        <div class="gallery-visual" aria-hidden="true"></div>
        <p class="label">${item.tag}</p>
        <h4>${item.title}</h4>
        <span class="badge ${item.quality === 'good' ? 'good' : 'bad'}">${item.quality === 'good' ? 'Вдалий' : 'Невдалий'}</span>
      `;
      container.appendChild(card);
    });
}

function renderFilterChips() {
  const tags = [...new Set(galleryItems.map((i) => i.tag))];
  const container = qs('#filterChips');
  tags.forEach((tag) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = tag;
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      const active = qsa('.chip.active').map((c) => c.textContent);
      renderGallery(active);
    });
    container.appendChild(chip);
  });
}

function renderDataCases() {
  const container = qs('#dataCases');
  container.innerHTML = '';
  dataCases.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'data-table row';
    row.style.gridTemplateColumns = '1fr 1fr 1fr';
    row.innerHTML = `
      <div><strong>${item.type}</strong></div>
      <div><p class="label">Проблемний</p><p>${item.bad}</p></div>
      <div><p class="label">Покращений</p><p>${item.good}</p><p class="label">Коментар</p><p>${item.note}</p></div>
    `;
    container.appendChild(row);
  });
}

function renderCases() {
  const grid = qs('#caseGrid');
  grid.innerHTML = '';
  cases.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'case-card';
    card.innerHTML = `
      <header>
        <h4>${item.title}</h4>
        <span class="chip">${item.tag}</span>
      </header>
      <p>${item.desc}</p>
      <label class="label" for="${item.id}">Запишіть ваш варіант візуалізації</label>
      <textarea id="${item.id}" data-case="${item.id}" placeholder="Наприклад: лінія по часу, підсекторні бари, карта з ETA..."></textarea>
    `;
    grid.appendChild(card);
    const saved = localStorage.getItem(item.id);
    if (saved) card.querySelector('textarea').value = saved;
  });
  qsa('textarea[data-case]').forEach((ta) => {
    ta.addEventListener('input', () => {
      localStorage.setItem(ta.dataset.case, ta.value);
    });
  });
}

function setupCompareSlider() {
  const slider = qs('#compareSlider');
  const afterPane = qs('#afterPane');
  slider.addEventListener('input', () => {
    afterPane.style.width = `${slider.value}%`;
  });
}

function setupModal() {
  const modal = qs('#modal');
  qs('#showQuestions').addEventListener('click', () => modal.classList.add('open'));
  qs('#closeModal').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });
}

function gotoSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  currentBlock = id;
  highlightNav(id);
  updatePanel();
}

function highlightNav(id) {
  qsa('.pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.goto === id);
  });
}

function setupNavButtons() {
  qsa('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => gotoSection(btn.dataset.goto));
  });
}

function setupTimelineNav() {
  qsa('.stage-nav .pill').forEach((btn) => {
    btn.addEventListener('click', () => gotoSection(btn.dataset.goto));
  });
}

function startTimer(durationMinutes) {
  clearInterval(timerInterval);
  remainingSeconds = durationMinutes * 60;
  tick();
  timerInterval = setInterval(tick, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function tick() {
  if (remainingSeconds < 0) {
    stopTimer();
    return;
  }
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  qs('#timerStatus').textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const block = blocks.find((b) => b.id === currentBlock);
  const total = (block?.duration || 1) * 60;
  const progress = Math.min(100, ((total - remainingSeconds) / total) * 100);
  qs('#progressBar').style.width = `${progress}%`;
  remainingSeconds -= 1;
}

function setupTeacherPanel() {
  const select = qs('#blockSelect');
  blocks.forEach((b, idx) => {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = `${b.name} (${b.duration} хв)`;
    select.appendChild(opt);
    if (idx === 0) select.value = b.id;
  });
  select.addEventListener('change', () => {
    gotoSection(select.value);
  });

  qs('#startTimer').addEventListener('click', () => {
    const block = blocks.find((b) => b.id === currentBlock);
    if (block) {
      startTimer(block.duration);
      qs('#blockDuration').textContent = `${block.duration} хв`;
      qs('#currentBlockName').textContent = block.name;
      setNextPreview(block.id);
    }
  });
  qs('#stopTimer').addEventListener('click', stopTimer);

  qs('#toggleHints').addEventListener('click', (e) => {
    document.body.classList.toggle('show-hints');
    e.target.textContent = document.body.classList.contains('show-hints') ? 'Підказки: увімк' : 'Підказки: вимк';
  });
}

function setNextPreview(currentId) {
  const idx = blocks.findIndex((b) => b.id === currentId);
  const next = blocks[idx + 1];
  qs('#nextPreview').textContent = next ? next.name : 'Фініш';
}

function setupBreakTimer() {
  const display = qs('#breakCountdown');
  let breakInterval = null;
  let breakSeconds = Number(qs('#breakMinutes').value) * 60;

  const updateDisplay = () => {
    const m = Math.floor(breakSeconds / 60);
    const s = breakSeconds % 60;
    display.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  qs('#breakMinutes').addEventListener('change', (e) => {
    breakSeconds = Number(e.target.value) * 60;
    updateDisplay();
  });

  qs('#startBreak').addEventListener('click', () => {
    clearInterval(breakInterval);
    breakSeconds = Number(qs('#breakMinutes').value) * 60;
    updateDisplay();
    breakInterval = setInterval(() => {
      breakSeconds -= 1;
      if (breakSeconds < 0) {
        clearInterval(breakInterval);
        breakInterval = null;
        return;
      }
      updateDisplay();
    }, 1000);
  });

  qs('#stopBreak').addEventListener('click', () => {
    clearInterval(breakInterval);
    breakInterval = null;
  });

  updateDisplay();
}

function updatePanel() {
  const select = qs('#blockSelect');
  if (select) select.value = currentBlock;
  const block = blocks.find((b) => b.id === currentBlock);
  if (block) {
    qs('#currentBlockName').textContent = block.name;
    qs('#blockDuration').textContent = `${block.duration} хв`;
    setNextPreview(block.id);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderTimeline();
  renderFilterChips();
  renderGallery();
  renderDataCases();
  renderCases();
  setupCompareSlider();
  setupModal();
  setupNavButtons();
  setupTimelineNav();
  setupTeacherPanel();
  setupBreakTimer();
  highlightNav('structure');
});
