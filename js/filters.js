// Управляет видимостью узлов и рёбер через ForceGraph API.
// Фильтры: all | mine | category:<tag>
export function initFilters(graphCtl, data, selfId) {
  const buttons = document.querySelectorAll('.filter-btn[data-filter]');
  const categoriesBtn = document.getElementById('categories-btn');
  const categoriesMenu = document.getElementById('categories-menu');
  let activeFilter = 'all';
  let activeCategory = null;

  // Считаем топ-тегов по частоте употребления в data
  function buildTagIndex() {
    const counts = new Map();
    for (const n of data.nodes) {
      for (const t of (n.tags || [])) {
        const k = String(t).trim().toLowerCase();
        if (!k) continue;
        counts.set(k, (counts.get(k) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .filter(([, c]) => c >= 2); // показываем теги встречающиеся хотя бы у двух
  }

  function renderCategoriesMenu() {
    const tags = buildTagIndex();
    const items = tags.map(([t, c]) => `
      <div class="cat-item${activeCategory === t ? ' active' : ''}" data-tag="${escapeAttr(t)}">
        <span>${escapeHtml(t)}</span>
        <span class="cat-count">${c}</span>
      </div>
    `).join('');
    categoriesMenu.innerHTML = items + (activeCategory
      ? `<div class="cat-item cat-reset" data-tag="">Сбросить категорию</div>`
      : '');
    categoriesMenu.querySelectorAll('.cat-item').forEach(item => {
      item.addEventListener('click', () => {
        const t = item.dataset.tag;
        activeCategory = t || null;
        applyFilter();
        renderCategoriesMenu(); // обновить активный пункт
        categoriesMenu.classList.add('hidden');
      });
    });
  }

  function applyFilter() {
    const fg = graphCtl.instance;
    if (activeFilter === 'all' && !activeCategory) {
      fg.nodeVisibility(() => true);
      fg.linkVisibility(l => l.type !== 'weak');
      return;
    }
    if (activeFilter === 'mine') {
      if (!selfId) {
        fg.nodeVisibility(() => true);
        fg.linkVisibility(l => l.type !== 'weak');
        return;
      }
      const myNeighbors = new Set([selfId]);
      for (const l of data.links) {
        const sId = typeof l.source === 'object' ? l.source.id : l.source;
        const tId = typeof l.target === 'object' ? l.target.id : l.target;
        if (sId === selfId) myNeighbors.add(tId);
        if (tId === selfId) myNeighbors.add(sId);
      }
      fg.nodeVisibility(n => myNeighbors.has(n.id));
      fg.linkVisibility(l => {
        const sId = typeof l.source === 'object' ? l.source.id : l.source;
        const tId = typeof l.target === 'object' ? l.target.id : l.target;
        return sId === selfId || tId === selfId;
      });
      return;
    }
    if (activeFilter === 'categories' && activeCategory) {
      const cat = activeCategory;
      const matchingIds = new Set(
        data.nodes
          .filter(n => (n.tags || []).some(t => String(t).toLowerCase() === cat))
          .map(n => n.id)
      );
      fg.nodeVisibility(n => matchingIds.has(n.id));
      fg.linkVisibility(l => {
        if (l.type === 'weak') return false;
        const sId = typeof l.source === 'object' ? l.source.id : l.source;
        const tId = typeof l.target === 'object' ? l.target.id : l.target;
        return matchingIds.has(sId) && matchingIds.has(tId);
      });
      // Перецентрируем камеру на видимые ноды через короткую паузу
      setTimeout(() => fg.zoomToFit(600, 80, n => matchingIds.has(n.id)), 50);
      return;
    }
    // categories выбран, но категория не задана — показываем всё (effective same as all)
    fg.nodeVisibility(() => true);
    fg.linkVisibility(l => l.type !== 'weak');
  }

  // Toggle dropdown на клик «Категории»
  categoriesBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    buttons.forEach(b => b.classList.remove('active'));
    categoriesBtn.classList.add('active');
    activeFilter = 'categories';
    if (categoriesMenu.classList.contains('hidden')) {
      renderCategoriesMenu();
      categoriesMenu.classList.remove('hidden');
    } else {
      categoriesMenu.classList.add('hidden');
    }
    applyFilter();
  });

  // Закрыть dropdown по клику вне
  document.addEventListener('click', (e) => {
    if (!categoriesMenu.contains(e.target) && e.target !== categoriesBtn) {
      categoriesMenu.classList.add('hidden');
    }
  });

  // Кнопки all / mine
  buttons.forEach(btn => {
    if (btn.id === 'categories-btn') return;
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      activeCategory = null;
      categoriesMenu.classList.add('hidden');
      applyFilter();
    });
  });

  // Стартовое состояние
  applyFilter();
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }
