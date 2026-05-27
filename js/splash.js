// Splash с автокомплитом по participants.json.
// При вводе показываем выпадающий список совпадений по name/username/role_text.
// На выбор пользователя → finish(selectedId). Можно ввести вручную и нажать Enter.
export function initSplash(nodes = []) {
  return new Promise(resolve => {
    const splash = document.getElementById('splash');
    const input = document.getElementById('splash-input');
    const enterBtn = document.getElementById('splash-enter');
    const skipBtn = document.getElementById('splash-skip');
    const suggestBox = document.getElementById('splash-suggest');

    const finish = (selfId) => {
      splash.classList.add('hidden');
      document.getElementById('header').classList.remove('hidden');
      document.getElementById('graph').classList.remove('hidden');
      document.getElementById('legend').classList.remove('hidden');
      resolve({ selfId });
    };

    function renderSuggestions(q) {
      if (!q || q.length < 1) { suggestBox.classList.add('hidden'); return; }
      const ql = q.toLowerCase().replace(/^@/, '');
      const hits = nodes
        .filter(n =>
          n.id.toLowerCase().includes(ql) ||
          n.name.toLowerCase().includes(ql) ||
          (n.telegram && n.telegram.toLowerCase().includes(ql))
        )
        .slice(0, 6);
      if (hits.length === 0) { suggestBox.classList.add('hidden'); return; }
      suggestBox.innerHTML = hits.map(n => `
        <div class="suggest-item" data-id="${escapeAttr(n.id)}">
          <span class="suggest-name">${escapeHtml(n.name)}</span>
          ${n.telegram ? `<span class="suggest-tg">@${escapeHtml(n.telegram)}</span>` : ''}
        </div>
      `).join('');
      suggestBox.classList.remove('hidden');
      suggestBox.querySelectorAll('.suggest-item').forEach(it => {
        it.addEventListener('click', () => finish(it.dataset.id));
      });
    }

    input.addEventListener('input', () => renderSuggestions(input.value.trim()));
    input.addEventListener('focus', () => renderSuggestions(input.value.trim()));

    enterBtn.addEventListener('click', () => {
      const raw = input.value.trim().replace(/^@/, '');
      finish(raw || null);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') enterBtn.click();
      if (e.key === 'Escape') suggestBox.classList.add('hidden');
    });
    skipBtn.addEventListener('click', () => finish(null));
  });
}

// Найти узел по введённому значению (username или имя)
export function resolveSelf(nodes, query) {
  if (!query) return null;
  const q = query.toLowerCase();
  return nodes.find(n =>
    n.id.toLowerCase() === q ||
    n.telegram?.toLowerCase() === q ||
    n.name.toLowerCase().includes(q)
  ) || null;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }
