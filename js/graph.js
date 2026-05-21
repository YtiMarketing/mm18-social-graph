const ROLE_COLORS = {
  self: '#ff6b00',
  organizer: '#a155b9',
  mentor: '#00c853',
  participant: '#4a90d9',
};

const LINK_STYLE = {
  strong: { color: 'rgba(255,107,0,0.8)', width: 2, dash: [] },
  medium: { color: 'rgba(74,144,217,0.6)', width: 1.5, dash: [] },
  weak:   { color: 'rgba(255,255,255,0.3)', width: 1, dash: [5, 10] },
};

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

  const graph = ForceGraph()(container)
    .backgroundColor('#0a0a0f')
    .graphData(data)
    .nodeId('id')
    .nodeVal('val')
    .nodeRelSize(4)
    .nodeLabel(n => `${n.name} (${n.role_text || n.role})`)
    .nodeCanvasObject((node, ctx, scale) => {
      const r = Math.sqrt(node.val) * 4;
      const color = node.isSelf ? ROLE_COLORS.self : (ROLE_COLORS[node.role] || ROLE_COLORS.participant);
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      const dimmed = highlightNodes.size > 0 && !highlightNodes.has(node.id);
      ctx.globalAlpha = dimmed ? 0.1 : 1;
      ctx.fill();
      ctx.strokeStyle = '#0a0a0f';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Инициалы
      ctx.fillStyle = 'white';
      ctx.font = `bold ${Math.max(8, r * 0.7)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.avatar_initials || '??', node.x, node.y);

      // Подпись имени под узлом (только при достаточном zoom)
      if (scale > 1.2) {
        ctx.fillStyle = '#e8e8ee';
        ctx.font = '10px sans-serif';
        ctx.fillText(node.name.split(' ')[0], node.x, node.y + r + 8);
      }
      ctx.globalAlpha = 1;
    })
    .linkCanvasObject((link, ctx) => {
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

  graph.d3Force('charge').strength(-120);
  graph.d3Force('link').distance(80).strength(0.3);

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
