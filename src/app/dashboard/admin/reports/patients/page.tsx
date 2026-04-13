import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { ReportsService } from '../../../../../services/reportsService';
import ReportHeader from '../../../../../components/reports/ReportHeader';
import ReportCard from '../../../../../components/reports/ReportCard';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

export default function PatientReportPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await ReportsService.getPatientAnalytics({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading patient analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!analytics) return;

    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Patients', analytics.totalPatients.toString()],
      ['New Patients', analytics.newPatients.toString()],
      ['Active Patients', analytics.activePatients.toString()],
      ['Inactive Patients', analytics.inactivePatients.toString()],
      ['Average Visits per Patient', analytics.engagement.averageVisitsPerPatient.toFixed(2)],
      ['Retention Rate', `${analytics.engagement.retentionRate.toFixed(2)}%`],
      ['', ''],
      ['Demographics - Age Groups', ''],
      ...Object.entries(analytics.demographics.byAge).map(([k, v]: [string, any]) => [k, v.toString()]),
      ['', ''],
      ['Demographics - Gender', ''],
      ...Object.entries(analytics.demographics.byGender).map(([k, v]: [string, any]) => [k, v.toString()]),
    ];
    const blob = ReportsService.exportToCSV(headers, rows);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patient-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    a.click();
  };

  const ageChartData = analytics
    ? Object.entries(analytics.demographics.byAge).map(([key, value]) => ({
        name: key,
        value: value as number,
      }))
    : [];

  const genderChartData = analytics
    ? Object.entries(analytics.demographics.byGender).map(([key, value]) => ({
        name: key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        value: value as number,
      }))
    : [];

  const provinceChartData = analytics
    ? Object.entries(analytics.demographics.byProvince)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 10)
        .map(([key, value]) => ({
          name: key,
          value: value as number,
        }))
    : [];

  return (
    <div className="p-6 space-y-6">
      <ReportHeader
        title="Patient Report"
        description="Demographics, engagement metrics, and patient population analytics"
        icon={<Users className="w-8 h-8 text-teal-600" />}
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
              title="Total Patients"
              value={analytics.totalPatients}
              icon={<Users className="w-6 h-6" />}
              color="blue"
              subtitle="All registered"
            />
            <ReportCard
              title="New Patients"
              value={analytics.newPatients}
              icon={<Users className="w-6 h-6" />}
              color="green"
              subtitle="In selected period"
            />
            <ReportCard
              title="Active Patients"
              value={analytics.activePatients}
              icon={<Users className="w-6 h-6" />}
              color="blue"
              subtitle="With appointments"
            />
            <ReportCard
              title="Retention Rate"
              value={`${analytics.engagement.retentionRate.toFixed(1)}%`}
              icon={<Users className="w-6 h-6" />}
              color="yellow"
              subtitle="Active patients"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Age Distribution</h3>
              {ageChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={ageChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {ageChartData.map((entry, index) => (
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Gender Distribution</h3>
              {genderChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={genderChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {genderChartData.map((entry, index) => (
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

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Registration Trend</h3>
            {analytics.registrationTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.registrationTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-500 py-8">No data available</div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Provinces</h3>
              <div className="space-y-3">
                {provinceChartData.map((item, index) => {
                  const percentage = analytics.totalPatients > 0
                    ? ((item.value / analytics.totalPatients) * 100).toFixed(1)
                    : 0;
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">{item.name}</span>
                        <span className="text-sm font-bold text-gray-900">{item.value} patients</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{percentage}% of total</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Metrics</h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Average Visits per Patient</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">
                    {analytics.engagement.averageVisitsPerPatient.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Patient Retention Rate</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {analytics.engagement.retentionRate.toFixed(1)}%
                  </p>
                </div>
                <div className="p-4 bg-teal-50 rounded-lg">
                  <p className="text-sm text-gray-600">Active vs Inactive</p>
                  <p className="text-lg font-semibold text-teal-600 mt-1">
                    {analytics.activePatients} active / {analytics.inactivePatients} inactive
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500 py-12">No data available</div>
      )}
    </div>
  );
}
