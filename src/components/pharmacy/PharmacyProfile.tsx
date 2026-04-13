import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  Star,
  Truck,
  CheckCircle,
  Package,
  Pill,
  Syringe,
  Heart,
  Home,
  Shield,
  ArrowLeft,
} from 'lucide-react';
import { pharmacyMarketplaceService, Pharmacy } from '../../services/pharmacyMarketplaceService';

interface PharmacyProfileProps {
  pharmacyId: string;
  onBack?: () => void;
}

export const PharmacyProfile: React.FC<PharmacyProfileProps> = ({ pharmacyId, onBack }) => {
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'hours' | 'reviews'>('overview');

  useEffect(() => {
    loadPharmacy();
  }, [pharmacyId]);

  const loadPharmacy = async () => {
    setLoading(true);
    const { data } = await pharmacyMarketplaceService.getPharmacyById(pharmacyId);
    if (data) {
      setPharmacy(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pharmacy not found</h2>
          <button onClick={onBack} className="text-blue-600 hover:text-blue-700">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const services = [
    { icon: Pill, name: 'Prescription Filling', description: 'Fast and accurate prescription service' },
    { icon: Package, name: 'Medication Counseling', description: 'Expert pharmacist consultations' },
    { icon: Syringe, name: 'Immunizations', description: 'Flu shots and vaccines available' },
    { icon: Heart, name: 'Health Screenings', description: 'Blood pressure and glucose testing' },
    { icon: Home, name: 'Home Delivery', description: 'Same-day delivery available' },
    { icon: Shield, name: 'Medication Sync', description: 'Convenient refill coordination' },
  ];

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to search
            </button>
          )}

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {pharmacy.pharmacy_name}
                </h1>
                {pharmacy.is_verified && (
                  <span className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full">
                    <CheckCircle className="w-4 h-4" />
                    Verified
                  </span>
                )}
              </div>

              <div className="flex items-center gap-6 text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="font-semibold">{pharmacy.rating_average.toFixed(1)}</span>
                  <span>({pharmacy.rating_count} reviews)</span>
                </div>

                {pharmacy.accepts_delivery && (
                  <div className="flex items-center gap-2 text-green-600">
                    <Truck className="w-5 h-5" />
                    <span className="font-medium">Delivery Available</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-gray-700">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span>
                    {pharmacy.address_line1}
                    {pharmacy.address_line2 && `, ${pharmacy.address_line2}`}, {pharmacy.city},{' '}
                    {pharmacy.province} {pharmacy.postal_code}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <a href={`tel:${pharmacy.phone}`} className="hover:text-blue-600">
                    {pharmacy.phone}
                  </a>
                </div>
                {pharmacy.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <a href={`mailto:${pharmacy.email}`} className="hover:text-blue-600">
                      {pharmacy.email}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                Start New Order
              </button>
              <button className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
                Get Directions
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('services')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'services'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Services
              </button>
              <button
                onClick={() => setActiveTab('hours')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'hours'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Hours
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'reviews'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Reviews
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">About This Pharmacy</h2>
                <p className="text-gray-700 mb-6">
                  {pharmacy.pharmacy_name} is a trusted pharmacy serving the {pharmacy.city}{' '}
                  community. We are committed to providing exceptional pharmaceutical care and
                  services to meet your health needs.
                </p>

                {pharmacy.accepts_delivery && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      Delivery Information
                    </h3>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p>
                        Delivery fee:{' '}
                        {pharmacyMarketplaceService.formatPrice(pharmacy.delivery_fee_cents)}
                      </p>
                      <p>
                        Minimum order:{' '}
                        {pharmacyMarketplaceService.formatPrice(pharmacy.minimum_order_cents)}
                      </p>
                      <p>Same-day delivery available for orders placed before 2 PM</p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Quick Facts</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700">Licensed & Verified</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700">Insurance Accepted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700">Bilingual Staff</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700">Wheelchair Accessible</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'services' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Services Offered</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {services.map((service, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <service.icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{service.name}</h3>
                        <p className="text-sm text-gray-600">{service.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'hours' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Hours of Operation</h2>
                <div className="space-y-2">
                  {daysOfWeek.map((day, index) => {
                    const dayHours = pharmacy.hours_of_operation?.[index];
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between py-3 border-b border-gray-100"
                      >
                        <span className="font-medium text-gray-900">{day}</span>
                        <span className="text-gray-700">
                          {dayHours?.is_24_hours
                            ? 'Open 24 Hours'
                            : dayHours?.is_closed
                            ? 'Closed'
                            : `${dayHours?.open_time || 'N/A'} - ${dayHours?.close_time || 'N/A'}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Customer Reviews</h2>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                    Write a Review
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-900">
                        {pharmacy.rating_average.toFixed(1)}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < Math.floor(pharmacy.rating_average)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {pharmacy.rating_count} reviews
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center text-gray-500 py-8">
                  <p>Reviews will be displayed here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};