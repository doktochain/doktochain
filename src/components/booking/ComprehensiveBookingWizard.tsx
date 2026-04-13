import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Calendar, Video, FileText, CreditCard, CheckCircle, MapPin } from 'lucide-react';
import { enhancedBookingService, BookingData } from '../../services/enhancedBookingService';
import { FinanceService } from '../../services/financeService';
import { patientService } from '../../services/patientService';
import { ProviderLocation } from '../../services/providerService';
import { useAuth } from '../../contexts/AuthContext';
import QuestionnaireStep from './QuestionnaireStep';
import ConsentFormsStep from './ConsentFormsStep';
import PaymentStep from './PaymentStep';
import BookingStepIndicator from './BookingStepIndicator';
import ServiceSelectionStep from './ServiceSelectionStep';
import ConsultationMethodStep from './ConsultationMethodStep';
import LocationSelectionStep from './LocationSelectionStep';
import DateTimeSelectionStep from './DateTimeSelectionStep';
import BookingReviewStep from './BookingReviewStep';
import BookingConfirmationStep from './BookingConfirmationStep';

interface BookingWizardProps {
  providerId: string;
  onComplete?: () => void;
}

type Step = 'service' | 'method' | 'location' | 'datetime' | 'questionnaire' | 'consent' | 'payment' | 'review' | 'confirmation';

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: 'service', label: 'Select Service', icon: FileText },
  { key: 'method', label: 'Consultation Type', icon: Video },
  { key: 'location', label: 'Location', icon: MapPin },
  { key: 'datetime', label: 'Date & Time', icon: Calendar },
  { key: 'questionnaire', label: 'Questionnaire', icon: FileText },
  { key: 'consent', label: 'Consent Forms', icon: FileText },
  { key: 'payment', label: 'Payment', icon: CreditCard },
  { key: 'review', label: 'Review', icon: CheckCircle },
];

