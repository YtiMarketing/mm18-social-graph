import { initSplash, resolveSelf, setStoredSelfId } from './splash.js';
import { createGraph } from './graph.js';
import { openSidebar, closeSidebar } from './sidebar.js';
import { initSearch } from './search.js';
import { initFilters } from './filters.js';
import { initStars } from './stars.js';
import { openCategoriesPanel } from './categories.js';
import { openRatingPanel } from './rating.js';

async function main() {
  initStars();

  const dataRes = await fetch('./data/participants.json');
  const data = await dataRes.json();

  const { selfId: query } = await initSplash(data.nodes);
  const selfNode = resolveSelf(data.nodes, query);
  const selfId = selfNode?.id || null;

  document.getElementById('counter-participants').textContent = `${data.nodes.length} участников`;
  document.getElementById('counter-links').textContent = `${data.links.length} связей`;

  const container = document.getElementById('graph');
  const graph = createGraph(container, data, selfId, node => {
    openSidebar(node, data, selfId);
  });

  initSearch(graph, data, selfId);
  const filters = initFilters(graph, data, selfId);

  // Кнопки правых панелей переключают режим sidebar'а
  document.getElementById('categories-btn').addEventListener('click', () => {
    openCategoriesPanel(data, graph, (person) => openSidebar(person, data, selfId));
  });
  document.getElementById('rating-btn').addEventListener('click', () => {
    openRatingPanel(data, graph, (person) => openSidebar(person, data, selfId));
  });

  document.getElementById('sidebar-close').addEventListener('click', () => {
    closeSidebar();
    graph.clearHighlight();
    filters.resetToAll();
  });

  // Кнопка «сменить я» — видна только если selfId сохранён
  const switchBtn = document.getElementById('switch-self-btn');
  if (selfId) switchBtn.classList.remove('hidden');
  switchBtn.addEventListener('click', () => {
    setStoredSelfId(null);
    location.reload();
  });

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
