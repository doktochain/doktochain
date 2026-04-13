import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  MessageSquare,
  Send,
  Paperclip,
  Search,
  Filter,
  Download,
  Printer,
  AlertCircle,
  CheckCheck,
  Clock,
  X,
  FileText,
  Image as ImageIcon,
  File
} from 'lucide-react';

interface Message {
  id: string;
  threadId: string;
  patientId: string;
  providerId: string;
  senderId: string;
  senderName: string;
  senderType: 'patient' | 'provider';
  subject: string;
  messageText: string;
  messageType: 'general' | 'prescription_refill' | 'lab_result' | 'appointment' | 'urgent';
  isUrgent: boolean;
  attachments: Attachment[];
  readAt: Date | null;
  repliedAt: Date | null;
  createdAt: Date;
}

interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
}

interface MessageThread {
  threadId: string;
  providerName: string;
  providerSpecialty: string;
  lastMessage: string;
  lastMessageDate: Date;
  unreadCount: number;
  messages: Message[];
}

export const SecureMessaging: React.FC = () => {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [newMessageText, setNewMessageText] = useState('');
  const [newMessageSubject, setNewMessageSubject] = useState('');
  const [messageType, setMessageType] = useState<Message['messageType']>('general');
  const [isUrgent, setIsUrgent] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | Message['messageType']>('all');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessageThreads();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [selectedThread]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessageThreads = async () => {
    const mockThreads: MessageThread[] = [
      {
        threadId: '1',
        providerName: 'Dr. Sarah Johnson',
        providerSpecialty: 'Family Medicine',
        lastMessage: 'I have reviewed your lab results...',
        lastMessageDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
        unreadCount: 1,
        messages: [
          {
            id: '1',
            threadId: '1',
            patientId: 'patient1',
            providerId: 'provider1',
            senderId: 'patient1',
            senderName: 'You',
            senderType: 'patient',
            subject: 'Question about lab results',
            messageText: 'I have some questions about my recent lab results.',
            messageType: 'lab_result',
            isUrgent: false,
            attachments: [],
            readAt: new Date(),
            repliedAt: new Date(),
            createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
          },
          {
            id: '2',
            threadId: '1',
            patientId: 'patient1',
            providerId: 'provider1',
            senderId: 'provider1',
            senderName: 'Dr. Sarah Johnson',
            senderType: 'provider',
            subject: 'Re: Question about lab results',
            messageText: 'I have reviewed your lab results and everything looks good. Your cholesterol levels have improved significantly since your last visit.',
            messageType: 'lab_result',
            isUrgent: false,
            attachments: [
              {
                id: '1',
                fileName: 'lab_results.pdf',
                fileSize: 245000,
                fileType: 'application/pdf',
                url: '#',
              },
            ],
            readAt: null,
            repliedAt: null,
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          },
        ],
      },
    ];
    setThreads(mockThreads);
  };

  const handleSendMessage = async () => {
    if (!newMessageText.trim() || !selectedThread) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      threadId: selectedThread.threadId,
      patientId: 'patient1',
      providerId: selectedThread.messages[0].providerId,
      senderId: 'patient1',
      senderName: 'You',
      senderType: 'patient',
      subject: newMessageSubject || selectedThread.messages[0].subject,
      messageText: newMessageText,
      messageType,
      isUrgent,
      attachments: [],
      readAt: null,
      repliedAt: null,
      createdAt: new Date(),
    };

    setSelectedThread({
      ...selectedThread,
      messages: [...selectedThread.messages, newMessage],
      lastMessage: newMessageText,
      lastMessageDate: new Date(),
    });

    setNewMessageText('');
    setNewMessageSubject('');
    setAttachments([]);
    setIsUrgent(false);
    setShowNewMessage(false);
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files).filter(file => {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Maximum file size is 10MB.`);
          return false;
        }
        return true;
      });
      setAttachments([...attachments, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
    if (fileType === 'application/pdf') return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const getMessageTypeColor = (type: Message['messageType']) => {
    switch (type) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'prescription_refill':
        return 'bg-blue-100 text-blue-800';
      case 'lab_result':
        return 'bg-blue-100 text-blue-800';
      case 'appointment':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredThreads = threads.filter(thread => {
    const matchesSearch = thread.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || thread.messages.some(m => m.messageType === filterType);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="h-full bg-gray-50 flex">
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold mb-4">Messages</h2>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as typeof filterType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Messages</option>
            <option value="general">General</option>
            <option value="prescription_refill">Prescription Refill</option>
            <option value="lab_result">Lab Results</option>
            <option value="appointment">Appointment</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredThreads.map(thread => (
            <button
              key={thread.threadId}
              onClick={() => setSelectedThread(thread)}
              className={`w-full p-4 border-b border-gray-200 hover:bg-gray-50 transition text-left ${
                selectedThread?.threadId === thread.threadId ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{thread.providerName}</h3>
                  <p className="text-sm text-gray-600">{thread.providerSpecialty}</p>
                </div>
                {thread.unreadCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {thread.unreadCount}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 truncate">{thread.lastMessage}</p>
              <p className="text-xs text-gray-500 mt-1">
                {thread.lastMessageDate.toLocaleString()}
              </p>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => setShowNewMessage(true)}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            New Message
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedThread ? (
          <>
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedThread.providerName}</h2>
                  <p className="text-gray-600">{selectedThread.providerSpecialty}</p>
                </div>
                <div className="flex space-x-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                    <Download className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                    <Printer className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {selectedThread.messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.senderType === 'patient' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl rounded-lg shadow-sm ${
                      message.senderType === 'patient'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">{message.senderName}</p>
                        <span
                          className={`text-xs px-2 py-1 rounded ${getMessageTypeColor(message.messageType)}`}
                        >
                          {message.messageType.replace('_', ' ')}
                        </span>
                      </div>
                      {message.isUrgent && (
                        <div className="flex items-center text-red-500 text-sm mb-2">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          Urgent
                        </div>
                      )}
                      <p className="text-sm font-medium mb-2">{message.subject}</p>
                      <p className="whitespace-pre-wrap">{message.messageText}</p>

                      {message.attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.attachments.map(attachment => (
                            <div
                              key={attachment.id}
                              className={`flex items-center space-x-3 p-2 rounded ${
                                message.senderType === 'patient' ? 'bg-blue-700' : 'bg-gray-50'
                              }`}
                            >
                              {getFileIcon(attachment.fileType)}
                              <div className="flex-1">
                                <p className="text-sm font-medium">{attachment.fileName}</p>
                                <p className="text-xs opacity-75">{formatFileSize(attachment.fileSize)}</p>
                              </div>
                              <button className="hover:opacity-75">
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3 text-xs opacity-75">
                        <span>{message.createdAt.toLocaleString()}</span>
                        {message.readAt && (
                          <div className="flex items-center">
                            <CheckCheck className="w-4 h-4 mr-1" />
                            Read
                          </div>
                        )}
                        {!message.readAt && message.senderType === 'patient' && (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            Sent
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white border-t border-gray-200 p-4">
              <div className="mb-3 flex items-center space-x-2">
                <select
                  value={messageType}
                  onChange={e => setMessageType(e.target.value as Message['messageType'])}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General Inquiry</option>
                  <option value="prescription_refill">Prescription Refill</option>
                  <option value="lab_result">Lab Result Question</option>
                  <option value="appointment">Appointment Related</option>
                  <option value="urgent">Urgent</option>
                </select>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUrgent}
                    onChange={e => setIsUrgent(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Mark as urgent</span>
                </label>
              </div>

              {attachments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg">
                      {getFileIcon(file.type)}
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                      <button onClick={() => removeAttachment(index)} className="text-red-600 hover:text-red-800">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  <Paperclip className="w-5 h-5 text-gray-600" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={e => handleFileSelect(e.target.files)}
                />
                <input
                  type="text"
                  value={newMessageText}
                  onChange={e => setNewMessageText(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessageText.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg">Select a conversation to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};