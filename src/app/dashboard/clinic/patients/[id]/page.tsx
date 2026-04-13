import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, MessageSquare, Video, Calendar, Droplets, Heart, Thermometer, Activity, Wind, Scale, User, Mail, Shield, AlertTriangle, DollarSign } from 'lucide-react';
import { useAuth } from '../../../../../contexts/AuthContext';
import { clinicService, Clinic } from '../../../../../services/clinicService';
import { supabase } from '../../../../../lib/supabase';

interface PatientDetail {
  id: string;
  user_id: string;
  date_of_birth?: string;
  gender?: string;
  blood_type?: string;
  address_line1?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  user_profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
  };
}

interface PatientAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  appointment_type?: string;
  status: string;
  providers?: {
    specialty?: string;
    user_profiles?: { first_name: string; last_name: string };
  };
}

interface PatientTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  transaction_type: string;
  payment_method?: string;
  description?: string;
  service_type?: string;
  transaction_date: string;
  providers?: {
    user_profiles?: { first_name: string; last_name: string };
  };
}

interface VitalSign {
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  spo2?: number;
  temperature?: number;
  respiratory_rate?: number;
  weight?: number;
  recorded_at?: string;
}

type DetailTab = 'appointments' | 'transactions';

export default function ClinicPatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [transactions, setTransactions] = useState<PatientTransaction[]>([]);
  const [vitals, setVitals] = useState<VitalSign | null>(null);
  const [consentActive, setConsentActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>('appointments');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.id && id) loadData();
  }, [user?.id, id]);

  const loadData = async () => {
    try {
      const c = await clinicService.getClinicByOwnerId(user!.id);
      setClinic(c);
      if (!c) return;

      const [patientRes, consentsRes] = await Promise.all([
        supabase.from('patients').select(`*, user_profiles!patients_user_id_fkey(first_name, last_name, email, phone, avatar_url)`).eq('id', id!).maybeSingle(),
        supabase.from('patient_consents').select('*').eq('patient_id', id!).eq('status', 'active'),
      ]);

      setPatient(patientRes.data);

      const activeConsent = (consentsRes.data || []).some((con: any) =>
        !con.expires_at || new Date(con.expires_at) > new Date()
      );
      setConsentActive(activeConsent);

      const affs = await clinicService.getClinicAffiliations(c.id);
      const providerIds = affs.filter(a => a.status === 'active').map(a => a.provider_id);

      if (providerIds.length > 0) {
        const [apptRes, txRes] = await Promise.all([
          supabase
            .from('appointments')
            .select(`id, appointment_date, start_time, appointment_type, status, providers!appointments_provider_id_fkey(specialty, user_profiles!providers_user_id_fkey(first_name, last_name))`)
            .eq('patient_id', id!)
            .in('provider_id', providerIds)
            .is('deleted_at', null)
            .order('appointment_date', { ascending: false }),
          supabase
            .from('provider_transactions')
            .select(`id, amount, currency, status, transaction_type, payment_method, description, service_type, transaction_date, providers:provider_id(user_profiles!providers_user_id_fkey(first_name, last_name))`)
            .eq('patient_id', patientRes.data?.user_id)
            .in('provider_id', providerIds)
            .order('transaction_date', { ascending: false })
            .limit(50),
        ]);
        setAppointments((apptRes.data || []) as any[]);
        setTransactions((txRes.data || []) as any[]);
      }

      if (activeConsent) {
        const { data: vitalData } = await supabase
          .from('vital_signs')
          .select('*')
          .eq('patient_id', id!)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setVitals(vitalData);
      }
    } catch (error) {
      console.error('Error loading patient:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (patient?.user_id) {
      navigate('/dashboard/clinic/messages', { state: { recipientId: patient.user_id, recipientName: `${patient.user_profiles?.first_name} ${patient.user_profiles?.last_name}` } });
    }
  };

  const handleCall = () => {
    if (patient?.user_profiles?.phone) {
      window.open(`tel:${patient.user_profiles.phone}`, '_self');
    }
  };

  const handleVideoCall = () => {
    const upcomingAppt = appointments.find(a => a.status === 'confirmed' && a.appointment_type === 'telemedicine');
    if (upcomingAppt) {
      navigate(`/dashboard/video-call/${upcomingAppt.id}`);
    } else {
      navigate('/dashboard/clinic/appointments');
    }
  };

  const age = patient?.date_of_birth
    ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
    : null;

  const lastVisit = appointments.length > 0 ? appointments[0].appointment_date : null;

  const filteredAppts = appointments.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const provName = `${a.providers?.user_profiles?.first_name} ${a.providers?.user_profiles?.last_name}`.toLowerCase();
    return provName.includes(q) || a.status.toLowerCase().includes(q);
  });

  const filteredTx = transactions.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (t.description || '').toLowerCase().includes(q) || t.transaction_type.toLowerCase().includes(q) || t.status.toLowerCase().includes(q);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'confirmed': return 'text-blue-600';
      case 'checked_in': return 'text-teal-600';
      case 'cancelled': return 'text-red-500';
      case 'no_show': return 'text-orange-500';
      default: return 'text-gray-600';
    }
  };

  const getTxStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'cancelled': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  };

  const fmt = (n: number) => `$${Math.abs(n).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/dashboard/clinic/patients')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-4">
          <ArrowLeft size={16} /> Patients
        </button>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <User size={48} className="text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Patient Not Found</h2>
        </div>
      </div>
    );
  }

  const p = patient.user_profiles;

  return (
    <div className="p-6 space-y-6">
      <button onClick={() => navigate('/dashboard/clinic/patients')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800">
        <ArrowLeft size={16} /> Patients
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="relative h-20 bg-gradient-to-r from-blue-600 via-teal-500 to-cyan-400" />
        <div className="px-6 pb-5 -mt-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="w-20 h-20 rounded-xl bg-white border-4 border-white shadow-md flex items-center justify-center text-2xl font-bold text-blue-600 bg-blue-50">
                {p?.first_name?.[0]}{p?.last_name?.[0]}
              </div>
              <div className="mb-1">
                <p className="text-xs text-blue-600 font-medium">#{patient.id.slice(0, 8).toUpperCase()}</p>
                <h2 className="text-xl font-bold text-gray-800">{p?.first_name} {p?.last_name}</h2>
                <p className="text-sm text-gray-500">
                  {patient.address_line1 ? `${patient.address_line1}, ` : ''}{patient.city}, {patient.province} {patient.postal_code}
                </p>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Phone size={13} /> {p?.phone || 'No phone'}</span>
                  <span className="flex items-center gap-1"><Calendar size={13} /> Last Visited : {lastVisit ? new Date(lastVisit).toLocaleDateString('en-CA', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCall}
                title={p?.phone ? `Call ${p.phone}` : 'No phone number'}
                disabled={!p?.phone}
                className="p-2.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Phone size={18} />
              </button>
              <button
                onClick={handleSendMessage}
                title="Send message"
                className="p-2.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
              >
                <MessageSquare size={18} />
              </button>
              <button
                onClick={handleVideoCall}
                title="Start video call"
                className="p-2.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
              >
                <Video size={18} />
              </button>
              <button
                onClick={() => navigate('/dashboard/clinic/appointments')}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                <Calendar size={16} /> Book Appointment
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <User size={18} className="text-gray-500" />
            <h3 className="text-lg font-bold text-gray-800">About</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Calendar, label: 'DOB', value: patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString('en-CA', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown' },
              { icon: Droplets, label: 'Blood Group', value: patient.blood_type || 'Unknown' },
              { icon: User, label: 'Gender', value: patient.gender || 'Unknown' },
              { icon: Mail, label: 'Email', value: p?.email || 'Unknown' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <item.icon size={18} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500">{item.label}</p>
                  <p className="text-sm text-gray-800">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-gray-500" />
            <h3 className="text-lg font-bold text-gray-800">Vital Signs</h3>
            {!consentActive && (
              <span className="ml-auto flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                <Shield size={12} /> Consent Required
              </span>
            )}
          </div>
          {!consentActive ? (
            <div className="flex flex-col items-center py-6 text-center">
              <AlertTriangle size={32} className="text-amber-400 mb-2" />
              <p className="text-sm text-gray-600 font-medium">Patient consent window is not active</p>
              <p className="text-xs text-gray-400 mt-1">Vital signs are only visible during an active consent period</p>
            </div>
          ) : vitals ? (
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Heart, label: 'Blood Pressure', value: `${vitals.blood_pressure_systolic || '-'}/${vitals.blood_pressure_diastolic || '-'} mmHg`, color: 'text-green-500' },
                { icon: Activity, label: 'Heart Rate', value: `${vitals.heart_rate || '-'} Bpm`, color: 'text-red-500' },
                { icon: Shield, label: 'SPO2', value: `${vitals.spo2 || '-'} %`, color: 'text-green-500' },
                { icon: Thermometer, label: 'Temperature', value: `${vitals.temperature || '-'} C`, color: 'text-green-500' },
                { icon: Wind, label: 'Respiratory Rate', value: `${vitals.respiratory_rate || '-'} rpm`, color: 'text-red-500' },
                { icon: Scale, label: 'Weight', value: `${vitals.weight || '-'} kg`, color: 'text-green-500' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <item.icon size={18} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500">{item.label}</p>
                    <p className="text-sm text-gray-800 flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${item.color === 'text-green-500' ? 'bg-green-500' : 'bg-red-500'}`} />
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No vital signs recorded</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex gap-4 border-b border-gray-200 mb-4">
          {(['appointments', 'transactions'] as DetailTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition capitalize ${
                activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <input type="text" placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>

        {activeTab === 'appointments' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Date & Time</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Doctor Name</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Mode</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAppts.map(appt => (
                    <tr key={appt.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-800">
                          {new Date(appt.appointment_date).toLocaleDateString('en-CA', { day: '2-digit', month: 'short', year: 'numeric' })} - {appt.start_time?.slice(0, 5)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 text-xs font-bold">
                            {appt.providers?.user_profiles?.first_name?.[0]}{appt.providers?.user_profiles?.last_name?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">Dr. {appt.providers?.user_profiles?.first_name} {appt.providers?.user_profiles?.last_name}</p>
                            <p className="text-xs text-gray-400">{appt.providers?.specialty}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-600 capitalize">{appt.appointment_type || 'In-person'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className={`text-sm font-medium ${getStatusColor(appt.status)}`}>
                          {getStatusLabel(appt.status)}
                        </p>
                      </td>
                    </tr>
                  ))}
                  {filteredAppts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-500">No appointments found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Description</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Type</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Amount</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTx.map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-800">
                          {new Date(tx.transaction_date).toLocaleDateString('en-CA', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-800">{tx.description || tx.service_type || 'Medical service'}</p>
                        {tx.payment_method && <p className="text-xs text-gray-400 capitalize">{tx.payment_method.replace(/_/g, ' ')}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-600 capitalize">{tx.transaction_type}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className={`text-sm font-semibold ${tx.transaction_type === 'refund' ? 'text-red-600' : 'text-gray-800'}`}>
                          {tx.transaction_type === 'refund' ? '-' : ''}{fmt(tx.amount)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getTxStatusColor(tx.status)}`}>
                          {getStatusLabel(tx.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredTx.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center">
                        <DollarSign size={32} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm text-gray-500">No transactions found for this patient</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
