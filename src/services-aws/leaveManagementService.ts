import { api } from '../lib/api-client';

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
    const params: Record<string, any> = {};
    if (!includeInactive) {
      params.is_active = true;
    }

    const { data, error } = await api.get<LeaveType[]>('/leave-types', { params });
    if (error) throw error;
    return data as LeaveType[];
  },

  async createLeaveType(leaveType: Partial<LeaveType>) {
    const { data, error } = await api.post<LeaveType>('/leave-types', leaveType);
    if (error) throw error;
    return data;
  },

  async updateLeaveType(id: string, updates: Partial<LeaveType>) {
    const { data, error } = await api.put<LeaveType>(`/leave-types/${id}`, updates);
    if (error) throw error;
    return data;
  },

  async deleteLeaveType(id: string) {
    const { error } = await api.delete(`/leave-types/${id}`);
    if (error) throw error;
  },

  async getLeaveBalances(userId: string, year?: number) {
    const currentYear = year || new Date().getFullYear();

    const { data, error } = await api.get<LeaveBalance[]>('/leave-balances', {
      params: { user_id: userId, year: currentYear },
    });

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

    const { data, error } = await api.post<LeaveBalance[]>('/leave-balances/bulk', balances);

    if (error) throw error;
    return data;
  },

  async updateLeaveBalance(id: string, updates: Partial<LeaveBalance>) {
    const { data, error } = await api.put<LeaveBalance>(`/leave-balances/${id}`, updates);
    if (error) throw error;
    return data;
  },

  async getLeaveRequests(filters?: {
    userId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const params: Record<string, any> = {};

    if (filters?.userId) {
      params.user_id = filters.userId;
    }

    if (filters?.status) {
      params.status = filters.status;
    }

    if (filters?.startDate) {
      params.start_date = filters.startDate;
    }

    if (filters?.endDate) {
      params.end_date = filters.endDate;
    }

    const { data, error } = await api.get<LeaveRequest[]>('/leave-requests', { params });
    if (error) throw error;
    return data as LeaveRequest[];
  },

  async getLeaveRequestById(id: string) {
    const { data, error } = await api.get<LeaveRequest>(`/leave-requests/${id}`);
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

    const { data, error } = await api.post<LeaveRequest>('/leave-requests', {
      ...request,
      total_days: totalDays,
      status: 'pending',
    });

    if (error) throw error;
    return data;
  },

  async updateLeaveRequest(id: string, updates: Partial<LeaveRequest>) {
    const { data, error } = await api.put<LeaveRequest>(`/leave-requests/${id}`, updates);
    if (error) throw error;
    return data;
  },

  async approveLeaveRequest(id: string, approverId: string, notes?: string) {
    const { data, error } = await api.put<LeaveRequest>(`/leave-requests/${id}`, {
      status: 'approved',
      approver_id: approverId,
      approval_notes: notes,
      approved_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data;
  },

  async rejectLeaveRequest(id: string, approverId: string, notes?: string) {
    const { data, error } = await api.put<LeaveRequest>(`/leave-requests/${id}`, {
      status: 'rejected',
      approver_id: approverId,
      approval_notes: notes,
      approved_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data;
  },

  async cancelLeaveRequest(id: string) {
    const { data, error } = await api.put<LeaveRequest>(`/leave-requests/${id}`, { status: 'cancelled' });
    if (error) throw error;
    return data;
  },

  async getAllHolidays(year?: number) {
    const params: Record<string, any> = { is_active: true };

    if (year) {
      params.year = year;
    }

    const { data, error } = await api.get<Holiday[]>('/holidays', { params });
    if (error) throw error;
    return data as Holiday[];
  },

  async createHoliday(holiday: Partial<Holiday>) {
    const { data, error } = await api.post<Holiday>('/holidays', holiday);
    if (error) throw error;
    return data;
  },

  async updateHoliday(id: string, updates: Partial<Holiday>) {
    const { data, error } = await api.put<Holiday>(`/holidays/${id}`, updates);
    if (error) throw error;
    return data;
  },

  async deleteHoliday(id: string) {
    const { error } = await api.delete(`/holidays/${id}`);
    if (error) throw error;
  },

  async getPendingLeaveRequestsCount(userId?: string) {
    const params: Record<string, any> = { status: 'pending', count_only: true };

    if (userId) {
      params.user_id = userId;
    }

    const { data, error } = await api.get<{ count: number }>('/leave-requests/count', { params });
    if (error) throw error;
    return data?.count || 0;
  },

  async getUpcomingLeaves(userId?: string, days: number = 30) {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const future = futureDate.toISOString().split('T')[0];

    const params: Record<string, any> = {
      status: 'approved',
      start_date_from: today,
      start_date_to: future,
    };

    if (userId) {
      params.user_id = userId;
    }

    const { data, error } = await api.get<LeaveRequest[]>('/leave-requests', { params });
    if (error) throw error;
    return data as LeaveRequest[];
  },
};
