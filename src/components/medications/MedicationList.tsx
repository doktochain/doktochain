import React, { useState, useEffect } from 'react';
import { Pill, Plus, Clock, AlertCircle, Calendar, User, Building2, CreditCard as Edit, Trash2, Bell, MoreVertical, CheckCircle2, XCircle } from 'lucide-react';
import {
  medicationManagementService,
  PatientMedication,
} from '../../services/medicationManagementService';
import { ConfirmDialog } from '../ui/confirm-dialog';

interface MedicationListProps {
  patientId: string;
  onAddMedication: () => void;
  onEditMedication: (medication: PatientMedication) => void;
}

export const MedicationList: React.FC<MedicationListProps> = ({
  patientId,
  onAddMedication,
  onEditMedication,
}) => {
  const [medications, setMedications] = useState<PatientMedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'provider'>('name');
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [discontinueConfirmOpen, setDiscontinueConfirmOpen] = useState(false);
  const [pendingDiscontinueMedication, setPendingDiscontinueMedication] = useState<PatientMedication | null>(null);

  useEffect(() => {
    loadMedications();
  }, [patientId, filter]);

  const loadMedications = async () => {
    setLoading(true);
    const { data } = await medicationManagementService.getPatientMedications(
      patientId,
      filter === 'active'
    );
    if (data) {
      setMedications(data);
    }
    setLoading(false);
  };

  const handleDiscontinue = (medication: PatientMedication) => {
    setPendingDiscontinueMedication(medication);
    setDiscontinueConfirmOpen(true);
  };

  const executeDiscontinue = async () => {
    if (!pendingDiscontinueMedication) return;
    const { data } = await medicationManagementService.discontinueMedication(
      pendingDiscontinueMedication.id,
      undefined
    );
    if (data) {
      loadMedications();
    }
    setDiscontinueConfirmOpen(false);
    setPendingDiscontinueMedication(null);
  };

  const sortedMedications = [...medications].sort((a, b) => {
    if (sortBy === 'name') {
      return a.medication_name.localeCompare(b.medication_name);
    } else if (sortBy === 'date') {
      return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
    }
    return 0;
  });

  const getMedicationWarnings = (medication: PatientMedication) => {
    const warnings: { type: 'refill' | 'expired'; message: string }[] = [];

    if (medication.next_refill_due_date) {
      const daysUntilRefill = Math.ceil(
        (new Date(medication.next_refill_due_date).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysUntilRefill <= 3 && daysUntilRefill >= 0) {
        warnings.push({
          type: 'refill',
          message: `Refill needed in ${daysUntilRefill} day${daysUntilRefill !== 1 ? 's' : ''}`,
        });
      } else if (daysUntilRefill < 0) {
        warnings.push({
          type: 'refill',
          message: 'Refill overdue',
        });
      }
    }

    if (medication.expiration_date) {
      const daysUntilExpiration = Math.ceil(
        (new Date(medication.expiration_date).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiration <= 30 && daysUntilExpiration >= 0) {
        warnings.push({
          type: 'expired',
          message: `Expires in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}`,
        });
      } else if (daysUntilExpiration < 0) {
        warnings.push({
          type: 'expired',
          message: 'Expired',
        });
      }
    }

    return warnings;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'active'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Active ({medications.filter((m) => m.is_active).length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="name">Sort by Name</option>
            <option value="date">Sort by Date</option>
            <option value="provider">Sort by Provider</option>
          </select>
        </div>

        <button
          onClick={onAddMedication}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Medication
        </button>
      </div>

      {sortedMedications.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Pill className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No medications found
          </h3>
          <p className="text-gray-600 mb-4">
            Start by adding your current medications
          </p>
          <button
            onClick={onAddMedication}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add First Medication
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sortedMedications.map((medication) => {
            const warnings = getMedicationWarnings(medication);
            return (
              <MedicationCard
                key={medication.id}
                medication={medication}
                warnings={warnings}
                onEdit={() => onEditMedication(medication)}
                onDiscontinue={() => handleDiscontinue(medication)}
                showMenu={showMenu === medication.id}
                onToggleMenu={() =>
                  setShowMenu(showMenu === medication.id ? null : medication.id)
                }
              />
            );
          })}
        </div>
      )}
    </div>
    <ConfirmDialog
      open={discontinueConfirmOpen}
      onOpenChange={setDiscontinueConfirmOpen}
      title="Discontinue Medication"
      description={pendingDiscontinueMedication ? `Are you sure you want to discontinue ${pendingDiscontinueMedication.medication_name}?` : ''}
      confirmLabel="Discontinue"
      variant="destructive"
      onConfirm={executeDiscontinue}
    />
    </>
  );
};

interface MedicationCardProps {
  medication: PatientMedication;
  warnings: { type: 'refill' | 'expired'; message: string }[];
  onEdit: () => void;
  onDiscontinue: () => void;
  showMenu: boolean;
  onToggleMenu: () => void;
}

const MedicationCard: React.FC<MedicationCardProps> = ({
  medication,
  warnings,
  onEdit,
  onDiscontinue,
  showMenu,
  onToggleMenu,
}) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow ${
        !medication.is_active ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4 flex-1">
          <div className="p-3 bg-blue-50 rounded-lg">
            <Pill className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {medication.medication_name}
                </h3>
                {medication.generic_name && medication.generic_name !== medication.medication_name && (
                  <p className="text-sm text-gray-600">Generic: {medication.generic_name}</p>
                )}
              </div>
              {medication.is_active ? (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                  <XCircle className="w-3 h-3" />
                  Inactive
                </span>
              )}
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4" />
                  <span>
                    {medication.dosage} {medication.form}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    {medicationManagementService.formatFrequency(
                      medication.frequency,
                      medication.frequency_times_per_day
                    )}
                  </span>
                </div>
              </div>

              {medication.indication && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">For:</span> {medication.indication}
                </p>
              )}

              {(medication.food_instructions || medication.special_instructions) && (
                <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                  {medication.food_instructions && (
                    <p>{medication.food_instructions}</p>
                  )}
                  {medication.special_instructions && (
                    <p>{medication.special_instructions}</p>
                  )}
                </div>
              )}
            </div>

            {warnings.length > 0 && (
              <div className="mt-3 space-y-1">
                {warnings.map((warning, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 text-sm ${
                      warning.type === 'refill'
                        ? 'text-orange-700'
                        : 'text-red-700'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>{warning.message}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              {medication.refills_remaining !== undefined && (
                <span>{medication.refills_remaining} refills remaining</span>
              )}
              {medication.last_filled_date && (
                <span>
                  Last filled: {new Date(medication.last_filled_date).toLocaleDateString()}
                </span>
              )}
              {medication.source && (
                <span className="capitalize">Source: {medication.source}</span>
              )}
            </div>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={onToggleMenu}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              <button
                onClick={onEdit}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Details
              </button>
              <button
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Bell className="w-4 h-4" />
                Manage Reminders
              </button>
              {medication.is_active && (
                <button
                  onClick={onDiscontinue}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Discontinue
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};