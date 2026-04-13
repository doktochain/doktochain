import { api } from '../lib/api-client';

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
    const params: Record<string, any> = {};

    if (userId) {
      params.user_id = userId;
    }

    if (!includeInactive) {
      params.is_active = true;
    }

    const { data, error } = await api.get<SalaryStructure[]>('/salary-structures', { params });
    if (error) throw error;
    return data as SalaryStructure[];
  },

  async getSalaryStructureById(id: string) {
    const { data, error } = await api.get<SalaryStructure>(`/salary-structures/${id}`);
    if (error) throw error;
    return data as SalaryStructure | null;
  },

  async getActiveSalaryStructure(userId: string) {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await api.get<SalaryStructure>('/salary-structures/active', {
      params: { user_id: userId, as_of: today },
    });

    if (error) throw error;
    return data as SalaryStructure | null;
  },

  async createSalaryStructure(structure: Partial<SalaryStructure>) {
    const { data: existingActive } = await api.get<SalaryStructure>('/salary-structures/active', {
      params: { user_id: structure.user_id! },
    });

    if (existingActive) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await api.put(`/salary-structures/${existingActive.id}`, {
        effective_to: yesterday.toISOString().split('T')[0],
        is_active: false,
      });
    }

    const { data, error } = await api.post<SalaryStructure>('/salary-structures', structure);

    if (error) throw error;
    return data;
  },

  async updateSalaryStructure(id: string, updates: Partial<SalaryStructure>) {
    const { data, error } = await api.put<SalaryStructure>(`/salary-structures/${id}`, updates);
    if (error) throw error;
    return data;
  },

  async deleteSalaryStructure(id: string) {
    const { error } = await api.delete(`/salary-structures/${id}`);
    if (error) throw error;
  },

  async getPayslips(filters?: {
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

    const { data, error } = await api.get<Payslip[]>('/payslips', { params });
    if (error) throw error;
    return data as Payslip[];
  },

  async getPayslipById(id: string) {
    const { data, error } = await api.get<Payslip>(`/payslips/${id}`);
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

    const { data, error } = await api.post<Payslip>('/payslips', {
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
    });

    if (error) throw error;
    return data;
  },

  async updatePayslip(id: string, updates: Partial<Payslip>) {
    const { data, error } = await api.put<Payslip>(`/payslips/${id}`, updates);
    if (error) throw error;
    return data;
  },

  async approvePayslip(id: string) {
    const { data, error } = await api.put<Payslip>(`/payslips/${id}`, { status: 'approved' });
    if (error) throw error;
    return data;
  },

  async markPayslipAsPaid(id: string, paymentDate: string, paymentMethod: string) {
    const { data, error } = await api.put<Payslip>(`/payslips/${id}`, {
      status: 'paid',
      payment_date: paymentDate,
      payment_method: paymentMethod,
    });

    if (error) throw error;
    return data;
  },

  async deletePayslip(id: string) {
    const { error } = await api.delete(`/payslips/${id}`);
    if (error) throw error;
  },

  async bulkGeneratePayslips(month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const payPeriodStart = startDate.toISOString().split('T')[0];
    const payPeriodEnd = endDate.toISOString().split('T')[0];

    const { data: users, error: usersError } = await api.get<any[]>('/user-profiles', {
      params: { role: ['staff', 'provider', 'admin'] },
    });

    if (usersError) throw usersError;

    const payslips: Payslip[] = [];

    for (const user of users || []) {
      try {
        const { data: attendance } = await api.get<any[]>('/staff-attendance', {
          params: {
            user_id: user.id,
            start_date: payPeriodStart,
            end_date: payPeriodEnd,
          },
        });

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
