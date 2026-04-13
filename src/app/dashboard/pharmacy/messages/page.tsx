import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';
import { messagingService, MessageConversation } from '../../../../services/messagingService';
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
} from 'lucide-react';

interface ConversationWithProfile extends MessageConversation {
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

export default function PharmacyMessages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithProfile[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithProfile | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('pharmacy-messages')
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

    const recipientId = selectedConversation.provider_id === user.id
      ? selectedConversation.patient_id
      : selectedConversation.provider_id;

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

  const getContactName = (conv: ConversationWithProfile) => {
    if (conv.provider) return `Dr. ${conv.provider.first_name} ${conv.provider.last_name}`;
    if (conv.patient) return `${conv.patient.first_name} ${conv.patient.last_name}`;
    return 'Unknown';
  };

  const getContactInitial = (conv: ConversationWithProfile) => {
    if (conv.provider) return conv.provider.first_name?.[0] || 'D';
    if (conv.patient) return conv.patient.first_name?.[0] || 'P';
    return '?';
  };

  const getSenderName = (msg: MessageWithSender) => {
    if (msg.sender_id === user?.id) return 'You';
    if (msg.sender) return `${msg.sender.first_name} ${msg.sender.last_name}`;
    return 'Unknown';
  };

  const filteredConversations = conversations.filter((c) => {
    const name = getContactName(c);
    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.subject || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (filter === 'unread') return matchesSearch && c.unread_count_patient > 0;
    return matchesSearch;
  });

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count_patient || 0), 0);

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-gray-50 dark:bg-gray-900">
      <div className={`w-full sm:w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${selectedConversation ? 'hidden sm:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h2>
              {totalUnread > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{totalUnread} unread message{totalUnread !== 1 ? 's' : ''}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Inbox className="w-4 h-4" />
                <span>{conversations.length}</span>
              </div>
              {totalUnread > 0 && (
                <div className="flex items-center gap-1 text-sm text-red-500">
                  <Mail className="w-4 h-4" />
                  <span>{totalUnread}</span>
                </div>
              )}
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
            {(['all', 'unread'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-sm rounded-lg transition ${
                  filter === f
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {f === 'all' ? 'All' : `Unread${totalUnread > 0 ? ` (${totalUnread})` : ''}`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {filter === 'unread' ? 'No unread messages' : 'No conversations yet'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={`group relative border-b border-gray-100 dark:border-gray-700 ${
                  selectedConversation?.id === conv.id ? 'bg-teal-50 dark:bg-teal-900/20' : ''
                }`}
              >
                <button
                  onClick={() => loadMessages(conv)}
                  className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left transition"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 text-sm font-bold shrink-0">
                        {getContactInitial(conv)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{getContactName(conv)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{conv.subject || 'No subject'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-gray-400">
                        {conv.last_message_at ? formatTime(conv.last_message_at) : ''}
                      </span>
                      {conv.unread_count_patient > 0 && (
                        <span className="bg-teal-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                          {conv.unread_count_patient}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleArchive(conv.id); }}
                  className="absolute top-3 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                  title="Archive"
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
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
              <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold shrink-0">
                {getContactInitial(selectedConversation)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {getContactName(selectedConversation)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{selectedConversation.subject}</p>
              </div>
              <button
                onClick={() => handleArchive(selectedConversation.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                title="Archive conversation"
              >
                <Archive className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
              {messagesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
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
                          ? 'bg-teal-600 text-white rounded-br-md'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md shadow-sm'
                      }`}>
                        {!isMe && (
                          <p className="text-xs font-medium mb-1 text-teal-600 dark:text-teal-400">
                            {getSenderName(msg)}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
                        <div className={`flex items-center gap-1 mt-1.5 text-xs ${isMe ? 'text-teal-200 justify-end' : 'text-gray-400'}`}>
                          <span>{new Date(msg.created_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMe && (
                            msg.is_read
                              ? <CheckCheck className="w-3.5 h-3.5 text-teal-200" />
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
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none text-sm"
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="p-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
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
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Messages from patients and providers will appear here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
