import { supabase } from '../lib/supabase';
import { blockchainAuditService } from './blockchainAuditService';
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
  // Staff Roles
  async getRoles() {
    const { data, error } = await supabase
      .from('staff_roles')
      .select('*')
      .order('role_name');

    return { data, error };
  }

  async createRole(role: Partial<StaffRole>) {
    const { data, error } = await supabase
      .from('staff_roles')
      .insert(role)
      .select()
      .single();

    return { data, error };
  }

  // Permissions
  async getPermissions(category?: string) {
    let query = supabase.from('staff_permissions').select('*');

    if (category) {
      query = query.eq('permission_category', category);
    }

    const { data, error } = await query.order('permission_category', { ascending: true });

    return { data, error };
  }

  async getRolePermissions(roleId: string) {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*, permission:permission_id(*)')
      .eq('role_id', roleId);

    return { data, error };
  }

  async assignPermissionToRole(roleId: string, permissionId: string) {
    const { data, error } = await supabase
      .from('role_permissions')
      .insert({ role_id: roleId, permission_id: permissionId })
      .select()
      .single();

    return { data, error };
  }

  async removePermissionFromRole(roleId: string, permissionId: string) {
    const { error } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('permission_id', permissionId);

    return { error };
  }

  // Staff Members
  async getStaffMembers(providerId: string) {
    const { data, error } = await supabase
      .from('staff_members')
      .select('*, role:role_id(*)')
      .eq('provider_id', providerId)
      .order('full_name');

    return { data, error };
  }

  async getStaffMember(staffId: string) {
    const { data, error } = await supabase
      .from('staff_members')
      .select('*, role:role_id(*)')
      .eq('id', staffId)
      .single();

    return { data, error };
  }

  async createStaffMember(staff: Partial<StaffMember>) {
    const { data, error } = await supabase
      .from('staff_members')
      .insert(staff)
      .select()
      .single();

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
    const { data, error } = await supabase
      .from('staff_members')
      .update(updates)
      .eq('id', staffId)
      .select()
      .single();

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

  // Activity Logs
  async getActivityLogs(filters?: {
    staffId?: string;
    patientId?: string;
    actionType?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    let query = supabase
      .from('staff_activity_logs')
      .select('*, staff:staff_id(full_name, email)');

    if (filters?.staffId) {
      query = query.eq('staff_id', filters.staffId);
    }

    if (filters?.patientId) {
      query = query.eq('patient_id', filters.patientId);
    }

    if (filters?.actionType) {
      query = query.eq('action_type', filters.actionType);
    }

    if (filters?.from) {
      query = query.gte('created_at', filters.from);
    }

    if (filters?.to) {
      query = query.lte('created_at', filters.to);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    return { data, error };
  }

  async logActivity(activity: Partial<ActivityLog>) {
    const { data, error } = await supabase
      .from('staff_activity_logs')
      .insert(activity)
      .select()
      .single();

    return { data, error };
  }

  // Performance Metrics
  async getPerformanceMetrics(staffId: string, period?: { start: string; end: string }) {
    let query = supabase
      .from('staff_performance_metrics')
      .select('*')
      .eq('staff_id', staffId);

    if (period) {
      query = query
        .gte('period_start', period.start)
        .lte('period_end', period.end);
    }

    const { data, error } = await query.order('period_start', { ascending: false });

    return { data, error };
  }

  async createPerformanceMetrics(metrics: Partial<PerformanceMetrics>) {
    const { data, error } = await supabase
      .from('staff_performance_metrics')
      .insert(metrics)
      .select()
      .single();

    return { data, error };
  }

  async updatePerformanceMetrics(metricsId: string, updates: Partial<PerformanceMetrics>) {
    const { data, error } = await supabase
      .from('staff_performance_metrics')
      .update(updates)
      .eq('id', metricsId)
      .select()
      .single();

    return { data, error };
  }

  async getPlatformStats() {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      usersRes,
      providersRes,
      verifiedProvidersRes,
      patientsRes,
      pharmaciesRes,
      clinicsRes,
      pendingProvidersRes,
      pendingPharmaciesRes,
      todayAppointmentsRes,
      completedApptRes,
      revenueRes,
      newRegistrationsRes,
      recentProvidersRes,
      recentPatientsRes,
      recentAppointmentsRes,
      appointmentStatusRes,
      pendingPrescriptionsRes,
    ] = await Promise.all([
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('providers').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('providers').select('id', { count: 'exact', head: true }).eq('is_verified', true),
      supabase.from('patients').select('id', { count: 'exact', head: true }),
      supabase.from('pharmacies').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('clinics').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('providers').select('id', { count: 'exact', head: true }).eq('is_verified', false).eq('is_active', false),
      supabase.from('pharmacies').select('id', { count: 'exact', head: true }).eq('is_verified', false),
      supabase.from('appointments').select('id', { count: 'exact', head: true })
        .eq('appointment_date', today)
        .in('status', ['scheduled', 'confirmed', 'in-progress']),
      supabase.from('appointments').select('id', { count: 'exact', head: true })
        .gte('appointment_date', monthStart.split('T')[0])
        .eq('status', 'completed'),
      supabase.from('billing_transactions').select('total_cents')
        .eq('status', 'completed')
        .gte('created_at', monthStart),
      supabase.from('user_profiles').select('id', { count: 'exact', head: true })
        .gte('created_at', weekAgo),
      supabase.from('providers').select('id, user_id, created_at, user_profiles!inner(first_name, last_name)')
        .order('created_at', { ascending: false }).limit(4),
      supabase.from('user_profiles').select('id, first_name, last_name, created_at, role')
        .eq('role', 'patient')
        .order('created_at', { ascending: false }).limit(4),
      supabase.from('appointments').select('id, appointment_date, status, created_at')
        .order('created_at', { ascending: false }).limit(4),
      supabase.from('appointments').select('status').gte('created_at', monthStart),
      supabase.from('prescriptions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    const totalRevenue = (revenueRes.data || []).reduce(
      (sum: number, t: any) => sum + (t.total_cents || 0), 0
    );

    const pendingProviderCount = pendingProvidersRes.count || 0;
    const pendingPharmacyCount = pendingPharmaciesRes.count || 0;

    return {
      stats: {
        totalUsers: usersRes.count || 0,
        totalProviders: providersRes.count || 0,
        verifiedProviders: verifiedProvidersRes.count || 0,
        totalPatients: patientsRes.count || 0,
        totalPharmacies: pharmaciesRes.count || 0,
        totalClinics: clinicsRes.count || 0,
        pendingApplications: pendingProviderCount + pendingPharmacyCount,
        activeAppointmentsToday: todayAppointmentsRes.count || 0,
        revenueThisMonth: totalRevenue,
        newRegistrationsThisWeek: newRegistrationsRes.count || 0,
        completedAppointmentsThisMonth: completedApptRes.count || 0,
        pendingPrescriptions: pendingPrescriptionsRes.count || 0,
      },
      recentProviders: recentProvidersRes.data || [],
      recentPatients: recentPatientsRes.data || [],
      recentAppointments: recentAppointmentsRes.data || [],
      appointmentStatuses: appointmentStatusRes.data || [],
      pendingActions: [
        ...(pendingProviderCount > 0
          ? [{ title: 'Pending Provider Applications', count: pendingProviderCount, priority: 'high', link: '/dashboard/admin/provider-applications' }]
          : []),
        ...(pendingPharmacyCount > 0
          ? [{ title: 'Pending Pharmacy Applications', count: pendingPharmacyCount, priority: 'high', link: '/dashboard/admin/pharmacies' }]
          : []),
      ],
    };
  }

  async getUsers() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, email, phone, phone_number, role, profile_completed, created_at, city, province, date_of_birth, gender, profile_photo_url, user_roles(role, is_active)')
      .order('created_at', { ascending: false });

    return { data, error };
  }

  async getProviders() {
    const { data, error } = await supabase
      .from('providers')
      .select('*, user_profiles(first_name, last_name, email)')
      .order('created_at', { ascending: false });

    return { data, error };
  }

  async getPharmacies() {
    const { data, error } = await supabase
      .from('pharmacies')
      .select('*, user_profiles(first_name, last_name, email)')
      .order('created_at', { ascending: false });

    return { data, error };
  }

  async deleteUser(userId: string, actorId?: string) {
    const { error } = await supabase.from('user_profiles').delete().eq('id', userId);
    if (!error) {
      try {
        await blockchainAuditService.logEvent({
          eventType: 'admin_user_deleted',
          resourceType: 'user_profile',
          resourceId: userId,
          actorId,
          actorRole: 'admin',
          actionData: { action: 'delete_user', target_user_id: userId },
        });
      } catch {}
    }
    return { error };
  }

  async updateUser(userId: string, updates: { first_name?: string; last_name?: string; phone_number?: string; role?: string; profile_completed?: boolean }, actorId?: string) {
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);
    if (!error) {
      try {
        await blockchainAuditService.logEvent({
          eventType: 'admin_user_updated',
          resourceType: 'user_profile',
          resourceId: userId,
          actorId,
          actorRole: 'admin',
          actionData: { action: 'edit_user', changes: updates },
        });
      } catch {}
    }
    return { error };
  }

  async toggleUserStatus(userId: string, currentStatus: boolean, actorId?: string) {
    return this.updateUser(userId, { profile_completed: !currentStatus }, actorId);
  }

  async verifyProvider(providerId: string, actorId?: string) {
    const { error } = await supabase
      .from('providers')
      .update({ is_verified: true, verification_date: new Date().toISOString() })
      .eq('id', providerId);
    if (!error) {
      try {
        await blockchainAuditService.logEvent({
          eventType: 'admin_provider_verified',
          resourceType: 'provider',
          resourceId: providerId,
          actorId,
          actorRole: 'admin',
          actionData: { action: 'verify_provider' },
        });
      } catch {}
    }
    return { error };
  }

  async verifyPharmacy(pharmacyId: string, actorId?: string) {
    const { error } = await supabase
      .from('pharmacies')
      .update({ is_verified: true })
      .eq('id', pharmacyId);
    if (!error) {
      try {
        await blockchainAuditService.logEvent({
          eventType: 'admin_pharmacy_verified',
          resourceType: 'pharmacy',
          resourceId: pharmacyId,
          actorId,
          actorRole: 'admin',
          actionData: { action: 'verify_pharmacy' },
        });
      } catch {}
    }
    return { error };
  }

  // Dashboard Stats
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
