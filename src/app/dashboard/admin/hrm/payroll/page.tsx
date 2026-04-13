import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { DollarSign, Download, FileText, Calendar } from 'lucide-react';
import { payrollService, Payslip } from '../../../../../services/payrollService';
import { ConfirmDialog } from '../../../../../components/ui/confirm-dialog';

export default function PayrollPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);

  useEffect(() => {
    loadPayslips();
  }, [selectedMonth, selectedYear]);

  const loadPayslips = async () => {
    try {
      setLoading(true);
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      const data = await payrollService.getPayslips({
        startDate,
        endDate,
      });
      setPayslips(data);
    } catch (error) {
      console.error('Error loading payslips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayroll = async () => {
    try {
      setGenerating(true);
      await payrollService.bulkGeneratePayslips(selectedMonth, selectedYear);
      await loadPayslips();
      toast.success('Payroll generated successfully!');
    } catch (error) {
      console.error('Error generating payroll:', error);
      toast.error('Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprovePayslip = async (id: string) => {
    try {
      await payrollService.approvePayslip(id);
      await loadPayslips();
    } catch (error) {
      console.error('Error approving payslip:', error);
      toast.error('Failed to approve payslip');
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    const paymentMethod = prompt('Enter payment method (bank_transfer, cash, check):');
    if (!paymentMethod) return;

    try {
      await payrollService.markPayslipAsPaid(
        id,
        new Date().toISOString().split('T')[0],
        paymentMethod
      );
      await loadPayslips();
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error('Failed to mark payslip as paid');
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const totalGross = payslips.reduce((sum, p) => sum + p.gross_salary, 0);
  const totalNet = payslips.reduce((sum, p) => sum + p.net_salary, 0);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Payroll Management
          </h1>
          <p className="text-gray-600 mt-1">
            Generate and manage employee payslips
          </p>
        </div>

        <button
          onClick={() => setShowGenerateConfirm(true)}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          <FileText className="w-4 h-4" />
          {generating ? 'Generating...' : 'Generate Payroll'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Pay Period:</span>
          </div>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <option key={month} value={month}>
                {getMonthName(month)}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {years.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-600 mb-1">Total Employees</p>
            <p className="text-2xl font-bold text-blue-900">{payslips.length}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-600 mb-1">Total Gross</p>
            <p className="text-2xl font-bold text-green-900">{formatCurrency(totalGross)}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm text-emerald-600 mb-1">Total Net</p>
            <p className="text-2xl font-bold text-emerald-900">{formatCurrency(totalNet)}</p>
          </div>
        </div>

        {payslips.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No payslips found for this period</p>
            <button
              onClick={() => setShowGenerateConfirm(true)}
              className="text-blue-600 hover:text-blue-700"
            >
              Generate payroll to get started
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Base Salary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gross Salary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deductions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Salary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payslips.map(payslip => (
                  <tr key={payslip.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {payslip.user?.full_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {payslip.user?.employee_id || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(payslip.base_salary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(payslip.gross_salary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {formatCurrency(payslip.total_deductions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                      {formatCurrency(payslip.net_salary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payslip.status)}`}>
                        {payslip.status.charAt(0).toUpperCase() + payslip.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {payslip.status === 'draft' && (
                        <button
                          onClick={() => handleApprovePayslip(payslip.id)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Approve
                        </button>
                      )}
                      {payslip.status === 'approved' && (
                        <button
                          onClick={() => handleMarkAsPaid(payslip.id)}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Mark Paid
                        </button>
                      )}
                      <button className="text-gray-600 hover:text-gray-900">
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showGenerateConfirm}
        onOpenChange={setShowGenerateConfirm}
        title="Generate Payroll"
        description={`Generate payroll for ${getMonthName(selectedMonth)} ${selectedYear}?`}
        confirmLabel="Generate"
        onConfirm={handleGeneratePayroll}
        loading={generating}
      />
    </div>
  );
}
