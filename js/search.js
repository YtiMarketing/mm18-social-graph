import { openSidebar } from './sidebar.js';

// Поиск в шапке с autocomplete-дропдауном (как на splash-странице).
// Подсветка по графу остаётся: набрал q → подсвечены все совпадения.
// Выбор из списка (клик / Enter на активном пункте) → центруем камеру + sidebar.
// openProfileFn — необязательный callback (main.js пробрасывает свою обёртку,
// которая ещё пишет URL-state). Если не передан — используем openSidebar напрямую.
export function initSearch(graphCtl, data, selfId, openProfileFn) {
  const openProfile = openProfileFn || ((node) => openSidebar(node, data, selfId));
  const input = document.getElementById('search');
  const suggestBox = document.getElementById('search-suggest');

  let activeIdx = -1;
  let lastHits = [];

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

  function rankHits(q) {
    const ql = q.toLowerCase().replace(/^@/, '');
    const scored = [];
    for (const n of data.nodes) {
      if (!matches(n, q)) continue;
      // Скоринг: точные совпадения username/имени выше, потом начало строки, потом подстрока.
      let score = 0;
      if (n.id.toLowerCase() === ql) score += 100;
      if (n.telegram?.toLowerCase() === ql) score += 90;
      if (n.name.toLowerCase() === ql) score += 80;
      if (n.name.toLowerCase().startsWith(ql)) score += 40;
      if (n.id.toLowerCase().startsWith(ql)) score += 30;
      score += (n.degree || 0) * 0.1; // лёгкий буст по degree
      scored.push({ n, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 8).map(s => s.n);
  }

  function renderSuggestions(q) {
    if (!q || q.length < 1) {
      suggestBox.classList.add('hidden');
      lastHits = [];
      activeIdx = -1;
      return;
    }
    const hits = rankHits(q);
    lastHits = hits;
    activeIdx = hits.length > 0 ? 0 : -1;
    if (hits.length === 0) {
      suggestBox.innerHTML = `<div class="suggest-item"><span class="suggest-name muted">Никого не нашёл</span></div>`;
      suggestBox.classList.remove('hidden');
      return;
    }
    suggestBox.innerHTML = hits.map((n, i) => `
      <div class="suggest-item${i === 0 ? ' active' : ''}" data-id="${escapeAttr(n.id)}" data-idx="${i}">
        <span class="suggest-name">${escapeHtml(n.name)}</span>
        <span class="suggest-tg">${n.telegram ? '@' + escapeHtml(n.telegram) : escapeHtml(n.role_text || '')}</span>
      </div>
    `).join('');
    suggestBox.classList.remove('hidden');
    suggestBox.querySelectorAll('.suggest-item[data-id]').forEach(it => {
      it.addEventListener('mousedown', e => {
        e.preventDefault(); // чтобы input не терял фокус до клика
        selectNode(it.dataset.id);
      });
      it.addEventListener('mouseenter', () => {
        activeIdx = Number(it.dataset.idx);
        updateActive();
      });
    });
  }

  function updateActive() {
    suggestBox.querySelectorAll('.suggest-item').forEach((it, i) => {
      it.classList.toggle('active', i === activeIdx);
    });
    const active = suggestBox.querySelector('.suggest-item.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  function selectNode(id) {
    const node = data.nodes.find(n => n.id === id);
    if (!node) return;
    input.value = node.name;
    suggestBox.classList.add('hidden');
    // Подсветка на графе через filters не трогаем — здесь точечный фокус
    graphCtl.clearHighlight();
    const focus = () => {
      if (node.x != null && Number.isFinite(node.x)) {
        graphCtl.instance.centerAt(node.x, node.y, 800);
        graphCtl.instance.zoom(2.5, 800);
      }
      openProfile(node);
    };
    if (node.x == null) setTimeout(focus, 200);
    else focus();
  }

  input.addEventListener('input', () => {
    const q = input.value.trim();
    renderSuggestions(q);
    // Подсветка совпадений как раньше
    if (!q) {
      graphCtl.clearHighlight();
    } else {
      const ids = data.nodes.filter(n => matches(n, q)).map(n => n.id);
      graphCtl.setHighlight(ids);
    }
  });

  input.addEventListener('focus', () => {
    if (input.value.trim()) renderSuggestions(input.value.trim());
  });

  input.addEventListener('blur', () => {
    // Скрываем с небольшой задержкой, чтобы успел отработать клик по item
    setTimeout(() => suggestBox.classList.add('hidden'), 120);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      input.value = '';
      graphCtl.clearHighlight();
      suggestBox.classList.add('hidden');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (lastHits.length === 0) return;
      activeIdx = (activeIdx + 1) % lastHits.length;
      updateActive();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (lastHits.length === 0) return;
      activeIdx = (activeIdx - 1 + lastHits.length) % lastHits.length;
      updateActive();
      return;
    }
    if (e.key === 'Enter') {
      if (activeIdx >= 0 && lastHits[activeIdx]) {
        selectNode(lastHits[activeIdx].id);
      }
    }
  });

  // Клик вне дропдауна — закрыть
  document.addEventListener('mousedown', e => {
    if (!suggestBox.contains(e.target) && e.target !== input) {
      suggestBox.classList.add('hidden');
    }
  });
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }
