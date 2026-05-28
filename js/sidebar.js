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

// Запоминаем активный таб между перерисовками sidebar'а — иначе после открытия
// рекомендации/связи возвращается обратно в ОБЗОР, что бесит.
let activeTab = 'overview';

export function openSidebar(node, data, selfId) {
  const sb = document.getElementById('sidebar');
  const body = document.getElementById('sidebar-body');

  const isSelf = node.id === selfId;
  const tgUrl = node.telegram ? `https://t.me/${node.telegram}` : '#';

  // Считаем входящие связи и берём reasons + тип для табa СВЯЗИ
  const connections = [];
  for (const l of data.links) {
    const sId = typeof l.source === 'object' ? l.source.id : l.source;
    const tId = typeof l.target === 'object' ? l.target.id : l.target;
    if (sId === node.id || tId === node.id) {
      const otherId = sId === node.id ? tId : sId;
      const other = data.nodes.find(n => n.id === otherId);
      if (other) connections.push({ other, type: l.type, reason: l.reason || '' });
    }
  }
  connections.sort((a, b) => {
    const order = { strong: 0, medium: 1, weak: 2 };
    return (order[a.type] ?? 9) - (order[b.type] ?? 9);
  });

  const recs = topRecommendations(node, data, 5);

  const tabs = [
    { id: 'overview',  label: 'ОБЗОР' },
    { id: 'details',   label: 'ПОДРОБНЕЕ' },
    { id: 'intro',     label: 'ИНТРО', shown: !!node.raw_intro },
    { id: 'connections', label: 'СВЯЗИ', count: connections.length },
  ].filter(t => t.shown !== false);

  // Если активный таб не показан для этого узла — fallback на overview
  if (!tabs.some(t => t.id === activeTab)) activeTab = 'overview';

  body.innerHTML = `
    <div class="profile-head">
      <span class="profile-avatar" style="${nodeColorClass(node.role, isSelf)}">${escapeHtml(node.avatar_initials)}</span>
      <div class="profile-head-text">
        <div class="profile-name">${escapeHtml(node.name)}</div>
        <div class="profile-tg">
          ${node.telegram
            ? `<a href="${tgUrl}" target="_blank">@${escapeHtml(node.telegram)}</a>`
            : '<em>нет username</em>'}
          ${node.telegram ? '<span class="muted"> · </span><a href="' + tgUrl + '" class="muted" target="_blank">открыть</a>' : ''}
        </div>
      </div>
    </div>

    ${node.telegram ? `<a class="btn-write" href="${tgUrl}" target="_blank">Написать в Telegram</a>` : ''}

    <div class="profile-badges">
      <span class="pill role role-${node.role}">${ROLE_LABELS[node.role] || 'Участник'}</span>
      ${node.role_text ? `<span class="pill">${escapeHtml(node.role_text)}</span>` : ''}
      ${node.city ? `<span class="pill">📍 ${escapeHtml(node.city)}</span>` : ''}
    </div>

    <div class="tabs">
      ${tabs.map(t => `
        <button class="tab${t.id === activeTab ? ' active' : ''}" data-tab="${t.id}">
          ${escapeHtml(t.label)}${t.count != null ? ` <span class="tab-count">${t.count}</span>` : ''}
        </button>
      `).join('')}
    </div>

    <div class="tab-content" id="tab-content"></div>
  `;

  function renderTab() {
    const c = document.getElementById('tab-content');
    if (!c) return;
    if (activeTab === 'overview') c.innerHTML = renderOverview(node, recs);
    else if (activeTab === 'details') c.innerHTML = renderDetails(node);
    else if (activeTab === 'intro') c.innerHTML = renderIntro(node);
    else if (activeTab === 'connections') c.innerHTML = renderConnections(connections);

    // wire up rec/connection clicks
    c.querySelectorAll('[data-jump-id]').forEach(el => {
      el.addEventListener('click', () => {
        const tid = el.dataset.jumpId;
        const t = data.nodes.find(n => n.id === tid);
        if (t) openSidebar(t, data, selfId);
      });
    });
  }

  body.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      body.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
      renderTab();
    });
  });

  renderTab();
  sb.classList.remove('hidden');
}

