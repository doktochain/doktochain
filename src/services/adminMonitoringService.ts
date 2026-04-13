import { supabase } from '../lib/supabase';

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
  // Flag Management
  async getFlaggedItems(filters?: {
    table?: string;
    status?: string;
    priority?: string;
  }): Promise<FlaggedItem[]> {
    let query = supabase
      .from('admin_flags')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.table) {
      query = query.eq('flagged_table', filters.table);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    const { data, error } = await query;
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
    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('admin_flags')
      .insert({
        ...flag,
        flagged_by: user.user?.id,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateFlagStatus(
    flagId: string,
    status: string,
    resolutionNotes?: string
  ): Promise<void> {
    const { data: user } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('admin_flags')
      .update({
        status,
        resolution_notes: resolutionNotes,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        resolved_by: status === 'resolved' ? user.user?.id : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', flagId);

    if (error) throw error;
  }

  // Moderation Logging
  async logModerationAction(log: {
    action_type: string;
    target_table: string;
    target_record_id: string;
    action_description: string;
    reason?: string;
    before_state?: any;
    after_state?: any;
  }): Promise<void> {
    const { data: user } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('moderation_logs')
      .insert({
        ...log,
        admin_user_id: user.user?.id,
      });

    if (error) throw error;
  }

  async getModerationLogs(filters?: {
    adminUserId?: string;
    actionType?: string;
    targetTable?: string;
    limit?: number;
  }): Promise<ModerationLog[]> {
    let query = supabase
      .from('moderation_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.adminUserId) {
      query = query.eq('admin_user_id', filters.adminUserId);
    }
    if (filters?.actionType) {
      query = query.eq('action_type', filters.actionType);
    }
    if (filters?.targetTable) {
      query = query.eq('target_table', filters.targetTable);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Analytics
  async getSystemAnalytics(filters?: {
    category?: string;
    portal?: string;
    timePeriod?: string;
  }): Promise<SystemAnalytics[]> {
    let query = supabase
      .from('system_analytics')
      .select('*')
      .order('start_date', { ascending: false });

    if (filters?.category) {
      query = query.eq('metric_category', filters.category);
    }
    if (filters?.portal) {
      query = query.eq('portal_type', filters.portal);
    }
    if (filters?.timePeriod) {
      query = query.eq('time_period', filters.timePeriod);
    }

    const { data, error } = await query;
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
    const { error } = await supabase
      .from('system_analytics')
      .upsert(metric, {
        onConflict: 'metric_name,portal_type,time_period,start_date',
      });

    if (error) throw error;
  }

  // Content Moderation Queue
  async getContentModerationQueue(filters?: {
    contentType?: string;
    status?: string;
    priority?: string;
  }): Promise<any[]> {
    let query = supabase
      .from('content_moderation_queue')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.contentType) {
      query = query.eq('content_type', filters.contentType);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async moderateContent(
    itemId: string,
    action: string,
    notes?: string
  ): Promise<void> {
    const { data: user } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('content_moderation_queue')
      .update({
        status: 'reviewed',
        moderation_action: action,
        moderation_notes: notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (error) throw error;
  }

  // Chat Monitoring
  async getAllConversations(filters?: {
    portalType?: string;
    flagged?: boolean;
    dateRange?: string;
  }): Promise<any[]> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select(`
        *,
        patient:patient_id(id, first_name, last_name),
        provider:provider_id(id, first_name, last_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  }

  async getChatMessages(conversationId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Call Monitoring
  async getAllCalls(filters?: {
    callType?: string;
    portalType?: string;
    flagged?: boolean;
    dateRange?: string;
  }): Promise<any[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patient_id(id, first_name, last_name),
        provider:provider_id(id, first_name, last_name)
      `)
      .eq('appointment_type', 'telemedicine')
      .order('appointment_date', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  }

  // System Events (Calendar) - Query REAL appointments table
  async getAllSystemEvents(filters?: {
    eventType?: string;
    portalType?: string;
    dateRange?: string;
  }): Promise<any[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patient_id(id, first_name, last_name),
        provider:provider_id(id, first_name, last_name)
      `)
      .order('appointment_date', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  }

  // Contact Directory - Query REAL contacts table
  async getAllContacts(filters?: {
    portalType?: string;
    relationshipType?: string;
  }): Promise<any[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  }

  // Email Monitoring - Query REAL emails table
  async getAllEmails(filters?: {
    portalType?: string;
    flagged?: boolean;
    status?: string;
  }): Promise<any[]> {
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  }

  // Notes Monitoring - Query REAL notes table
  async getAllNotes(filters?: {
    portalType?: string;
    flagged?: boolean;
    noteType?: string;
  }): Promise<any[]> {
    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        user:user_id(id, full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  }

  // Kanban Monitoring - Query REAL kanban/project tables if they exist
  async getAllKanbanBoards(filters?: {
    portalType?: string;
    status?: string;
  }): Promise<any[]> {
    // Note: Returning empty array as kanban tables may not exist yet
    // This should be connected to actual project management tables when available
    return [];
  }

  // File Monitoring - Query document/file storage tables
  async getAllFiles(filters?: {
    portalType?: string;
    fileType?: string;
    flagged?: boolean;
  }): Promise<any[]> {
    // Note: This should query actual file storage tables
    // May need to query provider_verification_documents, guardianship_documents, etc.
    const { data, error } = await supabase
      .from('provider_verification_documents')
      .select(`
        *,
        provider:provider_id(id, first_name, last_name)
      `)
      .order('uploaded_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching files:', error);
      return [];
    }
    return data || [];
  }

  // Social Feed Monitoring - Social features may not be implemented yet
  async getAllPosts(filters?: {
    portalType?: string;
    flagged?: boolean;
    moderationStatus?: string;
  }): Promise<any[]> {
    // Note: Returning empty array as social feed tables don't exist yet
    // This should be connected to actual social/community tables when available
    return [];
  }

  // Search Analytics - Log search queries from actual search activity
  async getSearchAnalytics(filters?: {
    portalType?: string;
    dateRange?: string;
  }): Promise<any[]> {
    // Note: Returning empty array as search analytics tracking isn't implemented yet
    // This should be connected to search logging when implemented
    return [];
  }

  // Export functionality
  async exportData(table: string, filters?: any): Promise<Blob> {
    const { data, error } = await supabase
      .from(table)
      .select('*');

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
