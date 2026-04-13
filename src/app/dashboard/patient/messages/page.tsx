import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';
import { messagingService } from '../../../../services/messagingService';
import {
  MessageSquare,
  Send,
  Paperclip,
  Search,
  Plus,
  ArrowLeft,
  CheckCheck,
  Clock,
  X,
  FileText,
  Image as ImageIcon,
  File,
} from 'lucide-react';

interface ConversationWithProfile {
  id: string;
  provider_id: string;
  patient_id: string;
  subject: string;
  conversation_type: string;
  status: string;
  priority: string;
  last_message_at: string;
  unread_count_patient: number;
  unread_count_provider: number;
  created_at: string;
  provider: { id: string; first_name: string; last_name: string; email: string; profile_photo_url: string | null };
}

interface MessageWithSender {
  id: string;
  sender_id: string;
  recipient_id: string;
  conversation_id: string;
  subject: string | null;
  message_text: string;
  is_read: boolean;
  read_at: string | null;
  attachment_urls: string[] | null;
  created_at: string;
  sender: { id: string; first_name: string; last_name: string; profile_photo_url: string | null } | null;
}

export default function PatientMessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithProfile[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithProfile | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('patient-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const msg = payload.new as MessageWithSender;
          if (selectedConversation && msg.conversation_id === selectedConversation.id) {
            setMessages((prev) => [...prev, msg]);
            messagingService.markAsRead(msg.id);
          }
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await messagingService.getConversations(user.id, 'patient');
    if (data) setConversations(data as ConversationWithProfile[]);
    setLoading(false);
  };

  const loadMessages = async (conversation: ConversationWithProfile) => {
    setMessagesLoading(true);
    setSelectedConversation(conversation);
    const { data } = await messagingService.getMessagesByConversation(conversation.id);
    if (data) {
      setMessages(data as MessageWithSender[]);
      const unreadIds = data
        .filter((m: any) => !m.is_read && m.recipient_id === user?.id)
        .map((m: any) => m.id);
      for (const id of unreadIds) {
        await messagingService.markAsRead(id);
      }
      if (unreadIds.length > 0) loadConversations();
    }
    setMessagesLoading(false);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;
    setSending(true);

    let attachmentUrls: string[] = [];
    for (const file of attachments) {
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '-')}`;
      const filePath = `message-attachments/${user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file, { upsert: true });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('user-uploads')
          .getPublicUrl(filePath);
        attachmentUrls.push(publicUrl);
      }
    }

    const recipientId = selectedConversation.provider_id;
    await messagingService.sendMessage({
      recipient_id: recipientId,
      conversation_id: selectedConversation.id,
      subject: selectedConversation.subject,
      message_text: newMessage,
      attachment_urls: attachmentUrls.length > 0 ? attachmentUrls : undefined,
    });

    setNewMessage('');
    setAttachments([]);
    const { data } = await messagingService.getMessagesByConversation(selectedConversation.id);
    if (data) setMessages(data as MessageWithSender[]);
    loadConversations();
    setSending(false);
  };

  const handleNewConversation = async () => {
    if (!selectedProviderId || !newSubject.trim() || !newMessage.trim() || !user) return;
    setSending(true);

    const { data: conversation } = await messagingService.createConversation({
      provider_id: selectedProviderId,
      patient_id: user.id,
      subject: newSubject,
      conversation_type: 'general',
      status: 'active',
      priority: 'normal',
    });

    if (conversation) {
      await messagingService.sendMessage({
        recipient_id: selectedProviderId,
        conversation_id: conversation.id,
        subject: newSubject,
        message_text: newMessage,
      });

      setShowNewConversation(false);
      setSelectedProviderId('');
      setNewSubject('');
      setNewMessage('');
      await loadConversations();
      loadMessages(conversation as ConversationWithProfile);
    }
    setSending(false);
  };

  const loadProviders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('appointments')
      .select('provider_id, providers:provider_id(id, user_id, user_profiles:user_id(first_name, last_name))')
      .eq('patient_id', user.id)
      .not('provider_id', 'is', null);

    if (data) {
      const unique = new Map();
      data.forEach((a: any) => {
        if (a.providers?.user_id && !unique.has(a.providers.user_id)) {
          const profile = a.providers.user_profiles;
          unique.set(a.providers.user_id, {
            id: a.providers.user_id,
            name: profile ? `${profile.first_name} ${profile.last_name}` : 'Provider',
          });
        }
      });
      setProviders(Array.from(unique.values()));
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (name: string) => {
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(name)) return <ImageIcon className="w-4 h-4" />;
    if (/\.pdf$/i.test(name)) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString('en-CA', { weekday: 'short' });
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  };

  const filteredConversations = conversations.filter((c) => {
    const name = c.provider
      ? `${c.provider.first_name} ${c.provider.last_name}`
      : '';
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getSenderName = (msg: MessageWithSender) => {
    if (msg.sender_id === user?.id) return 'You';
    if (msg.sender) return `${msg.sender.first_name} ${msg.sender.last_name}`;
    return 'Unknown';
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-gray-50 dark:bg-gray-900">
      <div className={`w-full sm:w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${selectedConversation ? 'hidden sm:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h2>
            <button
              onClick={() => {
                setShowNewConversation(true);
                loadProviders();
              }}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">No conversations yet</p>
              <button
                onClick={() => {
                  setShowNewConversation(true);
                  loadProviders();
                }}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Start a conversation
              </button>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const providerName = conv.provider
                ? `Dr. ${conv.provider.first_name} ${conv.provider.last_name}`
                : 'Provider';
              return (
                <button
                  key={conv.id}
                  onClick={() => loadMessages(conv)}
                  className={`w-full p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left transition ${
                    selectedConversation?.id === conv.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-bold shrink-0">
                        {conv.provider?.first_name?.[0] || 'P'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{providerName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{conv.subject || 'No subject'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-gray-400">
                        {conv.last_message_at ? formatTime(conv.last_message_at) : ''}
                      </span>
                      {conv.unread_count_patient > 0 && (
                        <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                          {conv.unread_count_patient}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden sm:flex' : 'flex'}`}>
        {selectedConversation ? (
          <>
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => setSelectedConversation(null)}
                className="sm:hidden p-1 text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0">
                {selectedConversation.provider?.first_name?.[0] || 'P'}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">
                  Dr. {selectedConversation.provider?.first_name} {selectedConversation.provider?.last_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{selectedConversation.subject}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
              {messagesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No messages in this conversation yet</div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md shadow-sm'
                      }`}>
                        {!isMe && (
                          <p className={`text-xs font-medium mb-1 ${isMe ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'}`}>
                            {getSenderName(msg)}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>

                        {msg.attachment_urls && msg.attachment_urls.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachment_urls.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                                  isMe ? 'bg-blue-700 text-blue-100 hover:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 hover:bg-gray-200'
                                }`}
                              >
                                <Paperclip className="w-3 h-3" />
                                Attachment {i + 1}
                              </a>
                            ))}
                          </div>
                        )}

                        <div className={`flex items-center gap-1 mt-1.5 text-xs ${isMe ? 'text-blue-200 justify-end' : 'text-gray-400'}`}>
                          <span>{new Date(msg.created_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMe && (
                            msg.is_read
                              ? <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                              : <Clock className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachments.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg text-sm">
                      {getFileIcon(file.name)}
                      <span className="text-gray-700 dark:text-gray-300 max-w-[120px] truncate">{file.name}</span>
                      <span className="text-xs text-gray-400">({formatFileSize(file.size)})</span>
                      <button onClick={() => removeAttachment(i)} className="text-red-500 hover:text-red-700">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition shrink-0"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      const valid = Array.from(e.target.files).filter((f) => f.size <= 10 * 1024 * 1024);
                      setAttachments((prev) => [...prev, ...valid]);
                    }
                  }}
                />
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none text-sm"
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Select a conversation to view messages</p>
            </div>
          </div>
        )}
      </div>

      {showNewConversation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">New Conversation</h3>
              <button onClick={() => setShowNewConversation(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Provider</label>
                <select
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select a provider...</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {providers.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">You can message providers you have had appointments with.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="What is this about?"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Write your message..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowNewConversation(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleNewConversation}
                disabled={!selectedProviderId || !newSubject.trim() || !newMessage.trim() || sending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
