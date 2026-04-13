import { useState, useEffect } from 'react';
import { useAuth } from '../../../../../contexts/AuthContext';
import { providerService } from '../../../../../services/providerService';
import VirtualWaitingRoomManager from '../../../../../components/telemedicine/VirtualWaitingRoomManager';
import { VirtualWaitingRoomEntry, advancedTelemedicineService } from '../../../../../services/advancedTelemedicineService';
import { useNavigate } from 'react-router-dom';

export default function WaitingRoomPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviderData();
  }, [user]);

  const loadProviderData = async () => {
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

  const handleAdmitPatient = async (entry: VirtualWaitingRoomEntry) => {
    try {
      const session = await advancedTelemedicineService.createSession(
        entry.appointment_id,
        entry.provider_id,
        entry.patient_id
      );

      navigate(`/dashboard/provider/telemedicine?session=${session.id}`);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Provider profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <VirtualWaitingRoomManager
        providerId={provider.id}
        onAdmitPatient={handleAdmitPatient}
      />
    </div>
  );
}
