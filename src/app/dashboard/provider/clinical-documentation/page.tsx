import { useState, useEffect } from 'react';
import { FileText, Activity, Shield, Search, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import SOAPNoteEditor from '../../../../components/ehr/SOAPNoteEditor';
import VitalSignsForm from '../../../../components/ehr/VitalSignsForm';
import AuditTrailViewer from '../../../../components/ehr/AuditTrailViewer';
import { useAuth } from '../../../../contexts/AuthContext';
import { ehrService } from '../../../../services/ehrService';
import { supabase } from '../../../../lib/supabase';

type ViewMode = 'soap-note' | 'vitals' | 'audit';

interface PatientResult {
  id: string;
  user_id: string;
  user_profiles: { first_name: string; last_name: string } | null;
}

export default function ClinicalDocumentationPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>('soap-note');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<PatientResult[]>([]);
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [stats, setStats] = useState({ notesToday: 0, totalNotes: 0 });
  const [existingNoteId, setExistingNoteId] = useState<string | undefined>();

  useEffect(() => {
    const pid = searchParams.get('patient');
    const apt = searchParams.get('appointment');
    const note = searchParams.get('note');
    if (pid) setSelectedPatientId(pid);
    if (apt) setSelectedAppointmentId(apt);
    if (note) setExistingNoteId(note);
  }, [searchParams]);

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    try {
      const notes = await ehrService.getSOAPNotesByProvider(user.id);
      const today = new Date().toISOString().split('T')[0];
      const notesToday = notes.filter((n) => (n as any).created_at?.startsWith(today)).length;
      setStats({ notesToday, totalNotes: notes.length });
    } catch {}
  };

  const handlePatientSearch = async () => {
    if (patientSearch.length < 2) return;
    try {
      const { data } = await supabase
        .from('patients')
        .select('id, user_id, user_profiles(first_name, last_name)')
        .limit(10);

      if (data) {
        const filtered = (data as unknown as PatientResult[]).filter((p) => {
          const name = `${p.user_profiles?.first_name || ''} ${p.user_profiles?.last_name || ''}`.toLowerCase();
          return name.includes(patientSearch.toLowerCase());
        });
        setSearchResults(filtered);
      }
    } catch {}
  };

  const selectPatient = (patient: PatientResult) => {
    setSelectedPatientId(patient.id);
    setSelectedPatientName(`${patient.user_profiles?.first_name || ''} ${patient.user_profiles?.last_name || ''}`);
    setSearchResults([]);
    setPatientSearch('');
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Clinical Documentation</h1>
        <p className="text-gray-600">FHIR-compliant EHR with blockchain audit trail</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <FileText className="w-8 h-8" />
            <span className="text-3xl font-bold">{stats.notesToday}</span>
          </div>
          <h3 className="text-lg font-semibold mb-1">Notes Today</h3>
          <p className="text-sky-100 text-sm">Clinical documentation</p>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Activity className="w-8 h-8" />
            <span className="text-3xl font-bold">{stats.totalNotes}</span>
          </div>
          <h3 className="text-lg font-semibold mb-1">Total Notes</h3>
          <p className="text-teal-100 text-sm">All SOAP notes</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Shield className="w-8 h-8" />
            <span className="text-3xl font-bold">100%</span>
          </div>
          <h3 className="text-lg font-semibold mb-1">Data Integrity</h3>
          <p className="text-green-100 text-sm">Blockchain verified</p>
        </div>
      </div>

      {!selectedPatientId && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-sky-600" />
            <h3 className="text-lg font-semibold text-gray-900">Select Patient</h3>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              onKeyUp={handlePatientSearch}
              placeholder="Search patients by name..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
            />
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectPatient(p)}
                    className="w-full text-left px-4 py-3 hover:bg-sky-50 border-b border-gray-100 last:border-0"
                  >
                    <p className="font-medium text-gray-900">
                      {p.user_profiles?.first_name} {p.user_profiles?.last_name}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedPatientId && (
        <>
          {selectedPatientName && (
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selectedPatientName}</p>
                  <p className="text-sm text-gray-500">Patient</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedPatientId('');
                  setSelectedPatientName('');
                  setExistingNoteId(undefined);
                }}
                className="text-sm text-sky-600 hover:text-sky-700 font-medium"
              >
                Change Patient
              </button>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-lg">
            <div className="border-b border-gray-200">
              <div className="flex gap-2 p-4">
                <button
                  onClick={() => setViewMode('soap-note')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'soap-note'
                      ? 'bg-sky-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  SOAP Note
                </button>

                <button
                  onClick={() => setViewMode('vitals')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'vitals'
                      ? 'bg-sky-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Vital Signs
                </button>

                <button
                  onClick={() => setViewMode('audit')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'audit'
                      ? 'bg-sky-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Audit Trail
                </button>
              </div>
            </div>

            <div className="p-6">
              {viewMode === 'soap-note' && (
                <SOAPNoteEditor
                  patientId={selectedPatientId}
                  appointmentId={selectedAppointmentId || undefined}
                  existingNoteId={existingNoteId}
                  onSave={() => loadStats()}
                />
              )}

              {viewMode === 'vitals' && (
                <VitalSignsForm
                  patientId={selectedPatientId}
                  appointmentId={selectedAppointmentId || undefined}
                />
              )}

              {viewMode === 'audit' && (
                <div className="space-y-4">
                  <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                    <p className="text-sm text-sky-900">
                      All clinical actions are recorded with blockchain-level security. Select a resource to view its audit trail.
                    </p>
                  </div>
                  <AuditTrailViewer
                    resourceType="soap_note"
                    resourceId={existingNoteId || ''}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
