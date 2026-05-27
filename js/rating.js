// Панель «Рейтинг». Три секции:
//   - Центральные хабы — топ по числу связей
//   - Мосты между кластерами — ноды с самым широким разнообразием тегов соседей
//   - Скрытые жемчужины — высокая ценность (много offer/request) при низком degree
//
// Все три считаются на клиенте на основе data.links. Не нужны бэкенд-агрегации.

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

function computeStats(data) {
  // degree (только strong+medium — weak уже не существуют, но оставим для совместимости)
  const adj = new Map(); // id → Set of neighbor ids
  const tagsOf = new Map(); // id → Set of normalized tags
  for (const n of data.nodes) {
    adj.set(n.id, new Set());
    tagsOf.set(n.id, new Set((n.tags || []).map(t => String(t).toLowerCase())));
  }
  for (const l of data.links) {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    if (adj.has(s)) adj.get(s).add(t);
    if (adj.has(t)) adj.get(t).add(s);
  }

  const stats = data.nodes.map(n => {
    const neighbors = adj.get(n.id) || new Set();
    const degree = neighbors.size;
    // diversity = число различных тегов среди соседей (не считая собственные)
    const ownTags = tagsOf.get(n.id);
    const neighborTags = new Set();
    for (const nid of neighbors) {
      const nt = tagsOf.get(nid);
      if (nt) for (const t of nt) if (!ownTags.has(t)) neighborTags.add(t);
    }
    const diversity = neighborTags.size;
    // value = offer + request length (готовность давать и просить — индикатор ценности для нетворкинга)
    const value = (n.offer || []).length + (n.request || []).length;
    return { node: n, degree, diversity, value };
  });

  // Хабы: топ-10 по degree
  const hubs = [...stats].sort((a, b) => b.degree - a.degree).slice(0, 10);
  // Мосты: топ-10 по diversity (с минимальным degree чтобы не было одиночек)
  const bridges = [...stats].filter(s => s.degree >= 3).sort((a, b) => b.diversity - a.diversity).slice(0, 10);
  // Жемчужины: высокая value при низком degree
  const pearls = [...stats]
    .filter(s => s.degree > 0 && s.degree <= 8 && s.value >= 2)
    .sort((a, b) => (b.value / Math.max(b.degree, 1)) - (a.value / Math.max(a.degree, 1)))
    .slice(0, 8);

  return { hubs, bridges, pearls };
}

export function openRatingPanel(data, graphCtl, onPersonClick) {
  const { hubs, bridges, pearls } = computeStats(data);
  const sb = document.getElementById('sidebar');
  const body = document.getElementById('sidebar-body');

  function section(title, subtitle, items, metricLabel, metricKey, highlightColor) {
    return `
      <div class="rating-section">
        <div class="rating-section-title">${escapeHtml(title)}</div>
        <div class="rating-section-sub">${escapeHtml(subtitle)}</div>
        ${items.map((it, i) => `
          <div class="rating-row" data-id="${escapeAttr(it.node.id)}" data-color="${highlightColor}">
            <span class="rating-rank">${i + 1}</span>
            <span class="profile-avatar conn-avatar" style="${avatarColor(it.node.role)}">${escapeHtml(it.node.avatar_initials)}</span>
            <div class="rating-meta">
              <div class="rating-name">${escapeHtml(it.node.name)}</div>
              <div class="rating-detail">${it.node.role_text ? escapeHtml(it.node.role_text) : (it.node.city ? escapeHtml(it.node.city) : '')}</div>
            </div>
            <div class="rating-metric">${it[metricKey]} <span>${escapeHtml(metricLabel)}</span></div>
          </div>
        `).join('')}
      </div>
    `;
  }

  body.innerHTML = `
    <div class="panel-head">
      <div class="panel-title">РЕЙТИНГ</div>
      <div class="panel-subtitle">кто в центре, кто связывает, кого недооценили</div>
    </div>
    ${section('Центральные хабы', 'Больше всех связей в графе', hubs, 'связей', 'degree', 'amber')}
    ${section('Мосты между кластерами', 'Соседи с самым разным набором тем', bridges, 'разных тем у соседей', 'diversity', 'purple')}
    ${section('Скрытые жемчужины', 'Много готовности обмениваться при малом количестве связей', pearls, 'offer+request', 'value', 'green')}
  `;

  function applyHighlight(group, color) {
    graphCtl.setHighlight(group.map(g => g.node.id));
    // Мы могли бы менять цвет halo — но проще оставить дефолтные цвета,
    // dimmed остальных уже даёт фокус. (TODO: tinted halo по color если будет нужно.)
  }

  document.querySelectorAll('.rating-row').forEach(row => {
    row.addEventListener('mouseenter', () => {
      const id = row.dataset.id;
      graphCtl.setHighlight([id]);
    });
    row.addEventListener('mouseleave', () => {
      graphCtl.clearHighlight();
    });
    row.addEventListener('click', () => {
      const node = data.nodes.find(n => n.id === row.dataset.id);
      if (node && onPersonClick) onPersonClick(node);
    });
  });

  // По умолчанию подсветим первую категорию (хабы)
  void applyHighlight;
  sb.classList.remove('hidden');
}
