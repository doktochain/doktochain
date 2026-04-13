import { useEffect, useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useTheme } from '../../../../contexts/ThemeContext';
import { supabase } from '../../../../lib/supabase';
import { pharmacyOrderFulfillmentService } from '../../../../services/pharmacyOrderFulfillmentService';
import { blockchainAuditService } from '../../../../services/blockchainAuditService';
import { notificationService } from '../../../../services/notificationService';
import { Package, Clock, CheckCircle, XCircle, Truck, Search, Filter } from 'lucide-react';
import { Card, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../components/ui/select';
import { Button } from '../../../../components/ui/button';

export default function PharmacyOrders() {
  const { userProfile } = useAuth();
  const { currentColors } = useTheme();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pharmacyId, setPharmacyId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadPharmacyId();
  }, [userProfile]);

  useEffect(() => {
    if (pharmacyId) {
      loadOrders();
    }
  }, [pharmacyId, statusFilter]);

  const loadPharmacyId = async () => {
    if (!userProfile) return;

    const { data } = await supabase
      .from('pharmacies')
      .select('id')
      .eq('user_id', userProfile.id)
      .maybeSingle();

    if (data) {
      setPharmacyId(data.id);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await pharmacyOrderFulfillmentService.getOrders(
        pharmacyId,
        statusFilter === 'all' ? undefined : statusFilter
      );
      setOrders(result);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError('Unable to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const { data: staff } = await supabase
        .from('pharmacy_staff')
        .select('id')
        .eq('pharmacy_id', pharmacyId)
        .eq('user_id', userProfile?.id)
        .maybeSingle();

      if (staff) {
        await pharmacyOrderFulfillmentService.updateOrderStatus(orderId, newStatus, staff.id);

        const { data: order } = await supabase
          .from('pharmacy_orders')
          .select('*, patients(user_id), prescriptions(medication_name)')
          .eq('id', orderId)
          .single();

        if (order) {
          await blockchainAuditService.logEvent({
            eventType: 'order_fulfilled',
            resourceType: 'pharmacy_order',
            resourceId: orderId,
            actorId: pharmacyId,
            actorRole: 'pharmacy',
            actionData: {
              staff_id: staff.id,
              patient_id: order.patient_id,
              new_status: newStatus,
              old_status: order.status
            }
          });

          const statusMessages: Record<string, string> = {
            confirmed: 'Your prescription order has been confirmed',
            preparing: 'Your prescription is being prepared',
            ready: 'Your prescription is ready for pickup',
            'out-for-delivery': 'Your prescription is out for delivery',
            delivered: 'Your prescription has been delivered',
            cancelled: 'Your prescription order has been cancelled'
          };

          await notificationService.createNotification({
            userId: order.patients?.user_id,
            title: 'Order Update',
            message: statusMessages[newStatus] || `Order status updated to ${newStatus}`,
            type: 'order',
            category: 'pharmacy',
            priority: newStatus === 'ready' || newStatus === 'delivered' ? 'high' : 'normal'
          });
        }

        setToast({ type: 'success', message: `Order status updated to ${newStatus}` });
        setTimeout(() => setToast(null), 3000);
        loadOrders();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setToast({ type: 'error', message: 'Failed to update order status' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'warning' | 'info' | 'default' | 'success' | 'destructive'; icon: any }> = {
      pending: { variant: 'warning', icon: Clock },
      confirmed: { variant: 'info', icon: CheckCircle },
      preparing: { variant: 'info', icon: Package },
      ready: { variant: 'default', icon: CheckCircle },
      'out-for-delivery': { variant: 'info', icon: Truck },
      delivered: { variant: 'success', icon: CheckCircle },
      cancelled: { variant: 'destructive', icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1 px-3 py-1">
        <Icon className="w-3 h-3" />
        {status.replace('-', ' ').toUpperCase()}
      </Badge>
    );
  };

  const filteredOrders = orders.filter(order =>
    order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.patients?.user_profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.patients?.user_profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-destructive'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground mt-1">Manage and fulfill pharmacy orders</p>
        </div>

        <Button onClick={loadOrders}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by order number or patient name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="text-muted-foreground w-5 h-5" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Orders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="out-for-delivery">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading orders...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <p className="text-destructive">{error}</p>
              <Button variant="destructive" onClick={loadOrders} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <Card
                  key={order.id}
                  className="hover:shadow-md transition"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{order.order_number}</h3>
                        <p className="text-sm text-muted-foreground">
                          {order.patients?.user_profiles?.first_name} {order.patients?.user_profiles?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {new Date(order.created_at).toLocaleDateString()} at{' '}
                          {new Date(order.created_at).toLocaleTimeString()}
                        </p>
                      </div>

                      <div className="text-right">
                        {getStatusBadge(order.status)}
                        <p className="text-lg font-bold text-foreground mt-2">
                          ${(order.total_cents / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-border pt-3 mt-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground/70">Order Type</p>
                          <p className="text-sm font-medium text-foreground capitalize">{order.order_type}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground/70">Payment</p>
                          <p className="text-sm font-medium text-foreground capitalize">{order.payment_status}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground/70">Fulfillment</p>
                          <p className="text-sm font-medium text-foreground">
                            {order.is_pickup ? 'Pickup' : 'Delivery'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground/70">Items</p>
                          <p className="text-sm font-medium text-foreground">
                            {order.order_items?.length || 0} item(s)
                          </p>
                        </div>
                      </div>

                      {order.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleStatusChange(order.id, 'confirmed')}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            size="sm"
                          >
                            Confirm Order
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleStatusChange(order.id, 'cancelled')}
                            className="flex-1"
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}

                      {order.status === 'confirmed' && (
                        <Button
                          onClick={() => handleStatusChange(order.id, 'preparing')}
                          className="w-full"
                          size="sm"
                        >
                          Start Preparing
                        </Button>
                      )}

                      {order.status === 'preparing' && (
                        <Button
                          onClick={() => handleStatusChange(order.id, 'ready')}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                          size="sm"
                        >
                          Mark as Ready
                        </Button>
                      )}

                      {order.status === 'ready' && !order.is_pickup && (
                        <Button
                          onClick={() => handleStatusChange(order.id, 'out-for-delivery')}
                          className="w-full"
                          size="sm"
                        >
                          Dispatch for Delivery
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
