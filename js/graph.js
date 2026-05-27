const ROLE_COLORS = {
  self: '#ffae42',          // янтарь — теплее жёсткого оранжа
  organizer: '#c87dff',     // мягкий лавандово-фиолетовый
  mentor: '#3fd5a0',        // мятно-зелёный
  participant: '#6aa9ff',   // светло-синий
};

const ROLE_GLOW = {
  self: 'rgba(255,174,66,0.9)',
  organizer: 'rgba(200,125,255,0.7)',
  mentor: 'rgba(63,213,160,0.7)',
  participant: 'rgba(106,169,255,0.55)',
};

const LINK_STYLE = {
  strong: { color: 'rgba(255,174,66,0.55)', width: 1.6, dash: [] },
  medium: { color: 'rgba(140,170,255,0.32)', width: 1.1, dash: [] },
  weak:   { color: 'rgba(220,220,255,0.10)', width: 0.7, dash: [4, 8] },
};

// Простая collision force без зависимости от глобального d3 (force-graph
// бандлит d3 внутрь). За один тик отталкиваем пары нод которые ближе чем
// сумма их радиусов. O(n^2) — для 80 нод это 3200 пар, нормально.
function makeCollideForce(radiusFn) {
  let nodes;
  function force(alpha) {
    const n = nodes.length;
    for (let i = 0; i < n; i++) {
      const a = nodes[i];
      const ra = radiusFn(a);
      for (let j = i + 1; j < n; j++) {
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        const minDist = ra + radiusFn(b);
        if (distSq < minDist * minDist && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const push = (minDist - dist) / dist * 0.5 * alpha;
          const pdx = dx * push;
          const pdy = dy * push;
          a.x -= pdx; a.y -= pdy;
          b.x += pdx; b.y += pdy;
        }
      }
    }
  }
  force.initialize = (n) => { nodes = n; };
  return force;
}

export function createGraph(container, data, selfId, onNodeClick) {
  // Помечаем self
  for (const n of data.nodes) {
    n.isSelf = (n.id === selfId);
  }

  // Считаем degree для размера узлов
  const degree = {};
  for (const l of data.links) {
    degree[l.source] = (degree[l.source] || 0) + 1;
    degree[l.target] = (degree[l.target] || 0) + 1;
  }
  for (const n of data.nodes) {
    n.degree = degree[n.id] || 0;
    n.val = 4 + Math.min(n.degree, 20) * 0.8;
  }

  let highlightNodes = new Set();
  let highlightLinks = new Set();

  // Pre-init позиций по золотой спирали — d3-force иначе ставит много нод
  // в (0,0), и с сильным charge симуляция получает деление на ноль → NaN
  // → cascade через линки → весь граф улетает в Infinity.
  const N = data.nodes.length;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const n = data.nodes[i];
    if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) {
      const r = 30 * Math.sqrt(i + 1);
      n.x = r * Math.cos(i * golden);
      n.y = r * Math.sin(i * golden);
      n.vx = 0;
      n.vy = 0;
    }
  }

  const graph = ForceGraph()(container)
    .backgroundColor('rgba(0,0,0,0)')
    .nodeId('id')
    .nodeVal('val')
    .nodeRelSize(4)
    .nodeLabel(n => `${n.name} (${n.role_text || n.role})`)
    .nodeCanvasObject((node, ctx, scale) => {
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
      const r = Math.sqrt(node.val) * 4;
      const roleKey = node.isSelf ? 'self' : (ROLE_COLORS[node.role] ? node.role : 'participant');
      const color = ROLE_COLORS[roleKey];
      const glow = ROLE_GLOW[roleKey];
      const dimmed = highlightNodes.size > 0 && !highlightNodes.has(node.id);

      ctx.globalAlpha = dimmed ? 0.12 : 1;

      // Внешний halo — мягкое свечение, но небольшое чтобы ноды не сливались
      const haloR = r * (node.isSelf ? 2.6 : 1.9);
      const halo = ctx.createRadialGradient(node.x, node.y, r * 0.6, node.x, node.y, haloR);
      halo.addColorStop(0, glow);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(node.x, node.y, haloR, 0, 2 * Math.PI);
      ctx.fill();

      // Основной круг ноды + shadow для дополнительного «звёздного» свечения
      ctx.shadowBlur = node.isSelf ? 18 : 10;
      ctx.shadowColor = glow;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Тонкий лайт-обводка
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Инициалы
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = `bold ${Math.max(8, r * 0.7)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.avatar_initials || '??', node.x, node.y);

      // Подпись имени под узлом — всегда видна (как в MM17 reference)
      ctx.fillStyle = 'rgba(232,232,238,0.85)';
      ctx.font = `${Math.max(9, 10 / Math.max(scale, 0.6))}px sans-serif`;
      ctx.fillText(node.name.split(' ')[0], node.x, node.y + r + 11);
      ctx.globalAlpha = 1;
    })
    .linkCanvasObject((link, ctx) => {
      const s = link.source, t = link.target;
      if (!Number.isFinite(s?.x) || !Number.isFinite(s?.y) ||
          !Number.isFinite(t?.x) || !Number.isFinite(t?.y)) return;
      const style = LINK_STYLE[link.type] || LINK_STYLE.weak;
      const dimmed = highlightLinks.size > 0 && !highlightLinks.has(link);
      ctx.globalAlpha = dimmed ? 0.05 : 1;
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.width;
      ctx.setLineDash(style.dash);
      ctx.beginPath();
      ctx.moveTo(link.source.x, link.source.y);
      ctx.lineTo(link.target.x, link.target.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    })
    .onNodeClick(n => {
      if (onNodeClick) onNodeClick(n);
      // Center on node
      graph.centerAt(n.x, n.y, 600);
      graph.zoom(2, 600);
    })
    .onNodeHover(n => {
      highlightNodes = new Set();
      highlightLinks = new Set();
      if (n) {
        highlightNodes.add(n.id);
        for (const l of data.links) {
          const sId = typeof l.source === 'object' ? l.source.id : l.source;
          const tId = typeof l.target === 'object' ? l.target.id : l.target;
          if (sId === n.id || tId === n.id) {
            highlightLinks.add(l);
            highlightNodes.add(sId);
            highlightNodes.add(tId);
          }
        }
      }
    });

  // Силы конфигурируются после graphData(). Pre-init позиций (выше) защищает
  // от NaN-каскада, который раньше срывал рендер при сильном charge.
  graph.warmupTicks(120);
  graph.d3VelocityDecay(0.45);
  graph.graphData(data);

  graph.d3Force('charge').strength(-600).distanceMax(1400);
  graph.d3Force('link')
    .distance(l => l.type === 'strong' ? 140 : 280)
    .strength(l => l.type === 'strong' ? 0.25 : 0.06);
  graph.d3Force('collide', makeCollideForce(n => Math.sqrt(n.val) * 4 * 3.0 + 14));

  setTimeout(() => graph.zoomToFit(800, 140), 900);

  return {
    instance: graph,
    setHighlight(nodeIds) {
      highlightNodes = new Set(nodeIds);
      highlightLinks = new Set();
    },
    clearHighlight() {
      highlightNodes = new Set();
      highlightLinks = new Set();
    },
  };
}
