import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jaccard, generateLinks } from '../scripts/link-generator.js';

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

test('generateLinks: strong via bidirectional request/offer even with no tag overlap', () => {
  const profiles = [
    { id: 'a', tags: ['e-com'], request: ['ментор'], offer: ['клиент'], city: 'Москва' },
    { id: 'b', tags: ['IT'], request: [], offer: ['ментор'], city: 'СПб' },
  ];
  const links = generateLinks(profiles);
  assert.equal(links.length, 1);
  assert.equal(links[0].type, 'strong');
  assert.match(links[0].reason, /ментор/i);
});

test('generateLinks: bidirectional match builds reason naming both sides', () => {
  const profiles = [
    { id: 'a', name: 'Иван', tags: [], request: ['клиент'], offer: [], city: 'Москва' },
    { id: 'b', name: 'Пётр', tags: [], request: [], offer: ['клиент'], city: 'СПб' },
  ];
  const links = generateLinks(profiles);
  assert.equal(links.length, 1);
  // Reason должна упомянуть направление
  assert.match(links[0].reason, /Иван.*клиент|клиент.*Иван|Пётр/i);
});

test('generateLinks: medium via city overlap only', () => {
  const profiles = [
    { id: 'a', tags: ['e-com'], request: [], offer: [], city: 'Москва' },
    { id: 'b', tags: ['IT'], request: [], offer: [], city: 'москва' },
  ];
  const links = generateLinks(profiles);
  assert.equal(links.length, 1);
  assert.equal(links[0].type, 'medium');
  assert.match(links[0].reason, /Москва/);
});

test('generateLinks: weak via single shared tag', () => {
  const profiles = [
    { id: 'a', tags: ['AI', 'B2B', 'SaaS', 'продажи', 'найм'], request: [], offer: [], city: 'Москва' },
    { id: 'b', tags: ['AI', 'e-com', 'B2C', 'найм-other-1', 'найм-other-2', 'найм-other-3'], request: [], offer: [], city: 'СПб' },
  ];
  // jaccard = 1/10 = 0.1 — ни strong, ни medium, но 1 общий → weak
  const links = generateLinks(profiles);
  assert.equal(links.length, 1);
  assert.equal(links[0].type, 'weak');
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
