import { initSplash, resolveSelf, setStoredSelfId } from './splash.js';
import { createGraph } from './graph.js';
import { openSidebar, closeSidebar } from './sidebar.js';
import { initSearch } from './search.js';
import { initFilters } from './filters.js';
import { initStars } from './stars.js';
import { openCategoriesPanel } from './categories.js';
import { openRatingPanel } from './rating.js';
import { openCitiesPanel } from './cities.js';
import { openTopMatchesPanel } from './top-matches.js';

// URL-state: ?p=<id> открывает профиль по deep link; ?p=<id>&self=<id> — открыть как себя.
// Это позволяет шарить ссылки на конкретных людей в чате.
function parseUrlState() {
  const params = new URLSearchParams(location.search);
  return {
    profileId: params.get('p'),
    selfOverride: params.get('self'),
  };
}

function setUrlProfile(id) {
  const params = new URLSearchParams(location.search);
  if (id) params.set('p', id); else params.delete('p');
  const qs = params.toString();
  const url = location.pathname + (qs ? '?' + qs : '');
  history.replaceState(null, '', url);
}

async function main() {
  initStars();

  const dataRes = await fetch('./data/participants.json');
  const data = await dataRes.json();

  const urlState = parseUrlState();

  let selfId;
  if (urlState.selfOverride) {
    const node = resolveSelf(data.nodes, urlState.selfOverride);
    selfId = node?.id || null;
    setStoredSelfId(selfId);
    // Скрыть splash сразу
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('header').classList.remove('hidden');
    document.getElementById('graph').classList.remove('hidden');
    document.getElementById('legend').classList.remove('hidden');
  } else {
    const { selfId: query } = await initSplash(data.nodes);
    const selfNode = resolveSelf(data.nodes, query);
    selfId = selfNode?.id || null;
  }

  document.getElementById('counter-participants').textContent = `${data.nodes.length} участников`;
  document.getElementById('counter-links').textContent = `${data.links.length} связей`;

  const container = document.getElementById('graph');

  // Открытие профиля — единая точка, чтобы синхронизировать URL.
  const openProfile = (node) => {
    setUrlProfile(node.id);
    openSidebar(node, data, selfId);
  };

  const graph = createGraph(container, data, selfId, openProfile);

  initSearch(graph, data, selfId, openProfile);
  const filters = initFilters(graph, data, selfId);

  document.getElementById('city-btn').addEventListener('click', () => {
    openCitiesPanel(data, graph, openProfile);
  });
  document.getElementById('categories-btn').addEventListener('click', () => {
    openCategoriesPanel(data, graph, openProfile);
  });
  document.getElementById('rating-btn').addEventListener('click', () => {
    openRatingPanel(data, graph, openProfile);
  });

  document.getElementById('sidebar-close').addEventListener('click', () => {
    closeSidebar();
    graph.clearHighlight();
    filters.resetToAll();
    setUrlProfile(null);
  });

  const switchBtn = document.getElementById('switch-self-btn');
  if (selfId) switchBtn.classList.remove('hidden');
  switchBtn.addEventListener('click', () => {
    setStoredSelfId(null);
    location.reload();
  });

  // Если URL содержит ?p=<id> — открываем сразу этот профиль (deep link),
  // НЕ показывая «Топ-3» (предполагаем, что юзер пришёл по ссылке)
  if (urlState.profileId) {
    const target = data.nodes.find(n => n.id === urlState.profileId);
    if (target) {
      setTimeout(() => {
        if (target.x != null) {
          graph.instance.centerAt(target.x, target.y, 1500);
          graph.instance.zoom(2, 1500);
        }
        openSidebar(target, data, selfId);
      }, 1500);
      return;
    }
  }

  // Иначе: если selfId есть и не было deep-link — показываем «Топ-3 знакомств»
  // как стартовую панель. Граф пользователь увидит после её закрытия.
  if (selfId) {
    const selfNode = data.nodes.find(n => n.id === selfId);
    setTimeout(() => {
      if (selfNode && selfNode.x != null) {
        graph.instance.centerAt(selfNode.x, selfNode.y, 1500);
        graph.instance.zoom(1.5, 1500);
      }
      openTopMatchesPanel(selfNode, data, graph, openProfile);
    }, 1500);
  }
}

main().catch(err => {
  console.error('Graph init failed:', err);
  document.body.innerHTML = `
    <div style="padding:40px;max-width:560px;margin:80px auto;color:#e8e8ee;background:rgba(20,18,35,0.9);border-radius:12px;text-align:center;">
      <h2 style="color:#ff6b00;margin-top:0">Не удалось загрузить граф</h2>
      <p style="color:#b0b0c0">Попробуй обновить страницу. Если не помогло — напиши Александру.</p>
      <details style="margin-top:20px;text-align:left;color:#8e8ea0;font-size:12px;">
        <summary style="cursor:pointer">Технические детали</summary>
        <pre style="white-space:pre-wrap;margin-top:8px">${err.message}</pre>
      </details>
    </div>`;
});
