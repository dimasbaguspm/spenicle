import { describe, it, expect } from 'vitest';

import { generatePrepareStatementKey } from '../prepare-statement-key.ts';

describe('prepare-statement-key', () => {
  describe('generatePrepareStatementKey', () => {
    it('should generate deterministic keys for same inputs', () => {
      const options = {
        prefix: 'TEST',
        conditions: [
          { key: 'groupId', value: 123 },
          { key: 'accountIds', value: [1, 2, 3] },
        ],
        sortBy: 'createdAt',
        sortOrder: 'desc',
        pageNumber: 1,
        pageSize: 25,
      };

      const key1 = generatePrepareStatementKey(options);
      const key2 = generatePrepareStatementKey(options);

      expect(key1).toBe(key2);
      expect(key1).toHaveLength(32);
    });

    it('should generate different keys for different inputs', () => {
      const options1 = {
        prefix: 'TEST',
        conditions: [{ key: 'groupId', value: 123 }],
      };

      const options2 = {
        prefix: 'TEST',
        conditions: [{ key: 'groupId', value: 456 }],
      };

      const key1 = generatePrepareStatementKey(options1);
      const key2 = generatePrepareStatementKey(options2);

      expect(key1).not.toBe(key2);
    });

    it('should handle empty conditions', () => {
      const options = {
        prefix: 'EMPTY_TEST',
        conditions: [],
      };

      const key = generatePrepareStatementKey(options);
      expect(key).toHaveLength(32);
    });

    it('should sort conditions for deterministic results', () => {
      const options1 = {
        conditions: [
          { key: 'b', value: 2 },
          { key: 'a', value: 1 },
        ],
      };

      const options2 = {
        conditions: [
          { key: 'a', value: 1 },
          { key: 'b', value: 2 },
        ],
      };

      const key1 = generatePrepareStatementKey(options1);
      const key2 = generatePrepareStatementKey(options2);

      expect(key1).toBe(key2);
    });
  });
});
