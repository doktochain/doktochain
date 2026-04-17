import { useState } from 'react';
import { Activity, Save } from 'lucide-react';
import { toast } from 'sonner';
import { ehrService, FHIRObservation } from '../../services/ehrService';
import { useAuth } from '../../contexts/AuthContext';

interface VitalSignsFormProps {
  patientId: string;
  appointmentId?: string;
  onSave?: () => void;
}

export default function VitalSignsForm({ patientId, appointmentId, onSave }: VitalSignsFormProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [vitals, setVitals] = useState({
    systolic: '',
    diastolic: '',
    heartRate: '',
    temperature: '',
    weight: '',
    height: '',
    oxygenSaturation: '',
    glucose: '',
  });

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const observations: Partial<FHIRObservation>[] = [];

      // Blood Pressure
      if (vitals.systolic && vitals.diastolic) {
        observations.push({
          patient_id: patientId,
          provider_id: user.id,
          appointment_id: appointmentId,
          observation_code: '85354-9',
          observation_display: 'Blood Pressure',
          category: ['vital-signs'],
          components: {
            systolic: { value: parseFloat(vitals.systolic), unit: 'mmHg' },
            diastolic: { value: parseFloat(vitals.diastolic), unit: 'mmHg' },
          },
          value_string: `${vitals.systolic}/${vitals.diastolic}`,
          value_unit: 'mmHg',
          reference_range_low: 90,
          reference_range_high: 140,
          reference_range_text: '90-140/60-90 mmHg',
        });
      }

      // Heart Rate
      if (vitals.heartRate) {
        observations.push({
          patient_id: patientId,
          provider_id: user.id,
          appointment_id: appointmentId,
          observation_code: '8867-4',
          observation_display: 'Heart Rate',
          category: ['vital-signs'],
          value_quantity: parseFloat(vitals.heartRate),
          value_unit: 'bpm',
          reference_range_low: 60,
          reference_range_high: 100,
          reference_range_text: '60-100 bpm',
        });
      }

      // Temperature
      if (vitals.temperature) {
        observations.push({
          patient_id: patientId,
          provider_id: user.id,
          appointment_id: appointmentId,
          observation_code: '8310-5',
          observation_display: 'Body Temperature',
          category: ['vital-signs'],
          value_quantity: parseFloat(vitals.temperature),
          value_unit: '°C',
          reference_range_low: 36.5,
          reference_range_high: 37.5,
          reference_range_text: '36.5-37.5°C',
        });
      }

      // Weight
      if (vitals.weight) {
        observations.push({
          patient_id: patientId,
          provider_id: user.id,
          appointment_id: appointmentId,
          observation_code: '29463-7',
          observation_display: 'Body Weight',
          category: ['vital-signs'],
          value_quantity: parseFloat(vitals.weight),
          value_unit: 'kg',
        });
      }

      // Height
      if (vitals.height) {
        observations.push({
          patient_id: patientId,
          provider_id: user.id,
          appointment_id: appointmentId,
          observation_code: '8302-2',
          observation_display: 'Body Height',
          category: ['vital-signs'],
          value_quantity: parseFloat(vitals.height),
          value_unit: 'cm',
        });
      }

      // Oxygen Saturation
      if (vitals.oxygenSaturation) {
        observations.push({
          patient_id: patientId,
          provider_id: user.id,
          appointment_id: appointmentId,
          observation_code: '2708-6',
          observation_display: 'Oxygen Saturation',
          category: ['vital-signs'],
          value_quantity: parseFloat(vitals.oxygenSaturation),
          value_unit: '%',
          reference_range_low: 95,
          reference_range_high: 100,
          reference_range_text: '95-100%',
        });
      }

      // Glucose
      if (vitals.glucose) {
        observations.push({
          patient_id: patientId,
          provider_id: user.id,
          appointment_id: appointmentId,
          observation_code: '2339-0',
          observation_display: 'Glucose',
          category: ['vital-signs'],
          value_quantity: parseFloat(vitals.glucose),
          value_unit: 'mmol/L',
          reference_range_low: 4.0,
          reference_range_high: 7.0,
          reference_range_text: '4.0-7.0 mmol/L',
        });
      }

      // Save all observations
      for (const obs of observations) {
        await ehrService.createObservation(obs as FHIRObservation, user.id);
      }

      // Reset form
      setVitals({
        systolic: '',
        diastolic: '',
        heartRate: '',
        temperature: '',
        weight: '',
        height: '',
        oxygenSaturation: '',
        glucose: '',
      });

      if (onSave) onSave();
      toast.success('Vital signs saved successfully');
    } catch (error) {
      console.error('Error saving vital signs:', error);
      toast.error('Failed to save vital signs');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Record Vital Signs
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              FHIR-compliant observations
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save All'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Blood Pressure (mmHg)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={vitals.systolic}
              onChange={(e) => setVitals({ ...vitals, systolic: e.target.value })}
              placeholder="Systolic"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <span className="flex items-center text-gray-500">/</span>
            <input
              type="number"
              value={vitals.diastolic}
              onChange={(e) => setVitals({ ...vitals, diastolic: e.target.value })}
              placeholder="Diastolic"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Heart Rate (bpm)
          </label>
          <input
            type="number"
            value={vitals.heartRate}
            onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
            placeholder="e.g., 72"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Temperature (°C)
          </label>
          <input
            type="number"
            step="0.1"
            value={vitals.temperature}
            onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
            placeholder="e.g., 37.0"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Weight (kg)
          </label>
          <input
            type="number"
            step="0.1"
            value={vitals.weight}
            onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
            placeholder="e.g., 70.5"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Height (cm)
          </label>
          <input
            type="number"
            step="0.1"
            value={vitals.height}
            onChange={(e) => setVitals({ ...vitals, height: e.target.value })}
            placeholder="e.g., 175"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            O₂ Saturation (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={vitals.oxygenSaturation}
            onChange={(e) => setVitals({ ...vitals, oxygenSaturation: e.target.value })}
            placeholder="e.g., 98"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Glucose (mmol/L)
          </label>
          <input
            type="number"
            step="0.1"
            value={vitals.glucose}
            onChange={(e) => setVitals({ ...vitals, glucose: e.target.value })}
            placeholder="e.g., 5.5"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          All vital signs are recorded as FHIR Observation resources with cryptographic audit trail
        </p>
      </div>
    </div>
  );
}
