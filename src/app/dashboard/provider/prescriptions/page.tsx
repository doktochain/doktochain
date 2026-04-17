import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../../../contexts/AuthContext';
import { prescriptionService } from '../../../../services/prescriptionService';
import { providerService } from '../../../../services/providerService';
import { pharmacyService } from '../../../../services/pharmacyService';
import { ClipboardList, Plus, Check, X } from 'lucide-react';
import { Card, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';

const patientName = (rx: any) => {
  if (rx?.patient?.first_name || rx?.patient?.last_name) {
    return `${rx.patient.first_name || ''} ${rx.patient.last_name || ''}`.trim();
  }
  if (rx?.patients?.user_profiles?.first_name) {
    return `${rx.patients.user_profiles.first_name} ${rx.patients.user_profiles.last_name || ''}`.trim();
  }
  return 'Unknown patient';
};

const pharmacyName = (rx: any) => {
  return rx?.pharmacy?.name || rx?.pharmacies?.pharmacy_name || null;
};

export default function ProviderPrescriptions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [provider, setProvider] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [refillRequests, setRefillRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'refills'>('all');

  const [detailRx, setDetailRx] = useState<any | null>(null);
  const [sendRx, setSendRx] = useState<any | null>(null);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string>('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadProviderData();
  }, [user]);

  useEffect(() => {
    if (provider) {
      loadPrescriptions();
    }
  }, [provider, activeTab]);

  const loadProviderData = async () => {
    if (!user) return;

    try {
      const providerData = await providerService.getProviderByUserId(user.id);
      setProvider(providerData);
    } catch (err) {
      console.error('Error loading provider:', err);
    }
  };

  const loadPrescriptions = async () => {
    if (!provider || !user) return;
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'refills') {
        const refills = await prescriptionService.getProviderRefillRequests(user.id);
        setRefillRequests(refills);
      } else {
        const status = activeTab === 'pending' ? 'pending' : undefined;
        const prescriptionsData = await prescriptionService.getProviderPrescriptions(
          provider.id,
          status
        );
        setPrescriptions(prescriptionsData);
      }
    } catch (err) {
      console.error('Error loading prescriptions:', err);
      setError('Unable to load prescriptions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRefill = async (refillId: string) => {
    if (!user) return;
    try {
      await prescriptionService.approveRefill(refillId, user.id);
      toast.success('Refill approved');
      loadPrescriptions();
    } catch (err: any) {
      console.error('Error approving refill:', err);
      toast.error(err?.message || 'Failed to approve refill');
    }
  };

  const handleDenyRefill = async (refillId: string) => {
    const reason = prompt('Please provide a reason for denial:');
    if (!reason) return;
    try {
      await prescriptionService.denyRefill(refillId, reason, user?.id);
      toast.success('Refill denied');
      loadPrescriptions();
    } catch (err: any) {
      console.error('Error denying refill:', err);
      toast.error(err?.message || 'Failed to deny refill');
    }
  };

  const openSendToPharmacy = async (rx: any) => {
    setSendRx(rx);
    setSelectedPharmacyId(rx?.pharmacy_id || '');
    if (pharmacies.length === 0) {
      try {
        const list = await pharmacyService.getAllPharmacies();
        setPharmacies(list);
      } catch (err) {
        console.error('Error loading pharmacies:', err);
        toast.error('Failed to load pharmacies');
      }
    }
  };

  const handleSendToPharmacy = async () => {
    if (!sendRx || !selectedPharmacyId) {
      toast.error('Please select a pharmacy');
      return;
    }
    setSending(true);
    try {
      await prescriptionService.sendToPharmacy(sendRx.id, selectedPharmacyId, provider?.id);
      toast.success('Prescription sent to pharmacy');
      setSendRx(null);
      setSelectedPharmacyId('');
      loadPrescriptions();
    } catch (err: any) {
      console.error('Error sending prescription:', err);
      toast.error(err?.message || 'Failed to send prescription');
    } finally {
      setSending(false);
    }
  };

  const handleEdit = (rx: any) => {
    if (rx.status !== 'pending') {
      toast.error('Only pending prescriptions can be edited');
      return;
    }
    navigate(`/dashboard/provider/prescriptions/edit/${rx.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-6 text-center">
            <p className="text-destructive">{error}</p>
            <Button onClick={loadPrescriptions} variant="destructive" className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Prescriptions</h1>
        <Button onClick={() => navigate('/dashboard/provider/prescriptions/create')}>
          <Plus /> Write New Prescription
        </Button>
      </div>

      <Card>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'all' | 'pending' | 'refills')}
        >
          <div className="border-b border-border px-4 pt-2">
            <TabsList>
              <TabsTrigger value="all" className="capitalize">All</TabsTrigger>
              <TabsTrigger value="pending" className="capitalize">Pending</TabsTrigger>
              <TabsTrigger value="refills" className="capitalize">
                Refills
                {refillRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {refillRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="p-6">
            <TabsContent value="refills" className="mt-0">
              <div className="space-y-4">
                {refillRequests.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardList className="mx-auto text-5xl mb-4 text-muted-foreground/60" />
                    <p>No pending refill requests</p>
                  </div>
                ) : (
                  refillRequests.map((refill) => (
                    <Card
                      key={refill.id}
                      className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">Refill Request</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Patient ID: {refill.patient_id?.slice(0, 8)}…
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Prescription ID: {refill.prescription_id?.slice(0, 8)}…
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Requested:{' '}
                              {refill.request_date
                                ? new Date(refill.request_date).toLocaleDateString()
                                : '—'}
                            </p>
                            {refill.reason && (
                              <p className="text-sm text-muted-foreground mt-2">
                                Reason: {refill.reason}
                              </p>
                            )}
                          </div>
                          <Badge variant="warning">Pending Review</Badge>
                        </div>

                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleApproveRefill(refill.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Check /> Approve
                          </Button>
                          <Button onClick={() => handleDenyRefill(refill.id)} variant="destructive">
                            <X /> Deny
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="all" className="mt-0">
              <PrescriptionList
                prescriptions={prescriptions}
                onView={setDetailRx}
                onSend={openSendToPharmacy}
                onEdit={handleEdit}
              />
            </TabsContent>

            <TabsContent value="pending" className="mt-0">
              <PrescriptionList
                prescriptions={prescriptions}
                onView={setDetailRx}
                onSend={openSendToPharmacy}
                onEdit={handleEdit}
              />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <Dialog open={!!detailRx} onOpenChange={(open) => !open && setDetailRx(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Prescription {detailRx?.prescription_number ? `#${detailRx.prescription_number}` : ''}
            </DialogTitle>
          </DialogHeader>
          {detailRx && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Patient</Label>
                  <p>{patientName(detailRx)}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <p className="capitalize">{detailRx.status}</p>
                </div>
                <div>
                  <Label>Date</Label>
                  <p>
                    {detailRx.prescription_date
                      ? new Date(detailRx.prescription_date).toLocaleDateString()
                      : '—'}
                  </p>
                </div>
                <div>
                  <Label>Pharmacy</Label>
                  <p>{pharmacyName(detailRx) || 'Not assigned'}</p>
                </div>
              </div>

              {detailRx.diagnosis && (
                <div>
                  <Label>Diagnosis</Label>
                  <p>{detailRx.diagnosis}</p>
                </div>
              )}

              {detailRx.notes && (
                <div>
                  <Label>Notes</Label>
                  <p>{detailRx.notes}</p>
                </div>
              )}

              <div>
                <Label>Medications</Label>
                <div className="mt-2 space-y-2">
                  {(detailRx.items || []).length === 0 && (
                    <p className="text-muted-foreground">No medications recorded.</p>
                  )}
                  {(detailRx.items || []).map((it: any) => (
                    <div
                      key={it.id}
                      className="border border-border rounded-lg p-3 bg-muted/40"
                    >
                      <div className="font-medium">
                        {it.medication_name} {it.strength}
                      </div>
                      <div className="text-muted-foreground text-xs mt-1">
                        {it.dosage_form && <span>{it.dosage_form} · </span>}
                        {it.frequency && <span>{it.frequency} · </span>}
                        {it.quantity && <span>Qty {it.quantity} · </span>}
                        {it.duration_days && <span>{it.duration_days} days · </span>}
                        Refills: {it.refills_remaining ?? it.refills_allowed ?? 0}/
                        {it.refills_allowed ?? 0}
                      </div>
                      {it.dosage_instructions && (
                        <div className="mt-2 text-sm">{it.dosage_instructions}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!sendRx} onOpenChange={(open) => !open && setSendRx(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send to Pharmacy</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Pharmacy</Label>
              <Select value={selectedPharmacyId} onValueChange={setSelectedPharmacyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a pharmacy" />
                </SelectTrigger>
                <SelectContent>
                  {pharmacies.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.pharmacy_name} {p.city ? `· ${p.city}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pharmacies.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">No pharmacies available.</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSendToPharmacy} disabled={sending} className="flex-1">
                {sending ? 'Sending...' : 'Send Prescription'}
              </Button>
              <Button variant="outline" onClick={() => setSendRx(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PrescriptionList({
  prescriptions,
  onView,
  onSend,
  onEdit,
}: {
  prescriptions: any[];
  onView: (rx: any) => void;
  onSend: (rx: any) => void;
  onEdit: (rx: any) => void;
}) {
  const statusVariant = (status: string) => {
    switch (status) {
      case 'filled':
        return 'info';
      case 'active':
      case 'sent':
        return 'success';
      case 'cancelled':
      case 'expired':
        return 'destructive';
      default:
        return 'warning';
    }
  };

  if (prescriptions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ClipboardList className="mx-auto text-5xl mb-4 text-muted-foreground/60" />
        <p>No prescriptions found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {prescriptions.map((prescription) => (
        <Card key={prescription.id} className="hover:shadow-md transition">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Prescription #{prescription.prescription_number}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Patient: {patientName(prescription)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Date:{' '}
                  {prescription.prescription_date
                    ? new Date(prescription.prescription_date).toLocaleDateString()
                    : '—'}
                </p>
              </div>
              <Badge variant={statusVariant(prescription.status)}>{prescription.status}</Badge>
            </div>

            {prescription.diagnosis && (
              <div className="mb-3">
                <span className="text-sm font-medium text-foreground">Diagnosis: </span>
                <span className="text-sm text-muted-foreground">{prescription.diagnosis}</span>
              </div>
            )}

            {pharmacyName(prescription) && (
              <div className="mb-3">
                <span className="text-sm font-medium text-foreground">Pharmacy: </span>
                <span className="text-sm text-muted-foreground">{pharmacyName(prescription)}</span>
              </div>
            )}

            {prescription.is_controlled_substance && (
              <div className="mb-3">
                <Badge variant="destructive">Controlled Substance</Badge>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <Button onClick={() => onView(prescription)}>View Full Details</Button>
              {prescription.status === 'pending' && (
                <>
                  <Button onClick={() => onSend(prescription)}>Send to Pharmacy</Button>
                  <Button variant="secondary" onClick={() => onEdit(prescription)}>
                    Edit
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
