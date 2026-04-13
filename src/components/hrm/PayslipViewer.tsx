import React from 'react';
import { Download, FileText, Calendar, DollarSign } from 'lucide-react';
import { Payslip } from '../../services/payrollService';

interface PayslipViewerProps {
  payslip: Payslip;
  onDownload?: () => void;
}

export const PayslipViewer: React.FC<PayslipViewerProps> = ({ payslip, onDownload }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const allowanceEntries = Object.entries(payslip.allowances);
  const deductionEntries = Object.entries(payslip.deductions);
  const bonusEntries = Object.entries(payslip.bonuses);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Payslip</h2>
          </div>
          {onDownload && (
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="opacity-80 mb-1">Pay Period</p>
            <p className="font-medium">
              {formatDate(payslip.pay_period_start)} - {formatDate(payslip.pay_period_end)}
            </p>
          </div>
          <div>
            <p className="opacity-80 mb-1">Payment Date</p>
            <p className="font-medium">
              {payslip.payment_date ? formatDate(payslip.payment_date) : 'Pending'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 mb-1">Name</p>
              <p className="font-medium text-gray-900">{payslip.user?.full_name}</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Employee ID</p>
              <p className="font-medium text-gray-900">{payslip.user?.employee_id || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-700">Base Salary</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(payslip.base_salary)}
              </span>
            </div>

            {allowanceEntries.length > 0 && (
              <>
                {allowanceEntries.map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2">
                    <span className="text-gray-700 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(value as number)}
                    </span>
                  </div>
                ))}
              </>
            )}

            {payslip.overtime_pay > 0 && (
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700">Overtime Pay</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(payslip.overtime_pay)}
                </span>
              </div>
            )}

            {bonusEntries.length > 0 && (
              <>
                {bonusEntries.map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2">
                    <span className="text-gray-700 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(value as number)}
                    </span>
                  </div>
                ))}
              </>
            )}

            <div className="flex items-center justify-between py-3 bg-blue-50 px-3 rounded-lg border-t-2 border-blue-600 mt-2">
              <span className="font-semibold text-gray-900">Gross Salary</span>
              <span className="font-bold text-blue-600 text-lg">
                {formatCurrency(payslip.gross_salary)}
              </span>
            </div>
          </div>
        </div>

        {deductionEntries.length > 0 && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Deductions</h3>
            <div className="space-y-3">
              {deductionEntries.map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-2">
                  <span className="text-gray-700 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(value as number)}
                  </span>
                </div>
              ))}

              <div className="flex items-center justify-between py-3 bg-red-50 px-3 rounded-lg border-t-2 border-red-600 mt-2">
                <span className="font-semibold text-gray-900">Total Deductions</span>
                <span className="font-bold text-red-600 text-lg">
                  -{formatCurrency(payslip.total_deductions)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-6">
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border-2 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 mb-1">Net Salary</p>
                <p className="text-3xl font-bold text-green-900">
                  {formatCurrency(payslip.net_salary)}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-green-600 opacity-50" />
            </div>
          </div>
        </div>

        {payslip.payment_method && (
          <div className="border-t pt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Payment Method</p>
              <p className="font-medium text-gray-900 capitalize">
                {payslip.payment_method.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        )}

        {payslip.notes && (
          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
              {payslip.notes}
            </p>
          </div>
        )}

        <div className="border-t pt-6">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            payslip.status === 'paid'
              ? 'bg-green-100 text-green-800'
              : payslip.status === 'approved'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            Status: {payslip.status.charAt(0).toUpperCase() + payslip.status.slice(1)}
          </div>
        </div>
      </div>
    </div>
  );
};
