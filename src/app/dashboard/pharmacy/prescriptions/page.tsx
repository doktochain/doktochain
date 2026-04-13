import { useEffect, useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';
import { pharmacyPrescriptionService } from '../../../../services/pharmacyPrescriptionService';
import { blockchainAuditService } from '../../../../services/blockchainAuditService';
import { notificationService } from '../../../../services/notificationService';
import { FileText, Search, Filter, CheckCircle, XCircle, Clock, AlertTriangle, Eye, ArrowRightLeft } from 'lucide-react';
import ConsentStatusBadge from '../../../../components/ui/ConsentStatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';

export default function PharmacyPrescriptions() {
  const { userProfile } = useAuth();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pharmacyId, setPharmacyId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'patient' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [consentMap, setConsentMap] = useState<Record<string, { status: string; end_date: string | null }>>({});
  const [redirectedPrescriptions, setRedirectedPrescriptions] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [viewingPrescription, setViewingPrescription] = useState<any | null>(null);

  useEffect(() => {
    loadPharmacyId();
  }, [userProfile]);

  useEffect(() => {
    if (pharmacyId) {
      loadPrescriptions();
      loadConsentData();
      loadRedirectedPrescriptions();
    }
  }, [pharmacyId, statusFilter]);

  const loadPharmacyId = async () => {
    if (!userProfile) return;

    const { data } = await supabase
      .from('pharmacies')
      .select('id')
      .eq('user_id', userProfile.id)
      .maybeSingle();

    if (data) {
      setPharmacyId(data.id);
    }
  };

  const loadRedirectedPrescriptions = async () => {
    if (!pharmacyId) return;
    try {
      const { data: auditLogs } = await supabase
        .from('blockchain_audit_log')
        .select('resource_id, action_data')
        .eq('event_type', 'prescription_redirected')
        .eq('resource_type', 'prescription');

      if (auditLogs) {
        const redirectedIds = new Set<string>();
        auditLogs.forEach((log: any) => {
          if (log.action_data?.new_pharmacy_id === pharmacyId) {
            redirectedIds.add(log.resource_id);
          }
        });
        setRedirectedPrescriptions(redirectedIds);
      }
    } catch {}
  };

  const loadConsentData = async () => {
    if (!pharmacyId) return;
    try {
      const { data: consents } = await supabase
        .from('patient_consents')
        .select('patient_id, status, end_date')
        .eq('pharmacy_id', pharmacyId)
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
  };

  const loadPrescriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await pharmacyPrescriptionService.getPrescriptionsForPharmacy(
        pharmacyId,
        statusFilter === 'all' ? undefined : statusFilter
      );
      setPrescriptions(result);
    } catch (err) {
      console.error('Error loading prescriptions:', err);
      setError('Unable to load prescriptions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (prescriptionId: string) => {
    try {
      const { data: staff } = await supabase
        .from('pharmacy_staff')
        .select('id')
        .eq('pharmacy_id', pharmacyId)
        .eq('user_id', userProfile?.id)
        .maybeSingle();

      if (staff) {
        await pharmacyPrescriptionService.validatePrescription({
          prescription_id: prescriptionId,
          pharmacy_id: pharmacyId,
          validated_by: staff.id,
          validation_type: 'drug-interaction',
          validation_status: 'passed',
        });

        const { data: prescription } = await supabase
          .from('e_prescriptions')
          .select('*, patients(user_id)')
          .eq('id', prescriptionId)
          .maybeSingle();

        if (prescription) {
          await blockchainAuditService.logEvent({
            eventType: 'prescription_approved',
            resourceType: 'prescription',
            resourceId: prescriptionId,
            actorId: pharmacyId,
            actorRole: 'pharmacy',
            actionData: {
              staff_id: staff.id,
              patient_id: prescription.patient_id
            }
          });

          await notificationService.createNotification({
            userId: prescription.patients?.user_id,
            title: 'Prescription Approved',
            message: `Your prescription has been approved and is being processed`,
            type: 'prescription',
            category: 'pharmacy',
            priority: 'normal'
          });
        }

        setToast({ type: 'success', message: 'Prescription approved successfully' });
        setTimeout(() => setToast(null), 3000);
        loadPrescriptions();
      }
    } catch (error) {
      console.error('Error approving prescription:', error);
      setToast({ type: 'error', message: 'Failed to approve prescription' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleReject = async (prescriptionId: string, reason: string) => {
    try {
      const { data: staff } = await supabase
        .from('pharmacy_staff')
        .select('id')
        .eq('pharmacy_id', pharmacyId)
        .eq('user_id', userProfile?.id)
        .maybeSingle();

      if (staff) {
        await pharmacyPrescriptionService.rejectPrescription({
          prescription_id: prescriptionId,
          pharmacy_id: pharmacyId,
          rejected_by: staff.id,
          rejection_reason: reason,
          detailed_notes: reason,
          resolution_status: 'pending',
        });

        const { data: prescription } = await supabase
          .from('e_prescriptions')
          .select('*, patients(user_id), providers(user_id)')
          .eq('id', prescriptionId)
          .maybeSingle();

        if (prescription) {
          await blockchainAuditService.logEvent({
            eventType: 'prescription_rejected',
            resourceType: 'prescription',
            resourceId: prescriptionId,
            actorId: pharmacyId,
            actorRole: 'pharmacy',
            actionData: {
              staff_id: staff.id,
              patient_id: prescription.patient_id,
              rejection_reason: reason
            }
          });

          await notificationService.createNotification({
            userId: prescription.patients?.user_id,
            title: 'Prescription Issue',
            message: `There is an issue with your prescription. Reason: ${reason}`,
            type: 'prescription',
            category: 'pharmacy',
            priority: 'high'
          });

          await notificationService.createNotification({
            userId: prescription.providers?.user_id,
            title: 'Prescription Rejected by Pharmacy',
            message: `Prescription has been rejected by pharmacy. Reason: ${reason}`,
            type: 'prescription',
            category: 'pharmacy',
            priority: 'high'
          });
        }

        setToast({ type: 'success', message: 'Prescription rejected' });
        setTimeout(() => setToast(null), 3000);
        loadPrescriptions();
      }
    } catch (error) {
      console.error('Error rejecting prescription:', error);
      setToast({ type: 'error', message: 'Failed to reject prescription' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const getStatusBadge = (status: string) => {
    const variantMap: Record<string, 'warning' | 'success' | 'destructive' | 'info' | 'secondary'> = {
      pending: 'warning',
      approved: 'success',
      processing: 'info',
      filled: 'success',
      completed: 'success',
      rejected: 'destructive',
      cancelled: 'destructive',
      expired: 'secondary',
    };

    const iconMap: Record<string, any> = {
      pending: Clock,
      approved: CheckCircle,
      processing: Clock,
      filled: CheckCircle,
      completed: CheckCircle,
      rejected: XCircle,
      cancelled: XCircle,
      expired: AlertTriangle,
    };

    const variant = variantMap[status] || 'warning';
    const Icon = iconMap[status] || Clock;

    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  const filteredAndSorted = prescriptions
    .filter(rx =>
      rx.prescriptions?.patient_id?.toString().includes(searchTerm) ||
      rx.prescriptions?.medication_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let compareValue = 0;

      if (sortBy === 'date') {
        compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'patient') {
        compareValue = (a.prescriptions?.patient_id || '').localeCompare(b.prescriptions?.patient_id || '');
      } else if (sortBy === 'status') {
        compareValue = a.validation_status.localeCompare(b.validation_status);
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}

      <Dialog open={!!viewingPrescription} onOpenChange={(open) => { if (!open) setViewingPrescription(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
          </DialogHeader>
          {viewingPrescription && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rx Number</span>
                <span className="font-medium text-foreground">{viewingPrescription.prescriptions?.prescription_number || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Medication</span>
                <span className="font-medium text-foreground">{viewingPrescription.prescriptions?.medication_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dosage</span>
                <span className="font-medium text-foreground">{viewingPrescription.prescriptions?.dosage || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequency</span>
                <span className="font-medium text-foreground">{viewingPrescription.prescriptions?.frequency || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                {getStatusBadge(viewingPrescription.validation_status)}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium text-foreground">{new Date(viewingPrescription.created_at).toLocaleDateString()}</span>
              </div>
              {viewingPrescription.prescriptions?.instructions && (
                <div>
                  <span className="text-muted-foreground block mb-1">Instructions</span>
                  <p className="text-foreground bg-muted p-3 rounded-lg">{viewingPrescription.prescriptions.instructions}</p>
                </div>
              )}
            </div>
          )}
          <Button onClick={() => setViewingPrescription(null)} className="w-full">
            Close
          </Button>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Prescriptions</h1>
          <p className="text-muted-foreground mt-1">Validate and manage prescriptions</p>
        </div>

        <Button onClick={loadPrescriptions}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by patient ID or medication name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="text-muted-foreground w-5 h-5" />
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="patient">Sort by Patient</SelectItem>
                <SelectItem value="status">Sort by Status</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '\u2191' : '\u2193'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading prescriptions...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <p className="text-destructive">{error}</p>
              <Button variant="destructive" onClick={loadPrescriptions} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No prescriptions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Rx Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Medication
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Consent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredAndSorted.map((rx) => (
                    <tr key={rx.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {rx.prescriptions?.prescription_number || 'N/A'}
                          {redirectedPrescriptions.has(rx.prescription_id) && (
                            <Badge variant="warning" className="gap-1" title="This prescription was redirected from another pharmacy">
                              <ArrowRightLeft className="w-3 h-3" />
                              Redirected
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {rx.prescriptions?.medication_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        Patient #{rx.prescriptions?.patient_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(rx.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const patientId = rx.prescriptions?.patient_id;
                          const consent = patientId ? consentMap[patientId] : null;
                          return (
                            <ConsentStatusBadge
                              status={consent ? (consent.status as any) : 'none'}
                              endDate={consent?.end_date}
                              compact
                            />
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(rx.validation_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {rx.validation_status === 'pending' ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleApprove(rx.prescription_id)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(rx.prescription_id, 'Invalid prescription')}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="link"
                            onClick={() => setViewingPrescription(rx)}
                            className="gap-1 p-0"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                        )}
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
