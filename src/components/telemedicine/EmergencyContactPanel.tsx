import { useState } from 'react';
import { Phone, AlertTriangle, X } from 'lucide-react';
import { ConfirmDialog } from '../ui/confirm-dialog';

interface EmergencyContactPanelProps {
  patientId: string;
  onClose: () => void;
}

export default function EmergencyContactPanel({ patientId, onClose }: EmergencyContactPanelProps) {
  const [callConfirmOpen, setCallConfirmOpen] = useState(false);
  const [pendingCall, setPendingCall] = useState<{ phone: string; name: string } | null>(null);

  const emergencyContacts = [
    {
      name: 'Emergency Services',
      phone: '911',
      type: 'Emergency',
      isPrimary: true,
    },
    {
      name: 'Jane Doe (Spouse)',
      phone: '(555) 123-4567',
      type: 'Family',
      isPrimary: true,
    },
    {
      name: 'Robert Doe (Brother)',
      phone: '(555) 987-6543',
      type: 'Family',
      isPrimary: false,
    },
    {
      name: 'Primary Care Physician',
      phone: '(555) 555-1234',
      type: 'Healthcare Provider',
      isPrimary: false,
    },
  ];

  const handleCall = (phone: string, name: string) => {
    setPendingCall({ phone, name });
    setCallConfirmOpen(true);
  };

  const executeCall = () => {
    if (pendingCall) {
      window.open(`tel:${pendingCall.phone}`);
    }
    setCallConfirmOpen(false);
    setPendingCall(null);
  };

  return (
    <>
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-96 max-h-[80vh] overflow-hidden">
      <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-red-900 dark:text-red-100">Emergency Contacts</h3>
              <p className="text-sm text-red-700 dark:text-red-300">Quick access contacts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {emergencyContacts.map((contact, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${
              contact.isPrimary
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">{contact.name}</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">{contact.type}</p>
              </div>
              {contact.isPrimary && (
                <span className="px-2 py-1 bg-red-600 text-white text-xs rounded font-semibold">
                  PRIMARY
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <a
                href={`tel:${contact.phone}`}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                {contact.phone}
              </a>
              <button
                onClick={() => handleCall(contact.phone, contact.name)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  contact.phone === '911'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Phone className="w-4 h-4" />
                <span className="text-sm font-medium">Call</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
          All emergency calls are logged for patient safety
        </p>
      </div>
    </div>
    <ConfirmDialog
      open={callConfirmOpen}
      onOpenChange={setCallConfirmOpen}
      title="Confirm Call"
      description={pendingCall ? `Call ${pendingCall.name} at ${pendingCall.phone}?` : ''}
      confirmLabel="Call"
      onConfirm={executeCall}
    />
    </>
  );
}
