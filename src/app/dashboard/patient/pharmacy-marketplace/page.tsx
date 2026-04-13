import { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { patientService } from '../../../../services/patientService';
import { pharmacyMarketplaceService, PharmacyOrder } from '../../../../services/pharmacyMarketplaceService';
import { PharmacyDiscovery } from '../../../../components/pharmacy/PharmacyDiscovery';
import { OTCProductBrowser } from '../../../../components/pharmacy/OTCProductBrowser';
import { OrderTracking } from '../../../../components/pharmacy/OrderTracking';
import { Store, Package, Truck, Clock, ChevronRight, ArrowLeft } from 'lucide-react';

type TabType = 'discover' | 'products' | 'orders';

const STATUS_STYLES: Record<string, string> = {
  placed: 'bg-blue-50 text-blue-700',
  prescription_received: 'bg-sky-50 text-sky-700',
  insurance_verification: 'bg-amber-50 text-amber-700',
  preparing: 'bg-amber-50 text-amber-700',
  quality_check: 'bg-cyan-50 text-cyan-700',
  ready_pickup: 'bg-emerald-50 text-emerald-700',
  out_for_delivery: 'bg-teal-50 text-teal-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
};

export default function PharmacyMarketplacePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (activeTab === 'orders' && user) loadOrders();
  }, [activeTab, user]);

  const loadOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const patientData = await patientService.getPatientByUserId(user.id);
      if (patientData) {
        const { data } = await pharmacyMarketplaceService.getPatientOrders(patientData.id);
        if (data) setOrders(data);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-4 border-b">
            <h1 className="text-2xl font-bold text-gray-900">Pharmacy Marketplace</h1>
          </div>

          <nav className="flex -mb-px">
            <button
              onClick={() => { setActiveTab('discover'); setSelectedOrderId(null); }}
              className={`px-6 py-4 text-sm font-medium border-b-2 flex items-center gap-2 ${
                activeTab === 'discover'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Store className="w-5 h-5" />
              Find Pharmacies
            </button>
            <button
              onClick={() => { setActiveTab('products'); setSelectedOrderId(null); }}
              className={`px-6 py-4 text-sm font-medium border-b-2 flex items-center gap-2 ${
                activeTab === 'products'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Package className="w-5 h-5" />
              Shop OTC Products
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-4 text-sm font-medium border-b-2 flex items-center gap-2 ${
                activeTab === 'orders'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Truck className="w-5 h-5" />
              My Orders
              {orders.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{orders.length}</span>
              )}
            </button>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {activeTab === 'discover' && <PharmacyDiscovery />}
        {activeTab === 'products' && <OTCProductBrowser />}
        {activeTab === 'orders' && (
          <div className="p-6">
            {selectedOrderId ? (
              <div>
                <button
                  onClick={() => setSelectedOrderId(null)}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Orders
                </button>
                <OrderTracking orderId={selectedOrderId} />
              </div>
            ) : loadingOrders ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
                <p className="text-gray-500 mb-6">Start shopping to place your first order</p>
                <button
                  onClick={() => setActiveTab('products')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className="bg-white rounded-lg shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-gray-900">#{order.order_number}</h3>
                          <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${STATUS_STYLES[order.status] || 'bg-gray-50 text-gray-600'}`}>
                            {order.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(order.created_at).toLocaleDateString()}
                          </span>
                          <span>{order.is_pickup ? 'Pickup' : 'Delivery'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{pharmacyMarketplaceService.formatPrice(order.total_cents)}</p>
                          <p className="text-xs text-gray-400">{order.payment_status}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
