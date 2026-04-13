import React, { useState } from 'react';
import { toast } from 'sonner';
import { BarChart, Download, FileText, TrendingUp } from 'lucide-react';

export default function HRMReportsPage() {
  const [reportType, setReportType] = useState('attendance');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  const reportTypes = [
    { value: 'attendance', label: 'Attendance Report', icon: FileText },
    { value: 'leave', label: 'Leave Report', icon: FileText },
    { value: 'payroll', label: 'Payroll Report', icon: FileText },
    { value: 'headcount', label: 'Headcount Report', icon: TrendingUp },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockData = {
        type: reportType,
        month: months[selectedMonth - 1],
        year: selectedYear,
        summary: {
          totalRecords: Math.floor(Math.random() * 500) + 100,
          processed: Math.floor(Math.random() * 400) + 80,
          pending: Math.floor(Math.random() * 50) + 10,
        },
        generated: new Date().toISOString(),
      };

      setReportData(mockData);
      toast.success('Report generated successfully!');
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) {
      toast.error('Please generate a report first');
      return;
    }

    const csvContent = `Report Type,${reportData.type}\nMonth,${reportData.month}\nYear,${reportData.year}\n\nTotal Records,${reportData.summary.totalRecords}\nProcessed,${reportData.summary.processed}\nPending,${reportData.summary.pending}\n\nGenerated,${new Date(reportData.generated).toLocaleString()}`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hrm_report_${reportData.type}_${reportData.month}_${reportData.year}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart className="w-6 h-6" />
            HRM Reports & Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            Generate and export comprehensive HR reports
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {reportTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {months.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {years.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            <FileText className="w-4 h-4" />
            {generating ? 'Generating...' : 'Generate Report'}
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!reportData}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
          >
            <Download className="w-4 h-4" />
            Export to CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Preview</h3>
        {reportData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600 font-medium">Total Records</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{reportData.summary.totalRecords}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600 font-medium">Processed</p>
                <p className="text-3xl font-bold text-green-900 mt-2">{reportData.summary.processed}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-yellow-600 font-medium">Pending</p>
                <p className="text-3xl font-bold text-yellow-900 mt-2">{reportData.summary.pending}</p>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600">
                Report Type: <span className="font-medium text-gray-900">{reportData.type}</span>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Period: <span className="font-medium text-gray-900">{reportData.month} {reportData.year}</span>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Generated: <span className="font-medium text-gray-900">{new Date(reportData.generated).toLocaleString()}</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Select parameters and click "Generate Report" to view results
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
