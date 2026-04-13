import { useState, useEffect } from 'react';
import { useAuth } from '../../../../../contexts/AuthContext';
import { patientService } from '../../../../../services/patientService';
import { fhirService, VitalSign } from '../../../../../services/fhirService';
import {
  Heart,
  Thermometer,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Droplets,
  Ruler,
} from 'lucide-react';

const VITAL_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  blood_pressure: { label: 'Blood Pressure', icon: Heart, color: 'text-red-600', bgColor: 'bg-red-50' },
  heart_rate: { label: 'Heart Rate', icon: Activity, color: 'text-rose-600', bgColor: 'bg-rose-50' },
  temperature: { label: 'Temperature', icon: Thermometer, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  weight: { label: 'Weight', icon: TrendingUp, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  height: { label: 'Height', icon: Ruler, color: 'text-green-600', bgColor: 'bg-green-50' },
  bmi: { label: 'BMI', icon: TrendingUp, color: 'text-teal-600', bgColor: 'bg-teal-50' },
  oxygen_saturation: { label: 'O2 Saturation', icon: Droplets, color: 'text-sky-600', bgColor: 'bg-sky-50' },
  glucose: { label: 'Blood Glucose', icon: Droplets, color: 'text-amber-600', bgColor: 'bg-amber-50' },
};

export default function VitalSignsPage() {
  const { user } = useAuth();
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadVitals();
  }, [user]);

  const loadVitals = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const patient = await patientService.getPatientByUserId(user.id);
      if (patient) {
        const data = await fhirService.getVitalSigns(patient.id);
        setVitals(data);
      }
    } catch (err) {
      console.error('Failed to load vitals:', err);
    }
    setLoading(false);
  };

  const latestByType = vitals.reduce<Record<string, VitalSign>>((acc, v) => {
    if (!acc[v.type]) acc[v.type] = v;
    return acc;
  }, {});

  const filteredVitals = selectedType ? vitals.filter((v) => v.type === selectedType) : vitals;

  const getTrendIcon = (trend?: string) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-blue-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Vital Signs</h1>
        <p className="text-gray-600 mt-1">Track and monitor your health metrics</p>
      </div>

      {Object.keys(latestByType).length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(latestByType).map(([type, vital]) => {
              const config = VITAL_TYPE_CONFIG[type] || VITAL_TYPE_CONFIG.heart_rate;
              const Icon = config.icon;
              const isSelected = selectedType === type;

              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(isSelected ? null : type)}
                  className={`rounded-lg p-4 text-left transition-all border-2 ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-transparent hover:border-gray-200'
                  } ${config.bgColor}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    {getTrendIcon(vital.trend)}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {vital.value} <span className="text-sm font-normal text-gray-500">{vital.unit}</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{config.label}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(vital.date).toLocaleDateString()}</p>
                </button>
              );
            })}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedType
                  ? `${VITAL_TYPE_CONFIG[selectedType]?.label || selectedType} History`
                  : 'Recent Readings'}
              </h2>
              {selectedType && (
                <button onClick={() => setSelectedType(null)} className="text-sm text-blue-600 hover:text-blue-700">
                  Show All
                </button>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredVitals.slice(0, 20).map((vital) => {
                    const config = VITAL_TYPE_CONFIG[vital.type] || VITAL_TYPE_CONFIG.heart_rate;
                    const Icon = config.icon;

                    return (
                      <tr key={vital.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${config.color}`} />
                            <span className="text-sm font-medium text-gray-900">{config.label}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-gray-900">{vital.value}</span>
                          <span className="text-sm text-gray-500 ml-1">{vital.unit}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {new Date(vital.date).toLocaleDateString()} {new Date(vital.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-6 py-4">{getTrendIcon(vital.trend)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No vital signs recorded</h3>
          <p className="text-gray-600">
            Your vital signs will appear here after they are recorded during appointments.
          </p>
        </div>
      )}
    </div>
  );
}
