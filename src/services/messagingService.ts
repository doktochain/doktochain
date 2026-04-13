import { supabase } from '../lib/supabase';

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
  // Patient Conversations
  async getConversations(userId: string, role: 'provider' | 'patient' = 'provider') {
    const field = role === 'provider' ? 'provider_id' : 'patient_id';

    const { data, error } = await supabase
      .from('message_conversations')
      .select(`
        *,
        provider:provider_id(id, first_name, last_name, email, profile_photo_url),
        patient:patient_id(id, first_name, last_name, email, profile_photo_url)
      `)
      .eq(field, userId)
      .neq('status', 'archived')
      .order('last_message_at', { ascending: false, nullsFirst: false });

    return { data, error };
  }

  async getConversation(conversationId: string) {
    const { data, error } = await supabase
      .from('message_conversations')
      .select(`
        *,
        provider:provider_id(id, first_name, last_name, email, profile_photo_url),
        patient:patient_id(id, first_name, last_name, email, profile_photo_url)
      `)
      .eq('id', conversationId)
      .maybeSingle();

    return { data, error };
  }

  async createConversation(conversation: Partial<MessageConversation>) {
    const { data, error } = await supabase
      .from('message_conversations')
      .insert(conversation)
      .select()
      .single();

    return { data, error };
  }

  async updateConversation(conversationId: string, updates: Partial<MessageConversation>) {
    const { data, error } = await supabase
      .from('message_conversations')
      .update(updates)
      .eq('id', conversationId)
      .select()
      .single();

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
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id(id, first_name, last_name, email, profile_photo_url),
        recipient:recipient_id(id, first_name, last_name, email, profile_photo_url)
      `);

    if (filters?.conversationId) {
      query = query.eq('conversation_id', filters.conversationId);
    }

    if (filters?.senderId) {
      query = query.eq('sender_id', filters.senderId);
    }

    if (filters?.recipientId) {
      query = query.eq('recipient_id', filters.recipientId);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

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
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        ...message,
      })
      .select()
      .maybeSingle();

    if (data && message.conversation_id) {
      await supabase
        .from('message_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', message.conversation_id);
    }

    return { data, error };
  }

  async markAsRead(messageId: string) {
    const { data, error } = await supabase
      .from('messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .select()
      .single();

    return { data, error };
  }

  async getUnreadCount(userId: string) {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    return { count: count || 0, error };
  }

  // Message Templates
  async getTemplates(providerId?: string, category?: string) {
    let query = supabase
      .from('message_templates')
      .select('*');

    if (providerId) {
      query = query.or(`provider_id.eq.${providerId},is_system_template.eq.true`);
    } else {
      query = query.eq('is_system_template', true);
    }

    if (category) {
      query = query.eq('template_category', category);
    }

    const { data, error } = await query.order('usage_count', { ascending: false });

    return { data, error };
  }

  async createTemplate(template: Partial<MessageTemplate>) {
    const { data, error } = await supabase
      .from('message_templates')
      .insert(template)
      .select()
      .single();

    return { data, error };
  }

  async updateTemplate(templateId: string, updates: Partial<MessageTemplate>) {
    const { data, error } = await supabase
      .from('message_templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single();

    return { data, error };
  }

  async deleteTemplate(templateId: string) {
    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', templateId);

    return { error };
  }

  async incrementTemplateUsage(templateId: string) {
    const { data, error } = await supabase.rpc('increment_template_usage', {
      template_id: templateId,
    });

    if (error) {
      // Fallback if function doesn't exist
      const { data: template } = await supabase
        .from('message_templates')
        .select('usage_count')
        .eq('id', templateId)
        .single();

      if (template) {
        await supabase
          .from('message_templates')
          .update({ usage_count: (template.usage_count || 0) + 1 })
          .eq('id', templateId);
      }
    }

    return { data, error };
  }

  // Automated Messages
  async getAutomatedMessages(providerId: string, filters?: {
    status?: string;
    type?: string;
    from?: string;
    to?: string;
  }) {
    let query = supabase
      .from('automated_messages')
      .select('*')
      .eq('provider_id', providerId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.type) {
      query = query.eq('message_type', filters.type);
    }

    if (filters?.from) {
      query = query.gte('scheduled_for', filters.from);
    }

    if (filters?.to) {
      query = query.lte('scheduled_for', filters.to);
    }

    const { data, error } = await query.order('scheduled_for', { ascending: false });

    return { data, error };
  }

  async createAutomatedMessage(message: Partial<AutomatedMessage>) {
    const { data, error } = await supabase
      .from('automated_messages')
      .insert(message)
      .select()
      .single();

    return { data, error };
  }

  async updateAutomatedMessage(messageId: string, updates: Partial<AutomatedMessage>) {
    const { data, error } = await supabase
      .from('automated_messages')
      .update(updates)
      .eq('id', messageId)
      .select()
      .single();

    return { data, error };
  }

  async cancelAutomatedMessage(messageId: string) {
    return this.updateAutomatedMessage(messageId, { status: 'cancelled' });
  }

  // Staff Chat
  async getStaffChannels(userId: string) {
    const { data, error } = await supabase
      .from('staff_chat_channels')
      .select('*')
      .contains('member_ids', [userId])
      .eq('is_archived', false)
      .order('last_message_at', { ascending: false });

    return { data, error };
  }

  async createStaffChannel(channel: Partial<StaffChatChannel>) {
    const { data, error } = await supabase
      .from('staff_chat_channels')
      .insert(channel)
      .select()
      .single();

    return { data, error };
  }

  async getStaffMessages(channelId: string, limit = 50) {
    const { data, error } = await supabase
      .from('staff_chat_messages')
      .select(`
        *,
        sender:sender_id(id, full_name, email)
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data, error };
  }

  async sendStaffMessage(message: {
    channel_id: string;
    content: string;
    message_type?: string;
    attachments?: any[];
    patient_id?: string;
  }) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
      .from('staff_chat_messages')
      .insert({
        sender_id: user.id,
        ...message,
      })
      .select()
      .single();

    // Update channel last message time
    if (data) {
      await supabase
        .from('staff_chat_channels')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', message.channel_id);
    }

    return { data, error };
  }

  async markStaffMessageAsRead(messageId: string, userId: string) {
    const { data: message } = await supabase
      .from('staff_chat_messages')
      .select('read_by')
      .eq('id', messageId)
      .single();

    if (message && !message.read_by.includes(userId)) {
      const { data, error } = await supabase
        .from('staff_chat_messages')
        .update({
          read_by: [...message.read_by, userId],
        })
        .eq('id', messageId)
        .select()
        .single();

      return { data, error };
    }

    return { data: message, error: null };
  }

  // Search
  async searchMessages(query: string, userId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id(id, full_name),
        recipient:recipient_id(id, full_name)
      `)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .or(`subject.ilike.%${query}%,message_text.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    return { data, error };
  }

  async getDirectConversations(userId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id(id, first_name, last_name),
        recipient:recipient_id(id, first_name, last_name)
      `)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });

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
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id(id, first_name, last_name),
        recipient:recipient_id(id, first_name, last_name)
      `)
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`
      )
      .order('created_at', { ascending: true });

    if (error) throw error;

    const unread = (data || []).filter(
      (msg: any) => msg.recipient_id === userId && !msg.is_read
    );

    if (unread.length > 0) {
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unread.map((m: any) => m.id));
    }

    return data || [];
  }

  async sendDirectMessage(senderId: string, recipientId: string, text: string) {
    const { data, error } = await supabase
      .from('messages')
      .insert({ sender_id: senderId, recipient_id: recipientId, message_text: text })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  subscribeToIncomingMessages(userId: string, onMessage: () => void) {
    const subscription = supabase
      .channel(`direct-messages-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` },
        onMessage
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }
}

export const messagingService = new MessagingService();
