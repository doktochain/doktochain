import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Filter, Download, Eye, MoreVertical, LayoutList, LayoutGrid, MessageSquare, Calendar, Phone } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { clinicService, Clinic, ClinicAffiliation } from '../../../../services/clinicService';
import { supabase } from '../../../../lib/supabase';

interface PatientRecord {
  id: string;
  user_id: string;
  date_of_birth?: string;
  gender?: string;
  blood_type?: string;
  address_line1?: string;
  city?: string;
  province?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  user_profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
  };
  lastVisit?: string;
  lastProvider?: string;
  lastProviderSpecialty?: string;
  consentActive?: boolean;
}

type ViewMode = 'list' | 'grid';
type SortBy = 'recent' | 'name' | 'status';

export default function ClinicPatientsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [affiliations, setAffiliations] = useState<ClinicAffiliation[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    try {
      const c = await clinicService.getClinicByOwnerId(user!.id);
      setClinic(c);
      if (c) {
        const affs = await clinicService.getClinicAffiliations(c.id);
        const activeAffs = affs.filter(a => a.status === 'active');
        setAffiliations(activeAffs);

        const providerIds = activeAffs.map(a => a.provider_id);
        if (providerIds.length > 0) {
          const { data: appts } = await supabase
            .from('appointments')
            .select(`
              patient_id,
              appointment_date,
              provider_id,
              providers!appointments_provider_id_fkey(specialty, user_profiles!providers_user_id_fkey(first_name, last_name))
            `)
            .in('provider_id', providerIds)
            .is('deleted_at', null)
            .order('appointment_date', { ascending: false });

          const patientIds = [...new Set((appts || []).map((a: any) => a.patient_id))];
          if (patientIds.length > 0) {
            const { data: patientsData } = await supabase
              .from('patients')
              .select(`*, user_profiles!patients_user_id_fkey(first_name, last_name, email, phone, avatar_url)`)
              .in('id', patientIds);

            const { data: consents } = await supabase
              .from('patient_consents')
              .select('patient_id, expires_at')
              .in('patient_id', patientIds)
              .eq('status', 'active');

            const consentMap = new Map<string, boolean>();
            (consents || []).forEach((con: any) => {
              const isActive = !con.expires_at || new Date(con.expires_at) > new Date();
              if (isActive) consentMap.set(con.patient_id, true);
            });

            const apptMap = new Map<string, { date: string; provider: string; specialty: string }>();
            (appts || []).forEach((a: any) => {
              if (!apptMap.has(a.patient_id)) {
                const prov = a.providers;
                apptMap.set(a.patient_id, {
                  date: a.appointment_date,
                  provider: prov?.user_profiles ? `Dr. ${prov.user_profiles.first_name} ${prov.user_profiles.last_name}` : 'Unknown',
                  specialty: prov?.specialty || 'General',
                });
              }
            });

            const enriched: PatientRecord[] = (patientsData || []).map((p: any) => {
              const lastAppt = apptMap.get(p.id);
              return {
                ...p,
                lastVisit: lastAppt?.date,
                lastProvider: lastAppt?.provider,
                lastProviderSpecialty: lastAppt?.specialty,
                consentActive: consentMap.get(p.id) || false,
              };
            });

            setPatients(enriched);
          }
        }
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = useMemo(() => {
    let list = patients;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => {
        const name = `${p.user_profiles?.first_name} ${p.user_profiles?.last_name}`.toLowerCase();
        return name.includes(q) || p.user_profiles?.email?.toLowerCase().includes(q);
      });
    }
    if (statusFilter === 'available') list = list.filter(p => p.consentActive);
    if (statusFilter === 'unavailable') list = list.filter(p => !p.consentActive);

    if (sortBy === 'name') list.sort((a, b) => (a.user_profiles?.last_name || '').localeCompare(b.user_profiles?.last_name || ''));
    else if (sortBy === 'recent') list.sort((a, b) => (b.lastVisit || '').localeCompare(a.lastVisit || ''));
    return list;
  }, [patients, searchQuery, statusFilter, sortBy]);

  const handleExport = () => {
    const header = 'Patient,Phone,Doctor,Address,Last Visit,Status\n';
    const body = filteredPatients.map(p =>
      `"${p.user_profiles?.first_name} ${p.user_profiles?.last_name}","${p.user_profiles?.phone || ''}","${p.lastProvider || ''}","${p.city || ''}, ${p.province || ''}","${p.lastVisit || ''}","${p.consentActive ? 'Available' : 'Unavailable'}"`
    ).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clinic-patients.csv';
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
          <Users size={48} className="text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Clinic Found</h2>
          <p className="text-gray-500">Your clinic hasn't been set up yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">Patients List</h1>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
            Total Patients : {filteredPatients.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            <Download size={16} /> Export
          </button>
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}>
              <LayoutList size={18} />
            </button>
            <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}>
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            <Filter size={16} /> Filters
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sort By :</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
              <option value="recent">Recent</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="all">All Statuses</option>
            <option value="available">Available (Consent Active)</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>
      )}

      {viewMode === 'list' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Patient</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Phone</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Doctor</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Address</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Last Visit</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPatients.map(patient => (
                  <tr key={patient.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {patient.user_profiles?.first_name?.[0]}{patient.user_profiles?.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {patient.user_profiles?.first_name} {patient.user_profiles?.last_name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {patient.date_of_birth ? `${new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()}` : '?'}, {patient.gender || 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-600">{patient.user_profiles?.phone || '-'}</p>
                    </td>
                    <td className="px-5 py-4">
                      {patient.lastProvider ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 text-xs font-bold flex-shrink-0">
                            {patient.lastProvider.replace('Dr. ', '').split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{patient.lastProvider}</p>
                            <p className="text-xs text-gray-400">{patient.lastProviderSpecialty}</p>
                          </div>
                        </div>
                      ) : <span className="text-sm text-gray-400">-</span>}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-600">{patient.city ? `${patient.city}, ${patient.province}` : '-'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-600">
                        {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString('en-CA', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${
                        patient.consentActive
                          ? 'bg-green-50 text-green-700 border-green-300'
                          : 'bg-red-50 text-red-600 border-red-300'
                      }`}>
                        {patient.consentActive ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/dashboard/clinic/patients/${patient.id}`)}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <div className="relative" ref={openDropdown === patient.id ? dropdownRef : undefined}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === patient.id ? null : patient.id); }}
                            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {openDropdown === patient.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                              <button
                                onClick={() => { navigate(`/dashboard/clinic/patients/${patient.id}`); setOpenDropdown(null); }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                              >
                                <Eye size={14} /> View Profile
                              </button>
                              <button
                                onClick={() => { navigate('/dashboard/clinic/messages', { state: { recipientId: patient.user_id, recipientName: `${patient.user_profiles?.first_name} ${patient.user_profiles?.last_name}` } }); setOpenDropdown(null); }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                              >
                                <MessageSquare size={14} /> Send Message
                              </button>
                              {patient.user_profiles?.phone && (
                                <button
                                  onClick={() => { window.open(`tel:${patient.user_profiles?.phone}`, '_self'); setOpenDropdown(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                                >
                                  <Phone size={14} /> Call Patient
                                </button>
                              )}
                              <button
                                onClick={() => { navigate('/dashboard/clinic/appointments'); setOpenDropdown(null); }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                              >
                                <Calendar size={14} /> Book Appointment
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPatients.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <Users size={40} className="mx-auto mb-3 text-gray-300" />
                      <p className="font-medium text-gray-700">No patients found</p>
                      <p className="text-sm text-gray-500 mt-1">Patients who have booked with your clinic's providers will appear here</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map(patient => (
            <div key={patient.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition cursor-pointer" onClick={() => navigate(`/dashboard/clinic/patients/${patient.id}`)}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                  {patient.user_profiles?.first_name?.[0]}{patient.user_profiles?.last_name?.[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{patient.user_profiles?.first_name} {patient.user_profiles?.last_name}</p>
                  <p className="text-xs text-gray-500">{patient.user_profiles?.phone || 'No phone'}</p>
                </div>
                <span className={`ml-auto inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  patient.consentActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}>
                  {patient.consentActive ? 'Available' : 'Unavailable'}
                </span>
              </div>
              {patient.lastProvider && (
                <p className="text-xs text-gray-500 mb-1">Last seen by: <span className="font-medium text-gray-700">{patient.lastProvider}</span></p>
              )}
              {patient.lastVisit && (
                <p className="text-xs text-gray-400">Last visit: {new Date(patient.lastVisit).toLocaleDateString('en-CA', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
