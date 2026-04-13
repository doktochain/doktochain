import { api } from '../lib/api-client';

export interface MessageConversation {
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
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject?: string;
  message_text: string;
  is_read: boolean;
  read_at?: string;
  parent_message_id?: string;
  attachment_urls?: string[];
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  provider_id?: string;
  template_name: string;
  template_category: string;
  subject?: string;
  content: string;
  is_system_template: boolean;
  usage_count: number;
  created_at: string;
}

export interface AutomatedMessage {
  id: string;
  provider_id: string;
  message_type: string;
  target_patient_id?: string;
  subject?: string;
  content: string;
  scheduled_for: string;
  sent_at?: string;
  status: string;
  delivery_channels: string[];
  created_at: string;
}

export interface StaffChatChannel {
  id: string;
  provider_id: string;
  channel_name: string;
  channel_type: string;
  description?: string;
  member_ids: string[];
  admin_ids: string[];
  is_archived: boolean;
  last_message_at?: string;
  created_at: string;
}

export interface StaffChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  attachments: any[];
  read_by: string[];
  patient_id?: string;
  created_at: string;
}

class MessagingService {
  async getConversations(userId: string, role: 'provider' | 'patient' = 'provider') {
    const params: Record<string, any> = {};
    if (role === 'provider') {
      params.provider_id = userId;
    } else {
      params.patient_id = userId;
    }
    params.exclude_status = 'archived';

    const { data, error } = await api.get<MessageConversation[]>('/message-conversations', { params });
    return { data, error };
  }

  async getConversation(conversationId: string) {
    const { data, error } = await api.get<MessageConversation>(`/message-conversations/${conversationId}`);
    return { data, error };
  }

  async createConversation(conversation: Partial<MessageConversation>) {
    const { data, error } = await api.post<MessageConversation>('/message-conversations', conversation);
    return { data, error };
  }

  async updateConversation(conversationId: string, updates: Partial<MessageConversation>) {
    const { data, error } = await api.put<MessageConversation>(`/message-conversations/${conversationId}`, updates);
    return { data, error };
  }

  async archiveConversation(conversationId: string) {
    return this.updateConversation(conversationId, { status: 'archived' });
  }

  async getMessages(filters?: {
    senderId?: string;
    recipientId?: string;
    conversationId?: string;
    limit?: number;
  }) {
    const params: Record<string, any> = {};

    if (filters?.conversationId) {
      params.conversation_id = filters.conversationId;
    }

    if (filters?.senderId) {
      params.sender_id = filters.senderId;
    }

    if (filters?.recipientId) {
      params.recipient_id = filters.recipientId;
    }

    if (filters?.limit) {
      params.limit = filters.limit;
    }

    const { data, error } = await api.get<Message[]>('/messages', { params });
    return { data, error };
  }

  async getMessagesByConversation(conversationId: string) {
    return this.getMessages({ conversationId, limit: 100 });
  }

  async sendMessage(message: {
    recipient_id: string;
    conversation_id?: string;
    subject?: string;
    message_text: string;
    parent_message_id?: string;
    attachment_urls?: string[];
  }) {
    const { data, error } = await api.post<Message>('/messages', message);

    if (data && message.conversation_id) {
      await api.put(`/message-conversations/${message.conversation_id}`, {
        last_message_at: new Date().toISOString(),
      });
    }

    return { data, error };
  }

  async markAsRead(messageId: string) {
    const { data, error } = await api.put<Message>(`/messages/${messageId}`, {
      is_read: true,
      read_at: new Date().toISOString(),
    });

    return { data, error };
  }

  async getUnreadCount(userId: string) {
    const { data, error } = await api.get<{ count: number }>('/messages/unread-count', {
      params: { recipient_id: userId },
    });

    return { count: data?.count || 0, error };
  }

  async getTemplates(providerId?: string, category?: string) {
    const params: Record<string, any> = {};

    if (providerId) {
      params.provider_id = providerId;
    }

    if (category) {
      params.template_category = category;
    }

    const { data, error } = await api.get<MessageTemplate[]>('/message-templates', { params });
    return { data, error };
  }

  async createTemplate(template: Partial<MessageTemplate>) {
    const { data, error } = await api.post<MessageTemplate>('/message-templates', template);
    return { data, error };
  }

  async updateTemplate(templateId: string, updates: Partial<MessageTemplate>) {
    const { data, error } = await api.put<MessageTemplate>(`/message-templates/${templateId}`, updates);
    return { data, error };
  }

  async deleteTemplate(templateId: string) {
    const { error } = await api.delete(`/message-templates/${templateId}`);
    return { error };
  }

  async incrementTemplateUsage(templateId: string) {
    const { data, error } = await api.post('/rpc/increment_template_usage', {
      template_id: templateId,
    });

    if (error) {
      const { data: template } = await api.get<MessageTemplate>(`/message-templates/${templateId}`);

      if (template) {
        await api.put(`/message-templates/${templateId}`, {
          usage_count: (template.usage_count || 0) + 1,
        });
      }
    }

    return { data, error };
  }

