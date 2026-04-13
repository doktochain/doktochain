import { api } from '../lib/api-client';
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
    const { data, error } = await api.get<HelpCategory[]>('/help-categories', {
      params: { is_active: true },
    });

    if (data) {
      for (const category of data) {
        const { data: countData } = await api.get<{ count: number }>('/help-articles/count', {
          params: { category_id: category.id, is_published: true },
        });
        category.article_count = countData?.count || 0;
      }
    }

    return { data, error };
  }

  async getCategoryBySlug(slug: string) {
    const { data, error } = await api.get<HelpCategory>('/help-categories/by-slug', {
      params: { slug, is_active: true },
    });
    return { data, error };
  }

  async getArticles(categoryId?: string, search?: string) {
    const params: Record<string, any> = { is_published: true };

    if (categoryId) {
      params.category_id = categoryId;
    }

    if (search) {
      const safeSearch = sanitizeSearchInput(search);
      if (safeSearch.length > 0) {
        params.search = safeSearch;
      }
    }

    return await api.get<HelpArticle[]>('/help-articles', { params });
  }

  async getFeaturedArticles(limit: number = 6) {
    return await api.get<HelpArticle[]>('/help-articles', {
      params: { is_published: true, is_featured: true, limit },
    });
  }

  async getPopularArticles(limit: number = 5) {
    return await api.get<HelpArticle[]>('/help-articles', {
      params: { is_published: true, sort_by: 'view_count', limit },
    });
  }

  async getArticleBySlug(slug: string) {
    const { data, error } = await api.get<HelpArticle>('/help-articles/by-slug', {
      params: { slug, is_published: true },
    });

    if (data && !error) {
      await api.put(`/help-articles/${data.id}`, {
        view_count: data.view_count + 1,
      });
    }

    return { data, error };
  }

  async searchContent(query: string) {
    const safeQuery = sanitizeSearchInput(query);
    if (safeQuery.length < 1) return { articles: [], faqs: [] };

    const [articles, faqs] = await Promise.all([
      api.get<HelpArticle[]>('/help-articles', {
        params: { is_published: true, search: safeQuery, limit: 10 },
      }),
      api.get<FAQ[]>('/faqs', {
        params: { search: safeQuery, limit: 10 },
      }),
    ]);

    return {
      articles: articles.data || [],
      faqs: faqs.data || [],
    };
  }

  async getFAQs(categoryId?: string, featured?: boolean) {
    const params: Record<string, any> = {};

    if (categoryId) {
      params.category_id = categoryId;
    }

    if (featured) {
      params.is_featured = true;
    }

    return await api.get<FAQ[]>('/faqs', { params });
  }

  async submitArticleFeedback(articleId: string, userId: string, isHelpful: boolean, comment?: string) {
    const { data, error } = await api.post<any>('/article-feedback', {
      article_id: articleId,
      user_id: userId,
      is_helpful: isHelpful,
      comment,
    });

    if (!error) {
      const field = isHelpful ? 'helpful_count' : 'not_helpful_count';
      await api.post('/rpc/increment_article_count', {
        article_id: articleId,
        field_name: field,
      });
    }

    return { data, error };
  }

  async getSupportTickets(userId: string, status?: string) {
    const params: Record<string, any> = { user_id: userId };

    if (status) {
      params.status = status;
    }

    return await api.get<SupportTicket[]>('/support-tickets', { params });
  }

  async getTicketByNumber(ticketNumber: string) {
    return await api.get<SupportTicket>('/support-tickets/by-number', {
      params: { ticket_number: ticketNumber },
    });
  }

  async createSupportTicket(ticket: Omit<SupportTicket, 'id' | 'ticket_number' | 'created_at' | 'updated_at'>) {
    return await api.post<SupportTicket>('/support-tickets', ticket);
  }

  async updateTicketStatus(ticketId: string, status: string) {
    const updates: any = { status, updated_at: new Date().toISOString() };

    if (status === 'resolved' || status === 'closed') {
      updates.resolved_at = new Date().toISOString();
    }

    return await api.put<SupportTicket>(`/support-tickets/${ticketId}`, updates);
  }

  async getTicketMessages(ticketId: string) {
    return await api.get<TicketMessage[]>('/ticket-messages', {
      params: { ticket_id: ticketId, is_internal: false },
    });
  }

  async addTicketMessage(ticketId: string, userId: string, message: string, attachments?: any) {
    const { data, error } = await api.post<TicketMessage>('/ticket-messages', {
      ticket_id: ticketId,
      user_id: userId,
      message,
      attachments,
      is_internal: false,
    });

    if (!error) {
      await api.put(`/support-tickets/${ticketId}`, {
        status: 'waiting_response',
        updated_at: new Date().toISOString(),
      });
    }

    return { data, error };
  }

  async createChatSession(userId: string) {
    return await api.post<ChatSession>('/chat-sessions', {
      user_id: userId,
      status: 'waiting',
    });
  }

  async getChatSession(sessionId: string) {
    return await api.get<ChatSession>(`/chat-sessions/${sessionId}`);
  }

  async getActiveChatSession(userId: string) {
    return await api.get<ChatSession>('/chat-sessions/active', {
      params: { user_id: userId },
    });
  }

  async getChatMessages(sessionId: string) {
    return await api.get<ChatMessage[]>('/chat-messages', {
      params: { session_id: sessionId },
    });
  }

  async sendChatMessage(sessionId: string, senderId: string, message: string) {
    return await api.post<ChatMessage>('/chat-messages', {
      session_id: sessionId,
      sender_id: senderId,
      message,
    });
  }

  async endChatSession(sessionId: string, rating?: number, feedback?: string) {
    return await api.put<ChatSession>(`/chat-sessions/${sessionId}`, {
      status: 'ended',
      ended_at: new Date().toISOString(),
      rating,
      feedback,
    });
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
