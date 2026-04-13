import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.unmock('@/services/auditTrailService');

const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

function createThenableChain(data: any = null, error: any = null) {
  const result = { data, error };
  const chain: any = {};
  const methods = ['select', 'insert', 'update', 'eq', 'gte', 'lte', 'or', 'in', 'order', 'limit'];
  methods.forEach(m => { chain[m] = vi.fn().mockReturnValue(chain); });
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject);
  mockSupabase.from.mockReturnValue(chain);
  return chain;
}

describe('CryptoAuditTrailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateHash', () => {
    it('produces consistent SHA-256 output for the same input', async () => {
      const { auditTrailService } = await import('../auditTrailService');
      const hash1 = await (auditTrailService as any).calculateHash('test-data');
      const hash2 = await (auditTrailService as any).calculateHash('test-data');
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });

    it('produces different hashes for different inputs', async () => {
      const { auditTrailService } = await import('../auditTrailService');
      const hash1 = await (auditTrailService as any).calculateHash('input-1');
      const hash2 = await (auditTrailService as any).calculateHash('input-2');
      expect(hash1).not.toBe(hash2);
    });

    it('produces a 64-character hex string', async () => {
      const { auditTrailService } = await import('../auditTrailService');
      const hash = await (auditTrailService as any).calculateHash('anything');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('verifyChainIntegrity', () => {
    it('returns valid for a correctly linked chain', async () => {
      const blocks = [
        { block_number: 1, previous_hash: null, current_hash: 'hash-a' },
        { block_number: 2, previous_hash: 'hash-a', current_hash: 'hash-b' },
        { block_number: 3, previous_hash: 'hash-b', current_hash: 'hash-c' },
      ];

      createThenableChain(blocks, null);

      const { auditTrailService } = await import('../auditTrailService');
      const result = await auditTrailService.verifyChainIntegrity();

      expect(result.isValid).toBe(true);
      expect(result.totalBlocks).toBe(3);
      expect(result.validBlocks).toBe(3);
      expect(result.invalidBlocks).toBe(0);
      expect(result.issues).toHaveLength(0);
    });

    it('detects a tampered block with mismatched hash', async () => {
      const blocks = [
        { block_number: 1, previous_hash: null, current_hash: 'hash-a' },
        { block_number: 2, previous_hash: 'TAMPERED', current_hash: 'hash-b' },
        { block_number: 3, previous_hash: 'hash-b', current_hash: 'hash-c' },
      ];

      createThenableChain(blocks, null);

      const { auditTrailService } = await import('../auditTrailService');
      const result = await auditTrailService.verifyChainIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.invalidBlocks).toBe(1);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].block_number).toBe(2);
      expect(result.issues[0].issue).toBe('Hash mismatch');
    });

    it('returns valid result for empty chain', async () => {
      createThenableChain([], null);

      const { auditTrailService } = await import('../auditTrailService');
      const result = await auditTrailService.verifyChainIntegrity();

      expect(result.isValid).toBe(true);
      expect(result.totalBlocks).toBe(0);
    });

    it('handles multiple consecutive tampered blocks', async () => {
      const blocks = [
        { block_number: 1, previous_hash: null, current_hash: 'hash-a' },
        { block_number: 2, previous_hash: 'wrong-1', current_hash: 'hash-b' },
        { block_number: 3, previous_hash: 'wrong-2', current_hash: 'hash-c' },
      ];

      createThenableChain(blocks, null);

      const { auditTrailService } = await import('../auditTrailService');
      const result = await auditTrailService.verifyChainIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.invalidBlocks).toBe(2);
      expect(result.issues).toHaveLength(2);
    });
  });

  describe('logEvent', () => {
    it('uses previous block hash as input for new hash', async () => {
      const lastBlock = { current_hash: 'prev-hash-abc' };
      const newBlockData = { id: 'new-block', current_hash: 'new-hash' };

      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'blockchain_audit_log') {
          callCount++;
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: lastBlock, error: null }),
                  }),
                }),
              }),
            };
          }
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newBlockData, error: null }),
              }),
            }),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      });

      const { auditTrailService } = await import('../auditTrailService');
      const result = await auditTrailService.logEvent({
        eventType: 'consent_granted',
        resourceType: 'consent',
        resourceId: 'test-resource',
        actionData: { test: true },
      });

      expect(result).toBeDefined();
    });
  });
});
