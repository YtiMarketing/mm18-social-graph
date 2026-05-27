// Панель «Категории». Открывается по клику на кнопку в шапке. Показывает
// список всех тегов с количеством людей. Клик по тегу → подсветить ноды
// с этим тегом на графе + показать список людей в той же панели.

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

export function openCategoriesPanel(data, graphCtl, onPersonClick) {
  // Считаем теги
  const counts = new Map();
  const display = new Map(); // нормализованный → первое встретившееся написание
  for (const n of data.nodes) {
    for (const t of (n.tags || [])) {
      const raw = String(t).trim();
      if (!raw) continue;
      const k = raw.toLowerCase();
      counts.set(k, (counts.get(k) || 0) + 1);
      if (!display.has(k)) display.set(k, raw);
    }
  }
  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, c]) => c >= 2);

  const sb = document.getElementById('sidebar');
  const body = document.getElementById('sidebar-body');

  function renderList() {
    graphCtl.clearHighlight();
    body.innerHTML = `
      <div class="panel-head">
        <div class="panel-title">КАТЕГОРИИ</div>
        <div class="panel-subtitle">${sorted.length} тегов · ${data.nodes.length} человек</div>
      </div>
      <input id="cat-search" class="cat-search" type="text" placeholder="Поиск категории…" autocomplete="off">
      <div class="cat-list" id="cat-list">
        ${sorted.map(([k, c]) => `
          <div class="cat-row" data-tag="${escapeAttr(k)}">
            <span class="cat-label">${escapeHtml(display.get(k))}</span>
            <span class="cat-count">${c}</span>
          </div>
        `).join('')}
      </div>
    `;
    const search = document.getElementById('cat-search');
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      document.querySelectorAll('#cat-list .cat-row').forEach(r => {
        r.style.display = (!q || r.dataset.tag.includes(q)) ? '' : 'none';
      });
    });
    document.querySelectorAll('#cat-list .cat-row').forEach(r => {
      r.addEventListener('click', () => renderPeople(r.dataset.tag));
    });
  }

  function renderPeople(tag) {
    const people = data.nodes
      .filter(n => (n.tags || []).some(t => String(t).toLowerCase() === tag))
      .sort((a, b) => (b.message_count || 0) - (a.message_count || 0) || a.name.localeCompare(b.name));

    graphCtl.setHighlight(people.map(p => p.id));
    setTimeout(() => {
      graphCtl.instance.zoomToFit(700, 100, n => people.some(p => p.id === n.id));
    }, 60);

    body.innerHTML = `
      <div class="panel-head">
        <button class="back-btn" id="back-cat">← Назад к категориям</button>
        <div class="panel-title">${escapeHtml(display.get(tag))}</div>
        <div class="panel-subtitle">${people.length} ${plural(people.length, 'человек', 'человека', 'человек')} с этим тегом</div>
      </div>
      <div class="people-list">
        ${people.map(p => `
          <div class="person-row" data-id="${escapeAttr(p.id)}">
            <span class="profile-avatar conn-avatar" style="${avatarColor(p.role)}">${escapeHtml(p.avatar_initials)}</span>
            <div class="person-meta">
              <div class="person-name">${escapeHtml(p.name)}</div>
              <div class="person-sub">
                ${p.telegram ? '@' + escapeHtml(p.telegram) : '<em>нет username</em>'}
                ${p.city ? ' · ' + escapeHtml(p.city) : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    document.getElementById('back-cat').addEventListener('click', renderList);
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
