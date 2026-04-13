import { supabase } from '../lib/supabase';
import { attendanceService } from './attendanceService';
import { leaveManagementService } from './leaveManagementService';
import { payrollService } from './payrollService';

export interface HRMDashboardStats {
  total_employees: number;
  present_today: number;
  on_leave_today: number;
  pending_leave_requests: number;
  new_hires_this_month: number;
  attendance_rate: number;
  average_work_hours: number;
  total_payroll_this_month: number;
}

export interface AttendanceReport {
  employee_id: string;
  employee_name: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  leave_days: number;
  attendance_percentage: number;
  total_work_hours: number;
  average_work_hours: number;
}

export interface LeaveReport {
  employee_id: string;
  employee_name: string;
  leave_type: string;
  total_allocated: number;
  used: number;
  pending: number;
  available: number;
  utilization_percentage: number;
}

export interface PayrollReport {
  employee_id: string;
  employee_name: string;
  department: string;
  designation: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  overtime_pay: number;
  bonuses: number;
  gross_salary: number;
  net_salary: number;
}

export const hrmReportsService = {
  async getDashboardStats(): Promise<HRMDashboardStats> {
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0];

    const { data: totalEmployees } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .in('role', ['staff', 'provider', 'admin']);

    const { data: todayAttendance } = await supabase
      .from('staff_attendance')
      .select('status')
      .eq('date', today);

    const presentToday = todayAttendance?.filter(a =>
      a.status === 'present' || a.status === 'late'
    ).length || 0;

    const onLeaveToday = todayAttendance?.filter(a => a.status === 'on_leave').length || 0;

    const pendingLeaves = await leaveManagementService.getPendingLeaveRequestsCount();

    const { data: newHires } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .gte('join_date', firstOfMonth);

    const { data: monthAttendance } = await supabase
      .from('staff_attendance')
      .select('status, work_hours')
      .gte('date', firstOfMonth)
      .lte('date', today);

    const totalWorkDays = monthAttendance?.length || 0;
    const presentDays = monthAttendance?.filter(a =>
      a.status === 'present' || a.status === 'late'
    ).length || 0;
    const attendanceRate = totalWorkDays > 0 ? (presentDays / totalWorkDays) * 100 : 0;

    const totalWorkHours = monthAttendance?.reduce((sum, a) => sum + (a.work_hours || 0), 0) || 0;
    const avgWorkHours = totalWorkDays > 0 ? totalWorkHours / totalWorkDays : 0;

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const payrollSummary = await payrollService.getPayrollSummary(currentMonth, currentYear);

    return {
      total_employees: totalEmployees?.length || 0,
      present_today: presentToday,
      on_leave_today: onLeaveToday,
      pending_leave_requests: pendingLeaves,
      new_hires_this_month: newHires?.length || 0,
      attendance_rate: Math.round(attendanceRate),
      average_work_hours: Math.round(avgWorkHours * 10) / 10,
      total_payroll_this_month: payrollSummary.total_net_salary,
    };
  },

  async getAttendanceReport(
    startDate: string,
    endDate: string,
    departmentId?: string
  ): Promise<AttendanceReport[]> {
    let query = supabase
      .from('user_profiles')
      .select('id, full_name, employee_id, department_id')
      .in('role', ['staff', 'provider', 'admin']);

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }

    const { data: employees, error } = await query;
    if (error) throw error;

    const reports: AttendanceReport[] = [];

    for (const employee of employees || []) {
      const attendance = await attendanceService.getAttendanceByDateRange(
        startDate,
        endDate,
        employee.id
      );

      const totalDays = attendance.length;
      const presentDays = attendance.filter(a =>
        a.status === 'present' || a.status === 'late'
      ).length;
      const absentDays = attendance.filter(a => a.status === 'absent').length;
      const lateDays = attendance.filter(a => a.status === 'late').length;
      const leaveDays = attendance.filter(a => a.status === 'on_leave').length;
      const totalWorkHours = attendance.reduce((sum, a) => sum + (a.work_hours || 0), 0);

      const attendancePercentage = totalDays > 0
        ? (presentDays / totalDays) * 100
        : 0;

      const avgWorkHours = presentDays > 0
        ? totalWorkHours / presentDays
        : 0;

      reports.push({
        employee_id: employee.employee_id || employee.id,
        employee_name: employee.full_name,
        total_days: totalDays,
        present_days: presentDays,
        absent_days: absentDays,
        late_days: lateDays,
        leave_days: leaveDays,
        attendance_percentage: Math.round(attendancePercentage * 10) / 10,
        total_work_hours: Math.round(totalWorkHours * 10) / 10,
        average_work_hours: Math.round(avgWorkHours * 10) / 10,
      });
    }

    return reports.sort((a, b) => b.attendance_percentage - a.attendance_percentage);
  },

  async getLeaveReport(year?: number): Promise<LeaveReport[]> {
    const currentYear = year || new Date().getFullYear();

    const { data: employees, error: empError } = await supabase
      .from('user_profiles')
      .select('id, full_name, employee_id')
      .in('role', ['staff', 'provider', 'admin']);

    if (empError) throw empError;

    const { data: leaveTypes, error: ltError } = await supabase
      .from('leave_types')
      .select('*')
      .eq('is_active', true);

    if (ltError) throw ltError;

    const reports: LeaveReport[] = [];

    for (const employee of employees || []) {
      const balances = await leaveManagementService.getLeaveBalances(employee.id, currentYear);

      for (const balance of balances) {
        const leaveType = leaveTypes?.find(lt => lt.id === balance.leave_type_id);
        if (!leaveType) continue;

        const utilizationPercentage = balance.total_days > 0
          ? (balance.used_days / balance.total_days) * 100
          : 0;

        reports.push({
          employee_id: employee.employee_id || employee.id,
          employee_name: employee.full_name,
          leave_type: leaveType.name,
          total_allocated: balance.total_days,
          used: balance.used_days,
          pending: balance.pending_days,
          available: balance.available_days,
          utilization_percentage: Math.round(utilizationPercentage * 10) / 10,
        });
      }
    }

    return reports;
  },

  async getPayrollReport(month: number, year: number): Promise<PayrollReport[]> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const payslips = await payrollService.getPayslips({
      startDate,
      endDate,
      status: 'paid',
    });

    const { data: employees, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        full_name,
        employee_id,
        department:departments(name),
        designation:designations(title)
      `)
      .in('id', payslips.map(p => p.user_id));

    if (error) throw error;

    const reports: PayrollReport[] = payslips.map(payslip => {
      const employee = employees?.find(e => e.id === payslip.user_id);

      const allowancesTotal = Object.values(payslip.allowances).reduce(
        (sum, val) => sum + val,
        0
      );
      const bonusesTotal = Object.values(payslip.bonuses).reduce(
        (sum, val) => sum + val,
        0
      );

      return {
        employee_id: employee?.employee_id || payslip.user_id,
        employee_name: employee?.full_name || 'Unknown',
        department: (employee?.department as any)?.name || 'N/A',
        designation: (employee?.designation as any)?.title || 'N/A',
        base_salary: payslip.base_salary,
        allowances: allowancesTotal,
        deductions: payslip.total_deductions,
        overtime_pay: payslip.overtime_pay,
        bonuses: bonusesTotal,
        gross_salary: payslip.gross_salary,
        net_salary: payslip.net_salary,
      };
    });

    return reports;
  },

  async getHeadcountReport() {
    const { data: employees, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        role,
        employment_type,
        department:departments(name),
        designation:designations(title, level)
      `)
      .in('role', ['staff', 'provider', 'admin']);

    if (error) throw error;

    const byRole: Record<string, number> = {};
    const byDepartment: Record<string, number> = {};
    const byEmploymentType: Record<string, number> = {};
    const byLevel: Record<string, number> = {};

    employees?.forEach(emp => {
      byRole[emp.role] = (byRole[emp.role] || 0) + 1;

      const dept = (emp.department as any)?.name || 'Unassigned';
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;

      if (emp.employment_type) {
        byEmploymentType[emp.employment_type] = (byEmploymentType[emp.employment_type] || 0) + 1;
      }

      const level = (emp.designation as any)?.level || 'unassigned';
      byLevel[level] = (byLevel[level] || 0) + 1;
    });

    return {
      total: employees?.length || 0,
      by_role: byRole,
      by_department: byDepartment,
      by_employment_type: byEmploymentType,
      by_level: byLevel,
    };
  },

  async getTurnoverReport(months: number = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data: newHires, error: hiresError } = await supabase
      .from('user_profiles')
      .select('id, join_date')
      .gte('join_date', startDate.toISOString().split('T')[0])
      .in('role', ['staff', 'provider', 'admin']);

    if (hiresError) throw hiresError;

    const { data: totalEmployees } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .in('role', ['staff', 'provider', 'admin']);

    const hiresByMonth: Record<string, number> = {};
    newHires?.forEach(hire => {
      const month = hire.join_date?.substring(0, 7) || 'unknown';
      hiresByMonth[month] = (hiresByMonth[month] || 0) + 1;
    });

    return {
      total_employees: totalEmployees?.length || 0,
      new_hires: newHires?.length || 0,
      hires_by_month: hiresByMonth,
      hire_rate: totalEmployees?.length
        ? ((newHires?.length || 0) / totalEmployees.length) * 100
        : 0,
    };
  },

  async exportAttendanceReport(startDate: string, endDate: string) {
    const report = await this.getAttendanceReport(startDate, endDate);

    const csv = [
      ['Employee ID', 'Employee Name', 'Total Days', 'Present', 'Absent', 'Late', 'Leave', 'Attendance %', 'Total Hours', 'Avg Hours'],
      ...report.map(r => [
        r.employee_id,
        r.employee_name,
        r.total_days,
        r.present_days,
        r.absent_days,
        r.late_days,
        r.leave_days,
        r.attendance_percentage,
        r.total_work_hours,
        r.average_work_hours,
      ])
    ];

    return csv.map(row => row.join(',')).join('\n');
  },

  async exportPayrollReport(month: number, year: number) {
    const report = await this.getPayrollReport(month, year);

    const csv = [
      ['Employee ID', 'Employee Name', 'Department', 'Designation', 'Base Salary', 'Allowances', 'Deductions', 'Overtime', 'Bonuses', 'Gross Salary', 'Net Salary'],
      ...report.map(r => [
        r.employee_id,
        r.employee_name,
        r.department,
        r.designation,
        r.base_salary,
        r.allowances,
        r.deductions,
        r.overtime_pay,
        r.bonuses,
        r.gross_salary,
        r.net_salary,
      ])
    ];

    return csv.map(row => row.join(',')).join('\n');
  },
};
