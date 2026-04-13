import { useState } from 'react';
import { toast } from 'sonner';
import { ePrescriptionService, EPrescription } from '../../services/ePrescriptionService';
import { pharmacyService } from '../../services/pharmacyService';
import { blockchainAuditService } from '../../services/blockchainAuditService';
import { notificationService } from '../../services/notificationService';
import { Pill, MapPin, Store, Clock, ArrowLeftRight, Send } from 'lucide-react';

interface PrescriptionManagementProps {
  prescriptions: EPrescription[];
  patientId: string;
  onUpdate: () => void;
}

interface Pharmacy {
  id: string;
  pharmacy_name: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  business_hours?: any;
}

export default function PrescriptionManagement({
  prescriptions,
  patientId,
  onUpdate
}: PrescriptionManagementProps) {
  const [selectedPrescription, setSelectedPrescription] = useState<EPrescription | null>(null);
  const [showPharmacyModal, setShowPharmacyModal] = useState(false);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSelectPharmacy = (prescription: EPrescription, redirecting: boolean = false) => {
    setSelectedPrescription(prescription);
    setIsRedirecting(redirecting);
    setShowPharmacyModal(true);
    loadPharmacies();
  };

  const loadPharmacies = async () => {
    setLoading(true);
    try {
      const data = await pharmacyService.getAllPharmacies();
      setPharmacies(data.filter((p: any) => p.status === 'active'));
    } catch (error) {
      console.error('Error loading pharmacies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPharmacy = async (pharmacyId: string) => {
    if (!selectedPrescription) return;

    setLoading(true);
    try {
      if (isRedirecting) {
        const oldPharmacyId = selectedPrescription.pharmacy_id;
        await ePrescriptionService.sendToPharmacy(selectedPrescription.id, pharmacyId);

        await blockchainAuditService.logEvent({
          event_type: 'prescription_redirected',
          resource_type: 'prescription',
          resource_id: selectedPrescription.id,
          actor_id: patientId,
          actor_role: 'patient',
          action_data: {
            from_pharmacy_id: oldPharmacyId,
            to_pharmacy_id: pharmacyId,
            medication_name: selectedPrescription.medication_name
          }
        });

        if (oldPharmacyId) {
          await notificationService.create({
            user_id: oldPharmacyId,
            title: 'Prescription Redirected',
            message: `Patient has redirected prescription ${selectedPrescription.prescription_number} to another pharmacy`,
            type: 'info',
            priority: 'medium'
          });
        }

        await notificationService.create({
          user_id: pharmacyId,
          title: 'New Prescription',
          message: `New prescription ${selectedPrescription.prescription_number} has been sent to your pharmacy`,
          type: 'prescription',
          priority: 'high'
        });

        toast.success('Prescription redirected successfully!');
      } else {
        await ePrescriptionService.sendToPharmacy(selectedPrescription.id, pharmacyId);

        await blockchainAuditService.logEvent({
          event_type: 'prescription_sent',
          resource_type: 'prescription',
          resource_id: selectedPrescription.id,
          actor_id: patientId,
          actor_role: 'patient',
          action_data: {
            pharmacy_id: pharmacyId,
            medication_name: selectedPrescription.medication_name
          }
        });

        await notificationService.create({
          user_id: pharmacyId,
          title: 'New Prescription',
          message: `New prescription ${selectedPrescription.prescription_number} has been sent to your pharmacy`,
          type: 'prescription',
          priority: 'high'
        });

        toast.success('Prescription sent to pharmacy successfully!');
      }

      setShowPharmacyModal(false);
      onUpdate();
    } catch (error) {
      console.error('Error sending prescription:', error);
      toast.error('Failed to send prescription to pharmacy');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'received': return 'bg-blue-100 text-blue-800';
      case 'filled': return 'bg-green-100 text-green-800';
      case 'picked_up': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPharmacies = pharmacies.filter(pharmacy =>
    pharmacy.pharmacy_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pharmacy.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pharmacy.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {prescriptions.map((prescription) => (
        <div key={prescription.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Pill className="text-blue-600 text-2xl" />
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {prescription.medication_name}
                </h3>
                <p className="text-sm text-gray-600">
                  {prescription.dosage} - {prescription.frequency}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Prescribed: {new Date(prescription.prescribed_date).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500">
                  Quantity: {prescription.quantity} | Refills: {prescription.refills_remaining}/{prescription.refills}
                </p>

                {prescription.special_instructions && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">
                      <strong>Instructions:</strong> {prescription.special_instructions}
                    </p>
                  </div>
                )}

                {prescription.pharmacy_id && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                    <Store className="text-green-600" />
                    <span>Sent to pharmacy</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(prescription.status)}`}>
                {prescription.status.replace('_', ' ').toUpperCase()}
              </span>

              {prescription.status === 'pending' && !prescription.pharmacy_id && (
                <button
                  onClick={() => handleSelectPharmacy(prescription, false)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Send />
                  Send to Pharmacy
                </button>
              )}

              {prescription.pharmacy_id && ['pending', 'sent', 'received'].includes(prescription.status) && (
                <button
                  onClick={() => handleSelectPharmacy(prescription, true)}
                  className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 flex items-center gap-2"
                >
                  <ArrowLeftRight />
                  Change Pharmacy
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {showPharmacyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {isRedirecting ? 'Change Pharmacy' : 'Select Pharmacy'}
              </h2>
              <p className="text-gray-600 mt-1">
                {isRedirecting
                  ? 'Choose a new pharmacy to redirect this prescription'
                  : 'Choose where to send this prescription'}
              </p>

              <div className="mt-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, city, or address..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                </div>
              ) : filteredPharmacies.length === 0 ? (
                <div className="text-center py-12">
                  <Store className="text-gray-400 text-5xl mx-auto mb-4" />
                  <p className="text-gray-600">No pharmacies found</p>
                </div>
              ) : (
                filteredPharmacies.map((pharmacy) => (
                  <button
                    key={pharmacy.id}
                    onClick={() => handleConfirmPharmacy(pharmacy.id)}
                    disabled={loading}
                    className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition disabled:opacity-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{pharmacy.pharmacy_name}</h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                          <MapPin className="text-gray-400" />
                          <span>{pharmacy.address}, {pharmacy.city}, {pharmacy.province}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{pharmacy.phone}</p>
                      </div>
                      <div className="ml-4">
                        <div className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Active
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowPharmacyModal(false)}
                disabled={loading}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
