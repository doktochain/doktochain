import { useState, useEffect } from 'react';
import { FileText, Plus, Search, X } from 'lucide-react';
import { ehrService } from '../../../../services/ehrService';
import { providerService } from '../../../../services/providerService';
import { patientService } from '../../../../services/patientService';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import { Button } from '../../../../components/ui/button';

interface PatientHit {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  date_of_birth?: string;
  health_card_number?: string;
}

export default function ClinicalNotesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [patientResults, setPatientResults] = useState<PatientHit[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientHit | null>(null);

  useEffect(() => {
    loadNotes();
  }, [user]);

  useEffect(() => {
    const term = searchTerm.trim();
    if (selectedPatient) return;
    if (term.length < 2) {
      setPatientResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await patientService.searchPatients(term, 8);
        setPatientResults(results as PatientHit[]);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedPatient]);

  const loadNotes = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const provider = await providerService.getProviderByUserId(user.id);
      if (!provider) {
        setNotes([]);
        return;
      }
      const allNotes = await ehrService.getSOAPNotesByProvider(provider.id);
      setNotes(allNotes || []);
    } catch (error) {
      console.error('Error loading notes:', error);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    navigate(`/${i18n.language}/dashboard/provider/clinical-documentation`);
  };

  const handleSelectPatient = (patient: PatientHit) => {
    setSelectedPatient(patient);
    setPatientResults([]);
    setSearchTerm('');
  };

  const filteredNotes = (() => {
    if (selectedPatient) {
      return notes.filter((n) => n.patient_id === selectedPatient.id);
    }
    if (!searchTerm) return notes;
    const lower = searchTerm.toLowerCase();
    return notes.filter(
      (note) =>
        note.chief_complaint?.toLowerCase().includes(lower) ||
        note.assessment?.toLowerCase().includes(lower)
    );
  })();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clinical Notes</h1>
          <p className="text-muted-foreground">Browse and manage patient clinical notes</p>
        </div>

        <Button onClick={handleCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          Create New Note
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="mb-6">
            {selectedPatient && (
              <div className="mb-3 flex items-center justify-between bg-sky-50 border border-sky-200 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Showing notes for {selectedPatient.first_name} {selectedPatient.last_name}
                  </p>
                  {selectedPatient.email && (
                    <p className="text-xs text-muted-foreground">{selectedPatient.email}</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>
                  <X className="w-4 h-4 mr-1" /> Clear
                </Button>
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={selectedPatient ? 'Filter by chief complaint or assessment...' : 'Search by patient name, email, health card, DOB, or note content...'}
                className="pl-10 py-3 h-12"
              />
              {!selectedPatient && patientResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {patientResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPatient(p)}
                      className="w-full text-left px-4 py-3 hover:bg-sky-50 border-b border-gray-100 last:border-0"
                    >
                      <p className="font-medium text-foreground">{p.first_name} {p.last_name}</p>
                      {(p.email || p.date_of_birth || p.health_card_number) && (
                        <p className="text-xs text-muted-foreground">
                          {[p.email, p.health_card_number, p.date_of_birth].filter(Boolean).join(' • ')}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading notes...</p>
              </div>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No clinical notes found
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Try adjusting your search' : 'Get started by creating your first clinical note'}
              </p>
              <Button onClick={handleCreateNew}>
                <Plus className="w-4 h-4 mr-2" />
                Create Note
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotes.map((note) => (
                <Card
                  key={note.id}
                  className="p-4 bg-muted hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => navigate(`/${i18n.language}/dashboard/provider/clinical-documentation?note=${note.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {note.chief_complaint || 'Clinical Note'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(note.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={note.status === 'signed' ? 'success' : 'warning'}>
                      {note.status}
                    </Badge>
                  </div>

                  {note.assessment && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {note.assessment}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
