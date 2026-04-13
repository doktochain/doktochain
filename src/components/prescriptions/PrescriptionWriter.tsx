import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ePrescriptionService, Medication, DrugInteraction, AllergyCheck } from '../../services/ePrescriptionService';
import { pharmacyService } from '../../services/pharmacyService';
import { blockchainAuditService } from '../../services/blockchainAuditService';
import { Search, AlertTriangle, Pill, Save, Send } from 'lucide-react';

interface PrescriptionWriterProps {
  patientId: string;
  providerId: string;
  appointmentId?: string;
  onSave?: (prescriptionId: string) => void;
  onCancel?: () => void;
}

interface Pharmacy {
  id: string;
  pharmacy_name: string;
  address: string;
  city: string;
  province: string;
}

export default function PrescriptionWriter({
  patientId,
  providerId,
  appointmentId,
  onSave,
  onCancel
}: PrescriptionWriterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Medication[]>([]);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);

  const [formData, setFormData] = useState({
    dosage: '',
    frequency: 'Once daily',
    quantity: 30,
    refills: 0,
    special_instructions: '',
    pharmacy_id: ''
  });

  const [drugInteractions, setDrugInteractions] = useState<DrugInteraction[]>([]);
  const [allergyChecks, setAllergyChecks] = useState<AllergyCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const FREQUENCIES = [
    'Once daily',
    'Twice daily',
    'Three times daily',
    'Four times daily',
    'Every 4 hours',
    'Every 6 hours',
    'Every 8 hours',
    'Every 12 hours',
    'As needed',
    'At bedtime',
    'With meals'
  ];

  useEffect(() => {
    loadPharmacies();
  }, []);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.length >= 3) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const loadPharmacies = async () => {
    try {
      const data = await pharmacyService.getAllPharmacies();
      setPharmacies(data.filter((p: any) => p.status === 'active'));
    } catch (error) {
      console.error('Error loading pharmacies:', error);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const results = await ePrescriptionService.searchMedications(searchQuery);
      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching medications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMedication = async (medication: Medication) => {
    setSelectedMedication(medication);
    setSearchQuery(medication.drug_name);
    setShowResults(false);

    setLoading(true);
    try {
      const [interactions, allergies] = await Promise.all([
        ePrescriptionService.checkDrugInteractions(patientId, medication.drug_name),
        ePrescriptionService.checkAllergies(patientId, medication.drug_name)
      ]);
      setDrugInteractions(interactions);
      setAllergyChecks(allergies);
    } catch (error) {
      console.error('Error checking interactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (sendToPharmacy: boolean = false) => {
    if (!selectedMedication) {
      toast.error('Please select a medication');
      return;
    }

    if (!formData.dosage) {
      toast.error('Please enter dosage');
      return;
    }

    setSaving(true);
    try {
      const prescription = await ePrescriptionService.createPrescription(providerId, {
        patient_id: patientId,
        appointment_id: appointmentId,
        medication_name: selectedMedication.drug_name,
        medication_generic: selectedMedication.generic_name,
        medication_brand: selectedMedication.brand_name,
        dosage: formData.dosage,
        frequency: formData.frequency,
        quantity: formData.quantity,
        refills: formData.refills,
        special_instructions: formData.special_instructions,
        drug_interactions: drugInteractions,
        pharmacy_id: formData.pharmacy_id || undefined
      });

      await blockchainAuditService.logEvent({
        event_type: 'prescription_created',
        resource_type: 'prescription',
        resource_id: prescription.id,
        actor_id: providerId,
        actor_role: 'provider',
        action_data: {
          patient_id: patientId,
          medication_name: selectedMedication.drug_name,
          pharmacy_id: formData.pharmacy_id,
          has_interactions: drugInteractions.length > 0,
          has_allergy_alerts: allergyChecks.length > 0
        }
      });

      if (sendToPharmacy && formData.pharmacy_id) {
        await ePrescriptionService.sendToPharmacy(prescription.id, formData.pharmacy_id);

        await blockchainAuditService.logEvent({
          event_type: 'prescription_sent',
          resource_type: 'prescription',
          resource_id: prescription.id,
          actor_id: providerId,
          actor_role: 'provider',
          action_data: {
            patient_id: patientId,
            pharmacy_id: formData.pharmacy_id
          }
        });
      }

      toast.success('Prescription saved successfully!');
      if (onSave) onSave(prescription.id);
    } catch (error) {
      console.error('Error saving prescription:', error);
      toast.error('Failed to save prescription');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Pill className="text-blue-600" />
          Write Prescription
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        )}
      </div>

      {(allergyChecks.length > 0 || drugInteractions.length > 0) && (
        <div className="space-y-3">
          {allergyChecks.map((allergy, index) => (
            <div key={index} className="bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-600 text-xl mt-1" />
                <div>
                  <p className="font-bold text-red-800">ALLERGY ALERT</p>
                  <p className="text-red-700">
                    Patient has documented allergy to {allergy.allergen} ({allergy.severity} severity)
                  </p>
                  <p className="text-sm text-red-600 mt-1">Reaction: {allergy.reaction}</p>
                </div>
              </div>
            </div>
          ))}

          {drugInteractions.map((interaction, index) => (
            <div
              key={index}
              className={`border-l-4 p-4 ${
                interaction.severity === 'high' ? 'bg-red-50 border-red-500' :
                interaction.severity === 'moderate' ? 'bg-yellow-50 border-yellow-500' :
                'bg-blue-50 border-blue-500'
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className={`text-xl mt-1 ${
                  interaction.severity === 'high' ? 'text-red-600' :
                  interaction.severity === 'moderate' ? 'text-yellow-600' :
                  'text-blue-600'
                }`} />
                <div>
                  <p className="font-bold text-gray-800">
                    {interaction.severity.toUpperCase()} DRUG INTERACTION
                  </p>
                  <p className="text-gray-700">{interaction.description}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {interaction.drug_a} + {interaction.drug_b}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Medication *
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Search by drug name, generic, or DIN..."
            />
            <Search className="absolute left-3 top-3 text-gray-400" />
          </div>

          {showResults && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((med, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectMedication(med)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-800">{med.drug_name}</div>
                  <div className="text-sm text-gray-600">
                    {med.generic_name && `Generic: ${med.generic_name} | `}
                    {med.strength} - {med.form}
                    {med.din && ` | DIN: ${med.din}`}
                  </div>
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="absolute right-3 top-10">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>

        {selectedMedication && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="font-semibold text-blue-800">Selected Medication:</p>
            <p className="text-blue-700">
              {selectedMedication.drug_name} - {selectedMedication.strength} {selectedMedication.form}
            </p>
            {selectedMedication.generic_name && (
              <p className="text-sm text-blue-600">Generic: {selectedMedication.generic_name}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dosage *
            </label>
            <input
              type="text"
              value={formData.dosage}
              onChange={(e) => setFormData(prev => ({ ...prev, dosage: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 500mg, 1 tablet"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Frequency *
            </label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {FREQUENCIES.map(freq => (
                <option key={freq} value={freq}>{freq}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity *
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Refills
            </label>
            <select
              value={formData.refills}
              onChange={(e) => setFormData(prev => ({ ...prev, refills: parseInt(e.target.value) }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {[0, 1, 2, 3, 4, 5].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Special Instructions
          </label>
          <textarea
            value={formData.special_instructions}
            onChange={(e) => setFormData(prev => ({ ...prev, special_instructions: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="e.g., Take with food, Avoid alcohol, Take at bedtime..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Send to Pharmacy (Optional)
          </label>
          <select
            value={formData.pharmacy_id}
            onChange={(e) => setFormData(prev => ({ ...prev, pharmacy_id: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Patient will select pharmacy</option>
            {pharmacies.map((pharmacy) => (
              <option key={pharmacy.id} value={pharmacy.id}>
                {pharmacy.pharmacy_name} - {pharmacy.city}, {pharmacy.province}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 mt-1">
            {formData.pharmacy_id ? 'Prescription will be sent directly to selected pharmacy' : 'Patient can choose pharmacy later'}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          onClick={() => handleSave(false)}
          disabled={saving || !selectedMedication}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 flex items-center gap-2"
        >
          <Save />
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving || !selectedMedication || !formData.pharmacy_id}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2"
        >
          <Send />
          {saving ? 'Sending...' : 'Save & Send to Pharmacy'}
        </button>
      </div>
    </div>
  );
}
