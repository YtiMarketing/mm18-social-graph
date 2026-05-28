// Панель «Город». Структурно копирует categories.js, но группирует по полю city.
// Часто это первая нужная фильтрация на выезде: «кто из моего города».

function avatarColor(role) {
  if (role === 'organizer') return 'background:#a155b9';
  if (role === 'mentor') return 'background:#00c853';
  return 'background:#4a90d9';
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

// Нормализация городов: "Москва " → "москва", "СПб" / "Санкт-Петербург" остаются разными
// (юзеры пишут как пишут — на v1 не пытаемся склеивать варианты).
function normCity(s) {
  return String(s || '').trim().toLowerCase();
}

export function openCitiesPanel(data, graphCtl, onPersonClick) {
  const counts = new Map();
  const display = new Map();
  for (const n of data.nodes) {
    if (!n.city) continue;
    const k = normCity(n.city);
    if (!k) continue;
    counts.set(k, (counts.get(k) || 0) + 1);
    if (!display.has(k)) display.set(k, n.city.trim());
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  const sb = document.getElementById('sidebar');
  const body = document.getElementById('sidebar-body');

  function renderList() {
    graphCtl.clearHighlight();
    body.innerHTML = `
      <div class="panel-head">
        <div class="panel-title">ГОРОД</div>
        <div class="panel-subtitle">${sorted.length} городов · ${data.nodes.length} человек</div>
      </div>
      <input id="city-search" class="cat-search" type="text" placeholder="Поиск города…" autocomplete="off" aria-label="Поиск города">
      <div class="cat-list" id="city-list">
        ${sorted.map(([k, c]) => `
          <div class="cat-row" data-city="${escapeAttr(k)}">
            <span class="cat-label">${escapeHtml(display.get(k))}</span>
            <span class="cat-count">${c}</span>
          </div>
        `).join('')}
      </div>
    `;
    const search = document.getElementById('city-search');
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      document.querySelectorAll('#city-list .cat-row').forEach(r => {
        r.style.display = (!q || r.dataset.city.includes(q)) ? '' : 'none';
      });
    });
    document.querySelectorAll('#city-list .cat-row').forEach(r => {
      r.addEventListener('click', () => renderPeople(r.dataset.city));
    });
  }

  function renderPeople(cityKey) {
    const people = data.nodes
      .filter(n => normCity(n.city) === cityKey)
      .sort((a, b) => (b.message_count || 0) - (a.message_count || 0) || a.name.localeCompare(b.name));

    graphCtl.setHighlight(people.map(p => p.id));
    setTimeout(() => {
      graphCtl.instance.zoomToFit(700, 100, n => people.some(p => p.id === n.id));
    }, 60);

    body.innerHTML = `
      <div class="panel-head">
        <button class="back-btn" id="back-city">← Назад к городам</button>
        <div class="panel-title">${escapeHtml(display.get(cityKey))}</div>
        <div class="panel-subtitle">${people.length} ${plural(people.length, 'человек', 'человека', 'человек')}</div>
      </div>
      <div class="people-list">
        ${people.map(p => `
          <div class="person-row" data-id="${escapeAttr(p.id)}">
            <span class="profile-avatar conn-avatar" style="${avatarColor(p.role)}">${escapeHtml(p.avatar_initials)}</span>
            <div class="person-meta">
              <div class="person-name">${escapeHtml(p.name)}</div>
              <div class="person-sub">
                ${p.telegram ? '@' + escapeHtml(p.telegram) : '<em>нет username</em>'}
                ${p.role_text ? ' · ' + escapeHtml(p.role_text) : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    document.getElementById('back-city').addEventListener('click', renderList);
    document.querySelectorAll('.person-row').forEach(r => {
      r.addEventListener('click', () => {
        const node = data.nodes.find(n => n.id === r.dataset.id);
        if (node && onPersonClick) onPersonClick(node);
      });
    });
  }

  renderList();
  sb.classList.remove('hidden');
}

function plural(n, one, few, many) {
  const m100 = n % 100;
  const m10 = n % 10;
  if (m100 >= 11 && m100 <= 14) return many;
  if (m10 === 1) return one;
  if (m10 >= 2 && m10 <= 4) return few;
  return many;
}
