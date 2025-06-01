import { BadRequestException } from '../../exceptions/index.ts';
import { parseId, parseAmount, parseQuery, parseBody } from '../index.ts';

describe('parseId', () => {
  it('should parse valid string ID', () => {
    expect(parseId('123')).toBe(123);
    expect(parseId('456')).toBe(456);
    expect(parseId('0')).toBe(0);
  });

  it('should parse valid number ID', () => {
    expect(parseId(123)).toBe(123);
    expect(parseId(456)).toBe(456);
    expect(parseId(0)).toBe(0);
  });

  it('should handle negative numbers', () => {
    expect(parseId('-123')).toBe(-123);
    expect(parseId(-456)).toBe(-456);
  });

  it('should handle large numbers', () => {
    expect(parseId('999999')).toBe(999999);
    expect(parseId(999999)).toBe(999999);
  });

  it('should throw BadRequestException for null/undefined ID', () => {
    expect(() => parseId(null)).toThrow(BadRequestException);
    expect(() => parseId(undefined)).toThrow(BadRequestException);
    expect(() => parseId('')).toThrow(BadRequestException);

    expect(() => parseId(null)).toThrow('ID is required');
    expect(() => parseId(undefined)).toThrow('ID is required');
    expect(() => parseId('')).toThrow('ID is required');
  });

  it('should throw BadRequestException for invalid types', () => {
    expect(() => parseId({})).toThrow(BadRequestException);
    expect(() => parseId([])).toThrow(BadRequestException);
    expect(() => parseId(true)).toThrow(BadRequestException);
    expect(() => parseId(false)).toThrow(BadRequestException);

    expect(() => parseId({})).toThrow('ID must be a number or string');
    expect(() => parseId([])).toThrow('ID must be a number or string');
  });

  it('should throw BadRequestException for invalid string numbers', () => {
    expect(() => parseId('abc')).toThrow(BadRequestException);
    expect(() => parseId('NaN')).toThrow(BadRequestException);

    expect(() => parseId('abc')).toThrow('Invalid ID. Must be a valid number.');
  });

  it('should use custom error message when provided', () => {
    const customMessage = 'Custom ID error';

    expect(() => parseId(null, customMessage)).toThrow(customMessage);
    expect(() => parseId({}, customMessage)).toThrow(customMessage);
    expect(() => parseId('abc', customMessage)).toThrow(customMessage);
  });

  it('should handle edge cases with whitespace', () => {
    expect(parseId(' 123 ')).toBe(123);
    expect(parseId('  456  ')).toBe(456);
  });

  it('should handle zero values correctly', () => {
    expect(parseId('0')).toBe(0);
    expect(parseId(0)).toBe(0);
    expect(() => parseId('00')).not.toThrow();
    expect(parseId('00')).toBe(0);
  });
});

describe('parseAmount', () => {
  it('should parse valid string amounts', () => {
    expect(parseAmount('123')).toBe(123);
    expect(parseAmount('123.45')).toBe(123.45);
    expect(parseAmount('0')).toBe(0);
    expect(parseAmount('0.0')).toBe(0);
  });

  it('should parse decimal amounts', () => {
    expect(parseAmount('12.34')).toBe(12.34);
    expect(parseAmount('0.99')).toBe(0.99);
    expect(parseAmount('999.999')).toBe(999.999);
  });

  it('should handle negative amounts', () => {
    expect(parseAmount('-123')).toBe(-123);
    expect(parseAmount('-12.34')).toBe(-12.34);
    expect(parseAmount('-0.5')).toBe(-0.5);
  });

  it('should handle large amounts', () => {
    expect(parseAmount('999999.99')).toBe(999999.99);
    expect(parseAmount('1000000')).toBe(1000000);
  });

  it('should handle scientific notation', () => {
    expect(parseAmount('1e2')).toBe(100);
    expect(parseAmount('1.23e2')).toBe(123);
    expect(parseAmount('1e-2')).toBe(0.01);
    expect(parseAmount('123.abc')).toBe(123);
  });

  it('should throw BadRequestException for empty/null amount', () => {
    expect(() => parseAmount('')).toThrow(BadRequestException);
    expect(() => parseAmount(null as unknown as string)).toThrow(BadRequestException);
    expect(() => parseAmount(undefined as unknown as string)).toThrow(BadRequestException);

    expect(() => parseAmount('')).toThrow('Amount is required');
    expect(() => parseAmount(null as unknown as string)).toThrow('Amount is required');
  });

  it('should throw BadRequestException for invalid string amounts', () => {
    expect(() => parseAmount('abc')).toThrow(BadRequestException);
    expect(() => parseAmount('NaN')).toThrow(BadRequestException);

    expect(() => parseAmount('abc')).toThrow('Invalid amount: abc. Must be a valid number.');
  });

  it('should use custom error message when provided', () => {
    const customMessage = 'Custom amount error';

    expect(() => parseAmount('', customMessage)).toThrow(customMessage);
    expect(() => parseAmount('abc', customMessage)).toThrow(customMessage);
    expect(() => parseAmount(null as unknown as string, customMessage)).toThrow(customMessage);
  });

  it('should handle edge cases with whitespace', () => {
    expect(parseAmount(' 123 ')).toBe(123);
    expect(parseAmount('  12.34  ')).toBe(12.34);
  });

  it('should handle special numeric strings', () => {
    expect(parseAmount('+123')).toBe(123);
    expect(parseAmount('+12.34')).toBe(12.34);
  });

  it('should handle zero values correctly', () => {
    expect(parseAmount('0')).toBe(0);
    expect(parseAmount('0.0')).toBe(0);
    expect(parseAmount('00')).toBe(0);
    expect(parseAmount('0.00')).toBe(0);
  });

  it('should handle very small decimal amounts', () => {
    expect(parseAmount('0.01')).toBe(0.01);
    expect(parseAmount('0.001')).toBe(0.001);
    expect(parseAmount('0.0001')).toBe(0.0001);
  });
});

