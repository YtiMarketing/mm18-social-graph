import { openSidebar } from './sidebar.js';

// Возвращает функцию-инициализатор поиска.
// graphCtl — то, что вернул createGraph() (имеет setHighlight/clearHighlight + instance)
export function initSearch(graphCtl, data, selfId) {
  const input = document.getElementById('search');

  function matches(node, q) {
    const ql = q.toLowerCase().replace(/^@/, '');
    if (node.name.toLowerCase().includes(ql)) return true;
    if (node.id.toLowerCase().includes(ql)) return true;
    if (node.telegram && node.telegram.toLowerCase().includes(ql)) return true;
    if (node.role_text && node.role_text.toLowerCase().includes(ql)) return true;
    if ((node.tags || []).some(t => t.toLowerCase().includes(ql))) return true;
    if (node.city && node.city.toLowerCase().includes(ql)) return true;
    return false;
  }

  function bestMatch(q) {
    const ql = q.toLowerCase().replace(/^@/, '');
    // Точное совпадение по username (id) — приоритет
    const exact = data.nodes.find(n => n.id.toLowerCase() === ql);
    if (exact) return exact;
    // Подстрока имени
    return data.nodes.find(n => matches(n, q)) || null;
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
      return;
    }
    if (e.key === 'Enter') {
      const q = input.value.trim();
      if (!q) return;
      const node = bestMatch(q);
      if (!node) return;
      // Центрируем камеру + открываем сайдбар. Если у ноды ещё нет координат
      // (свежие данные / симуляция не сошлась) — даём симуляции тик.
      const open = () => {
        if (node.x != null) {
          graphCtl.instance.centerAt(node.x, node.y, 800);
          graphCtl.instance.zoom(2.5, 800);
        }
        openSidebar(node, data, selfId);
      };
      if (node.x == null) setTimeout(open, 200);
      else open();
    }
  });
}
