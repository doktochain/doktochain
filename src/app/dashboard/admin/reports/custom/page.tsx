import { useState } from 'react';
import { toast } from 'sonner';
import { Settings, Play, Download } from 'lucide-react';
import ReportHeader from '../../../../../components/reports/ReportHeader';
import ReportTable, { ReportTableColumn } from '../../../../../components/reports/ReportTable';
import { supabase } from '../../../../../lib/supabase';
import { ReportsService } from '../../../../../services/reportsService';

const dataSources = [
  { value: 'appointments', label: 'Appointments' },
  { value: 'user_profiles', label: 'Patients' },
  { value: 'platform_income', label: 'Income' },
  { value: 'platform_expenses', label: 'Expenses' },
  { value: 'marketplace_transaction_logs', label: 'Transactions' },
];

const fieldsBySource: Record<string, any[]> = {
  appointments: [
    { value: 'appointment_date', label: 'Date', type: 'date' },
    { value: 'status', label: 'Status', type: 'text' },
    { value: 'appointment_type', label: 'Type', type: 'text' },
    { value: 'reason', label: 'Reason', type: 'text' },
  ],
  user_profiles: [
    { value: 'first_name', label: 'First Name', type: 'text' },
    { value: 'last_name', label: 'Last Name', type: 'text' },
    { value: 'email', label: 'Email', type: 'text' },
    { value: 'province', label: 'Province', type: 'text' },
    { value: 'gender', label: 'Gender', type: 'text' },
  ],
  platform_income: [
    { value: 'income_date', label: 'Date', type: 'date' },
    { value: 'income_source', label: 'Source', type: 'text' },
    { value: 'amount', label: 'Amount', type: 'number' },
    { value: 'description', label: 'Description', type: 'text' },
  ],
  platform_expenses: [
    { value: 'expense_date', label: 'Date', type: 'date' },
    { value: 'expense_category', label: 'Category', type: 'text' },
    { value: 'amount', label: 'Amount', type: 'number' },
    { value: 'vendor_name', label: 'Vendor', type: 'text' },
    { value: 'status', label: 'Status', type: 'text' },
  ],
  marketplace_transaction_logs: [
    { value: 'created_at', label: 'Date', type: 'date' },
    { value: 'transaction_type', label: 'Type', type: 'text' },
    { value: 'amount', label: 'Amount', type: 'number' },
    { value: 'status', label: 'Status', type: 'text' },
  ],
};

export default function CustomReportBuilderPage() {
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);

  const handleFieldToggle = (field: string) => {
    if (selectedFields.includes(field)) {
      setSelectedFields(selectedFields.filter((f) => f !== field));
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const generateReport = async () => {
    if (!selectedSource || selectedFields.length === 0) {
      toast.error('Please select a data source and at least one field');
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from(selectedSource)
        .select(selectedFields.join(','))
        .limit(1000);

      if (dateRange.startDate && dateRange.endDate) {
        const dateField = fieldsBySource[selectedSource].find((f) => f.type === 'date')?.value;
        if (dateField) {
          query = query
            .gte(dateField, dateRange.startDate)
            .lte(dateField, dateRange.endDate);
        }
      }

      if (selectedSource === 'user_profiles') {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      setReportData(data || []);
      setReportGenerated(true);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Error generating report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (reportData.length === 0) return;

    const headers = selectedFields.map((field) => {
      const fieldDef = fieldsBySource[selectedSource]?.find((f) => f.value === field);
      return fieldDef?.label || field;
    });

    const rows = reportData.map((row) =>
      selectedFields.map((field) => {
        const value = row[field];
        if (value === null || value === undefined) return '-';
        if (typeof value === 'object') return JSON.stringify(value);
        return value.toString();
      })
    );

    const blob = ReportsService.exportToCSV(headers, rows);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom-report-${selectedSource}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const columns: ReportTableColumn[] = selectedFields.map((field) => {
    const fieldDef = fieldsBySource[selectedSource]?.find((f) => f.value === field);
    return {
      key: field,
      label: fieldDef?.label || field,
      render: (value) => {
        if (value === null || value === undefined) return '-';
        if (fieldDef?.type === 'date' && value) {
          return new Date(value).toLocaleDateString();
        }
        if (fieldDef?.type === 'number' && value) {
          return value.toLocaleString();
        }
        return value.toString();
      },
    };
  });

  return (
    <div className="p-6 space-y-6">
      <ReportHeader
        title="Custom Report Builder"
        description="Build custom reports by selecting data sources, fields, and filters"
        icon={<Settings className="w-8 h-8 text-teal-600" />}
        onExport={reportGenerated ? handleExport : undefined}
      />

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Configuration</h3>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Source
            </label>
            <select
              value={selectedSource}
              onChange={(e) => {
                setSelectedSource(e.target.value);
                setSelectedFields([]);
                setReportGenerated(false);
              }}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a data source</option>
              {dataSources.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </select>
          </div>

          {selectedSource && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Fields
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {fieldsBySource[selectedSource]?.map((field) => (
                    <label
                      key={field.value}
                      className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field.value)}
                        onChange={() => handleFieldToggle(field.value)}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range (Optional)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">From</label>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) =>
                        setDateRange({ ...dateRange, startDate: e.target.value })
                      }
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">To</label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) =>
                        setDateRange({ ...dateRange, endDate: e.target.value })
                      }
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={generateReport}
                  disabled={loading || selectedFields.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Play className="w-5 h-5" />
                  {loading ? 'Generating...' : 'Generate Report'}
                </button>

                {reportGenerated && (
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Export CSV
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {reportGenerated && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Report Results
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({reportData.length} rows)
              </span>
            </h3>
          </div>
          <ReportTable
            columns={columns}
            data={reportData}
            loading={loading}
            emptyMessage="No data found matching your criteria"
          />
        </div>
      )}

      {!selectedSource && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Use</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Select a data source from the dropdown</li>
            <li>Choose the fields you want to include in your report</li>
            <li>Optionally set a date range to filter the data</li>
            <li>Click Generate Report to view your custom report</li>
            <li>Export the results to CSV for further analysis</li>
          </ol>
        </div>
      )}
    </div>
  );
}
