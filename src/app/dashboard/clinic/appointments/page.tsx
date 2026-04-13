import { useState, useEffect } from 'react';
import { Calendar, Search, Filter, Eye, CheckCircle, Clock, XCircle, ChevronDown, User, Video, MapPin, X } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { clinicService, Clinic, ClinicAffiliation } from '../../../../services/clinicService';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled' },
  confirmed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Confirmed' },
  checked_in: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Checked In' },
  in_progress: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'In Progress' },
  completed: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Completed' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
  no_show: { bg: 'bg-red-100', text: 'text-red-600', label: 'No Show' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
};

export default function ClinicAppointmentsPage() {
  const { user } = useAuth();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [affiliations, setAffiliations] = useState<ClinicAffiliation[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [updating, setUpdating] = useState('');

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    try {
      const c = await clinicService.getClinicByOwnerId(user!.id);
      setClinic(c);
      if (c) {
        const affs = await clinicService.getClinicAffiliations(c.id);
        const active = affs.filter(a => a.status === 'active');
        setAffiliations(active);
        const provIds = active.map(a => a.provider_id);
        if (provIds.length > 0) {
          const appts = await clinicService.getClinicAppointments(provIds);
          setAppointments(appts);
        }
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (apptId: string, newStatus: string) => {
    setUpdating(apptId);
    try {
      await clinicService.updateAppointmentStatus(apptId, newStatus);
      setAppointments(prev => prev.map(a => a.id === apptId ? { ...a, status: newStatus } : a));
      if (selectedAppt?.id === apptId) {
        setSelectedAppt((prev: any) => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating('');
    }
  };

  const patientName = (appt: any) => {
    const p = appt.patients?.user_profiles;
    return p ? `${p.first_name} ${p.last_name}` : 'Unknown Patient';
  };

  const providerName = (appt: any) => {
    const p = appt.providers?.user_profiles;
    return p ? `Dr. ${p.first_name} ${p.last_name}` : 'Unknown Provider';
  };

  const filtered = appointments.filter(appt => {
    if (statusFilter !== 'all' && appt.status !== statusFilter) return false;
    if (providerFilter !== 'all' && appt.provider_id !== providerFilter) return false;
    if (dateFilter && appt.appointment_date !== dateFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const pName = patientName(appt).toLowerCase();
      const dName = providerName(appt).toLowerCase();
      if (!pName.includes(q) && !dName.includes(q) && !appt.reason_for_visit?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = {
    all: appointments.length,
    scheduled: appointments.filter(a => a.status === 'scheduled').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Calendar size={48} className="text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Clinic Found</h2>
          <p className="text-gray-500">Your clinic hasn't been set up yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">All Appointments</h1>
        <p className="text-gray-500 mt-1">View and manage appointments across all providers</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: 'all', label: 'Total', count: counts.all, color: 'bg-blue-600' },
          { key: 'scheduled', label: 'Scheduled', count: counts.scheduled, color: 'bg-blue-500' },
          { key: 'confirmed', label: 'Confirmed', count: counts.confirmed, color: 'bg-green-500' },
          { key: 'completed', label: 'Completed', count: counts.completed, color: 'bg-gray-500' },
          { key: 'cancelled', label: 'Cancelled', count: counts.cancelled, color: 'bg-red-500' },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setStatusFilter(item.key)}
            className={`p-4 rounded-xl border transition text-left ${
              statusFilter === item.key ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${item.color} mb-2`} />
            <p className="text-2xl font-bold text-gray-800">{item.count}</p>
            <p className="text-xs text-gray-500">{item.label}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search patient, provider, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Providers</option>
            {affiliations.map(aff => (
              <option key={aff.provider_id} value={aff.provider_id}>
                Dr. {aff.providers?.user_profiles?.first_name} {aff.providers?.user_profiles?.last_name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
          {(statusFilter !== 'all' || providerFilter !== 'all' || dateFilter || searchQuery) && (
            <button
              onClick={() => { setStatusFilter('all'); setProviderFilter('all'); setDateFilter(''); setSearchQuery(''); }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-700">No appointments found</p>
            <p className="text-sm text-gray-500 mt-1">Adjust your filters or wait for new appointments</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Patient</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Provider</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date & Time</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Reason</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(appt => {
                  const sc = STATUS_CONFIG[appt.status] || STATUS_CONFIG.scheduled;
                  return (
                    <tr key={appt.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                            {patientName(appt).charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{patientName(appt)}</p>
                            <p className="text-xs text-gray-400">{appt.patients?.user_profiles?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-700">{providerName(appt)}</p>
                        <p className="text-xs text-gray-400">{appt.providers?.specialty}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-800">{appt.appointment_date ? new Date(appt.appointment_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</p>
                        <p className="text-xs text-gray-500">{appt.start_time?.slice(0, 5)} - {appt.end_time?.slice(0, 5)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {appt.visit_type === 'video' ? <Video size={14} className="text-blue-500" /> : <MapPin size={14} className="text-gray-400" />}
                          <span className="text-xs font-medium text-gray-600 capitalize">{appt.visit_type || appt.appointment_type || 'General'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-600 max-w-[160px] truncate">{appt.reason_for_visit || '-'}</p>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedAppt(appt)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          {appt.status === 'scheduled' && (
                            <button
                              onClick={() => handleStatusUpdate(appt.id, 'confirmed')}
                              disabled={updating === appt.id}
                              className="px-2.5 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition disabled:opacity-50"
                            >
                              Confirm
                            </button>
                          )}
                          {appt.status === 'confirmed' && (
                            <button
                              onClick={() => handleStatusUpdate(appt.id, 'checked_in')}
                              disabled={updating === appt.id}
                              className="px-2.5 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium hover:bg-teal-100 transition disabled:opacity-50"
                            >
                              Check In
                            </button>
                          )}
                          {['scheduled', 'confirmed'].includes(appt.status) && (
                            <button
                              onClick={() => handleStatusUpdate(appt.id, 'cancelled')}
                              disabled={updating === appt.id}
                              className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition"
                              title="Cancel"
                            >
                              <XCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedAppt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Appointment Details</h3>
                <button onClick={() => setSelectedAppt(null)} className="text-white/80 hover:text-white transition">
                  <X size={20} />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
                  {STATUS_CONFIG[selectedAppt.status]?.label || selectedAppt.status}
                </span>
                <span className="text-sm text-blue-200 capitalize">{selectedAppt.visit_type || 'In-Person'}</span>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Patient</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{patientName(selectedAppt)}</p>
                  <p className="text-xs text-gray-400">{selectedAppt.patients?.user_profiles?.email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Provider</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{providerName(selectedAppt)}</p>
                  <p className="text-xs text-gray-400">{selectedAppt.providers?.specialty}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Date</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">
                    {selectedAppt.appointment_date ? new Date(selectedAppt.appointment_date).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Time</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{selectedAppt.start_time?.slice(0, 5)} - {selectedAppt.end_time?.slice(0, 5)}</p>
                </div>
              </div>
              {selectedAppt.reason_for_visit && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Reason for Visit</p>
                  <p className="text-sm text-gray-700 mt-0.5">{selectedAppt.reason_for_visit}</p>
                </div>
              )}
              {selectedAppt.chief_complaint && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Chief Complaint</p>
                  <p className="text-sm text-gray-700 mt-0.5">{selectedAppt.chief_complaint}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {selectedAppt.status === 'scheduled' && (
                  <button
                    onClick={() => handleStatusUpdate(selectedAppt.id, 'confirmed')}
                    disabled={updating === selectedAppt.id}
                    className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
                  >
                    Confirm
                  </button>
                )}
                {selectedAppt.status === 'confirmed' && (
                  <button
                    onClick={() => handleStatusUpdate(selectedAppt.id, 'checked_in')}
                    disabled={updating === selectedAppt.id}
                    className="flex-1 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50"
                  >
                    Check In
                  </button>
                )}
                {selectedAppt.status === 'checked_in' && (
                  <button
                    onClick={() => handleStatusUpdate(selectedAppt.id, 'completed')}
                    disabled={updating === selectedAppt.id}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    Complete
                  </button>
                )}
                {['scheduled', 'confirmed'].includes(selectedAppt.status) && (
                  <button
                    onClick={() => handleStatusUpdate(selectedAppt.id, 'cancelled')}
                    disabled={updating === selectedAppt.id}
                    className="px-4 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
