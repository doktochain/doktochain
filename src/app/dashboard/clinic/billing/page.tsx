import { useState, useEffect } from 'react';
import { DollarSign, CreditCard, Shield, Building2, Search, Plus, Eye, FileText, CheckCircle, Clock as ClockIcon, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { clinicService, Clinic, ClinicAffiliation } from '../../../../services/clinicService';
import { FinanceService, PlatformInvoice } from '../../../../services/financeService';

type BillingTab = 'overview' | 'oop' | 'private' | 'provincial' | 'invoices';

const BILLING_TYPE_LABELS: Record<string, string> = {
  oop: 'Out of Pocket',
  private_insurance: 'Private Insurance',
  provincial_insurance: 'Provincial Insurance',
};

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const PROVINCIAL_PLANS = [
  { code: 'OHIP', name: 'Ontario Health Insurance Plan', province: 'Ontario' },
  { code: 'RAMQ', name: "Regie de l'assurance maladie du Quebec", province: 'Quebec' },
  { code: 'MSP', name: 'Medical Services Plan', province: 'British Columbia' },
  { code: 'AHCIP', name: 'Alberta Health Care Insurance Plan', province: 'Alberta' },
  { code: 'MSI', name: 'Medical Services Insurance', province: 'Nova Scotia' },
  { code: 'MHSAL', name: 'Manitoba Health', province: 'Manitoba' },
  { code: 'SHC', name: 'Saskatchewan Health Card', province: 'Saskatchewan' },
  { code: 'MHCS', name: 'Medicare (New Brunswick)', province: 'New Brunswick' },
];

const PRIVATE_INSURERS = [
  'Sun Life Financial', 'Manulife', 'Great-West Life', 'Canada Life', 'Blue Cross',
  'Desjardins Insurance', 'Industrial Alliance', 'Empire Life', 'Equitable Life', 'Green Shield Canada',
];

export default function ClinicBillingPage() {
  const { user } = useAuth();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [affiliations, setAffiliations] = useState<ClinicAffiliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BillingTab>('overview');
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PlatformInvoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [creating, setCreating] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    patient_name: '',
    provider_id: '',
    amount: '',
    billing_type: 'oop' as 'oop' | 'private_insurance' | 'provincial_insurance',
    insurance_provider: '',
    policy_number: '',
    provincial_plan: '',
    health_card_number: '',
    service_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    description: '',
    service_codes: '',
  });

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    try {
      const c = await clinicService.getClinicByOwnerId(user!.id);
      setClinic(c);
      if (c) {
        const [affs, invoiceRes] = await Promise.all([
          clinicService.getClinicAffiliations(c.id),
          FinanceService.getInvoices(200, 0),
        ]);
        setAffiliations(affs.filter(a => a.status === 'active'));
        const clinicInvoices = (invoiceRes.data || []).filter(
          (inv: PlatformInvoice) => inv.metadata?.clinic_id === c.id
        );
        setInvoices(clinicInvoices);
      }
    } catch (error) {
      console.error('Error loading billing:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetNewInvoice = () => setNewInvoice({
    patient_name: '', provider_id: '', amount: '',
    billing_type: 'oop', insurance_provider: '', policy_number: '',
    provincial_plan: '', health_card_number: '',
    service_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    description: '', service_codes: '',
  });

  const handleCreateInvoice = async () => {
    if (!clinic) return;
    setCreating(true);
    try {
      const providerAff = affiliations.find(a => a.provider_id === newInvoice.provider_id);
      const providerName = providerAff
        ? `Dr. ${providerAff.providers?.user_profiles?.first_name} ${providerAff.providers?.user_profiles?.last_name}`
        : 'Unknown Provider';

      const invoiceNumber = await FinanceService.generateInvoiceNumber();
      const amount = parseFloat(newInvoice.amount) || 0;

      const created = await FinanceService.createInvoice({
        invoice_number: invoiceNumber,
        client_name: newInvoice.patient_name,
        client_email: '',
        client_type: 'patient',
        invoice_date: newInvoice.service_date,
        due_date: newInvoice.due_date,
        subtotal: amount,
        tax_rate: 0,
        tax_amount: 0,
        total_amount: amount,
        paid_amount: 0,
        currency: 'CAD',
        status: 'draft',
        notes: newInvoice.description,
        payment_terms: `Net 30`,
        metadata: {
          clinic_id: clinic.id,
          clinic_name: clinic.name,
          billing_type: newInvoice.billing_type,
          provider_name: providerName,
          provider_id: newInvoice.provider_id,
          insurance_provider: newInvoice.billing_type === 'private_insurance' ? newInvoice.insurance_provider : undefined,
          policy_number: newInvoice.billing_type === 'private_insurance' ? newInvoice.policy_number : undefined,
          provincial_plan: newInvoice.billing_type === 'provincial_insurance' ? newInvoice.provincial_plan : undefined,
          health_card_number: newInvoice.billing_type === 'provincial_insurance' ? newInvoice.health_card_number : undefined,
          service_codes: newInvoice.billing_type === 'provincial_insurance' ? newInvoice.service_codes : undefined,
        },
      });

      setInvoices(prev => [created, ...prev]);
      setShowCreateModal(false);
      resetNewInvoice();
    } catch (error) {
      console.error('Error creating invoice:', error);
    } finally {
      setCreating(false);
    }
  };

  const updateInvoiceStatus = async (id: string, status: PlatformInvoice['status']) => {
    try {
      const updates: Partial<PlatformInvoice> = { status };
      if (status === 'paid') {
        const inv = invoices.find(i => i.id === id);
        updates.paid_amount = inv?.total_amount || 0;
        updates.paid_date = new Date().toISOString();
      }
      const updated = await FinanceService.updateInvoice(id, updates);
      setInvoices(prev => prev.map(inv => inv.id === id ? updated : inv));
      if (selectedInvoice?.id === id) setSelectedInvoice(updated);
    } catch (error) {
      console.error('Error updating invoice:', error);
    }
  };

  const getBillingType = (inv: PlatformInvoice): string => inv.metadata?.billing_type || 'oop';
  const getProviderName = (inv: PlatformInvoice): string => inv.metadata?.provider_name || '';
  const getInsuranceProvider = (inv: PlatformInvoice): string => inv.metadata?.insurance_provider || '';
  const getPolicyNumber = (inv: PlatformInvoice): string => inv.metadata?.policy_number || '';

  const filteredInvoices = invoices.filter(inv => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!inv.client_name.toLowerCase().includes(q) && !getProviderName(inv).toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    const bt = getBillingType(inv);
    if (activeTab === 'oop') return bt === 'oop';
    if (activeTab === 'private') return bt === 'private_insurance';
    if (activeTab === 'provincial') return bt === 'provincial_insurance';
    return true;
  });

  const totalBilled = invoices.reduce((s, i) => s + i.total_amount, 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0);
  const totalPending = invoices.filter(i => ['sent', 'draft'].includes(i.status)).reduce((s, i) => s + i.total_amount, 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total_amount, 0);
  const oopTotal = invoices.filter(i => getBillingType(i) === 'oop').reduce((s, i) => s + i.total_amount, 0);
  const privateTotal = invoices.filter(i => getBillingType(i) === 'private_insurance').reduce((s, i) => s + i.total_amount, 0);
  const provincialTotal = invoices.filter(i => getBillingType(i) === 'provincial_insurance').reduce((s, i) => s + i.total_amount, 0);

  const fmt = (n: number) => `$${n.toLocaleString('en-CA', { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <DollarSign size={48} className="text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Clinic Found</h2>
          <p className="text-gray-500">Your clinic hasn't been set up yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Billing & Invoicing</h1>
          <p className="text-gray-500 mt-1">Manage patient billing across all payment methods</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          <Plus size={18} /> Create Invoice
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Billed', value: fmt(totalBilled), icon: DollarSign, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
          { label: 'Collected', value: fmt(totalPaid), icon: CheckCircle, iconBg: 'bg-green-100', iconColor: 'text-green-600' },
          { label: 'Pending', value: fmt(totalPending), icon: ClockIcon, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
          { label: 'Overdue', value: fmt(totalOverdue), icon: AlertCircle, iconBg: 'bg-red-100', iconColor: 'text-red-600' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <card.icon size={20} className={card.iconColor} />
              </div>
              <p className="text-sm text-gray-500">{card.label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {[
          { key: 'overview' as const, label: 'Overview', icon: DollarSign },
          { key: 'oop' as const, label: 'Out of Pocket', icon: CreditCard },
          { key: 'private' as const, label: 'Private Insurance', icon: Shield },
          { key: 'provincial' as const, label: 'Provincial Insurance', icon: Building2 },
          { key: 'invoices' as const, label: 'All Invoices', icon: FileText },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { label: 'Out of Pocket', desc: 'Direct patient payments', total: oopTotal, count: invoices.filter(i => getBillingType(i) === 'oop').length, icon: CreditCard, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', tab: 'oop' as BillingTab },
              { label: 'Private Insurance', desc: 'Third-party insurance claims', total: privateTotal, count: invoices.filter(i => getBillingType(i) === 'private_insurance').length, icon: Shield, iconBg: 'bg-teal-100', iconColor: 'text-teal-600', tab: 'private' as BillingTab },
              { label: 'Provincial Insurance', desc: 'Government health plan claims', total: provincialTotal, count: invoices.filter(i => getBillingType(i) === 'provincial_insurance').length, icon: Building2, iconBg: 'bg-green-100', iconColor: 'text-green-600', tab: 'provincial' as BillingTab },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg ${item.iconBg} flex items-center justify-center`}>
                    <item.icon size={20} className={item.iconColor} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{item.label}</h3>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-800">{fmt(item.total)}</p>
                <p className="text-xs text-gray-500 mt-1">{item.count} invoices</p>
                <button onClick={() => setActiveTab(item.tab)} className="mt-3 text-sm text-blue-600 font-medium hover:text-blue-700">View Details</button>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Supported Billing Methods</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard size={18} className="text-blue-600" />
                  <h4 className="font-medium text-gray-800">Out of Pocket (OOP)</h4>
                </div>
                <p className="text-sm text-gray-600">Direct payment from patients. Supports credit/debit cards, e-transfer, and cash payments.</p>
              </div>
              <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={18} className="text-teal-600" />
                  <h4 className="font-medium text-gray-800">Private Insurance</h4>
                </div>
                <p className="text-sm text-gray-600">Claims to major Canadian insurers: Sun Life, Manulife, Great-West Life, Blue Cross, and more.</p>
              </div>
              <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={18} className="text-green-600" />
                  <h4 className="font-medium text-gray-800">Provincial Insurance</h4>
                </div>
                <p className="text-sm text-gray-600">Submit claims to provincial health plans: OHIP, RAMQ, MSP, AHCIP, and all other plans.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {(activeTab === 'oop' || activeTab === 'private' || activeTab === 'provincial' || activeTab === 'invoices') && (
        <div className="space-y-4">
          {activeTab !== 'invoices' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              {activeTab === 'oop' && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Out of Pocket Billing</h3>
                  <p className="text-sm text-gray-600 mb-4">Create and manage direct patient invoices.</p>
                  <div className="flex flex-wrap gap-2">
                    {['Credit Card', 'Debit Card', 'E-Transfer', 'Cash', 'Cheque'].map(m => (
                      <span key={m} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">{m}</span>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'private' && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Private Insurance Claims</h3>
                  <p className="text-sm text-gray-600 mb-4">Submit and track claims to private insurance providers:</p>
                  <div className="flex flex-wrap gap-2">
                    {PRIVATE_INSURERS.map(ins => (
                      <span key={ins} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">{ins}</span>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'provincial' && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Provincial Insurance Claims</h3>
                  <p className="text-sm text-gray-600 mb-4">Submit claims to Canadian provincial health insurance plans:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {PROVINCIAL_PLANS.map(p => (
                      <div key={p.code} className="p-3 rounded-lg border border-green-200 bg-green-50">
                        <p className="font-semibold text-green-800 text-sm">{p.code}</p>
                        <p className="text-xs text-green-600">{p.province}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search invoices..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button
                onClick={() => {
                  const tabType = activeTab === 'oop' ? 'oop' : activeTab === 'private' ? 'private_insurance' : activeTab === 'provincial' ? 'provincial_insurance' : 'oop';
                  setNewInvoice(prev => ({ ...prev, billing_type: tabType as any }));
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                <Plus size={16} /> New Invoice
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {filteredInvoices.length === 0 ? (
              <div className="p-12 text-center">
                <FileText size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-700">No invoices found</p>
                <p className="text-sm text-gray-500 mt-1">Create your first invoice to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Patient</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Provider</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInvoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-4"><p className="text-sm font-semibold text-gray-800">{inv.client_name}</p></td>
                        <td className="px-5 py-4"><p className="text-sm text-gray-600">{getProviderName(inv)}</p></td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-medium text-gray-600">{BILLING_TYPE_LABELS[getBillingType(inv)] || getBillingType(inv)}</span>
                          {getInsuranceProvider(inv) && <p className="text-xs text-gray-400">{getInsuranceProvider(inv)}</p>}
                        </td>
                        <td className="px-5 py-4"><p className="text-sm font-semibold text-gray-800">{fmt(inv.total_amount)}</p></td>
                        <td className="px-5 py-4"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status] || ''}`}>{inv.status}</span></td>
                        <td className="px-5 py-4">
                          <p className="text-sm text-gray-600">{new Date(inv.invoice_date).toLocaleDateString('en-CA')}</p>
                          <p className="text-xs text-gray-400">Due: {new Date(inv.due_date).toLocaleDateString('en-CA')}</p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setSelectedInvoice(inv)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"><Eye size={16} /></button>
                            {inv.status === 'draft' && <button onClick={() => updateInvoiceStatus(inv.id, 'sent')} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition">Send</button>}
                            {inv.status === 'sent' && <button onClick={() => updateInvoiceStatus(inv.id, 'paid')} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition">Mark Paid</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">Create Invoice</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 transition"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Type</label>
                <select value={newInvoice.billing_type} onChange={(e) => setNewInvoice(prev => ({ ...prev, billing_type: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="oop">Out of Pocket</option>
                  <option value="private_insurance">Private Insurance</option>
                  <option value="provincial_insurance">Provincial Insurance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                <input type="text" value={newInvoice.patient_name} onChange={(e) => setNewInvoice(prev => ({ ...prev, patient_name: e.target.value }))} placeholder="Enter patient name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                <select value={newInvoice.provider_id} onChange={(e) => setNewInvoice(prev => ({ ...prev, provider_id: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Provider</option>
                  {affiliations.map(aff => (
                    <option key={aff.provider_id} value={aff.provider_id}>Dr. {aff.providers?.user_profiles?.first_name} {aff.providers?.user_profiles?.last_name}</option>
                  ))}
                </select>
              </div>
              {newInvoice.billing_type === 'private_insurance' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Provider</label>
                    <select value={newInvoice.insurance_provider} onChange={(e) => setNewInvoice(prev => ({ ...prev, insurance_provider: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                      <option value="">Select Insurer</option>
                      {PRIVATE_INSURERS.map(ins => <option key={ins} value={ins}>{ins}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
                    <input type="text" value={newInvoice.policy_number} onChange={(e) => setNewInvoice(prev => ({ ...prev, policy_number: e.target.value }))} placeholder="Enter policy number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                </>
              )}
              {newInvoice.billing_type === 'provincial_insurance' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Provincial Plan</label>
                    <select value={newInvoice.provincial_plan} onChange={(e) => setNewInvoice(prev => ({ ...prev, provincial_plan: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                      <option value="">Select Plan</option>
                      {PROVINCIAL_PLANS.map(plan => <option key={plan.code} value={plan.code}>{plan.code} - {plan.province}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Health Card Number</label>
                    <input type="text" value={newInvoice.health_card_number} onChange={(e) => setNewInvoice(prev => ({ ...prev, health_card_number: e.target.value }))} placeholder="Enter health card number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Codes (comma-separated)</label>
                    <input type="text" value={newInvoice.service_codes} onChange={(e) => setNewInvoice(prev => ({ ...prev, service_codes: e.target.value }))} placeholder="e.g., A007, A004, G004" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                  <input type="number" value={newInvoice.amount} onChange={(e) => setNewInvoice(prev => ({ ...prev, amount: e.target.value }))} placeholder="0.00" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Date</label>
                  <input type="date" value={newInvoice.service_date} onChange={(e) => setNewInvoice(prev => ({ ...prev, service_date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" value={newInvoice.due_date} onChange={(e) => setNewInvoice(prev => ({ ...prev, due_date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={newInvoice.description} onChange={(e) => setNewInvoice(prev => ({ ...prev, description: e.target.value }))} placeholder="Service description" rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-200">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleCreateInvoice} disabled={creating || !newInvoice.patient_name || !newInvoice.amount} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">{creating ? 'Creating...' : 'Create Invoice'}</button>
            </div>
          </div>
        </div>
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Invoice Details</h3>
                <button onClick={() => setSelectedInvoice(null)} className="text-white/80 hover:text-white transition"><X size={20} /></button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 text-white">{selectedInvoice.status}</span>
                <span className="text-sm text-blue-200">{BILLING_TYPE_LABELS[getBillingType(selectedInvoice)] || getBillingType(selectedInvoice)}</span>
                <span className="text-sm text-blue-200 ml-auto">{selectedInvoice.invoice_number}</span>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Patient</p>
                  <p className="text-sm font-medium text-gray-800">{selectedInvoice.client_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Provider</p>
                  <p className="text-sm font-medium text-gray-800">{getProviderName(selectedInvoice)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Amount</p>
                  <p className="text-lg font-bold text-gray-800">{fmt(selectedInvoice.total_amount)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Service Date</p>
                  <p className="text-sm font-medium text-gray-800">{new Date(selectedInvoice.invoice_date).toLocaleDateString('en-CA')}</p>
                </div>
              </div>
              {getInsuranceProvider(selectedInvoice) && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Insurance</p>
                  <p className="text-sm text-gray-800">{getInsuranceProvider(selectedInvoice)}</p>
                  {getPolicyNumber(selectedInvoice) && <p className="text-xs text-gray-500">Policy: {getPolicyNumber(selectedInvoice)}</p>}
                </div>
              )}
              {selectedInvoice.notes && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Description</p>
                  <p className="text-sm text-gray-700">{selectedInvoice.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {selectedInvoice.status === 'draft' && <button onClick={() => updateInvoiceStatus(selectedInvoice.id, 'sent')} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">Send Invoice</button>}
                {selectedInvoice.status === 'sent' && <button onClick={() => updateInvoiceStatus(selectedInvoice.id, 'paid')} className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">Mark as Paid</button>}
                {['draft', 'sent'].includes(selectedInvoice.status) && <button onClick={() => updateInvoiceStatus(selectedInvoice.id, 'cancelled')} className="px-4 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition">Cancel</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
