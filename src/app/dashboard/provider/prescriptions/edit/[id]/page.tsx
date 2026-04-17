import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../../../../../lib/api-client';
import { Button } from '../../../../../../components/ui/button';
import { Input } from '../../../../../../components/ui/input';
import { Label } from '../../../../../../components/ui/label';
import { Textarea } from '../../../../../../components/ui/textarea';

export default function EditPrescriptionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rx, setRx] = useState<any>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (id) load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.get<any>(`/prescriptions/${id}`);
      if (error) throw error;
      setRx(data);
      setDiagnosis(data?.diagnosis || '');
      setNotes(data?.notes || '');
      setItems(data?.items || []);
    } catch (err: any) {
      console.error('Error loading prescription:', err);
      toast.error(err?.message || 'Failed to load prescription');
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const handleSave = async () => {
    if (!rx) return;
    setSaving(true);
    try {
      const { error: rxErr } = await api.put(`/prescriptions/${rx.id}`, {
        diagnosis: diagnosis || null,
        notes: notes || null,
      });
      if (rxErr) throw rxErr;

      for (const it of items) {
        const payload: Record<string, any> = {
          medication_name: it.medication_name,
          strength: it.strength,
          dosage_form: it.dosage_form,
          frequency: it.frequency,
          quantity: it.quantity,
          refills_allowed: it.refills_allowed,
          dosage_instructions: it.dosage_instructions,
          duration_days: it.duration_days || null,
        };
        const { error: itErr } = await api.put(`/prescription-items/${it.id}`, payload);
        if (itErr) throw itErr;
      }

      toast.success('Prescription updated');
      navigate('/dashboard/provider/prescriptions');
    } catch (err: any) {
      console.error('Error saving prescription:', err);
      toast.error(err?.message || 'Failed to save prescription');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!rx) {
    return (
      <div className="p-6">
        <p className="text-destructive">Prescription not found.</p>
        <Button onClick={() => navigate('/dashboard/provider/prescriptions')} className="mt-4">
          Back
        </Button>
      </div>
    );
  }

  if (rx.status !== 'pending') {
    return (
      <div className="p-6 space-y-4">
        <p>This prescription can no longer be edited (status: {rx.status}).</p>
        <Button onClick={() => navigate('/dashboard/provider/prescriptions')}>Back</Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => navigate('/dashboard/provider/prescriptions')}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
        >
          ← Back to Prescriptions
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Edit Prescription #{rx.prescription_number}
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
        <div>
          <Label className="mb-2 block">Diagnosis</Label>
          <Textarea
            rows={3}
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="Diagnosis or indication"
          />
        </div>
        <div>
          <Label className="mb-2 block">Notes</Label>
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes for pharmacist"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">Medications</h2>
        {items.length === 0 && (
          <p className="text-muted-foreground">No medication items.</p>
        )}
        {items.map((it, idx) => (
          <div key={it.id} className="border border-border rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">Medication Name</Label>
                <Input
                  value={it.medication_name || ''}
                  onChange={(e) => handleItemChange(idx, 'medication_name', e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1 block">Strength</Label>
                <Input
                  value={it.strength || ''}
                  onChange={(e) => handleItemChange(idx, 'strength', e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1 block">Dosage Form</Label>
                <Input
                  value={it.dosage_form || ''}
                  onChange={(e) => handleItemChange(idx, 'dosage_form', e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1 block">Frequency</Label>
                <Input
                  value={it.frequency || ''}
                  onChange={(e) => handleItemChange(idx, 'frequency', e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1 block">Quantity</Label>
                <Input
                  type="number"
                  value={it.quantity ?? ''}
                  onChange={(e) =>
                    handleItemChange(idx, 'quantity', parseInt(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <Label className="mb-1 block">Refills Allowed</Label>
                <Input
                  type="number"
                  value={it.refills_allowed ?? 0}
                  onChange={(e) =>
                    handleItemChange(idx, 'refills_allowed', parseInt(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <Label className="mb-1 block">Duration (days)</Label>
                <Input
                  type="number"
                  value={it.duration_days ?? ''}
                  onChange={(e) =>
                    handleItemChange(
                      idx,
                      'duration_days',
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                />
              </div>
            </div>
            <div>
              <Label className="mb-1 block">Instructions (SIG)</Label>
              <Textarea
                rows={2}
                value={it.dosage_instructions || ''}
                onChange={(e) => handleItemChange(idx, 'dosage_instructions', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button variant="outline" onClick={() => navigate('/dashboard/provider/prescriptions')}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
