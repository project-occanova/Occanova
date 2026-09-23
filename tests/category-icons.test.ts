import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/lib/seed';
import {categoryIconsBySlug} from '../src/components/category-icons';

test('every supplied vendor category has a dedicated icon',()=>{
  const categorySlugs=initialState().categories.map(category=>category.slug);
  assert.deepEqual(Object.keys(categoryIconsBySlug).sort(),categorySlugs.sort());
  assert.equal(new Set(Object.values(categoryIconsBySlug)).size,categorySlugs.length);
});
