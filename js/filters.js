// Управляет фильтрами видимости. Только «Все связи» и «Мои связи» —
// категории/рейтинг живут в отдельных панелях (categories.js, rating.js).
export function initFilters(graphCtl, data, selfId) {
  const buttons = document.querySelectorAll('.filter-btn[data-filter]');
  let activeFilter = 'all';

  function applyFilter() {
    const fg = graphCtl.instance;
    if (activeFilter === 'all') {
      fg.nodeVisibility(() => true);
      fg.linkVisibility(l => l.type !== 'weak');
      graphCtl.clearHighlight();
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
    }
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      applyFilter();
    });
  });

  applyFilter();
  return {
    resetToAll() {
      buttons.forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
      activeFilter = 'all';
      applyFilter();
    }
  };
}
