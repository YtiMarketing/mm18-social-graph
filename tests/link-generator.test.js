import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jaccard, generateLinks, buildGraphData } from '../scripts/link-generator.js';

test('jaccard: identical sets returns 1', () => {
  assert.equal(jaccard(['a', 'b'], ['a', 'b']), 1);
});

test('jaccard: disjoint sets returns 0', () => {
  assert.equal(jaccard(['a', 'b'], ['c', 'd']), 0);
});

test('jaccard: partial overlap', () => {
  // |{b}| / |{a,b,c}| = 1/3
  assert.equal(jaccard(['a', 'b'], ['b', 'c']), 1 / 3);
});

test('jaccard: empty inputs returns 0', () => {
  assert.equal(jaccard([], []), 0);
  assert.equal(jaccard(['a'], []), 0);
});

test('jaccard: case-insensitive', () => {
  assert.equal(jaccard(['AI', 'b2b'], ['ai', 'B2B']), 1);
});

test('generateLinks: empty array returns []', () => {
  assert.deepEqual(generateLinks([]), []);
});

test('generateLinks: single user returns []', () => {
  assert.deepEqual(generateLinks([
    { id: 'a', tags: ['AI'], request: [], offer: [], city: 'Москва' }
  ]), []);
});

test('generateLinks: strong link when jaccard >= 0.4', () => {
  const profiles = [
    { id: 'a', tags: ['AI', 'B2B', 'SaaS'], request: [], offer: [], city: 'Москва' },
    { id: 'b', tags: ['AI', 'B2B', 'продажи'], request: [], offer: [], city: 'СПб' },
  ];
  // jaccard = 2 / 4 = 0.5 → strong
  const links = generateLinks(profiles);
  assert.equal(links.length, 1);
  assert.equal(links[0].type, 'strong');
  assert.equal(links[0].source, 'a');
  assert.equal(links[0].target, 'b');
  assert.match(links[0].reason, /AI|B2B/);
});

test('generateLinks: bidirectional alone (no tag overlap) НЕ даёт strong при текущих порогах', () => {
  // Раньше биReasons.length > 0 поднимал в strong. Теперь требуется
  // jac >= 0.2 AND обе стороны нашли матч — иначе никакой связи.
  const profiles = [
    { id: 'a', tags: ['e-com'], request: ['ментор'], offer: ['клиент'], city: 'Москва' },
    { id: 'b', tags: ['IT'], request: [], offer: ['ментор'], city: 'СПб' },
  ];
  assert.equal(generateLinks(profiles).length, 0);
});

test('generateLinks: strong via jac>=0.2 + двусторонний bi-match', () => {
  const profiles = [
    { id: 'a', name: 'Иван', tags: ['AI', 'B2B', 'продажи'], request: ['клиент'], offer: ['ментор'], city: 'Москва' },
    { id: 'b', name: 'Пётр', tags: ['AI', 'продажи'], request: ['ментор'], offer: ['клиент'], city: 'СПб' },
  ];
  // jac = 2/3 ≈ 0.67 → strong (даже без bi-match), reason из biReasons
  const links = generateLinks(profiles);
  assert.equal(links.length, 1);
  assert.equal(links[0].type, 'strong');
  assert.match(links[0].reason, /Иван|Пётр|клиент|ментор/i);
});

test('generateLinks: city alone НЕ даёт связи', () => {
  // Раньше один общий город → medium. Сейчас city убран как триггер —
  // нужно совпадение тегов.
  const profiles = [
    { id: 'a', tags: ['e-com'], request: [], offer: [], city: 'Москва' },
    { id: 'b', tags: ['IT'], request: [], offer: [], city: 'москва' },
  ];
  assert.equal(generateLinks(profiles).length, 0);
});

