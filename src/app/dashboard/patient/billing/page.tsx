import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  insuranceBillingService,
  PaymentMethod,
  BillingTransaction,
  Invoice,
  InsuranceClaim,
} from '../../../../services/insuranceBillingService';
import { patientService } from '../../../../services/patientService';
import { patientInsuranceCardService, PatientInsuranceCard } from '../../../../services/patientInsuranceCardService';
import InsuranceCardManager from '../../../../components/patient/InsuranceCardManager';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Shield,
  FileText,
  DollarSign,
  Plus,
  X,
  Check,
  AlertCircle,
  Download,
  Printer,
  Star,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { escapeHtml } from '../../../../lib/security';

export default function BillingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'insurance' | 'payment' | 'history' | 'claims'>('overview');
  const [patientId, setPatientId] = useState<string | null>(null);
  const [insuranceCards, setInsuranceCards] = useState<PatientInsuranceCard[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddPayment, setShowAddPayment] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const patient = await patientService.getPatientByUserId(user.id);
    if (patient) {
      setPatientId(patient.id);
      const cards = await patientInsuranceCardService.getPatientInsuranceCards(patient.id);
      setInsuranceCards(cards);
    }

    const [methodsRes, transactionsRes, invoicesRes, claimsRes, balanceRes] =
      await Promise.all([
        insuranceBillingService.getPaymentMethods(user.id),
        insuranceBillingService.getBillingTransactions(user.id),
        insuranceBillingService.getInvoices(user.id),
        insuranceBillingService.getInsuranceClaims(user.id),
        insuranceBillingService.getOutstandingBalance(user.id),
      ]);

    if (methodsRes.data) setPaymentMethods(methodsRes.data);
    if (transactionsRes.data) setTransactions(transactionsRes.data);
    if (invoicesRes.data) setInvoices(invoicesRes.data);
    if (claimsRes.data) setClaims(claimsRes.data);
    if (balanceRes.data !== null) setOutstandingBalance(balanceRes.data);

    setLoading(false);
  };

  const handlePayNow = () => {
    const unpaidInvoice = invoices.find((inv) => inv.balance_cents > 0);
    if (unpaidInvoice) {
      setActiveTab('history');
    }
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    const content = [
      `Invoice: ${invoice.invoice_number}`,
      `Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`,
      `Due: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}`,
      `Subtotal: ${insuranceBillingService.formatCurrency(invoice.subtotal_cents)}`,
      `Tax: ${insuranceBillingService.formatCurrency(invoice.tax_cents)}`,
      `Total: ${insuranceBillingService.formatCurrency(invoice.total_cents)}`,
      `Balance: ${insuranceBillingService.formatCurrency(invoice.balance_cents)}`,
      `Status: ${invoice.status}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoice.invoice_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const safeInvoiceNumber = escapeHtml(invoice.invoice_number);
      const safeDate = escapeHtml(new Date(invoice.invoice_date).toLocaleDateString());
      const safeDue = invoice.due_date ? escapeHtml(new Date(invoice.due_date).toLocaleDateString()) : '';
      const safeSubtotal = escapeHtml(insuranceBillingService.formatCurrency(invoice.subtotal_cents));
      const safeTax = escapeHtml(insuranceBillingService.formatCurrency(invoice.tax_cents));
      const safeTotal = escapeHtml(insuranceBillingService.formatCurrency(invoice.total_cents));
      const safeBalance = escapeHtml(insuranceBillingService.formatCurrency(invoice.balance_cents));

      printWindow.document.write(`
        <html><head><title>Invoice ${safeInvoiceNumber}</title>
        <style>body{font-family:Arial,sans-serif;padding:40px}h1{color:#1a1a1a}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{padding:8px 12px;border-bottom:1px solid #eee;text-align:left}</style>
        </head><body>
        <h1>Invoice ${safeInvoiceNumber}</h1>
        <p>Date: ${safeDate}</p>
        ${safeDue ? `<p>Due: ${safeDue}</p>` : ''}
        <table>
          <tr><td>Subtotal</td><td>${safeSubtotal}</td></tr>
          <tr><td>Tax</td><td>${safeTax}</td></tr>
          <tr><th>Total</th><th>${safeTotal}</th></tr>
          <tr><td>Balance Due</td><td>${safeBalance}</td></tr>
        </table>
        </body></html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-gray-400">Please log in to view billing information</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Billing & Insurance</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your insurance, payments, and billing history</p>
        </div>
      </div>

      {outstandingBalance > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-300 mb-1">Outstanding Balance</h3>
              <p className="text-sm text-red-800 dark:text-red-400">
                You have an outstanding balance of{' '}
                <span className="font-bold">
                  {insuranceBillingService.formatCurrency(outstandingBalance)}
                </span>
                . Please review your invoices and make a payment.
              </p>
            </div>
            <button
              onClick={handlePayNow}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              Pay Now
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px overflow-x-auto">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={TrendingUp} label="Overview" />
            <TabButton active={activeTab === 'insurance'} onClick={() => setActiveTab('insurance')} icon={Shield} label="Insurance" />
            <TabButton active={activeTab === 'payment'} onClick={() => setActiveTab('payment')} icon={CreditCard} label="Payment Methods" />
            <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={FileText} label="Billing History" />
            <TabButton active={activeTab === 'claims'} onClick={() => setActiveTab('claims')} icon={DollarSign} label="Insurance Claims" />
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewTab
                  insuranceCards={insuranceCards}
                  paymentMethods={paymentMethods}
                  transactions={transactions}
                  invoices={invoices}
                  outstandingBalance={outstandingBalance}
                />
              )}
              {activeTab === 'insurance' && patientId && user && (
                <InsuranceCardManager
                  patientId={patientId}
                  userId={user.id}
                />
              )}
              {activeTab === 'insurance' && !patientId && (
                <div className="text-center py-12">
                  <Shield className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Complete Your Profile</h3>
                  <p className="text-gray-600 dark:text-gray-400">Complete your patient registration to manage insurance cards</p>
                </div>
              )}
              {activeTab === 'payment' && (
                <PaymentMethodsTab
                  paymentMethods={paymentMethods}
                  onAdd={() => setShowAddPayment(true)}
                  onRefresh={loadData}
                />
              )}
              {activeTab === 'history' && (
                <BillingHistoryTab
                  transactions={transactions}
                  invoices={invoices}
                  onDownload={handleDownloadInvoice}
                  onPrint={handlePrintInvoice}
                />
              )}
              {activeTab === 'claims' && <ClaimsTab claims={claims} />}
            </>
          )}
        </div>
      </div>

      {showAddPayment && (
        <AddPaymentMethodModal
          userId={user.id}
          onClose={() => setShowAddPayment(false)}
          onSave={() => {
            setShowAddPayment(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<any>;
  label: string;
}> = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`px-6 py-4 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap ${
      active
        ? 'border-sky-600 text-sky-600 dark:text-sky-400 dark:border-sky-400'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
    }`}
  >
    <Icon className="w-5 h-5" />
    {label}
  </button>
);

const OverviewTab: React.FC<{
  insuranceCards: PatientInsuranceCard[];
  paymentMethods: PaymentMethod[];
  transactions: BillingTransaction[];
  invoices: Invoice[];
  outstandingBalance: number;
}> = ({ insuranceCards, paymentMethods, transactions, outstandingBalance }) => {
  const primaryInsurance = insuranceCards.find((c) => c.is_primary);
  const defaultPayment = paymentMethods.find((p) => p.is_default);
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-sky-900 dark:text-sky-300">Total Spent (YTD)</h3>
            <DollarSign className="w-5 h-5 text-sky-600" />
          </div>
          <p className="text-3xl font-bold text-sky-900 dark:text-sky-100">
            {insuranceBillingService.formatCurrency(
              transactions
                .filter((t) => t.status === 'completed')
                .reduce((sum, t) => sum + t.total_cents, 0)
            )}
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-green-900 dark:text-green-300">Insurance Coverage</h3>
            <Shield className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">{insuranceCards.length}</p>
          <p className="text-sm text-green-700 dark:text-green-400 mt-1">Active cards</p>
        </div>

        <div className={`rounded-lg p-6 ${outstandingBalance > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-medium ${outstandingBalance > 0 ? 'text-red-900 dark:text-red-300' : 'text-gray-900 dark:text-gray-300'}`}>
              Outstanding Balance
            </h3>
            <FileText className={`w-5 h-5 ${outstandingBalance > 0 ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}`} />
          </div>
          <p className={`text-3xl font-bold ${outstandingBalance > 0 ? 'text-red-900 dark:text-red-100' : 'text-gray-900 dark:text-white'}`}>
            {insuranceBillingService.formatCurrency(outstandingBalance)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Primary Insurance</h3>
            <Shield className="w-5 h-5 text-gray-400" />
          </div>
          {primaryInsurance ? (
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{primaryInsurance.insurance_provider?.name || 'Unknown Provider'}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Policy: {primaryInsurance.policy_number}</p>
              {primaryInsurance.policy_type && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Type: <span className="capitalize">{primaryInsurance.policy_type}</span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No insurance added</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Default Payment</h3>
            <CreditCard className="w-5 h-5 text-gray-400" />
          </div>
          {defaultPayment ? (
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {defaultPayment.card_brand?.toUpperCase()} ---- {defaultPayment.last_four}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{defaultPayment.billing_name}</p>
              {defaultPayment.expiry_month && defaultPayment.expiry_year && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Expires: {defaultPayment.expiry_month}/{defaultPayment.expiry_year}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No payment method added</p>
          )}
        </div>
      </div>

      {recentTransactions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Transactions</h3>
          <div className="space-y-2">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{transaction.description || transaction.service_type}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(transaction.transaction_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">{insuranceBillingService.formatCurrency(transaction.total_cents)}</p>
                  <TransactionBadge status={transaction.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TransactionBadge: React.FC<{ status: string }> = ({ status }) => {
  const colorMap: Record<string, string> = {
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${colorMap[status] || 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
      {status}
    </span>
  );
};

const ClaimStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colorMap: Record<string, string> = {
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    denied: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    submitted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colorMap[status] || 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
      {status}
    </span>
  );
};

const PaymentMethodsTab: React.FC<{
  paymentMethods: PaymentMethod[];
  onAdd: () => void;
  onRefresh: () => void;
}> = ({ paymentMethods, onAdd }) => (
  <div>
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Payment Methods</h2>
      <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700">
        <Plus className="w-5 h-5" />
        Add Payment Method
      </button>
    </div>
    {paymentMethods.length === 0 ? (
      <div className="text-center py-12">
        <CreditCard className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No payment methods</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Add a payment method for quick and easy payments</p>
        <button onClick={onAdd} className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700">Add Payment Method</button>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paymentMethods.map((method) => (
          <PaymentMethodCard key={method.id} method={method} />
        ))}
      </div>
    )}
  </div>
);

const PaymentMethodCard: React.FC<{ method: PaymentMethod }> = ({ method }) => (
  <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 text-white relative overflow-hidden">
    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
    {method.is_default && (
      <div className="absolute top-4 right-4">
        <span className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
          <Check className="w-3 h-3" />
          Default
        </span>
      </div>
    )}
    <div className="mb-6">
      <p className="text-gray-400 text-xs uppercase tracking-wider">{method.payment_type}</p>
      <p className="text-xl font-bold mt-1">{method.card_brand?.toUpperCase() || 'Card'}</p>
    </div>
    <div className="mb-4">
      <p className="text-lg tracking-widest">---- ---- ---- {method.last_four}</p>
    </div>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-400">Cardholder</p>
        <p className="text-sm">{method.billing_name}</p>
      </div>
      {method.expiry_month && method.expiry_year && (
        <div>
          <p className="text-xs text-gray-400">Expires</p>
          <p className="text-sm">{method.expiry_month}/{method.expiry_year}</p>
        </div>
      )}
    </div>
  </div>
);

const BillingHistoryTab: React.FC<{
  transactions: BillingTransaction[];
  invoices: Invoice[];
  onDownload: (invoice: Invoice) => void;
  onPrint: (invoice: Invoice) => void;
}> = ({ transactions, invoices, onDownload, onPrint }) => (
  <div className="space-y-8">
    {invoices.length > 0 && (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Invoices</h2>
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{invoice.invoice_number}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(invoice.invoice_date).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">{insuranceBillingService.formatCurrency(invoice.total_cents)}</p>
                  {invoice.balance_cents > 0 && (
                    <p className="text-xs text-red-600 dark:text-red-400">Balance: {insuranceBillingService.formatCurrency(invoice.balance_cents)}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onDownload(invoice)} className="p-2 text-gray-500 hover:text-sky-600 dark:text-gray-400 dark:hover:text-sky-400">
                    <Download className="w-4 h-4" />
                  </button>
                  <button onClick={() => onPrint(invoice)} className="p-2 text-gray-500 hover:text-sky-600 dark:text-gray-400 dark:hover:text-sky-400">
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Transactions</h2>
      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No transactions yet</h3>
          <p className="text-gray-600 dark:text-gray-400">Your billing history will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{transaction.description || transaction.service_type}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(transaction.transaction_date).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900 dark:text-white">{insuranceBillingService.formatCurrency(transaction.total_cents)}</p>
                <TransactionBadge status={transaction.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const ClaimsTab: React.FC<{ claims: InsuranceClaim[] }> = ({ claims }) => (
  <div>
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Insurance Claims</h2>
    {claims.length === 0 ? (
      <div className="text-center py-12">
        <DollarSign className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No claims</h3>
        <p className="text-gray-600 dark:text-gray-400">Insurance claims will appear here when submitted</p>
      </div>
    ) : (
      <div className="space-y-4">
        {claims.map((claim) => (
          <div key={claim.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{claim.claim_number || 'Pending'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Service: {new Date(claim.service_date).toLocaleDateString()}
                </p>
              </div>
              <ClaimStatusBadge status={claim.status} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Claimed</p>
                <p className="font-semibold text-gray-900 dark:text-white">{insuranceBillingService.formatCurrency(claim.claimed_amount_cents)}</p>
              </div>
              {claim.approved_amount_cents !== null && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Approved</p>
                  <p className="font-semibold text-green-700 dark:text-green-300">{insuranceBillingService.formatCurrency(claim.approved_amount_cents ?? 0)}</p>
                </div>
              )}
              {claim.paid_amount_cents !== null && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Paid</p>
                  <p className="font-semibold text-green-700 dark:text-green-300">{insuranceBillingService.formatCurrency(claim.paid_amount_cents ?? 0)}</p>
                </div>
              )}
              {claim.patient_responsibility_cents && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Your Responsibility</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{insuranceBillingService.formatCurrency(claim.patient_responsibility_cents)}</p>
                </div>
              )}
            </div>
            {claim.denial_reason && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-300">Denial reason: {claim.denial_reason}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);

const AddPaymentMethodModal: React.FC<{
  userId: string;
  onClose: () => void;
  onSave: () => void;
}> = ({ userId, onClose, onSave }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    payment_type: 'card' as 'card' | 'bank_account',
    card_brand: 'visa',
    last_four: '',
    expiry_month: '',
    expiry_year: '',
    billing_name: '',
    billing_address_line1: '',
    billing_city: '',
    billing_province: '',
    billing_postal_code: '',
    is_default: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.last_four || !formData.billing_name) return;
    setSaving(true);
    setError('');

    const { error: saveError } = await insuranceBillingService.addPaymentMethod({
      patient_id: userId,
      payment_type: formData.payment_type,
      card_brand: formData.card_brand,
      last_four: formData.last_four,
      expiry_month: formData.expiry_month ? parseInt(formData.expiry_month) : undefined,
      expiry_year: formData.expiry_year ? parseInt(formData.expiry_year) : undefined,
      billing_name: formData.billing_name,
      billing_address_line1: formData.billing_address_line1 || undefined,
      billing_city: formData.billing_city || undefined,
      billing_province: formData.billing_province || undefined,
      billing_postal_code: formData.billing_postal_code || undefined,
      billing_country: 'CA',
      provider: formData.card_brand,
      is_default: formData.is_default,
      is_active: true,
    });

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Payment Method</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Card Brand</label>
            <select
              value={formData.card_brand}
              onChange={(e) => setFormData({ ...formData, card_brand: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="visa">Visa</option>
              <option value="mastercard">Mastercard</option>
              <option value="amex">American Express</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last 4 Digits *</label>
              <input
                type="text"
                required
                maxLength={4}
                pattern="\d{4}"
                value={formData.last_four}
                onChange={(e) => setFormData({ ...formData, last_four: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="1234"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exp Month</label>
                <input
                  type="text"
                  maxLength={2}
                  value={formData.expiry_month}
                  onChange={(e) => setFormData({ ...formData, expiry_month: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                  placeholder="MM"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exp Year</label>
                <input
                  type="text"
                  maxLength={4}
                  value={formData.expiry_year}
                  onChange={(e) => setFormData({ ...formData, expiry_year: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="YYYY"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cardholder Name *</label>
            <input
              type="text"
              required
              value={formData.billing_name}
              onChange={(e) => setFormData({ ...formData, billing_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Billing Address</label>
            <input
              type="text"
              value={formData.billing_address_line1}
              onChange={(e) => setFormData({ ...formData, billing_address_line1: e.target.value })}
              placeholder="Street address"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
              <input
                type="text"
                value={formData.billing_city}
                onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Province</label>
              <input
                type="text"
                maxLength={2}
                value={formData.billing_province}
                onChange={(e) => setFormData({ ...formData, billing_province: e.target.value.toUpperCase() })}
                placeholder="ON"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Postal Code</label>
              <input
                type="text"
                maxLength={7}
                value={formData.billing_postal_code}
                onChange={(e) => setFormData({ ...formData, billing_postal_code: e.target.value.toUpperCase() })}
                placeholder="A1A 1A1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_default}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Set as default payment method</span>
          </label>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-gray-700 dark:text-gray-300">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : 'Add Payment Method'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
