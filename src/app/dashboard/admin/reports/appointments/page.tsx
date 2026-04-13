import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { ReportsService } from '../../../../../services/reportsService';
import ReportHeader from '../../../../../components/reports/ReportHeader';
import ReportCard from '../../../../../components/reports/ReportCard';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export default function AppointmentReportPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await ReportsService.getAppointmentAnalytics({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading appointment analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!analytics) return;

    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Appointments', analytics.totalAppointments.toString()],
      ['Average Duration', `${analytics.averageDuration} minutes`],
      ['Cancellation Rate', `${analytics.cancellationRate.toFixed(2)}%`],
      ['No-Show Rate', `${analytics.noShowRate.toFixed(2)}%`],
      ['', ''],
      ['Appointments by Status', ''],
      ...Object.entries(analytics.byStatus).map(([k, v]: [string, any]) => [k, v.toString()]),
      ['', ''],
      ['Appointments by Type', ''],
      ...Object.entries(analytics.byType).map(([k, v]: [string, any]) => [k, v.toString()]),
    ];
    const blob = ReportsService.exportToCSV(headers, rows);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointment-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    a.click();
  };

  const statusChartData = analytics
    ? Object.entries(analytics.byStatus).map(([key, value]) => ({
        name: key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        value: value,
      }))
    : [];

  const typeChartData = analytics
    ? Object.entries(analytics.byType).map(([key, value]) => ({
        name: key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        value: value,
      }))
    : [];

  const peakHoursData = analytics
    ? Object.entries(analytics.peakHours)
        .map(([hour, count]) => ({
          hour: `${hour}:00`,
          count: count,
        }))
        .sort((a, b) => parseInt(a.hour) - parseInt(b.hour))
    : [];

  const peakDaysData = analytics
    ? Object.entries(analytics.peakDays).map(([day, count]) => ({
        day,
        count: count,
      }))
    : [];

  return (
    <div className="p-6 space-y-6">
      <ReportHeader
        title="Appointment Report"
        description="Comprehensive analytics of appointment trends, patterns, and utilization metrics"
        icon={<Calendar className="w-8 h-8 text-blue-600" />}
        onExport={handleExport}
        onRefresh={loadData}
        showDateRange
        dateRangeStart={dateRange.startDate}
        dateRangeEnd={dateRange.endDate}
        onDateRangeChange={(start, end) => setDateRange({ startDate: start, endDate: end })}
      />

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : analytics ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReportCard
              title="Total Appointments"
              value={analytics.totalAppointments}
              icon={<Calendar className="w-6 h-6" />}
              color="blue"
              subtitle="All appointments"
            />
            <ReportCard
              title="Cancellation Rate"
              value={`${analytics.cancellationRate.toFixed(1)}%`}
              icon={<Calendar className="w-6 h-6" />}
              color="red"
              subtitle="Cancelled appointments"
            />
            <ReportCard
              title="No-Show Rate"
              value={`${analytics.noShowRate.toFixed(1)}%`}
              icon={<Calendar className="w-6 h-6" />}
              color="yellow"
              subtitle="Missed appointments"
            />
            <ReportCard
              title="Avg Duration"
              value={`${analytics.averageDuration} min`}
              icon={<Calendar className="w-6 h-6" />}
              color="green"
              subtitle="Per appointment"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointments by Status</h3>
              {statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500 py-8">No data available</div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointments by Type</h3>
              {typeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={typeChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {typeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500 py-8">No data available</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Hours</h3>
              {peakHoursData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={peakHoursData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500 py-8">No data available</div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Days</h3>
              {peakDaysData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={peakDaysData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500 py-8">No data available</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Providers by Appointment Volume</h3>
            <div className="space-y-3">
              {analytics.byProvider.slice(0, 10).map((provider: any, index: number) => (
                <div key={provider.providerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-500 w-6">{index + 1}</span>
                    <span className="text-sm font-medium text-gray-900">{provider.providerName}</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{provider.count} appointments</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500 py-12">No data available</div>
      )}
    </div>
  );
}
