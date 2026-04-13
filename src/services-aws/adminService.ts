import { api } from '../lib/api-client';
import { auditLog } from './auditLogger';

export interface StaffRole {
  id: string;
  role_name: string;
  role_type: string;
  description?: string;
  is_system_role: boolean;
  is_active: boolean;
  created_at: string;
}

export interface StaffPermission {
  id: string;
  permission_name: string;
  permission_category: string;
  description?: string;
  created_at: string;
}

export interface StaffMember {
  id: string;
  provider_id: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone?: string;
  role_id: string;
  access_scope: string;
  can_access_phi: boolean;
  can_access_financial: boolean;
  is_active: boolean;
  last_login?: string;
  hire_date?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  staff_id?: string;
  user_id?: string;
  action_type: string;
  resource_type: string;
  resource_id?: string;
  description: string;
  patient_id?: string;
  ip_address?: string;
  created_at: string;
}

export interface PerformanceMetrics {
  id: string;
  staff_id: string;
  period_start: string;
  period_end: string;
  appointments_scheduled: number;
  messages_sent: number;
  payments_processed: number;
  payment_amount_total: number;
  patient_satisfaction_score?: number;
  created_at: string;
}

class AdminService {
  async getRoles() {
    const { data, error } = await api.get<StaffRole[]>('/staff-roles', { params: { order: 'role_name:asc' } });
    return { data, error };
  }

  async createRole(role: Partial<StaffRole>) {
    const { data, error } = await api.post<StaffRole>('/staff-roles', role);
    return { data, error };
  }

  async getPermissions(category?: string) {
    const params: Record<string, string> = { order: 'permission_category:asc' };
    if (category) {
      params.permission_category = category;
    }
    const { data, error } = await api.get<StaffPermission[]>('/staff-permissions', { params });
    return { data, error };
  }

  async getRolePermissions(roleId: string) {
    const { data, error } = await api.get<any[]>('/role-permissions', { params: { role_id: roleId, expand: 'permission' } });
    return { data, error };
  }

  async assignPermissionToRole(roleId: string, permissionId: string) {
    const { data, error } = await api.post<any>('/role-permissions', { role_id: roleId, permission_id: permissionId });
    return { data, error };
  }

  async removePermissionFromRole(roleId: string, permissionId: string) {
    const { error } = await api.delete(`/role-permissions?role_id=${roleId}&permission_id=${permissionId}`);
    return { error };
  }

  async getStaffMembers(providerId: string) {
    const { data, error } = await api.get<StaffMember[]>('/staff-members', { params: { provider_id: providerId, expand: 'role', order: 'full_name:asc' } });
    return { data, error };
  }

  async getStaffMember(staffId: string) {
    const { data, error } = await api.get<StaffMember>(`/staff-members/${staffId}`, { params: { expand: 'role' } });
    return { data, error };
  }

  async createStaffMember(staff: Partial<StaffMember>) {
    const { data, error } = await api.post<StaffMember>('/staff-members', staff);

    if (data) {
      try {
        await auditLog.adminAction('create_staff', 'staff_member', data.id, staff.provider_id || '', {
          staff_name: staff.full_name,
          role_id: staff.role_id,
        });
      } catch {}
    }

    return { data, error };
  }

  async updateStaffMember(staffId: string, updates: Partial<StaffMember>) {
    const { data, error } = await api.put<StaffMember>(`/staff-members/${staffId}`, updates);

    if (data) {
      try {
        const action = updates.is_active === false ? 'deactivate_staff' : 'update_staff';
        await auditLog.adminAction(action, 'staff_member', staffId, '', {
          updates: Object.keys(updates),
        });
      } catch {}
    }

    return { data, error };
  }

  async deactivateStaffMember(staffId: string) {
    return this.updateStaffMember(staffId, { is_active: false });
  }

