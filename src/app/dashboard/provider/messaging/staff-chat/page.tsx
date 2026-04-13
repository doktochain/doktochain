import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MessageCircle, Users, Send, Plus, X, Loader2 } from 'lucide-react';
import { messagingService, StaffChatChannel, StaffChatMessage } from '../../../../../services/messagingService';
import { useAuth } from '../../../../../contexts/AuthContext';

export default function StaffChatPage() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<StaffChatChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<StaffChatChannel | null>(null);
  const [messages, setMessages] = useState<StaffChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState('general');
  const [creatingChannel, setCreatingChannel] = useState(false);

  useEffect(() => {
    if (user) {
      loadChannels();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChannel) {
      loadMessages();
    }
  }, [selectedChannel]);

  const loadChannels = async () => {
    if (!user) return;

    setLoading(true);
    const { data } = await messagingService.getStaffChannels(user.id);

    if (data) {
      setChannels(data);
      if (data.length > 0) {
        setSelectedChannel(data[0]);
      }
    }

    setLoading(false);
  };

  const loadMessages = async () => {
    if (!selectedChannel) return;

    const { data } = await messagingService.getStaffMessages(selectedChannel.id);

    if (data) {
      setMessages(data.reverse());
    }
  };

  const handleSendMessage = async () => {
    if (!selectedChannel || !messageText.trim()) return;

    await messagingService.sendStaffMessage({
      channel_id: selectedChannel.id,
      content: messageText,
    });

    setMessageText('');
    loadMessages();
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newChannelName.trim()) return;

    setCreatingChannel(true);
    try {
      const { data, error } = await messagingService.createStaffChannel({
        provider_id: user.id,
        channel_name: newChannelName.trim(),
        channel_type: newChannelType,
        member_ids: [user.id],
        admin_ids: [user.id],
        is_archived: false,
      });

      if (error) throw error;

      setShowNewChannelModal(false);
      setNewChannelName('');
      setNewChannelType('general');
      await loadChannels();
      if (data) {
        setSelectedChannel(data);
      }
    } catch (error) {
      console.error('Error creating channel:', error);
      toast.error('Failed to create channel');
    } finally {
      setCreatingChannel(false);
    }
  };

  return (
    <div className="p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Staff Chat</h1>
          <p className="text-gray-600 dark:text-gray-400">Internal team communication</p>
        </div>
        <button
          onClick={() => setShowNewChannelModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          <Plus className="w-4 h-4" />
          New Channel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Channels</h3>
          </div>
          <div className="overflow-y-auto">
            {channels.map((channel) => (
              <div
                key={channel.id}
                onClick={() => setSelectedChannel(channel)}
                className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  selectedChannel?.id === channel.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">{channel.channel_name}</p>
                    <p className="text-xs text-gray-500">{channel.channel_type}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow flex flex-col">
          {selectedChannel ? (
            <>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  #{selectedChannel.channel_name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedChannel.member_ids.length} members
                </p>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className="flex gap-3">
                      <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {(msg as any).sender?.full_name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {(msg as any).sender?.full_name || 'Unknown'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Select a channel to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showNewChannelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Channel</h2>
              <button
                onClick={() => setShowNewChannelModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Channel Name *
                </label>
                <input
                  type="text"
                  required
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g., front-desk, nurses, general"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Channel Type
                </label>
                <select
                  value={newChannelType}
                  onChange={(e) => setNewChannelType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General</option>
                  <option value="department">Department</option>
                  <option value="urgent">Urgent</option>
                  <option value="announcements">Announcements</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewChannelModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingChannel || !newChannelName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                >
                  {creatingChannel && <Loader2 className="w-4 h-4 animate-spin" />}
                  {creatingChannel ? 'Creating...' : 'Create Channel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
