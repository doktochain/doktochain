import React, { useState, useEffect } from 'react';
import { healthRecordsService, ClinicalNote } from '../../services/healthRecordsService';
import { FileText, Calendar, User, Building2, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  patientId: string;
}

export default function ClinicalNotesTab({ patientId }: Props) {
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadNotes();
  }, [patientId, filterType]);

  const loadNotes = async () => {
    setLoading(true);
    const type = filterType === 'all' ? undefined : filterType;
    const { data } = await healthRecordsService.getClinicalNotes(patientId, type);
    if (data) {
      setNotes(data);
    }
    setLoading(false);
  };

  const noteTypes = [
    { value: 'all', label: 'All Notes' },
    { value: 'visit_note', label: 'Visit Notes' },
    { value: 'discharge_summary', label: 'Discharge Summaries' },
    { value: 'specialist_report', label: 'Specialist Reports' },
    { value: 'operative_note', label: 'Operative Notes' },
    { value: 'progress_note', label: 'Progress Notes' },
  ];

  const getNoteTypeIcon = (type: string) => {
    const colors = {
      visit_note: 'bg-blue-100 text-blue-600',
      discharge_summary: 'bg-green-100 text-green-600',
      specialist_report: 'bg-blue-100 text-blue-600',
      operative_note: 'bg-red-100 text-red-600',
      progress_note: 'bg-yellow-100 text-yellow-600',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {noteTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No clinical notes</h3>
          <p className="text-gray-600">Clinical notes from your providers will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => {
            const isExpanded = expandedNote === note.id;

            return (
              <div key={note.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <button
                  onClick={() => setExpandedNote(isExpanded ? null : note.id)}
                  className="w-full p-6 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-12 h-12 ${getNoteTypeIcon(note.note_type)} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {note.note_type.replace('_', ' ').toUpperCase()}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">{note.provider_name}</p>
                            {note.specialty && (
                              <p className="text-xs text-gray-500 mt-1">{note.specialty}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(note.visit_date).toLocaleDateString()}
                            </p>
                            {note.facility_name && (
                              <p className="text-xs text-gray-500 mt-1">{note.facility_name}</p>
                            )}
                          </div>
                        </div>
                        {note.chief_complaint && (
                          <p className="text-sm text-gray-700 mt-3">
                            <span className="font-medium">Chief Complaint:</span> {note.chief_complaint}
                          </p>
                        )}
                        {note.diagnosis_text && !isExpanded && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{note.diagnosis_text}</p>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-6 bg-white border-t">
                    <div className="space-y-4">
                      {note.diagnosis_codes && note.diagnosis_codes.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Diagnosis Codes</h4>
                          <div className="flex flex-wrap gap-2">
                            {note.diagnosis_codes.map((code, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-mono"
                              >
                                {code}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {note.diagnosis_text && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Diagnosis</h4>
                          <p className="text-gray-700 whitespace-pre-wrap">{note.diagnosis_text}</p>
                        </div>
                      )}

                      {note.treatment_plan && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Treatment Plan</h4>
                          <p className="text-gray-700 whitespace-pre-wrap">{note.treatment_plan}</p>
                        </div>
                      )}

                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Clinical Note</h4>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {note.note_content}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t mt-6">
                      <button className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 text-sm">
                        Download Note
                      </button>
                      <button className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                        Print
                      </button>
                      <button className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                        Share with Provider
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
