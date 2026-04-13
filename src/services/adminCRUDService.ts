import { supabase } from '../lib/supabase';
import { auditLog } from './auditLogger';

interface AuditLogEntry {
  action: string;
  entity_type: string;
  entity_id: string;
  changes?: any;
  reason?: string;
}

interface StatusChange {
  entity_type: string;
  entity_id: string;
  old_status: string | null;
  new_status: string;
  reason?: string;
}

class AdminCRUDService {
  async logAudit(entry: AuditLogEntry): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      const adminId = user.user?.id || '';

      await supabase.from('admin_audit_log').insert({
        admin_user_id: adminId,
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        changes: entry.changes || {},
        reason: entry.reason,
      });

      await auditLog.adminAction(entry.action, entry.entity_type, entry.entity_id, adminId, {
        changes: entry.changes,
        reason: entry.reason,
      });
    } catch (error) {
      console.error('Failed to log audit entry:', error);
    }
  }

  async logStatusChange(change: StatusChange): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();

      await supabase.from('entity_status_history').insert({
        entity_type: change.entity_type,
        entity_id: change.entity_id,
        old_status: change.old_status,
        new_status: change.new_status,
        changed_by: user.user?.id,
        reason: change.reason,
      });
    } catch (error) {
      console.error('Failed to log status change:', error);
    }
  }

  async create(table: string, data: any): Promise<any> {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) throw error;

    await this.logAudit({
      action: 'create',
      entity_type: table,
      entity_id: result.id,
      changes: { after: data },
    });

    return result;
  }

  async update(table: string, id: string, data: any, currentData?: any): Promise<any> {
    const { data: result, error } = await supabase
      .from(table)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await this.logAudit({
      action: 'update',
      entity_type: table,
      entity_id: id,
      changes: {
        before: currentData,
        after: data,
      },
    });

    if (currentData?.status && data.status && currentData.status !== data.status) {
      await this.logStatusChange({
        entity_type: table,
        entity_id: id,
        old_status: currentData.status,
        new_status: data.status,
      });
    }

    return result;
  }

  async softDelete(table: string, id: string, reason?: string): Promise<void> {
    const { data: currentData } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from(table)
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    await this.logAudit({
      action: 'soft_delete',
      entity_type: table,
      entity_id: id,
      changes: { before: currentData },
      reason,
    });
  }

  async restore(table: string, id: string, reason?: string): Promise<any> {
    const { data: result, error } = await supabase
      .from(table)
      .update({
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await this.logAudit({
      action: 'restore',
      entity_type: table,
      entity_id: id,
      reason,
    });

    return result;
  }

  async hardDelete(table: string, id: string, reason?: string): Promise<void> {
    const { data: currentData } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;

    await this.logAudit({
      action: 'hard_delete',
      entity_type: table,
      entity_id: id,
      changes: { before: currentData },
      reason,
    });
  }

  async bulkUpdate(table: string, ids: string[], data: any): Promise<void> {
    const { error } = await supabase
      .from(table)
      .update({ ...data, updated_at: new Date().toISOString() })
      .in('id', ids);

    if (error) throw error;

    await Promise.all(
      ids.map(id =>
        this.logAudit({
          action: 'bulk_update',
          entity_type: table,
          entity_id: id,
          changes: { after: data },
        })
      )
    );
  }

  async bulkDelete(table: string, ids: string[], soft: boolean = true): Promise<void> {
    if (soft) {
      const { error } = await supabase
        .from(table)
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', ids);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from(table)
        .delete()
        .in('id', ids);

      if (error) throw error;
    }

    await Promise.all(
      ids.map(id =>
        this.logAudit({
          action: soft ? 'bulk_soft_delete' : 'bulk_hard_delete',
          entity_type: table,
          entity_id: id,
        })
      )
    );
  }

  async getAuditLogs(entityType: string, entityId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('admin_audit_log')
      .select(`
        *,
        admin:admin_user_id(first_name, last_name, email)
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getStatusHistory(entityType: string, entityId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('entity_status_history')
      .select(`
        *,
        changed_by_user:changed_by(first_name, last_name, email)
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async addNote(entityType: string, entityId: string, noteContent: string, noteType: string = 'general'): Promise<any> {
    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('admin_notes')
      .insert({
        admin_user_id: user.user?.id,
        entity_type: entityType,
        entity_id: entityId,
        note_type: noteType,
        note_content: noteContent,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getNotes(entityType: string, entityId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('admin_notes')
      .select(`
        *,
        admin:admin_user_id(first_name, last_name, email)
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async updateNote(noteId: string, updates: { note_content?: string; note_type?: string; is_pinned?: boolean }): Promise<any> {
    const { data, error } = await supabase
      .from('admin_notes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', noteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteNote(noteId: string): Promise<void> {
    const { error } = await supabase
      .from('admin_notes')
      .delete()
      .eq('id', noteId);

    if (error) throw error;
  }

  async getAll(table: string, includeDeleted: boolean = false): Promise<any[]> {
    let query = supabase.from(table).select('*').order('created_at', { ascending: false });

    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getById(table: string, id: string): Promise<any> {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async search(table: string, searchTerm: string, searchFields: string[]): Promise<any[]> {
    let query = supabase
      .from(table)
      .select('*')
      .is('deleted_at', null);

    if (searchTerm && searchFields.length > 0) {
      const orConditions = searchFields
        .map(field => `${field}.ilike.%${searchTerm}%`)
        .join(',');
      query = query.or(orConditions);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async exportToCSV(table: string, filters?: any): Promise<Blob> {
    let query = supabase.from(table).select('*');

    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined) {
          query = query.eq(key, filters[key]);
        }
      });
    }

    const { data, error } = await query;
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
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      ),
    ];

    return csvRows.join('\n');
  }
}

export const adminCRUDService = new AdminCRUDService();
