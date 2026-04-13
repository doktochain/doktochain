import React, { useState, useEffect } from 'react';
import { Camera, Mic, Wifi, CheckCircle, XCircle, Loader2, Video, MessageSquare, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SystemCheck {
  name: string;
  status: 'pending' | 'checking' | 'success' | 'error';
  message: string;
}

interface WaitingRoomProps {
  consultationId: string;
  providerName: string;
  scheduledTime: Date;
  onJoinSession: () => void;
  onCancel: () => void;
  onReschedule: () => void;
}

export const VirtualWaitingRoom: React.FC<WaitingRoomProps> = ({
  consultationId,
  providerName,
  scheduledTime,
  onJoinSession,
  onCancel,
  onReschedule,
}) => {
  const [systemChecks, setSystemChecks] = useState<SystemCheck[]>([
    { name: 'Camera', status: 'pending', message: '' },
    { name: 'Microphone', status: 'pending', message: '' },
    { name: 'Internet Speed', status: 'pending', message: '' },
    { name: 'Browser Compatibility', status: 'pending', message: '' },
  ]);
  const [allChecksPassed, setAllChecksPassed] = useState(false);
  const [estimatedWaitTime, setEstimatedWaitTime] = useState(5);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [providerReady, setProviderReady] = useState(false);

  useEffect(() => {
    runSystemChecks();

    const channel = supabase
      .channel(`waiting-room-${consultationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `id=eq.${consultationId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any)?.status;
          if (newStatus === 'in-progress' || newStatus === 'in_progress') {
            setProviderReady(true);
          }
        }
      )
      .subscribe();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      supabase.removeChannel(channel);
    };
  }, [consultationId]);

  const updateCheckStatus = (index: number, status: SystemCheck['status'], message: string) => {
    setSystemChecks(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status, message };
      return updated;
    });
  };

  const runSystemChecks = async () => {
    await checkCamera();
    await checkMicrophone();
    await checkInternetSpeed();
    await checkBrowserCompatibility();
  };

  const checkCamera = async () => {
    updateCheckStatus(0, 'checking', 'Testing camera...');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      updateCheckStatus(0, 'success', 'Camera working properly');
    } catch (error) {
      updateCheckStatus(0, 'error', 'Camera access denied or not available');
    }
  };

  const checkMicrophone = async () => {
    updateCheckStatus(1, 'checking', 'Testing microphone...');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      updateCheckStatus(1, 'success', 'Microphone working properly');
      mediaStream.getTracks().forEach(track => track.stop());
    } catch (error) {
      updateCheckStatus(1, 'error', 'Microphone access denied or not available');
    }
  };

  const checkInternetSpeed = async () => {
    updateCheckStatus(2, 'checking', 'Testing internet speed...');
    try {
      const startTime = Date.now();
      await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' });
      const endTime = Date.now();
      const latency = endTime - startTime;

      if (latency < 100) {
        updateCheckStatus(2, 'success', 'Excellent connection (< 100ms)');
      } else if (latency < 300) {
        updateCheckStatus(2, 'success', 'Good connection (< 300ms)');
      } else {
        updateCheckStatus(2, 'error', 'Slow connection detected');
      }
    } catch (error) {
      updateCheckStatus(2, 'error', 'Unable to test connection');
    }
  };

  const checkBrowserCompatibility = async () => {
    updateCheckStatus(3, 'checking', 'Checking browser compatibility...');

    const hasWebRTC = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasWebSocket = 'WebSocket' in window;

    if (hasWebRTC && hasWebSocket) {
      updateCheckStatus(3, 'success', 'Browser fully compatible');
      setAllChecksPassed(true);
    } else {
      updateCheckStatus(3, 'error', 'Browser not fully compatible. Please use Chrome, Firefox, or Edge.');
    }
  };

  const getStatusIcon = (status: SystemCheck['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'checking':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-600 p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">Virtual Waiting Room</h1>
            <p className="text-blue-100">Your consultation with Dr. {providerName}</p>
          </div>

          <div className="p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="bg-gray-900 rounded-xl aspect-video mb-6 relative overflow-hidden">
                  {stream ? (
                    <video
                      autoPlay
                      muted
                      playsInline
                      ref={video => {
                        if (video && stream) video.srcObject = stream;
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="w-16 h-16 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 right-4 flex justify-center space-x-4">
                    <button className="bg-white/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/30 transition">
                      <Camera className="w-5 h-5" />
                    </button>
                    <button className="bg-white/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/30 transition">
                      <Mic className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-6">
                  <h3 className="font-semibold text-lg mb-2 flex items-center">
                    <Wifi className="w-5 h-5 mr-2 text-blue-600" />
                    Estimated Wait Time
                  </h3>
                  <p className="text-3xl font-bold text-blue-600">{estimatedWaitTime} minutes</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Scheduled: {scheduledTime.toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4">System Check</h3>
                <div className="space-y-4 mb-6">
                  {systemChecks.map((check, index) => (
                    <div key={check.name} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                      <div className="mt-0.5">{getStatusIcon(check.status)}</div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{check.name}</p>
                        <p className={`text-sm ${
                          check.status === 'error' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {check.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {providerReady && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 animate-pulse">
                    <div className="flex items-center">
                      <Video className="w-5 h-5 text-green-600 mr-2" />
                      <p className="text-green-800 font-medium">Dr. {providerName} is ready! You can join now.</p>
                    </div>
                  </div>
                )}

                {allChecksPassed && !providerReady && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      <p className="text-green-800 font-medium">All system checks passed!</p>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <h4 className="font-semibold mb-3">While You Wait</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Ensure you're in a quiet, well-lit environment</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Have your health card and medication list ready</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Prepare any questions you have for your provider</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Check that you have a stable internet connection</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={onJoinSession}
                    disabled={!allChecksPassed}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition flex items-center justify-center ${
                      allChecksPassed
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Video className="w-5 h-5 mr-2" />
                    Join Consultation
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={onReschedule}
                      className="py-2 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={onCancel}
                      className="py-2 px-4 border border-red-300 rounded-lg font-medium text-red-700 hover:bg-red-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-center space-x-4 text-sm text-gray-600">
                  <button className="flex items-center hover:text-blue-600 transition">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Technical Support
                  </button>
                  <button className="flex items-center hover:text-blue-600 transition">
                    <Phone className="w-4 h-4 mr-1" />
                    Emergency
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};