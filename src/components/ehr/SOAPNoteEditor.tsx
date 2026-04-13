import { useState, useEffect } from 'react';
import { FileText, Save, CheckCircle, AlertCircle, Mic } from 'lucide-react';
import { toast } from 'sonner';
import { ehrService, SOAPNote } from '../../services/ehrService';
import { blockchainAuditService } from '../../services/blockchainAuditService';
import { clinicalAttachmentService, ClinicalAttachment } from '../../services/clinicalAttachmentService';
import { useAuth } from '../../contexts/AuthContext';
import ICD10Lookup from './ICD10Lookup';
import ClinicalAttachments from './ClinicalAttachments';
import { ConfirmDialog } from '../ui/confirm-dialog';

interface SOAPNoteEditorProps {
  patientId: string;
  appointmentId?: string;
  existingNoteId?: string;
  onSave?: (note: SOAPNote) => void;
  onSign?: (note: SOAPNote) => void;
}

export default function SOAPNoteEditor({
  patientId,
  appointmentId,
  existingNoteId,
  onSave,
  onSign,
}: SOAPNoteEditorProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<Partial<SOAPNote>>({
    patient_id: patientId,
    provider_id: user?.id || '',
    appointment_id: appointmentId,
    status: 'draft',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    chief_complaint: '',
    history_present_illness: '',
  });
  const [showICD10Lookup, setShowICD10Lookup] = useState(false);
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  const [showSignConfirm, setShowSignConfirm] = useState(false);
  const [attachments, setAttachments] = useState<ClinicalAttachment[]>([]);

  useEffect(() => {
    if (existingNoteId) {
      loadExistingNote();
      loadAttachments(existingNoteId);
    }
  }, [existingNoteId]);

  const loadAttachments = async (noteId: string) => {
    try {
      const atts = await clinicalAttachmentService.getAttachments(noteId);
      setAttachments(atts);
    } catch {
    }
  };

  const loadExistingNote = async () => {
    setLoading(true);
    try {
      const notes = await ehrService.getSOAPNotes(patientId);
      const existing = notes.find(n => n.id === existingNoteId);
      if (existing) {
        setNote(existing);
        setSelectedDiagnoses(existing.diagnoses || []);
      }
    } catch (error) {
      console.error('Error loading note:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const noteData: SOAPNote = {
        ...note,
        patient_id: patientId,
        provider_id: user.id,
        appointment_id: appointmentId,
        diagnoses: selectedDiagnoses,
      } as SOAPNote;

      let savedNote: SOAPNote;
      const isUpdate = !!existingNoteId;

      if (existingNoteId) {
        savedNote = await ehrService.updateSOAPNote(existingNoteId, noteData, user.id);
      } else {
        savedNote = await ehrService.createSOAPNote(noteData, user.id);
      }

      await blockchainAuditService.logEvent({
        eventType: isUpdate ? 'clinical_note_updated' : 'clinical_note_created',
        resourceType: 'soap_note',
        resourceId: savedNote.id,
        actorId: user.id,
        actorRole: 'provider',
        actionData: {
          patient_id: patientId,
          appointment_id: appointmentId,
          diagnoses: selectedDiagnoses,
          status: savedNote.status
        }
      });

      setNote(savedNote);
      if (onSave) onSave(savedNote);
      toast.success('Note saved successfully');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async () => {
    if (!user || !note.id) return;

    setShowSignConfirm(true);
  };

  const confirmSign = async () => {
    if (!user || !note.id) return;

    setShowSignConfirm(false);
    try {
      await ehrService.signSOAPNote(note.id, user.id);

      await blockchainAuditService.logEvent({
        eventType: 'clinical_note_signed',
        resourceType: 'soap_note',
        resourceId: note.id,
        actorId: user.id,
        actorRole: 'provider',
        actionData: {
          patient_id: patientId,
          appointment_id: appointmentId,
          diagnoses: selectedDiagnoses,
          signed_at: new Date().toISOString()
        }
      });

      setNote({ ...note, status: 'signed', signed_at: new Date().toISOString() });
      if (onSign) onSign(note as SOAPNote);
      toast.success('Note signed successfully');
    } catch (error) {
      console.error('Error signing note:', error);
      toast.error('Failed to sign note');
    }
  };

  const handleAddDiagnosis = (icd10Code: string) => {
    if (!selectedDiagnoses.includes(icd10Code)) {
      setSelectedDiagnoses([...selectedDiagnoses, icd10Code]);
    }
    setShowICD10Lookup(false);
  };

  const handleRemoveDiagnosis = (icd10Code: string) => {
    setSelectedDiagnoses(selectedDiagnoses.filter(d => d !== icd10Code));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading note...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">SOAP Note</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Status: <span className="font-semibold capitalize">{note.status}</span>
              {note.signed_at && (
                <span className="ml-2">
                  • Signed: {new Date(note.signed_at).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || note.status === 'signed'}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>

          {note.id && note.status !== 'signed' && (
            <button
              onClick={handleSign}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Sign Note
            </button>
          )}
        </div>
      </div>

      {note.status === 'signed' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-900 dark:text-green-100">
            <CheckCircle className="w-5 h-5" />
            <p className="font-semibold">This note has been signed and is locked for editing.</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Chief Complaint
            </label>
            <input
              type="text"
              value={note.chief_complaint || ''}
              onChange={(e) => setNote({ ...note, chief_complaint: e.target.value })}
              disabled={note.status === 'signed'}
              placeholder="e.g., Chest pain, Headache"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              History of Present Illness
            </label>
            <textarea
              value={note.history_present_illness || ''}
              onChange={(e) => setNote({ ...note, history_present_illness: e.target.value })}
              disabled={note.status === 'signed'}
              rows={3}
              placeholder="Describe the patient's history and symptoms..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Subjective (S)
          </h3>
          <textarea
            value={note.subjective || ''}
            onChange={(e) => setNote({ ...note, subjective: e.target.value })}
            disabled={note.status === 'signed'}
            rows={4}
            placeholder="Patient's description of symptoms, concerns, and relevant history..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
          />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Objective (O)
          </h3>
          <textarea
            value={note.objective || ''}
            onChange={(e) => setNote({ ...note, objective: e.target.value })}
            disabled={note.status === 'signed'}
            rows={4}
            placeholder="Physical examination findings, vital signs, lab results..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
          />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Assessment (A)
            </h3>
            {note.status !== 'signed' && (
              <button
                onClick={() => setShowICD10Lookup(true)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
              >
                Add Diagnosis
              </button>
            )}
          </div>

          {selectedDiagnoses.length > 0 && (
            <div className="mb-4 space-y-2">
              {selectedDiagnoses.map((diagnosis) => (
                <div
                  key={diagnosis}
                  className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                >
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {diagnosis}
                  </span>
                  {note.status !== 'signed' && (
                    <button
                      onClick={() => handleRemoveDiagnosis(diagnosis)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <textarea
            value={note.assessment || ''}
            onChange={(e) => setNote({ ...note, assessment: e.target.value })}
            disabled={note.status === 'signed'}
            rows={4}
            placeholder="Clinical impression, diagnoses, differential diagnoses..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
          />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Plan (P)</h3>
          <textarea
            value={note.plan || ''}
            onChange={(e) => setNote({ ...note, plan: e.target.value })}
            disabled={note.status === 'signed'}
            rows={4}
            placeholder="Treatment plan, medications, follow-up instructions, patient education..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
          />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Follow-up Plan
              </label>
              <input
                type="text"
                value={note.follow_up_plan || ''}
                onChange={(e) => setNote({ ...note, follow_up_plan: e.target.value })}
                disabled={note.status === 'signed'}
                placeholder="e.g., Return in 2 weeks"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Follow-up Date
              </label>
              <input
                type="date"
                value={note.follow_up_date || ''}
                onChange={(e) => setNote({ ...note, follow_up_date: e.target.value })}
                disabled={note.status === 'signed'}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
              />
            </div>
          </div>
        </div>
      </div>

      {note.id && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <ClinicalAttachments
            noteId={note.id}
            userId={user?.id || ''}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            readOnly={note.status === 'signed'}
          />
        </div>
      )}

      {showICD10Lookup && (
        <ICD10Lookup
          onSelect={handleAddDiagnosis}
          onClose={() => setShowICD10Lookup(false)}
        />
      )}

      <ConfirmDialog
        open={showSignConfirm}
        onOpenChange={setShowSignConfirm}
        title="Sign Note"
        description="Are you sure you want to sign this note? This action cannot be undone."
        confirmLabel="Sign"
        variant="destructive"
        onConfirm={confirmSign}
      />
    </div>
  );
}
