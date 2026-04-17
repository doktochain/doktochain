import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Search, FileText, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { api } from '../../../../lib/api-client';
import { providerService } from '../../../../services/providerService';
import { patientService } from '../../../../services/patientService';
import PatientChartViewer from '../../../../components/provider/PatientChartViewer';
import ConsentStatusBadge from '../../../../components/ui/ConsentStatusBadge';
import { Card, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import { Button } from '../../../../components/ui/button';

interface PatientData {
  id: string;
  user_id: string;
  medical_record_number: string;
  user_profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    gender: string;
  };
  total_appointments: number;
  last_visit: string;
}

export default function PatientChartsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    searchParams.get('patientId')
  );
  const [consentMap, setConsentMap] = useState<Record<string, { status: string; end_date: string | null }>>({});

  useEffect(() => {
    if (user) {
      loadPatients();
    }
  }, [user]);

  useEffect(() => {
    const qp = searchParams.get('patientId');
    if (qp && qp !== selectedPatientId) setSelectedPatientId(qp);
  }, [searchParams]);

  const openPatient = (id: string) => {
    setSelectedPatientId(id);
    const next = new URLSearchParams(searchParams);
    next.set('patientId', id);
    setSearchParams(next, { replace: true });
  };

  const closePatient = () => {
    setSelectedPatientId(null);
    const next = new URLSearchParams(searchParams);
    next.delete('patientId');
    setSearchParams(next, { replace: true });
  };

  const loadPatients = async () => {
    if (!user) return;
    try {
      setLoading(true);

      const providerData = await providerService.getProviderByUserId(user.id);
      if (!providerData) {
        setLoading(false);
        return;
      }

      try {
        const { data: consents } = await api.get<any[]>('/patient-consents', {
          params: { provider_id: providerData.id, limit: 500 },
        });
        if (consents) {
          const map: Record<string, { status: string; end_date: string | null }> = {};
          consents.forEach((c: any) => {
            if (!['active', 'revoked', 'expired'].includes(c.status)) return;
            const existing = map[c.patient_id];
            if (!existing || c.status === 'active') {
              const now = new Date();
              const isExpired = c.status === 'active' && c.end_date && new Date(c.end_date) < now;
              map[c.patient_id] = {
                status: isExpired ? 'expired' : c.status,
                end_date: c.end_date,
              };
            }
          });
          setConsentMap(map);
        }
      } catch {}

      const { data: appointmentsData } = await api.get<any[]>('/appointments', {
        params: {
          provider_id: providerData.id,
          include: 'patients,user_profiles',
          order: 'appointment_date:desc',
          limit: 500,
        },
      });

      if (appointmentsData) {
        const patientMap = new Map<string, PatientData>();

        appointmentsData.forEach((apt: any) => {
          const patient = apt.patients || apt.patient;
          const profile = patient?.user_profiles || apt.user_profiles || {
            first_name: apt.first_name,
            last_name: apt.last_name,
            email: apt.email,
            phone: apt.phone,
            date_of_birth: apt.date_of_birth,
            gender: apt.gender,
          };
          const patientId = patient?.id || apt.patient_id;
          if (!patientId || !profile?.first_name) return;

          if (!patientMap.has(patientId)) {
            patientMap.set(patientId, {
              id: patientId,
              user_id: patient?.user_id || '',
              medical_record_number: patient?.medical_record_number || '',
              user_profiles: profile,
              total_appointments: 1,
              last_visit: apt.appointment_date,
            });
          } else {
            const existing = patientMap.get(patientId)!;
            existing.total_appointments += 1;
            if (new Date(apt.appointment_date) > new Date(existing.last_visit)) {
              existing.last_visit = apt.appointment_date;
            }
          }
        });

        setPatients(Array.from(patientMap.values()));
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const [searchResults, setSearchResults] = useState<PatientData[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const term = searchTerm.trim();
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const results = await patientService.searchPatients(term, 20);
        const formatted: PatientData[] = results.map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          medical_record_number: p.medical_record_number || '',
          user_profiles: {
            first_name: p.first_name || p.user_profiles?.first_name || '',
            last_name: p.last_name || p.user_profiles?.last_name || '',
            email: p.email || p.user_profiles?.email || '',
            phone: p.phone || p.user_profiles?.phone || '',
            date_of_birth: p.date_of_birth || p.user_profiles?.date_of_birth || '',
            gender: p.gender || p.user_profiles?.gender || '',
          },
          total_appointments: 0,
          last_visit: '',
        }));
        setSearchResults(formatted);
      } catch (err) {
        console.warn('Patient search failed', err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredPatients = searchTerm.trim().length >= 2
    ? (() => {
        const seen = new Set<string>();
        const combined: PatientData[] = [];
        for (const p of patients) {
          const fullName = `${p.user_profiles.first_name} ${p.user_profiles.last_name}`.toLowerCase();
          const mrn = p.medical_record_number?.toLowerCase() || '';
          if (fullName.includes(searchTerm.toLowerCase()) || mrn.includes(searchTerm.toLowerCase())) {
            combined.push(p);
            seen.add(p.id);
          }
        }
        for (const p of searchResults) {
          if (!seen.has(p.id)) combined.push(p);
        }
        return combined;
      })()
    : patients;

  if (selectedPatientId) {
    const selectedPatient = patients.find((p) => p.id === selectedPatientId);
    return (
      <div className="p-6 space-y-4">
        <Button
          variant="ghost"
          onClick={closePatient}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Patient List
          {selectedPatient && (
            <span className="text-muted-foreground">
              / {selectedPatient.user_profiles.first_name} {selectedPatient.user_profiles.last_name}
            </span>
          )}
        </Button>
        <PatientChartViewer
          patientId={selectedPatientId}
          onClose={closePatient}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Patient Health Records</h1>
          <p className="text-muted-foreground">
            View consented patient EHR data across all treating providers ({patients.length} patients)
          </p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search patients by name, email, MRN, health card, or DOB..."
                className="pl-10 py-3 h-12"
              />
              {searching && (
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">Searching...</span>
              )}
            </div>
          </div>

          {filteredPatients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {patients.length === 0 ? 'No Patients Yet' : 'No Matching Patients'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {patients.length === 0
                  ? 'Patient charts will appear here after appointments.'
                  : 'Try adjusting your search terms.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      MRN
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Last Visit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Total Visits
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Consent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-muted">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-primary font-medium">
                                {patient.user_profiles.first_name[0]}
                                {patient.user_profiles.last_name[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-foreground">
                              {patient.user_profiles.first_name} {patient.user_profiles.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {patient.user_profiles.gender} {patient.user_profiles.date_of_birth && `• Born ${new Date(patient.user_profiles.date_of_birth).getFullYear()}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground">
                          {patient.medical_record_number || 'Not assigned'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground">
                          {patient.user_profiles.email}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {patient.user_profiles.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground">
                          {new Date(patient.last_visit).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="info">
                          {patient.total_appointments} visits
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const consent = consentMap[patient.id];
                          return (
                            <ConsentStatusBadge
                              status={consent ? (consent.status as any) : 'none'}
                              endDate={consent?.end_date}
                              compact
                            />
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPatient(patient.id)}
                          className="text-primary hover:text-primary/80 flex items-center gap-1"
                        >
                          <FileText className="w-4 h-4" />
                          View Health Records
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
