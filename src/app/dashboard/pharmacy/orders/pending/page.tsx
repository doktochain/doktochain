import { useEffect, useState } from 'react';
import { useAuth } from '../../../../../contexts/AuthContext';
import { supabase } from '../../../../../lib/supabase';
import { pharmacyOrderFulfillmentService } from '../../../../../services/pharmacyOrderFulfillmentService';
import { Package, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function PharmacyOrdersPending() {
  const { userProfile } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pharmacyId, setPharmacyId] = useState<string>('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadPharmacyId();
  }, [userProfile]);

  useEffect(() => {
    if (pharmacyId) {
      loadPendingOrders();
    }
  }, [pharmacyId]);

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

  const loadPendingOrders = async () => {
    setLoading(true);
    try {
      const result = await pharmacyOrderFulfillmentService.getOrders(pharmacyId, 'pending');
      setOrders(result);
    } catch (error) {
      console.error('Error loading pending orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = async (orderId: string) => {
    try {
      const { data: staff } = await supabase
        .from('pharmacy_staff')
        .select('id')
        .eq('pharmacy_id', pharmacyId)
        .eq('user_id', userProfile?.id)
        .maybeSingle();

      if (staff) {
        await pharmacyOrderFulfillmentService.updateOrderStatus(orderId, 'confirmed', staff.id);
        setToast({ type: 'success', message: 'Order confirmed successfully' });
        setTimeout(() => setToast(null), 3000);
        loadPendingOrders();
      }
    } catch (error) {
      console.error('Error confirming order:', error);
      setToast({ type: 'error', message: 'Failed to confirm order' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const { data: staff } = await supabase
        .from('pharmacy_staff')
        .select('id')
        .eq('pharmacy_id', pharmacyId)
        .eq('user_id', userProfile?.id)
        .maybeSingle();

      if (staff) {
        await pharmacyOrderFulfillmentService.updateOrderStatus(orderId, 'cancelled', staff.id);
        setToast({ type: 'success', message: 'Order cancelled' });
        setTimeout(() => setToast(null), 3000);
        loadPendingOrders();
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      setToast({ type: 'error', message: 'Failed to cancel order' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pending Orders</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Orders awaiting confirmation</p>
        </div>

        <button
          onClick={loadPendingOrders}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading pending orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No pending orders</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {order.order_number || `#${order.id.substring(0, 8)}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {order.patients?.user_profiles?.first_name
                        ? `${order.patients.user_profiles.first_name} ${order.patients.user_profiles.last_name}`
                        : `Patient #${order.patient_id?.substring(0, 8)}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {order.order_items?.length || order.total_items || 0} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ${((order.total_cents || order.total_amount_cents || 0) / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => handleConfirmOrder(order.id)}
                        className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Confirm
                      </button>
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition"
                      >
                        <XCircle className="w-3 h-3" />
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
