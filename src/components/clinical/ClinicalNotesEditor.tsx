import { useState, useEffect } from 'react';
import { clinicalNotesService, ClinicalNote, VitalSigns, NoteTemplate } from '../../services/clinicalNotesService';
import { Save, PenLine, Search, Plus, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '../ui/confirm-dialog';

interface ClinicalNotesEditorProps {
  appointmentId: string;
  patientId: string;
  providerId: string;
  existingNoteId?: string;
  onSave?: (noteId: string) => void;
}

export default function ClinicalNotesEditor({
  appointmentId,
  patientId,
  providerId,
  existingNoteId,
  onSave
}: ClinicalNotesEditorProps) {
  const [noteId, setNoteId] = useState<string | null>(existingNoteId || null);
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showTemplates, setShowTemplates] = useState(false);

  const [noteData, setNoteData] = useState<Partial<ClinicalNote>>({
    note_type: 'SOAP',
    chief_complaint: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    vital_signs: {},
    diagnosis_codes: [],
    procedure_codes: []
  });

  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({
    temperature: undefined,
    temperature_unit: 'C',
    blood_pressure_systolic: undefined,
    blood_pressure_diastolic: undefined,
    heart_rate: undefined,
    respiratory_rate: undefined,
    oxygen_saturation: undefined,
    weight: undefined,
    weight_unit: 'kg',
    height: undefined,
    height_unit: 'cm',
    bmi: undefined
  });

  const [diagnosisSearch, setDiagnosisSearch] = useState('');
  const [diagnosisResults, setDiagnosisResults] = useState<any[]>([]);
  const [procedureSearch, setProcedureSearch] = useState('');
  const [procedureResults, setProcedureResults] = useState<any[]>([]);

  const [saving, setSaving] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  useEffect(() => {
    loadTemplates();
    if (existingNoteId) {
      loadExistingNote();
    }
  }, [existingNoteId]);

  useEffect(() => {
    if (vitalSigns.weight && vitalSigns.height) {
      const bmi = clinicalNotesService.calculateBMI(
        vitalSigns.weight,
        vitalSigns.weight_unit || 'kg',
        vitalSigns.height,
        vitalSigns.height_unit || 'cm'
      );
      setVitalSigns(prev => ({ ...prev, bmi }));
    }
  }, [vitalSigns.weight, vitalSigns.height, vitalSigns.weight_unit, vitalSigns.height_unit]);

  const loadTemplates = async () => {
    const temps = await clinicalNotesService.getTemplates();
    setTemplates(temps);
  };

  const loadExistingNote = async () => {
    if (!existingNoteId) return;
    const note = await clinicalNotesService.getNote(existingNoteId);
    if (note) {
      setNoteData(note);
      setVitalSigns(note.vital_signs || {});
      setIsFinalized(note.is_finalized);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;

    const template = templates.find(t => t.id === selectedTemplate);
    if (template) {
      setNoteData(prev => ({
        ...prev,
        subjective: template.template_content.subjective,
        objective: template.template_content.objective,
        assessment: template.template_content.assessment,
        plan: template.template_content.plan
      }));
      setShowTemplates(false);
    }
  };

  const handleSearchDiagnosis = async () => {
    if (diagnosisSearch.length < 2) return;
    const results = await clinicalNotesService.searchDiagnosisCodes(diagnosisSearch);
    setDiagnosisResults(results);
  };

  const handleAddDiagnosis = (code: string) => {
    setNoteData(prev => ({
      ...prev,
      diagnosis_codes: [...(prev.diagnosis_codes || []), code]
    }));
    setDiagnosisSearch('');
    setDiagnosisResults([]);
  };

  const handleSearchProcedure = async () => {
    if (procedureSearch.length < 2) return;
    const results = await clinicalNotesService.searchProcedureCodes(procedureSearch);
    setProcedureResults(results);
  };

  const handleAddProcedure = (code: string) => {
    setNoteData(prev => ({
      ...prev,
      procedure_codes: [...(prev.procedure_codes || []), code]
    }));
    setProcedureSearch('');
    setProcedureResults([]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = {
        ...noteData,
        vital_signs: vitalSigns,
        appointment_id: appointmentId,
        patient_id: patientId,
        provider_id: providerId
      };

      let savedNote;
      if (noteId) {
        savedNote = await clinicalNotesService.updateNote(noteId, dataToSave);
      } else {
        savedNote = await clinicalNotesService.createNote(dataToSave);
        setNoteId(savedNote.id);
      }

      toast.success('Clinical note saved successfully');
      if (onSave) onSave(savedNote.id);
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = () => {
    if (!noteId) {
      toast.error('Please save the note first');
      return;
    }

    setShowFinalizeConfirm(true);
  };

  const executeFinalizeNote = async () => {
    setSaving(true);
    try {
      await clinicalNotesService.finalizeNote(noteId!, providerId);
      setIsFinalized(true);
      toast.success('Clinical note finalized successfully');
    } catch (error) {
      console.error('Error finalizing note:', error);
      toast.error('Failed to finalize note');
    } finally {
      setSaving(false);
    }
  };

  if (isFinalized) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800 font-medium">
          This clinical note has been finalized and cannot be edited.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Clinical Documentation</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Templates
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2"
          >
            <Save />
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleFinalize}
            disabled={saving || !noteId}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 flex items-center gap-2"
          >
            <PenLine />
            Finalize & Sign
          </button>
        </div>
      </div>

      {showTemplates && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-3">Apply Template</h3>
          <div className="flex gap-2">
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a template</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} {template.specialty && `(${template.specialty})`}
                </option>
              ))}
            </select>
            <button
              onClick={handleApplyTemplate}
              disabled={!selectedTemplate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Note Type</label>
        <select
          value={noteData.note_type}
          onChange={(e) => setNoteData(prev => ({ ...prev, note_type: e.target.value as any }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="SOAP">SOAP Note</option>
          <option value="progress">Progress Note</option>
          <option value="consultation">Consultation Note</option>
          <option value="procedure">Procedure Note</option>
          <option value="discharge">Discharge Summary</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Chief Complaint</label>
        <input
          type="text"
          value={noteData.chief_complaint}
          onChange={(e) => setNoteData(prev => ({ ...prev, chief_complaint: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Brief description of the main reason for visit"
        />
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Calculator />
          Vital Signs
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Temperature</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                value={vitalSigns.temperature || ''}
                onChange={(e) => setVitalSigns(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <select
                value={vitalSigns.temperature_unit}
                onChange={(e) => setVitalSigns(prev => ({ ...prev, temperature_unit: e.target.value as 'C' | 'F' }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="C">°C</option>
                <option value="F">°F</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Blood Pressure</label>
            <div className="flex gap-1 items-center">
              <input
                type="number"
                value={vitalSigns.blood_pressure_systolic || ''}
                onChange={(e) => setVitalSigns(prev => ({ ...prev, blood_pressure_systolic: parseInt(e.target.value) }))}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Sys"
              />
              <span className="text-gray-500">/</span>
              <input
                type="number"
                value={vitalSigns.blood_pressure_diastolic || ''}
                onChange={(e) => setVitalSigns(prev => ({ ...prev, blood_pressure_diastolic: parseInt(e.target.value) }))}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Dia"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Heart Rate (bpm)</label>
            <input
              type="number"
              value={vitalSigns.heart_rate || ''}
              onChange={(e) => setVitalSigns(prev => ({ ...prev, heart_rate: parseInt(e.target.value) }))}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Respiratory Rate</label>
            <input
              type="number"
              value={vitalSigns.respiratory_rate || ''}
              onChange={(e) => setVitalSigns(prev => ({ ...prev, respiratory_rate: parseInt(e.target.value) }))}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">O2 Saturation (%)</label>
            <input
              type="number"
              value={vitalSigns.oxygen_saturation || ''}
              onChange={(e) => setVitalSigns(prev => ({ ...prev, oxygen_saturation: parseInt(e.target.value) }))}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
              max="100"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Weight</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                value={vitalSigns.weight || ''}
                onChange={(e) => setVitalSigns(prev => ({ ...prev, weight: parseFloat(e.target.value) }))}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <select
                value={vitalSigns.weight_unit}
                onChange={(e) => setVitalSigns(prev => ({ ...prev, weight_unit: e.target.value as 'kg' | 'lbs' }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Height</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                value={vitalSigns.height || ''}
                onChange={(e) => setVitalSigns(prev => ({ ...prev, height: parseFloat(e.target.value) }))}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <select
                value={vitalSigns.height_unit}
                onChange={(e) => setVitalSigns(prev => ({ ...prev, height_unit: e.target.value as 'cm' | 'in' }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="cm">cm</option>
                <option value="in">in</option>
              </select>
            </div>
          </div>

          {vitalSigns.bmi && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">BMI (calculated)</label>
              <div className="px-2 py-1 bg-gray-100 rounded text-sm font-medium">
                {vitalSigns.bmi}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">S - Subjective</label>
        <textarea
          value={noteData.subjective}
          onChange={(e) => setNoteData(prev => ({ ...prev, subjective: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          rows={6}
          placeholder="Patient's description of symptoms, history of present illness, past medical history, medications, allergies..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">O - Objective</label>
        <textarea
          value={noteData.objective}
          onChange={(e) => setNoteData(prev => ({ ...prev, objective: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          rows={6}
          placeholder="Physical examination findings, lab results, imaging findings..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">A - Assessment</label>
        <textarea
          value={noteData.assessment}
          onChange={(e) => setNoteData(prev => ({ ...prev, assessment: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          rows={4}
          placeholder="Diagnosis, differential diagnoses, severity assessment..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">P - Plan</label>
        <textarea
          value={noteData.plan}
          onChange={(e) => setNoteData(prev => ({ ...prev, plan: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          rows={6}
          placeholder="Treatment plan, medications, follow-up instructions, referrals..."
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis Codes (ICD-10)</label>
          <div className="relative mb-2">
            <input
              type="text"
              value={diagnosisSearch}
              onChange={(e) => setDiagnosisSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchDiagnosis()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Search ICD-10 codes..."
            />
            <Search className="absolute left-3 top-3 text-gray-400" />
          </div>
          {diagnosisResults.length > 0 && (
            <div className="mb-2 max-h-40 overflow-y-auto border border-gray-200 rounded">
              {diagnosisResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleAddDiagnosis(result.code)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 text-sm"
                >
                  <span className="font-medium">{result.code}</span> - {result.description}
                </button>
              ))}
            </div>
          )}
          <div className="space-y-1">
            {noteData.diagnosis_codes?.map((code, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded text-sm">
                <span className="font-medium">{code}</span>
                <button
                  onClick={() => setNoteData(prev => ({
                    ...prev,
                    diagnosis_codes: prev.diagnosis_codes?.filter((_, i) => i !== index)
                  }))}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Procedure Codes (CPT)</label>
          <div className="relative mb-2">
            <input
              type="text"
              value={procedureSearch}
              onChange={(e) => setProcedureSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchProcedure()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Search CPT codes..."
            />
            <Search className="absolute left-3 top-3 text-gray-400" />
          </div>
          {procedureResults.length > 0 && (
            <div className="mb-2 max-h-40 overflow-y-auto border border-gray-200 rounded">
              {procedureResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleAddProcedure(result.code)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 text-sm"
                >
                  <span className="font-medium">{result.code}</span> - {result.description}
                </button>
              ))}
            </div>
          )}
          <div className="space-y-1">
            {noteData.procedure_codes?.map((code, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded text-sm">
                <span className="font-medium">{code}</span>
                <button
                  onClick={() => setNoteData(prev => ({
                    ...prev,
                    procedure_codes: prev.procedure_codes?.filter((_, i) => i !== index)
                  }))}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showFinalizeConfirm}
        onOpenChange={setShowFinalizeConfirm}
        title="Finalize Clinical Note"
        description="Are you sure you want to finalize this note? Once finalized, it cannot be edited."
        confirmLabel="Finalize & Sign"
        onConfirm={executeFinalizeNote}
      />
    </div>
  );
}
