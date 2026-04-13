import { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, Save, Users, Search, Download, Eye, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { clinicService, Clinic, ClinicAffiliation, ClinicScheduleEntry } from '../../../../services/clinicService';

const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const DEFAULT_HOURS: Record<string, { open: string; close: string; closed: boolean }> = {
  Monday: { open: '08:00', close: '17:00', closed: false },
  Tuesday: { open: '08:00', close: '17:00', closed: false },
  Wednesday: { open: '08:00', close: '17:00', closed: false },
  Thursday: { open: '08:00', close: '17:00', closed: false },
  Friday: { open: '08:00', close: '17:00', closed: false },
  Saturday: { open: '09:00', close: '13:00', closed: false },
  Sunday: { open: '09:00', close: '13:00', closed: true },
};

type TabType = 'operating-hours' | 'provider-schedules';
type SortKey = 'name' | 'department' | 'phone';
type SortDir = 'asc' | 'desc';

interface ProviderScheduleRow {
  provider_id: string;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  avatar: string;
  availability: boolean[];
  slots: ClinicScheduleEntry[];
}

export default function ClinicSchedulePage() {
  const { user } = useAuth();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [schedules, setSchedules] = useState<ClinicScheduleEntry[]>([]);
  const [affiliations, setAffiliations] = useState<ClinicAffiliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('provider-schedules');
  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>(DEFAULT_HOURS);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedDoctor, setSelectedDoctor] = useState<ProviderScheduleRow | null>(null);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    try {
      const c = await clinicService.getClinicByOwnerId(user!.id);
      setClinic(c);
      if (c) {
        if (c.operating_hours && Object.keys(c.operating_hours).length > 0) {
          const merged = { ...DEFAULT_HOURS };
          Object.entries(c.operating_hours).forEach(([day, val]: [string, any]) => {
            if (merged[day]) merged[day] = { open: val.open || '08:00', close: val.close || '17:00', closed: val.closed ?? false };
          });
          setHours(merged);
        }
        const [sched, affs] = await Promise.all([
          clinicService.getClinicProviderSchedules(c.id),
          clinicService.getClinicAffiliations(c.id),
        ]);
        setSchedules(sched);
        setAffiliations(affs.filter(a => a.status === 'active'));
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHours = async () => {
    if (!clinic) return;
    setSaving(true);
    setMessage('');
    try {
      await clinicService.updateOperatingHours(clinic.id, hours);
      setMessage('Operating hours saved successfully.');
    } catch (error) {
      setMessage('Failed to save operating hours.');
    } finally {
      setSaving(false);
    }
  };

  const updateHour = (day: string, field: 'open' | 'close', value: string) => {
    setHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const toggleClosed = (day: string) => {
    setHours(prev => ({ ...prev, [day]: { ...prev[day], closed: !prev[day].closed } }));
  };

  const providerRows: ProviderScheduleRow[] = useMemo(() => {
    return affiliations.map(aff => {
      const p = aff.providers;
      const provSchedules = schedules.filter(s => s.provider_id === aff.provider_id);
      const availability = Array.from({ length: 7 }, (_, dayIdx) =>
        provSchedules.some(s => s.day_of_week === dayIdx && s.is_available)
      );
      return {
        provider_id: aff.provider_id,
        name: p?.user_profiles ? `Dr. ${p.user_profiles.first_name} ${p.user_profiles.last_name}` : 'Unknown',
        specialty: p?.specialty || 'General',
        phone: p?.user_profiles?.phone || '-',
        email: p?.user_profiles?.email || '-',
        avatar: p?.user_profiles ? `${p.user_profiles.first_name[0]}${p.user_profiles.last_name[0]}` : '??',
        availability,
        slots: provSchedules,
      };
    });
  }, [affiliations, schedules]);

  const departments = useMemo(() => [...new Set(providerRows.map(r => r.specialty))].sort(), [providerRows]);

  const filteredRows = useMemo(() => {
    let rows = providerRows;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(r => r.name.toLowerCase().includes(q) || r.specialty.toLowerCase().includes(q));
    }
    if (departmentFilter !== 'all') {
      rows = rows.filter(r => r.specialty === departmentFilter);
    }
    rows.sort((a, b) => {
      let aVal = '', bVal = '';
      if (sortKey === 'name') { aVal = a.name; bVal = b.name; }
      else if (sortKey === 'department') { aVal = a.specialty; bVal = b.specialty; }
      else if (sortKey === 'phone') { aVal = a.phone; bVal = b.phone; }
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    return rows;
  }, [providerRows, searchQuery, departmentFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return <ChevronUp size={12} className="text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-blue-600" /> : <ChevronDown size={12} className="text-blue-600" />;
  };

  const handleExportCSV = () => {
    const header = 'Doctor,Department,Phone,Sun,Mon,Tue,Wed,Thu,Fri,Sat\n';
    const body = filteredRows.map(r =>
      `"${r.name}","${r.specialty}","${r.phone}",${r.availability.map(a => a ? 'Yes' : 'No').join(',')}`
    ).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'provider-schedules.csv';
    a.click();
    URL.revokeObjectURL(url);
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
        <h1 className="text-2xl font-bold text-gray-800">Clinic Schedule</h1>
        <p className="text-gray-500 mt-1">Manage clinic operating hours and view provider availability</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('provider-schedules')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'provider-schedules' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2"><Users size={16} /> Provider Schedules</div>
        </button>
        <button
          onClick={() => setActiveTab('operating-hours')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'operating-hours' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2"><Clock size={16} /> Operating Hours</div>
        </button>
      </div>

      {activeTab === 'provider-schedules' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <Download size={16} /> Export
              </button>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-700">No Provider Schedules</p>
              <p className="text-sm text-gray-500 mt-1">No providers match your filters or no schedules have been set yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-5 py-3">
                        <button onClick={() => handleSort('name')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-gray-700">
                          Doctor <SortIcon field="name" />
                        </button>
                      </th>
                      <th className="text-left px-5 py-3">
                        <button onClick={() => handleSort('department')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-gray-700">
                          Department <SortIcon field="department" />
                        </button>
                      </th>
                      <th className="text-left px-5 py-3">
                        <button onClick={() => handleSort('phone')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-gray-700">
                          Phone <SortIcon field="phone" />
                        </button>
                      </th>
                      <th className="text-center px-5 py-3">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Availability</span>
                      </th>
                      <th className="text-right px-5 py-3">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRows.map(row => (
                      <tr key={row.provider_id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                              {row.avatar}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{row.name}</p>
                              <p className="text-xs text-gray-400">{row.specialty}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            {row.specialty}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm text-gray-600">{row.phone}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {DAY_LETTERS.map((letter, idx) => (
                              <div
                                key={idx}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                                  row.availability[idx]
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-100 text-gray-400'
                                }`}
                                title={`${DAYS_FULL[idx]}: ${row.availability[idx] ? 'Available' : 'Unavailable'}`}
                              >
                                {letter}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedDoctor(row)}
                              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
                              title="View Schedule"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => setSelectedDoctor(row)}
                              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
                              title="Calendar"
                            >
                              <Calendar size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'operating-hours' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800">Clinic Operating Hours</h3>
            <p className="text-sm text-gray-500 mt-1">Set the days and hours your clinic is open to patients</p>
          </div>
          {message && (
            <div className={`mx-5 mt-4 p-3 rounded-lg text-sm ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}
          <div className="p-5 space-y-4">
            {DAYS_FULL.map((day) => (
              <div key={day} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border ${hours[day]?.closed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}>
                <div className="w-28 flex-shrink-0">
                  <span className="font-medium text-gray-800">{day}</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!hours[day]?.closed} onChange={() => toggleClosed(day)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                  <span className="text-sm text-gray-600">{hours[day]?.closed ? 'Closed' : 'Open'}</span>
                </label>
                {!hours[day]?.closed && (
                  <div className="flex items-center gap-2 ml-auto">
                    <input type="time" value={hours[day]?.open || '08:00'} onChange={(e) => updateHour(day, 'open', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500" />
                    <span className="text-gray-400">to</span>
                    <input type="time" value={hours[day]?.close || '17:00'} onChange={(e) => updateHour(day, 'close', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="p-5 border-t border-gray-100">
            <button onClick={handleSaveHours} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
              <Save size={18} /> {saving ? 'Saving...' : 'Save Hours'}
            </button>
          </div>
        </div>
      )}

      {selectedDoctor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold">
                    {selectedDoctor.avatar}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedDoctor.name}</h3>
                    <p className="text-sm text-blue-200">{selectedDoctor.specialty}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedDoctor(null)} className="text-white/80 hover:text-white transition">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Phone</p>
                  <p className="text-sm text-gray-800">{selectedDoctor.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Email</p>
                  <p className="text-sm text-gray-800">{selectedDoctor.email}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Weekly Availability</p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  {DAY_LETTERS.map((letter, idx) => (
                    <div
                      key={idx}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        selectedDoctor.availability[idx] ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Schedule Details</p>
                <div className="space-y-2">
                  {DAYS_FULL.map((day, idx) => {
                    const daySlots = selectedDoctor.slots.filter(s => s.day_of_week === idx && s.is_available);
                    return (
                      <div key={day} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-b-0">
                        <span className="text-sm font-medium text-gray-700 w-24">{day}</span>
                        {daySlots.length === 0 ? (
                          <span className="text-xs text-gray-400">Not available</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {daySlots.map(slot => (
                              <span key={slot.id} className="inline-flex px-2 py-0.5 rounded bg-green-50 text-green-700 text-xs font-medium border border-green-200">
                                {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