function renderOverview(node, recs) {
  const tagsHtml = (node.tags || []).length
    ? `<div class="section">
         <div class="section-title">ТЕГИ И ТЕМЫ</div>
         <div>${(node.tags || []).map(t => `<span class="pill">${escapeHtml(t)}</span>`).join('')}</div>
       </div>` : '';

  const wantsHtml = (node.request || []).length
    ? `<div class="section">
         <div class="section-title">ИЩЕТ</div>
         <div>${(node.request || []).map(t => `<span class="pill pill-want">${escapeHtml(t)}</span>`).join('')}</div>
       </div>` : '';

  const offerHtml = (node.offer || []).length
    ? `<div class="section">
         <div class="section-title">ПРЕДЛАГАЕТ</div>
         <div>${(node.offer || []).map(t => `<span class="pill pill-offer">${escapeHtml(t)}</span>`).join('')}</div>
       </div>` : '';

  const ctxBlock = node.message_count > 0
    ? `<div class="section">
         <div class="section-title">КОНТЕКСТ УЧАСТИЯ</div>
         <span class="pill">${node.message_count} сообщений в чате</span>
       </div>` : '';

  const bioBrief = node.bio
    ? `<div class="profile-bio">${escapeHtml(truncate(node.bio, 220))}</div>` : '';

  const recsBlock = recs.length
    ? `<div class="section">
         <div class="section-title">СТОИТ ПОЗНАКОМИТЬСЯ</div>
         ${recs.map(r => `
           <div class="rec-card" data-jump-id="${escapeAttr(r.node.id)}">
             <div class="rec-name">${escapeHtml(r.node.name)} <span class="rec-score">★ ${r.score}/10</span></div>
             <div class="rec-reason">${escapeHtml(r.reason)}</div>
           </div>
         `).join('')}
       </div>` : '';

  return ctxBlock + tagsHtml + wantsHtml + offerHtml + bioBrief + recsBlock;
}

function renderDetails(node) {
  if (!node.bio) return '<div class="empty">Подробного описания пока нет.</div>';
  // bio может быть многострочным — сохраним абзацы
  const paragraphs = String(node.bio)
    .split(/\n\s*\n/)
    .map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<div class="profile-details">${paragraphs}</div>`;
}

// raw_intro у нас часто — это склейка нескольких сообщений из чата
// через "\n---\n". Большинство — мусор (объявления, репосты). Нужно
// вытащить именно представительское сообщение.
const INTRO_KEYWORDS = [
  'меня зовут', 'привет, я', 'привет я', 'представ', 'знакомьтесь',
  '#участник', 'о себе', 'мне ', 'возраст', 'миссия', 'обо мне',
];
function extractIntroMessage(rawIntro, fallbackBio) {
  if (!rawIntro) return fallbackBio || '';
  // Делим по разделителю или двойному переводу строки
  const chunks = rawIntro
    .split(/\n-{3,}\n|\n\n+/g)
    .map(s => s.trim())
    .filter(s => s.length >= 120);
  if (chunks.length === 0) return rawIntro.length >= 80 ? rawIntro : (fallbackBio || rawIntro);

  // Скорим каждый кусок: bonus за intro-keywords, penalty за «всем привет, едем», ссылки, hashtag-only
  function score(s) {
    const lower = s.toLowerCase();
    let pts = 0;
    for (const kw of INTRO_KEYWORDS) if (lower.includes(kw)) pts += 4;
    // Длинный «о себе» — хорошо. Очень длинный без keywords — может быть пост, но всё ещё лучше пустоты.
    pts += Math.min(s.length / 200, 3);
    // Penalties
    if (/https?:\/\//.test(s)) pts -= 2;
    if (/собирае?м.*автобус|поездк|трансфер|ссылка на чат|оплатить/i.test(lower)) pts -= 6;
    if (/^[#@]?\w+\s*$/.test(s)) pts -= 5;
    return pts;
  }
  const scored = chunks.map(c => ({ text: c, score: score(c) }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (best.score < 1 && fallbackBio) return fallbackBio;
  return best.text;
}

function renderIntro(node) {
  const text = extractIntroMessage(node.raw_intro, node.bio);
  if (!text) return '<div class="empty">Представление не найдено.</div>';
  return `<div class="profile-intro">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;
}

function renderConnections(connections) {
  if (!connections.length) return '<div class="empty">Связей пока нет.</div>';
  const typeLabel = { strong: 'сильная', medium: 'средняя', weak: 'слабая' };
  return `
    <div class="connections-list">
      ${connections.map(c => `
        <div class="conn-card" data-jump-id="${escapeAttr(c.other.id)}">
          <div class="conn-row">
            <span class="profile-avatar conn-avatar" style="${nodeColorClass(c.other.role, false)}">${escapeHtml(c.other.avatar_initials)}</span>
            <div class="conn-meta">
              <div class="conn-name">${escapeHtml(c.other.name)}</div>
              <div class="conn-type">${typeLabel[c.type] || c.type} связь</div>
            </div>
          </div>
          ${c.reason ? `<div class="conn-reason">${escapeHtml(c.reason)}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

export function closeSidebar() {
  document.getElementById('sidebar').classList.add('hidden');
}

function truncate(s, n) {
  if (!s) return '';
  if (s.length <= n) return s;
  return s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }
