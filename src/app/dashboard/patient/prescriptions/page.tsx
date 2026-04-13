import { useState, useEffect } from 'react';
import { ePrescriptionService } from '../../../../services/ePrescriptionService';
import { patientService } from '../../../../services/patientService';
import { useAuth } from '../../../../contexts/AuthContext';
import PrescriptionManagement from '../../../../components/patient/PrescriptionManagement';
import { Card, CardContent } from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../components/ui/select';
import { Pill, Filter, Search } from 'lucide-react';

export default function PrescriptionsPage() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [patientId, setPatientId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const patient = await patientService.getPatientByUserId(user.id);
      if (patient) {
        setPatientId(patient.id);
        const rxData = await ePrescriptionService.getPatientPrescriptions(patient.id);
        setPrescriptions(rxData);
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrescriptions = prescriptions.filter(rx => {
    const matchesStatus = filterStatus === 'all' || rx.status === filterStatus;
    const matchesSearch =
      rx.medication_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.medication_brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.medication_generic?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">E-Prescriptions</h1>
        <p className="text-muted-foreground">View and manage your electronic prescriptions</p>
      </div>

      <Card className="p-4 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search medications..."
              className="pl-10"
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Filter by status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prescriptions</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="filled">Filled</SelectItem>
              <SelectItem value="picked_up">Picked Up</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Pill className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Prescriptions Found</h3>
            <p className="text-muted-foreground">
              {searchQuery || filterStatus !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'You don\'t have any prescriptions yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <PrescriptionManagement
          prescriptions={filteredPrescriptions}
          patientId={patientId}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}
