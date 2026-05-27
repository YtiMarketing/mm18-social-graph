import { topRecommendations } from './recommendations.js';

const ROLE_LABELS = {
  participant: 'Участник',
  mentor: 'Ментор',
  organizer: 'Организатор',
};

function nodeColorClass(role, isSelf) {
  if (isSelf) return 'background:#ffae42';
  if (role === 'organizer') return 'background:#a155b9';
  if (role === 'mentor') return 'background:#00c853';
  return 'background:#4a90d9';
}

export function openSidebar(node, data, selfId) {
  const sb = document.getElementById('sidebar');
  const body = document.getElementById('sidebar-body');

  const isSelf = node.id === selfId;
  const tgUrl = node.telegram ? `https://t.me/${node.telegram}` : '#';

  const tagsHtml = (node.tags || []).map(t => `<span class="pill">${escapeHtml(t)}</span>`).join('');
  const requestHtml = (node.request || []).length
    ? `<div style="margin-top:8px"><strong>Ищет:</strong> ${node.request.map(r => `<span class="pill">${escapeHtml(r)}</span>`).join('')}</div>`
    : '';
  const offerHtml = (node.offer || []).length
    ? `<div style="margin-top:8px"><strong>Предлагает:</strong> ${node.offer.map(r => `<span class="pill">${escapeHtml(r)}</span>`).join('')}</div>`
    : '';

  let recsHtml = '';
  if (isSelf || selfId) {
    const recs = topRecommendations(node, data, 3);
    if (recs.length > 0) {
      recsHtml = `
        <div style="margin-top:24px">
          <div class="recs-title">Стоит познакомиться</div>
          ${recs.map(r => `
            <div class="rec-card" data-rec-id="${escapeHtml(r.node.id)}">
              <div class="rec-name">${escapeHtml(r.node.name)} <span style="color:#ff6b00">★ ${r.score}/10</span></div>
              <div class="rec-reason">${escapeHtml(r.reason)}</div>
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  body.innerHTML = `
    <div>
      <span class="profile-avatar" style="${nodeColorClass(node.role, isSelf)}">${escapeHtml(node.avatar_initials)}</span>
      <span class="profile-name">${escapeHtml(node.name)}</span>
      <div class="profile-tg">
        ${node.telegram ? `<a href="${tgUrl}" target="_blank">@${escapeHtml(node.telegram)}</a>` : '<em>нет username</em>'}
      </div>
    </div>
    ${node.telegram ? `<a class="btn-write" href="${tgUrl}" target="_blank">Написать в Telegram</a>` : ''}
    <div>
      <span class="pill role">${ROLE_LABELS[node.role] || 'Участник'}</span>
      ${node.city ? `<span class="pill">📍 ${escapeHtml(node.city)}</span>` : ''}
      ${node.role_text ? `<span class="pill">${escapeHtml(node.role_text)}</span>` : ''}
    </div>
    <div style="margin-top:12px">${tagsHtml}</div>
    ${requestHtml}
    ${offerHtml}
    ${node.bio ? `<div class="profile-bio">${escapeHtml(node.bio)}</div>` : ''}
    ${recsHtml}
  `;

  // Wire up recommendation clicks
  body.querySelectorAll('.rec-card').forEach(card => {
    card.addEventListener('click', () => {
      const targetId = card.dataset.recId;
      const targetNode = data.nodes.find(n => n.id === targetId);
      if (targetNode) openSidebar(targetNode, data, selfId);
    });
  });

  sb.classList.remove('hidden');
}

export function closeSidebar() {
  document.getElementById('sidebar').classList.add('hidden');
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
