import { FileText, DollarSign, AlertCircle, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Shield } from 'lucide-react';

export default function InvoicesMonitoringPage() {
  const { currentColors } = useTheme();
  const { userProfile } = useAuth();

  if (userProfile?.role !== 'admin') {
    return (
      <div className="p-6">
        <div
          className="p-8 rounded-lg border text-center"
          style={{
            backgroundColor: currentColors.cardBg,
            borderColor: currentColors.border,
          }}
        >
          <Shield size={48} className="mx-auto mb-4" style={{ color: currentColors.primary }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: currentColors.text }}>
            Admin Access Required
          </h2>
          <p style={{ color: currentColors.textSecondary }}>
            You need administrator privileges to access invoice monitoring.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FileText size={32} style={{ color: currentColors.primary }} />
          <h1 className="text-3xl font-bold" style={{ color: currentColors.text }}>
            Invoice & Financial Oversight
          </h1>
        </div>
        <p style={{ color: currentColors.textSecondary }}>
          Monitor all invoices, payments, and financial transactions across portals
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div
          className="p-6 rounded-lg border"
          style={{
            backgroundColor: currentColors.cardBg,
            borderColor: currentColors.border,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm mb-1" style={{ color: currentColors.textSecondary }}>
                Total Revenue
              </p>
              <p className="text-3xl font-bold" style={{ color: currentColors.text }}>
                $284,567
              </p>
              <p className="text-sm text-green-600">+12.5% this month</p>
            </div>
            <DollarSign size={32} style={{ color: currentColors.primary }} />
          </div>
        </div>

        <div
          className="p-6 rounded-lg border"
          style={{
            backgroundColor: currentColors.cardBg,
            borderColor: currentColors.border,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm mb-1" style={{ color: currentColors.textSecondary }}>
                Pending Invoices
              </p>
              <p className="text-3xl font-bold" style={{ color: currentColors.text }}>
                156
              </p>
              <p className="text-sm text-orange-600">Awaiting payment</p>
            </div>
            <AlertCircle size={32} style={{ color: '#F59E0B' }} />
          </div>
        </div>

        <div
          className="p-6 rounded-lg border"
          style={{
            backgroundColor: currentColors.cardBg,
            borderColor: currentColors.border,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm mb-1" style={{ color: currentColors.textSecondary }}>
                Overdue Invoices
              </p>
              <p className="text-3xl font-bold" style={{ color: currentColors.text }}>
                23
              </p>
              <p className="text-sm text-red-600">Requires attention</p>
            </div>
            <FileText size={32} style={{ color: '#EF4444' }} />
          </div>
        </div>

        <div
          className="p-6 rounded-lg border"
          style={{
            backgroundColor: currentColors.cardBg,
            borderColor: currentColors.border,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm mb-1" style={{ color: currentColors.textSecondary }}>
                Payment Success Rate
              </p>
              <p className="text-3xl font-bold" style={{ color: currentColors.text }}>
                96.2%
              </p>
              <p className="text-sm text-green-600">+2.1% from last month</p>
            </div>
            <TrendingUp size={32} style={{ color: '#10B981' }} />
          </div>
        </div>
      </div>

      <div
        className="p-6 rounded-lg border"
        style={{
          backgroundColor: currentColors.cardBg,
          borderColor: currentColors.border,
        }}
      >
        <p className="text-center py-12" style={{ color: currentColors.textSecondary }}>
          Invoice monitoring dashboard coming soon. Full financial oversight and transaction tracking will be available here.
        </p>
      </div>
    </div>
  );
}
