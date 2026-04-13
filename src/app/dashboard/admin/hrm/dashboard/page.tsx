import React from 'react';
import { HRMDashboardStatsComponent } from '../../../../../components/hrm/HRMDashboardStats';

export default function HRMDashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">HRM Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Overview of human resource management metrics and statistics
        </p>
      </div>

      <HRMDashboardStatsComponent />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <a
              href="/dashboard/admin/hrm/attendance"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <h4 className="font-medium text-gray-900">Mark Attendance</h4>
              <p className="text-sm text-gray-600 mt-1">
                Record daily attendance for employees
              </p>
            </a>

            <a
              href="/dashboard/admin/hrm/leaves"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <h4 className="font-medium text-gray-900">Manage Leave Requests</h4>
              <p className="text-sm text-gray-600 mt-1">
                Review and approve pending leave requests
              </p>
            </a>

            <a
              href="/dashboard/admin/hrm/payroll"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <h4 className="font-medium text-gray-900">Process Payroll</h4>
              <p className="text-sm text-gray-600 mt-1">
                Generate and manage employee payslips
              </p>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-gray-900">System ready for use</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  All HRM modules are now available
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
