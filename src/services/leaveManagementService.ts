import { supabase } from '../lib/supabase';

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  description?: string;
  days_per_year: number;
  is_paid: boolean;
  requires_approval: boolean;
  max_consecutive_days?: number;
  can_carry_forward: boolean;
  carry_forward_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalance {
  id: string;
  user_id: string;
  leave_type_id: string;
  year: number;
  total_days: number;
  used_days: number;
  pending_days: number;
  available_days: number;
  carried_forward: number;
  created_at: string;
  updated_at: string;
  leave_type?: LeaveType;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approver_id?: string;
  approval_notes?: string;
  approved_at?: string;
  attachments: any[];
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    employee_id?: string;
  };
  leave_type?: LeaveType;
  approver?: {
    id: string;
    full_name: string;
  };
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'public' | 'optional' | 'restricted';
  description?: string;
  is_recurring: boolean;
  applicable_locations: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const leaveManagementService = {
  async getAllLeaveTypes(includeInactive = false) {
    let query = supabase
      .from('leave_types')
      .select('*')
      .order('name');

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as LeaveType[];
  },

  async createLeaveType(leaveType: Partial<LeaveType>) {
    const { data, error } = await supabase
      .from('leave_types')
      .insert(leaveType)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateLeaveType(id: string, updates: Partial<LeaveType>) {
    const { data, error } = await supabase
      .from('leave_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteLeaveType(id: string) {
    const { error } = await supabase
      .from('leave_types')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getLeaveBalances(userId: string, year?: number) {
    const currentYear = year || new Date().getFullYear();

    const { data, error } = await supabase
      .from('leave_balances')
      .select(`
        *,
        leave_type:leave_types(*)
      `)
      .eq('user_id', userId)
      .eq('year', currentYear);

    if (error) throw error;
    return data as LeaveBalance[];
  },

  async initializeLeaveBalances(userId: string, year?: number) {
    const currentYear = year || new Date().getFullYear();

    const leaveTypes = await this.getAllLeaveTypes();

    const balances = leaveTypes.map(lt => ({
      user_id: userId,
      leave_type_id: lt.id,
      year: currentYear,
      total_days: lt.days_per_year,
      used_days: 0,
      pending_days: 0,
      available_days: lt.days_per_year,
      carried_forward: 0,
    }));

    const { data, error } = await supabase
      .from('leave_balances')
      .insert(balances)
      .select();

    if (error) throw error;
    return data;
  },

  async updateLeaveBalance(id: string, updates: Partial<LeaveBalance>) {
    const { data, error } = await supabase
      .from('leave_balances')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getLeaveRequests(filters?: {
    userId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        user:user_profiles!leave_requests_user_id_fkey(id, full_name, email, employee_id),
        leave_type:leave_types(*),
        approver:user_profiles!leave_requests_approver_id_fkey(id, full_name)
      `)
      .order('created_at', { ascending: false });

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.startDate) {
      query = query.gte('start_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('end_date', filters.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as LeaveRequest[];
  },

  async getLeaveRequestById(id: string) {
    const { data, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        user:user_profiles!leave_requests_user_id_fkey(id, full_name, email, employee_id),
        leave_type:leave_types(*),
        approver:user_profiles!leave_requests_approver_id_fkey(id, full_name)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as LeaveRequest | null;
  },

  async createLeaveRequest(request: Partial<LeaveRequest>) {
    const startDate = new Date(request.start_date!);
    const endDate = new Date(request.end_date!);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const balances = await this.getLeaveBalances(request.user_id!);
    const balance = balances.find(b => b.leave_type_id === request.leave_type_id);

    if (!balance || balance.available_days < totalDays) {
      throw new Error('Insufficient leave balance');
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        ...request,
        total_days: totalDays,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateLeaveRequest(id: string, updates: Partial<LeaveRequest>) {
    const { data, error } = await supabase
      .from('leave_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async approveLeaveRequest(id: string, approverId: string, notes?: string) {
    const { data, error } = await supabase
      .from('leave_requests')
      .update({
        status: 'approved',
        approver_id: approverId,
        approval_notes: notes,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async rejectLeaveRequest(id: string, approverId: string, notes?: string) {
    const { data, error } = await supabase
      .from('leave_requests')
      .update({
        status: 'rejected',
        approver_id: approverId,
        approval_notes: notes,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async cancelLeaveRequest(id: string) {
    const { data, error } = await supabase
      .from('leave_requests')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAllHolidays(year?: number) {
    let query = supabase
      .from('holidays')
      .select('*')
      .eq('is_active', true)
      .order('date');

    if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Holiday[];
  },

  async createHoliday(holiday: Partial<Holiday>) {
    const { data, error } = await supabase
      .from('holidays')
      .insert(holiday)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateHoliday(id: string, updates: Partial<Holiday>) {
    const { data, error } = await supabase
      .from('holidays')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteHoliday(id: string) {
    const { error } = await supabase
      .from('holidays')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getPendingLeaveRequestsCount(userId?: string) {
    let query = supabase
      .from('leave_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  },

  async getUpcomingLeaves(userId?: string, days: number = 30) {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const future = futureDate.toISOString().split('T')[0];

    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        user:user_profiles!leave_requests_user_id_fkey(id, full_name, email),
        leave_type:leave_types(*)
      `)
      .eq('status', 'approved')
      .gte('start_date', today)
      .lte('start_date', future)
      .order('start_date');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as LeaveRequest[];
  },
};
