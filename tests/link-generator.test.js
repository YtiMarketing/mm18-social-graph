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
