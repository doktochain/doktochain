import { supabase } from '../lib/supabase';
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
    const { data, error } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('is_active', true)
      .order('pharmacy_name');

    if (error) throw error;
    return data || [];
  },

  async searchPharmacies(filters: {
    city?: string;
    province?: string;
    postalCode?: string;
    acceptsDelivery?: boolean;
  }): Promise<Pharmacy[]> {
    let query = supabase
      .from('pharmacies')
      .select('*')
      .eq('is_active', true)
      .eq('is_verified', true);

    if (filters.city) {
      query = query.ilike('city', `%${filters.city}%`);
    }

    if (filters.province) {
      query = query.eq('province', filters.province);
    }

    if (filters.acceptsDelivery !== undefined) {
      query = query.eq('accepts_delivery', filters.acceptsDelivery);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  // Get pharmacy by ID
  async getPharmacy(pharmacyId: string): Promise<Pharmacy | null> {
    const { data, error } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('id', pharmacyId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Get pharmacy by user ID
  async getPharmacyByUserId(userId: string): Promise<Pharmacy | null> {
    const { data, error } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Search medications in pharmacy inventory
  async searchMedications(pharmacyId: string, searchTerm: string): Promise<PharmacyInventory[]> {
    const { data, error } = await supabase
      .from('pharmacy_inventory')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .eq('is_available', true)
      .or(`medication_name.ilike.%${sanitizeSearchInput(searchTerm)}%,generic_name.ilike.%${sanitizeSearchInput(searchTerm)}%,brand_name.ilike.%${sanitizeSearchInput(searchTerm)}%`);

    if (error) throw error;
    return data || [];
  },

  // Get inventory by DIN
  async getInventoryByDIN(pharmacyId: string, dinNumber: string): Promise<PharmacyInventory | null> {
    const { data, error } = await supabase
      .from('pharmacy_inventory')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .eq('din_number', dinNumber)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Create pharmacy order
  async createOrder(orderData: Partial<PharmacyOrder>): Promise<PharmacyOrder> {
    const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const { data, error } = await supabase
      .from('pharmacy_orders')
      .insert({
        ...orderData,
        order_number: orderNumber,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Add order items
  async addOrderItems(items: any[]): Promise<any[]> {
    const { data, error } = await supabase
      .from('order_items')
      .insert(items)
      .select();

    if (error) throw error;
    return data || [];
  },

  // Get order by ID
  async getOrder(orderId: string): Promise<PharmacyOrder | null> {
    const { data, error } = await supabase
      .from('pharmacy_orders')
      .select('*, patients(*, user_profiles(*)), pharmacies(*), order_items(*)')
      .eq('id', orderId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Get patient orders
  async getPatientOrders(patientId: string, status?: string): Promise<PharmacyOrder[]> {
    let query = supabase
      .from('pharmacy_orders')
      .select('*, pharmacies(*), order_items(*)')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  // Get pharmacy orders
  async getPharmacyOrders(pharmacyId: string, status?: string): Promise<PharmacyOrder[]> {
    let query = supabase
      .from('pharmacy_orders')
      .select('*, patients(*, user_profiles(*)), order_items(*)')
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  // Update order status
  async updateOrderStatus(orderId: string, status: string): Promise<PharmacyOrder> {
    const { data, error } = await supabase
      .from('pharmacy_orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Create delivery tracking
  async createDelivery(deliveryData: any): Promise<any> {
    const { data, error } = await supabase
      .from('order_deliveries')
      .insert(deliveryData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update delivery status
  async updateDeliveryStatus(deliveryId: string, status: string, updates?: any): Promise<any> {
    const { data, error } = await supabase
      .from('order_deliveries')
      .update({
        delivery_status: status,
        ...updates,
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get order delivery
  async getOrderDelivery(orderId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('order_deliveries')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Update inventory stock
  async updateInventoryStock(inventoryId: string, quantityChange: number): Promise<PharmacyInventory> {
    const { data: currentInventory, error: fetchError } = await supabase
      .from('pharmacy_inventory')
      .select('stock_quantity')
      .eq('id', inventoryId)
      .single();

    if (fetchError) throw fetchError;

    const newQuantity = currentInventory.stock_quantity + quantityChange;

    const { data, error } = await supabase
      .from('pharmacy_inventory')
      .update({ stock_quantity: newQuantity })
      .eq('id', inventoryId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get low stock items
  async getLowStockItems(pharmacyId: string): Promise<PharmacyInventory[]> {
    const { data, error } = await supabase
      .from('pharmacy_inventory')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .lte('stock_quantity', 'reorder_level');

    if (error) throw error;
    return data || [];
  },
};
