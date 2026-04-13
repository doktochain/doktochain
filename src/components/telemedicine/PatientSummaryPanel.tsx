import { useState, useEffect } from 'react';
import { User, Pill, AlertTriangle, Activity, FileText, Calendar } from 'lucide-react';

interface PatientSummaryPanelProps {
  patientId: string;
}

export default function PatientSummaryPanel({ patientId }: PatientSummaryPanelProps) {
  const [loading, setLoading] = useState(true);
  const [patientData, setPatientData] = useState<any>(null);

  useEffect(() => {
    loadPatientSummary();
  }, [patientId]);

  const loadPatientSummary = async () => {
    setLoading(true);
    setPatientData({
      name: 'John Doe',
      age: 45,
      gender: 'Male',
      allergies: ['Penicillin', 'Sulfa drugs'],
      medications: [
        { name: 'Lisinopril 10mg', frequency: 'Once daily' },
        { name: 'Metformin 500mg', frequency: 'Twice daily' },
      ],
      conditions: ['Hypertension', 'Type 2 Diabetes'],
      recentVisits: [
        { date: '2024-11-15', reason: 'Follow-up', provider: 'Dr. Smith' },
        { date: '2024-10-20', reason: 'Annual Physical', provider: 'Dr. Smith' },
      ],
      vitals: {
        bloodPressure: '128/82',
        heartRate: '72',
        temperature: '98.6°F',
        weight: '185 lbs',
      },
      labResults: [
        { test: 'HbA1c', value: '6.8%', date: '2024-11-10', status: 'normal' },
        { test: 'Cholesterol', value: '195 mg/dL', date: '2024-11-10', status: 'normal' },
      ],
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-gray-800 p-4 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">{patientData.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {patientData.age} years old • {patientData.gender}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h4 className="font-semibold text-red-900 dark:text-red-100">Allergies</h4>
          </div>
          {patientData.allergies.length > 0 ? (
            <ul className="space-y-1">
              {patientData.allergies.map((allergy: string, index: number) => (
                <li key={index} className="text-sm text-red-800 dark:text-red-200">
                  • {allergy}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-red-700 dark:text-red-300">No known allergies</p>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Pill className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Current Medications</h4>
          </div>
          {patientData.medications.length > 0 ? (
            <div className="space-y-2">
              {patientData.medications.map((med: any, index: number) => (
                <div key={index} className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{med.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{med.frequency}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">No current medications</p>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-green-600" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Active Conditions</h4>
          </div>
          {patientData.conditions.length > 0 ? (
            <div className="space-y-1">
              {patientData.conditions.map((condition: string, index: number) => (
                <div key={index} className="text-sm text-gray-700 dark:text-gray-300">
                  • {condition}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">No active conditions</p>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Recent Vitals</h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="text-xs text-gray-600 dark:text-gray-400">Blood Pressure</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {patientData.vitals.bloodPressure}
              </p>
            </div>
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="text-xs text-gray-600 dark:text-gray-400">Heart Rate</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {patientData.vitals.heartRate} bpm
              </p>
            </div>
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="text-xs text-gray-600 dark:text-gray-400">Temperature</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {patientData.vitals.temperature}
              </p>
            </div>
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="text-xs text-gray-600 dark:text-gray-400">Weight</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {patientData.vitals.weight}
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-orange-600" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Recent Lab Results</h4>
          </div>
          {patientData.labResults.length > 0 ? (
            <div className="space-y-2">
              {patientData.labResults.map((lab: any, index: number) => (
                <div key={index} className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{lab.test}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {new Date(lab.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{lab.value}</p>
                      <span
                        className={`text-xs ${
                          lab.status === 'normal'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {lab.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">No recent lab results</p>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Recent Visits</h4>
          </div>
          {patientData.recentVisits.length > 0 ? (
            <div className="space-y-2">
              {patientData.recentVisits.map((visit: any, index: number) => (
                <div key={index} className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{visit.reason}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {new Date(visit.date).toLocaleDateString()} • {visit.provider}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">No recent visits</p>
          )}
        </div>
      </div>
    </div>
  );
}
