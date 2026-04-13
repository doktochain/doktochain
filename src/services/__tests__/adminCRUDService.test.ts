import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin1' } } }),
    },
  },
}));

vi.mock('../auditLogger', () => ({
  auditLog: {
    adminAction: vi.fn().mockResolvedValue(undefined),
  },
}));

function chainMock(resolveValue: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
    eq: vi.fn(), neq: vi.fn(), in: vi.fn(), gte: vi.fn(), lte: vi.fn(), or: vi.fn(), is: vi.fn(),
    order: vi.fn(), limit: vi.fn(), ilike: vi.fn(),
    single: vi.fn().mockResolvedValue(resolveValue),
    maybeSingle: vi.fn().mockResolvedValue(resolveValue),
    then: (resolve: any) => resolve(resolveValue),
  };
  Object.keys(chain).forEach((k) => {
    if (!['then', 'single', 'maybeSingle'].includes(k)) chain[k].mockReturnValue(chain);
  });
  return chain;
}

import { supabase } from '../../lib/supabase';
import { adminCRUDService } from '../adminCRUDService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('adminCRUDService', () => {
  describe('create', () => {
    it('inserts record and logs audit', async () => {
      const record = { id: 'rec1', name: 'Test' };
      const chain = chainMock({ data: record, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await adminCRUDService.create('users', { name: 'Test' });
      expect(result).toEqual(record);
      expect(supabase.from).toHaveBeenCalledWith('users');
    });

    it('throws on insert error', async () => {
      const chain = chainMock({ data: null, error: new Error('Insert failed') });
      (supabase.from as any).mockReturnValue(chain);

      await expect(adminCRUDService.create('users', { name: 'Test' })).rejects.toThrow('Insert failed');
    });
  });

  describe('update', () => {
    it('updates record with timestamp', async () => {
      const updated = { id: 'rec1', name: 'Updated' };
      const chain = chainMock({ data: updated, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await adminCRUDService.update('users', 'rec1', { name: 'Updated' });
      expect(result).toEqual(updated);
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated' }));
    });

    it('logs status change when status differs', async () => {
      const updated = { id: 'rec1', status: 'active' };
      const chain = chainMock({ data: updated, error: null });
      (supabase.from as any).mockReturnValue(chain);

      await adminCRUDService.update('users', 'rec1', { status: 'active' }, { status: 'inactive' });
      expect(supabase.from).toHaveBeenCalledWith('entity_status_history');
    });

    it('does not log status change when status same', async () => {
      const updated = { id: 'rec1', status: 'active' };
      const chain = chainMock({ data: updated, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const fromCalls: string[] = [];
      (supabase.from as any).mockImplementation((table: string) => {
        fromCalls.push(table);
        return chain;
      });

      await adminCRUDService.update('users', 'rec1', { name: 'Updated' }, { name: 'Old', status: 'active' });
      expect(fromCalls).not.toContain('entity_status_history');
    });
  });

  describe('softDelete', () => {
    it('sets deleted_at timestamp', async () => {
      const chain = chainMock({ data: { id: 'rec1' }, error: null });
      (supabase.from as any).mockReturnValue(chain);

      await adminCRUDService.softDelete('users', 'rec1', 'No longer needed');
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
        deleted_at: expect.any(String),
      }));
    });

    it('throws on error', async () => {
      const getChain = chainMock({ data: { id: 'rec1' }, error: null });
      const updateChain = chainMock({ data: null, error: new Error('Delete failed') });

      (supabase.from as any)
        .mockReturnValueOnce(getChain)
        .mockReturnValueOnce(updateChain);

      await expect(adminCRUDService.softDelete('users', 'rec1')).rejects.toThrow('Delete failed');
    });
  });

  describe('restore', () => {
    it('clears deleted_at', async () => {
      const restored = { id: 'rec1', deleted_at: null };
      const chain = chainMock({ data: restored, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await adminCRUDService.restore('users', 'rec1');
      expect(result).toEqual(restored);
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
        deleted_at: null,
      }));
    });
  });

  describe('hardDelete', () => {
    it('permanently removes record', async () => {
      const chain = chainMock({ data: { id: 'rec1' }, error: null });
      (supabase.from as any).mockReturnValue(chain);

      await adminCRUDService.hardDelete('users', 'rec1', 'GDPR request');
      expect(chain.delete).toHaveBeenCalled();
    });
  });

  describe('bulkUpdate', () => {
    it('updates multiple records', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as any).mockReturnValue(chain);

      await adminCRUDService.bulkUpdate('users', ['r1', 'r2'], { status: 'active' });
      expect(chain.in).toHaveBeenCalledWith('id', ['r1', 'r2']);
    });

    it('throws on error', async () => {
      const chain = chainMock({ data: null, error: new Error('Bulk fail') });
      (supabase.from as any).mockReturnValue(chain);

      await expect(adminCRUDService.bulkUpdate('users', ['r1'], { status: 'x' })).rejects.toThrow('Bulk fail');
    });
  });

  describe('bulkDelete', () => {
    it('soft deletes by default', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as any).mockReturnValue(chain);

      await adminCRUDService.bulkDelete('users', ['r1', 'r2']);
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
        deleted_at: expect.any(String),
      }));
    });

    it('hard deletes when soft=false', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as any).mockReturnValue(chain);

      await adminCRUDService.bulkDelete('users', ['r1'], false);
      expect(chain.delete).toHaveBeenCalled();
    });
  });

  describe('getAll', () => {
    it('excludes deleted by default', async () => {
      const chain = chainMock({ data: [{ id: 'r1' }], error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await adminCRUDService.getAll('users');
      expect(result).toHaveLength(1);
      expect(chain.is).toHaveBeenCalledWith('deleted_at', null);
    });

    it('includes deleted when flag set', async () => {
      const chain = chainMock({ data: [{ id: 'r1' }], error: null });
      (supabase.from as any).mockReturnValue(chain);

      await adminCRUDService.getAll('users', true);
      expect(chain.is).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('returns record by ID', async () => {
      const record = { id: 'r1', name: 'Test' };
      const chain = chainMock({ data: record, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await adminCRUDService.getById('users', 'r1');
      expect(result).toEqual(record);
    });
  });

  describe('search', () => {
    it('searches across specified fields', async () => {
      const results = [{ id: 'r1', name: 'John' }];
      const chain = chainMock({ data: results, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await adminCRUDService.search('users', 'John', ['name', 'email']);
      expect(result).toEqual(results);
      expect(chain.or).toHaveBeenCalledWith('name.ilike.%John%,email.ilike.%John%');
    });

    it('excludes deleted records', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as any).mockReturnValue(chain);

      await adminCRUDService.search('users', 'test', ['name']);
      expect(chain.is).toHaveBeenCalledWith('deleted_at', null);
    });
  });

  describe('notes', () => {
    it('addNote creates a note', async () => {
      const note = { id: 'n1', note_content: 'Test note' };
      const chain = chainMock({ data: note, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await adminCRUDService.addNote('users', 'r1', 'Test note');
      expect(result).toEqual(note);
      expect(supabase.from).toHaveBeenCalledWith('admin_notes');
    });

    it('getNotes returns sorted notes', async () => {
      const notes = [{ id: 'n1' }, { id: 'n2' }];
      (supabase.from as any).mockReturnValue(chainMock({ data: notes, error: null }));

      const result = await adminCRUDService.getNotes('users', 'r1');
      expect(result).toHaveLength(2);
    });

    it('updateNote modifies note content', async () => {
      const updated = { id: 'n1', note_content: 'Updated' };
      const chain = chainMock({ data: updated, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await adminCRUDService.updateNote('n1', { note_content: 'Updated' });
      expect(result).toEqual(updated);
    });

    it('deleteNote removes note', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as any).mockReturnValue(chain);

      await adminCRUDService.deleteNote('n1');
      expect(chain.delete).toHaveBeenCalled();
    });
  });

  describe('getAuditLogs', () => {
    it('returns audit log entries for entity', async () => {
      const logs = [{ id: 'log1', action: 'create' }];
      (supabase.from as any).mockReturnValue(chainMock({ data: logs, error: null }));

      const result = await adminCRUDService.getAuditLogs('users', 'r1');
      expect(result).toEqual(logs);
      expect(supabase.from).toHaveBeenCalledWith('admin_audit_log');
    });
  });

  describe('getStatusHistory', () => {
    it('returns status history for entity', async () => {
      const history = [{ id: 'h1', new_status: 'active' }];
      (supabase.from as any).mockReturnValue(chainMock({ data: history, error: null }));

      const result = await adminCRUDService.getStatusHistory('users', 'r1');
      expect(result).toEqual(history);
    });
  });

  describe('exportToCSV', () => {
    it('exports data as CSV blob', async () => {
      const data = [
        { id: '1', name: 'John', email: 'john@example.com' },
        { id: '2', name: 'Jane', email: 'jane@example.com' },
      ];
      const chain = chainMock({ data, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const blob = await adminCRUDService.exportToCSV('users');
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/csv');
    });

    it('applies filters when provided', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as any).mockReturnValue(chain);

      await adminCRUDService.exportToCSV('users', { status: 'active' });
      expect(chain.eq).toHaveBeenCalledWith('status', 'active');
    });

    it('skips null filter values', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as any).mockReturnValue(chain);

      await adminCRUDService.exportToCSV('users', { status: null, role: 'admin' });
      expect(chain.eq).toHaveBeenCalledWith('role', 'admin');
      expect(chain.eq).not.toHaveBeenCalledWith('status', null);
    });

    it('handles empty data', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as any).mockReturnValue(chain);

      const blob = await adminCRUDService.exportToCSV('users');
      expect(blob).toBeInstanceOf(Blob);
    });
  });
});
