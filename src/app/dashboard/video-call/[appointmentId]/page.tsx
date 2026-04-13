import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../contexts/AuthContext';
import DailyVideoCall from '../../../../components/telemedicine/DailyVideoCall';
import { Loader } from 'lucide-react';
import { toast } from 'sonner';

export default function VideoCallPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [userRole, setUserRole] = useState<'patient' | 'provider' | null>(null);

  useEffect(() => {
    if (appointmentId && user) {
      loadAppointment();
    }
  }, [appointmentId, user]);

  const loadAppointment = async () => {
    try {
      const { data: appointmentData, error } = await supabase
        .from('appointments')
        .select('*, patients(*), providers(*)')
        .eq('id', appointmentId)
        .single();

      if (error) throw error;

      if (!appointmentData) {
        throw new Error('Appointment not found');
      }

      setAppointment(appointmentData);

      const { data: patientData } = await supabase
        .from('patients')
        .select('user_id')
        .eq('user_id', user!.id)
        .maybeSingle();

      const { data: providerData } = await supabase
        .from('providers')
        .select('user_id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (patientData) {
        setUserRole('patient');
      } else if (providerData) {
        setUserRole('provider');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading appointment:', error);
      toast.error('Failed to load appointment');
      navigate('/dashboard');
    }
  };

  const handleLeaveCall = () => {
    if (userRole === 'patient') {
      navigate('/dashboard/patient/appointments');
    } else {
      navigate('/dashboard/provider/appointments');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading video consultation...</p>
        </div>
      </div>
    );
  }

  if (!appointment || !userRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <p className="text-gray-900">Appointment not found</p>
        </div>
      </div>
    );
  }

  return (
    <DailyVideoCall
      appointmentId={appointmentId!}
      patientId={appointment.patient_id}
      providerId={appointment.provider_id}
      roomUrl={appointment.video_room_url}
      onLeave={handleLeaveCall}
    />
  );
}
