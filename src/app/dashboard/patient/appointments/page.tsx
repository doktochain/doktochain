import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../../../contexts/AuthContext';
import { appointmentService, Appointment } from '../../../../services/appointmentService';
import { patientService } from '../../../../services/patientService';
import { providerReviewService } from '../../../../services/providerReviewService';
import RescheduleAppointment from '../../../../components/appointments/RescheduleAppointment';
import CancelAppointment from '../../../../components/appointments/CancelAppointment';
import DocumentUpload from '../../../../components/appointments/DocumentUpload';
import { Card, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/ui/dialog';
import { Textarea } from '../../../../components/ui/textarea';
import { Button } from '../../../../components/ui/button';
import {
  Calendar,
  Video,
  MapPin,
  Clock,
  Plus,
  FileText,
  ChevronRight,
  Upload,
  Star,
} from 'lucide-react';

type TabType = 'upcoming' | 'past' | 'all';

function isWithinJoinWindow(appointment: Appointment): boolean {
  const now = new Date();
  const [hours, minutes] = (appointment.start_time || '').split(':').map(Number);
  const aptDateTime = new Date(appointment.appointment_date + 'T00:00:00');
  aptDateTime.setHours(hours || 0, minutes || 0, 0, 0);

  const diffMs = aptDateTime.getTime() - now.getTime();
  const diffMinutes = diffMs / (1000 * 60);

  return diffMinutes <= 15 && diffMinutes >= -60;
}

function getStatusVariant(status: string): 'info' | 'success' | 'warning' | 'secondary' | 'destructive' {
  const variants: Record<string, 'info' | 'success' | 'warning' | 'secondary' | 'destructive'> = {
    scheduled: 'info',
    confirmed: 'success',
    'in-progress': 'warning',
    completed: 'secondary',
    cancelled: 'destructive',
    'no-show': 'destructive',
  };
  return variants[status] || 'secondary';
}

function AppointmentCard({
  appointment,
  onReschedule,
  onCancel,
  onJoinVideo,
  onViewSummary,
  onUploadDocs,
  onLeaveReview,
}: {
  appointment: Appointment & { providers?: any; provider_locations?: any };
  onReschedule: (apt: any) => void;
  onCancel: (apt: any) => void;
  onJoinVideo: (apt: any) => void;
  onViewSummary: (apt: any) => void;
  onUploadDocs: (apt: any) => void;
  onLeaveReview: (apt: any) => void;
}) {
  const isVirtual = appointment.appointment_type === 'virtual';
  const isActive = ['scheduled', 'confirmed'].includes(appointment.status);
  const canJoin = isVirtual && isActive && isWithinJoinWindow(appointment);
  const providerName = (appointment as any).providers?.user_profiles
    ? `Dr. ${(appointment as any).providers.user_profiles.first_name} ${(appointment as any).providers.user_profiles.last_name}`
    : 'Provider';

  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl flex-shrink-0 ${isVirtual ? 'bg-teal-50' : 'bg-sky-50'}`}>
          {isVirtual ? (
            <Video className={`w-6 h-6 ${canJoin ? 'text-green-600' : 'text-teal-600'}`} />
          ) : (
            <MapPin className="w-6 h-6 text-sky-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <h3 className="text-lg font-semibold text-foreground truncate">{providerName}</h3>
            <Badge variant={getStatusVariant(appointment.status)} className="capitalize">
              {appointment.status.replace('-', ' ')}
            </Badge>
          </div>

          {(appointment as any).providers?.specialization && (
            <p className="text-sm text-muted-foreground mb-2">{(appointment as any).providers.specialization}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {new Date(appointment.appointment_date + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>

            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-muted-foreground" />
              {appointment.start_time?.substring(0, 5)}
              {appointment.end_time && ` - ${appointment.end_time.substring(0, 5)}`}
            </span>

            {isVirtual ? (
              <span className="flex items-center gap-1.5 text-teal-700">
                <Video className="w-4 h-4" />
                Virtual
              </span>
            ) : (
              (appointment as any).provider_locations && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {(appointment as any).provider_locations.address_line1}, {(appointment as any).provider_locations.city}
                </span>
              )
            )}
          </div>

          {appointment.reason_for_visit && (
            <div className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span>{appointment.reason_for_visit}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            {canJoin && (
              <button
                onClick={() => onJoinVideo(appointment)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-1.5 transition"
              >
                <Video className="w-4 h-4" />
                Join Video Call
              </button>
            )}
            {isActive && !canJoin && isVirtual && (
              <span className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm">
                Video opens 15 min before
              </span>
            )}
            {isActive && (
              <>
                <button
                  onClick={() => onUploadDocs(appointment)}
                  className="px-4 py-2 border border-sky-300 text-sky-700 rounded-lg hover:bg-sky-50 text-sm font-medium flex items-center gap-1.5 transition"
                >
                  <Upload className="w-4 h-4" />
                  Upload Documents
                </button>
                <button
                  onClick={() => onReschedule(appointment)}
                  className="px-4 py-2 border border-input text-foreground rounded-lg hover:bg-muted text-sm font-medium transition"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => onCancel(appointment)}
                  className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium transition"
                >
                  Cancel
                </button>
              </>
            )}
            {appointment.status === 'completed' && (
              <>
                <button
                  onClick={() => onViewSummary(appointment)}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm font-medium flex items-center gap-1.5 transition"
                >
                  View Summary
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onLeaveReview(appointment)}
                  className="px-4 py-2 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 text-sm font-medium flex items-center gap-1.5 transition"
                >
                  <Star className="w-4 h-4" />
                  Leave Review
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function PatientAppointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [modalType, setModalType] = useState<'reschedule' | 'cancel' | 'upload' | 'review' | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, [user, activeTab]);

  const loadAppointments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const patientData = await patientService.getPatientByUserId(user.id);
      setPatient(patientData);

      if (patientData) {
        const allAppointments = await appointmentService.getPatientAppointments(patientData.id);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let filtered = allAppointments;

        if (activeTab === 'upcoming') {
          filtered = allAppointments.filter((apt) => {
            const aptDate = new Date(apt.appointment_date + 'T00:00:00');
            return aptDate >= today && ['scheduled', 'confirmed'].includes(apt.status);
          });
        } else if (activeTab === 'past') {
          filtered = allAppointments.filter((apt) => {
            const aptDate = new Date(apt.appointment_date + 'T00:00:00');
            return aptDate < today || ['completed', 'cancelled', 'no-show'].includes(apt.status);
          });
        }

        setAppointments(filtered);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = (apt: any) => {
    setSelectedAppointment(apt);
    setModalType('reschedule');
  };

  const handleCancel = (apt: any) => {
    setSelectedAppointment(apt);
    setModalType('cancel');
  };

  const handleUploadDocs = (apt: any) => {
    setSelectedAppointment(apt);
    setModalType('upload');
  };

  const handleJoinVideo = (apt: any) => {
    navigate(`/dashboard/patient/video-consultation?appointmentId=${apt.id}`);
  };

  const handleViewSummary = (_apt: any) => {
    navigate('/dashboard/patient/appointments/history');
  };

  const handleLeaveReview = (apt: any) => {
    setSelectedAppointment(apt);
    setReviewRating(5);
    setReviewText('');
    setModalType('review');
  };

  const submitReview = async () => {
    if (!selectedAppointment || !patient) return;
    try {
      setReviewSubmitting(true);
      await providerReviewService.createReview(
        patient.id,
        selectedAppointment.provider_id,
        selectedAppointment.id,
        { rating: reviewRating, reviewText: reviewText || undefined }
      );
      closeModal();
      loadAppointments();
    } catch {
      toast.error('Failed to submit review. You may have already reviewed this appointment.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedAppointment(null);
  };

  const handleActionComplete = () => {
    closeModal();
    loadAppointments();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Appointments</h1>
          <p className="text-muted-foreground mt-1">Manage your upcoming and past appointments</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/patient/appointments/book')}
          className="px-5 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          Book Appointment
        </button>
      </div>

      <Card>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
          <div className="border-b p-1">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab}>
            <CardContent className="p-6">
              {appointments.length === 0 ? (
                <div className="text-center py-16">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground text-lg mb-1">No {activeTab} appointments</p>
                  <p className="text-muted-foreground text-sm mb-6">
                    {activeTab === 'upcoming'
                      ? 'Book an appointment with a healthcare provider to get started'
                      : 'Your appointment history will appear here'}
                  </p>
                  {activeTab === 'upcoming' && (
                    <button
                      onClick={() => navigate('/dashboard/patient/appointments/book')}
                      className="px-6 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium transition"
                    >
                      Book Your First Appointment
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onReschedule={handleReschedule}
                      onCancel={handleCancel}
                      onJoinVideo={handleJoinVideo}
                      onViewSummary={handleViewSummary}
                      onUploadDocs={handleUploadDocs}
                      onLeaveReview={handleLeaveReview}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>

      <Dialog open={!!modalType && !!selectedAppointment} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {modalType === 'reschedule' && selectedAppointment && (
            <RescheduleAppointment
              appointment={selectedAppointment}
              onReschedule={handleActionComplete}
              onCancel={closeModal}
            />
          )}
          {modalType === 'cancel' && selectedAppointment && (
            <CancelAppointment
              appointment={selectedAppointment}
              onCancel={handleActionComplete}
              onClose={closeModal}
            />
          )}
          {modalType === 'upload' && user && selectedAppointment && (
            <DocumentUpload
              appointmentId={selectedAppointment.id}
              userId={user.id}
              onUploadComplete={() => {}}
            />
          )}
          {modalType === 'review' && selectedAppointment && (
            <div>
              <DialogHeader>
                <DialogTitle>Leave a Review</DialogTitle>
                <DialogDescription>
                  Share your experience with{' '}
                  {selectedAppointment.providers?.user_profiles
                    ? `Dr. ${selectedAppointment.providers.user_profiles.first_name} ${selectedAppointment.providers.user_profiles.last_name}`
                    : 'your provider'}
                </DialogDescription>
              </DialogHeader>

              <div className="mb-6 mt-6">
                <label className="block text-sm font-medium text-foreground mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="p-1 transition hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= reviewRating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-muted-foreground/40'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {reviewRating === 5 && 'Excellent'}
                  {reviewRating === 4 && 'Very Good'}
                  {reviewRating === 3 && 'Good'}
                  {reviewRating === 2 && 'Fair'}
                  {reviewRating === 1 && 'Poor'}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Review (optional)
                </label>
                <Textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={4}
                  placeholder="Tell us about your experience..."
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  onClick={submitReview}
                  disabled={reviewSubmitting}
                  className="bg-sky-600 hover:bg-sky-700"
                >
                  {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
