import React, { useState, useEffect } from 'react';
import {
  Package,
  CheckCircle,
  Clock,
  Truck,
  MapPin,
  Phone,
  Camera,
  FileText,
  AlertCircle,
  User,
} from 'lucide-react';
import { pharmacyMarketplaceService, PharmacyOrder } from '../../services/pharmacyMarketplaceService';

interface OrderTrackingProps {
  orderId: string;
}

interface OrderStatus {
  status: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  completed: boolean;
}

export const OrderTracking: React.FC<OrderTrackingProps> = ({ orderId }) => {
  const [order, setOrder] = useState<PharmacyOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    setLoading(true);
    const { data } = await pharmacyMarketplaceService.getOrderById(orderId);
    if (data) {
      setOrder(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Order not found</h3>
      </div>
    );
  }

  const orderStatuses: OrderStatus[] = [
    {
      status: 'placed',
      label: 'Order Placed',
      description: 'Your order has been received',
      icon: Package,
      completed: true,
    },
    {
      status: 'prescription_received',
      label: 'Prescription Received',
      description: 'Pharmacy has received the prescription',
      icon: FileText,
      completed: ['prescription_received', 'insurance_verification', 'preparing', 'quality_check', 'ready_pickup', 'out_for_delivery', 'delivered'].includes(order.status),
    },
    {
      status: 'insurance_verification',
      label: 'Insurance Verification',
      description: 'Verifying insurance coverage',
      icon: CheckCircle,
      completed: ['insurance_verification', 'preparing', 'quality_check', 'ready_pickup', 'out_for_delivery', 'delivered'].includes(order.status),
    },
    {
      status: 'preparing',
      label: 'Preparing',
      description: 'Pharmacist is filling your prescription',
      icon: Clock,
      completed: ['preparing', 'quality_check', 'ready_pickup', 'out_for_delivery', 'delivered'].includes(order.status),
    },
    {
      status: 'quality_check',
      label: 'Quality Check',
      description: 'Final verification by pharmacist',
      icon: CheckCircle,
      completed: ['quality_check', 'ready_pickup', 'out_for_delivery', 'delivered'].includes(order.status),
    },
    {
      status: order.is_pickup ? 'ready_pickup' : 'out_for_delivery',
      label: order.is_pickup ? 'Ready for Pickup' : 'Out for Delivery',
      description: order.is_pickup ? 'Your order is ready at the pharmacy' : 'Driver is on the way',
      icon: order.is_pickup ? Package : Truck,
      completed: order.is_pickup
        ? ['ready_pickup', 'delivered'].includes(order.status)
        : ['out_for_delivery', 'delivered'].includes(order.status),
    },
    {
      status: 'delivered',
      label: order.is_pickup ? 'Picked Up' : 'Delivered',
      description: 'Order completed',
      icon: CheckCircle,
      completed: order.status === 'delivered',
    },
  ];

  const currentStatusIndex = orderStatuses.findIndex((s) => s.status === order.status);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Order #{order.order_number}</h2>
            <p className="text-gray-600">
              Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {pharmacyMarketplaceService.formatPrice(order.total_cents)}
            </div>
            <div className="text-sm text-gray-600">
              Payment: {order.payment_status}
            </div>
          </div>
        </div>

        <div className="relative">
          {orderStatuses.map((status, index) => (
            <div key={status.status} className="relative">
              {index > 0 && (
                <div
                  className={`absolute left-6 -top-8 w-0.5 h-8 ${
                    status.completed ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              )}
              <div className="flex items-start gap-4 mb-8">
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                    status.completed
                      ? 'bg-green-500 text-white'
                      : index === currentStatusIndex
                      ? 'bg-blue-500 text-white animate-pulse'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  <status.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 pt-1">
                  <h3 className={`font-semibold ${status.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                    {status.label}
                  </h3>
                  <p className="text-sm text-gray-600">{status.description}</p>
                  {status.completed && index === currentStatusIndex && (
                    <p className="text-sm text-blue-600 mt-1 font-medium">In Progress</p>
                  )}
                </div>
                {status.completed && (
                  <CheckCircle className="w-5 h-5 text-green-500 mt-2" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!order.is_pickup && order.status === 'out_for_delivery' && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Delivery Tracking
          </h3>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">Driver: John Smith</h4>
                <p className="text-sm text-gray-600">Vehicle: White Honda Civic - ABC 123</p>
                <div className="flex items-center gap-4 mt-2">
                  <a
                    href="tel:+15551234567"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Phone className="w-4 h-4" />
                    Call Driver
                  </a>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Estimated arrival:</span>
                <span className="font-medium text-gray-900">
                  {new Date(Date.now() + 30 * 60000).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                <MapPin className="w-4 h-4" />
                <span>1.2 km away</span>
              </div>
            </div>

            <div className="bg-gray-100 rounded-lg p-4">
              <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                <MapPin className="w-12 h-12 text-gray-400" />
                <span className="ml-2 text-gray-500">Live Map Would Display Here</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {order.is_pickup ? 'Pickup' : 'Delivery'} Details
        </h3>

        {order.is_pickup ? (
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Pharmacy Location</p>
                <p className="text-gray-600">Will be displayed here</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Delivery Address</p>
                <p className="text-gray-600">
                  {order.delivery_address_line1}
                  <br />
                  {order.delivery_city}, {order.delivery_province} {order.delivery_postal_code}
                </p>
              </div>
            </div>
            {order.delivery_instructions && (
              <div className="flex items-start gap-2 mt-3">
                <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Delivery Instructions</p>
                  <p className="text-gray-600">{order.delivery_instructions}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="border-t mt-4 pt-4">
          <h4 className="font-medium text-gray-900 mb-2">Order Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="text-gray-900">
                {pharmacyMarketplaceService.formatPrice(order.subtotal_cents)}
              </span>
            </div>
            {order.delivery_fee_cents > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Fee:</span>
                <span className="text-gray-900">
                  {pharmacyMarketplaceService.formatPrice(order.delivery_fee_cents)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Tax:</span>
              <span className="text-gray-900">
                {pharmacyMarketplaceService.formatPrice(order.tax_cents)}
              </span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t">
              <span>Total:</span>
              <span className="text-blue-600">
                {pharmacyMarketplaceService.formatPrice(order.total_cents)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        <button className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
          Contact Pharmacy
        </button>
        <button className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
          Get Help
        </button>
      </div>
    </div>
  );
};