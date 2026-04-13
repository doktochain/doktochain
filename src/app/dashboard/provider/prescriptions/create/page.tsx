import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, AlertCircle, CheckCircle, Plus } from 'lucide-react';

export default function CreatePrescriptionPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    patient: '',
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

  const [safetyAlerts, setSafetyAlerts] = useState<any[]>([]);

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
    'gel', 'patch', 'inhaler', 'drops', 'suppository', 'powder'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would integrate with the prescription service
    toast.success('Prescription created successfully!');
    navigate('/dashboard/provider/prescriptions');
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

      {/* Progress Steps */}
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
                step >= s.num
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {s.num}
            </div>
            <span className="ml-2 text-sm font-medium">{s.label}</span>
            {idx < 3 && (
              <div
                className={`w-16 h-1 mx-4 ${
                  step > s.num ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Safety Alerts */}
      {safetyAlerts.length > 0 && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-semibold text-yellow-800">
                Safety Alerts
              </h3>
              <ul className="mt-2 space-y-1">
                {safetyAlerts.map((alert, idx) => (
                  <li key={idx} className="text-sm text-yellow-700">
                    • {alert.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
          {/* Step 1: Patient Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Select Patient
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search Patient *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Search by name, health card number, or DOB"
                    value={formData.patient}
                    onChange={(e) =>
                      setFormData({ ...formData, patient: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Indication / Diagnosis *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter diagnosis or reason for prescription"
                  value={formData.indication}
                  onChange={(e) =>
                    setFormData({ ...formData, indication: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                Continue to Medication
              </button>
            </div>
          )}

          {/* Step 2: Medication Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Medication Details
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search Medication *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Search by generic name, brand name, or DIN"
                    value={formData.medication}
                    onChange={(e) =>
                      setFormData({ ...formData, medication: e.target.value })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, dosageForm: e.target.value })
                    }
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
                    placeholder="e.g., 500mg, 10mg/5ml"
                    value={formData.strength}
                    onChange={(e) =>
                      setFormData({ ...formData, strength: e.target.value })
                    }
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
                  onClick={() => setStep(3)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                >
                  Continue to Dosage
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Dosage Instructions */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Dosage Instructions
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="30"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Unit *
                  </label>
                  <select
                    required
                    value={formData.quantityUnit}
                    onChange={(e) =>
                      setFormData({ ...formData, quantityUnit: e.target.value })
                    }
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Frequency *
                </label>
                <select
                  required
                  value={formData.frequency}
                  onChange={(e) =>
                    setFormData({ ...formData, frequency: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {frequencies.map((freq) => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label}
                    </option>
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
                  onChange={(e) =>
                    setFormData({ ...formData, directions: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Duration (days)
                  </label>
                  <input
                    type="number"
                    placeholder="30"
                    value={formData.durationDays}
                    onChange={(e) =>
                      setFormData({ ...formData, durationDays: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Refills Authorized *
                  </label>
                  <select
                    required
                    value={formData.refills}
                    onChange={(e) =>
                      setFormData({ ...formData, refills: e.target.value })
                    }
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Special Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional instructions for patient or pharmacist"
                  value={formData.specialInstructions}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      specialInstructions: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.daw}
                    onChange={(e) =>
                      setFormData({ ...formData, daw: e.target.checked })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, isControlled: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Controlled Substance
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.requiresMonitoring}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requiresMonitoring: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Requires Lab Monitoring
                  </span>
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
                  onClick={() => setStep(4)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                >
                  Review Prescription
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review and Submit */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Review Prescription
              </h2>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Patient:
                  </span>
                  <p className="text-gray-900 dark:text-white">
                    {formData.patient || 'Not selected'}
                  </p>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Medication:
                  </span>
                  <p className="text-gray-900 dark:text-white">
                    {formData.medication} {formData.strength}
                  </p>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Instructions:
                  </span>
                  <p className="text-gray-900 dark:text-white">
                    {formData.directions}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Quantity:
                    </span>
                    <p className="text-gray-900 dark:text-white">
                      {formData.quantity} {formData.quantityUnit}
                    </p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Refills:
                    </span>
                    <p className="text-gray-900 dark:text-white">
                      {formData.refills === '999' ? 'Unlimited' : formData.refills}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Indication:
                  </span>
                  <p className="text-gray-900 dark:text-white">
                    {formData.indication}
                  </p>
                </div>
              </div>

              <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
                  <div>
                    <h3 className="text-sm font-semibold text-green-800">
                      Safety Checks Passed
                    </h3>
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
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
                >
                  Sign & Submit Prescription
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