  async getActivityLogs(filters?: {
    staffId?: string;
    patientId?: string;
    actionType?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    const params: Record<string, string> = { order: 'created_at:desc', expand: 'staff' };

    if (filters?.staffId) params.staff_id = filters.staffId;
    if (filters?.patientId) params.patient_id = filters.patientId;
    if (filters?.actionType) params.action_type = filters.actionType;
    if (filters?.from) params.created_at_gte = filters.from;
    if (filters?.to) params.created_at_lte = filters.to;
    if (filters?.limit) params.limit = String(filters.limit);

    const { data, error } = await api.get<ActivityLog[]>('/staff-activity-logs', { params });
    return { data, error };
  }

  async logActivity(activity: Partial<ActivityLog>) {
    const { data, error } = await api.post<ActivityLog>('/staff-activity-logs', activity);
    return { data, error };
  }

  async getPerformanceMetrics(staffId: string, period?: { start: string; end: string }) {
    const params: Record<string, string> = { staff_id: staffId, order: 'period_start:desc' };

    if (period) {
      params.period_start_gte = period.start;
      params.period_end_lte = period.end;
    }

    const { data, error } = await api.get<PerformanceMetrics[]>('/staff-performance-metrics', { params });
    return { data, error };
  }

  async createPerformanceMetrics(metrics: Partial<PerformanceMetrics>) {
    const { data, error } = await api.post<PerformanceMetrics>('/staff-performance-metrics', metrics);
    return { data, error };
  }

  async updatePerformanceMetrics(metricsId: string, updates: Partial<PerformanceMetrics>) {
    const { data, error } = await api.put<PerformanceMetrics>(`/staff-performance-metrics/${metricsId}`, updates);
    return { data, error };
  }

  async getPlatformStats() {
    const { data, error } = await api.get<any>('/admin/stats');
    if (error || !data) return { data: null, error };

    return {
      data: null,
      error: null,
      stats: {
        totalUsers: data.totalUsers || 0,
        totalProviders: data.activeProviders || 0,
        verifiedProviders: data.verifiedProviders || 0,
        totalPatients: data.totalPatients || 0,
        totalPharmacies: data.activePharmacies || 0,
        totalClinics: data.totalClinics || 0,
        pendingApplications: (data.pendingProviders || 0) + (data.pendingPharmacies || 0),
        activeAppointmentsToday: data.todayAppointments || 0,
        revenueThisMonth: data.totalRevenue || 0,
        newRegistrationsThisWeek: data.newRegistrationsThisWeek || 0,
        completedAppointmentsThisMonth: data.appointmentsThisMonth || 0,
        pendingPrescriptions: data.pendingPrescriptions || 0,
      },
      recentProviders: data.recentProviders || [],
      recentPatients: data.recentPatients || [],
      recentAppointments: data.recentAppointments || [],
      appointmentStatuses: data.appointmentStatuses || [],
      pendingActions: data.stats?.alerts || [],
    };
  }

  async getUsers() {
    const { data, error } = await api.get<any[]>('/admin/users');
    return { data: data || [], error };
  }

  async getProviders() {
    const { data, error } = await api.get<any[]>('/admin/providers');
    return { data: data || [], error };
  }

  async getPharmacies() {
    const { data, error } = await api.get<any[]>('/admin/pharmacies');
    return { data: data || [], error };
  }

  async deleteUser(userId: string, _actorId?: string) {
    const { error } = await api.delete(`/admin/users/${userId}`);
    return { error };
  }

  async updateUser(userId: string, updates: { first_name?: string; last_name?: string; phone_number?: string; role?: string; profile_completed?: boolean }, _actorId?: string) {
    const { error } = await api.put(`/admin/users/${userId}`, updates);
    return { error };
  }

  async toggleUserStatus(userId: string, currentStatus: boolean, actorId?: string) {
    return this.updateUser(userId, { profile_completed: !currentStatus }, actorId);
  }

  async verifyProvider(providerId: string, _actorId?: string) {
    const { error } = await api.put(`/admin/providers/${providerId}/verify`, {});
    return { error };
  }

  async verifyPharmacy(pharmacyId: string, _actorId?: string) {
    const { error } = await api.put(`/admin/pharmacies/${pharmacyId}/verify`, {});
    return { error };
  }

  async getDashboardStats(providerId: string) {
    const [staffData, logsData] = await Promise.all([
      this.getStaffMembers(providerId),
      this.getActivityLogs({ limit: 100 }),
    ]);

    const totalStaff = staffData.data?.length || 0;
    const activeStaff = staffData.data?.filter((s) => s.is_active).length || 0;
    const recentLogins = logsData.data?.filter(
      (log) => log.action_type === 'login'
    ).length || 0;

    return {
      totalStaff,
      activeStaff,
      recentLogins,
      totalLogs: logsData.data?.length || 0,
    };
  }
}

export const adminService = new AdminService();
