// Скор рекомендаций. Раньше:
//   bi-match +5 за каждую сторону, shared tags +1 за каждый
// → почти у всех получалось capped 10/10, шкала бессмысленна.
// Сейчас: TF-IDF веса (редкие совпадения ценятся больше) + меньшие базовые
// баллы. И структурированные reasons чтобы UI мог раскрасить
// "он полезен тебе" / "ты полезен ему" в разные цвета.

let _idfCache = null;

function buildIdf(data) {
  if (_idfCache && _idfCache.dataRef === data) return _idfCache;
  const tagCount = new Map();
  const reqCount = new Map();
  const offCount = new Map();
  const N = data.nodes.length;
  const inc = (m, k) => m.set(k, (m.get(k) || 0) + 1);
  for (const n of data.nodes) {
    for (const t of (n.tags || [])) inc(tagCount, String(t).toLowerCase());
    for (const r of (n.request || [])) inc(reqCount, String(r).toLowerCase());
    for (const o of (n.offer || [])) inc(offCount, String(o).toLowerCase());
  }
  function idfWeight(count, total) {
    // Чем реже — тем тяжелее. Если значение присутствует у >50% — вес почти 0.
    if (!count) return 0;
    const ratio = count / total;
    if (ratio >= 0.5) return 0.2;
    if (ratio >= 0.3) return 0.5;
    if (ratio >= 0.15) return 1.0;
    if (ratio >= 0.07) return 1.5;
    return 2.0;
  }
  const tagW = new Map();
  for (const [k, c] of tagCount) tagW.set(k, idfWeight(c, N));
  const reqW = new Map();
  for (const [k, c] of reqCount) reqW.set(k, idfWeight(c, N));
  const offW = new Map();
  for (const [k, c] of offCount) offW.set(k, idfWeight(c, N));
  _idfCache = { dataRef: data, tagW, reqW, offW };
  return _idfCache;
}

function pairScore(a, b, data) {
  if (a.id === b.id) return null;
  const idf = buildIdf(data);

  const aReq = (a.request || []).map(x => String(x).toLowerCase());
  const aOff = (a.offer || []).map(x => String(x).toLowerCase());
  const bReq = (b.request || []).map(x => String(x).toLowerCase());
  const bOff = (b.offer || []).map(x => String(x).toLowerCase());

  const theyHelpYou = aReq.filter(x => bOff.includes(x)); // что мне нужно из них
  const youHelpThem = bReq.filter(x => aOff.includes(x)); // что им нужно от меня

  // Бi-матч-балл: сумма IDF-весов совпавших слов с обоих направлений,
  // но капируем чтобы один универсальный матч не сожрал всю шкалу.
  let biPts = 0;
  for (const x of theyHelpYou) biPts += (idf.offW.get(x) || 0.5);
  for (const x of youHelpThem) biPts += (idf.reqW.get(x) || 0.5);
  biPts = Math.min(biPts * 1.5, 6);

  // Shared tags — IDF-weighted
  const aTags = new Set((a.tags || []).map(x => String(x).toLowerCase()));
  const bTags = new Set((b.tags || []).map(x => String(x).toLowerCase()));
  const sharedTags = [...aTags].filter(x => bTags.has(x));
  let tagPts = 0;
  for (const t of sharedTags) tagPts += (idf.tagW.get(t) || 0.5);
  tagPts = Math.min(tagPts, 4);

  // City: значит общий тусовочный/деловой контур
  let cityPts = 0;
  if (a.city && b.city && a.city.toLowerCase() === b.city.toLowerCase()) cityPts = 1;

  // Role bonus: organizer/mentor дают лёгкий буст (стоит представиться)
  let rolePts = 0;
  if (b.role === 'organizer') rolePts = 0.8;
  else if (b.role === 'mentor') rolePts = 0.5;

  const total = biPts + tagPts + cityPts + rolePts;
  // 1..10 шкала, минимум 1 (чтобы 0.x не превращалось в 0)
  const score = Math.max(1, Math.min(10, Math.round(total)));

  // Краткий «зачем встретиться» — генерируется из имеющихся данных,
  // без выдумки. Пользователь сам решит когда увидит детали.
  let introReason = '';
  if (b.role === 'organizer') {
    introReason = `${b.name.split(' ')[0]} — один из организаторов потока. Помогает быстрее встроиться в круг участников.`;
  } else if (b.role === 'mentor') {
    introReason = `${b.name.split(' ')[0]} в роли ментора потока — может подсказать и связать с нужными людьми.`;
  } else if (theyHelpYou.length && youHelpThem.length) {
    introReason = `Двусторонний матч: вы оба ищете то, что есть у другого.`;
  } else if (sharedTags.length >= 2) {
    introReason = `Пересечение в темах: ${sharedTags.slice(0, 3).join(', ')}.`;
  } else if (cityPts) {
    introReason = `Оба из города ${a.city}.`;
  } else {
    introReason = `Точки соприкосновения по интересам.`;
  }

  return {
    score,
    introReason,
    theyHelpYou,
    youHelpThem,
    sharedTags: sharedTags.slice(0, 5),
    rawTotal: total, // для сортировки сохраняем не-кропнутую сумму
  };
}

export function topRecommendations(node, data, n = 5) {
  const candidates = data.nodes
    .filter(other => other.id !== node.id && other.role !== 'care' && other.role !== 'tech')
    .map(other => ({ node: other, ...pairScore(node, other, data) }))
    .filter(r => r && (r.rawTotal >= 1.2 || r.theyHelpYou.length || r.youHelpThem.length))
    .sort((a, b) => b.rawTotal - a.rawTotal)
    .slice(0, n);
  return candidates;
}
