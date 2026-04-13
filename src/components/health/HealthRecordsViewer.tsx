import { useState, useEffect } from 'react';
import { fhirService, LabResult, VitalSign, Immunization, Diagnosis } from '../../services/fhirService';
import { RefreshCw, ArrowUp, ArrowDown, Minus, CheckCircle, AlertTriangle, AlertCircle, Syringe, Stethoscope, FlaskConical, TrendingUp } from 'lucide-react';

interface HealthRecordsViewerProps {
  patientId: string;
}

export default function HealthRecordsViewer({ patientId }: HealthRecordsViewerProps) {
  const [activeTab, setActiveTab] = useState<'labs' | 'vitals' | 'immunizations' | 'diagnoses'>('labs');
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [immunizations, setImmunizations] = useState<Immunization[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadHealthData();
  }, [patientId]);

  const loadHealthData = async () => {
    setLoading(true);
    try {
      const [labs, vitalSigns, imms, diags, status] = await Promise.all([
        fhirService.getLabResults(patientId, 10),
        fhirService.getVitalSigns(patientId, undefined, 30),
        fhirService.getImmunizations(patientId),
        fhirService.getDiagnoses(patientId),
        fhirService.getSyncStatus(patientId),
      ]);

      setLabResults(labs);
      setVitals(vitalSigns);
      setImmunizations(imms);
      setDiagnoses(diags);
      setSyncStatus(status);
    } catch (error) {
      console.error('Error loading health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const status = await fhirService.syncFHIRData(patientId);
      setSyncStatus(status);
      await loadHealthData();
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setSyncing(false);
    }
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <ArrowUp className="text-green-600" />;
    if (trend === 'down') return <ArrowDown className="text-red-600" />;
    return <Minus className="text-gray-400" />;
  };

  const getStatusBadge = (status: 'normal' | 'abnormal' | 'critical') => {
    if (status === 'normal')
      return (
        <span className="flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
          <CheckCircle /> Normal
        </span>
      );
    if (status === 'abnormal')
      return (
        <span className="flex items-center gap-1 text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
          <AlertTriangle /> Abnormal
        </span>
      );
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
        <AlertCircle /> Critical
      </span>
    );
  };

  const tabs = [
    { id: 'labs' as const, label: 'Lab Results', icon: <FlaskConical />, count: labResults.length },
    { id: 'vitals' as const, label: 'Vitals', icon: <TrendingUp />, count: vitals.length },
    { id: 'immunizations' as const, label: 'Immunizations', icon: <Syringe />, count: immunizations.length },
    { id: 'diagnoses' as const, label: 'Diagnoses', icon: <Stethoscope />, count: diagnoses.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Health Records</h2>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            <RefreshCw className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Data'}
          </button>
        </div>

        {syncStatus && (
          <div
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg ${
              syncStatus.sync_status === 'synced'
                ? 'bg-green-50 text-green-700'
                : 'bg-yellow-50 text-yellow-700'
            }`}
          >
            <CheckCircle />
            <span>
              Last synced: {new Date(syncStatus.last_sync).toLocaleString()} • {syncStatus.records_synced} records
            </span>
          </div>
        )}
      </div>

      <div className="border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'labs' && (
          <div className="space-y-4">
            {labResults.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No lab results available</p>
            ) : (
              labResults.map((lab) => (
                <div key={lab.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{lab.test_name}</h3>
                        {getStatusBadge(lab.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <span className="font-medium text-gray-900 text-lg">
                            {lab.value} {lab.unit}
                          </span>
                        </span>
                        <span>Reference: {lab.reference_range}</span>
                        <span className="flex items-center gap-1">
                          Trend: {getTrendIcon(lab.trend)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">
                        {new Date(lab.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'vitals' && (
          <div className="space-y-4">
            {vitals.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No vital signs recorded</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['blood_pressure', 'heart_rate', 'weight', 'glucose'].map((type) => {
                  const typeVitals = vitals.filter((v) => v.type === type).slice(0, 5);
                  if (typeVitals.length === 0) return null;

                  return (
                    <div key={type} className="p-4 border border-gray-200 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-3 capitalize">
                        {type.replace('_', ' ')}
                      </h3>
                      <div className="space-y-2">
                        {typeVitals.map((vital) => (
                          <div key={vital.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">
                              {new Date(vital.date).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {vital.value} {vital.unit}
                              </span>
                              {getTrendIcon(vital.trend)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'immunizations' && (
          <div className="space-y-4">
            {immunizations.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No immunization records</p>
            ) : (
              immunizations.map((imm) => (
                <div key={imm.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{imm.vaccine_name}</h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Provider: {imm.provider}</p>
                        {imm.lot_number && <p>Lot: {imm.lot_number}</p>}
                        {imm.site && <p>Site: {imm.site}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(imm.date_administered).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'diagnoses' && (
          <div className="space-y-4">
            {diagnoses.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No diagnoses recorded</p>
            ) : (
              diagnoses.map((diagnosis) => (
                <div key={diagnosis.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{diagnosis.condition}</h3>
                      <p className="text-sm text-gray-600">ICD-10: {diagnosis.icd10_code}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          diagnosis.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : diagnosis.status === 'resolved'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {diagnosis.status}
                      </span>
                      {diagnosis.severity && (
                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                          {diagnosis.severity}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Onset: {new Date(diagnosis.onset_date).toLocaleDateString()}</p>
                    {diagnosis.notes && <p className="mt-1 italic">{diagnosis.notes}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