test('generateLinks: medium при jac>=0.15 и >=2 общих тегах', () => {
  const profiles = [
    { id: 'a', tags: ['AI', 'B2B', 'SaaS', 'продажи'], request: [], offer: [], city: 'Москва' },
    { id: 'b', tags: ['AI', 'B2B', 'e-com', 'найм', 'логистика'], request: [], offer: [], city: 'СПб' },
  ];
  // jac = 2/7 ≈ 0.286 → выше 0.35? нет (это 0.286). Проверим точно.
  // common = {AI, B2B} = 2; объединение = 7. 2/7 ≈ 0.286 < 0.35 → medium
  const links = generateLinks(profiles);
  assert.equal(links.length, 1);
  assert.equal(links[0].type, 'medium');
});

test('generateLinks: единственный общий тег больше НЕ даёт связи (weak убран)', () => {
  const profiles = [
    { id: 'a', tags: ['AI', 'B2B', 'SaaS', 'продажи', 'найм'], request: [], offer: [], city: 'Москва' },
    { id: 'b', tags: ['AI', 'e-com', 'B2C', 'найм-other-1', 'найм-other-2', 'найм-other-3'], request: [], offer: [], city: 'СПб' },
  ];
  assert.equal(generateLinks(profiles).length, 0);
});

test('generateLinks: no link when no overlap of any kind', () => {
  const profiles = [
    { id: 'a', tags: ['AI'], request: [], offer: [], city: 'Москва' },
    { id: 'b', tags: ['производство'], request: [], offer: [], city: 'СПб' },
  ];
  assert.deepEqual(generateLinks(profiles), []);
});

test('generateLinks: handles many participants without dupes', () => {
  const profiles = Array.from({ length: 10 }, (_, i) => ({
    id: `u${i}`,
    tags: ['AI', 'B2B'],
    request: [], offer: [],
    city: 'Москва',
  }));
  const links = generateLinks(profiles);
  // C(10,2) = 45, все strong (jaccard=1)
  assert.equal(links.length, 45);
  // Дубликатов нет
  const seen = new Set();
  for (const l of links) {
    const key = [l.source, l.target].sort().join('-');
    assert.ok(!seen.has(key), `duplicate link: ${key}`);
    seen.add(key);
  }
});

test('buildGraphData returns nodes + links + generated_at', () => {
  const profiles = [
    {
      user_id: '111', tg_username: 'ivan', first_name: 'Иван', last_name: 'Иванов',
      role: 'participant', city: 'Москва', role_text: 'фаундер',
      tags: ['AI'], request: [], offer: [], bio: 'bio',
    },
    {
      user_id: '222', tg_username: 'petr', first_name: 'Пётр', last_name: 'Петров',
      role: 'participant', city: 'Москва', role_text: 'CEO',
      tags: ['AI', 'B2B'], request: [], offer: [], bio: 'bio2',
    },
  ];
  const data = buildGraphData(profiles);
  assert.ok(data.generated_at);
  assert.equal(data.nodes.length, 2);
  assert.equal(data.nodes[0].id, 'ivan');
  assert.equal(data.nodes[0].name, 'Иван Иванов');
  assert.equal(data.nodes[0].avatar_initials, 'ИИ');
  assert.ok(data.links.length >= 1);
});

test('buildGraphData filters out care/tech roles', () => {
  const profiles = [
    { user_id: '1', tg_username: 'a', first_name: 'A', last_name: 'A', role: 'participant', tags: ['AI'], request: [], offer: [], city: 'M', role_text: '', bio: '' },
    { user_id: '2', tg_username: 'b', first_name: 'B', last_name: 'B', role: 'care',         tags: ['AI'], request: [], offer: [], city: 'M', role_text: '', bio: '' },
    { user_id: '3', tg_username: 'c', first_name: 'C', last_name: 'C', role: 'tech',         tags: ['AI'], request: [], offer: [], city: 'M', role_text: '', bio: '' },
    { user_id: '4', tg_username: 'd', first_name: 'D', last_name: 'D', role: 'mentor',      tags: ['AI'], request: [], offer: [], city: 'M', role_text: '', bio: '' },
  ];
  const data = buildGraphData(profiles);
  const ids = data.nodes.map(n => n.id).sort();
  assert.deepEqual(ids, ['a', 'd']);
});
