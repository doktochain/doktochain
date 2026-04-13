import { useState, useEffect } from 'react';
import { FileText, Activity, Pill, Shield, Download, Share, Clock, AlertCircle, Syringe } from 'lucide-react';
import { patientService } from '../../services/patientService';
import { healthRecordsService } from '../../services/healthRecordsService';
import { useAuth } from '../../contexts/AuthContext';
import HealthTimelineTab from '../health-records/HealthTimelineTab';
import MedicationsTab from '../health-records/MedicationsTab';
import LabResultsTab from '../health-records/LabResultsTab';
import AllergiesTab from '../health-records/AllergiesTab';
import ImmunizationsTab from '../health-records/ImmunizationsTab';
import ClinicalNotesTab from '../health-records/ClinicalNotesTab';
import ShareRecordsModal from '../health-records/ShareRecordsModal';
import ExportRecordsModal from '../health-records/ExportRecordsModal';
import ConsentManagement from '../health-records/ConsentManagement';

export default function PatientEHRViewer() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'timeline' | 'medications' | 'labs' | 'allergies' | 'immunizations' | 'notes'>('timeline');
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState<string>('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [stats, setStats] = useState({
    medications: 0,
    allergies: 0,
    labResults: 0,
    notes: 0
  });

  useEffect(() => {
    if (user) {
      loadPatientData();
    }
  }, [user]);

  const loadPatientData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const patient = await patientService.getPatientByUserId(user.id);
      if (patient) {
        setPatientId(patient.id);
        await loadStats(patient.id);
      }
    } catch (error) {
      console.error('Error loading patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (pid: string) => {
    try {
      const [medications, allergies, labRes, notesRes] = await Promise.all([
        patientService.getMedications(pid),
        patientService.getAllergies(pid),
        healthRecordsService.getLabResults(pid),
        healthRecordsService.getClinicalNotes(pid),
      ]);

      setStats({
        medications: medications.length,
        allergies: allergies.length,
        labResults: labRes.data?.length || 0,
        notes: notesRes.data?.length || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your health records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Health Records</h2>
          <p className="text-gray-600 dark:text-gray-400">FHIR-compliant electronic health records</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowConsentModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Shield className="w-4 h-4" />
            Consents
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors"
          >
            <Share className="w-4 h-4" />
            Share
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-4 text-white">
          <Pill className="w-6 h-6 mb-2" />
          <p className="text-2xl font-bold">{stats.medications}</p>
          <p className="text-blue-100 text-sm">Medications</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-4 text-white">
          <AlertCircle className="w-6 h-6 mb-2" />
          <p className="text-2xl font-bold">{stats.allergies}</p>
          <p className="text-red-100 text-sm">Allergies</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-4 text-white">
          <Activity className="w-6 h-6 mb-2" />
          <p className="text-2xl font-bold">{stats.labResults}</p>
          <p className="text-green-100 text-sm">Lab Results</p>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg shadow-lg p-4 text-white">
          <Shield className="w-6 h-6 mb-2" />
          <p className="text-2xl font-bold">{stats.notes}</p>
          <p className="text-teal-100 text-sm">Clinical Notes</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2 p-4">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'timeline'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Clock className="w-4 h-4" />
              Timeline
            </button>

            <button
              onClick={() => setActiveTab('medications')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'medications'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Pill className="w-4 h-4" />
              Medications
            </button>

            <button
              onClick={() => setActiveTab('labs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'labs'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Activity className="w-4 h-4" />
              Lab Results
            </button>

            <button
              onClick={() => setActiveTab('allergies')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'allergies'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              Allergies
            </button>

            <button
              onClick={() => setActiveTab('immunizations')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'immunizations'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Syringe className="w-4 h-4" />
              Immunizations
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'notes'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Shield className="w-4 h-4" />
              Clinical Notes
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'timeline' && <HealthTimelineTab patientId={patientId} />}
          {activeTab === 'medications' && <MedicationsTab patientId={patientId} />}
          {activeTab === 'labs' && <LabResultsTab patientId={patientId} />}
          {activeTab === 'allergies' && <AllergiesTab patientId={patientId} />}
          {activeTab === 'immunizations' && <ImmunizationsTab patientId={patientId} />}
          {activeTab === 'notes' && <ClinicalNotesTab patientId={patientId} />}
        </div>
      </div>

      {showShareModal && (
        <ShareRecordsModal
          patientId={patientId}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showExportModal && (
        <ExportRecordsModal
          patientId={patientId}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showConsentModal && (
        <ConsentManagement
          patientId={patientId}
          onClose={() => setShowConsentModal(false)}
        />
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-semibold mb-1">Blockchain-Secured Health Records</p>
            <p>
              All your health records are FHIR-compliant and secured with blockchain technology.
              Every access and modification is logged in an immutable audit trail.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
