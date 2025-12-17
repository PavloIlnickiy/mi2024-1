const modules = [
  { id: 'module0', title: 'Стартовий екран' },
  { id: 'module1', title: 'Що таке дизайн' },
  { id: 'module2', title: 'Базові принципи' },
  { id: 'module3', title: 'Класи візуальних елементів' },
  { id: 'module4', title: 'Вибір візуалізації' },
  { id: 'module5', title: 'Приклади дашбордів' },
  { id: 'module6', title: 'Міні-практикум' },
  { id: 'module7', title: 'Підсумок і тест' }
];

const glossary = {
  композиція: 'Розміщення елементів за сіткою та логікою фокусу.',
  контраст: 'Відмінність між елементами, що робить головне помітним.',
  'dashboard': 'Екран з ключовими метриками та візуалізаціями.',
  'visual hierarchy': 'Порядок читання завдяки розміру, кольору, відступам.',
  typography: 'Використання шрифтів для читабельності та структури.'
};

const openerQuizData = [
  { text: 'Дизайн — це лише «краса», не впливає на дані', answer: false },
  { text: 'Гарний дизайн зменшує помилки інтерпретації', answer: true },
  { text: 'Типографіка впливає на читабельність графіків', answer: true }
];

const principles = [
  { id: 'composition', title: 'Композиція', good: 'Чітка сітка, вирівнювання', bad: 'Хаотичне розміщення' },
  { id: 'balance', title: 'Баланс', good: 'Пропорції та «повітря»', bad: 'Перенавантаження сторони' },
  { id: 'contrast', title: 'Контраст', good: '2 акцентні кольори, різний розмір', bad: 'Низький контраст, багато кольорів' },
  { id: 'hierarchy', title: 'Візуальна ієрархія', good: 'Заголовки/підзаголовки', bad: 'Все однаково за вагою' },
  { id: 'color', title: 'Колір', good: 'Палітра «Степ», тест на контраст', bad: 'Кислотні, без сенсу' },
  { id: 'type', title: 'Типографіка', good: 'Sans-serif, 16–18 px', bad: 'Дрібний текст, багато шрифтів' }
];

const contrastOptions = [
  { id: 'opt1', label: 'Сірий текст на сірому фоні', correct: false },
  { id: 'opt2', label: 'Заголовок виразний, підписи контрастні', correct: true },
  { id: 'opt3', label: '10 кольорів без ієрархії', correct: false }
];

const mindmapItems = [
  { title: 'Діаграми', note: 'Стовпчики, секторні — порівняння категорій' },
  { title: 'Тренди', note: 'Лінійні графіки, area — ритм і динаміка' },
  { title: 'Таблиці', note: 'Коли потрібні точні значення' },
  { title: 'Карти', note: 'Просторовий контекст, маршрути' },
  { title: 'Інфографіка', note: 'Комбіновані візуали для історій' },
  { title: 'Піктограми', note: 'Стислий візуальний маркер стану' }
];

const scenarios = [
  { id: 's1', text: 'Динаміка втрат по місяцях', answer: 'Лінійний графік' },
  { id: 's2', text: 'Розподіл підрозділів за типом озброєння', answer: 'Стовпчики' },
  { id: 's3', text: 'ETA конвоїв на маршрутах', answer: 'Карта/маршрут' }
];

const visualTypes = ['Лінійний графік', 'Стовпчики', 'Карта/маршрут'];

const finalQuiz = [
  { id: 'q1', text: 'Який принцип підсилює порядок читання?', options: ['Контраст', 'Ієрархія', 'Декор'], correct: 1 },
  { id: 'q2', text: 'Для часових трендів краще:', options: ['Кругові діаграми', 'Лінії/area', 'Діаграми розсіювання без часу'], correct: 1 },
  { id: 'q3', text: 'Скільки шрифтів достатньо для дашборду?', options: ['1–2', '4–5', '8'], correct: 0 },
  { id: 'q4', text: 'Що уникати в просторових графіках?', options: ['Легенда', 'Забагато відтінків без сенсу', 'Підписи секторів'], correct: 1 },
  { id: 'q5', text: 'LocalStorage використовується для:', options: ['Збереження прогресу локально', 'Стилізації кнопок', 'Завантаження шрифтів'], correct: 0 },
  { id: 'q6', text: 'Правильний акцент кольором:', options: ['На кожному елементі', 'Лише на ключових метриках', 'Тільки сірий'], correct: 1 }
];

