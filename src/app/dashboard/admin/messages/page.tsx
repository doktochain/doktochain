import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';
import { messagingService } from '../../../../services/messagingService';
import {
  MessageSquare,
  Send,
  Search,
  ArrowLeft,
  CheckCheck,
  Clock,
  Archive,
  Mail,
  Inbox,
  Users,
} from 'lucide-react';

interface AdminConversation {
  id: string;
  provider_id: string;
  patient_id: string;
  subject: string;
  conversation_type: string;
  status: string;
  priority: string;
  last_message_at: string;
  unread_count_provider: number;
  unread_count_patient: number;
  created_at: string;
  provider: { id: string; first_name: string; last_name: string; email: string; profile_photo_url: string | null } | null;
  patient: { id: string; first_name: string; last_name: string; email: string; profile_photo_url: string | null } | null;
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

export default function AdminMessages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<AdminConversation | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<'inbox' | 'sent' | 'archived'>('inbox');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('message_conversations')
      .select(`
        *,
        provider:provider_id(id, first_name, last_name, email, profile_photo_url),
        patient:patient_id(id, first_name, last_name, email, profile_photo_url)
      `)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (data && !error) {
      setConversations(data as AdminConversation[]);
    }
    setLoading(false);
  };

  const loadMessages = async (conversation: AdminConversation) => {
    setMessagesLoading(true);
    setSelectedConversation(conversation);
    const { data } = await messagingService.getMessagesByConversation(conversation.id);
    if (data) {
      setMessages(data as MessageWithSender[]);
    }
    setMessagesLoading(false);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;
    setSending(true);

    const recipientId = selectedConversation.patient_id;

    await messagingService.sendMessage({
      recipient_id: recipientId,
      conversation_id: selectedConversation.id,
      subject: selectedConversation.subject,
      message_text: newMessage,
    });

    setNewMessage('');
    const { data } = await messagingService.getMessagesByConversation(selectedConversation.id);
    if (data) setMessages(data as MessageWithSender[]);
    loadConversations();
    setSending(false);
  };

  const handleArchive = async (convId: string) => {
    await messagingService.archiveConversation(convId);
    if (selectedConversation?.id === convId) {
      setSelectedConversation(null);
      setMessages([]);
    }
    loadConversations();
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString('en-CA', { weekday: 'short' });
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  };

  const getParticipants = (conv: AdminConversation) => {
    const names: string[] = [];
    if (conv.patient) names.push(`${conv.patient.first_name} ${conv.patient.last_name}`);
    if (conv.provider) names.push(`Dr. ${conv.provider.first_name} ${conv.provider.last_name}`);
    return names.join(' & ') || 'Unknown';
  };

  const getInitial = (conv: AdminConversation) => {
    if (conv.patient) return conv.patient.first_name?.[0] || 'P';
    if (conv.provider) return conv.provider.first_name?.[0] || 'D';
    return '?';
  };

  const getSenderName = (msg: MessageWithSender) => {
    if (msg.sender_id === user?.id) return 'You (Admin)';
    if (msg.sender) return `${msg.sender.first_name} ${msg.sender.last_name}`;
    return 'Unknown';
  };

  const filteredConversations = conversations.filter((c) => {
    const participants = getParticipants(c);
    const matchesSearch =
      participants.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.subject || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (selectedFolder === 'archived') return matchesSearch && c.status === 'archived';
    if (selectedFolder === 'inbox') return matchesSearch && c.status !== 'archived';
    return matchesSearch;
  });

  const totalUnread = conversations.reduce(
    (sum, c) => sum + (c.unread_count_provider || 0) + (c.unread_count_patient || 0),
    0
  );

  const folders = [
    { id: 'inbox' as const, label: 'Inbox', icon: Inbox, count: conversations.filter((c) => c.status !== 'archived').length },
    { id: 'archived' as const, label: 'Archived', icon: Archive, count: conversations.filter((c) => c.status === 'archived').length },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-gray-50 dark:bg-gray-900">
      <div className={`w-full sm:w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${selectedConversation ? 'hidden sm:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Admin Messages</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                {totalUnread > 0 && ` - ${totalUnread} unread`}
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Users className="w-4 h-4" />
              <span>{conversations.length}</span>
            </div>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search messages..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div className="flex gap-2">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition ${
                  selectedFolder === folder.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <folder.icon className="w-3.5 h-3.5" />
                {folder.label}
                {folder.count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                    selectedFolder === folder.id ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-600'
                  }`}>
                    {folder.count}
                  </span>
                )}
              </button>
            ))}
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
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No conversations in {selectedFolder}
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={`group relative border-b border-gray-100 dark:border-gray-700 ${
                  selectedConversation?.id === conv.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <button
                  onClick={() => loadMessages(conv)}
                  className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left transition"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-bold shrink-0">
                        {getInitial(conv)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{getParticipants(conv)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{conv.subject || 'No subject'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-gray-400">
                        {conv.last_message_at ? formatTime(conv.last_message_at) : ''}
                      </span>
                      {conv.priority === 'urgent' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 rounded">
                          URGENT
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-11 flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                      conv.conversation_type === 'clinical'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                        : conv.conversation_type === 'billing'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    }`}>
                      {conv.conversation_type || 'general'}
                    </span>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                      conv.status === 'active'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    }`}>
                      {conv.status}
                    </span>
                  </div>
                </button>
                {conv.status !== 'archived' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleArchive(conv.id); }}
                    className="absolute top-3 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                    title="Archive"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
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
                {getInitial(selectedConversation)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {getParticipants(selectedConversation)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{selectedConversation.subject}</p>
              </div>
              {selectedConversation.status !== 'archived' && (
                <button
                  onClick={() => handleArchive(selectedConversation.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                  title="Archive conversation"
                >
                  <Archive className="w-4 h-4" />
                </button>
              )}
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
                          <p className={`text-xs font-medium mb-1 ${isMe ? 'text-blue-200' : 'text-blue-600 dark:text-blue-400'}`}>
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
                                  isMe ? 'bg-blue-700 text-blue-100 hover:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700 text-blue-600 hover:bg-gray-200'
                                }`}
                              >
                                <Mail className="w-3 h-3" />
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
              <div className="flex items-end gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Reply as admin..."
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
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">All platform conversations are visible here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
