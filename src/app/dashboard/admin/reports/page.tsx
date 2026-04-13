import { Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  FileText,
  Settings,
  DollarSign,
  Receipt,
} from 'lucide-react';

const reportCategories = [
  {
    title: 'Financial Reports',
    icon: <DollarSign className="w-6 h-6" />,
    color: 'bg-green-100 text-green-600',
    reports: [
      {
        name: 'Income Report',
        description: 'Track all revenue streams and income sources',
        icon: <TrendingUp className="w-5 h-5" />,
        path: '/dashboard/admin/reports/income',
        color: 'text-green-600',
      },
      {
        name: 'Expenses Report',
        description: 'Monitor operational costs and expenses',
        icon: <Receipt className="w-5 h-5" />,
        path: '/dashboard/admin/reports/expenses',
        color: 'text-red-600',
      },
      {
        name: 'Profit & Loss',
        description: 'Comprehensive P&L statement with trends',
        icon: <BarChart3 className="w-5 h-5" />,
        path: '/dashboard/admin/reports/profit-loss',
        color: 'text-blue-600',
      },
    ],
  },
  {
    title: 'Operational Reports',
    icon: <Calendar className="w-6 h-6" />,
    color: 'bg-blue-100 text-blue-600',
    reports: [
      {
        name: 'Appointment Report',
        description: 'Analyze appointment trends and metrics',
        icon: <Calendar className="w-5 h-5" />,
        path: '/dashboard/admin/reports/appointments',
        color: 'text-blue-600',
      },
      {
        name: 'Patient Report',
        description: 'Patient demographics and engagement metrics',
        icon: <Users className="w-5 h-5" />,
        path: '/dashboard/admin/reports/patients',
        color: 'text-teal-600',
      },
    ],
  },
  {
    title: 'Custom Reports',
    icon: <Settings className="w-6 h-6" />,
    color: 'bg-teal-100 text-teal-600',
    reports: [
      {
        name: 'Custom Report Builder',
        description: 'Build custom reports with advanced filters',
        icon: <FileText className="w-5 h-5" />,
        path: '/dashboard/admin/reports/custom',
        color: 'text-teal-600',
      },
    ],
  },
];

export default function ReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Reports & Analytics
          </h1>
          <p className="text-gray-600 mt-2">
            Comprehensive reporting dashboard for business intelligence and insights
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Quick Stats</h3>
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">8</p>
          <p className="text-sm text-gray-600 mt-1">Available Reports</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Last Updated</h3>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">Live</p>
          <p className="text-sm text-gray-600 mt-1">Real-time data</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Export Formats</h3>
            <div className="p-2 bg-teal-100 rounded-lg">
              <FileText className="w-5 h-5 text-teal-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">CSV</p>
          <p className="text-sm text-gray-600 mt-1">Exportable data</p>
        </div>
      </div>

      {reportCategories.map((category) => (
        <div key={category.title} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${category.color}`}>
              {category.icon}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{category.title}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {category.reports.map((report) => (
              <Link
                key={report.path}
                to={report.path}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 bg-gray-100 rounded-lg group-hover:bg-blue-50 transition-colors ${report.color}`}>
                    {report.icon}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {report.name}
                </h3>
                <p className="text-sm text-gray-600">{report.description}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Need a Custom Report?
            </h3>
            <p className="text-gray-700 mb-4">
              Use our Custom Report Builder to create tailored reports with advanced filtering,
              grouping, and visualization options. Save your custom reports for future use.
            </p>
            <Link
              to="/dashboard/admin/reports/custom"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Build Custom Report
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
