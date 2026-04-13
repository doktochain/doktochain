import { useState, useEffect, useRef } from 'react';
import {
  Video, VideoOff, Mic, MicOff, MonitorUp, Phone, MessageSquare,
  Upload, FileText, Users, Settings, Maximize2, Minimize2, Camera,
  Play, Pause, MoreVertical, AlertCircle, Stethoscope, Shield, User
} from 'lucide-react';
import { toast } from 'sonner';
import { advancedTelemedicineService, TelemedicineSession } from '../../services/advancedTelemedicineService';
import { ConfirmDialog } from '../ui/confirm-dialog';
import PatientSummaryPanel from './PatientSummaryPanel';
import VirtualExaminationTools from './VirtualExaminationTools';
import EmergencyContactPanel from './EmergencyContactPanel';

interface AdvancedVideoConsultationProps {
  sessionId: string;
  role: 'provider' | 'patient';
  userId: string;
  onEndCall: () => void;
}

export default function AdvancedVideoConsultation({
  sessionId,
  role,
  userId,
  onEndCall,
}: AdvancedVideoConsultationProps) {
  const [session, setSession] = useState<TelemedicineSession | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPatientSummary, setShowPatientSummary] = useState(false);
  const [showExamTools, setShowExamTools] = useState(false);
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false);
  const [showRecordingConsent, setShowRecordingConsent] = useState(false);
  const [isPipMode, setIsPipMode] = useState(false);
  const [videoQuality, setVideoQuality] = useState<'low' | 'medium' | 'high' | 'hd'>('high');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [files, setFiles] = useState<any[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSession();
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionId]);

  useEffect(() => {
    if (showChat) {
      loadChatMessages();
    }
  }, [showChat]);

  useEffect(() => {
    if (showFiles) {
      loadFiles();
    }
  }, [showFiles]);

  const loadSession = async () => {
    try {
      const data = await advancedTelemedicineService.getSession(sessionId);
      setSession(data);
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const loadChatMessages = async () => {
    try {
      const messages = await advancedTelemedicineService.getChatMessages(sessionId);
      setChatMessages(messages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadFiles = async () => {
    try {
      const sessionFiles = await advancedTelemedicineService.getSessionFiles(sessionId);
      setFiles(sessionFiles);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
  };

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        await advancedTelemedicineService.updateSessionSettings(sessionId, {
          screen_sharing_used: true,
        });
      }
      setIsScreenSharing(!isScreenSharing);
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  };

  const toggleRecording = async () => {
    if (!isRecording && !session?.recording_consent_obtained) {
      setShowRecordingConsent(true);
      return;
    }

    try {
      await advancedTelemedicineService.updateSessionSettings(sessionId, {
        recording_enabled: !isRecording,
      });
      setIsRecording(!isRecording);
    } catch (error) {
      console.error('Error toggling recording:', error);
    }
  };

  const executeRecordingConsent = async () => {
    try {
      await advancedTelemedicineService.obtainRecordingConsent(sessionId);
    } catch (error) {
      console.error('Error obtaining consent:', error);
      return;
    }

    try {
      await advancedTelemedicineService.updateSessionSettings(sessionId, {
        recording_enabled: true,
      });
      setIsRecording(true);
    } catch (error) {
      console.error('Error toggling recording:', error);
    }
  };

  const handleEndCall = async () => {
    try {
      await advancedTelemedicineService.endSession(sessionId);
      onEndCall();
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await advancedTelemedicineService.sendChatMessage(
        sessionId,
        userId,
        role,
        newMessage
      );
      setNewMessage('');
      await loadChatMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50 MB');
      return;
    }

    try {
      await advancedTelemedicineService.uploadSessionFile(sessionId, userId, file);
      await loadFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const changeVideoQuality = async (quality: typeof videoQuality) => {
    try {
      await advancedTelemedicineService.updateSessionSettings(sessionId, {
        video_quality: quality,
      });
      setVideoQuality(quality);
    } catch (error) {
      console.error('Error changing quality:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getConnectionColor = () => {
    const colors = {
      excellent: 'text-green-500',
      good: 'text-blue-500',
      fair: 'text-yellow-500',
      poor: 'text-red-500',
    };
    return colors[connectionQuality];
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <div className="flex-1 relative">
        <div className="absolute inset-0 bg-black">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        </div>

        <div className={`absolute ${isPipMode ? 'bottom-4 right-4 w-48 h-36' : 'top-4 right-4 w-64 h-48'} bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600 shadow-lg`}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {!isVideoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
              <Camera className="w-12 h-12 text-gray-400" />
            </div>
          )}
        </div>

        <div className="absolute top-4 left-4 space-y-2">
          <div className="bg-black bg-opacity-60 rounded-lg px-4 py-2 text-white">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="font-mono font-semibold">{formatDuration(callDuration)}</span>
            </div>
          </div>

          <div className="bg-black bg-opacity-60 rounded-lg px-4 py-2 text-white">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getConnectionColor()}`} />
              <span className="text-sm capitalize">{connectionQuality}</span>
            </div>
          </div>

          {isScreenSharing && (
            <div className="bg-blue-600 rounded-lg px-4 py-2 text-white text-sm font-semibold">
              Screen Sharing Active
            </div>
          )}
        </div>

        {role === 'provider' && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
            <div className="bg-black bg-opacity-60 rounded-lg px-4 py-2 text-white">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="text-sm">
                  {session?.patients?.user_profiles?.full_name || 'Patient'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-all ${
              isVideoEnabled
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isVideoEnabled ? (
              <Video className="w-6 h-6 text-white" />
            ) : (
              <VideoOff className="w-6 h-6 text-white" />
            )}
          </button>

          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full transition-all ${
              isAudioEnabled
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isAudioEnabled ? (
              <Mic className="w-6 h-6 text-white" />
            ) : (
              <MicOff className="w-6 h-6 text-white" />
            )}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition-all ${
              isScreenSharing
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <MonitorUp className="w-6 h-6 text-white" />
          </button>

          {role === 'provider' && (
            <button
              onClick={toggleRecording}
              className={`p-4 rounded-full transition-all ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {isRecording ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white" />
              )}
            </button>
          )}

          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-4 rounded-full transition-all ${
              showChat
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <MessageSquare className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={() => setShowFiles(!showFiles)}
            className={`p-4 rounded-full transition-all ${
              showFiles
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <FileText className="w-6 h-6 text-white" />
          </button>

          {role === 'provider' && (
            <>
              <button
                onClick={() => setShowPatientSummary(!showPatientSummary)}
                className={`p-4 rounded-full transition-all ${
                  showPatientSummary
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <User className="w-6 h-6 text-white" />
              </button>

              <button
                onClick={() => setShowExamTools(!showExamTools)}
                className={`p-4 rounded-full transition-all ${
                  showExamTools
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <Stethoscope className="w-6 h-6 text-white" />
              </button>

              <button
                onClick={() => setShowEmergencyContacts(!showEmergencyContacts)}
                className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-all"
              >
                <Shield className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          <button
            onClick={() => setIsPipMode(!isPipMode)}
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all"
          >
            {isPipMode ? (
              <Maximize2 className="w-6 h-6 text-white" />
            ) : (
              <Minimize2 className="w-6 h-6 text-white" />
            )}
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all"
          >
            <Settings className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={handleEndCall}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-all"
          >
            <Phone className="w-6 h-6 text-white transform rotate-135" />
          </button>
        </div>
      </div>

      {showChat && (
        <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-white">Chat</h3>
            <button
              onClick={() => setShowChat(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.sender_id === userId
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <p className="text-sm">{msg.message_content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={sendMessage}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {showFiles && (
        <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-white">Files</h3>
            <button
              onClick={() => setShowFiles(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {files.map(file => (
              <div
                key={file.id}
                className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {file.file_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {file.file_size_mb.toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-700 text-sm">
                  Download
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload File
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Settings</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Video Quality
              </label>
              <select
                value={videoQuality}
                onChange={(e) => changeVideoQuality(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="low">Low (360p)</option>
                <option value="medium">Medium (480p)</option>
                <option value="high">High (720p)</option>
                <option value="hd">HD (1080p)</option>
              </select>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showPatientSummary && session && (
        <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-white">Patient Summary</h3>
            <button
              onClick={() => setShowPatientSummary(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ×
            </button>
          </div>
          <PatientSummaryPanel patientId={session.patient_id} />
        </div>
      )}

      {showExamTools && <VirtualExaminationTools onClose={() => setShowExamTools(false)} />}

      {showEmergencyContacts && session && (
        <EmergencyContactPanel
          patientId={session.patient_id}
          onClose={() => setShowEmergencyContacts(false)}
        />
      )}

      <ConfirmDialog
        open={showRecordingConsent}
        onOpenChange={setShowRecordingConsent}
        title="Recording Consent Required"
        description="Recording requires patient consent. Do you confirm that patient consent has been obtained?"
        confirmLabel="Yes, Consent Obtained"
        onConfirm={executeRecordingConsent}
      />
    </div>
  );
}
