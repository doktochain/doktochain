import { useState, useEffect, useMemo } from 'react';
import { Users, Search, Plus, Eye, X, Clock, Shield, AlertTriangle, CheckCircle, MoreVertical, Activity, Download } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { clinicService, Clinic } from '../../../../services/clinicService';

interface StaffMember {
  id: string;
  clinic_id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  status: string;
  is_on_duty: boolean;
  duty_start_time?: string;
  duty_end_time?: string;
  duty_days?: number[];
  last_login_at?: string;
  avatar_url?: string;
  created_at: string;
}

interface ActivityLog {
  id: string;
  staff_id: string;
  action_type: string;
  action_description: string;
  resource_type?: string;
  ip_address?: string;
  created_at: string;
  staff?: { first_name: string; last_name: string; role: string };
}

type TabType = 'staff' | 'activity';
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ROLES = ['receptionist', 'nurse', 'admin', 'billing', 'lab_tech', 'medical_assistant', 'it_support'];

export default function ClinicStaffPage() {
  const { user } = useAuth();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<TabType>('staff');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newStaff, setNewStaff] = useState({
    first_name: '', last_name: '', email: '', phone: '', role: 'receptionist',
    department: '', duty_start_time: '09:00', duty_end_time: '17:00', duty_days: [1, 2, 3, 4, 5] as number[],
  });

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    try {
      const c = await clinicService.getClinicByOwnerId(user!.id);
      setClinic(c);
      if (c) {
        const [staffData, activityData] = await Promise.all([
          clinicService.getClinicStaff(c.id),
          clinicService.getStaffActivityLog(c.id, 100),
        ]);
        setStaff(staffData || []);
        setActivities((activityData || []).map((a: any) => ({ ...a, staff: a.clinic_staff })));
      }
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = useMemo(() => {
    let list = staff;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    }
    if (roleFilter !== 'all') list = list.filter(s => s.role === roleFilter);
    if (statusFilter !== 'all') list = list.filter(s => s.status === statusFilter);
    return list;
  }, [staff, searchQuery, roleFilter, statusFilter]);

  const isCurrentlyOnDuty = (s: StaffMember) => {
    if (s.status !== 'active') return false;
    const now = new Date();
    const currentDay = now.getDay();
    if (s.duty_days && !s.duty_days.includes(currentDay)) return false;
    if (s.duty_start_time && s.duty_end_time) {
      const nowTime = now.toTimeString().slice(0, 5);
      return nowTime >= s.duty_start_time && nowTime <= s.duty_end_time;
    }
    return s.is_on_duty;
  };

  const handleAddStaff = async () => {
    if (!clinic) return;
    setSaving(true);
    try {
      await clinicService.addStaffMember({
        clinic_id: clinic.id,
        ...newStaff,
      });
      setShowAddModal(false);
      setNewStaff({ first_name: '', last_name: '', email: '', phone: '', role: 'receptionist', department: '', duty_start_time: '09:00', duty_end_time: '17:00', duty_days: [1, 2, 3, 4, 5] });
      await loadData();
    } catch (error) {
      console.error('Error adding staff:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateStaffStatus = async (staffId: string, status: string) => {
    try {
      await clinicService.updateStaffStatus(staffId, status);
      setActionMenuId(null);
      await loadData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const toggleDuty = async (staffId: string, onDuty: boolean) => {
    try {
      if (clinic) {
        await clinicService.toggleStaffDuty(staffId, onDuty, clinic.id);
      }
      await loadData();
    } catch (error) {
      console.error('Error toggling duty:', error);
    }
  };

  const onDutyCount = staff.filter(isCurrentlyOnDuty).length;
  const activeCount = staff.filter(s => s.status === 'active').length;

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
          <Users size={48} className="text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Clinic Found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Staff Management</h1>
          <p className="text-gray-500 mt-1">{activeCount} active staff, {onDutyCount} currently on duty</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
          <Plus size={16} /> Add Staff
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff', value: staff.length, icon: Users, bg: 'bg-blue-50', color: 'text-blue-600' },
          { label: 'Active', value: activeCount, icon: CheckCircle, bg: 'bg-green-50', color: 'text-green-600' },
          { label: 'On Duty Now', value: onDutyCount, icon: Clock, bg: 'bg-amber-50', color: 'text-amber-600' },
          { label: 'Suspended', value: staff.filter(s => s.status === 'suspended').length, icon: AlertTriangle, bg: 'bg-red-50', color: 'text-red-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}><c.icon size={20} className={c.color} /></div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{c.value}</p>
                <p className="text-xs text-gray-500">{c.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button onClick={() => setActiveTab('staff')} className={`px-4 py-3 text-sm font-medium border-b-2 transition ${activeTab === 'staff' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
          <div className="flex items-center gap-2"><Users size={16} /> Staff List</div>
        </button>
        <button onClick={() => setActiveTab('activity')} className={`px-4 py-3 text-sm font-medium border-b-2 transition ${activeTab === 'activity' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
          <div className="flex items-center gap-2"><Activity size={16} /> Activity Log</div>
        </button>
      </div>

      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search staff..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="all">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Staff</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Role</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Duty Hours</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Duty Days</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">On Duty</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStaff.map(s => {
                    const onDuty = isCurrentlyOnDuty(s);
                    return (
                      <tr key={s.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                              {s.first_name[0]}{s.last_name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</p>
                              <p className="text-xs text-gray-400">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">{s.role.replace('_', ' ')}</span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600">
                          {s.duty_start_time && s.duty_end_time ? `${s.duty_start_time.slice(0, 5)} - ${s.duty_end_time.slice(0, 5)}` : '-'}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-1">
                            {DAY_LABELS.map((d, i) => (
                              <span key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                s.duty_days?.includes(i) ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                              }`}>{d[0]}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${
                            s.status === 'active' ? 'bg-green-50 text-green-700 border-green-300' :
                            s.status === 'suspended' ? 'bg-red-50 text-red-600 border-red-300' :
                            'bg-gray-50 text-gray-500 border-gray-300'
                          }`}>{s.status}</span>
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => toggleDuty(s.id, !s.is_on_duty)}
                            className={`relative w-10 h-5 rounded-full transition ${s.is_on_duty ? 'bg-green-500' : 'bg-gray-300'}`}
                          >
                            <span className={`absolute top-0.5 ${s.is_on_duty ? 'right-0.5' : 'left-0.5'} w-4 h-4 rounded-full bg-white shadow transition-all`} />
                          </button>
                        </td>
                        <td className="px-5 py-4 text-right relative">
                          <button onClick={() => setActionMenuId(actionMenuId === s.id ? null : s.id)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100">
                            <MoreVertical size={16} />
                          </button>
                          {actionMenuId === s.id && (
                            <div className="absolute right-5 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-40">
                              <button onClick={() => { setSelectedStaff(s); setActionMenuId(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">View Details</button>
                              {s.status === 'active' && <button onClick={() => updateStaffStatus(s.id, 'suspended')} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Suspend</button>}
                              {s.status === 'suspended' && <button onClick={() => updateStaffStatus(s.id, 'active')} className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50">Reactivate</button>}
                              {s.status !== 'inactive' && <button onClick={() => updateStaffStatus(s.id, 'inactive')} className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 border-t border-gray-100">Deactivate</button>}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStaff.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center">
                        <Users size={40} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-medium text-gray-700">No staff members yet</p>
                        <p className="text-sm text-gray-500 mt-1">Add your first staff member to get started</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shield size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Access Control Policy</p>
                <p className="text-xs text-amber-700 mt-1">Staff members can only access the clinic portal when they are on duty (within their scheduled duty hours and days). Off-duty staff will see restricted access. All actions are logged for audit purposes.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Staff Activity Log</h3>
            <p className="text-xs text-gray-500 mt-1">All staff actions are tracked for security and compliance</p>
          </div>
          {activities.length === 0 ? (
            <div className="p-12 text-center">
              <Activity size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No activity recorded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {activities.map(a => (
                <div key={a.id} className="px-5 py-3 hover:bg-gray-50 transition flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    a.action_type.includes('login') || a.action_type.includes('clock_in') ? 'bg-green-100 text-green-600' :
                    a.action_type.includes('logout') || a.action_type.includes('clock_out') ? 'bg-red-100 text-red-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    <Activity size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{a.action_description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {a.staff && <span className="text-xs text-gray-500">{a.staff.first_name} {a.staff.last_name} ({a.staff.role})</span>}
                      {a.ip_address && <span className="text-xs text-gray-400">IP: {a.ip_address}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(a.created_at).toLocaleString('en-CA', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">Add Staff Member</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input type="text" value={newStaff.first_name} onChange={(e) => setNewStaff(p => ({ ...p, first_name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input type="text" value={newStaff.last_name} onChange={(e) => setNewStaff(p => ({ ...p, last_name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={newStaff.email} onChange={(e) => setNewStaff(p => ({ ...p, email: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="text" value={newStaff.phone} onChange={(e) => setNewStaff(p => ({ ...p, phone: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={newStaff.role} onChange={(e) => setNewStaff(p => ({ ...p, role: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input type="text" value={newStaff.department} onChange={(e) => setNewStaff(p => ({ ...p, department: e.target.value }))} placeholder="Optional" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duty Start</label>
                  <input type="time" value={newStaff.duty_start_time} onChange={(e) => setNewStaff(p => ({ ...p, duty_start_time: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duty End</label>
                  <input type="time" value={newStaff.duty_end_time} onChange={(e) => setNewStaff(p => ({ ...p, duty_end_time: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
                <div className="flex gap-2">
                  {DAY_LABELS.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setNewStaff(p => ({
                        ...p,
                        duty_days: p.duty_days.includes(i)
                          ? p.duty_days.filter(x => x !== i)
                          : [...p.duty_days, i].sort()
                      }))}
                      className={`w-10 h-10 rounded-full text-xs font-bold transition ${
                        newStaff.duty_days.includes(i) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >{d}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-200">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddStaff} disabled={saving || !newStaff.first_name || !newStaff.last_name || !newStaff.email} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Adding...' : 'Add Staff'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedStaff && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold">
                    {selectedStaff.first_name[0]}{selectedStaff.last_name[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedStaff.first_name} {selectedStaff.last_name}</h3>
                    <p className="text-sm text-blue-200 capitalize">{selectedStaff.role.replace('_', ' ')}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedStaff(null)} className="text-white/80 hover:text-white"><X size={20} /></button>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'Email', value: selectedStaff.email },
                { label: 'Phone', value: selectedStaff.phone || 'Not set' },
                { label: 'Department', value: selectedStaff.department || 'Not set' },
                { label: 'Status', value: selectedStaff.status },
                { label: 'Duty Hours', value: selectedStaff.duty_start_time && selectedStaff.duty_end_time ? `${selectedStaff.duty_start_time.slice(0, 5)} - ${selectedStaff.duty_end_time.slice(0, 5)}` : 'Not set' },
                { label: 'Working Days', value: selectedStaff.duty_days?.map(d => DAY_LABELS[d]).join(', ') || 'Not set' },
                { label: 'Last Login', value: selectedStaff.last_login_at ? new Date(selectedStaff.last_login_at).toLocaleString() : 'Never' },
                { label: 'Added', value: new Date(selectedStaff.created_at).toLocaleDateString('en-CA') },
              ].map(item => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{item.label}</span>
                  <span className="font-medium text-gray-800 capitalize">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
