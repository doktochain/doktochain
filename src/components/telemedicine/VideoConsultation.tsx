import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Mic, MicOff, Video, VideoOff, Phone, MessageSquare, Monitor } from 'lucide-react';

interface VideoConsultationProps {
  appointmentId: string;
  isProvider: boolean;
  onEndCall: () => void;
}

export default function VideoConsultation({ appointmentId, isProvider, onEndCall }: VideoConsultationProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; time: string }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    startLocalStream();
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => {
      stopLocalStream();
      clearInterval(timer);
    };
  }, []);

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setLocalStream(stream);
      setIsConnected(true);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error('Unable to access camera/microphone. Please check permissions.');
    }
  };

  const stopLocalStream = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleEndCall = () => {
    stopLocalStream();
    onEndCall();
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        sender: isProvider ? 'Provider' : 'Patient',
        text: newMessage,
        time: new Date().toLocaleTimeString(),
      };
      setMessages([...messages, message]);
      setNewMessage('');
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-white text-xl font-semibold">Video Consultation</h2>
          <span className="text-gray-400">Appointment #{appointmentId.slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white font-mono">{formatDuration(callDuration)}</span>
          <span className={`px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-500 text-white' : 'bg-yellow-500 text-gray-900'
          }`}>
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
      </div>

      <div className="flex-1 flex relative">
        <div className="flex-1 relative bg-black">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />

          <div className="absolute top-4 right-4 w-64 h-48 bg-gray-900 rounded-lg overflow-hidden shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
            {isVideoOff && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    {isProvider ? 'Dr' : 'PT'}
                  </span>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-xs">
              You
            </div>
          </div>

          {!isConnected && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-lg">Connecting to video call...</p>
              </div>
            </div>
          )}
        </div>

        {showChat && (
          <div className="w-80 bg-white flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Chat</h3>
              <button
                onClick={() => setShowChat(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  No messages yet
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${
                    msg.sender === (isProvider ? 'Provider' : 'Patient') ? 'items-end' : 'items-start'
                  }`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      msg.sender === (isProvider ? 'Provider' : 'Patient')
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}>
                      <p className="text-sm">{msg.text}</p>
                    </div>
                    <span className="text-xs text-gray-500 mt-1">{msg.time}</span>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-800 p-6 flex items-center justify-center gap-4">
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full transition ${
            isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isMuted ? (
            <MicOff className="text-white text-xl" />
          ) : (
            <Mic className="text-white text-xl" />
          )}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition ${
            isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isVideoOff ? (
            <VideoOff className="text-white text-xl" />
          ) : (
            <Video className="text-white text-xl" />
          )}
        </button>

        <button
          onClick={() => setShowChat(!showChat)}
          className={`p-4 rounded-full transition ${
            showChat ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          <MessageSquare className="text-white text-xl" />
        </button>

        <button
          className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition"
          title="Screen Share (Coming Soon)"
        >
          <Monitor className="text-white text-xl" />
        </button>

        <button
          onClick={handleEndCall}
          className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-full flex items-center gap-2 transition"
        >
          <Phone className="text-white text-xl rotate-[135deg]" />
          <span className="text-white font-semibold">End Call</span>
        </button>
      </div>

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
