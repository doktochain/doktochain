import { useState, useEffect } from 'react';
import { VirtualWaitingRoom } from '../../../../components/telemedicine/VirtualWaitingRoom';
import { VideoConsultationInterface } from '../../../../components/telemedicine/VideoConsultationInterface';
import { telemedicineService, VideoConsultation } from '../../../../services/telemedicineService';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../../lib/supabase';
import { Calendar, Clock, Video, Loader2, User } from 'lucide-react';

type ConsultationView = 'list' | 'waiting' | 'active';

interface ConsultationWithProvider extends VideoConsultation {
  providerName?: string;
}

export default function VideoConsultationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState<ConsultationWithProvider[]>([]);
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationWithProvider | null>(null);
  const [currentView, setCurrentView] = useState<ConsultationView>('list');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadConsultations();
    }
  }, [user]);

  const loadConsultations = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('video_consultations')
        .select(`
          *,
          providers!video_consultations_provider_id_fkey (
            id,
            user_profiles!providers_user_id_fkey (
              first_name,
              last_name
            )
          )
        `)
        .eq('patient_id', user.id)
        .order('scheduled_start', { ascending: false });

      if (data) {
        const enriched: ConsultationWithProvider[] = data.map((c: any) => {
          const profile = c.providers?.user_profiles;
          const providerName = profile
            ? `Dr. ${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            : 'Your Provider';
          return { ...c, providerName };
        });
        setConsultations(enriched);
      }
    } catch (err) {
      console.error('Error loading consultations:', err);
      const { data } = await telemedicineService.getPatientConsultations(user.id);
      if (data) {
        setConsultations(data.map((c) => ({ ...c, providerName: 'Your Provider' })));
      }
    }
    setLoading(false);
  };

  const handleJoinWaitingRoom = (consultation: ConsultationWithProvider) => {
    setSelectedConsultation(consultation);
    setCurrentView('waiting');
  };

  const handleJoinSession = async () => {
    if (!selectedConsultation) return;

    await telemedicineService.updateConsultationStatus(
      selectedConsultation.id,
      'in_progress',
      { actual_start: new Date().toISOString() }
    );

    setCurrentView('active');
  };

  const handleEndSession = async () => {
    if (!selectedConsultation) return;

    const startTime = new Date(selectedConsultation.actual_start || selectedConsultation.scheduled_start);
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    await telemedicineService.updateConsultationStatus(
      selectedConsultation.id,
      'completed',
      {
        actual_end: endTime.toISOString(),
        duration_minutes: duration,
      }
    );

    setCurrentView('list');
    setSelectedConsultation(null);
    loadConsultations();
  };

  const handleCancelConsultation = async () => {
    if (!selectedConsultation) return;

    await telemedicineService.updateConsultationStatus(selectedConsultation.id, 'cancelled');
    setCurrentView('list');
    setSelectedConsultation(null);
    loadConsultations();
  };

  const handleReschedule = () => {
    setCurrentView('list');
    setSelectedConsultation(null);
  };

  if (currentView === 'waiting' && selectedConsultation) {
    return (
      <VirtualWaitingRoom
        consultationId={selectedConsultation.id}
        providerName={selectedConsultation.providerName || 'Your Provider'}
        scheduledTime={new Date(selectedConsultation.scheduled_start)}
        onJoinSession={handleJoinSession}
        onCancel={handleCancelConsultation}
        onReschedule={handleReschedule}
      />
    );
  }

  if (currentView === 'active' && selectedConsultation) {
    return (
      <VideoConsultationInterface
        consultationId={selectedConsultation.id}
        patientName={user?.user_metadata?.first_name || 'Patient'}
        providerName={selectedConsultation.providerName || 'Your Provider'}
        onEndSession={handleEndSession}
      />
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Video Consultations</h1>
          <p className="text-gray-600 mt-1">Manage your virtual healthcare appointments</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/patient/appointments/book')}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
        >
          <Video className="w-5 h-5" />
          Book a Consultation
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : consultations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Consultations Scheduled</h3>
          <p className="text-gray-600 mb-6">You don't have any upcoming video consultations.</p>
          <button
            onClick={() => navigate('/dashboard/patient/appointments/book')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Book a Consultation
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {consultations.map((consultation) => (
            <div
              key={consultation.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(consultation.status)}`}>
                      {consultation.status.replace('_', ' ').toUpperCase()}
                    </span>
                    {consultation.duration_minutes && (
                      <span className="text-xs text-gray-500">
                        Duration: {consultation.duration_minutes} min
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Consultation with {consultation.providerName}
                    </h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="font-medium text-gray-900">
                          {new Date(consultation.scheduled_start).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Time</p>
                        <p className="font-medium text-gray-900">
                          {new Date(consultation.scheduled_start).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ml-6">
                  {consultation.status === 'scheduled' && (
                    <button
                      onClick={() => handleJoinWaitingRoom(consultation)}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                    >
                      <Video className="w-5 h-5" />
                      Join Waiting Room
                    </button>
                  )}
                  {consultation.status === 'in_progress' && (
                    <button
                      onClick={() => handleJoinWaitingRoom(consultation)}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                    >
                      <Video className="w-5 h-5" />
                      Rejoin Session
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
