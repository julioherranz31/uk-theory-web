const state = {
  manifest: null,
  userKey: null,
  currentCategory: null,
  questions: [],
  idx: 0
};

const el = (id) => document.getElementById(id);

function getProgress() {
  const raw = localStorage.getItem(state.userKey || 'ukTheory_progress_guest');
  return raw ? JSON.parse(raw) : { perCat: {}, totals: { answered: 0, gotIt: 0 } };
}

function saveProgress(p) {
  localStorage.setItem(state.userKey || 'ukTheory_progress_guest', JSON.stringify(p));
}

function setView(which) {
  el('loginView').classList.toggle('hidden', which !== 'login');
  el('categoriesView').classList.toggle('hidden', which !== 'categories');
  el('studyView').classList.toggle('hidden', which !== 'study');
  el('backBtn').style.visibility = (which === 'login') ? 'hidden' : 'visible';
}

function pct(got, total) {
  if (!total) return 0;
  return Math.round((got / total) * 100);
}

async function loadManifest() {
  const res = await fetch('data/manifest.json');
  state.manifest = await res.json();
  el('subtitle').textContent = `${state.manifest.total} of ${state.manifest.total} selected`;
}

function renderCategories() {
  const list = el('categoriesList');
  list.innerHTML = '';
  const prog = getProgress();

  // Totals
  let answeredAll = 0, gotAll = 0;
  state.manifest.categories.forEach(c => {
    const p = prog.perCat[c.slug] || { answered: 0, gotIt: 0, total: c.count };
    answeredAll += Math.min(p.answered, c.count);
    gotAll += Math.min(p.gotIt, c.count);
  });
  const totalPct = pct(gotAll, state.manifest.total);

  // Add "All categories"
  list.appendChild(categoryItem({
    name: 'All categories',
    slug: '__all__',
    count: state.manifest.total,
    answered: answeredAll,
    gotIt: gotAll,
    percent: totalPct
  }));

  state.manifest.categories.forEach(c => {
    const p = prog.perCat[c.slug] || { answered: 0, gotIt: 0, total: c.count };
    list.appendChild(categoryItem({
      name: c.name,
      slug: c.slug,
      count: c.count,
      answered: Math.min(p.answered, c.count),
      gotIt: Math.min(p.gotIt, c.count),
      percent: pct(Math.min(p.gotIt, c.count), c.count)
    }));
  });
}

function categoryItem({ name, slug, count, answered, gotIt, percent }) {
  const div = document.createElement('div');
  div.className = 'item';
  div.onclick = () => startCategory(slug);

  const top = document.createElement('div');
  top.className = 'row';

  const left = document.createElement('div');
  left.innerHTML = `<div class="name">${name}</div>`;

  const right = document.createElement('div');
  right.innerHTML = `<div style="display:flex;align-items:center;gap:10px">
    <div style="font-weight:800">${percent}%</div>
    <div class="check">✓</div>
  </div>`;

  top.appendChild(left);
  top.appendChild(right);

  const bar = document.createElement('div');
  bar.className = 'bar';

  const green = document.createElement('div');
  green.className = 'fill green';
  green.style.width = `${Math.min(percent, 100)}%`;

  const red = document.createElement('div');
  red.className = 'fill red';
  red.style.width = `${Math.min(100 - percent, 100)}%`;

  // layered bar effect: use green only, red as background impression
  bar.appendChild(green);

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.innerHTML = `<span>Answered: ${answered}/${count}</span><span>Correctly: ${gotIt}/${count}</span>`;

  div.appendChild(top);
  div.appendChild(bar);
  div.appendChild(meta);
  return div;
}

async function startCategory(slug) {
  state.currentCategory = slug;
  state.idx = 0;

  if (slug === '__all__') {
    // load all categories
    const allQs = [];
    for (const c of state.manifest.categories) {
      const res = await fetch(`data/${c.slug}.json`);
      const data = await res.json();
      data.forEach(q => allQs.push(q));
    }
    state.questions = allQs;
    el('catPill').textContent = 'All categories';
  } else {
    const res = await fetch(`data/${slug}.json`);
    state.questions = await res.json();
    const catName = state.manifest.categories.find(c => c.slug === slug)?.name || 'Category';
    el('catPill').textContent = catName;
  }

  setView('study');
  showQuestion();
}

function showQuestion() {
  const q = state.questions[state.idx];
  el('qEn').textContent = q.question_en;
  el('qPt').textContent = q.question_pt;
  el('aEn').textContent = q.answer_en;
  el('aPt').textContent = q.answer_pt;
  el('counter').textContent = `${state.idx + 1}/${state.questions.length}`;
  el('prevBtn').disabled = state.idx === 0;
  el('nextBtn').disabled = state.idx >= state.questions.length - 1;
}

function recordResult(gotIt) {
  const prog = getProgress();
  const q = state.questions[state.idx];
  const slug = state.currentCategory === '__all__' ? q.category_slug || null : state.currentCategory;

  // Determine category slug for per-category progress even when studying all
  const catSlug = state.currentCategory === '__all__'
    ? (state.manifest.categories.find(c => c.name === q.category)?.slug || null)
    : state.currentCategory;

  if (catSlug) {
    if (!prog.perCat[catSlug]) prog.perCat[catSlug] = { answered: 0, gotIt: 0, total: 0 };
    prog.perCat[catSlug].answered = Math.min((prog.perCat[catSlug].answered || 0) + 1, 999999);
    if (gotIt) prog.perCat[catSlug].gotIt = Math.min((prog.perCat[catSlug].gotIt || 0) + 1, 999999);
  }

  prog.totals.answered = (prog.totals.answered || 0) + 1;
  if (gotIt) prog.totals.gotIt = (prog.totals.gotIt || 0) + 1;
  saveProgress(prog);
}

function next() {
  if (state.idx < state.questions.length - 1) {
    state.idx += 1;
    showQuestion();
  } else {
    alert('Finished!');
    setView('categories');
    renderCategories();
  }
}

function prev() {
  if (state.idx > 0) {
    state.idx -= 1;
    showQuestion();
  }
}

function doLogin(name, pin) {
  const key = `ukTheory_progress_${(name || 'guest').trim().toLowerCase()}_${(pin || '0').trim()}`;
  state.userKey = key;
  localStorage.setItem('ukTheory_lastUser', JSON.stringify({ name, pin }));
  setView('categories');
  renderCategories();
}

function initLogin() {
  const last = localStorage.getItem('ukTheory_lastUser');
  if (last) {
    try {
      const { name, pin } = JSON.parse(last);
      el('nameInput').value = name || '';
      el('pinInput').value = pin || '';
    } catch {}
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await loadManifest();
  initLogin();

  el('loginBtn').onclick = () => doLogin(el('nameInput').value, el('pinInput').value);
  el('guestBtn').onclick = () => { state.userKey = null; setView('categories'); renderCategories(); };

  el('startAllBtn').onclick = () => startCategory('__all__');

  el('knewBtn').onclick = () => { recordResult(true); next(); };
  el('reviewBtn').onclick = () => { recordResult(false); next(); };
  el('nextBtn').onclick = () => next();
  el('prevBtn').onclick = () => prev();

  el('backBtn').onclick = () => {
    if (!el('studyView').classList.contains('hidden')) {
      setView('categories');
      renderCategories();
    } else if (!el('categoriesView').classList.contains('hidden')) {
      setView('login');
    }
  };

  setView('login');
});
