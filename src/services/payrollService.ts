import { supabase } from '../lib/supabase';

export interface SalaryStructure {
  id: string;
  user_id: string;
  designation_id?: string;
  base_salary: number;
  currency: string;
  pay_frequency: 'monthly' | 'bi_weekly' | 'weekly';
  allowances: Record<string, number>;
  deductions: Record<string, number>;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    employee_id?: string;
  };
  designation?: {
    id: string;
    title: string;
  };
}

export interface Payslip {
  id: string;
  user_id: string;
  salary_structure_id?: string;
  pay_period_start: string;
  pay_period_end: string;
  base_salary: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  allowances: Record<string, number>;
  deductions: Record<string, number>;
  bonuses: Record<string, number>;
  overtime_pay: number;
  status: 'draft' | 'approved' | 'paid' | 'cancelled';
  payment_date?: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    employee_id?: string;
  };
}

export interface PayrollSummary {
  total_employees: number;
  total_gross_salary: number;
  total_deductions: number;
  total_net_salary: number;
  total_overtime: number;
  total_bonuses: number;
  by_department: Array<{
    department: string;
    count: number;
    total: number;
  }>;
}

export const payrollService = {
  async getSalaryStructures(userId?: string, includeInactive = false) {
    let query = supabase
      .from('salary_structures')
      .select(`
        *,
        user:user_profiles(id, full_name, email, employee_id),
        designation:designations(id, title)
      `)
      .order('effective_from', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as SalaryStructure[];
  },

  async getSalaryStructureById(id: string) {
    const { data, error } = await supabase
      .from('salary_structures')
      .select(`
        *,
        user:user_profiles(id, full_name, email, employee_id),
        designation:designations(id, title)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as SalaryStructure | null;
  },

  async getActiveSalaryStructure(userId: string) {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('salary_structures')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .lte('effective_from', today)
      .or(`effective_to.is.null,effective_to.gte.${today}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as SalaryStructure | null;
  },

  async createSalaryStructure(structure: Partial<SalaryStructure>) {
    const { data: existingActive } = await supabase
      .from('salary_structures')
      .select('id')
      .eq('user_id', structure.user_id!)
      .eq('is_active', true)
      .maybeSingle();

    if (existingActive) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await supabase
        .from('salary_structures')
        .update({
          effective_to: yesterday.toISOString().split('T')[0],
          is_active: false,
        })
        .eq('id', existingActive.id);
    }

    const { data, error } = await supabase
      .from('salary_structures')
      .insert(structure)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSalaryStructure(id: string, updates: Partial<SalaryStructure>) {
    const { data, error } = await supabase
      .from('salary_structures')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSalaryStructure(id: string) {
    const { error } = await supabase
      .from('salary_structures')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getPayslips(filters?: {
    userId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    let query = supabase
      .from('payslips')
      .select(`
        *,
        user:user_profiles(id, full_name, email, employee_id)
      `)
      .order('pay_period_end', { ascending: false });

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.startDate) {
      query = query.gte('pay_period_start', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('pay_period_end', filters.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Payslip[];
  },

  async getPayslipById(id: string) {
    const { data, error } = await supabase
      .from('payslips')
      .select(`
        *,
        user:user_profiles(id, full_name, email, employee_id)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as Payslip | null;
  },

  async generatePayslip(
    userId: string,
    payPeriodStart: string,
    payPeriodEnd: string,
    overtimeHours: number = 0,
    bonuses: Record<string, number> = {}
  ) {
    const salaryStructure = await this.getActiveSalaryStructure(userId);
    if (!salaryStructure) {
      throw new Error('No active salary structure found for user');
    }

    const baseSalary = salaryStructure.base_salary;
    const allowancesTotal = Object.values(salaryStructure.allowances).reduce((sum, val) => sum + val, 0);
    const deductionsTotal = Object.values(salaryStructure.deductions).reduce((sum, val) => sum + val, 0);
    const bonusesTotal = Object.values(bonuses).reduce((sum, val) => sum + val, 0);

    const hourlyRate = baseSalary / 160;
    const overtimePay = overtimeHours * hourlyRate * 1.5;

    const grossSalary = baseSalary + allowancesTotal + overtimePay + bonusesTotal;
    const netSalary = grossSalary - deductionsTotal;

    const { data, error } = await supabase
      .from('payslips')
      .insert({
        user_id: userId,
        salary_structure_id: salaryStructure.id,
        pay_period_start: payPeriodStart,
        pay_period_end: payPeriodEnd,
        base_salary: baseSalary,
        gross_salary: grossSalary,
        total_deductions: deductionsTotal,
        net_salary: netSalary,
        allowances: salaryStructure.allowances,
        deductions: salaryStructure.deductions,
        bonuses,
        overtime_pay: overtimePay,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePayslip(id: string, updates: Partial<Payslip>) {
    const { data, error } = await supabase
      .from('payslips')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async approvePayslip(id: string) {
    const { data, error } = await supabase
      .from('payslips')
      .update({ status: 'approved' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markPayslipAsPaid(id: string, paymentDate: string, paymentMethod: string) {
    const { data, error } = await supabase
      .from('payslips')
      .update({
        status: 'paid',
        payment_date: paymentDate,
        payment_method: paymentMethod,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletePayslip(id: string) {
    const { error } = await supabase
      .from('payslips')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async bulkGeneratePayslips(month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const payPeriodStart = startDate.toISOString().split('T')[0];
    const payPeriodEnd = endDate.toISOString().split('T')[0];

    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id')
      .in('role', ['staff', 'provider', 'admin']);

    if (usersError) throw usersError;

    const payslips: Payslip[] = [];

    for (const user of users || []) {
      try {
        const { data: attendance } = await supabase
          .from('staff_attendance')
          .select('overtime_hours')
          .eq('user_id', user.id)
          .gte('date', payPeriodStart)
          .lte('date', payPeriodEnd);

        const totalOvertime = attendance?.reduce((sum, a) => sum + (a.overtime_hours || 0), 0) || 0;

        const payslip = await this.generatePayslip(
          user.id,
          payPeriodStart,
          payPeriodEnd,
          totalOvertime
        );

        payslips.push(payslip);
      } catch (error) {
        console.error(`Error generating payslip for user ${user.id}:`, error);
      }
    }

    return payslips;
  },

  async getPayrollSummary(month: number, year: number): Promise<PayrollSummary> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const payslips = await this.getPayslips({
      startDate,
      endDate,
      status: 'approved',
    });

    const summary: PayrollSummary = {
      total_employees: payslips.length,
      total_gross_salary: payslips.reduce((sum, p) => sum + p.gross_salary, 0),
      total_deductions: payslips.reduce((sum, p) => sum + p.total_deductions, 0),
      total_net_salary: payslips.reduce((sum, p) => sum + p.net_salary, 0),
      total_overtime: payslips.reduce((sum, p) => sum + p.overtime_pay, 0),
      total_bonuses: payslips.reduce((sum, p) => {
        return sum + Object.values(p.bonuses).reduce((s, v) => s + v, 0);
      }, 0),
      by_department: [],
    };

    return summary;
  },

  async calculateTotalCost(userId: string, months: number = 12) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const payslips = await this.getPayslips({
      userId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });

    return {
      total_paid: payslips
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.net_salary, 0),
      average_monthly: payslips.length > 0
        ? payslips.reduce((sum, p) => sum + p.net_salary, 0) / payslips.length
        : 0,
    };
  },
};
