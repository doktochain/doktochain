import { api } from '../lib/api-client';
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
  async getAll(table: string, includeDeleted: boolean = false): Promise<any[]> {
    const params = includeDeleted ? '?include_deleted=true' : '';
    const { data, error } = await api.get<any[]>(`/admin/crud/${table}${params}`);
    if (error) throw new Error(error.message);
    return data || [];
  }

  async getById(table: string, id: string): Promise<any> {
    const { data, error } = await api.get<any>(`/admin/crud/${table}/${id}`);
    if (error) throw new Error(error.message);
    return data;
  }

  async create(table: string, record: any): Promise<any> {
    const { data, error } = await api.post<any>(`/admin/crud/${table}`, record);
    if (error) throw new Error(error.message);
    return data;
  }

  async update(table: string, id: string, record: any, currentData?: any): Promise<any> {
    const { data, error } = await api.put<any>(`/admin/crud/${table}/${id}`, record);
    if (error) throw new Error(error.message);
    return data;
  }

  async softDelete(table: string, id: string, reason?: string): Promise<void> {
    const { error } = await api.delete(`/admin/crud/${table}/${id}`);
    if (error) throw new Error(error.message);
  }

  async hardDelete(table: string, id: string, reason?: string): Promise<void> {
    const { error } = await api.delete(`/admin/crud/${table}/${id}`);
    if (error) throw new Error(error.message);
  }

  async restore(table: string, id: string, reason?: string): Promise<any> {
    const { data, error } = await api.put<any>(`/admin/crud/${table}/${id}`, { deleted_at: null });
    if (error) throw new Error(error.message);
    return data;
  }

  async bulkUpdate(table: string, ids: string[], record: any): Promise<void> {
    await Promise.all(ids.map(id => this.update(table, id, record)));
  }

  async bulkDelete(table: string, ids: string[], soft: boolean = true): Promise<void> {
    await Promise.all(ids.map(id => this.softDelete(table, id)));
  }

  async search(table: string, searchTerm: string, searchFields: string[]): Promise<any[]> {
    const all = await this.getAll(table);
    return all.filter(item =>
      searchFields.some(field =>
        String(item[field] || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }

  async logAudit(entry: AuditLogEntry): Promise<void> {
    try {
      await auditLog.adminAction(entry.action, entry.entity_type, entry.entity_id, '', entry.changes);
    } catch {}
  }

  async logStatusChange(change: StatusChange): Promise<void> {}
  async getAuditLogs(entityType: string, entityId: string): Promise<any[]> { return []; }
  async getStatusHistory(entityType: string, entityId: string): Promise<any[]> { return []; }
  async addNote(entityType: string, entityId: string, noteContent: string, noteType: string = 'general'): Promise<any> { return null; }
  async getNotes(entityType: string, entityId: string): Promise<any[]> { return []; }
  async updateNote(noteId: string, updates: { note_content?: string; note_type?: string; is_pinned?: boolean }): Promise<any> { return null; }
  async deleteNote(noteId: string): Promise<void> {}

  async exportToCSV(table: string, filters?: any): Promise<Blob> {
    const data = await this.getAll(table);
    const csv = this.convertToCSV(data);
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
