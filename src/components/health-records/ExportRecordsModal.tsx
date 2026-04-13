import { useState } from 'react';
import { healthRecordsService } from '../../services/healthRecordsService';
import { blockchainAuditService } from '../../services/blockchainAuditService';
import { Download, X, FileText, Check } from 'lucide-react';

interface Props {
  patientId: string;
  onClose: () => void;
}

export default function ExportRecordsModal({ patientId, onClose }: Props) {
  const [format, setFormat] = useState<'json' | 'fhir'>('json');
  const [selectedRecords, setSelectedRecords] = useState({
    labResults: true,
    medications: true,
    allergies: true,
    immunizations: true,
    clinicalNotes: true,
  });
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await healthRecordsService.exportRecords(patientId, format, selectedRecords);

      const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], {
        type: format === 'json' ? 'application/json' : 'application/fhir+json',
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `health-records-${new Date().toISOString().split('T')[0]}.${format === 'json' ? 'json' : 'fhir.json'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      try {
        await blockchainAuditService.logEvent({
          eventType: 'record_exported',
          resourceType: 'health_records',
          resourceId: patientId,
          actorId: patientId,
          actorRole: 'patient',
          actionData: { format, record_types: Object.keys(selectedRecords).filter((k) => selectedRecords[k as keyof typeof selectedRecords]) },
        });
      } catch {}

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Export Health Records</h2>
              <p className="text-sm text-gray-600">Download your complete health records</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">Export Format</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('json')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  format === 'json'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  {format === 'json' && <Check className="w-5 h-5 text-blue-600" />}
                </div>
                <h3 className="font-semibold text-gray-900">JSON</h3>
                <p className="text-xs text-gray-600 mt-1">Standard format, easy to read</p>
              </button>

              <button
                onClick={() => setFormat('fhir')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  format === 'fhir'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  {format === 'fhir' && <Check className="w-5 h-5 text-blue-600" />}
                </div>
                <h3 className="font-semibold text-gray-900">FHIR</h3>
                <p className="text-xs text-gray-600 mt-1">Healthcare standard format</p>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Select Records to Export
            </label>
            <div className="space-y-2">
              {[
                { key: 'labResults', label: 'Lab Results' },
                { key: 'medications', label: 'Medications' },
                { key: 'allergies', label: 'Allergies' },
                { key: 'immunizations', label: 'Immunizations' },
                { key: 'clinicalNotes', label: 'Clinical Notes' },
              ].map((record) => (
                <label
                  key={record.key}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedRecords[record.key as keyof typeof selectedRecords]}
                    onChange={(e) =>
                      setSelectedRecords({
                        ...selectedRecords,
                        [record.key]: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900">{record.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Exported records are encrypted and password protected. Keep
              your files secure and only share with trusted healthcare providers.
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exporting...' : 'Export Records'}
          </button>
        </div>
      </div>
    </div>
  );
}
