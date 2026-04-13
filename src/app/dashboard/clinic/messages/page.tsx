import { useState, useEffect } from 'react';
import { Mail, Send, Search, CheckCheck, Clock, User, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { clinicService, Clinic, ClinicMessage, ClinicAffiliation } from '../../../../services/clinicService';

type ViewMode = 'list' | 'conversation' | 'compose';

interface ConversationThread {
  contactId: string;
  contactName: string;
  contactRole: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: ClinicMessage[];
}

export default function ClinicMessagesPage() {
  const { user } = useAuth();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [messages, setMessages] = useState<ClinicMessage[]>([]);
  const [affiliations, setAffiliations] = useState<ClinicAffiliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThread, setSelectedThread] = useState<ConversationThread | null>(null);
  const [composeRecipient, setComposeRecipient] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    try {
      const c = await clinicService.getClinicByOwnerId(user!.id);
      setClinic(c);
      if (c) {
        const [msgs, affs] = await Promise.all([
          clinicService.getClinicMessages(user!.id),
          clinicService.getClinicAffiliations(c.id),
        ]);
        setMessages(msgs);
        setAffiliations(affs.filter(a => a.status === 'active'));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const threads: ConversationThread[] = (() => {
    const threadMap = new Map<string, ConversationThread>();
    messages.forEach(msg => {
      const contactId = msg.sender_id === user?.id ? msg.recipient_id : msg.sender_id;
      const contactProfile = msg.sender_id === user?.id ? msg.recipient_profile : msg.sender_profile;
      const contactName = contactProfile
        ? `${contactProfile.first_name} ${contactProfile.last_name}`
        : 'Unknown';
      const contactRole = contactProfile?.role || 'user';

      if (!threadMap.has(contactId)) {
        threadMap.set(contactId, {
          contactId,
          contactName,
          contactRole,
          lastMessage: msg.message_text,
          lastMessageTime: msg.created_at,
          unreadCount: 0,
          messages: [],
        });
      }

      const thread = threadMap.get(contactId)!;
      thread.messages.push(msg);

      if (!msg.is_read && msg.recipient_id === user?.id) {
        thread.unreadCount++;
      }

      if (new Date(msg.created_at) > new Date(thread.lastMessageTime)) {
        thread.lastMessage = msg.message_text;
        thread.lastMessageTime = msg.created_at;
      }
    });

    return Array.from(threadMap.values()).sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  })();

  const filteredThreads = threads.filter(t =>
    !searchQuery || t.contactName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openThread = async (thread: ConversationThread) => {
    setSelectedThread(thread);
    setView('conversation');

    const unreadIds = thread.messages
      .filter(m => !m.is_read && m.recipient_id === user?.id)
      .map(m => m.id);

    for (const id of unreadIds) {
      await clinicService.markMessageRead(id);
    }
  };

  const handleSendReply = async () => {
    if (!selectedThread || !replyText.trim()) return;
    setSending(true);
    try {
      await clinicService.sendMessage(
        user!.id,
        selectedThread.contactId,
        '',
        replyText.trim()
      );
      setReplyText('');
      await loadData();
      const updated = threads.find(t => t.contactId === selectedThread.contactId);
      if (updated) setSelectedThread(updated);
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setSending(false);
    }
  };

  const handleCompose = async () => {
    if (!composeRecipient || !composeMessage.trim()) return;
    setSending(true);
    try {
      await clinicService.sendMessage(
        user!.id,
        composeRecipient,
        composeSubject,
        composeMessage.trim()
      );
      setComposeRecipient('');
      setComposeSubject('');
      setComposeMessage('');
      setView('list');
      await loadData();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Messages</h1>
          <p className="text-gray-500 mt-1">
            Communicate with affiliated providers and staff
            {totalUnread > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                {totalUnread} unread
              </span>
            )}
          </p>
        </div>
        {view === 'list' && (
          <button
            onClick={() => setView('compose')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            <Send size={16} /> New Message
          </button>
        )}
        {view !== 'list' && (
          <button
            onClick={() => { setView('list'); setSelectedThread(null); }}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <ChevronLeft size={16} /> Back to Inbox
          </button>
        )}
      </div>

      {view === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {filteredThreads.length === 0 ? (
            <div className="p-12 text-center">
              <Mail size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-700">No messages yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Start a conversation with your affiliated providers.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredThreads.map(thread => (
                <button
                  key={thread.contactId}
                  onClick={() => openThread(thread)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition flex items-center gap-4 ${
                    thread.unreadCount > 0 ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
                    {thread.contactName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${thread.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                        {thread.contactName}
                      </p>
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                        {formatTime(thread.lastMessageTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-500 capitalize">
                        {thread.contactRole}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 truncate ${thread.unreadCount > 0 ? 'text-gray-700' : 'text-gray-500'}`}>
                      {thread.lastMessage}
                    </p>
                  </div>
                  {thread.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {thread.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'conversation' && selectedThread && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col" style={{ height: 'calc(100vh - 240px)' }}>
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
              {selectedThread.contactName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{selectedThread.contactName}</p>
              <p className="text-xs text-gray-500 capitalize">{selectedThread.contactRole}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedThread.messages
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .map(msg => {
                const isMine = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-xl px-4 py-3 ${
                      isMine
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {msg.subject && (
                        <p className={`text-xs font-semibold mb-1 ${isMine ? 'text-blue-100' : 'text-gray-500'}`}>
                          {msg.subject}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
                      <div className={`flex items-center gap-1 mt-1.5 text-[10px] ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>
                        <Clock size={10} />
                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMine && msg.is_read && <CheckCheck size={12} className="ml-1" />}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="p-4 border-t border-gray-100">
            <div className="flex gap-3">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                placeholder="Type a message..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleSendReply}
                disabled={!replyText.trim() || sending}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'compose' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl space-y-5">
          <h3 className="text-lg font-semibold text-gray-800">New Message</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <select
              value={composeRecipient}
              onChange={(e) => setComposeRecipient(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a provider...</option>
              {affiliations.map(aff => (
                <option key={aff.provider_id} value={aff.provider_id}>
                  Dr. {aff.providers?.user_profiles?.first_name} {aff.providers?.user_profiles?.last_name} - {aff.providers?.specialty || 'General'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
              placeholder="Message subject (optional)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={composeMessage}
              onChange={(e) => setComposeMessage(e.target.value)}
              placeholder="Write your message..."
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setView('list')}
              className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCompose}
              disabled={!composeRecipient || !composeMessage.trim() || sending}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
            >
              <Send size={16} /> {sending ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