export default function ComprehensiveBookingWizard({ providerId, onComplete }: BookingWizardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('service');
  const [loading, setLoading] = useState(false);

  const [bookingData, setBookingData] = useState<Partial<BookingData>>({
    providerId,
    consultationType: 'in_person',
    reminderPreferences: ['email'],
  });

  const [services, setServices] = useState<any[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [questionnaire, setQuestionnaire] = useState<any[]>([]);
  const [questionnaireResponses, setQuestionnaireResponses] = useState<Record<string, any>>({});
  const [consentForms, setConsentForms] = useState<any[]>([]);
  const [signedConsents, setSignedConsents] = useState<Set<string>>(new Set());
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [bookingFeeActive, setBookingFeeActive] = useState(false);
  const [bookingFeeAmount, setBookingFeeAmount] = useState(0);
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [patientRecord, setPatientRecord] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<ProviderLocation | null>(null);

  useEffect(() => {
    loadServices();
    loadBookingFeeConfig();
    if (user) {
      patientService.getPatientByUserId(user.id).then(setPatientRecord).catch(() => {});
    }
  }, []);

  const loadServices = async () => {
    try {
      setServicesLoading(true);
      const servicesList = await enhancedBookingService.getProviderServices(providerId);
      setServices(servicesList);
    } catch {
    } finally {
      setServicesLoading(false);
    }
  };

  const loadBookingFeeConfig = async () => {
    try {
      const isActive = await FinanceService.isBookingFeeActive();
      const amount = await FinanceService.getBookingFeeAmount();
      setBookingFeeActive(isActive);
      setBookingFeeAmount(amount);
    } catch {
      setBookingFeeActive(false);
      setBookingFeeAmount(0);
    }
  };

  const loadAvailability = async () => {
    if (!bookingData.consultationType) return;
    try {
      setLoading(true);
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      const slots = await enhancedBookingService.getProviderAvailability(
        providerId,
        today.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        bookingData.consultationType === 'virtual' ? 'virtual' : 'in_person'
      );
      setAvailableSlots(slots);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionnaire = async (serviceId: string) => {
    try {
      const questions = await enhancedBookingService.getQuestionnaireForService(serviceId);
      setQuestionnaire(questions);
    } catch {}
  };

  const loadConsentForms = async () => {
    try {
      const forms = await enhancedBookingService.getConsentForms(bookingData.consultationType || 'in_person');
      setConsentForms(forms);
    } catch {}
  };

  const handleServiceSelect = (service: any) => {
    setBookingData({ ...bookingData, serviceId: service.id });
    if (service.requires_questionnaire) loadQuestionnaire(service.id);
    setCurrentStep('method');
  };

  const handleMethodSelect = (method: 'in_person' | 'virtual' | 'phone' | 'home_visit') => {
    setBookingData({ ...bookingData, consultationType: method });
    if (method === 'in_person' || method === 'home_visit') {
      setCurrentStep('location');
    } else {
      setSelectedLocation(null);
      setCurrentStep('datetime');
      loadAvailability();
    }
  };

  const handleLocationSelect = (location: ProviderLocation) => {
    setSelectedLocation(location);
    setBookingData({ ...bookingData, locationId: location.id });
    setCurrentStep('datetime');
    loadAvailability();
  };

  const handleDateTimeSelect = (slot: any) => {
    setBookingData({
      ...bookingData,
      slotId: slot.id,
      appointmentDate: slot.slot_date,
      appointmentTime: slot.slot_time,
      locationId: slot.location_id,
    });
    if (questionnaire.length > 0) {
      setCurrentStep('questionnaire');
    } else {
      setCurrentStep('consent');
      loadConsentForms();
    }
  };

  const handleQuestionnaireSubmit = () => {
    setCurrentStep('consent');
    loadConsentForms();
  };

  const handleConsentSign = (formId: string, _signature: string) => {
    setSignedConsents(new Set([...signedConsents, formId]));
  };

  const handleConsentComplete = () => {
    if (signedConsents.size === consentForms.length) setCurrentStep('payment');
  };

  const handlePaymentComplete = () => setCurrentStep('review');

  const handleConfirmBooking = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const finalBookingData = {
        ...bookingData,
        reasonForVisit: reasonForVisit || 'General consultation',
      } as BookingData;

      const newAppointmentId = await enhancedBookingService.createAppointment(finalBookingData, user.id);
      setAppointmentId(newAppointmentId);

      if (Object.keys(questionnaireResponses).length > 0) {
        await enhancedBookingService.submitQuestionnaire(newAppointmentId, questionnaireResponses);
      }

      for (const formId of signedConsents) {
        const form = consentForms.find(f => f.id === formId);
        if (form) {
          await enhancedBookingService.signConsentForm(
            newAppointmentId, form.formType, form.formTitle, form.formContent, 'Patient Signature', '0.0.0.0'
          );
        }
      }

      setCurrentStep('confirmation');
    } catch {
      toast.error('Failed to create appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedService = services.find(s => s.id === bookingData.serviceId);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {currentStep !== 'confirmation' && (
        <BookingStepIndicator
          steps={STEPS}
          currentStep={currentStep}
          hiddenSteps={
            bookingData.consultationType === 'virtual' || bookingData.consultationType === 'phone'
              ? ['location']
              : []
          }
        />
      )}

      <div className="bg-white rounded-lg shadow-lg p-8">
        {currentStep === 'service' && (
          <ServiceSelectionStep
            services={services}
            loading={servicesLoading}
            selectedId={bookingData.serviceId}
            onSelect={handleServiceSelect}
          />
        )}
        {currentStep === 'method' && (
          <ConsultationMethodStep
            selected={bookingData.consultationType}
            onSelect={handleMethodSelect}
            onBack={() => setCurrentStep('service')}
          />
        )}
        {currentStep === 'location' && (
          <LocationSelectionStep
            providerId={providerId}
            consultationType={bookingData.consultationType || 'in_person'}
            onSelect={handleLocationSelect}
            onBack={() => setCurrentStep('method')}
          />
        )}
        {currentStep === 'datetime' && (
          <DateTimeSelectionStep
            slots={availableSlots}
            loading={loading}
            onSelect={handleDateTimeSelect}
            onBack={() => selectedLocation ? setCurrentStep('location') : setCurrentStep('method')}
          />
        )}
        {currentStep === 'questionnaire' && questionnaire.length > 0 && (
          <QuestionnaireStep
            questions={questionnaire}
            responses={questionnaireResponses}
            onResponseChange={(questionId, response) => {
              setQuestionnaireResponses({ ...questionnaireResponses, [questionId]: response });
            }}
            onSaveDraft={handleQuestionnaireSubmit}
            onNext={handleQuestionnaireSubmit}
            onBack={() => setCurrentStep('datetime')}
          />
        )}
        {currentStep === 'consent' && (
          <ConsentFormsStep
            forms={consentForms}
            signedForms={signedConsents}
            onSignForm={handleConsentSign}
            onNext={handleConsentComplete}
            onBack={() => questionnaire.length > 0 ? setCurrentStep('questionnaire') : setCurrentStep('datetime')}
          />
        )}
        {currentStep === 'payment' && user && (
          <PaymentStep
            patientId={patientRecord?.id || user.id}
            userId={user.id}
            servicePrice={selectedService?.base_price}
            onPaymentMethodSelect={(method, policyId) => {
              setBookingData({ ...bookingData, paymentMethod: method, insurancePolicyId: policyId });
            }}
            onNext={handlePaymentComplete}
            onBack={() => setCurrentStep('consent')}
          />
        )}
        {currentStep === 'review' && (
          <BookingReviewStep
            bookingData={bookingData}
            selectedService={selectedService}
            bookingFeeActive={bookingFeeActive}
            bookingFeeAmount={bookingFeeAmount}
            reasonForVisit={reasonForVisit}
            onReasonChange={setReasonForVisit}
            loading={loading}
            onEdit={setCurrentStep}
            onConfirm={handleConfirmBooking}
            onBack={() => setCurrentStep('payment')}
          />
        )}
        {currentStep === 'confirmation' && (
          <BookingConfirmationStep
            appointmentId={appointmentId}
            bookingData={bookingData}
            onNavigate={navigate}
          />
        )}
      </div>
    </div>
  );
}
