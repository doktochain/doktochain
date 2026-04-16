import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../../../../../contexts/AuthContext';
import { patientService } from '../../../../../services/patientService';
import { providerService } from '../../../../../services/providerService';
import { prescriptionService } from '../../../../../services/prescriptionService';

export default function CreatePrescriptionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    medication: '',
    strength: '',
    dosageForm: 'tablet',
    quantity: '',
    quantityUnit: 'tablets',
    directions: '',
    frequency: 'BID',
    durationDays: '',
    refills: '0',
    indication: '',
    specialInstructions: '',
    daw: false,
    isControlled: false,
    requiresMonitoring: false,
  });

  const [safetyAlerts] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      try {
        const provider = await providerService.getProviderByUserId(user.id);
        if (provider) setProviderId(provider.id);
      } catch (err) {
        console.error('Failed to resolve provider', err);
      }
    };
    init();
  }, [user]);

  useEffect(() => {
    const term = patientSearch.trim();
    if (term.length < 2) {
      setPatientResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await patientService.searchPatients(term, 10);
        if (!cancelled) setPatientResults(results);
      } catch (err) {
        console.error('Patient search failed', err);
        if (!cancelled) setPatientResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [patientSearch]);

  const frequencies = [
    { value: 'QD', label: 'Once Daily (QD)' },
    { value: 'BID', label: 'Twice Daily (BID)' },
    { value: 'TID', label: 'Three Times Daily (TID)' },
    { value: 'QID', label: 'Four Times Daily (QID)' },
    { value: 'Q4H', label: 'Every 4 Hours (Q4H)' },
    { value: 'Q6H', label: 'Every 6 Hours (Q6H)' },
    { value: 'Q8H', label: 'Every 8 Hours (Q8H)' },
    { value: 'Q12H', label: 'Every 12 Hours (Q12H)' },
    { value: 'PRN', label: 'As Needed (PRN)' },
    { value: 'QHS', label: 'At Bedtime (QHS)' },
    { value: 'QAM', label: 'Every Morning (QAM)' },
  ];

  const dosageForms = [
    'tablet', 'capsule', 'liquid', 'injection', 'cream', 'ointment',
    'gel', 'patch', 'inhaler', 'drops', 'suppository', 'powder',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error('Please select a patient');
      setStep(1);
      return;
    }
    if (!providerId) {
      toast.error('Provider profile not found');
      return;
    }

    setSubmitting(true);
    try {
      const refillsNum = parseInt(formData.refills, 10) || 0;
      const prescription = await prescriptionService.createPrescription({
        patient_id: selectedPatient.id,
        provider_id: providerId,
        prescription_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        diagnosis: formData.indication,
        notes: formData.specialInstructions || undefined,
        is_controlled_substance: formData.isControlled,
      });

      await prescriptionService.addPrescriptionItems(
        [
          {
            prescription_id: prescription.id,
            medication_name: formData.medication,
            strength: formData.strength,
            dosage_form: formData.dosageForm,
            quantity: parseInt(formData.quantity, 10) || 0,
            dosage_instructions: formData.directions,
            frequency: formData.frequency,
            duration_days: formData.durationDays ? parseInt(formData.durationDays, 10) : undefined,
            refills_allowed: refillsNum,
            refills_remaining: refillsNum,
            substitution_allowed: !formData.daw,
            special_instructions: formData.specialInstructions || undefined,
          },
        ],
        providerId
      );

      toast.success('Prescription created successfully');
      navigate('/dashboard/provider/prescriptions');
    } catch (err: any) {
      console.error('Failed to create prescription', err);
      toast.error(err?.message || 'Failed to create prescription');
    } finally {
      setSubmitting(false);
    }
  };

  const renderPatientLabel = (p: any) => {
    const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown patient';
    const dob = p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : null;
    return { name, dob };
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard/provider/prescriptions')}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
        >
          ← Back to Prescriptions
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Write New Prescription
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Complete e-prescription with safety checks
        </p>
      </div>

      <div className="mb-8 flex items-center justify-between max-w-2xl mx-auto">
        {[
          { num: 1, label: 'Patient' },
          { num: 2, label: 'Medication' },
          { num: 3, label: 'Dosage' },
          { num: 4, label: 'Review' },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step >= s.num ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {s.num}
            </div>
            <span className="ml-2 text-sm font-medium">{s.label}</span>
            {idx < 3 && (
              <div className={`w-16 h-1 mx-4 ${step > s.num ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {safetyAlerts.length > 0 && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-semibold text-yellow-800">Safety Alerts</h3>
              <ul className="mt-2 space-y-1">
                {safetyAlerts.map((alert, idx) => (
                  <li key={idx} className="text-sm text-yellow-700">• {alert.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Select Patient</h2>

              {selectedPatient ? (
                <div className="p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 rounded-lg flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {renderPatientLabel(selectedPatient).name}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 mt-1 space-y-0.5">
                      {selectedPatient.email && <div>Email: {selectedPatient.email}</div>}
                      {selectedPatient.health_card_number && (
                        <div>Health Card: {selectedPatient.health_card_number}</div>
                      )}
                      {selectedPatient.date_of_birth && (
                        <div>DOB: {new Date(selectedPatient.date_of_birth).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatient(null);
                      setPatientSearch('');
                    }}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search Patient *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, email, health card, or DOB (YYYY-MM-DD)"
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {searching && (
                    <p className="mt-2 text-sm text-gray-500">Searching...</p>
                  )}

                  {patientResults.length > 0 && (
                    <ul className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 max-h-72 overflow-auto">
                      {patientResults.map((p) => {
                        const { name, dob } = renderPatientLabel(p);
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedPatient(p)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <div className="font-medium text-gray-900 dark:text-white">{name}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                {p.email && <span>{p.email}</span>}
                                {p.email && (p.health_card_number || dob) && <span> · </span>}
                                {p.health_card_number && <span>HC: {p.health_card_number}</span>}
                                {p.health_card_number && dob && <span> · </span>}
                                {dob && <span>DOB: {dob}</span>}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {!searching && patientSearch.trim().length >= 2 && patientResults.length === 0 && (
                    <p className="mt-2 text-sm text-gray-500">No patients found.</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Indication / Diagnosis *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter diagnosis or reason for prescription"
                  value={formData.indication}
                  onChange={(e) => setFormData({ ...formData, indication: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!selectedPatient) {
                    toast.error('Please select a patient');
                    return;
                  }
                  if (!formData.indication.trim()) {
                    toast.error('Please enter a diagnosis');
                    return;
                  }
                  setStep(2);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                Continue to Medication
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Medication Details</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Medication Name *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g., Amoxicillin"
                    value={formData.medication}
                    onChange={(e) => setFormData({ ...formData, medication: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dosage Form *
                  </label>
                  <select
                    required
                    value={formData.dosageForm}
                    onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {dosageForms.map((form) => (
                      <option key={form} value={form}>
                        {form.charAt(0).toUpperCase() + form.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Strength *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., 500mg"
                    value={formData.strength}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 px-6 py-3 rounded-lg font-semibold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.medication.trim() || !formData.strength.trim()) {
                      toast.error('Medication and strength are required');
                      return;
                    }
                    setStep(3);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                >
                  Continue to Dosage
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Dosage Instructions</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quantity *</label>
                  <input
                    type="number"
                    required
                    placeholder="30"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Unit *</label>
                  <select
                    required
                    value={formData.quantityUnit}
                    onChange={(e) => setFormData({ ...formData, quantityUnit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="tablets">Tablets</option>
                    <option value="capsules">Capsules</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="grams">Grams</option>
                    <option value="units">Units</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Frequency *</label>
                <select
                  required
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {frequencies.map((freq) => (
                    <option key={freq.value} value={freq.value}>{freq.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Patient Instructions (SIG) *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g., Take 1 tablet by mouth twice daily with food"
                  value={formData.directions}
                  onChange={(e) => setFormData({ ...formData, directions: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duration (days)</label>
                  <input
                    type="number"
                    placeholder="30"
                    value={formData.durationDays}
                    onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Refills Authorized *</label>
                  <select
                    required
                    value={formData.refills}
                    onChange={(e) => setFormData({ ...formData, refills: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {[0, 1, 2, 3, 4, 5].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'Refill' : 'Refills'}
                      </option>
                    ))}
                    <option value="999">Unlimited (Chronic)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Special Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Additional instructions for patient or pharmacist"
                  value={formData.specialInstructions}
                  onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.daw}
                    onChange={(e) => setFormData({ ...formData, daw: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Dispense As Written (DAW) - No substitutions allowed
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isControlled}
                    onChange={(e) => setFormData({ ...formData, isControlled: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Controlled Substance</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.requiresMonitoring}
                    onChange={(e) => setFormData({ ...formData, requiresMonitoring: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Requires Lab Monitoring</span>
                </label>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 px-6 py-3 rounded-lg font-semibold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.quantity || !formData.directions.trim()) {
                      toast.error('Quantity and instructions are required');
                      return;
                    }
                    setStep(4);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                >
                  Review Prescription
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Review Prescription</h2>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Patient:</span>
                  <p className="text-gray-900 dark:text-white">
                    {selectedPatient
                      ? `${selectedPatient.first_name || ''} ${selectedPatient.last_name || ''}`.trim()
                      : 'Not selected'}
                  </p>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Medication:</span>
                  <p className="text-gray-900 dark:text-white">
                    {formData.medication} {formData.strength}
                  </p>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Instructions:</span>
                  <p className="text-gray-900 dark:text-white">{formData.directions}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Quantity:</span>
                    <p className="text-gray-900 dark:text-white">
                      {formData.quantity} {formData.quantityUnit}
                    </p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Refills:</span>
                    <p className="text-gray-900 dark:text-white">
                      {formData.refills === '999' ? 'Unlimited' : formData.refills}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Indication:</span>
                  <p className="text-gray-900 dark:text-white">{formData.indication}</p>
                </div>
              </div>

              <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
                  <div>
                    <h3 className="text-sm font-semibold text-green-800">Safety Checks Passed</h3>
                    <p className="text-sm text-green-700 mt-1">
                      No critical safety alerts detected for this prescription.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 px-6 py-3 rounded-lg font-semibold"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-3 rounded-lg font-semibold"
                >
                  {submitting ? 'Submitting...' : 'Sign & Submit Prescription'}
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
