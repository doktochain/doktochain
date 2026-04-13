import { useParams } from 'react-router-dom';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Download, Printer, Send, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function InvoiceDetailsPage() {
  const { id } = useParams();
  const { currentColors } = useTheme();

  const invoice = {
    id: id,
    invoice_number: 'INV-001',
    issue_date: '2025-01-01',
    due_date: '2025-01-15',
    status: 'paid',
    from: {
      name: 'Your Practice Name',
      address: '123 Medical Center Dr',
      city: 'San Francisco, CA 94102',
      phone: '+1 (555) 123-4567',
      email: 'billing@practice.com',
    },
    to: {
      name: 'ABC Healthcare',
      address: '456 Health Plaza',
      city: 'San Francisco, CA 94103',
      phone: '+1 (555) 987-6543',
      email: 'accounts@abchealthcare.com',
    },
    items: [
      {
        id: '1',
        description: 'Consultation - Initial Visit',
        quantity: 1,
        unit_price: 200.00,
        amount: 200.00,
      },
      {
        id: '2',
        description: 'Lab Work - Blood Test',
        quantity: 1,
        unit_price: 150.00,
        amount: 150.00,
      },
      {
        id: '3',
        description: 'Follow-up Consultation',
        quantity: 2,
        unit_price: 150.00,
        amount: 300.00,
      },
    ],
    subtotal: 650.00,
    tax_rate: 8.5,
    tax_amount: 55.25,
    total: 705.25,
    notes: 'Thank you for your business. Payment is due within 15 days.',
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/dashboard/invoices"
          className="flex items-center gap-2 mb-6 hover:underline"
          style={{ color: currentColors.primary }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold" style={{ color: currentColors.text }}>
                  INVOICE
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                  #{invoice.invoice_number}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <Download className="w-5 h-5" style={{ color: currentColors.text }} />
                </button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <Printer className="w-5 h-5" style={{ color: currentColors.text }} />
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-white flex items-center gap-2"
                  style={{ backgroundColor: currentColors.primary }}
                >
                  <Send className="w-4 h-4" />
                  Send Invoice
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">FROM</h3>
                <div style={{ color: currentColors.text }}>
                  <p className="font-semibold">{invoice.from.name}</p>
                  <p className="text-sm">{invoice.from.address}</p>
                  <p className="text-sm">{invoice.from.city}</p>
                  <p className="text-sm">{invoice.from.phone}</p>
                  <p className="text-sm">{invoice.from.email}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">TO</h3>
                <div style={{ color: currentColors.text }}>
                  <p className="font-semibold">{invoice.to.name}</p>
                  <p className="text-sm">{invoice.to.address}</p>
                  <p className="text-sm">{invoice.to.city}</p>
                  <p className="text-sm">{invoice.to.phone}</p>
                  <p className="text-sm">{invoice.to.email}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Issue Date</h3>
                <p style={{ color: currentColors.text }}>{new Date(invoice.issue_date).toLocaleDateString()}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Due Date</h3>
                <p style={{ color: currentColors.text }}>{new Date(invoice.due_date).toLocaleDateString()}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Status</h3>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {invoice.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="p-8">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Description</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Qty</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Unit Price</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="py-4" style={{ color: currentColors.text }}>{item.description}</td>
                    <td className="py-4 text-right" style={{ color: currentColors.text }}>{item.quantity}</td>
                    <td className="py-4 text-right" style={{ color: currentColors.text }}>${item.unit_price.toFixed(2)}</td>
                    <td className="py-4 text-right font-semibold" style={{ color: currentColors.text }}>${item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-8 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span style={{ color: currentColors.text }}>${invoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Tax ({invoice.tax_rate}%):</span>
                  <span style={{ color: currentColors.text }}>${invoice.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-lg font-semibold" style={{ color: currentColors.text }}>Total:</span>
                  <span className="text-lg font-semibold" style={{ color: currentColors.text }}>${invoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Notes</h3>
                <p className="text-sm" style={{ color: currentColors.text }}>{invoice.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
