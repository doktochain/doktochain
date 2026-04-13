import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { unifiedSearchService, SearchResult, InsuranceProvider, LocationCoordinates } from '../../services/unifiedSearchService';
import { appointmentService, Appointment } from '../../services/appointmentService';
import { enhancedBookingService } from '../../services/enhancedBookingService';
import { patientService } from '../../services/patientService';
import { patientInsuranceCardService, PatientInsuranceCard } from '../../services/patientInsuranceCardService';
import { familyManagementService, ChildProfile } from '../../services/familyManagementService';
import QuestionnaireStep from './QuestionnaireStep';
import ConsentFormsStep from './ConsentFormsStep';
import PaymentStep from './PaymentStep';
import Searchbar from '../frontend/Searchbar';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  User,
  Users,
  Phone,
  Home,
  Star,
  DollarSign,
  FileText,
  AlertCircle,
} from 'lucide-react';

type Step = 'search' | 'select-provider' | 'select-type' | 'select-datetime' | 'questionnaire' | 'consent' | 'payment' | 'add-details' | 'confirm';
type VisitType = 'in-person' | 'virtual' | 'phone' | 'home';

export default function UnifiedSearchBookingWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('search');
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState<any>(null);

  // Search criteria - initialize from navigation state if available
  const [searchCriteria, setSearchCriteria] = useState<{
    searchResult: SearchResult | null;
    location: LocationCoordinates | null;
    insurance: InsuranceProvider | null;
  } | null>(location.state?.searchCriteria || null);

  // Provider selection
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);

  // Booking details
  const [visitType, setVisitType] = useState<VisitType>('in-person');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [availableSlots, setAvailableSlots] = useState<{ date: string; times: string[] }[]>([]);

  // Insurance selection
  const [patientInsuranceCards, setPatientInsuranceCards] = useState<PatientInsuranceCard[]>([]);
  const [selectedInsuranceCard, setSelectedInsuranceCard] = useState<PatientInsuranceCard | null>(null);
  const [matchingCards, setMatchingCards] = useState<PatientInsuranceCard[]>([]);
  const [acceptedInsurance, setAcceptedInsurance] = useState<string[]>([]);

  // Questionnaire
  const [questionnaire, setQuestionnaire] = useState<any[]>([]);
  const [questionnaireResponses, setQuestionnaireResponses] = useState<Record<string, any>>({});

  // Consent
  const [consentForms, setConsentForms] = useState<any[]>([]);
  const [signedConsents, setSignedConsents] = useState<Set<string>>(new Set());

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'insurance' | 'self_pay' | undefined>();
  const [insurancePolicyId, setInsurancePolicyId] = useState<string | undefined>();

  // Services
  const [providerServices, setProviderServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);

  const [familyMembers, setFamilyMembers] = useState<ChildProfile[]>([]);
  const [bookingFor, setBookingFor] = useState<'self' | string>('self');

  useEffect(() => {
    loadInitialData();
  }, [user]);

  // Handle initial search criteria from navigation state
  useEffect(() => {
    if (searchCriteria && searchCriteria.searchResult) {
      setReasonForVisit(searchCriteria.searchResult.name);
      setCurrentStep('select-provider');
    }
  }, []);

  useEffect(() => {
    if (currentStep === 'select-provider' && searchCriteria) {
      loadProviders();
    }
  }, [currentStep, searchCriteria]);

  useEffect(() => {
    if (currentStep === 'select-datetime' && selectedProvider) {
      loadAvailability();
    }
  }, [currentStep, selectedProvider, visitType]);

  const loadInitialData = async () => {
    if (!user) return;

    try {
      const patientData = await patientService.getPatientByUserId(user.id);
      setPatient(patientData);

      if (patientData) {
        const cards = await patientInsuranceCardService.getPatientInsuranceCards(patientData.id);
        setPatientInsuranceCards(cards);
      }

      const { data: children } = await familyManagementService.getChildren(user.id);
      if (children) setFamilyMembers(children);
    } catch (error) {
      console.error('Error loading patient:', error);
    }
  };

  const loadMatchingInsuranceCards = async (providerId: string) => {
    if (!patient) return;

    try {
      const accepted = await patientInsuranceCardService.getAcceptedInsuranceForProvider(providerId);
      setAcceptedInsurance(accepted);

      const matching = await patientInsuranceCardService.getMatchingInsuranceCards(patient.id, accepted);
      setMatchingCards(matching);

      if (matching.length > 0) {
        const primaryCard = matching.find((card) => card.is_primary);
        setSelectedInsuranceCard(primaryCard || matching[0]);
      }
    } catch (error) {
      console.error('Error loading matching insurance:', error);
    }
  };

  const loadProviders = async () => {
    if (!searchCriteria || !searchCriteria.searchResult) return;

    try {
      setLoading(true);
      const providersData = await unifiedSearchService.findProvidersBySearchCriteria({
        searchType: searchCriteria.searchResult.type,
        searchId: searchCriteria.searchResult.id,
        location: searchCriteria.location || undefined,
        insuranceProviderId: searchCriteria.insurance?.id,
        maxDistance: 50,
      });
      setProviders(providersData);
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async () => {
    if (!selectedProvider) return;
    try {
      setLoading(true);
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const consultType = visitType === 'virtual' ? 'virtual' : 'in_person';
      const rawSlots = await enhancedBookingService.getProviderAvailability(
        selectedProvider.id,
        today.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        consultType
      );

      const grouped: Record<string, string[]> = {};
      for (const slot of rawSlots) {
        const date = slot.slot_date;
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(slot.slot_time?.substring(0, 5));
      }

      const slots = Object.entries(grouped).map(([date, times]) => ({ date, times }));
      setAvailableSlots(slots);

      const services = await enhancedBookingService.getProviderServices(selectedProvider.id);
      setProviderServices(services);
    } catch (error) {
      console.error('Error loading availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (criteria: {
    searchResult: SearchResult | null;
    location: LocationCoordinates | null;
    insurance: InsuranceProvider | null;
  }) => {
    setSearchCriteria(criteria);
    if (criteria.searchResult) {
      setReasonForVisit(criteria.searchResult.name);
      setCurrentStep('select-provider');
    }
  };

  const handleProviderSelect = async (provider: any) => {
    setSelectedProvider(provider);
    await loadMatchingInsuranceCards(provider.id);
    setCurrentStep('select-type');
  };

  const handleTypeSelect = (type: VisitType) => {
    setVisitType(type);
    setCurrentStep('select-datetime');
  };

  const handleDateTimeSelect = async (date: string, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);

    if (selectedService?.requires_questionnaire) {
      try {
        const questions = await enhancedBookingService.getQuestionnaireForService(selectedService.id);
        setQuestionnaire(questions);
        if (questions.length > 0) {
          setCurrentStep('questionnaire');
          return;
        }
      } catch (error) {
        console.error('Error loading questionnaire:', error);
      }
    }

    const consultType = visitType === 'virtual' ? 'virtual' : 'in_person';
    const forms = await enhancedBookingService.getConsentForms(consultType);
    setConsentForms(forms);
    setCurrentStep('consent');
  };

  const handleConfirmBooking = async () => {
    if (!patient || !selectedProvider) return;

    try {
      setLoading(true);

      const appointmentData = {
        patient_id: patient.id,
        provider_id: selectedProvider.id,
        appointment_type: visitType === 'in-person' ? 'in-person' : 'virtual',
        visit_type: 'routine',
        appointment_date: selectedDate,
        start_time: selectedTime,
        end_time: calculateEndTime(selectedTime, selectedService?.duration_minutes || 30),
        status: 'scheduled',
        reason_for_visit: reasonForVisit,
        chief_complaint: chiefComplaint,
        insurance_card_id: selectedInsuranceCard?.id,
        notes: bookingFor !== 'self' ? `Booking on behalf of family member: ${familyMembers.find(m => m.id === bookingFor)?.first_name} ${familyMembers.find(m => m.id === bookingFor)?.last_name}` : undefined,
      };

      const appointment = await appointmentService.createAppointment(appointmentData as Partial<Appointment>);

      if (Object.keys(questionnaireResponses).length > 0) {
        await enhancedBookingService.submitQuestionnaire(appointment.id, questionnaireResponses);
      }

      for (const formId of signedConsents) {
        const form = consentForms.find(f => f.id === formId);
        if (form) {
          await enhancedBookingService.signConsentForm(
            appointment.id,
            form.formType,
            form.formTitle,
            form.formContent,
            'Electronic Signature',
            '0.0.0.0'
          );
        }
      }

      setCurrentStep('confirmation' as any);
      setTimeout(() => {
        navigate('/dashboard/patient/appointments');
      }, 3000);
    } catch (error: any) {
      console.error('Error booking appointment:', error);
      toast.error(`Failed to book appointment: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(hours, minutes + durationMinutes, 0);
    return endDate.toTimeString().slice(0, 5);
  };

  const allSteps = ['search', 'select-provider', 'select-type', 'select-datetime', 'questionnaire', 'consent', 'payment', 'add-details', 'confirm'];
  const stepLabels = ['Search', 'Provider', 'Type', 'Date & Time', 'Questionnaire', 'Consent', 'Payment', 'Details', 'Confirm'];

  const getStepIndex = (step: Step): number => {
    return allSteps.indexOf(step);
  };

  const visibleSteps = [
    { label: 'Search', idx: 0 },
    { label: 'Provider', idx: 1 },
    { label: 'Date & Time', idx: 3 },
    { label: 'Consent', idx: 5 },
    { label: 'Payment', idx: 6 },
    { label: 'Confirm', idx: 8 },
  ];

  return (
    <div className="space-y-6">
      {currentStep !== ('confirmation' as any) && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            {visibleSteps.map((vs, i) => (
              <div key={vs.label} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    getStepIndex(currentStep) >= vs.idx ? 'bg-sky-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {getStepIndex(currentStep) > vs.idx ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700 hidden md:inline">{vs.label}</span>
                {i < visibleSteps.length - 1 && <ArrowRight className="w-5 h-5 text-gray-400 mx-2 md:mx-4" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Search */}
      {currentStep === 'search' && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Find Your Healthcare Provider</h2>
            <p className="text-gray-600">
              Search by specialty, procedure, or service. Filter by location and insurance.
            </p>
          </div>

          <Searchbar onSearch={handleSearch} showSearchButton={true} />

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">How to search:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Type a specialty (e.g., "Cardiology", "Pediatrics")</li>
                  <li>Search for a procedure (e.g., "Annual Physical", "X-Ray")</li>
                  <li>Find a service (e.g., "Initial Consultation", "Follow-up Visit")</li>
                  <li>Click on the location to change your search area</li>
                  <li>Select your insurance to see in-network providers</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Select Provider */}
      {currentStep === 'select-provider' && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Select a Provider</h2>
              <p className="text-gray-600">
                Providers offering {searchCriteria?.searchResult?.name}
                {searchCriteria?.location && ` near ${searchCriteria.location.city}, ${searchCriteria.location.province}`}
              </p>
            </div>
            <button
              onClick={() => setCurrentStep('search')}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              New Search
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Finding providers...</div>
          ) : providers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                No providers found matching your search criteria
              </p>
              <button
                onClick={() => setCurrentStep('search')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Try a different search
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  onClick={() => handleProviderSelect(provider)}
                  className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md cursor-pointer transition"
                >
                  <div className="flex items-start gap-4">
                    {provider.user_profiles?.profile_photo_url ? (
                      <img
                        src={provider.user_profiles.profile_photo_url}
                        alt={provider.user_profiles?.first_name}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-10 h-10 text-blue-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Dr. {provider.user_profiles?.first_name} {provider.user_profiles?.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">{provider.specialization}</p>
                      <div className="flex items-center gap-4 mt-2">
                        {provider.rating && (
                          <div className="flex items-center gap-1 text-sm text-gray-700">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{provider.rating.toFixed(1)}</span>
                            {provider.review_count && <span className="text-gray-500">({provider.review_count})</span>}
                          </div>
                        )}
                        {provider.distance !== undefined && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span>{provider.distance.toFixed(1)} km away</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {provider.city}, {provider.province}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Select Type */}
      {currentStep === 'select-type' && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">How would you like to meet?</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleTypeSelect('in-person')}
              className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 transition text-left"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">In-Person Visit</h3>
                  <p className="text-sm text-gray-600">Meet at the clinic</p>
                </div>
              </div>
            </button>
            {selectedProvider?.virtual_consultations_available && (
              <button
                onClick={() => handleTypeSelect('virtual')}
                className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 transition text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                    <Video className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Video Consultation</h3>
                    <p className="text-sm text-gray-600">Online video call</p>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Date & Time */}
      {currentStep === 'select-datetime' && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Pick a Date & Time</h2>
            <button
              onClick={() => setCurrentStep('select-type')}
              className="text-sky-600 hover:text-sky-700 font-medium flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          {providerServices.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select a Service</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {providerServices.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service)}
                    className={`p-4 border-2 rounded-lg text-left transition ${
                      selectedService?.id === service.id
                        ? 'border-sky-600 bg-sky-50'
                        : 'border-gray-200 hover:border-sky-400'
                    }`}
                  >
                    <h4 className="font-semibold text-gray-900">{service.service_name}</h4>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{service.duration_minutes} min</span>
                      {service.base_price != null && <span className="font-semibold text-sky-600">${service.base_price}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto" />
              <p className="text-gray-600 mt-4">Loading available time slots...</p>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No available time slots found for the next 30 days.</p>
              <p className="text-sm text-gray-500 mt-2">Try a different visit type or contact the provider directly.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {availableSlots.map((slot) => (
                <div key={slot.date} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h3>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {slot.times.map((time) => (
                      <button
                        key={time}
                        onClick={() => handleDateTimeSelect(slot.date, time)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-sky-50 hover:border-sky-500 transition text-sm"
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 5: Questionnaire */}
      {currentStep === 'questionnaire' && questionnaire.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <QuestionnaireStep
            questions={questionnaire}
            responses={questionnaireResponses}
            onResponseChange={(questionId, response) => {
              setQuestionnaireResponses({ ...questionnaireResponses, [questionId]: response });
            }}
            onSaveDraft={() => {}}
            onNext={async () => {
              const consultType = visitType === 'virtual' ? 'virtual' : 'in_person';
              const forms = await enhancedBookingService.getConsentForms(consultType);
              setConsentForms(forms);
              setCurrentStep('consent');
            }}
            onBack={() => setCurrentStep('select-datetime')}
          />
        </div>
      )}

      {/* Step 6: Consent Forms */}
      {currentStep === 'consent' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <ConsentFormsStep
            forms={consentForms}
            signedForms={signedConsents}
            onSignForm={(formId, signature) => {
              setSignedConsents(new Set([...signedConsents, formId]));
            }}
            onNext={() => setCurrentStep('payment')}
            onBack={() => {
              if (questionnaire.length > 0) setCurrentStep('questionnaire');
              else setCurrentStep('select-datetime');
            }}
          />
        </div>
      )}

      {/* Step 7: Payment */}
      {currentStep === 'payment' && patient && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <PaymentStep
            patientId={patient.id}
            userId={user?.id || ''}
            servicePrice={selectedService?.base_price || selectedProvider?.consultation_fee_cents ? (selectedProvider.consultation_fee_cents / 100) : 150}
            onPaymentMethodSelect={(method, policyId) => {
              setPaymentMethod(method);
              setInsurancePolicyId(policyId);
            }}
            onNext={() => setCurrentStep('add-details')}
            onBack={() => setCurrentStep('consent')}
          />
        </div>
      )}

      {/* Step 8: Add Details */}
      {currentStep === 'add-details' && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Appointment Details</h2>

          {familyMembers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Booking For
                </span>
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setBookingFor('self')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition ${
                    bookingFor === 'self'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <User className="w-4 h-4" />
                  Myself
                </button>
                {familyMembers.map(member => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setBookingFor(member.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition ${
                      bookingFor === member.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    {member.first_name} {member.last_name}
                    <span className="text-xs text-gray-400 font-normal">
                      ({familyManagementService.formatAge(member.date_of_birth)})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Visit <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reasonForVisit}
              onChange={(e) => setReasonForVisit(e.target.value)}
              placeholder="e.g., Annual checkup, Follow-up visit"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chief Complaint (Optional)
            </label>
            <textarea
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="Describe your symptoms or concerns..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Insurance Card Selection */}
          {matchingCards.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Insurance Card <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                {matchingCards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => setSelectedInsuranceCard(card)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                      selectedInsuranceCard?.id === card.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        checked={selectedInsuranceCard?.id === card.id}
                        onChange={() => setSelectedInsuranceCard(card)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {card.insurance_provider?.name}
                          </h4>
                          {card.is_primary && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">Policy: {card.policy_number}</p>
                        {card.member_id && (
                          <p className="text-sm text-gray-600">Member ID: {card.member_id}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {patientInsuranceCards.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                No insurance cards on file. You can add insurance cards in your profile or proceed with self-pay.
              </p>
            </div>
          )}

          {matchingCards.length === 0 && patientInsuranceCards.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 mb-2">
                This provider doesn't accept your current insurance cards. You can:
              </p>
              <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                <li>Proceed with self-pay (out of pocket)</li>
                <li>Add a different insurance card in your profile</li>
                <li>Contact the provider about payment options</li>
              </ul>
            </div>
          )}

          <button
            onClick={() => setCurrentStep('confirm')}
            disabled={!reasonForVisit}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Confirmation
          </button>
        </div>
      )}

      {/* Step 6: Confirm */}
      {currentStep === 'confirm' && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">Review & Confirm</h2>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            {bookingFor !== 'self' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Booking on behalf of: {familyMembers.find(m => m.id === bookingFor)?.first_name} {familyMembers.find(m => m.id === bookingFor)?.last_name}
                </p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Search Type</h3>
              <p className="text-gray-900">
                {searchCriteria?.searchResult?.name} ({searchCriteria?.searchResult?.type})
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Provider</h3>
              <p className="text-gray-900">
                Dr. {selectedProvider?.user_profiles?.first_name} {selectedProvider?.user_profiles?.last_name}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Visit Type</h3>
              <p className="text-gray-900 capitalize">{visitType.replace('-', ' ')}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Date & Time</h3>
              <p className="text-gray-900">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                at {selectedTime}
              </p>
            </div>

            {paymentMethod && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Payment</h3>
                <p className="text-gray-900 capitalize">{paymentMethod === 'insurance' ? 'Insurance' : 'Self-Pay'}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Reason for Visit</h3>
              <p className="text-gray-900">{reasonForVisit}</p>
            </div>

            {chiefComplaint && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Chief Complaint</h3>
                <p className="text-gray-900">{chiefComplaint}</p>
              </div>
            )}

            {searchCriteria?.location && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Location</h3>
                <p className="text-gray-900">{searchCriteria.location.displayName}</p>
              </div>
            )}

            {searchCriteria?.insurance && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Insurance</h3>
                <p className="text-gray-900">{searchCriteria.insurance.name}</p>
              </div>
            )}

            {selectedInsuranceCard && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Payment Method</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="font-medium text-gray-900">
                    {selectedInsuranceCard.insurance_provider?.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Policy: {selectedInsuranceCard.policy_number}
                  </p>
                  {selectedInsuranceCard.insurance_provider?.slug === 'self-pay' && (
                    <p className="text-xs text-green-700 mt-1">
                      Out-of-pocket payment - You'll be redirected to payment after confirmation
                    </p>
                  )}
                </div>
              </div>
            )}

            {!selectedInsuranceCard && matchingCards.length === 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Payment Method</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    Self-pay - Payment will be collected at the time of visit
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setCurrentStep('add-details')}
              className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition"
            >
              Back
            </button>
            <button
              onClick={handleConfirmBooking}
              disabled={loading || !reasonForVisit}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      )}

      {currentStep === ('confirmation' as any) && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Booking Confirmed!</h2>
          <p className="text-gray-600 mb-2">Your appointment has been successfully scheduled.</p>
          <p className="text-sm text-gray-500 mb-8">
            You will be redirected to your appointments page shortly.
          </p>
          <div className="max-w-md mx-auto bg-sky-50 border border-sky-200 rounded-lg p-6 text-left mb-8">
            <h3 className="font-semibold text-sky-900 mb-3">Appointment Summary</h3>
            <div className="space-y-2 text-sm text-sky-800">
              <p className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Dr. {selectedProvider?.user_profiles?.first_name} {selectedProvider?.user_profiles?.last_name}
              </p>
              <p className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {selectedTime}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/patient/appointments')}
            className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium"
          >
            View My Appointments
          </button>
        </div>
      )}
    </div>
  );
}
