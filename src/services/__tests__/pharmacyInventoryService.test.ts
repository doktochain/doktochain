import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase');

function chainMock(resolveValue: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
    eq: vi.fn(), neq: vi.fn(), lte: vi.fn(), gte: vi.fn(), or: vi.fn(),
    order: vi.fn(), limit: vi.fn(),
    single: vi.fn().mockResolvedValue(resolveValue),
    maybeSingle: vi.fn().mockResolvedValue(resolveValue),
    then: (resolve: any) => resolve(resolveValue),
  };
  Object.keys(chain).forEach((k) => {
    if (!['then', 'single', 'maybeSingle'].includes(k)) chain[k].mockReturnValue(chain);
  });
  return chain;
}

const { pharmacyInventoryService } = await import('../pharmacyInventoryService');

describe('pharmacyInventoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getInventory', () => {
    it('queries inventory by pharmacy_id', async () => {
      const items = [{ id: 'i1', medication_name: 'Aspirin', stock_quantity: 100 }];
      const chain = chainMock({ data: items, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyInventoryService.getInventory('ph1');
      expect(result).toEqual(items);
      expect(supabase.from).toHaveBeenCalledWith('pharmacy_inventory');
      expect(chain.eq).toHaveBeenCalledWith('pharmacy_id', 'ph1');
    });

    it('applies category filter', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await pharmacyInventoryService.getInventory('ph1', { category: 'cat1' });
      expect(chain.eq).toHaveBeenCalledWith('category_id', 'cat1');
    });

    it('applies lowStock filter', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await pharmacyInventoryService.getInventory('ph1', { lowStock: true });
      expect(chain.lte).toHaveBeenCalledWith('stock_quantity', 'reorder_level');
    });

    it('applies search filter with or clause', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await pharmacyInventoryService.getInventory('ph1', { search: 'aspirin' });
      expect(chain.or).toHaveBeenCalledWith(
        expect.stringContaining('medication_name.ilike.%aspirin%')
      );
    });

    it('returns empty array when data is null', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyInventoryService.getInventory('ph1');
      expect(result).toEqual([]);
    });
  });

  describe('getInventoryItem', () => {
    it('returns item by id', async () => {
      const item = { id: 'i1', medication_name: 'Aspirin' };
      const chain = chainMock({ data: item, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyInventoryService.getInventoryItem('i1');
      expect(result).toEqual(item);
    });

    it('returns null when not found', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyInventoryService.getInventoryItem('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('addInventoryItem', () => {
    it('inserts and returns item', async () => {
      const item = { id: 'i1', medication_name: 'Ibuprofen' };
      const chain = chainMock({ data: item, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyInventoryService.addInventoryItem({ medication_name: 'Ibuprofen' } as any);
      expect(result).toEqual(item);
      expect(supabase.from).toHaveBeenCalledWith('pharmacy_inventory');
    });
  });

  describe('deleteInventoryItem', () => {
    it('deletes item and returns true', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyInventoryService.deleteInventoryItem('i1');
      expect(result).toBe(true);
    });
  });

  describe('getTransactionHistory', () => {
    it('queries transactions by pharmacy_id', async () => {
      const txns = [{ id: 't1', transaction_type: 'received' }];
      const chain = chainMock({ data: txns, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyInventoryService.getTransactionHistory('ph1');
      expect(result).toEqual(txns);
      expect(supabase.from).toHaveBeenCalledWith('inventory_transactions');
    });

    it('applies date range filters', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await pharmacyInventoryService.getTransactionHistory('ph1', {
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      });
      expect(chain.gte).toHaveBeenCalledWith('transaction_date', '2025-01-01');
      expect(chain.lte).toHaveBeenCalledWith('transaction_date', '2025-12-31');
    });

    it('filters by transaction type', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await pharmacyInventoryService.getTransactionHistory('ph1', { type: 'dispensed' });
      expect(chain.eq).toHaveBeenCalledWith('transaction_type', 'dispensed');
    });
  });

  describe('getLowStockItems', () => {
    it('filters items where stock <= reorder level', async () => {
      const items = [
        { id: 'i1', stock_quantity: 5, reorder_level: 10, is_available: true },
        { id: 'i2', stock_quantity: 50, reorder_level: 10, is_available: true },
      ];
      const chain = chainMock({ data: items, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyInventoryService.getLowStockItems('ph1');
      expect(result).toEqual([items[0]]);
    });
  });

  describe('getExpiringItems', () => {
    it('queries items expiring within days ahead', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await pharmacyInventoryService.getExpiringItems('ph1', 30);
      expect(supabase.from).toHaveBeenCalledWith('pharmacy_inventory');
      expect(chain.lte).toHaveBeenCalledWith('expiry_date', expect.any(String));
    });
  });

  describe('getCategories', () => {
    it('queries active categories', async () => {
      const cats = [{ id: 'c1', name: 'Analgesics' }];
      const chain = chainMock({ data: cats, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyInventoryService.getCategories();
      expect(result).toEqual(cats);
      expect(supabase.from).toHaveBeenCalledWith('inventory_categories');
    });
  });

  describe('getSuppliers', () => {
    it('queries active suppliers', async () => {
      const suppliers = [{ id: 's1', supplier_name: 'MedSupply' }];
      const chain = chainMock({ data: suppliers, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyInventoryService.getSuppliers();
      expect(result).toEqual(suppliers);
      expect(supabase.from).toHaveBeenCalledWith('product_suppliers');
    });
  });

  describe('checkInsuranceCoverage', () => {
    it('queries insurance formularies', async () => {
      const coverage = { id: 'cov1', covered: true };
      const chain = chainMock({ data: coverage, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyInventoryService.checkInsuranceCoverage('DIN123', 'SunLife', 'Basic');
      expect(result).toEqual(coverage);
      expect(supabase.from).toHaveBeenCalledWith('insurance_formularies');
      expect(chain.eq).toHaveBeenCalledWith('din_number', 'DIN123');
    });

    it('returns null when not covered', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyInventoryService.checkInsuranceCoverage('DIN999', 'Unknown', 'Plan');
      expect(result).toBeNull();
    });
  });

  describe('bulkImportInventory', () => {
    it('adds pharmacy_id to all items', async () => {
      const items = [
        { medication_name: 'A' },
        { medication_name: 'B' },
      ];
      const chain = chainMock({ data: items, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await pharmacyInventoryService.bulkImportInventory('ph1', items as any);
      expect(chain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ pharmacy_id: 'ph1', medication_name: 'A' }),
          expect.objectContaining({ pharmacy_id: 'ph1', medication_name: 'B' }),
        ])
      );
    });
  });
});