const stateKey = 'step-learner-progress';
let state = {
  completed: {},
  openerAnswers: {},
  contrastChoice: null,
  finalAnswers: {},
  dragMatches: {},
  hotspotsFound: {}
};

const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));

function loadState() {
  try {
    const stored = localStorage.getItem(stateKey);
    if (stored) state = { ...state, ...JSON.parse(stored) };
  } catch (e) {
    console.warn('Cannot load state', e);
  }
}

function saveState() {
  localStorage.setItem(stateKey, JSON.stringify(state));
}

function renderNav() {
  const nav = qs('#moduleNav');
  nav.innerHTML = '';
  modules.forEach((m, idx) => {
    const link = document.createElement('div');
    link.className = 'module-link';
    link.dataset.target = m.id;
    link.innerHTML = `<span>${idx}. ${m.title}</span><span class="status"></span>`;
    link.addEventListener('click', () => scrollToModule(m.id));
    nav.appendChild(link);
  });
  refreshNav();
}

function refreshNav() {
  const completedCount = Object.keys(state.completed).length;
  const percent = Math.round((completedCount / modules.length) * 100);
  qs('#progressValue').textContent = `${percent}%`;
  qs('#progressBar').style.width = `${percent}%`;
  qsa('.module-link').forEach((link) => {
    const target = link.dataset.target;
    link.classList.toggle('completed', !!state.completed[target]);
  });
}

function scrollToModule(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  qsa('.module-link').forEach((link) => {
    link.classList.toggle('active', link.dataset.target === id);
  });
}

function markCompleted(id) {
  state.completed[id] = true;
  saveState();
  refreshNav();
}

