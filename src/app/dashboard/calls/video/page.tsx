import { useState } from 'react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Video, VideoOff, Mic, MicOff, Monitor, User } from 'lucide-react';

export default function VideoCallPage() {
  const { currentColors } = useTheme();
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const startCall = () => {
    setIsInCall(true);
  };

  const endCall = () => {
    setIsInCall(false);
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" style={{ color: currentColors.text }}>
          Video Call
        </h1>

        {!isInCall ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ backgroundColor: currentColors.primary + '20' }}
              >
                <Video className="w-16 h-16" style={{ color: currentColors.primary }} />
              </div>
              <h2 className="text-2xl font-semibold mb-2" style={{ color: currentColors.text }}>
                Ready for Video Call
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Start a video consultation with your patient or colleague
              </p>
              <button
                onClick={startCall}
                className="px-8 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition"
                style={{ backgroundColor: currentColors.primary }}
              >
                Start Video Call
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ height: '500px' }}>
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div
                    className="w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: currentColors.primary }}
                  >
                    <User className="w-16 h-16 text-white" />
                  </div>
                  <p className="text-white text-xl font-semibold">Dr. Sarah Johnson</p>
                  <p className="text-green-400 mt-2">Connected</p>
                </div>
              </div>

              <div className="absolute bottom-4 right-4 bg-gray-800 rounded-lg overflow-hidden" style={{ width: '200px', height: '150px' }}>
                <div className="w-full h-full flex items-center justify-center bg-gray-700">
                  <User className="w-12 h-12 text-white" />
                </div>
                <div className="absolute bottom-2 left-2 text-white text-xs">You</div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-4 rounded-full ${
                    isMuted ? 'bg-red-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  {isMuted ? (
                    <MicOff className="w-6 h-6 text-white" />
                  ) : (
                    <Mic className="w-6 h-6" style={{ color: currentColors.text }} />
                  )}
                </button>
                <button
                  onClick={() => setIsVideoOff(!isVideoOff)}
                  className={`p-4 rounded-full ${
                    isVideoOff ? 'bg-red-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  {isVideoOff ? (
                    <VideoOff className="w-6 h-6 text-white" />
                  ) : (
                    <Video className="w-6 h-6" style={{ color: currentColors.text }} />
                  )}
                </button>
                <button className="p-4 rounded-full bg-gray-200 dark:bg-gray-700">
                  <Monitor className="w-6 h-6" style={{ color: currentColors.text }} />
                </button>
                <button
                  onClick={endCall}
                  className="px-6 py-4 rounded-full bg-red-500 text-white font-semibold hover:bg-red-600 transition"
                >
                  End Call
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
