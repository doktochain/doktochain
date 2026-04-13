import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase');

function chainMock(resolveValue: { data: any; error: any; count?: number }) {
  const chain: any = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
    eq: vi.fn(), neq: vi.fn(), in: vi.fn(), or: vi.fn(), contains: vi.fn(),
    order: vi.fn(), limit: vi.fn(), rpc: vi.fn(),
    single: vi.fn().mockResolvedValue(resolveValue),
    maybeSingle: vi.fn().mockResolvedValue(resolveValue),
    then: (resolve: any) => resolve(resolveValue),
  };
  Object.keys(chain).forEach((k) => {
    if (!['then', 'single', 'maybeSingle'].includes(k)) chain[k].mockReturnValue(chain);
  });
  return chain;
}

const { messagingService } = await import('../messagingService');

describe('messagingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConversations', () => {
    it('queries conversations for provider', async () => {
      const convos = [{ id: 'conv1', subject: 'Test' }];
      const chain = chainMock({ data: convos, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await messagingService.getConversations('u1', 'provider');
      expect(result.data).toEqual(convos);
      expect(supabase.from).toHaveBeenCalledWith('message_conversations');
      expect(chain.eq).toHaveBeenCalledWith('provider_id', 'u1');
    });

    it('queries conversations for patient', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await messagingService.getConversations('u1', 'patient');
      expect(chain.eq).toHaveBeenCalledWith('patient_id', 'u1');
    });

    it('excludes archived conversations', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await messagingService.getConversations('u1');
      expect(chain.neq).toHaveBeenCalledWith('status', 'archived');
    });
  });

  describe('getConversation', () => {
    it('returns conversation by id', async () => {
      const convo = { id: 'conv1', subject: 'Test' };
      const chain = chainMock({ data: convo, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await messagingService.getConversation('conv1');
      expect(result.data).toEqual(convo);
    });
  });

  describe('createConversation', () => {
    it('inserts and returns conversation', async () => {
      const convo = { id: 'conv1', subject: 'New' };
      const chain = chainMock({ data: convo, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await messagingService.createConversation({ subject: 'New' } as any);
      expect(result.data).toEqual(convo);
    });
  });

  describe('archiveConversation', () => {
    it('sets status to archived', async () => {
      const chain = chainMock({ data: { id: 'conv1', status: 'archived' }, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await messagingService.archiveConversation('conv1');
      expect(result.data).toEqual(expect.objectContaining({ status: 'archived' }));
    });
  });

  describe('getMessages', () => {
    it('queries messages by conversation_id', async () => {
      const messages = [{ id: 'm1', message_text: 'Hi' }];
      const chain = chainMock({ data: messages, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await messagingService.getMessages({ conversationId: 'conv1' });
      expect(result.data).toEqual(messages);
      expect(supabase.from).toHaveBeenCalledWith('messages');
      expect(chain.eq).toHaveBeenCalledWith('conversation_id', 'conv1');
    });

    it('applies sender filter', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await messagingService.getMessages({ senderId: 'u1' });
      expect(chain.eq).toHaveBeenCalledWith('sender_id', 'u1');
    });

    it('applies limit', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await messagingService.getMessages({ limit: 10 });
      expect(chain.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('sendMessage', () => {
    it('returns error when not authenticated', async () => {
      (supabase.auth as any) = { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) };
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await messagingService.sendMessage({
        recipient_id: 'u2',
        message_text: 'Hello',
      });
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('inserts message when authenticated', async () => {
      (supabase.auth as any) = { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) };
      const msg = { id: 'm1', message_text: 'Hello' };
      const chain = chainMock({ data: msg, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await messagingService.sendMessage({
        recipient_id: 'u2',
        message_text: 'Hello',
      });
      expect(result.data).toEqual(msg);
    });
  });

  describe('markAsRead', () => {
    it('updates message as read', async () => {
      const msg = { id: 'm1', is_read: true };
      const chain = chainMock({ data: msg, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await messagingService.markAsRead('m1');
      expect(result.data).toEqual(msg);
    });
  });

  describe('getUnreadCount', () => {
    it('returns count of unread messages', async () => {
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ count: 5, error: null }),
      };
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await messagingService.getUnreadCount('u1');
      expect(result.count).toBe(5);
    });
  });

  describe('getTemplates', () => {
    it('queries templates for provider', async () => {
      const templates = [{ id: 't1', template_name: 'Follow-up' }];
      const chain = chainMock({ data: templates, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await messagingService.getTemplates('prov1');
      expect(result.data).toEqual(templates);
      expect(supabase.from).toHaveBeenCalledWith('message_templates');
    });

    it('queries system templates only when no providerId', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await messagingService.getTemplates();
      expect(chain.eq).toHaveBeenCalledWith('is_system_template', true);
    });
  });

  describe('createTemplate', () => {
    it('inserts and returns template', async () => {
      const template = { id: 't1', template_name: 'New' };
      const chain = chainMock({ data: template, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await messagingService.createTemplate({ template_name: 'New' } as any);
      expect(result.data).toEqual(template);
    });
  });

  describe('deleteTemplate', () => {
    it('deletes template by id', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await messagingService.deleteTemplate('t1');
      expect(result.error).toBeNull();
      expect(chain.eq).toHaveBeenCalledWith('id', 't1');
    });
  });

  describe('getAutomatedMessages', () => {
    it('queries automated messages for provider', async () => {
      const messages = [{ id: 'am1', message_type: 'reminder' }];
      const chain = chainMock({ data: messages, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await messagingService.getAutomatedMessages('prov1');
      expect(result.data).toEqual(messages);
      expect(supabase.from).toHaveBeenCalledWith('automated_messages');
    });

    it('applies status filter', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await messagingService.getAutomatedMessages('prov1', { status: 'pending' });
      expect(chain.eq).toHaveBeenCalledWith('status', 'pending');
    });
  });

  describe('cancelAutomatedMessage', () => {
    it('sets status to cancelled', async () => {
      const chain = chainMock({ data: { id: 'am1', status: 'cancelled' }, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await messagingService.cancelAutomatedMessage('am1');
      expect(result.data).toEqual(expect.objectContaining({ status: 'cancelled' }));
    });
  });

  describe('getStaffChannels', () => {
    it('queries channels containing user', async () => {
      const channels = [{ id: 'ch1', channel_name: 'General' }];
      const chain = chainMock({ data: channels, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await messagingService.getStaffChannels('u1');
      expect(result.data).toEqual(channels);
      expect(supabase.from).toHaveBeenCalledWith('staff_chat_channels');
      expect(chain.contains).toHaveBeenCalledWith('member_ids', ['u1']);
    });
  });

  describe('sendDirectMessage', () => {
    it('inserts direct message between users', async () => {
      const msg = { id: 'm1', sender_id: 'u1', recipient_id: 'u2', message_text: 'Hi' };
      const chain = chainMock({ data: msg, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await messagingService.sendDirectMessage('u1', 'u2', 'Hi');
      expect(result).toEqual(msg);
      expect(chain.insert).toHaveBeenCalledWith({
        sender_id: 'u1',
        recipient_id: 'u2',
        message_text: 'Hi',
      });
    });
  });
});
