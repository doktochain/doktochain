import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { helpCenterService, ChatMessage } from '../../../../services/helpCenterService';
import { MessageCircle, Send, X, User, Bot, Star } from 'lucide-react';

export default function LiveChatPage() {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [status, setStatus] = useState<'waiting' | 'active' | 'ended'>('waiting');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      initChat();
    }
  }, [user]);

  const initChat = async () => {
    if (!user) return;

    const { data: existingSession } = await helpCenterService.getActiveChatSession(user.id);

    if (existingSession) {
      setSessionId(existingSession.id);
      setStatus(existingSession.status);
      loadMessages(existingSession.id);
    } else {
      const { data: newSession } = await helpCenterService.createChatSession(user.id);
      if (newSession) {
        setSessionId(newSession.id);
        setStatus('waiting');
        setTimeout(() => {
          setStatus('active');
          addBotMessage('Hello! How can I help you today?');
        }, 2000);
      }
    }
    setLoading(false);
  };

  const loadMessages = async (sessionId: string) => {
    const { data } = await helpCenterService.getChatMessages(sessionId);
    if (data) {
      setMessages(data);
    }
  };

  const addBotMessage = (text: string) => {
    const botMessage: ChatMessage = {
      id: Date.now().toString(),
      session_id: sessionId!,
      sender_id: 'bot',
      message: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, botMessage]);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !sessionId || !user) return;

    const userMessage = newMessage;
    setNewMessage('');

    const { data } = await helpCenterService.sendChatMessage(sessionId, user.id, userMessage);
    if (data) {
      setMessages((prev) => [...prev, data]);

      setTimeout(() => {
        addBotMessage('Thank you for your message. A support agent will respond shortly.');
      }, 1000);
    }
  };

  const handleEndChat = async (rating?: number) => {
    if (!sessionId) return;
    await helpCenterService.endChatSession(sessionId, rating);
    setStatus('ended');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
          <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-semibold">Live Support Chat</h2>
                <p className="text-sm text-blue-100">
                  {status === 'waiting' && 'Connecting to agent...'}
                  {status === 'active' && 'Agent is online'}
                  {status === 'ended' && 'Chat ended'}
                </p>
              </div>
            </div>
            {status !== 'ended' && (
              <button
                onClick={() => handleEndChat()}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 && status === 'waiting' && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Connecting you to a support agent...</p>
              </div>
            )}

            {messages.map((message) => {
              const isUser = message.sender_id === user?.id;

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isUser ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>
                  <div
                    className={`max-w-md px-4 py-3 rounded-lg ${
                      isUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isUser ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {status === 'ended' ? (
            <div className="p-6 bg-white border-t text-center">
              <h3 className="font-semibold text-gray-900 mb-2">Chat Ended</h3>
              <p className="text-gray-600 mb-4">How would you rate this chat session?</p>
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => handleEndChat(rating)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Star className="w-6 h-6 text-yellow-500" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-white border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  disabled={status === 'waiting'}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || status === 'waiting'}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