function renderGlossary() {
  const list = qs('#glossaryList');
  list.innerHTML = '';
  Object.entries(glossary).forEach(([term, def]) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${term}</strong>: ${def}`;
    list.appendChild(li);
  });
}

function renderOpenerQuiz() {
  const container = qs('#openerQuiz');
  container.innerHTML = '';
  openerQuizData.forEach((q, idx) => {
    const row = document.createElement('div');
    row.className = 'quiz-item';
    row.innerHTML = `
      <p>${q.text}</p>
      <label><input type="radio" name="opener-${idx}" value="true"> True</label>
      <label><input type="radio" name="opener-${idx}" value="false"> False</label>
    `;
    container.appendChild(row);
    const saved = state.openerAnswers[`opener-${idx}`];
    if (saved !== undefined) {
      const input = container.querySelector(`input[name="opener-${idx}"][value="${saved}"]`);
      if (input) input.checked = true;
    }
  });
}

function checkOpenerQuiz() {
  let score = 0;
  openerQuizData.forEach((q, idx) => {
    const val = (qs(`input[name="opener-${idx}"]:checked`) || {}).value;
    state.openerAnswers[`opener-${idx}`] = val;
    const correctStr = q.answer ? 'true' : 'false';
    if (val === correctStr) score += 1;
  });
  saveState();
  qs('#openerResult').textContent = `${score}/${openerQuizData.length} правильних`;
  if (score === openerQuizData.length) markCompleted('module1');
}

function renderPrinciples() {
  const grid = qs('#principleGrid');
  grid.innerHTML = '';
  principles.forEach((p) => {
    const card = document.createElement('article');
    card.className = 'principle-card';
    card.innerHTML = `
      <h4>${p.title}</h4>
      <div class="do-dont">
        <div><strong>Робіть</strong><ul><li>${p.good}</li><li>Стійка сітка/відступи</li></ul></div>
        <div><strong>Уникайте</strong><ul><li>${p.bad}</li><li>Кольоровий шум</li></ul></div>
      </div>
      <div class="toggle" data-id="${p.id}" data-before="${p.bad}" data-after="${p.good}">
        <div class="toggle-labels"><span>До</span><span>Після</span></div>
        <div class="toggle-track"><div class="toggle-thumb"></div></div>
        <p class="toggle-caption">До: ${p.bad}</p>
      </div>
    `;
    grid.appendChild(card);
  });
  grid.querySelectorAll('.toggle').forEach((el) => {
    el.addEventListener('click', () => {
      el.classList.toggle('good');
      const isGood = el.classList.contains('good');
      const caption = el.querySelector('.toggle-caption');
      const before = el.dataset.before;
      const after = el.dataset.after;
      caption.textContent = (isGood ? 'Після: ' + after : 'До: ' + before);
    });
  });
}

function renderContrastOptions() {
  const wrap = qs('#contrastOptions');
  wrap.innerHTML = '';
  contrastOptions.forEach((opt) => {
    const div = document.createElement('div');
    div.className = 'option';
    div.textContent = opt.label;
    if (state.contrastChoice === opt.id) div.classList.add('selected');
    div.addEventListener('click', () => {
      state.contrastChoice = opt.id;
      qsa('.option').forEach((o) => o.classList.remove('selected'));
      div.classList.add('selected');
    });
    wrap.appendChild(div);
  });
}

function checkContrast() {
  const choice = state.contrastChoice;
  if (!choice) return;
  const opt = contrastOptions.find((o) => o.id === choice);
  qs('#contrastResult').textContent = opt?.correct ? 'Вірно: видно головне' : 'Спробуйте ще раз';
  saveState();
  if (opt?.correct) markCompleted('module2');
}

function renderMindmap() {
  const map = qs('#mindmap');
  map.innerHTML = '';
  mindmapItems.forEach((item) => {
    const node = document.createElement('div');
    node.className = 'mind-node';
    node.innerHTML = `<strong>${item.title}</strong><div class="hint">${item.note}</div>`;
    map.appendChild(node);
  });
  let hovered = false;
  map.addEventListener('mouseenter', () => {
    if (!hovered) {
      markCompleted('module3');
      hovered = true;
    }
  }, { once: true });
}

function renderDragDrop() {
  const scenarioWrap = qs('#scenarios');
  const visualsWrap = qs('#visuals');
  const dropzones = qs('#dropzones');
  scenarioWrap.innerHTML = '';
  visualsWrap.innerHTML = '';
  dropzones.innerHTML = '';

  scenarios.forEach((s) => {
    const card = document.createElement('div');
    card.className = 'card-chip';
    card.textContent = s.text;
    card.draggable = true;
    card.dataset.id = s.id;
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', s.id);
    });
    scenarioWrap.appendChild(card);
  });

  visualTypes.forEach((v) => {
    const card = document.createElement('div');
    card.className = 'card-chip';
    card.textContent = v;
    card.draggable = true;
    card.dataset.visual = v;
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', v);
    });
    visualsWrap.appendChild(card);
  });

  scenarios.forEach((s) => {
    const slot = document.createElement('div');
    slot.className = 'dropzone-slot';
    slot.dataset.id = s.id;
    slot.innerHTML = `<p class="label">${s.text}</p><div class="drop-target" aria-label="Перетягніть візуалізацію"></div>`;
    slot.addEventListener('dragover', (e) => e.preventDefault());
    slot.addEventListener('drop', (e) => handleDrop(e, s.id));
    dropzones.appendChild(slot);
  });
}

function handleDrop(e, scenarioId) {
  e.preventDefault();
  const visual = e.dataTransfer.getData('text/plain');
  state.dragMatches[scenarioId] = visual;
  saveState();
  const slot = e.currentTarget;
  slot.classList.add('filled');
  slot.querySelector('.drop-target').textContent = visual;
  checkDragDrop();
}

function checkDragDrop() {
  let correct = 0;
  scenarios.forEach((s) => {
    if (state.dragMatches[s.id] === s.answer) correct += 1;
  });
  qs('#dragResult').textContent = `${correct}/${scenarios.length} вірно`;
  if (correct === scenarios.length) markCompleted('module4');
}

function setupHotspots() {
  const bad = qs('#badDash');
  const fixList = qs('#fixList');
  const counter = qs('#issueCounter');
  const issueDetails = {
    'Колір шумить': 'Вирівняли палітру: 1 основний + 1 акцент, фон нейтральний.',
    'Дрібний шрифт': 'Підвищено читабельність: 16–18 px, чіткий контраст.',
    'Немає ієрархії': 'Додано заголовки/підзаголовки, вирівняні картки.'
  };
  fixList.innerHTML = '';
  qsa('.hotspot').forEach((spot) => {
    const issue = spot.dataset.issue;
    if (state.hotspotsFound[issue]) {
      spot.style.opacity = 0.3;
      addFix(issue, fixList, issueDetails[issue]);
    }
    spot.addEventListener('click', () => {
      spot.style.opacity = 0.3;
      state.hotspotsFound[issue] = true;
      addFix(issue, fixList, issueDetails[issue]);
      saveState();
      if (Object.keys(state.hotspotsFound).length >= 3) {
        markCompleted('module5');
      }
      updateCounter(counter);
    });
  });
  updateCounter(counter);
}

function updateCounter(counterEl) {
  const remaining = Math.max(0, 3 - Object.keys(state.hotspotsFound).length);
  counterEl.textContent = remaining === 0
    ? 'Знайдено всі проблеми — подивіться на «Після».'
    : `Знайдіть ще ${remaining} проблем(и) у «До».`;
}

function addFix(issue, list, detail) {
  if (list.querySelector(`[data-issue="${issue}"]`)) return;
  const li = document.createElement('li');
  li.dataset.issue = issue;
  li.innerHTML = `<strong>${issue}</strong>: ${detail || 'Виправлено'}`;
  list.appendChild(li);
}

function setupMockup() {
  qs('#buildMockup').addEventListener('click', () => {
    const type = qs('#dataType').value;
    const focus = qs('#accentFocus').value;
    const result = qs('#mockupResult');
    const templates = {
      time: 'Лінійний/area графік з підписами піків. Заголовок: дія + період. Легенда праворуч, сітка мінімальна.',
      categorical: 'Горизонтальні бари, сортування за значенням. Легенда проста, підписи ліворуч, акцент на топ/антитоп.',
      spatial: 'Карта з точками/маршрутом, одна легенда. Підписи секторів, кольори обмежені.'
    };
    const focusNote = {
      trend: 'Підсвітити піки/спади, показати останню точку.',
      top: 'Виділити 3–5 категорій, решту — «інші».',
      risk: 'Акцент кольором + піктограма ризику.'
    };
    result.innerHTML = `
      <p class="label">Рекомендація</p>
      <p>${templates[type]}</p>
      <p><strong>Акцент:</strong> ${focusNote[focus]}</p>
    `;
    markCompleted('module6');
  });
}

function renderFinalQuiz() {
  const container = qs('#finalQuiz');
  container.innerHTML = '';
  finalQuiz.forEach((q) => {
    const div = document.createElement('div');
    div.className = 'quiz-item';
    div.innerHTML = `<p>${q.text}</p>`;
    q.options.forEach((opt, idx) => {
      const id = `${q.id}-${idx}`;
      const label = document.createElement('label');
      label.innerHTML = `<input type="radio" name="${q.id}" value="${idx}"> ${opt}`;
      div.appendChild(label);
      if (state.finalAnswers[q.id] == idx) {
        label.querySelector('input').checked = true;
      }
    });
    container.appendChild(div);
  });
}

function checkFinalQuiz() {
  let score = 0;
  finalQuiz.forEach((q) => {
    const val = (qs(`input[name="${q.id}"]:checked`) || {}).value;
    state.finalAnswers[q.id] = val;
    if (Number(val) === q.correct) score += 1;
  });
  saveState();
  qs('#finalResult').textContent = `${score}/${finalQuiz.length}`;
  if (score === finalQuiz.length) markCompleted('module7');
}

function setupScrollTracking() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          qsa('.module-link').forEach((link) => {
            link.classList.toggle('active', link.dataset.target === id);
          });
        }
      });
    },
    { threshold: 0.3 }
  );
  qsa('.module').forEach((m) => observer.observe(m));
}

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderNav();
  renderGlossary();
  renderOpenerQuiz();
  renderPrinciples();
  renderContrastOptions();
  renderMindmap();
  renderDragDrop();
  setupHotspots();
  setupMockup();
  renderFinalQuiz();
  setupScrollTracking();

  qs('[data-action="start"]').addEventListener('click', () => {
    markCompleted('module0');
    scrollToModule('module1');
  });
  qs('#checkOpener').addEventListener('click', checkOpenerQuiz);
  qs('#checkContrast').addEventListener('click', checkContrast);
  qs('#checkFinal').addEventListener('click', checkFinalQuiz);

  checkDragDrop();
});
