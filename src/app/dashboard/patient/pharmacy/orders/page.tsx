import { useState, useEffect } from 'react';
import { useAuth } from '../../../../../contexts/AuthContext';
import { patientService } from '../../../../../services/patientService';
import { supabase } from '../../../../../lib/supabase';
import { Package, Clock, CheckCircle, XCircle, Truck, MapPin } from 'lucide-react';

type FilterType = 'all' | 'pending' | 'processing' | 'delivered' | 'cancelled';

export default function MyOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadOrders();
  }, [user, filter]);

  const loadOrders = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const patient = await patientService.getPatientByUserId(user.id);
      if (!patient) {
        setOrders([]);
        return;
      }

      let query = supabase
        .from('pharmacy_orders')
        .select('*, pharmacies(pharmacy_name, phone, address_line1, city), order_items(*)')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200', label: 'Delivered' };
      case 'processing':
      case 'preparing':
        return { icon: Clock, color: 'text-sky-600', bg: 'bg-sky-100', border: 'border-sky-200', label: 'Processing' };
      case 'shipped':
      case 'out_for_delivery':
        return { icon: Truck, color: 'text-teal-600', bg: 'bg-teal-100', border: 'border-teal-200', label: 'Shipped' };
      case 'cancelled':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200', label: 'Cancelled' };
      case 'ready_for_pickup':
        return { icon: Package, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200', label: 'Ready for Pickup' };
      default:
        return { icon: Package, color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200', label: 'Pending' };
    }
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All Orders' },
    { key: 'pending', label: 'Pending' },
    { key: 'processing', label: 'Processing' },
    { key: 'delivered', label: 'Delivered' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <p className="text-gray-500 mt-1">Track and manage your prescription orders</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              filter === f.key
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Package className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No orders found</h3>
          <p className="text-gray-500">
            {filter === 'all'
              ? "You haven't placed any pharmacy orders yet"
              : `No ${filter} orders`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const StatusIcon = statusConfig.icon;
            const items = order.order_items || [];
            const pharmacyName = order.pharmacies?.pharmacy_name || 'Pharmacy';
            const totalAmount = order.total_amount || items.reduce((sum: number, i: any) => sum + (i.unit_price * i.quantity || 0), 0);

            return (
              <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {order.order_number || `ORD-${order.id.substring(0, 8).toUpperCase()}`}
                      </h3>
                      <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{pharmacyName}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Ordered on {new Date(order.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  {totalAmount > 0 && (
                    <p className="text-xl font-bold text-gray-900">${Number(totalAmount).toFixed(2)}</p>
                  )}
                </div>

                {items.length > 0 && (
                  <div className="border-t border-gray-100 pt-3 mt-3">
                    <div className="space-y-2">
                      {items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700">{item.medication_name || item.product_name || 'Item'}</span>
                            <span className="text-gray-400">x{item.quantity}</span>
                          </div>
                          {item.unit_price > 0 && (
                            <span className="font-medium text-gray-900">${Number(item.unit_price).toFixed(2)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {order.delivery_address && (
                  <div className="mt-3 flex items-start gap-2 text-sm text-gray-500">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>{order.delivery_address}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
