// Considers pair (a, b) for score 0..10:
//   - bidirectional match (request ↔ offer): +5 per side
//   - shared tags: +1 per common tag (capped at 5)
//   - same city: +2
//   - self never recommended
function pairScore(a, b) {
  if (a.id === b.id) return { score: 0, reasons: [] };
  const reasons = [];
  let score = 0;

  const aReq = new Set((a.request || []).map(x => x.toLowerCase()));
  const aOff = new Set((a.offer || []).map(x => x.toLowerCase()));
  const bReq = new Set((b.request || []).map(x => x.toLowerCase()));
  const bOff = new Set((b.offer || []).map(x => x.toLowerCase()));

  const aFromB = [...aReq].filter(x => bOff.has(x));
  const bFromA = [...bReq].filter(x => aOff.has(x));

  if (aFromB.length) {
    score += 5;
    reasons.push(`Тебе нужен ${aFromB.join(', ')} — у него/неё есть`);
  }
  if (bFromA.length) {
    score += 5;
    reasons.push(`Ему/ей нужен ${bFromA.join(', ')} — у тебя есть`);
  }

  const aTags = new Set((a.tags || []).map(x => x.toLowerCase()));
  const bTags = new Set((b.tags || []).map(x => x.toLowerCase()));
  const shared = [...aTags].filter(x => bTags.has(x));
  score += Math.min(shared.length, 5);
  if (shared.length > 0 && reasons.length === 0) {
    reasons.push(`Общие темы: ${shared.slice(0, 3).join(', ')}`);
  }

  if (a.city && b.city && a.city.toLowerCase() === b.city.toLowerCase()) {
    score += 2;
    if (reasons.length === 0) reasons.push(`Один город: ${a.city}`);
  }

  return { score: Math.min(score, 10), reasons };
}

export function topRecommendations(node, data, n = 3) {
  const candidates = data.nodes
    .filter(other => other.id !== node.id && other.role !== 'care' && other.role !== 'tech')
    .map(other => {
      const { score, reasons } = pairScore(node, other);
      return { node: other, score, reason: reasons.join(' · ') };
    })
    .filter(r => r.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
  return candidates;
}
