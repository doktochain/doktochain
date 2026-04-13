import { useState, useEffect } from 'react';
import VirtualWaitingRoomManager from '../../../../components/telemedicine/VirtualWaitingRoomManager';
import AdvancedVideoConsultation from '../../../../components/telemedicine/AdvancedVideoConsultation';
import AISoapNotesEditor from '../../../../components/telemedicine/AISoapNotesEditor';
import PostVisitWorkflow from '../../../../components/telemedicine/PostVisitWorkflow';
import { useAuth } from '../../../../contexts/AuthContext';
import { Video, Users, FileText, ClipboardList } from 'lucide-react';
import { VirtualWaitingRoomEntry, advancedTelemedicineService } from '../../../../services/advancedTelemedicineService';
import { providerService } from '../../../../services/providerService';

type ViewMode = 'waiting-room' | 'consultation' | 'soap-notes' | 'post-visit';

export default function ProviderTelemedicinePage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('waiting-room');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    loadProviderData();
  }, [user]);

  const loadProviderData = async () => {
    if (!user) return;

    try {
      const provider = await providerService.getProviderByUserId(user.id);
      if (provider) {
        setProviderId(provider.id);
      }
    } catch (error) {
      console.error('Error loading provider:', error);
    } finally {
      setLoading(false);
    }
  };

  const startDemoConsultation = async () => {
    try {
      const demoSessionId = 'demo-session-' + Date.now();
      setActiveSessionId(demoSessionId);
      setActiveAppointmentId('demo-appointment');
      setDemoMode(true);
      setViewMode('consultation');
    } catch (error) {
      console.error('Error starting demo:', error);
    }
  };

  const handleAdmitPatient = async (entry: VirtualWaitingRoomEntry) => {
    try {
      const session = await advancedTelemedicineService.createSession(
        entry.appointment_id,
        entry.provider_id,
        entry.patient_id
      );
      setActiveSessionId(session.id);
      setActiveAppointmentId(entry.appointment_id);
      setViewMode('consultation');
    } catch (error) {
      console.error('Error admitting patient:', error);
    }
  };

  const handleEndCall = () => {
    setViewMode('soap-notes');
  };

  const handleFinalizeSoapNote = () => {
    setViewMode('post-visit');
  };

  const handleCompleteWorkflow = () => {
    setViewMode('waiting-room');
    setActiveSessionId(null);
    setActiveAppointmentId(null);
    setDemoMode(false);
  };

  if (viewMode === 'consultation' && activeSessionId && user) {
    return (
      <AdvancedVideoConsultation
        sessionId={activeSessionId}
        role="provider"
        userId={user.id}
        onEndCall={handleEndCall}
      />
    );
  }

  if (viewMode === 'soap-notes' && activeSessionId && activeAppointmentId && user) {
    return (
      <div className="p-6">
        <AISoapNotesEditor
          sessionId={activeSessionId}
          appointmentId={activeAppointmentId}
          providerId={user.id}
          transcriptText="Sample transcript for demonstration"
          onFinalize={handleFinalizeSoapNote}
        />
      </div>
    );
  }

  if (viewMode === 'post-visit' && activeSessionId && activeAppointmentId) {
    return (
      <PostVisitWorkflow
        sessionId={activeSessionId}
        appointmentId={activeAppointmentId}
        patientId="demo-patient-id"
        onComplete={handleCompleteWorkflow}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading telemedicine portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Telemedicine Portal
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Virtual consultations and patient waiting room
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('waiting-room')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'waiting-room'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Users className="w-4 h-4" />
            Waiting Room
          </button>

          <button
            onClick={startDemoConsultation}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Video className="w-4 h-4" />
            Start Demo Consultation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Video className="w-8 h-8" />
            <span className="text-3xl font-bold">0</span>
          </div>
          <h3 className="text-lg font-semibold mb-1">Active Sessions</h3>
          <p className="text-blue-100 text-sm">Currently in progress</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8" />
            <span className="text-3xl font-bold">0</span>
          </div>
          <h3 className="text-lg font-semibold mb-1">Waiting Patients</h3>
          <p className="text-green-100 text-sm">In virtual waiting room</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <FileText className="w-8 h-8" />
            <span className="text-3xl font-bold">0</span>
          </div>
          <h3 className="text-lg font-semibold mb-1">Completed Today</h3>
          <p className="text-blue-100 text-sm">Telemedicine sessions</p>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Video className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">
              Try the Demo Consultation
            </h3>
            <p className="text-blue-800 dark:text-blue-200 mb-4">
              Click "Start Demo Consultation" to experience all telemedicine features including:
            </p>
            <ul className="space-y-2 text-blue-800 dark:text-blue-200">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                HD video with screen sharing and annotations
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                Virtual examination tools (point, circle, measure)
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                AI-powered patient summary with allergies, medications, and vitals
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                Emergency contact quick access
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                In-call chat and file sharing
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                AI SOAP notes generation and post-visit workflow
              </li>
            </ul>
          </div>
        </div>
      </div>

      {viewMode === 'waiting-room' && providerId && (
        <div className="mt-6">
          <VirtualWaitingRoomManager
            providerId={providerId}
            onAdmitPatient={handleAdmitPatient}
          />
        </div>
      )}
    </div>
  );
}
