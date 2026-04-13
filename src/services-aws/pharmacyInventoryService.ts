import { api } from '../lib/api-client';

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
    const params: Record<string, any> = {
      pharmacy_id: pharmacyId,
      order_by: 'medication_name:asc',
    };

    if (filters?.category) {
      params.category_id = filters.category;
    }

    if (filters?.lowStock) {
      params.low_stock = true;
    }

    if (filters?.search) {
      params.search = filters.search;
    }

    const { data, error } = await api.get<any[]>('/pharmacy-inventory', { params });

    if (error) throw error;
    return data || [];
  },

  async getInventoryItem(itemId: string) {
    const { data, error } = await api.get<any>(`/pharmacy-inventory/${itemId}`);

    if (error) throw error;
    return data;
  },

  async addInventoryItem(data: Partial<InventoryItem>) {
    const { data: item, error } = await api.post<any>('/pharmacy-inventory', data);

    if (error) throw error;
    return item;
  },

  async updateInventoryItem(itemId: string, updates: Partial<InventoryItem>) {
    const { data, error } = await api.put<any>(`/pharmacy-inventory/${itemId}`, { ...updates, updated_at: new Date().toISOString() });

    if (error) throw error;
    return data;
  },

  async deleteInventoryItem(itemId: string) {
    const { error } = await api.delete(`/pharmacy-inventory/${itemId}`);

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

    const { data, error } = await api.post<any>('/inventory-transactions', {
      pharmacy_id: pharmacyId,
      inventory_id: itemId,
      transaction_type: transactionType,
      quantity_change: quantityChange,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      staff_id: staffId,
      notes,
    });

    if (error) throw error;
    return data;
  },

  async getTransactionHistory(pharmacyId: string, filters?: {
    inventoryId?: string;
    startDate?: string;
    endDate?: string;
    type?: string;
  }) {
    const params: Record<string, any> = {
      pharmacy_id: pharmacyId,
      include: 'pharmacy_inventory,pharmacy_staff,pharmacy_staff.user_profiles',
      order_by: 'transaction_date:desc',
    };

    if (filters?.inventoryId) {
      params.inventory_id = filters.inventoryId;
    }

    if (filters?.startDate) {
      params.transaction_date_gte = filters.startDate;
    }

    if (filters?.endDate) {
      params.transaction_date_lte = filters.endDate;
    }

    if (filters?.type) {
      params.transaction_type = filters.type;
    }

    const { data, error } = await api.get<any[]>('/inventory-transactions', { params });

    if (error) throw error;
    return data || [];
  },

  async getLowStockItems(pharmacyId: string) {
    const { data, error } = await api.get<any[]>('/pharmacy-inventory', {
      params: {
        pharmacy_id: pharmacyId,
        is_available: true,
        order_by: 'stock_quantity:asc',
      },
    });

    if (error) throw error;
    return (data || []).filter(
      (item: any) => item.stock_quantity <= item.reorder_level
    );
  },

  async getExpiringItems(pharmacyId: string, daysAhead: number = 90) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const { data, error } = await api.get<any[]>('/pharmacy-inventory', {
      params: {
        pharmacy_id: pharmacyId,
        expiry_date_lte: futureDate.toISOString().split('T')[0],
        order_by: 'expiry_date:asc',
      },
    });

    if (error) throw error;
    return data || [];
  },

  async getCategories() {
    const { data, error } = await api.get<any[]>('/inventory-categories', {
      params: {
        is_active: true,
        order_by: 'display_order:asc',
      },
    });

    if (error) throw error;
    return data || [];
  },

  async addProductImage(inventoryId: string, imageUrl: string, imageType: string, isPrimary: boolean = false) {
    const { data, error } = await api.post<any>('/product-images', {
      inventory_id: inventoryId,
      image_url: imageUrl,
      image_type: imageType,
      is_primary: isPrimary,
    });

    if (error) throw error;
    return data;
  },

  async getSuppliers() {
    const { data, error } = await api.get<any[]>('/product-suppliers', {
      params: {
        is_active: true,
        order_by: 'supplier_name:asc',
      },
    });

    if (error) throw error;
    return data || [];
  },

  async addSupplier(data: Partial<Supplier>) {
    const { data: supplier, error } = await api.post<any>('/product-suppliers', data);

    if (error) throw error;
    return supplier;
  },

  async updateSupplier(supplierId: string, updates: Partial<Supplier>) {
    const { data, error } = await api.put<any>(`/product-suppliers/${supplierId}`, updates);

    if (error) throw error;
    return data;
  },

  async checkInsuranceCoverage(dinNumber: string, insuranceProvider: string, planName: string) {
    const { data, error } = await api.get<any>('/insurance-formularies/check', {
      params: {
        din_number: dinNumber,
        insurance_provider: insuranceProvider,
        insurance_plan_name: planName,
      },
    });

    if (error) throw error;
    return data;
  },

  async bulkImportInventory(pharmacyId: string, items: Partial<InventoryItem>[]) {
    const itemsWithPharmacyId = items.map(item => ({
      ...item,
      pharmacy_id: pharmacyId,
    }));

    const { data, error } = await api.post<any[]>('/pharmacy-inventory/bulk', itemsWithPharmacyId);

    if (error) throw error;
    return data || [];
  },

  async getInventoryValue(pharmacyId: string) {
    const inventory = await this.getInventory(pharmacyId);

    const totalValue = inventory.reduce((sum: number, item: any) => {
      return sum + (item.stock_quantity * item.unit_price_cents);
    }, 0);

    return {
      totalValue: totalValue,
      totalItems: inventory.length,
      totalUnits: inventory.reduce((sum: number, item: any) => sum + item.stock_quantity, 0),
    };
  },
};