  async getAutomatedMessages(providerId: string, filters?: {
    status?: string;
    type?: string;
    from?: string;
    to?: string;
  }) {
    const params: Record<string, any> = { provider_id: providerId };

    if (filters?.status) {
      params.status = filters.status;
    }

    if (filters?.type) {
      params.message_type = filters.type;
    }

    if (filters?.from) {
      params.scheduled_from = filters.from;
    }

    if (filters?.to) {
      params.scheduled_to = filters.to;
    }

    const { data, error } = await api.get<AutomatedMessage[]>('/automated-messages', { params });
    return { data, error };
  }

  async createAutomatedMessage(message: Partial<AutomatedMessage>) {
    const { data, error } = await api.post<AutomatedMessage>('/automated-messages', message);
    return { data, error };
  }

  async updateAutomatedMessage(messageId: string, updates: Partial<AutomatedMessage>) {
    const { data, error } = await api.put<AutomatedMessage>(`/automated-messages/${messageId}`, updates);
    return { data, error };
  }

  async cancelAutomatedMessage(messageId: string) {
    return this.updateAutomatedMessage(messageId, { status: 'cancelled' });
  }

  async getStaffChannels(userId: string) {
    const { data, error } = await api.get<StaffChatChannel[]>('/staff-chat-channels', {
      params: { member_id: userId, is_archived: false },
    });

    return { data, error };
  }

  async createStaffChannel(channel: Partial<StaffChatChannel>) {
    const { data, error } = await api.post<StaffChatChannel>('/staff-chat-channels', channel);
    return { data, error };
  }

  async getStaffMessages(channelId: string, limit = 50) {
    const { data, error } = await api.get<StaffChatMessage[]>('/staff-chat-messages', {
      params: { channel_id: channelId, limit },
    });

    return { data, error };
  }

  async sendStaffMessage(message: {
    channel_id: string;
    content: string;
    message_type?: string;
    attachments?: any[];
    patient_id?: string;
  }) {
    const { data, error } = await api.post<StaffChatMessage>('/staff-chat-messages', message);

    if (data) {
      await api.put(`/staff-chat-channels/${message.channel_id}`, {
        last_message_at: new Date().toISOString(),
      });
    }

    return { data, error };
  }

  async markStaffMessageAsRead(messageId: string, userId: string) {
    const { data: message } = await api.get<StaffChatMessage>(`/staff-chat-messages/${messageId}`);

    if (message && !message.read_by.includes(userId)) {
      const { data, error } = await api.put<StaffChatMessage>(`/staff-chat-messages/${messageId}`, {
        read_by: [...message.read_by, userId],
      });

      return { data, error };
    }

    return { data: message, error: null };
  }

  async searchMessages(query: string, userId: string) {
    const { data, error } = await api.get<Message[]>('/messages/search', {
      params: { q: query, user_id: userId },
    });

    return { data, error };
  }

  async getDirectConversations(userId: string) {
    const { data, error } = await api.get<Message[]>('/messages', {
      params: { participant_id: userId },
    });

    if (error) throw error;

    const uniqueConversations = new Map<string, any>();
    (data || []).forEach((msg: any) => {
      const otherUserId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
      if (!uniqueConversations.has(otherUserId)) {
        uniqueConversations.set(otherUserId, {
          userId: otherUserId,
          user: msg.sender_id === userId ? msg.recipient : msg.sender,
          lastMessage: msg.message_text,
          lastMessageTime: msg.created_at,
          unreadCount: 0,
        });
      }
    });

    return Array.from(uniqueConversations.values());
  }

  async getDirectMessages(userId: string, otherUserId: string) {
    const { data, error } = await api.get<Message[]>('/messages/direct', {
      params: { user_id: userId, other_user_id: otherUserId },
    });

    if (error) throw error;

    const unread = (data || []).filter(
      (msg: any) => msg.recipient_id === userId && !msg.is_read
    );

    if (unread.length > 0) {
      await api.post('/messages/mark-read', {
        ids: unread.map((m: any) => m.id),
      });
    }

    return data || [];
  }

  async sendDirectMessage(senderId: string, recipientId: string, text: string) {
    const { data, error } = await api.post<Message>('/messages', {
      sender_id: senderId,
      recipient_id: recipientId,
      message_text: text,
    });

    if (error) throw error;
    return data;
  }

  subscribeToIncomingMessages(userId: string, onMessage: () => void) {
    const intervalId = setInterval(async () => {
      try {
        const { data } = await api.get<{ count: number }>('/messages/unread-count', {
          params: { recipient_id: userId },
        });
        if (data && data.count > 0) {
          onMessage();
        }
      } catch {}
    }, 5000);

    return () => clearInterval(intervalId);
  }
}

export const messagingService = new MessagingService();
