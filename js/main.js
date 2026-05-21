import { initSplash, resolveSelf } from './splash.js';
import { createGraph } from './graph.js';
import { openSidebar, closeSidebar } from './sidebar.js';
import { initSearch } from './search.js';
import { initFilters } from './filters.js';

async function main() {
  const dataRes = await fetch('./data/participants.json');
  const data = await dataRes.json();

  const { selfId: query } = await initSplash();
  const selfNode = resolveSelf(data.nodes, query);
  const selfId = selfNode?.id || null;

  // counters
  document.getElementById('counter-participants').textContent = `${data.nodes.length} участников`;
  document.getElementById('counter-links').textContent = `${data.links.length} связей`;

  const container = document.getElementById('graph');
  const graph = createGraph(container, data, selfId, node => {
    openSidebar(node, data, selfId);
  });

  initSearch(graph, data);
  initFilters(graph, data, selfId);

  document.getElementById('sidebar-close').addEventListener('click', closeSidebar);

  // Если есть self — центрируемся на нём через 1 сек
  if (selfNode) {
    setTimeout(() => {
      const live = data.nodes.find(n => n.id === selfId);
      if (live && live.x != null) {
        graph.instance.centerAt(live.x, live.y, 1500);
        graph.instance.zoom(1.5, 1500);
        openSidebar(live, data, selfId);
      }
    }, 1500);
  }
}

main().catch(err => {
  console.error('Graph init failed:', err);
  document.body.innerHTML = `<div style="padding:40px;color:#e8e8ee">Ошибка загрузки графа: ${err.message}</div>`;
});
