import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { MedicationList } from '../../../../components/medications/MedicationList';
import {
  medicationManagementService,
  PatientMedication,
  AdherenceStats,
} from '../../../../services/medicationManagementService';
import {
  Pill,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';

export default function MedicationsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'adherence' | 'history'>('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<PatientMedication | null>(null);
  const [stats, setStats] = useState<AdherenceStats | null>(null);
  const [medicationsNeedingRefill, setMedicationsNeedingRefill] = useState<PatientMedication[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (user) {
      loadPatientAndAlerts();
    }
  }, [user]);

  const loadPatientAndAlerts = async () => {
    if (!user) return;
    try {
      const { patientService } = await import('../../../../services/patientService');
      const patient = await patientService.getPatientByUserId(user.id);
      if (patient) {
        setPatientId(patient.id);
        const { data } = await medicationManagementService.getMedicationsNeedingRefill(patient.id, 7);
        if (data) setMedicationsNeedingRefill(data);
      }
    } catch (err) {
      console.error('Error loading medications:', err);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Please log in to view your medications</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Medications</h1>
          <p className="text-muted-foreground mt-1">Manage your medications and track adherence</p>
        </div>
      </div>

      {medicationsNeedingRefill.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 mb-1">Refill Reminders</h3>
              <p className="text-sm text-orange-800 mb-2">
                {medicationsNeedingRefill.length} medication{medicationsNeedingRefill.length !== 1 ? 's' : ''} need{medicationsNeedingRefill.length === 1 ? 's' : ''} to be refilled soon:
              </p>
              <ul className="space-y-1">
                {medicationsNeedingRefill.map((med) => (
                  <li key={med.id} className="text-sm text-orange-800">
                    <span className="font-medium">{med.medication_name}</span> - Due{' '}
                    {med.next_refill_due_date
                      ? new Date(med.next_refill_due_date).toLocaleDateString()
                      : 'soon'}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <Card>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'list' | 'adherence' | 'history')}>
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger value="list" className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 px-6 py-4">
              <Pill className="w-5 h-5" />
              Medication List
            </TabsTrigger>
            <TabsTrigger value="adherence" className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 px-6 py-4">
              <TrendingUp className="w-5 h-5" />
              Adherence Tracking
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 px-6 py-4">
              <Calendar className="w-5 h-5" />
              Medication History
            </TabsTrigger>
          </TabsList>

          <CardContent className="p-6">
            <TabsContent value="list" className="mt-0">
              <MedicationList
                key={refreshKey}
                patientId={patientId || user.id}
                onAddMedication={() => setShowAddModal(true)}
                onEditMedication={(med) => {
                  setSelectedMedication(med);
                  setShowAddModal(true);
                }}
              />
            </TabsContent>

            <TabsContent value="adherence" className="mt-0">
              <AdherenceTrackingView patientId={patientId || user.id} />
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <MedicationHistoryView patientId={patientId || user.id} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <Dialog open={showAddModal} onOpenChange={(open) => {
        setShowAddModal(open);
        if (!open) setSelectedMedication(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <AddMedicationModalContent
            medication={selectedMedication}
            patientId={patientId || user.id}
            onClose={() => {
              setShowAddModal(false);
              setSelectedMedication(null);
            }}
            onSave={() => {
              setShowAddModal(false);
              setSelectedMedication(null);
              setRefreshKey(k => k + 1);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

const AdherenceTrackingView: React.FC<{ patientId: string }> = ({ patientId }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-green-900">Adherence Rate</h3>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">92%</p>
          <p className="text-sm text-green-700 mt-1">Last 30 days</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-900">Current Streak</h3>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">14 days</p>
          <p className="text-sm text-blue-700 mt-1">Keep it up!</p>
        </div>

        <div className="bg-orange-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-orange-900">Missed Doses</h3>
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-orange-900">3</p>
          <p className="text-sm text-orange-700 mt-1">This month</p>
        </div>
      </div>

      <div className="text-center py-12 text-muted-foreground">
        <p>Detailed adherence tracking will be displayed here</p>
      </div>
    </div>
  );
};

const MedicationHistoryView: React.FC<{ patientId: string }> = ({ patientId }) => {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
      <p>Your medication history will be displayed here</p>
    </div>
  );
};

const AddMedicationModalContent: React.FC<{
  medication: PatientMedication | null;
  patientId: string;
  onClose: () => void;
  onSave: () => void;
}> = ({ medication, patientId, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    medication_name: medication?.medication_name || '',
    generic_name: medication?.generic_name || '',
    dosage: medication?.dosage || '',
    form: medication?.form || 'tablet',
    frequency: medication?.frequency || 'daily',
    frequency_times_per_day: medication?.frequency_times_per_day || 1,
    indication: medication?.indication || '',
    special_instructions: medication?.special_instructions || '',
    food_instructions: medication?.food_instructions || '',
    is_as_needed: medication?.is_as_needed || false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        medication_name: formData.medication_name,
        dosage: formData.dosage,
        frequency: formData.frequency,
        notes: [
          formData.indication && `Indication: ${formData.indication}`,
          formData.food_instructions,
          formData.special_instructions,
        ].filter(Boolean).join('. ') || undefined,
      };
      if (medication) {
        await medicationManagementService.updateMedication(medication.id, payload);
      } else {
        await medicationManagementService.addMedication({
          ...payload,
          patient_id: patientId,
          is_active: true,
          start_date: new Date().toISOString().split('T')[0],
        });
      }
      onSave();
    } catch (err) {
      console.error('Error saving medication:', err);
      setSubmitError('Failed to save medication. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl">
          {medication ? 'Edit Medication' : 'Add New Medication'}
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label className="mb-2">
              Medication Name *
            </Label>
            <Input
              type="text"
              required
              value={formData.medication_name}
              onChange={(e) =>
                setFormData({ ...formData, medication_name: e.target.value })
              }
            />
          </div>

          <div>
            <Label className="mb-2">
              Generic Name
            </Label>
            <Input
              type="text"
              value={formData.generic_name}
              onChange={(e) =>
                setFormData({ ...formData, generic_name: e.target.value })
              }
            />
          </div>

          <div>
            <Label className="mb-2">
              Dosage *
            </Label>
            <Input
              type="text"
              required
              placeholder="e.g., 10mg"
              value={formData.dosage}
              onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
            />
          </div>

          <div>
            <Label className="mb-2">
              Form
            </Label>
            <Select
              value={formData.form}
              onValueChange={(value) => setFormData({ ...formData, form: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tablet">Tablet</SelectItem>
                <SelectItem value="capsule">Capsule</SelectItem>
                <SelectItem value="liquid">Liquid</SelectItem>
                <SelectItem value="injection">Injection</SelectItem>
                <SelectItem value="cream">Cream</SelectItem>
                <SelectItem value="inhaler">Inhaler</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2">
              Frequency *
            </Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) => setFormData({ ...formData, frequency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="as_needed">As Needed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2">
              Times Per Day
            </Label>
            <Input
              type="number"
              min={1}
              max={6}
              value={formData.frequency_times_per_day}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  frequency_times_per_day: parseInt(e.target.value),
                })
              }
            />
          </div>

          <div className="md:col-span-2">
            <Label className="mb-2">
              What is this for?
            </Label>
            <Input
              type="text"
              placeholder="e.g., High blood pressure"
              value={formData.indication}
              onChange={(e) =>
                setFormData({ ...formData, indication: e.target.value })
              }
            />
          </div>

          <div className="md:col-span-2">
            <Label className="mb-2">
              Food Instructions
            </Label>
            <Input
              type="text"
              placeholder="e.g., Take with food"
              value={formData.food_instructions}
              onChange={(e) =>
                setFormData({ ...formData, food_instructions: e.target.value })
              }
            />
          </div>

          <div className="md:col-span-2">
            <Label className="mb-2">
              Special Instructions
            </Label>
            <textarea
              rows={3}
              placeholder="e.g., Avoid sunlight, Do not crush"
              value={formData.special_instructions}
              onChange={(e) =>
                setFormData({ ...formData, special_instructions: e.target.value })
              }
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_as_needed}
                onChange={(e) =>
                  setFormData({ ...formData, is_as_needed: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 border-input rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-foreground">
                Take as needed (PRN)
              </span>
            </label>
          </div>
        </div>

        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {submitError}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 px-6 py-3"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="flex-1 px-6 py-3"
          >
            {submitting ? 'Saving...' : medication ? 'Save Changes' : 'Add Medication'}
          </Button>
        </div>
      </form>
    </>
  );
};
