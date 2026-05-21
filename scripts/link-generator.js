function normalize(arr) {
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
  // stub, implemented in next task
  return [];
}