describe('parseQuery', () => {
  it('should convert numeric string values to numbers', () => {
    const query = { page: '1', limit: '10', name: 'test' };
    const result = parseQuery(query);

    expect(result).toEqual({ page: 1, limit: 10, name: 'test' });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.name).toBe('test');
  });

  it('should handle decimal numeric strings', () => {
    const query = { price: '12.34', rating: '4.5', category: 'books' };
    const result = parseQuery(query);

    expect(result).toEqual({ price: 12.34, rating: 4.5, category: 'books' });
    expect(result.price).toBe(12.34);
    expect(result.rating).toBe(4.5);
  });

  it('should handle negative numbers', () => {
    const query = { offset: '-5', temperature: '-10.5', status: 'active' };
    const result = parseQuery(query);

    expect(result).toEqual({ offset: -5, temperature: -10.5, status: 'active' });
    expect(result.offset).toBe(-5);
    expect(result.temperature).toBe(-10.5);
  });

  it('should handle zero values', () => {
    const query = { count: '0', balance: '0.0', id: '00' };
    const result = parseQuery(query);

    expect(result).toEqual({ count: 0, balance: 0, id: 0 });
    expect(result.count).toBe(0);
    expect(result.balance).toBe(0);
    expect(result.id).toBe(0);
  });

  it('should handle array values', () => {
    const query = {
      ids: ['1', '2', '3'],
      tags: ['tag1', 'tag2'],
      scores: ['10.5', 'invalid', '20.0'],
    };
    const result = parseQuery(query);

    expect(result).toEqual({
      ids: [1, 2, 3],
      tags: ['tag1', 'tag2'],
      scores: [10.5, 'invalid', 20.0],
    });
    expect(Array.isArray(result.ids)).toBe(true);
    expect(result.ids).toEqual([1, 2, 3]);
    expect(result.scores).toEqual([10.5, 'invalid', 20.0]);
  });

  it('should handle empty arrays', () => {
    const query = { emptyArray: [] };
    const result = parseQuery(query);

    expect(result).toEqual({ emptyArray: [] });
    expect(Array.isArray(result.emptyArray)).toBe(true);
    expect(result.emptyArray).toHaveLength(0);
  });

  it('should handle mixed array types', () => {
    const query = {
      mixed: ['123', 'text', '45.6', '', 'true', '0'],
    };
    const result = parseQuery(query);

    expect(result).toEqual({
      mixed: [123, 'text', 45.6, '', 'true', 0],
    });
  });

  it('should preserve non-string, non-array values', () => {
    const query = {
      number: 42,
      boolean: true,
      nullValue: null,
      undefined: undefined,
      object: { nested: 'value' },
    };
    const result = parseQuery(query);

    expect(result).toEqual({
      number: 42,
      boolean: true,
      nullValue: null,
      undefined: undefined,
      object: { nested: 'value' },
    });
  });

  it('should handle empty string values', () => {
    const query = { empty: '', whitespace: '   ', value: 'test' };
    const result = parseQuery(query);

    expect(result).toEqual({ empty: '', whitespace: '   ', value: 'test' });
    expect(result.empty).toBe('');
    expect(result.whitespace).toBe('   ');
  });

  it('should handle scientific notation', () => {
    const query = {
      scientific1: '1e2',
      scientific2: '1.23e-4',
      scientific3: '5E+3',
      regular: 'normal',
    };
    const result = parseQuery(query);

    expect(result).toEqual({
      scientific1: 100,
      scientific2: 0.000123,
      scientific3: 5000,
      regular: 'normal',
    });
  });

  it('should not modify the original query object', () => {
    const originalQuery = { page: '1', name: 'test' };
    const queryCopy = { ...originalQuery };
    const result = parseQuery(originalQuery);

    expect(originalQuery).toEqual(queryCopy);
    expect(result).not.toBe(originalQuery);
    expect(result.page).toBe(1);
    expect(originalQuery.page).toBe('1');
  });

  it('should handle special numeric strings', () => {
    const query = {
      infinity: 'Infinity',
      negInfinity: '-Infinity',
      number: '123',
      invalid: 'NaN',
    };
    const result = parseQuery(query);

    expect(result).toEqual({
      infinity: Infinity,
      negInfinity: -Infinity,
      number: 123,
      invalid: NaN,
    });
    expect(result.infinity).toBe(Infinity);
    expect(result.negInfinity).toBe(-Infinity);
    expect(Number.isNaN(result.invalid)).toBe(true);
  });

  it('should handle empty query object', () => {
    const query = {};
    const result = parseQuery(query);

    expect(result).toEqual({});
    expect(Object.keys(result)).toHaveLength(0);
  });
});

