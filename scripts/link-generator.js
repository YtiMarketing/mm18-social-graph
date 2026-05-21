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

export function generateLinks(profiles) {
  const links = [];
  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      const a = profiles[i];
      const b = profiles[j];

      const jac = jaccard(a.tags, b.tags);
      const setB = normalize(b.tags);
      const commonTags = (a.tags || []).filter(t => setB.has(String(t).trim().toLowerCase()));

      if (jac >= 0.4) {
        links.push({
          source: a.id,
          target: b.id,
          type: 'strong',
          reason: `Общие темы: ${commonTags.slice(0, 3).join(', ')}`,
        });
      }
    }
  }
  return links;
}
