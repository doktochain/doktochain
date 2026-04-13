import { supabase } from '../lib/supabase';
import { sanitizeSearchInput } from '../lib/security';

export interface HelpCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon: string;
  color: string;
  order_index: number;
  parent_category_id?: string;
  is_active: boolean;
  article_count?: number;
}

export interface HelpArticle {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  content: string;
  summary?: string;
  author_id?: string;
  tags: string[];
  is_featured: boolean;
  is_published: boolean;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  video_url?: string;
  attachments?: any;
  created_at: string;
  updated_at: string;
  category?: HelpCategory;
}

export interface FAQ {
  id: string;
  category_id?: string;
  question: string;
  answer: string;
  order_index: number;
  is_featured: boolean;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  tags: string[];
  category?: HelpCategory;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  ticket_number: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
  assigned_to?: string;
  resolution?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  messages?: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  attachments?: any;
  is_internal: boolean;
  created_at: string;
  user?: any;
}

export interface ChatSession {
  id: string;
  user_id: string;
  agent_id?: string;
  status: 'waiting' | 'active' | 'ended';
  started_at: string;
  ended_at?: string;
  rating?: number;
  feedback?: string;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

class HelpCenterService {
  async getCategories() {
    const { data, error } = await supabase
      .from('help_categories')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (data) {
      for (const category of data) {
        const { count } = await supabase
          .from('help_articles')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', category.id)
          .eq('is_published', true);
        category.article_count = count || 0;
      }
    }

    return { data, error };
  }

  async getCategoryBySlug(slug: string) {
    return await supabase
      .from('help_categories')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();
  }

  async getArticles(categoryId?: string, search?: string) {
    let query = supabase
      .from('help_articles')
      .select('*, category:help_categories(*)')
      .eq('is_published', true)
      .order('order_index', { ascending: true });

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (search) {
      const safeSearch = sanitizeSearchInput(search);
      if (safeSearch.length > 0) {
        query = query.or(`title.ilike.%${safeSearch}%,content.ilike.%${safeSearch}%,summary.ilike.%${safeSearch}%`);
      }
    }

    return await query;
  }

  async getFeaturedArticles(limit: number = 6) {
    return await supabase
      .from('help_articles')
      .select('*, category:help_categories(*)')
      .eq('is_published', true)
      .eq('is_featured', true)
      .order('view_count', { ascending: false })
      .limit(limit);
  }

  async getPopularArticles(limit: number = 5) {
    return await supabase
      .from('help_articles')
      .select('*, category:help_categories(*)')
      .eq('is_published', true)
      .order('view_count', { ascending: false })
      .limit(limit);
  }

  async getArticleBySlug(slug: string) {
    const { data, error } = await supabase
      .from('help_articles')
      .select('*, category:help_categories(*)')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (data && !error) {
      await supabase
        .from('help_articles')
        .update({ view_count: data.view_count + 1 })
        .eq('id', data.id);
    }

    return { data, error };
  }

  async searchContent(query: string) {
    const safeQuery = sanitizeSearchInput(query);
    if (safeQuery.length < 1) return { articles: [], faqs: [] };

    const [articles, faqs] = await Promise.all([
      supabase
        .from('help_articles')
        .select('*, category:help_categories(*)')
        .eq('is_published', true)
        .or(`title.ilike.%${safeQuery}%,content.ilike.%${safeQuery}%,summary.ilike.%${safeQuery}%`)
        .limit(10),
      supabase
        .from('faqs')
        .select('*, category:help_categories(*)')
        .or(`question.ilike.%${safeQuery}%,answer.ilike.%${safeQuery}%`)
        .limit(10),
    ]);

    return {
      articles: articles.data || [],
      faqs: faqs.data || [],
    };
  }

  async getFAQs(categoryId?: string, featured?: boolean) {
    let query = supabase
      .from('faqs')
      .select('*, category:help_categories(*)')
      .order('order_index', { ascending: true });

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (featured) {
      query = query.eq('is_featured', true);
    }

    return await query;
  }

  async submitArticleFeedback(articleId: string, userId: string, isHelpful: boolean, comment?: string) {
    const { data, error } = await supabase
      .from('article_feedback')
      .upsert({
        article_id: articleId,
        user_id: userId,
        is_helpful: isHelpful,
        comment,
      }, {
        onConflict: 'article_id,user_id'
      })
      .select()
      .single();

    if (!error) {
      const field = isHelpful ? 'helpful_count' : 'not_helpful_count';
      await supabase.rpc('increment_article_count', {
        article_id: articleId,
        field_name: field,
      });
    }

    return { data, error };
  }

  async getSupportTickets(userId: string, status?: string) {
    let query = supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    return await query;
  }

  async getTicketByNumber(ticketNumber: string) {
    return await supabase
      .from('support_tickets')
      .select('*')
      .eq('ticket_number', ticketNumber)
      .single();
  }

  async createSupportTicket(ticket: Omit<SupportTicket, 'id' | 'ticket_number' | 'created_at' | 'updated_at'>) {
    return await supabase
      .from('support_tickets')
      .insert(ticket)
      .select()
      .single();
  }

  async updateTicketStatus(ticketId: string, status: string) {
    const updates: any = { status, updated_at: new Date().toISOString() };

    if (status === 'resolved' || status === 'closed') {
      updates.resolved_at = new Date().toISOString();
    }

    return await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', ticketId)
      .select()
      .single();
  }

  async getTicketMessages(ticketId: string) {
    return await supabase
      .from('ticket_messages')
      .select('*, user:user_profiles(id, full_name, avatar_url)')
      .eq('ticket_id', ticketId)
      .eq('is_internal', false)
      .order('created_at', { ascending: true });
  }

  async addTicketMessage(ticketId: string, userId: string, message: string, attachments?: any) {
    const { data, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        user_id: userId,
        message,
        attachments,
        is_internal: false,
      })
      .select()
      .single();

    if (!error) {
      await supabase
        .from('support_tickets')
        .update({
          status: 'waiting_response',
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);
    }

    return { data, error };
  }

  async createChatSession(userId: string) {
    return await supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        status: 'waiting',
      })
      .select()
      .single();
  }

  async getChatSession(sessionId: string) {
    return await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
  }

  async getActiveChatSession(userId: string) {
    return await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['waiting', 'active'])
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
  }

  async getChatMessages(sessionId: string) {
    return await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
  }

  async sendChatMessage(sessionId: string, senderId: string, message: string) {
    return await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        sender_id: senderId,
        message,
      })
      .select()
      .single();
  }

  async endChatSession(sessionId: string, rating?: number, feedback?: string) {
    return await supabase
      .from('chat_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        rating,
        feedback,
      })
      .eq('id', sessionId)
      .select()
      .single();
  }

  getTicketCategories() {
    return [
      'Account & Billing',
      'Appointments',
      'Medical Records',
      'Prescriptions',
      'Technical Support',
      'Insurance',
      'Telemedicine',
      'General Inquiry',
      'Other',
    ];
  }

  getPriorityColor(priority: string) {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  getStatusColor(status: string) {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'waiting_response':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  getStatusLabel(status: string) {
    return status.replace('_', ' ').toUpperCase();
  }
}

export const helpCenterService = new HelpCenterService();