describe('parseBody', () => {
  it('should convert numeric string values to numbers in simple object', () => {
    const body = { age: '25', name: 'John', salary: '50000.50' };
    const result = parseBody(body);

    expect(body).toEqual({ age: 25, name: 'John', salary: 50000.5 });
    expect(result).toEqual({ age: 25, name: 'John', salary: 50000.5 });
    expect(body.age).toBe(25);
    expect(body.salary).toBe(50000.5);
  });

  it('should handle nested objects', () => {
    const body = {
      user: {
        id: '123',
        profile: {
          age: '30',
          score: '95.5',
        },
        name: 'Alice',
      },
      count: '10',
    };
    const result = parseBody(body);

    expect(body).toEqual({
      user: {
        id: 123,
        profile: {
          age: 30,
          score: 95.5,
        },
        name: 'Alice',
      },
      count: 10,
    });
    expect(result).toEqual(body);
  });

  it('should handle arrays with numeric strings', () => {
    const body = {
      numbers: ['1', '2', '3.5'],
      mixed: ['text', '42', 'more text', '0'],
      nested: [
        { id: '1', name: 'first' },
        { id: '2', value: '100.5' },
      ],
    };
    const result = parseBody(body);

    expect(body).toEqual({
      numbers: [1, 2, 3.5],
      mixed: ['text', 42, 'more text', 0],
      nested: [
        { id: 1, name: 'first' },
        { id: 2, value: 100.5 },
      ],
    });
    expect(result).toEqual(body);
  });

  it('should handle deeply nested structures', () => {
    const body = {
      level1: {
        level2: {
          level3: {
            id: '999',
            data: ['10', '20', { inner: '30' }],
          },
          count: '5',
        },
      },
    };
    parseBody(body);

    expect(body).toEqual({
      level1: {
        level2: {
          level3: {
            id: 999,
            data: [10, 20, { inner: 30 }],
          },
          count: 5,
        },
      },
    });
  });

  it('should handle null and undefined values', () => {
    const body = {
      nullValue: null,
      undefinedValue: undefined,
      id: '123',
      nested: {
        nullProp: null,
        value: '456',
      },
    };
    parseBody(body);

    expect(body).toEqual({
      nullValue: null,
      undefinedValue: undefined,
      id: 123,
      nested: {
        nullProp: null,
        value: 456,
      },
    });
  });

  it('should handle empty arrays and objects', () => {
    const body = {
      emptyArray: [],
      emptyObject: {},
      id: '1',
    };
    parseBody(body);

    expect(body).toEqual({
      emptyArray: [],
      emptyObject: {},
      id: 1,
    });
    expect(Array.isArray(body.emptyArray)).toBe(true);
    expect(typeof body.emptyObject).toBe('object');
  });

  it('should handle negative numbers and decimals', () => {
    const body = {
      negative: '-123',
      decimal: '45.67',
      negativeDecimal: '-78.90',
      zero: '0',
      text: 'keep as string',
    };
    parseBody(body);

    expect(body).toEqual({
      negative: -123,
      decimal: 45.67,
      negativeDecimal: -78.9,
      zero: 0,
      text: 'keep as string',
    });
  });

  it('should handle scientific notation', () => {
    const body = {
      sci1: '1e2',
      sci2: '1.23e-4',
      sci3: '5E+3',
      regular: 'text',
    };
    parseBody(body);

    expect(body).toEqual({
      sci1: 100,
      sci2: 0.000123,
      sci3: 5000,
      regular: 'text',
    });
  });

  it('should handle special numeric values', () => {
    const body = {
      infinity: 'Infinity',
      negInfinity: '-Infinity',
      nanValue: 'NaN',
      number: '42',
    };
    parseBody(body);

    expect(body.infinity).toBe(Infinity);
    expect(body.negInfinity).toBe(-Infinity);
    expect(Number.isNaN(body.nanValue)).toBe(true);
    expect(body.number).toBe(42);
  });

  it('should handle non-numeric strings', () => {
    const body = {
      text: 'hello world',
      alphanumeric: 'abc123def',
      empty: '',
      whitespace: '   ',
      number: '789',
    };
    parseBody(body);

    expect(body).toEqual({
      text: 'hello world',
      alphanumeric: 'abc123def',
      empty: '',
      whitespace: '   ',
      number: 789,
    });
  });

  it('should handle boolean and other primitive types', () => {
    const body = {
      boolTrue: true,
      boolFalse: false,
      stringNumber: '123',
      actualNumber: 456,
    };
    parseBody(body);

    expect(body).toEqual({
      boolTrue: true,
      boolFalse: false,
      stringNumber: 123,
      actualNumber: 456,
    });
  });

  it('should throw error for null input', () => {
    expect(() => parseBody(null)).toThrow(BadRequestException);
    expect(() => parseBody(null)).toThrow('Invalid input: expected an object or array');
  });

  it('should throw error for non-object input', () => {
    expect(() => parseBody('string')).toThrow(BadRequestException);
    expect(() => parseBody(123)).toThrow(BadRequestException);
    expect(() => parseBody(true)).toThrow(BadRequestException);
    expect(() => parseBody(undefined)).toThrow(BadRequestException);
  });

  it('should handle arrays at root level', () => {
    const body = ['1', '2', { id: '3', name: 'test' }, 'text'];
    const result = parseBody(body);

    expect(body).toEqual([1, 2, { id: 3, name: 'test' }, 'text']);
    expect(result).toEqual([1, 2, { id: 3, name: 'test' }, 'text']);
  });

  it('should handle complex mixed data structures', () => {
    const body = {
      users: [
        {
          id: '1',
          profile: { age: '25', settings: { theme: 'dark', notifications: 'true' } },
          scores: ['80', '90', '85.5'],
        },
        {
          id: '2',
          profile: { age: '30', settings: { theme: 'light', notifications: 'false' } },
          scores: ['95', '88', '92.3'],
        },
      ],
      metadata: {
        total: '2',
        page: '1',
        filters: {
          minAge: '18',
          maxAge: '65',
        },
      },
    };

    const result = parseBody(body);

    expect(body).toEqual({
      users: [
        {
          id: 1,
          profile: { age: 25, settings: { theme: 'dark', notifications: 'true' } },
          scores: [80, 90, 85.5],
        },
        {
          id: 2,
          profile: { age: 30, settings: { theme: 'light', notifications: 'false' } },
          scores: [95, 88, 92.3],
        },
      ],
      metadata: {
        total: 2,
        page: 1,
        filters: {
          minAge: 18,
          maxAge: 65,
        },
      },
    });
    expect(result).toEqual(body);
  });

  it('should handle zero values correctly', () => {
    const body = {
      zero: '0',
      zeroDecimal: '0.0',
      doubleZero: '00',
      leadingZero: '01',
      nested: { zero: '0.00' },
    };
    parseBody(body);

    expect(body).toEqual({
      zero: 0,
      zeroDecimal: 0,
      doubleZero: 0,
      leadingZero: 1,
      nested: { zero: 0 },
    });
  });
});
