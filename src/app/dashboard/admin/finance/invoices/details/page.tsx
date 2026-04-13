import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { FinanceService, PlatformInvoice, InvoiceItem } from '../../../../../../services/financeService';
import { ConfirmDialog } from '../../../../../../components/ui/confirm-dialog';
import { FileText, ArrowLeft, Download, Send, CreditCard as Edit, CheckCircle, DollarSign, Calendar, Mail, MapPin, Printer } from 'lucide-react';

export default function InvoiceDetailsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('id');

  const [invoice, setInvoice] = useState<PlatformInvoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showMarkPaidConfirm, setShowMarkPaidConfirm] = useState(false);

  useEffect(() => {
    if (invoiceId) {
      loadInvoiceDetails();
    }
  }, [invoiceId]);

  const loadInvoiceDetails = async () => {
    if (!invoiceId) return;

    try {
      setLoading(true);
      const invoiceData = await FinanceService.getInvoiceById(invoiceId);
      const invoiceItems = await FinanceService.getInvoiceItems(invoiceId);
      setInvoice(invoiceData);
      setItems(invoiceItems);
    } catch (error) {
      console.error('Error loading invoice details:', error);
      toast.error('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleMarkAsPaid = async () => {
    if (!invoice) return;

    try {
      setActionLoading(true);
      await FinanceService.updateInvoice(invoice.id, {
        status: 'paid',
        paid_amount: Number(invoice.total_amount),
        paid_date: new Date().toISOString(),
      });
      await loadInvoiceDetails();
      toast.success('Invoice marked as paid successfully!');
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!invoice) return;

    try {
      setActionLoading(true);
      await FinanceService.updateInvoice(invoice.id, {
        status: 'sent',
      });
      await loadInvoiceDetails();
      toast.success('Invoice sent successfully!');
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error('Failed to send invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800">Invoice not found</p>
          <button
            onClick={() => navigate('/dashboard/admin/finance/invoices')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate('/dashboard/admin/finance/invoices')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Invoices
        </button>
        <div className="flex items-center gap-2">
          {invoice.status === 'draft' && (
            <button
              onClick={handleSendInvoice}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Send Invoice
            </button>
          )}
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <button
              onClick={() => setShowMarkPaidConfirm(true)}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              Mark as Paid
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
            <p className="text-lg text-gray-600 mt-1">{invoice.invoice_number}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Invoice Date</p>
            <p className="text-lg font-semibold text-gray-900">{formatDate(invoice.invoice_date)}</p>
            <p className="text-sm text-gray-600 mt-2">Due Date</p>
            <p className="text-lg font-semibold text-gray-900">{formatDate(invoice.due_date)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
            <div className="text-gray-900">
              <p className="font-semibold text-lg">{invoice.client_name}</p>
              <p className="flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4 text-gray-400" />
                {invoice.client_email}
              </p>
              {invoice.billing_address && (
                <p className="flex items-start gap-2 mt-1">
                  <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                  <span>{JSON.stringify(invoice.billing_address)}</span>
                </p>
              )}
              <p className="text-sm text-gray-600 mt-2">
                Type: <span className="capitalize">{invoice.client_type || 'N/A'}</span>
              </p>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">From</h3>
            <div className="text-gray-900">
              <p className="font-semibold text-lg">DoktoChain Platform</p>
              <p className="flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4 text-gray-400" />
                billing@doktochain.com
              </p>
              <p className="flex items-start gap-2 mt-1">
                <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                <span>123 Healthcare Avenue, Toronto, ON M5H 2N2</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Invoice Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4 text-gray-900">{item.description}</td>
                    <td className="px-4 py-4 text-right text-gray-900">{item.quantity}</td>
                    <td className="px-4 py-4 text-right text-gray-900">{formatCurrency(Number(item.unit_price))}</td>
                    <td className="px-4 py-4 text-right font-semibold text-gray-900">
                      {formatCurrency(Number(item.total_price))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end mb-8">
          <div className="w-full md:w-1/2 space-y-3">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal:</span>
              <span className="font-semibold">{formatCurrency(Number(invoice.subtotal))}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Tax ({invoice.tax_rate}%):</span>
              <span className="font-semibold">{formatCurrency(Number(invoice.tax_amount))}</span>
            </div>
            <div className="border-t border-gray-300 pt-3 flex justify-between text-lg">
              <span className="font-bold text-gray-900">Total:</span>
              <span className="font-bold text-gray-900">{formatCurrency(Number(invoice.total_amount))}</span>
            </div>
            {invoice.paid_amount > 0 && (
              <>
                <div className="flex justify-between text-green-700">
                  <span>Paid:</span>
                  <span className="font-semibold">{formatCurrency(Number(invoice.paid_amount))}</span>
                </div>
                <div className="border-t border-gray-300 pt-3 flex justify-between text-lg">
                  <span className="font-bold text-gray-900">Balance Due:</span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(Number(invoice.total_amount) - Number(invoice.paid_amount))}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Payment Terms</h3>
              <p className="text-gray-700">{invoice.payment_terms || 'Net 30'}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Status</h3>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  invoice.status === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : invoice.status === 'overdue'
                    ? 'bg-red-100 text-red-800'
                    : invoice.status === 'sent'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </span>
            </div>
          </div>
          {invoice.notes && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Notes</h3>
              <p className="text-gray-700">{invoice.notes}</p>
            </div>
          )}
        </div>

        {invoice.paid_date && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">
              <strong>Paid on:</strong> {formatDate(invoice.paid_date)}
              {invoice.payment_method && ` via ${invoice.payment_method}`}
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showMarkPaidConfirm}
        onOpenChange={setShowMarkPaidConfirm}
        title="Mark as Paid"
        description="Mark this invoice as paid?"
        confirmLabel="Mark as Paid"
        onConfirm={() => {
          setShowMarkPaidConfirm(false);
          handleMarkAsPaid();
        }}
        loading={actionLoading}
      />
    </div>
  );
}
