import { describe, it, expect } from 'vitest';

import { parseStringArray } from '../index.ts';

describe('parseStringArray', () => {
  it('returns undefined for undefined, null, or empty string', () => {
    expect(parseStringArray(undefined)).toBeUndefined();
    expect(parseStringArray(null)).toBeUndefined();
    expect(parseStringArray('')).toBeUndefined();
  });

  it('returns trimmed array for string array input, filters empty', () => {
    expect(parseStringArray(['foo', ' bar ', '', 'baz'])).toEqual(['foo', 'bar', 'baz']);
  });

  it('returns single-element array for non-empty string', () => {
    expect(parseStringArray('foo')).toEqual(['foo']);
    expect(parseStringArray('  bar  ')).toEqual(['bar']);
  });

  it('returns undefined for object or non-string/array types', () => {
    expect(parseStringArray({})).toBeUndefined();
    expect(parseStringArray(123)).toBeUndefined();
    expect(parseStringArray([{}])).toBeUndefined();
  });
});
