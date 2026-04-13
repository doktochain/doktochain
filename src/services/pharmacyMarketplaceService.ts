import { supabase } from '../lib/supabase';

export interface Pharmacy {
  id: string;
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
  hours_of_operation: Record<string, any>;
  accepts_delivery: boolean;
  delivery_fee_cents: number;
  minimum_order_cents: number;
  rating_average: number;
  rating_count: number;
  is_verified: boolean;
  is_active: boolean;
}

export interface PharmacySearchFilters {
  postal_code?: string;
  radius_km?: number;
  has_delivery?: boolean;
  is_open_now?: boolean;
  is_24_hours?: boolean;
  min_rating?: number;
}

export interface PharmacyOrder {
  id: string;
  order_number: string;
  patient_id: string;
  pharmacy_id: string;
  order_type: string;
  status: string;
  subtotal_cents: number;
  delivery_fee_cents: number;
  tax_cents: number;
  total_cents: number;
  payment_method?: string;
  payment_status: string;
  delivery_address_line1?: string;
  delivery_city?: string;
  delivery_province?: string;
  delivery_postal_code?: string;
  delivery_instructions?: string;
  is_pickup: boolean;
  created_at: string;
  updated_at: string;
}

export const pharmacyMarketplaceService = {
  async searchPharmacies(filters: PharmacySearchFilters = {}): Promise<{
    data: Pharmacy[] | null;
    error: Error | null;
  }> {
    try {
      let query = supabase
        .from('pharmacies')
        .select('*')
        .eq('is_active', true);

      if (filters.has_delivery) {
        query = query.eq('accepts_delivery', true);
      }

      if (filters.min_rating) {
        query = query.gte('rating_average', filters.min_rating);
      }

      if (filters.postal_code) {
        query = query.ilike('postal_code', `${filters.postal_code}%`);
      }

      query = query.order('rating_average', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getPharmacyById(pharmacyId: string): Promise<{
    data: Pharmacy | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('id', pharmacyId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async createOrder(orderData: {
    patient_id: string;
    pharmacy_id: string;
    order_type: string;
    is_pickup: boolean;
    delivery_address?: {
      line1: string;
      line2?: string;
      city: string;
      province: string;
      postal_code: string;
    };
    delivery_instructions?: string;
  }): Promise<{ data: PharmacyOrder | null; error: Error | null }> {
    try {
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const { data, error } = await supabase
        .from('pharmacy_orders')
        .insert({
          order_number: orderNumber,
          patient_id: orderData.patient_id,
          pharmacy_id: orderData.pharmacy_id,
          order_type: orderData.order_type,
          status: 'placed',
          subtotal_cents: 0,
          delivery_fee_cents: 0,
          tax_cents: 0,
          total_cents: 0,
          payment_status: 'pending',
          is_pickup: orderData.is_pickup,
          delivery_address_line1: orderData.delivery_address?.line1,
          delivery_city: orderData.delivery_address?.city,
          delivery_province: orderData.delivery_address?.province,
          delivery_postal_code: orderData.delivery_address?.postal_code,
          delivery_instructions: orderData.delivery_instructions,
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getPatientOrders(patientId: string): Promise<{
    data: PharmacyOrder[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('pharmacy_orders')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getOrderById(orderId: string): Promise<{
    data: PharmacyOrder | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('pharmacy_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async updateOrderStatus(
    orderId: string,
    status: string,
    notes?: string
  ): Promise<{ data: PharmacyOrder | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('pharmacy_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async createOrderWithItems(orderData: {
    patient_id: string;
    pharmacy_id: string;
    items: Array<{
      inventory_id?: string;
      medication_name: string;
      quantity: number;
      unit_price_cents: number;
    }>;
    is_pickup: boolean;
    delivery_address?: {
      line1: string;
      line2?: string;
      city: string;
      province: string;
      postal_code: string;
    };
    delivery_fee_cents?: number;
    delivery_instructions?: string;
  }): Promise<{ data: PharmacyOrder | null; error: Error | null }> {
    try {
      const subtotal = orderData.items.reduce(
        (sum, item) => sum + item.unit_price_cents * item.quantity,
        0
      );
      const deliveryFee = orderData.is_pickup ? 0 : (orderData.delivery_fee_cents || 0);
      const taxCents = Math.round(subtotal * 0.13);
      const total = subtotal + deliveryFee + taxCents;
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const { data: order, error: orderError } = await supabase
        .from('pharmacy_orders')
        .insert({
          order_number: orderNumber,
          patient_id: orderData.patient_id,
          pharmacy_id: orderData.pharmacy_id,
          order_type: 'otc',
          status: 'placed',
          subtotal_cents: subtotal,
          delivery_fee_cents: deliveryFee,
          tax_cents: taxCents,
          total_cents: total,
          payment_status: 'pending',
          is_pickup: orderData.is_pickup,
          delivery_address_line1: orderData.delivery_address?.line1,
          delivery_city: orderData.delivery_address?.city,
          delivery_province: orderData.delivery_address?.province,
          delivery_postal_code: orderData.delivery_address?.postal_code,
          delivery_instructions: orderData.delivery_instructions,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = orderData.items.map((item) => ({
        order_id: order.id,
        inventory_id: item.inventory_id || null,
        medication_name: item.medication_name,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
        total_price_cents: item.unit_price_cents * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      return { data: order, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  },

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },
};