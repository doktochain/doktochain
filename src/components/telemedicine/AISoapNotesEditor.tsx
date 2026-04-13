import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { advancedTelemedicineService, AISoapNote } from '../../services/advancedTelemedicineService';
import { FileText, Sparkles, Save, Check, CreditCard as Edit2, AlertCircle } from 'lucide-react';
import { ConfirmDialog } from '../ui/confirm-dialog';

interface AISoapNotesEditorProps {
  sessionId: string;
  appointmentId: string;
  providerId: string;
  transcriptText?: string;
  onFinalize?: (note: AISoapNote) => void;
}

export default function AISoapNotesEditor({
  sessionId,
  appointmentId,
  providerId,
  transcriptText,
  onFinalize,
}: AISoapNotesEditorProps) {
  const [note, setNote] = useState<AISoapNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

  useEffect(() => {
    loadNote();
  }, [sessionId]);

  useEffect(() => {
    if (note) {
      setSubjective(note.subjective || '');
      setObjective(note.objective || '');
      setAssessment(note.assessment || '');
      setPlan(note.plan || '');
    }
  }, [note]);

  const loadNote = async () => {
    try {
      setLoading(true);
      const data = await advancedTelemedicineService.getSoapNote(sessionId);
      setNote(data);
    } catch (error) {
      console.error('Error loading SOAP note:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAINote = async () => {
    if (!transcriptText) {
      toast.error('No transcript available for AI generation');
      return;
    }

    try {
      setGenerating(true);
      const generatedNote = await advancedTelemedicineService.generateAISoapNote(
        sessionId,
        appointmentId,
        transcriptText
      );
      setNote(generatedNote);
    } catch (error) {
      console.error('Error generating AI note:', error);
    } finally {
      setGenerating(false);
    }
  };

  const saveChanges = async () => {
    if (!note) return;

    try {
      setSaving(true);
      const updated = await advancedTelemedicineService.updateSoapNote(note.id, {
        subjective,
        objective,
        assessment,
        plan,
      });
      setNote(updated);
      setEditMode(false);
    } catch (error) {
      console.error('Error saving changes:', error);
    } finally {
      setSaving(false);
    }
  };

  const finalizeNote = async () => {
    if (!note) return;
    setShowFinalizeConfirm(true);
  };

  const executeFinalizeNote = async () => {
    if (!note) return;

    try {
      const finalized = await advancedTelemedicineService.finalizeSoapNote(note.id, providerId);
      setNote(finalized);
      setEditMode(false);
      onFinalize?.(finalized);
    } catch (error) {
      console.error('Error finalizing note:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading SOAP note...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              SOAP Notes
            </h2>
            {note?.finalized && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mt-1">
                <Check className="w-4 h-4" />
                <span className="text-sm font-semibold">Finalized</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {!note && transcriptText && (
            <button
              onClick={generateAINote}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {generating ? 'Generating...' : 'Generate AI Notes'}
            </button>
          )}

          {note && !note.finalized && (
            <>
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={saveChanges}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}

              {note.provider_reviewed && !note.finalized && (
                <button
                  onClick={finalizeNote}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Finalize Note
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {!note ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No SOAP Note Created
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {transcriptText
              ? 'Click "Generate AI Notes" to create a note from the consultation transcript'
              : 'Complete the consultation to generate SOAP notes'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          {note.confidence_score && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-900 dark:text-blue-100">
                    AI-Generated Note
                  </span>
                </div>
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Confidence: {(note.confidence_score * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          {!note.provider_reviewed && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                    Review Required
                  </h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Please review and edit the AI-generated content before finalizing. Ensure all information is accurate and complete.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">
              Subjective
            </label>
            {editMode ? (
              <textarea
                value={subjective}
                onChange={(e) => setSubjective(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Patient's symptoms, complaints, and history..."
              />
            ) : (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                  {subjective || 'No subjective data recorded'}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">
              Objective
            </label>
            {editMode ? (
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Physical examination findings, vital signs, test results..."
              />
            ) : (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                  {objective || 'No objective data recorded'}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">
              Assessment
            </label>
            {editMode ? (
              <textarea
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Diagnosis, differential diagnosis, clinical impression..."
              />
            ) : (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                  {assessment || 'No assessment recorded'}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">
              Plan
            </label>
            {editMode ? (
              <textarea
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Treatment plan, medications, follow-up, referrals..."
              />
            ) : (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                  {plan || 'No plan recorded'}
                </p>
              </div>
            )}
          </div>

          {note.ai_suggestions && Object.keys(note.ai_suggestions).length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                AI Suggestions
              </h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {note.ai_suggestions.medications?.length > 0 && (
                  <p>Medications: {note.ai_suggestions.medications.join(', ')}</p>
                )}
                {note.ai_suggestions.lab_orders?.length > 0 && (
                  <p>Lab Orders: {note.ai_suggestions.lab_orders.join(', ')}</p>
                )}
                {note.ai_suggestions.referrals?.length > 0 && (
                  <p>Referrals: {note.ai_suggestions.referrals.join(', ')}</p>
                )}
              </div>
            </div>
          )}

          {note.provider_reviewed_at && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 text-sm text-gray-600 dark:text-gray-400">
              Reviewed on {new Date(note.provider_reviewed_at).toLocaleString()}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={showFinalizeConfirm}
        onOpenChange={setShowFinalizeConfirm}
        title="Finalize SOAP Note"
        description="Are you sure you want to finalize this note? This action cannot be undone and the note will be available to the patient."
        confirmLabel="Finalize"
        onConfirm={executeFinalizeNote}
      />
    </div>
  );
}
