import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  MessageSquare,
  Upload,
  Monitor,
  Maximize,
  Settings,
  AlertCircle,
  FileText,
  PenTool,
  Bell
} from 'lucide-react';

interface VideoConsultationProps {
  consultationId: string;
  patientName: string;
  providerName: string;
  onEndSession: () => void;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'file' | 'system';
  fileName?: string;
}

export const VideoConsultationInterface: React.FC<VideoConsultationProps> = ({
  consultationId,
  patientName,
  providerName,
  onEndSession,
}) => {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isPiPMode, setIsPiPMode] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('excellent');
  const [sessionDuration, setSessionDuration] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000);

    initializeVideoStream();

    return () => clearInterval(timer);
  }, []);

  const initializeVideoStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const toggleVideo = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      const audioTrack = stream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setIsScreenSharing(true);
      } catch (error) {
        console.error('Error sharing screen:', error);
      }
    } else {
      setIsScreenSharing(false);
    }
  };

  const toggleFullScreen = () => {
    if (!isFullScreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullScreen(!isFullScreen);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: ChatMessage = {
        id: Date.now().toString(),
        senderId: 'patient',
        senderName: patientName,
        message: newMessage,
        timestamp: new Date(),
        type: 'text',
      };
      setChatMessages([...chatMessages, message]);
      setNewMessage('');
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const message: ChatMessage = {
          id: Date.now().toString(),
          senderId: 'patient',
          senderName: patientName,
          message: `Uploaded file: ${file.name}`,
          timestamp: new Date(),
          type: 'file',
          fileName: file.name,
        };
        setChatMessages([...chatMessages, message]);
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const getConnectionQualityColor = () => {
    switch (connectionQuality) {
      case 'excellent':
        return 'bg-green-500';
      case 'good':
        return 'bg-yellow-500';
      case 'poor':
        return 'bg-red-500';
    }
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-green-500 animate-pulse" />
            <span className="text-white font-medium">Video Consultation</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getConnectionQualityColor()}`} />
            <span className="text-gray-400 text-sm capitalize">{connectionQuality}</span>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-white font-mono text-lg">{formatDuration(sessionDuration)}</div>
          <div className="text-gray-400 text-sm">Dr. {providerName}</div>
        </div>
      </div>

      <div
        className="flex-1 flex relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={`flex-1 relative ${showChat ? 'mr-96' : ''}`}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover bg-gray-800"
          />

          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
            Dr. {providerName}
          </div>

          <div className="absolute bottom-24 right-4 w-64 h-48 rounded-lg overflow-hidden shadow-2xl border-2 border-white">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover bg-gray-900"
            />
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <VideoOff className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded text-sm">
              You
            </div>
          </div>

          {isScreenSharing && (
            <div className="absolute top-20 left-4 bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center">
              <Monitor className="w-4 h-4 mr-2" />
              Sharing Screen
            </div>
          )}

          {isDragging && (
            <div className="absolute inset-0 bg-blue-600/20 border-4 border-dashed border-blue-400 flex items-center justify-center backdrop-blur-sm">
              <div className="text-center">
                <Upload className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <p className="text-white text-xl font-semibold">Drop files here to upload</p>
              </div>
            </div>
          )}
        </div>

        {showChat && (
          <div className="w-96 bg-white flex flex-col border-l border-gray-200">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-lg">Chat</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === 'patient' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs rounded-lg px-4 py-2 ${
                      msg.senderId === 'patient'
                        ? 'bg-blue-600 text-white'
                        : msg.type === 'system'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="text-xs font-medium mb-1">{msg.senderName}</p>
                    {msg.type === 'file' && (
                      <div className="flex items-center space-x-2 mb-1">
                        <FileText className="w-4 h-4" />
                        <span className="text-sm">{msg.fileName}</span>
                      </div>
                    )}
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs opacity-75 mt-1">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2 mb-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  <Upload className="w-5 h-5 text-gray-600" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={e => handleFileUpload(e.target.files)}
                />
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition ${
              isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
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
            className={`p-4 rounded-full transition ${
              isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isAudioEnabled ? (
              <Mic className="w-6 h-6 text-white" />
            ) : (
              <MicOff className="w-6 h-6 text-white" />
            )}
          </button>

          <button
            onClick={onEndSession}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={() => setShowChat(!showChat)}
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition relative"
          >
            <MessageSquare className="w-6 h-6 text-white" />
            {chatMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {chatMessages.length}
              </span>
            )}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition ${
              isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <Monitor className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={toggleFullScreen}
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition"
          >
            <Maximize className="w-6 h-6 text-white" />
          </button>

          <button className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition">
            <Settings className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};