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
