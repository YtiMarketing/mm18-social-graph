export function normalize(arr) {
  return new Set((arr || []).map(s => String(s).trim().toLowerCase()).filter(Boolean));
}

export function jaccard(a, b) {
  const sa = normalize(a);
  const sb = normalize(b);
  if (sa.size === 0 && sb.size === 0) return 0;
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

function intersect(a, b) {
  const sb = normalize(b);
  return [...normalize(a)].filter(x => sb.has(x));
}

function bidirectionalMatch(a, b) {
  // Returns array of reason strings or []
  const reasons = [];
  const aSeeksFromB = intersect(a.request || [], b.offer || []);
  const bSeeksFromA = intersect(b.request || [], a.offer || []);
  if (aSeeksFromB.length) {
    reasons.push(`${a.name || a.id} ищет: ${aSeeksFromB.join(', ')} — у ${b.name || b.id} это есть`);
  }
  if (bSeeksFromA.length) {
    reasons.push(`${b.name || b.id} ищет: ${bSeeksFromA.join(', ')} — у ${a.name || a.id} это есть`);
  }
  return reasons;
}

export function generateLinks(profiles) {
  const links = [];
  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      const a = profiles[i];
      const b = profiles[j];

      const jac = jaccard(a.tags, b.tags);
      const setB = normalize(b.tags);
      const commonTags = (a.tags || []).filter(t => setB.has(String(t).trim().toLowerCase()));
      const biReasons = bidirectionalMatch(a, b);

      let type = null;
      let reason = '';

      if (jac >= 0.4 || biReasons.length > 0) {
        type = 'strong';
        reason = biReasons.length > 0
          ? biReasons.join(' · ')
          : `Общие темы: ${commonTags.slice(0, 3).join(', ')}`;
      } else if (jac >= 0.2 || (a.city && b.city && a.city.trim().toLowerCase() === b.city.trim().toLowerCase())) {
        type = 'medium';
        if (jac >= 0.2) {
          reason = `Общие темы: ${commonTags.slice(0, 3).join(', ')}`;
        } else {
          reason = `Один город: ${a.city}`;
        }
      } else if (commonTags.length >= 1) {
        type = 'weak';
        reason = `Общий тег: ${commonTags[0]}`;
      }

      if (type) {
        links.push({ source: a.id, target: b.id, type, reason });
      }
    }
  }
  return links;
}

function initials(firstName, lastName) {
  const f = (firstName || '').trim()[0] || '';
  const l = (lastName || '').trim()[0] || '';
  return (f + l).toUpperCase() || '??';
}

export function buildGraphData(profiles) {
  const visible = (profiles || []).filter(p => p.role !== 'care' && p.role !== 'tech');

  const nodes = visible.map(p => ({
    id: p.tg_username,
    name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
    telegram: p.tg_username,
    role: p.role || 'participant',
    city: p.city || '',
    role_text: p.role_text || '',
    tags: p.tags || [],
    request: p.request || [],
    offer: p.offer || [],
    bio: p.bio || '',
    avatar_initials: initials(p.first_name, p.last_name),
  }));

  // generateLinks expects {id, tags, request, offer, city, name} — convert
  const forAlgo = nodes.map(n => ({
    id: n.id,
    name: n.name,
    tags: n.tags,
    request: n.request,
    offer: n.offer,
    city: n.city,
  }));

  const links = generateLinks(forAlgo);

  return {
    generated_at: new Date().toISOString(),
    nodes,
    links,
  };
}
