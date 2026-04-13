import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';
import { prescriptionService } from '../../../../services/prescriptionService';
import { providerService } from '../../../../services/providerService';
import { ClipboardList, Plus, Search, Check, X } from 'lucide-react';
import { Card, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';

export default function ProviderPrescriptions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [provider, setProvider] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [refillRequests, setRefillRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'refills'>('all');
  const [showNewPrescriptionModal, setShowNewPrescriptionModal] = useState(false);

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
    } catch (error) {
      console.error('Error loading provider:', error);
    }
  };

  const loadPrescriptions = async () => {
    if (!provider) return;
    setError(null);

    try {
      if (activeTab === 'refills') {
        const refills = await prescriptionService.getProviderRefillRequests(provider.id);
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
      loadPrescriptions();
    } catch (error) {
      console.error('Error approving refill:', error);
    }
  };

  const handleDenyRefill = async (refillId: string) => {
    const reason = prompt('Please provide a reason for denial:');
    if (!reason) return;

    try {
      await prescriptionService.denyRefill(refillId, reason);
      loadPrescriptions();
    } catch (error) {
      console.error('Error denying refill:', error);
    }
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
              <TabsTrigger value="all" className="capitalize">
                All
              </TabsTrigger>
              <TabsTrigger value="pending" className="capitalize">
                Pending
              </TabsTrigger>
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
                            <h3 className="text-lg font-semibold text-foreground">
                              Refill Request
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Patient: {refill.prescriptions?.patients?.user_profiles?.first_name}{' '}
                              {refill.prescriptions?.patients?.user_profiles?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Original Prescription: #{refill.prescriptions?.prescription_number}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Requested: {new Date(refill.request_date).toLocaleDateString()}
                            </p>
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
                          <Button
                            onClick={() => handleDenyRefill(refill.id)}
                            variant="destructive"
                          >
                            <X /> Deny
                          </Button>
                          <Button variant="secondary">
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="all" className="mt-0">
              <PrescriptionList prescriptions={prescriptions} />
            </TabsContent>

            <TabsContent value="pending" className="mt-0">
              <PrescriptionList prescriptions={prescriptions} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <Dialog open={showNewPrescriptionModal} onOpenChange={setShowNewPrescriptionModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Write New Prescription</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Search Patient</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name or health card number"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Diagnosis</Label>
              <textarea
                rows={3}
                placeholder="Enter diagnosis"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="font-semibold mb-3 text-foreground">Medication Details</h3>

              <div className="space-y-3">
                <div>
                  <Label className="mb-2 block">Medication Name</Label>
                  <Input
                    type="text"
                    placeholder="Search medication"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-2 block">Strength</Label>
                    <Input
                      type="text"
                      placeholder="e.g., 500mg"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">Quantity</Label>
                    <Input
                      type="number"
                      placeholder="30"
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Dosage Instructions</Label>
                  <Input
                    type="text"
                    placeholder="e.g., Take 1 tablet"
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Frequency</Label>
                  <Input
                    type="text"
                    placeholder="e.g., Twice daily with food"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-2 block">Duration (days)</Label>
                    <Input
                      type="number"
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">Refills Allowed</Label>
                    <Input
                      type="number"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button className="flex-1">
                Create Prescription
              </Button>
              <Button
                onClick={() => setShowNewPrescriptionModal(false)}
                variant="secondary"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PrescriptionList({ prescriptions }: { prescriptions: any[] }) {
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
        <Card
          key={prescription.id}
          className="hover:shadow-md transition"
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Prescription #{prescription.prescription_number}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Patient: {prescription.patients?.user_profiles?.first_name}{' '}
                  {prescription.patients?.user_profiles?.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Date: {new Date(prescription.prescription_date).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={statusVariant(prescription.status)}>
                {prescription.status}
              </Badge>
            </div>

            {prescription.diagnosis && (
              <div className="mb-3">
                <span className="text-sm font-medium text-foreground">Diagnosis: </span>
                <span className="text-sm text-muted-foreground">{prescription.diagnosis}</span>
              </div>
            )}

            {prescription.pharmacies && (
              <div className="mb-3">
                <span className="text-sm font-medium text-foreground">Pharmacy: </span>
                <span className="text-sm text-muted-foreground">
                  {prescription.pharmacies.pharmacy_name}
                </span>
              </div>
            )}

            {prescription.is_controlled_substance && (
              <div className="mb-3">
                <Badge variant="destructive">Controlled Substance</Badge>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <Button>
                View Full Details
              </Button>
              {prescription.status === 'pending' && (
                <>
                  <Button>
                    Send to Pharmacy
                  </Button>
                  <Button variant="secondary">
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
