import { supabase } from '../lib/supabase';

export interface StaffAttendance {
  id: string;
  user_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: 'present' | 'absent' | 'half_day' | 'late' | 'on_leave' | 'holiday';
  work_hours: number;
  overtime_hours: number;
  notes?: string;
  location?: string;
  ip_address?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    employee_id?: string;
  };
}

export interface AttendanceSummary {
  user_id: string;
  user_name: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  half_days: number;
  late_days: number;
  leave_days: number;
  total_hours: number;
  overtime_hours: number;
}

export const attendanceService = {
  async getAttendanceByDateRange(startDate: string, endDate: string, userId?: string) {
    let query = supabase
      .from('staff_attendance')
      .select(`
        *,
        user:user_profiles(id, full_name, email, employee_id)
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as StaffAttendance[];
  },

  async getAttendanceByDate(date: string) {
    const { data, error } = await supabase
      .from('staff_attendance')
      .select(`
        *,
        user:user_profiles(id, full_name, email, employee_id)
      `)
      .eq('date', date)
      .order('check_in', { ascending: true });

    if (error) throw error;
    return data as StaffAttendance[];
  },

  async getUserAttendanceByDate(userId: string, date: string) {
    const { data, error } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    if (error) throw error;
    return data as StaffAttendance | null;
  },

  async checkIn(userId: string, location?: string, ipAddress?: string) {
    const today = new Date().toISOString().split('T')[0];

    const existing = await this.getUserAttendanceByDate(userId, today);
    if (existing) {
      throw new Error('Already checked in for today');
    }

    const checkInTime = new Date();
    const workStartTime = new Date();
    workStartTime.setHours(9, 0, 0, 0);

    const isLate = checkInTime > workStartTime;

    const { data, error } = await supabase
      .from('staff_attendance')
      .insert({
        user_id: userId,
        date: today,
        check_in: checkInTime.toISOString(),
        status: isLate ? 'late' : 'present',
        location,
        ip_address: ipAddress,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async checkOut(userId: string) {
    const today = new Date().toISOString().split('T')[0];

    const attendance = await this.getUserAttendanceByDate(userId, today);
    if (!attendance) {
      throw new Error('No check-in record found for today');
    }

    if (attendance.check_out) {
      throw new Error('Already checked out for today');
    }

    const checkOutTime = new Date();
    const checkInTime = new Date(attendance.check_in!);
    const workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

    const regularHours = 8;
    const overtimeHours = workHours > regularHours ? workHours - regularHours : 0;

    const { data, error } = await supabase
      .from('staff_attendance')
      .update({
        check_out: checkOutTime.toISOString(),
        work_hours: workHours,
        overtime_hours: overtimeHours,
      })
      .eq('id', attendance.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markAttendance(record: Partial<StaffAttendance>) {
    const { data, error } = await supabase
      .from('staff_attendance')
      .insert({
        user_id: record.user_id,
        date: record.date,
        check_in: record.check_in,
        check_out: record.check_out,
        status: record.status,
        work_hours: record.work_hours || 0,
        overtime_hours: record.overtime_hours || 0,
        notes: record.notes,
        location: record.location,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAttendance(id: string, updates: Partial<StaffAttendance>) {
    const { data, error } = await supabase
      .from('staff_attendance')
      .update({
        check_in: updates.check_in,
        check_out: updates.check_out,
        status: updates.status,
        work_hours: updates.work_hours,
        overtime_hours: updates.overtime_hours,
        notes: updates.notes,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAttendance(id: string) {
    const { error } = await supabase
      .from('staff_attendance')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getAttendanceSummary(userId: string, month: number, year: number): Promise<AttendanceSummary> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const records = await this.getAttendanceByDateRange(startDate, endDate, userId);

    const summary: AttendanceSummary = {
      user_id: userId,
      user_name: records[0]?.user?.full_name || '',
      total_days: records.length,
      present_days: records.filter(r => r.status === 'present' || r.status === 'late').length,
      absent_days: records.filter(r => r.status === 'absent').length,
      half_days: records.filter(r => r.status === 'half_day').length,
      late_days: records.filter(r => r.status === 'late').length,
      leave_days: records.filter(r => r.status === 'on_leave').length,
      total_hours: records.reduce((sum, r) => sum + (r.work_hours || 0), 0),
      overtime_hours: records.reduce((sum, r) => sum + (r.overtime_hours || 0), 0),
    };

    return summary;
  },

  async getTeamAttendanceSummary(startDate: string, endDate: string): Promise<AttendanceSummary[]> {
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('role', ['staff', 'provider', 'admin']);

    if (usersError) throw usersError;

    const summaries: AttendanceSummary[] = [];

    for (const user of users || []) {
      const records = await this.getAttendanceByDateRange(startDate, endDate, user.id);

      summaries.push({
        user_id: user.id,
        user_name: user.full_name,
        total_days: records.length,
        present_days: records.filter(r => r.status === 'present' || r.status === 'late').length,
        absent_days: records.filter(r => r.status === 'absent').length,
        half_days: records.filter(r => r.status === 'half_day').length,
        late_days: records.filter(r => r.status === 'late').length,
        leave_days: records.filter(r => r.status === 'on_leave').length,
        total_hours: records.reduce((sum, r) => sum + (r.work_hours || 0), 0),
        overtime_hours: records.reduce((sum, r) => sum + (r.overtime_hours || 0), 0),
      });
    }

    return summaries;
  },

  async bulkMarkAttendance(records: Partial<StaffAttendance>[]) {
    const { data, error } = await supabase
      .from('staff_attendance')
      .insert(records)
      .select();

    if (error) throw error;
    return data;
  },
};
