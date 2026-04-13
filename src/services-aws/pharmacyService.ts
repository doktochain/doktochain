import { api } from '../lib/api-client';
import { sanitizeSearchInput } from '../lib/security';

export interface Pharmacy {
  id: string;
  user_id: string;
  pharmacy_name: string;
  license_number: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  province: string;
  postal_code: string;
  latitude?: number;
  longitude?: number;
  accepts_delivery: boolean;
  delivery_fee_cents?: number;
  minimum_order_cents?: number;
  rating_average: number;
  rating_count: number;
  is_verified: boolean;
  is_active: boolean;
}

export interface PharmacyInventory {
  id: string;
  pharmacy_id: string;
  medication_name: string;
  din_number?: string;
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
}

export interface PharmacyOrder {
  id: string;
  order_number: string;
  patient_id: string;
  pharmacy_id: string;
  prescription_id?: string;
  order_type: 'prescription' | 'over-counter';
  status: string;
  subtotal_cents: number;
  delivery_fee_cents: number;
  tax_cents: number;
  total_cents: number;
  payment_status: string;
  is_pickup: boolean;
}

export const pharmacyService = {
  async getAllPharmacies(): Promise<Pharmacy[]> {
    const { data, error } = await api.get<Pharmacy[]>('/pharmacies', {
      params: {
        is_active: true,
        order_by: 'pharmacy_name:asc',
      },
    });

    if (error) throw error;
    return data || [];
  },

  async searchPharmacies(filters: {
    city?: string;
    province?: string;
    postalCode?: string;
    acceptsDelivery?: boolean;
  }): Promise<Pharmacy[]> {
    const params: Record<string, any> = {
      is_active: true,
      is_verified: true,
    };

    if (filters.city) {
      params.city_ilike = filters.city;
    }

    if (filters.province) {
      params.province = filters.province;
    }

    if (filters.acceptsDelivery !== undefined) {
      params.accepts_delivery = filters.acceptsDelivery;
    }

    const { data, error } = await api.get<Pharmacy[]>('/pharmacies', { params });

    if (error) throw error;
    return data || [];
  },

  async getPharmacy(pharmacyId: string): Promise<Pharmacy | null> {
    const { data, error } = await api.get<Pharmacy>(`/pharmacies/${pharmacyId}`);

    if (error) throw error;
    return data;
  },

  async getPharmacyByUserId(userId: string): Promise<Pharmacy | null> {
    const { data, error } = await api.get<Pharmacy>('/pharmacies/by-user', {
      params: { user_id: userId },
    });

    if (error) throw error;
    return data;
  },

  async searchMedications(pharmacyId: string, searchTerm: string): Promise<PharmacyInventory[]> {
    const { data, error } = await api.get<PharmacyInventory[]>('/pharmacy-inventory', {
      params: {
        pharmacy_id: pharmacyId,
        is_available: true,
        search: sanitizeSearchInput(searchTerm),
      },
    });

    if (error) throw error;
    return data || [];
  },

  async getInventoryByDIN(pharmacyId: string, dinNumber: string): Promise<PharmacyInventory | null> {
    const { data, error } = await api.get<PharmacyInventory>('/pharmacy-inventory/by-din', {
      params: {
        pharmacy_id: pharmacyId,
        din_number: dinNumber,
      },
    });

    if (error) throw error;
    return data;
  },

  async createOrder(orderData: Partial<PharmacyOrder>): Promise<PharmacyOrder> {
    const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const { data, error } = await api.post<PharmacyOrder>('/pharmacy-orders', {
      ...orderData,
      order_number: orderNumber,
    });

    if (error) throw error;
    return data!;
  },

  async addOrderItems(items: any[]): Promise<any[]> {
    const { data, error } = await api.post<any[]>('/order-items', items);

    if (error) throw error;
    return data || [];
  },

  async getOrder(orderId: string): Promise<PharmacyOrder | null> {
    const { data, error } = await api.get<PharmacyOrder>(`/pharmacy-orders/${orderId}`, {
      params: { include: 'patients,patients.user_profiles,pharmacies,order_items' },
    });

    if (error) throw error;
    return data;
  },

  async getPatientOrders(patientId: string, status?: string): Promise<PharmacyOrder[]> {
    const params: Record<string, any> = {
      patient_id: patientId,
      include: 'pharmacies,order_items',
      order_by: 'created_at:desc',
    };

    if (status) {
      params.status = status;
    }

    const { data, error } = await api.get<PharmacyOrder[]>('/pharmacy-orders', { params });

    if (error) throw error;
    return data || [];
  },

  async getPharmacyOrders(pharmacyId: string, status?: string): Promise<PharmacyOrder[]> {
    const params: Record<string, any> = {
      pharmacy_id: pharmacyId,
      include: 'patients,patients.user_profiles,order_items',
      order_by: 'created_at:desc',
    };

    if (status) {
      params.status = status;
    }

    const { data, error } = await api.get<PharmacyOrder[]>('/pharmacy-orders', { params });

    if (error) throw error;
    return data || [];
  },

  async updateOrderStatus(orderId: string, status: string): Promise<PharmacyOrder> {
    const { data, error } = await api.put<PharmacyOrder>(`/pharmacy-orders/${orderId}`, { status });

    if (error) throw error;
    return data!;
  },

  async createDelivery(deliveryData: any): Promise<any> {
    const { data, error } = await api.post<any>('/order-deliveries', deliveryData);

    if (error) throw error;
    return data!;
  },

  async updateDeliveryStatus(deliveryId: string, status: string, updates?: any): Promise<any> {
    const { data, error } = await api.put<any>(`/order-deliveries/${deliveryId}`, {
      delivery_status: status,
      ...updates,
    });

    if (error) throw error;
    return data!;
  },

  async getOrderDelivery(orderId: string): Promise<any | null> {
    const { data, error } = await api.get<any>('/order-deliveries/by-order', {
      params: { order_id: orderId },
    });

    if (error) throw error;
    return data;
  },

  async updateInventoryStock(inventoryId: string, quantityChange: number): Promise<PharmacyInventory> {
    const { data: currentInventory, error: fetchError } = await api.get<any>(`/pharmacy-inventory/${inventoryId}`, {
      params: { fields: 'stock_quantity' },
    });

    if (fetchError) throw fetchError;

    const newQuantity = currentInventory!.stock_quantity + quantityChange;

    const { data, error } = await api.put<PharmacyInventory>(`/pharmacy-inventory/${inventoryId}`, { stock_quantity: newQuantity });

    if (error) throw error;
    return data!;
  },

  async getLowStockItems(pharmacyId: string): Promise<PharmacyInventory[]> {
    const { data, error } = await api.get<PharmacyInventory[]>('/pharmacy-inventory', {
      params: {
        pharmacy_id: pharmacyId,
        low_stock: true,
      },
    });

    if (error) throw error;
    return data || [];
  },
};
