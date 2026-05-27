// Управляет видимостью узлов и рёбер через ForceGraph API:
// .nodeVisibility(node => boolean), .linkVisibility(link => boolean)
export function initFilters(graphCtl, data, selfId) {
  const buttons = document.querySelectorAll('.filter-btn');
  let activeFilter = 'all';

  function applyFilter() {
    const fg = graphCtl.instance;
    if (activeFilter === 'all') {
      fg.nodeVisibility(() => true);
      // По умолчанию прячем weak — их слишком много (любой общий тег = связь),
      // граф становится сплошным комом. Strong и medium дают осмысленную картину.
      fg.linkVisibility(l => l.type !== 'weak');
      return;
    }
    if (activeFilter === 'mine') {
      if (!selfId) {
        // Нет self — показываем всё
        fg.nodeVisibility(() => true);
        fg.linkVisibility(() => true);
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
    // 'categories' — пока: показываем placeholder через alert.
    // TODO: реализовать выпадающее меню тегов в следующей итерации (после показа продукта Александру).
    alert('Фильтр по категориям — будет в следующей итерации');
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      applyFilter();
    });
  });
}
