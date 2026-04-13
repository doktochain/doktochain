import React, { useState, useEffect } from 'react';
import { Calendar, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { leaveManagementService, LeaveType, LeaveBalance } from '../../services/leaveManagementService';
import { useAuth } from '../../contexts/AuthContext';

interface LeaveRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const LeaveRequestForm: React.FC<LeaveRequestFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  useEffect(() => {
    loadLeaveTypesAndBalances();
  }, [user]);

  const loadLeaveTypesAndBalances = async () => {
    if (!user) return;

    try {
      const [types, balances] = await Promise.all([
        leaveManagementService.getAllLeaveTypes(),
        leaveManagementService.getLeaveBalances(user.id),
      ]);

      setLeaveTypes(types);
      setLeaveBalances(balances);
    } catch (error) {
      console.error('Error loading leave data:', error);
    }
  };

  const calculateDays = () => {
    if (!formData.start_date || !formData.end_date) return 0;

    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const diff = end.getTime() - start.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;

    return days > 0 ? days : 0;
  };

  const getAvailableDays = () => {
    if (!formData.leave_type_id) return 0;

    const balance = leaveBalances.find(b => b.leave_type_id === formData.leave_type_id);
    return balance?.available_days || 0;
  };

  const validateForm = () => {
    if (!formData.leave_type_id) {
      setError('Please select a leave type');
      return false;
    }

    if (!formData.start_date || !formData.end_date) {
      setError('Please select start and end dates');
      return false;
    }

    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);

    if (end < start) {
      setError('End date must be after start date');
      return false;
    }

    const requestedDays = calculateDays();
    const availableDays = getAvailableDays();

    if (requestedDays > availableDays) {
      setError(`Insufficient leave balance. You have ${availableDays} days available.`);
      return false;
    }

    const selectedType = leaveTypes.find(t => t.id === formData.leave_type_id);
    if (selectedType?.max_consecutive_days && requestedDays > selectedType.max_consecutive_days) {
      setError(`Maximum ${selectedType.max_consecutive_days} consecutive days allowed for this leave type`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !validateForm()) return;

    try {
      setLoading(true);
      setError(null);

      await leaveManagementService.createLeaveRequest({
        ...formData,
        user_id: user.id,
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (error: any) {
      setError(error.message || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const requestedDays = calculateDays();
  const availableDays = getAvailableDays();
  const selectedType = leaveTypes.find(t => t.id === formData.leave_type_id);

  if (success) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Leave Request Submitted
        </h3>
        <p className="text-gray-600">
          Your leave request has been submitted successfully and is pending approval.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Request Leave
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Leave Type
          </label>
          <select
            value={formData.leave_type_id}
            onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select leave type</option>
            {leaveTypes.map(type => {
              const balance = leaveBalances.find(b => b.leave_type_id === type.id);
              return (
                <option key={type.id} value={type.id}>
                  {type.name} ({balance?.available_days || 0} days available)
                </option>
              );
            })}
          </select>

          {selectedType && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">{selectedType.name}:</span> {selectedType.description}
              </p>
              {selectedType.max_consecutive_days && (
                <p className="text-xs text-blue-600 mt-1">
                  Maximum {selectedType.max_consecutive_days} consecutive days allowed
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              min={formData.start_date || new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        {requestedDays > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Requested Days:</span>
              <span className="text-lg font-bold text-gray-900">{requestedDays}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Available Days:</span>
              <span className={`text-lg font-bold ${
                availableDays >= requestedDays ? 'text-green-600' : 'text-red-600'
              }`}>
                {availableDays}
              </span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Please provide a reason for your leave request..."
          />
        </div>

        <div className="flex items-center gap-3 pt-4 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={loading || requestedDays > availableDays}
            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
};
