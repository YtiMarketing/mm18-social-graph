// Стартовая панель «Топ-3 знакомства на выезде».
// Главный пользовательский флоу: пришёл → ввёл имя → СРАЗУ видит,
// к кому подойти первым. Граф остаётся как разглядывание-карта.

import { topRecommendations } from './recommendations.js';

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }
function firstName(full) { return String(full || '').split(/\s+/)[0] || ''; }

function avatarColor(role, isSelf) {
  if (isSelf) return 'background:#ffae42';
  if (role === 'organizer') return 'background:#a155b9';
  if (role === 'mentor') return 'background:#00c853';
  return 'background:#4a90d9';
}

export function openTopMatchesPanel(selfNode, data, graphCtl, onPersonClick) {
  if (!selfNode) return;
  const sb = document.getElementById('sidebar');
  const body = document.getElementById('sidebar-body');

  const recs = topRecommendations(selfNode, data, 3);

  if (recs.length === 0) {
    body.innerHTML = `
      <div class="panel-head">
        <div class="panel-title">ПРИВЕТ, ${escapeHtml(firstName(selfNode.name).toUpperCase())}</div>
        <div class="panel-subtitle">Пока недостаточно данных, чтобы предложить знакомства</div>
      </div>
      <p class="empty">Заполни анкету полнее — добавь теги, запросы и предложения — и рекомендации появятся.</p>
    `;
    sb.classList.remove('hidden');
    return;
  }

  // Подсветим топ-3 на графе сразу
  graphCtl.setHighlight([selfNode.id, ...recs.map(r => r.node.id)]);

  body.innerHTML = `
    <div class="panel-head">
      <div class="panel-title">ТОП-3 ЗНАКОМСТВА</div>
      <div class="panel-subtitle">К кому подойти первым на выезде</div>
    </div>
    <p class="section-sub" style="margin-top:0">
      Рассчитано на основе твоих <strong>request</strong> / <strong>offer</strong> и тегов.
      Полный список — кнопкой «Все связи» сверху.
    </p>
    <div id="top-matches-list">
      ${recs.map((r, i) => renderTopCard(r, i, selfNode)).join('')}
    </div>
    <button class="back-btn" id="dismiss-top" style="margin-top:16px">Закрыть и смотреть граф →</button>
  `;

  document.getElementById('dismiss-top').addEventListener('click', () => {
    sb.classList.add('hidden');
    graphCtl.clearHighlight();
  });

  document.querySelectorAll('#top-matches-list [data-jump-id]').forEach(el => {
    el.addEventListener('click', (e) => {
      // Если клик по ссылке Telegram — не открывать профиль
      if (e.target.closest('a')) return;
      const id = el.dataset.jumpId;
      const node = data.nodes.find(n => n.id === id);
      if (node && onPersonClick) onPersonClick(node);
    });
  });

  sb.classList.remove('hidden');
}

function renderTopCard(r, idx, selfNode) {
  const tgUrl = r.node.telegram ? `https://t.me/${r.node.telegram}` : null;
  const rank = ['🥇', '🥈', '🥉'][idx] || `${idx + 1}.`;
  return `
    <div class="rec-card top-rec" data-jump-id="${escapeAttr(r.node.id)}">
      <div class="rec-head">
        <span class="profile-avatar conn-avatar" style="${avatarColor(r.node.role, false)}">${escapeHtml(r.node.avatar_initials)}</span>
        <div class="rec-meta">
          <div class="rec-name">
            <span>${rank} ${escapeHtml(r.node.name)}</span>
            <span class="rec-score">★ ${r.score}/10</span>
          </div>
          <div class="rec-role">${escapeHtml(r.node.role_text || r.node.city || '')}</div>
        </div>
      </div>
      ${r.introReason ? `<div class="rec-intro-reason">${escapeHtml(r.introReason)}</div>` : ''}
      ${r.theyHelpYou.length
        ? `<div class="rec-help-you">✅ <strong>Может помочь:</strong> ${escapeHtml(r.theyHelpYou.join(', '))}</div>`
        : ''}
      ${r.youHelpThem.length
        ? `<div class="rec-help-them">🤝 <strong>Чем ты пригодишься:</strong> ${escapeHtml(r.youHelpThem.join(', '))}</div>`
        : ''}
      ${tgUrl
        ? `<a class="rec-write" href="${tgUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Написать в Telegram</a>`
        : `<div class="rec-write" style="background:rgba(255,107,0,0.15);color:#ffcfa4;cursor:default">Подойти на выезде (нет @username)</div>`}
    </div>
  `;
}
