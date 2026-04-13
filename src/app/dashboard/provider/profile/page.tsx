import { useEffect, useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { providerService } from '../../../../services/providerService';
import ProfileManagement from '../../../../components/provider/ProfileManagement';
import AvailabilityManager from '../../../../components/provider/AvailabilityManager';
import InsuranceBillingConfig from '../../../../components/provider/InsuranceBillingConfig';

export default function ProviderProfilePage() {
  const { user } = useAuth();
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'profile' | 'availability' | 'insurance'>('profile');

  useEffect(() => {
    loadProvider();
  }, [user]);

  const loadProvider = async () => {
    if (!user) return;

    try {
      const providerData = await providerService.getProviderByUserId(user.id);
      setProvider(providerData);
    } catch (error) {
      console.error('Error loading provider:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-yellow-800 mb-2">Complete Your Registration</h2>
          <p className="text-yellow-700">
            Your provider profile is not yet complete. Please complete your registration to access the profile management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveSection('profile')}
              className={`px-6 py-4 text-sm font-medium ${
                activeSection === 'profile'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Profile & Credentials
            </button>
            <button
              onClick={() => setActiveSection('availability')}
              className={`px-6 py-4 text-sm font-medium ${
                activeSection === 'availability'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Availability & Schedule
            </button>
            <button
              onClick={() => setActiveSection('insurance')}
              className={`px-6 py-4 text-sm font-medium ${
                activeSection === 'insurance'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Insurance & Billing
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeSection === 'profile' && <ProfileManagement providerId={provider.id} />}
          {activeSection === 'availability' && <AvailabilityManager providerId={provider.id} />}
          {activeSection === 'insurance' && <InsuranceBillingConfig providerId={provider.id} />}
        </div>
      </div>
    </div>
  );
}
