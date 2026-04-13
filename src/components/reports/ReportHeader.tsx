import { Download, Printer, RefreshCw, Calendar } from 'lucide-react';
import { ReactNode } from 'react';

interface ReportHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  onExport?: () => void;
  onPrint?: () => void;
  onRefresh?: () => void;
  showDateRange?: boolean;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  onDateRangeChange?: (start: string, end: string) => void;
  actions?: ReactNode;
}

export default function ReportHeader({
  title,
  description,
  icon,
  onExport,
  onPrint,
  onRefresh,
  showDateRange,
  dateRangeStart,
  dateRangeEnd,
  onDateRangeChange,
  actions,
}: ReportHeaderProps) {
  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (onDateRangeChange) {
      if (type === 'start') {
        onDateRangeChange(value, dateRangeEnd || '');
      } else {
        onDateRangeChange(dateRangeStart || '', value);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {description && (
              <p className="text-gray-600 mt-1">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
          {onPrint && (
            <button
              onClick={onPrint}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Print"
            >
              <Printer className="w-5 h-5" />
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          )}
        </div>
      </div>

      {showDateRange && (
        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
          <Calendar className="w-5 h-5 text-gray-400" />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">From:</label>
            <input
              type="date"
              value={dateRangeStart}
              onChange={(e) => handleDateChange('start', e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">To:</label>
            <input
              type="date"
              value={dateRangeEnd}
              onChange={(e) => handleDateChange('end', e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          {actions}
        </div>
      )}
    </div>
  );
}
