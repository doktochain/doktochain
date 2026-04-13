import { useState, useEffect } from 'react';
import { Users, Search, FileText, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [consentMap, setConsentMap] = useState<Record<string, { status: string; end_date: string | null }>>({});

  useEffect(() => {
    if (user) {
      loadPatients();
    }
  }, [user]);

  const loadPatients = async () => {
    try {
      setLoading(true);

      const { data: providerData } = await supabase
        .from('providers')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!providerData) {
        setLoading(false);
        return;
      }

      try {
        const { data: consents } = await supabase
          .from('patient_consents')
          .select('patient_id, status, end_date')
          .eq('provider_id', providerData.id)
          .in('status', ['active', 'revoked', 'expired']);

        if (consents) {
          const map: Record<string, { status: string; end_date: string | null }> = {};
          consents.forEach((c: any) => {
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

      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select(`
          patient_id,
          appointment_date,
          patients!inner (
            id,
            user_id,
            medical_record_number,
            user_profiles!inner (
              first_name,
              last_name,
              email,
              phone,
              date_of_birth,
              gender
            )
          )
        `)
        .eq('provider_id', providerData.id)
        .order('appointment_date', { ascending: false });

      if (appointmentsData) {
        const patientMap = new Map<string, PatientData>();

        appointmentsData.forEach((apt: any) => {
          const patient = apt.patients;
          if (patient && patient.user_profiles) {
            const patientId = patient.id;

            if (!patientMap.has(patientId)) {
              patientMap.set(patientId, {
                id: patient.id,
                user_id: patient.user_id,
                medical_record_number: patient.medical_record_number,
                user_profiles: patient.user_profiles,
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

  const filteredPatients = patients.filter((patient) => {
    const fullName = `${patient.user_profiles.first_name} ${patient.user_profiles.last_name}`.toLowerCase();
    const mrn = patient.medical_record_number?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();

    return fullName.includes(search) || mrn.includes(search);
  });

  if (selectedPatientId) {
    const selectedPatient = patients.find((p) => p.id === selectedPatientId);
    return (
      <div className="p-6 space-y-4">
        <Button
          variant="ghost"
          onClick={() => setSelectedPatientId(null)}
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
          onClose={() => setSelectedPatientId(null)}
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
          <h1 className="text-3xl font-bold text-foreground">Patient Charts</h1>
          <p className="text-muted-foreground">
            Browse and manage patient medical charts ({patients.length} patients)
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
                placeholder="Search patients by name or MRN..."
                className="pl-10 py-3 h-12"
              />
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
                          onClick={() => setSelectedPatientId(patient.id)}
                          className="text-primary hover:text-primary/80 flex items-center gap-1"
                        >
                          <FileText className="w-4 h-4" />
                          View Chart
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
