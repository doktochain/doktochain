import { supabase } from '../lib/supabase';
import { blockchainAuditService } from './blockchainAuditService';
import { auditLog } from './auditLogger';
import { notificationService } from './notificationService';

export interface OrderFulfillment {
  id: string;
  order_id: string;
  pharmacy_id: string;
  assigned_to?: string;
  fulfillment_status: 'pending' | 'picking' | 'verifying' | 'packing' | 'ready' | 'dispatched' | 'completed';
  picking_started_at?: string;
  picking_completed_at?: string;
  verification_started_at?: string;
  verification_completed_at?: string;
  packing_started_at?: string;
  packing_completed_at?: string;
  quality_check_at?: string;
  ready_for_pickup_at?: string;
  notes?: string;
}

export interface CourierAssignment {
  id: string;
  order_id: string;
  courier_type: 'internal' | 'third-party';
  courier_staff_id?: string;
  courier_name?: string;
  courier_phone?: string;
  delivery_status: 'assigned' | 'dispatched' | 'in-transit' | 'delivered' | 'failed' | 'returned';
  estimated_delivery_time?: string;
  actual_delivery_time?: string;
  delivery_proof_url?: string;
  delivery_notes?: string;
}

export const pharmacyOrderFulfillmentService = {
  async getOrders(pharmacyId: string, status?: string) {
    let query = supabase
      .from('pharmacy_orders')
      .select('*, patients(*, user_profiles(*)), order_items(*), order_fulfillment(*), courier_assignments(*)')
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getOrderById(orderId: string) {
    const { data, error } = await supabase
      .from('pharmacy_orders')
      .select('*, patients(*, user_profiles(*)), order_items(*, pharmacy_inventory(*)), order_fulfillment(*), courier_assignments(*), order_notes(*), order_status_history(*)')
      .eq('id', orderId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createFulfillment(data: Partial<OrderFulfillment>) {
    const { data: fulfillment, error } = await supabase
      .from('order_fulfillment')
      .insert(data)
      .select()
      .single();

    if (error) throw error;

    try {
      await auditLog.pharmacyOrderCreated(fulfillment.id, fulfillment.pharmacy_id || '', {
        order_id: fulfillment.order_id,
      });
    } catch {}

    return fulfillment;
  },

  async updateFulfillmentStatus(
    fulfillmentId: string,
    status: OrderFulfillment['fulfillment_status'],
    staffId: string
  ) {
    const updates: any = {
      fulfillment_status: status,
      updated_at: new Date().toISOString(),
    };

    const now = new Date().toISOString();

    switch (status) {
      case 'picking':
        updates.picking_started_at = now;
        updates.assigned_to = staffId;
        break;
      case 'verifying':
        updates.picking_completed_at = now;
        updates.verification_started_at = now;
        updates.verification_by = staffId;
        break;
      case 'packing':
        updates.verification_completed_at = now;
        updates.packing_started_at = now;
        break;
      case 'ready':
        updates.packing_completed_at = now;
        updates.quality_check_at = now;
        updates.quality_check_by = staffId;
        updates.ready_for_pickup_at = now;
        break;
      case 'dispatched':
        break;
      case 'completed':
        break;
    }

    const { data, error } = await supabase
      .from('order_fulfillment')
      .update(updates)
      .eq('id', fulfillmentId)
      .select()
      .single();

    if (error) throw error;

    try {
      const eventType = status === 'completed' ? 'order_fulfilled' : 'order_created';
      await blockchainAuditService.logEvent({
        eventType,
        resourceType: 'order_fulfillment',
        resourceId: fulfillmentId,
        actorId: staffId,
        actorRole: 'pharmacy',
        actionData: { fulfillment_status: status, order_id: data.order_id },
      });
    } catch {}

    if (status === 'ready' || status === 'completed') {
      try {
        const { data: order } = await supabase
          .from('pharmacy_orders')
          .select('patient_id, patients(user_id)')
          .eq('id', data.order_id)
          .maybeSingle();

        const patientUserId = (order as any)?.patients?.user_id;
        if (patientUserId) {
          const notifType = status === 'ready' ? 'order_ready_pickup' : 'delivery_completed';
          const title = status === 'ready' ? 'Order Ready for Pickup' : 'Order Completed';
          const message = status === 'ready'
            ? 'Your prescription order is ready for pickup at the pharmacy.'
            : 'Your prescription order has been completed.';

          await notificationService.createNotification({
            userId: patientUserId,
            type: notifType,
            category: 'delivery',
            priority: status === 'ready' ? 'high' : 'normal',
            title,
            message,
            actionUrl: '/dashboard/patient/pharmacy/orders',
            actionLabel: 'View Order',
            relatedEntityType: 'order',
            relatedEntityId: data.order_id,
          });
        }
      } catch {}
    }

    return data;
  },

  async assignStaff(fulfillmentId: string, staffId: string) {
    const { data, error } = await supabase
      .from('order_fulfillment')
      .update({ assigned_to: staffId })
      .eq('id', fulfillmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async addOrderNote(orderId: string, staffId: string, noteContent: string, noteType: string, isImportant: boolean = false) {
    const { data, error } = await supabase
      .from('order_notes')
      .insert({
        order_id: orderId,
        staff_id: staffId,
        note_content: noteContent,
        note_type: noteType,
        is_important: isImportant,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getOrderNotes(orderId: string) {
    const { data, error } = await supabase
      .from('order_notes')
      .select('*, pharmacy_staff(*, user_profiles(*))')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async updateOrderStatus(orderId: string, status: string, staffId: string, notes?: string) {
    const { data, error } = await supabase
      .from('pharmacy_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('order_status_history')
      .insert({
        order_id: orderId,
        status,
        changed_by: staffId,
        notes,
      });

    try {
      await blockchainAuditService.logEvent({
        eventType: status === 'delivered' ? 'order_delivered' : 'order_fulfilled',
        resourceType: 'pharmacy_order',
        resourceId: orderId,
        actorId: staffId,
        actorRole: 'pharmacy',
        actionData: { status, notes },
      });
    } catch {}

    if (status === 'ready' || status === 'completed' || status === 'delivered') {
      try {
        const { data: order } = await supabase
          .from('pharmacy_orders')
          .select('patient_id, patients(user_id)')
          .eq('id', orderId)
          .maybeSingle();

        const patientUserId = (order as any)?.patients?.user_id;
        if (patientUserId) {
          const notifMap: Record<string, { type: string; title: string; message: string }> = {
            ready: { type: 'order_ready_pickup', title: 'Order Ready', message: 'Your pharmacy order is ready for pickup.' },
            completed: { type: 'delivery_completed', title: 'Order Completed', message: 'Your pharmacy order has been completed.' },
            delivered: { type: 'delivery_completed', title: 'Order Delivered', message: 'Your pharmacy order has been delivered.' },
          };
          const notif = notifMap[status];
          if (notif) {
            await notificationService.createNotification({
              userId: patientUserId,
              type: notif.type,
              category: 'delivery',
              priority: 'normal',
              title: notif.title,
              message: notif.message,
              actionUrl: '/dashboard/patient/pharmacy/orders',
              actionLabel: 'View Order',
              relatedEntityType: 'order',
              relatedEntityId: orderId,
            });
          }
        }
      } catch {}
    }

    return data;
  },

  async getOrderStatusHistory(orderId: string) {
    const { data, error } = await supabase
      .from('order_status_history')
      .select('*, pharmacy_staff(*, user_profiles(*))')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async assignCourier(data: Partial<CourierAssignment>) {
    const { data: assignment, error } = await supabase
      .from('courier_assignments')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return assignment;
  },

  async updateCourierStatus(
    assignmentId: string,
    status: CourierAssignment['delivery_status'],
    updates?: Partial<CourierAssignment>
  ) {
    const { data, error } = await supabase
      .from('courier_assignments')
      .update({ delivery_status: status, ...updates })
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async recordDeliveryProof(assignmentId: string, proofUrl: string, signatureUrl?: string, notes?: string) {
    const { data, error } = await supabase
      .from('courier_assignments')
      .update({
        delivery_proof_url: proofUrl,
        delivery_signature_url: signatureUrl,
        delivery_notes: notes,
        actual_delivery_time: new Date().toISOString(),
        delivery_status: 'delivered',
      })
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) throw error;

    try {
      await blockchainAuditService.logDeliveryEvent(data.order_id, 'delivered', {
        courierId: data.courier_staff_id,
        location: null,
        estimatedDelivery: data.estimated_delivery_time,
        actualDelivery: data.actual_delivery_time,
        proofUrl: proofUrl,
      });
    } catch {}

    return data;
  },

  async getActiveDeliveries(pharmacyId: string) {
    const { data, error } = await supabase
      .from('courier_assignments')
      .select('*, pharmacy_orders(*, patients(*, user_profiles(*)))')
      .in('delivery_status', ['assigned', 'dispatched', 'in-transit'])
      .order('assigned_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getPendingOrders(pharmacyId: string) {
    return this.getOrders(pharmacyId, 'pending');
  },

  async getReadyForPickupOrders(pharmacyId: string) {
    return this.getOrders(pharmacyId, 'ready');
  },

  async getFulfillmentMetrics(pharmacyId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('order_fulfillment')
      .select('*, pharmacy_orders(*)')
      .eq('pharmacy_id', pharmacyId);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    const fulfillments = data || [];

    const avgPickingTime = fulfillments
      .filter(f => f.picking_started_at && f.picking_completed_at)
      .reduce((sum, f) => {
        const start = new Date(f.picking_started_at).getTime();
        const end = new Date(f.picking_completed_at).getTime();
        return sum + (end - start);
      }, 0) / fulfillments.length;

    const avgTotalTime = fulfillments
      .filter(f => f.picking_started_at && f.packing_completed_at)
      .reduce((sum, f) => {
        const start = new Date(f.picking_started_at).getTime();
        const end = new Date(f.packing_completed_at).getTime();
        return sum + (end - start);
      }, 0) / fulfillments.length;

    return {
      totalOrders: fulfillments.length,
      completedOrders: fulfillments.filter(f => f.fulfillment_status === 'completed').length,
      avgPickingTimeMinutes: Math.round(avgPickingTime / 60000),
      avgTotalTimeMinutes: Math.round(avgTotalTime / 60000),
    };
  },
};
