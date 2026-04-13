import { api } from '../lib/api-client';

export interface FlaggedItem {
  id: string;
  flagged_table: string;
  flagged_record_id: string;
  flag_type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_review' | 'resolved' | 'dismissed';
  reason: string;
  notes?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface ModerationLog {
  id: string;
  admin_user_id: string;
  action_type: string;
  target_table: string;
  target_record_id: string;
  action_description: string;
  reason?: string;
  before_state?: any;
  after_state?: any;
  created_at: string;
}

export interface SystemAnalytics {
  metric_name: string;
  metric_category: string;
  portal_type?: string;
  metric_value: number;
  time_period: string;
  start_date: string;
  end_date: string;
}

class AdminMonitoringService {
  async getFlaggedItems(filters?: {
    table?: string;
    status?: string;
    priority?: string;
  }): Promise<FlaggedItem[]> {
    const params: any = { order: 'created_at.desc' };
    if (filters?.table) params.flagged_table = filters.table;
    if (filters?.status) params.status = filters.status;
    if (filters?.priority) params.priority = filters.priority;

    const { data, error } = await api.get<FlaggedItem[]>('/admin-flags', { params });
    if (error) throw error;
    return data || [];
  }

  async createFlag(flag: {
    flagged_table: string;
    flagged_record_id: string;
    flag_type: string;
    priority: string;
    reason: string;
    notes?: string;
  }): Promise<FlaggedItem> {
    const { data, error } = await api.post<FlaggedItem>('/admin-flags', {
      ...flag,
      status: 'pending',
    });

    if (error) throw error;
    return data!;
  }

  async updateFlagStatus(
    flagId: string,
    status: string,
    resolutionNotes?: string
  ): Promise<void> {
    const { error } = await api.put(`/admin-flags/${flagId}`, {
      status,
      resolution_notes: resolutionNotes,
      resolved_at: status === 'resolved' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  }

  async logModerationAction(log: {
    action_type: string;
    target_table: string;
    target_record_id: string;
    action_description: string;
    reason?: string;
    before_state?: any;
    after_state?: any;
  }): Promise<void> {
    const { error } = await api.post('/moderation-logs', log);

    if (error) throw error;
  }

  async getModerationLogs(filters?: {
    adminUserId?: string;
    actionType?: string;
    targetTable?: string;
    limit?: number;
  }): Promise<ModerationLog[]> {
    const params: any = { order: 'created_at.desc' };
    if (filters?.adminUserId) params.admin_user_id = filters.adminUserId;
    if (filters?.actionType) params.action_type = filters.actionType;
    if (filters?.targetTable) params.target_table = filters.targetTable;
    if (filters?.limit) params.limit = filters.limit;

    const { data, error } = await api.get<ModerationLog[]>('/moderation-logs', { params });
    if (error) throw error;
    return data || [];
  }

  async getSystemAnalytics(filters?: {
    category?: string;
    portal?: string;
    timePeriod?: string;
  }): Promise<SystemAnalytics[]> {
    const params: any = { order: 'start_date.desc' };
    if (filters?.category) params.metric_category = filters.category;
    if (filters?.portal) params.portal_type = filters.portal;
    if (filters?.timePeriod) params.time_period = filters.timePeriod;

    const { data, error } = await api.get<SystemAnalytics[]>('/system-analytics', { params });
    if (error) throw error;
    return data || [];
  }

  async recordMetric(metric: {
    metric_name: string;
    metric_category: string;
    portal_type?: string;
    metric_value: number;
    metric_unit?: string;
    time_period: string;
    start_date: string;
    end_date: string;
  }): Promise<void> {
    const { error } = await api.post('/system-analytics', metric);

    if (error) throw error;
  }

  async getContentModerationQueue(filters?: {
    contentType?: string;
    status?: string;
    priority?: string;
  }): Promise<any[]> {
    const params: any = { order: 'priority.desc,created_at.desc' };
    if (filters?.contentType) params.content_type = filters.contentType;
    if (filters?.status) params.status = filters.status;
    if (filters?.priority) params.priority = filters.priority;

    const { data, error } = await api.get<any[]>('/content-moderation-queue', { params });
    if (error) throw error;
    return data || [];
  }

  async moderateContent(
    itemId: string,
    action: string,
    notes?: string
  ): Promise<void> {
    const { error } = await api.put(`/content-moderation-queue/${itemId}`, {
      status: 'reviewed',
      moderation_action: action,
      moderation_notes: notes,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  }

  async getAllConversations(filters?: {
    portalType?: string;
    flagged?: boolean;
    dateRange?: string;
  }): Promise<any[]> {
    const params: any = { order: 'created_at.desc', limit: 100 };

    const { data, error } = await api.get<any[]>('/chat-sessions', { params });
    if (error) throw error;
    return data || [];
  }

  async getChatMessages(conversationId: string): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/chat-messages', {
      params: { session_id: conversationId, order: 'created_at.asc' },
    });
    if (error) throw error;
    return data || [];
  }

  async getAllCalls(filters?: {
    callType?: string;
    portalType?: string;
    flagged?: boolean;
    dateRange?: string;
  }): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/appointments', {
      params: {
        appointment_type: 'telemedicine',
        order: 'appointment_date.desc',
        limit: 100,
      },
    });
    if (error) throw error;
    return data || [];
  }

  async getAllSystemEvents(filters?: {
    eventType?: string;
    portalType?: string;
    dateRange?: string;
  }): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/appointments', {
      params: { order: 'appointment_date.desc', limit: 100 },
    });
    if (error) throw error;
    return data || [];
  }

  async getAllContacts(filters?: {
    portalType?: string;
    relationshipType?: string;
  }): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/contacts', {
      params: { order: 'created_at.desc', limit: 100 },
    });
    if (error) throw error;
    return data || [];
  }

  async getAllEmails(filters?: {
    portalType?: string;
    flagged?: boolean;
    status?: string;
  }): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/emails', {
      params: { order: 'created_at.desc', limit: 100 },
    });
    if (error) throw error;
    return data || [];
  }

  async getAllNotes(filters?: {
    portalType?: string;
    flagged?: boolean;
    noteType?: string;
  }): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/notes', {
      params: { order: 'created_at.desc', limit: 100 },
    });
    if (error) throw error;
    return data || [];
  }

  async getAllKanbanBoards(filters?: {
    portalType?: string;
    status?: string;
  }): Promise<any[]> {
    return [];
  }

  async getAllFiles(filters?: {
    portalType?: string;
    fileType?: string;
    flagged?: boolean;
  }): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/provider-verification-documents', {
      params: { order: 'uploaded_at.desc', limit: 100 },
    });

    if (error) {
      console.error('Error fetching files:', error);
      return [];
    }
    return data || [];
  }

  async getAllPosts(filters?: {
    portalType?: string;
    flagged?: boolean;
    moderationStatus?: string;
  }): Promise<any[]> {
    return [];
  }

  async getSearchAnalytics(filters?: {
    portalType?: string;
    dateRange?: string;
  }): Promise<any[]> {
    return [];
  }

  async exportData(table: string, filters?: any): Promise<Blob> {
    const { data, error } = await api.get<any[]>(`/${table}`);

    if (error) throw error;

    const csv = this.convertToCSV(data || []);
    return new Blob([csv], { type: 'text/csv' });
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header =>
          JSON.stringify(row[header] || '')
        ).join(',')
      ),
    ];

    return csvRows.join('\n');
  }
}

export const adminMonitoringService = new AdminMonitoringService();
