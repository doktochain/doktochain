import { useEffect, useRef, useState } from 'react';
import { dailyRoomService } from '../../services/dailyRoomService';
import { Phone, AlertCircle, Loader } from 'lucide-react';

interface DailyVideoCallProps {
  appointmentId: string;
  patientId: string;
  providerId: string;
  roomUrl?: string;
  onLeave: () => void;
}

declare global {
  interface Window {
    DailyIframe: any;
  }
}

export default function DailyVideoCall({
  appointmentId,
  patientId,
  providerId,
  roomUrl: existingRoomUrl,
  onLeave,
}: DailyVideoCallProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomUrl, setRoomUrl] = useState(existingRoomUrl || '');
  const callFrameRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDailyScript();
  }, []);

  useEffect(() => {
    if (window.DailyIframe && !callFrameRef.current) {
      if (roomUrl) {
        joinCall(roomUrl);
      } else {
        createAndJoinRoom();
      }
    }

    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
      }
    };
  }, [window.DailyIframe, roomUrl]);

  const loadDailyScript = () => {
    if (window.DailyIframe) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@daily-co/daily-js';
    script.async = true;
    script.onload = () => {
      console.log('Daily.co script loaded');
    };
    document.body.appendChild(script);
  };

  const createAndJoinRoom = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await dailyRoomService.createRoom(appointmentId, patientId, providerId);

      if (!result.success || !result.roomUrl) {
        throw new Error(result.error || 'Failed to create video room');
      }

      await dailyRoomService.updateAppointmentWithRoom(
        appointmentId,
        result.roomUrl,
        result.roomName!
      );

      setRoomUrl(result.roomUrl);
      await joinCall(result.roomUrl);
    } catch (err) {
      console.error('Error creating room:', err);
      setError(err instanceof Error ? err.message : 'Failed to create video room');
      setLoading(false);
    }
  };

  const joinCall = async (url: string) => {
    try {
      if (!containerRef.current || !window.DailyIframe) return;

      callFrameRef.current = window.DailyIframe.createFrame(containerRef.current, {
        showLeaveButton: true,
        showFullscreenButton: true,
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: '0',
          borderRadius: '8px',
        },
      });

      callFrameRef.current.on('left-meeting', handleLeaveCall);
      callFrameRef.current.on('error', handleError);
      callFrameRef.current.on('joined-meeting', () => {
        setLoading(false);
        console.log('Successfully joined meeting');
      });

      await callFrameRef.current.join({ url });
    } catch (err) {
      console.error('Error joining call:', err);
      setError('Failed to join video call');
      setLoading(false);
    }
  };

  const handleLeaveCall = () => {
    if (callFrameRef.current) {
      callFrameRef.current.destroy();
      callFrameRef.current = null;
    }
    onLeave();
  };

  const handleError = (error: any) => {
    console.error('Daily.co error:', error);
    setError('Video call error occurred');
  };

  const handleEndCall = () => {
    if (callFrameRef.current) {
      callFrameRef.current.leave();
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
            Video Call Error
          </h3>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <button
            onClick={onLeave}
            className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="text-center">
            <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">
              {roomUrl ? 'Joining video call...' : 'Creating video room...'}
            </p>
          </div>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full" />

      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
        <button
          onClick={handleEndCall}
          className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-colors"
        >
          <Phone className="w-5 h-5" />
          End Call
        </button>
      </div>
    </div>
  );
}
