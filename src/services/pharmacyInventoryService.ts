import { supabase } from '../lib/supabase';

export interface InventoryItem {
  id: string;
  pharmacy_id: string;
  medication_name: string;
  din_number?: string;
  ndc_code?: string;
  generic_name?: string;
  brand_name?: string;
  strength?: string;
  form: string;
  manufacturer?: string;
  stock_quantity: number;
  reorder_level: number;
  unit_price_cents: number;
  requires_prescription: boolean;
  is_available: boolean;
  category_id?: string;
  therapeutic_class?: string;
  controlled_substance_schedule?: string;
  expiry_date?: string;
  batch_number?: string;
}

export interface InventoryTransaction {
  id: string;
  pharmacy_id: string;
  inventory_id: string;
  transaction_type: 'received' | 'dispensed' | 'adjusted' | 'expired' | 'returned' | 'damaged' | 'transferred';
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  unit_cost_cents?: number;
  total_cost_cents?: number;
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  supplier_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  ordering_lead_time_days: number;
  is_preferred: boolean;
  is_active: boolean;
}

export const pharmacyInventoryService = {
  async getInventory(pharmacyId: string, filters?: {
    category?: string;
    lowStock?: boolean;
    search?: string;
  }) {
    let query = supabase
      .from('pharmacy_inventory')
      .select('*')
      .eq('pharmacy_id', pharmacyId);

    if (filters?.category) {
      query = query.eq('category_id', filters.category);
    }

    if (filters?.lowStock) {
      query = query.lte('stock_quantity', 'reorder_level');
    }

    if (filters?.search) {
      query = query.or(`medication_name.ilike.%${filters.search}%,generic_name.ilike.%${filters.search}%,brand_name.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('medication_name');

    if (error) throw error;
    return data || [];
  },

  async getInventoryItem(itemId: string) {
    const { data, error } = await supabase
      .from('pharmacy_inventory')
      .select('*')
      .eq('id', itemId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async addInventoryItem(data: Partial<InventoryItem>) {
    const { data: item, error } = await supabase
      .from('pharmacy_inventory')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return item;
  },

  async updateInventoryItem(itemId: string, updates: Partial<InventoryItem>) {
    const { data, error } = await supabase
      .from('pharmacy_inventory')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteInventoryItem(itemId: string) {
    const { error } = await supabase
      .from('pharmacy_inventory')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
    return true;
  },

  async updateStock(
    itemId: string,
    pharmacyId: string,
    quantityChange: number,
    transactionType: InventoryTransaction['transaction_type'],
    staffId: string,
    notes?: string
  ) {
    const item = await this.getInventoryItem(itemId);
    if (!item) throw new Error('Inventory item not found');

    const quantityBefore = item.stock_quantity;
    const quantityAfter = quantityBefore + quantityChange;

    await this.updateInventoryItem(itemId, { stock_quantity: quantityAfter });

    const { data, error } = await supabase
      .from('inventory_transactions')
      .insert({
        pharmacy_id: pharmacyId,
        inventory_id: itemId,
        transaction_type: transactionType,
        quantity_change: quantityChange,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        staff_id: staffId,
        notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getTransactionHistory(pharmacyId: string, filters?: {
    inventoryId?: string;
    startDate?: string;
    endDate?: string;
    type?: string;
  }) {
    let query = supabase
      .from('inventory_transactions')
      .select('*, pharmacy_inventory(*), pharmacy_staff(*, user_profiles(*))')
      .eq('pharmacy_id', pharmacyId);

    if (filters?.inventoryId) {
      query = query.eq('inventory_id', filters.inventoryId);
    }

    if (filters?.startDate) {
      query = query.gte('transaction_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('transaction_date', filters.endDate);
    }

    if (filters?.type) {
      query = query.eq('transaction_type', filters.type);
    }

    const { data, error } = await query.order('transaction_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getLowStockItems(pharmacyId: string) {
    const { data, error } = await supabase
      .from('pharmacy_inventory')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .eq('is_available', true)
      .order('stock_quantity', { ascending: true });

    if (error) throw error;
    return (data || []).filter(
      (item: any) => item.stock_quantity <= item.reorder_level
    );
  },

  async getExpiringItems(pharmacyId: string, daysAhead: number = 90) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const { data, error } = await supabase
      .from('pharmacy_inventory')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .lte('expiry_date', futureDate.toISOString().split('T')[0])
      .order('expiry_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getCategories() {
    const { data, error } = await supabase
      .from('inventory_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;
    return data || [];
  },

  async addProductImage(inventoryId: string, imageUrl: string, imageType: string, isPrimary: boolean = false) {
    const { data, error } = await supabase
      .from('product_images')
      .insert({
        inventory_id: inventoryId,
        image_url: imageUrl,
        image_type: imageType,
        is_primary: isPrimary,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSuppliers() {
    const { data, error } = await supabase
      .from('product_suppliers')
      .select('*')
      .eq('is_active', true)
      .order('supplier_name');

    if (error) throw error;
    return data || [];
  },

  async addSupplier(data: Partial<Supplier>) {
    const { data: supplier, error } = await supabase
      .from('product_suppliers')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return supplier;
  },

  async updateSupplier(supplierId: string, updates: Partial<Supplier>) {
    const { data, error } = await supabase
      .from('product_suppliers')
      .update(updates)
      .eq('id', supplierId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async checkInsuranceCoverage(dinNumber: string, insuranceProvider: string, planName: string) {
    const { data, error } = await supabase
      .from('insurance_formularies')
      .select('*')
      .eq('din_number', dinNumber)
      .eq('insurance_provider', insuranceProvider)
      .eq('insurance_plan_name', planName)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async bulkImportInventory(pharmacyId: string, items: Partial<InventoryItem>[]) {
    const itemsWithPharmacyId = items.map(item => ({
      ...item,
      pharmacy_id: pharmacyId,
    }));

    const { data, error } = await supabase
      .from('pharmacy_inventory')
      .insert(itemsWithPharmacyId)
      .select();

    if (error) throw error;
    return data || [];
  },

  async getInventoryValue(pharmacyId: string) {
    const inventory = await this.getInventory(pharmacyId);

    const totalValue = inventory.reduce((sum, item) => {
      return sum + (item.stock_quantity * item.unit_price_cents);
    }, 0);

    return {
      totalValue: totalValue,
      totalItems: inventory.length,
      totalUnits: inventory.reduce((sum, item) => sum + item.stock_quantity, 0),
    };
  },
};
