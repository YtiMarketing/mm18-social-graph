// Возвращает функцию-инициализатор поиска.
// graphCtl — то, что вернул createGraph() (имеет setHighlight/clearHighlight)
export function initSearch(graphCtl, data) {
  const input = document.getElementById('search');

  function matches(node, q) {
    const ql = q.toLowerCase();
    if (node.name.toLowerCase().includes(ql)) return true;
    if (node.id.toLowerCase().includes(ql)) return true;
    if (node.telegram && node.telegram.toLowerCase().includes(ql)) return true;
    if (node.role_text && node.role_text.toLowerCase().includes(ql)) return true;
    if ((node.tags || []).some(t => t.toLowerCase().includes(ql))) return true;
    if (node.city && node.city.toLowerCase().includes(ql)) return true;
    return false;
  }

  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (!q) {
      graphCtl.clearHighlight();
    } else {
      const ids = data.nodes.filter(n => matches(n, q)).map(n => n.id);
      graphCtl.setHighlight(ids);
    }
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      input.value = '';
      graphCtl.clearHighlight();
    }
  });
}
