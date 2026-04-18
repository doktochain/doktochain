import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import LanguageRouter from './components/LanguageRouter';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { RouteErrorBoundary } from './components/ui/RouteErrorBoundary';
import { DynamicSeo } from './components/seo/DynamicSeo';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-6">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Page Not Found</h2>
        <p className="text-gray-500 mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <a href="/" className="inline-block px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium transition-colors">
          Go to Home
        </a>
      </div>
    </div>
  );
}

function LanguageRedirect() {
  const location = useLocation();
  const stored = localStorage.getItem('doktochain_language');
  const lang =
    stored === 'en' || stored === 'fr'
      ? stored
      : navigator.language?.startsWith('fr')
        ? 'fr'
        : 'en';
  const stripped = location.pathname.replace(/^\/(en|fr)(\/|$)/, '/');
  return (
    <Navigate
      to={`/${lang}${stripped === '/' ? '' : stripped}${location.search}${location.hash}`}
      replace
    />
  );
}

const FrontendLayout = lazy(() => import('./app/frontend/layout'));
const FrontendPage = lazy(() => import('./app/frontend/page'));
const DashboardLayout = lazy(() => import('./app/dashboard/layout'));
const DashboardPage = lazy(() => import('./app/dashboard/page'));

const FallbackSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
);

const ProviderProfilePage = lazy(() => import('./app/frontend/provider-profile/[slug]/page'));
const FindProvidersPage = lazy(() => import('./app/frontend/find-providers/page'));
const AboutPage = lazy(() => import('./app/frontend/about/page'));
const HelpPage = lazy(() => import('./app/frontend/help/page'));
const SpecialtiesPage = lazy(() => import('./app/frontend/browse/specialties/page'));
const SpecialtyDetailPage = lazy(() => import('./app/frontend/browse/specialties/[slug]/page'));
const ProceduresPage = lazy(() => import('./app/frontend/browse/procedures/page'));
const ProcedureDetailPage = lazy(() => import('./app/frontend/browse/procedures/[slug]/page'));
const ForBusinessPage = lazy(() => import('./app/frontend/for-business/page'));
const PricingPage = lazy(() => import('./app/frontend/pricing/page'));
const PrivacyPolicyPage = lazy(() => import('./app/frontend/legal/privacy-policy/page'));
const TermsOfServicePage = lazy(() => import('./app/frontend/legal/terms-of-service/page'));
const CookiePolicyPage = lazy(() => import('./app/frontend/legal/cookie-policy/page'));
const HipaaCompliancePage = lazy(() => import('./app/frontend/legal/hipaa-compliance/page'));
const SecurityWhitepaperPage = lazy(() => import('./app/frontend/legal/security-whitepaper/page'));
const AccessibilityPage = lazy(() => import('./app/frontend/legal/accessibility/page'));
const RefundPolicyPage = lazy(() => import('./app/frontend/legal/refund-policy/page'));

const PatientLoginPage = lazy(() => import('./app/auth/login/page'));
const ProviderLoginPage = lazy(() => import('./app/auth/provider-login/page'));
const BusinessPortalLoginPage = lazy(() => import('./app/auth/portal-login/page'));
const AdminLoginPage = lazy(() => import('./app/auth/admin-login/page'));
const RegisterPage = lazy(() => import('./app/auth/register/page'));

const PatientDashboard = lazy(() => import('./app/dashboard/patient/dashboard/page'));
const PatientProfile = lazy(() => import('./app/dashboard/patient/my-profile/page'));
const PatientAppointments = lazy(() => import('./app/dashboard/patient/appointments/page'));
const BookAppointment = lazy(() => import('./app/dashboard/patient/appointments/book/page'));
const AppointmentHistory = lazy(() => import('./app/dashboard/patient/appointments/history/page'));
const PharmacyMarketplace = lazy(() => import('./app/dashboard/patient/pharmacy/page'));
const PharmacyOrders = lazy(() => import('./app/dashboard/patient/pharmacy/orders/page'));
const PatientRefillRequests = lazy(() => import('./app/dashboard/patient/pharmacy/refills/page'));
const PharmacyMarketplaceFull = lazy(() => import('./app/dashboard/patient/pharmacy-marketplace/page'));
const VitalSigns = lazy(() => import('./app/dashboard/patient/health-tracking/vital-signs/page'));
const HealthGoals = lazy(() => import('./app/dashboard/patient/health-tracking/health-goals/page'));
const MedicalRecords = lazy(() => import('./app/dashboard/patient/medical-records/page'));
const HealthRecords = lazy(() => import('./app/dashboard/patient/health-records/page'));
const VideoConsultation = lazy(() => import('./app/dashboard/patient/video-consultation/page'));
const VideoCallPage = lazy(() => import('./app/dashboard/video-call/[appointmentId]/page'));
const PatientMessages = lazy(() => import('./app/dashboard/patient/messages/page'));
const PatientPrescriptions = lazy(() => import('./app/dashboard/patient/prescriptions/page'));
const MedicationsPage = lazy(() => import('./app/dashboard/patient/medications/page'));
const BillingPage = lazy(() => import('./app/dashboard/patient/billing/page'));
const FamilyPage = lazy(() => import('./app/dashboard/patient/family/page'));
const SettingsPage = lazy(() => import('./app/dashboard/patient/settings/page'));
const HelpCenter = lazy(() => import('./app/dashboard/help/page'));
const SupportTickets = lazy(() => import('./app/dashboard/help/support/page'));
const FAQs = lazy(() => import('./app/dashboard/help/faqs/page'));
const LiveChat = lazy(() => import('./app/dashboard/help/chat/page'));

const ProviderAppointments = lazy(() => import('./app/dashboard/provider/appointments/page'));
const ProviderAppointmentQueue = lazy(() => import('./app/dashboard/provider/appointments/queue/page'));
const ProviderAppointmentHistory = lazy(() => import('./app/dashboard/provider/appointments/history/page'));
const ProviderPrescriptions = lazy(() => import('./app/dashboard/provider/prescriptions/page'));
const CreatePrescription = lazy(() => import('./app/dashboard/provider/prescriptions/create/page'));
const ProviderRefillRequests = lazy(() => import('./app/dashboard/provider/prescriptions/refills/page'));
const EditPrescription = lazy(() => import('./app/dashboard/provider/prescriptions/edit/[id]/page'));
const ProviderSchedule = lazy(() => import('./app/dashboard/provider/schedule/page'));
const ProviderDashboard = lazy(() => import('./app/dashboard/provider/dashboard/page'));
const ProviderProfile = lazy(() => import('./app/dashboard/provider/profile/page'));
const ProviderLocations = lazy(() => import('./app/dashboard/provider/locations/page'));
const ProviderCredentials = lazy(() => import('./app/dashboard/provider/credentials/page'));
const ProviderStaff = lazy(() => import('./app/dashboard/provider/staff/page'));
const ProviderTelemedicine = lazy(() => import('./app/dashboard/provider/telemedicine/page'));
const ProviderTelemedicineWaitingRoom = lazy(() => import('./app/dashboard/provider/telemedicine/waiting-room/page'));
const ProviderTelemedicineHistory = lazy(() => import('./app/dashboard/provider/telemedicine/history/page'));
const ClinicalDocumentation = lazy(() => import('./app/dashboard/provider/clinical-documentation/page'));
const ClinicalNotes = lazy(() => import('./app/dashboard/provider/clinical-notes/page'));
const PatientCharts = lazy(() => import('./app/dashboard/provider/patients/page'));
const Templates = lazy(() => import('./app/dashboard/provider/templates/page'));
const GatewaySetup = lazy(() => import('./app/dashboard/provider/billing/gateway-setup/page'));
const Earnings = lazy(() => import('./app/dashboard/provider/billing/earnings/page'));
const InsuranceClaims = lazy(() => import('./app/dashboard/provider/billing/claims/page'));
const Transactions = lazy(() => import('./app/dashboard/provider/billing/transactions/page'));
const ProviderInbox = lazy(() => import('./app/dashboard/provider/messaging/inbox/page'));
const MessageTemplates = lazy(() => import('./app/dashboard/provider/messaging/templates/page'));
const AutomatedMessaging = lazy(() => import('./app/dashboard/provider/messaging/automated/page'));
const StaffChat = lazy(() => import('./app/dashboard/provider/messaging/staff-chat/page'));
const ProviderNotificationsPreferences = lazy(() => import('./app/dashboard/provider/notifications-preferences/page'));
const ProviderHelpCenter = lazy(() => import('./app/dashboard/provider/help-center/page'));
const ProviderAffiliations = lazy(() => import('./app/dashboard/provider/affiliations/page'));
const ProviderReferrals = lazy(() => import('./app/dashboard/provider/referrals/page'));

const AdminUsers = lazy(() => import('./app/dashboard/admin/users/page'));
const AdminDashboard = lazy(() => import('./app/dashboard/admin/dashboard/page'));
const AdminAnalytics = lazy(() => import('./app/dashboard/admin/dashboard/analytics/page'));
const AdminFinance = lazy(() => import('./app/dashboard/admin/dashboard/finance/page'));
const AdminSales = lazy(() => import('./app/dashboard/admin/dashboard/sales/page'));
const AdminPharmacies = lazy(() => import('./app/dashboard/admin/pharmacies/page'));
const AdminMessages = lazy(() => import('./app/dashboard/admin/messages/page'));
const AdminNotifications = lazy(() => import('./app/dashboard/admin/notifications/page'));
const ProviderApplications = lazy(() => import('./app/dashboard/admin/provider-applications/page'));
const AdminProviderCredentials = lazy(() => import('./app/dashboard/admin/provider-credentials/page'));
const StaffManagement = lazy(() => import('./app/dashboard/admin/staff/page'));
const ActivityMonitoring = lazy(() => import('./app/dashboard/admin/activity/page'));
const AdminClinicProviders = lazy(() => import('./app/dashboard/admin/clinic/providers/page'));
const AdminClinicPatients = lazy(() => import('./app/dashboard/admin/clinic/patients/page'));
const AdminClinicPharmacies = lazy(() => import('./app/dashboard/admin/clinic/pharmacies/page'));
const AdminClinicAppointments = lazy(() => import('./app/dashboard/admin/clinic/appointments/page'));
const AdminClinicLocations = lazy(() => import('./app/dashboard/admin/clinic/locations/page'));
const AdminClinicServices = lazy(() => import('./app/dashboard/admin/clinic/services/page'));
const AdminClinicSpecializations = lazy(() => import('./app/dashboard/admin/clinic/specializations/page'));
const AdminClinicInsuranceProviders = lazy(() => import('./app/dashboard/admin/clinic/insurance-providers/page'));
const AdminClinicAssets = lazy(() => import('./app/dashboard/admin/clinic/assets/page'));
const AdminClinicProcedures = lazy(() => import('./app/dashboard/admin/clinic/procedures/page'));
const AdminClinicProducts = lazy(() => import('./app/dashboard/admin/clinic/products/page'));
const AdminClinicCustomManagement = lazy(() => import('./app/dashboard/admin/clinic/custom-management/page'));
const AdminClinicalTemplates = lazy(() => import('./app/dashboard/admin/clinical-templates/page'));
const AdminClinicsPage = lazy(() => import('./app/dashboard/admin/clinic/clinics/page'));
const AdminClinicApplications = lazy(() => import('./app/dashboard/admin/clinic/clinic-applications/page'));
const AdminProviderSchedule = lazy(() => import('./app/dashboard/admin/clinic/providers/[id]/schedule/page'));

const ClinicDashboardPage = lazy(() => import('./app/dashboard/clinic/dashboard/page'));
const ClinicProfilePage = lazy(() => import('./app/dashboard/clinic/profile/page'));
const ClinicProvidersPage = lazy(() => import('./app/dashboard/clinic/providers/page'));
const ClinicAffiliationsPage = lazy(() => import('./app/dashboard/clinic/affiliations/page'));
const ClinicSchedulePage = lazy(() => import('./app/dashboard/clinic/schedule/page'));
const ClinicSettingsPageView = lazy(() => import('./app/dashboard/clinic/settings/page'));
const ClinicMessagesPage = lazy(() => import('./app/dashboard/clinic/messages/page'));
const ClinicNotificationsPage = lazy(() => import('./app/dashboard/clinic/notifications/page'));
const ClinicAppointmentsPage = lazy(() => import('./app/dashboard/clinic/appointments/page'));
const ClinicAvailabilityPage = lazy(() => import('./app/dashboard/clinic/appointments/availability/page'));
const ClinicBillingPage = lazy(() => import('./app/dashboard/clinic/billing/page'));
const ClinicServicesPage = lazy(() => import('./app/dashboard/clinic/services/page'));
const ClinicSpecializationsPage = lazy(() => import('./app/dashboard/clinic/specializations/page'));
const ClinicPatientsPage = lazy(() => import('./app/dashboard/clinic/patients/page'));
const ClinicPatientDetailPage = lazy(() => import('./app/dashboard/clinic/patients/[id]/page'));
const ClinicStaffPage = lazy(() => import('./app/dashboard/clinic/staff/page'));

const HRMDashboard = lazy(() => import('./app/dashboard/admin/hrm/dashboard/page'));
const HRMDepartments = lazy(() => import('./app/dashboard/admin/hrm/departments/page'));
const HRMAttendance = lazy(() => import('./app/dashboard/admin/hrm/attendance/page'));
const HRMLeaves = lazy(() => import('./app/dashboard/admin/hrm/leaves/page'));
const HRMPayroll = lazy(() => import('./app/dashboard/admin/hrm/payroll/page'));
const HRMReports = lazy(() => import('./app/dashboard/admin/hrm/reports/page'));
const PermissionsPage = lazy(() => import('./app/dashboard/admin/permissions/page'));

const AdminFinanceExpenses = lazy(() => import('./app/dashboard/admin/finance/expenses/page'));
const AdminFinanceIncome = lazy(() => import('./app/dashboard/admin/finance/income/page'));
const AdminFinanceInvoices = lazy(() => import('./app/dashboard/admin/finance/invoices/page'));
const AdminFinanceInvoiceDetails = lazy(() => import('./app/dashboard/admin/finance/invoices/details/page'));
const AdminFinancePayments = lazy(() => import('./app/dashboard/admin/finance/payments/page'));
const AdminFinanceTransactions = lazy(() => import('./app/dashboard/admin/finance/transactions/page'));
const AdminFinanceBillingConfig = lazy(() => import('./app/dashboard/admin/finance/billing-config/page'));
const AdminFinanceRefunds = lazy(() => import('./app/dashboard/admin/finance/refunds/page'));
const AdminFinanceReports = lazy(() => import('./app/dashboard/admin/finance/reports/page'));
const AdminFinanceDeliveryCosts = lazy(() => import('./app/dashboard/admin/finance/delivery-costs/page'));
const AdminFinanceSettlements = lazy(() => import('./app/dashboard/admin/finance/settlements/page'));
const AdminFinanceSubscriptions = lazy(() => import('./app/dashboard/admin/finance/subscriptions/page'));

const ReportsPage = lazy(() => import('./app/dashboard/admin/reports/page'));
const IncomeReportPage = lazy(() => import('./app/dashboard/admin/reports/income/page'));
const ExpensesReportPage = lazy(() => import('./app/dashboard/admin/reports/expenses/page'));
const ProfitLossReportPage = lazy(() => import('./app/dashboard/admin/reports/profit-loss/page'));
const AppointmentReportPage = lazy(() => import('./app/dashboard/admin/reports/appointments/page'));
const PatientReportPage = lazy(() => import('./app/dashboard/admin/reports/patients/page'));
const CustomReportBuilderPage = lazy(() => import('./app/dashboard/admin/reports/custom/page'));

const WebsiteSettingsPage = lazy(() => import('./app/dashboard/admin/settings/website/page'));
const ClinicSettingsPage = lazy(() => import('./app/dashboard/admin/settings/clinic/page'));
const AppSettingsPage = lazy(() => import('./app/dashboard/admin/settings/app/page'));
const SystemSettingsPage = lazy(() => import('./app/dashboard/admin/settings/system/page'));
const FinanceSettingsPage = lazy(() => import('./app/dashboard/admin/settings/finance/page'));
const AccountSettingsPage = lazy(() => import('./app/dashboard/admin/settings/account/page'));
const OtherSettingsPage = lazy(() => import('./app/dashboard/admin/settings/other/page'));

const CMSPagesPage = lazy(() => import('./app/dashboard/admin/content/pages/page'));
const CMSBlogsPage = lazy(() => import('./app/dashboard/admin/content/blogs/page'));
const CMSCategoriesPage = lazy(() => import('./app/dashboard/admin/content/categories/page'));
const CMSTagsPage = lazy(() => import('./app/dashboard/admin/content/tags/page'));
const CMSMediaLibraryPage = lazy(() => import('./app/dashboard/admin/content/media/page'));
const CMSLocationsPage = lazy(() => import('./app/dashboard/admin/content/locations/page'));
const CMSTestimonialsPage = lazy(() => import('./app/dashboard/admin/content/testimonials/page'));
const CMSFAQsPage = lazy(() => import('./app/dashboard/admin/content/faqs/page'));

const FHIREndpointsPage = lazy(() => import('./app/dashboard/admin/interoperability/fhir-endpoints/page'));
const AuditTrailPage = lazy(() => import('./app/dashboard/admin/interoperability/blockchain-audit/page'));
const ProvincialEHRPage = lazy(() => import('./app/dashboard/admin/interoperability/provincial-ehr/page'));

const PharmacyDashboard = lazy(() => import('./app/dashboard/pharmacy/dashboard/page'));
const PharmacyPortalOrders = lazy(() => import('./app/dashboard/pharmacy/orders/page'));
const PharmacyOrdersPending = lazy(() => import('./app/dashboard/pharmacy/orders/pending/page'));
const PharmacyOrdersHistory = lazy(() => import('./app/dashboard/pharmacy/orders/history/page'));
const PharmacyPortalPrescriptions = lazy(() => import('./app/dashboard/pharmacy/prescriptions/page'));
const PharmacyPrescriptionsPending = lazy(() => import('./app/dashboard/pharmacy/prescriptions/pending/page'));
const PharmacyPrescriptionsRefills = lazy(() => import('./app/dashboard/pharmacy/prescriptions/refills/page'));
const PharmacyPortalInventory = lazy(() => import('./app/dashboard/pharmacy/inventory/page'));
const PharmacyInventoryLowStock = lazy(() => import('./app/dashboard/pharmacy/inventory/low-stock/page'));
const PharmacyInventoryAdd = lazy(() => import('./app/dashboard/pharmacy/inventory/add/page'));
const PharmacyPortalCustomers = lazy(() => import('./app/dashboard/pharmacy/customers/page'));
const PharmacyPortalProfile = lazy(() => import('./app/dashboard/pharmacy/profile/page'));
const PharmacyHours = lazy(() => import('./app/dashboard/pharmacy/hours/page'));
const PharmacyStaff = lazy(() => import('./app/dashboard/pharmacy/staff/page'));
const PharmacyPortalMessages = lazy(() => import('./app/dashboard/pharmacy/messages/page'));
const PharmacyPortalNotifications = lazy(() => import('./app/dashboard/pharmacy/notifications/page'));

const SelectPlanPage = lazy(() => import('./app/dashboard/select-plan/page'));

const Messages = lazy(() => import('./app/dashboard/messages/page'));
const Notifications = lazy(() => import('./app/dashboard/notifications/page'));

const ApplicationsPage = lazy(() => import('./app/dashboard/applications/page'));
const ChatPage = lazy(() => import('./app/dashboard/chat/page'));
const CallsPage = lazy(() => import('./app/dashboard/calls/page'));
const VoiceCallPage = lazy(() => import('./app/dashboard/calls/voice/page'));
const IncomingCallsPage = lazy(() => import('./app/dashboard/calls/incoming/page'));
const OutgoingCallsPage = lazy(() => import('./app/dashboard/calls/outgoing/page'));
const CallHistoryPage = lazy(() => import('./app/dashboard/calls/history/page'));
const CalendarPage = lazy(() => import('./app/dashboard/calendar/page'));
const ContactsPage = lazy(() => import('./app/dashboard/contacts/page'));
const EmailPage = lazy(() => import('./app/dashboard/email/page'));
const InvoicesPage = lazy(() => import('./app/dashboard/invoices/page'));
const InvoiceDetailsPage = lazy(() => import('./app/dashboard/invoices/[id]/page'));
const NotesPage = lazy(() => import('./app/dashboard/notes/page'));
const KanbanPage = lazy(() => import('./app/dashboard/kanban/page'));
const FileManagerPage = lazy(() => import('./app/dashboard/file-manager/page'));
const SocialFeedPage = lazy(() => import('./app/dashboard/social-feed/page'));
const SearchResultsPage = lazy(() => import('./app/dashboard/search-results/page'));

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors closeButton />
      <BrowserRouter>
        <LanguageProvider>
          <DynamicSeo />
          <ScrollToTop />
          <RouteErrorBoundary>
          <Suspense fallback={<FallbackSpinner />}>
            <Routes>
              <Route path="/:lang" element={<LanguageRouter />}>
                <Route index element={<FrontendLayout><FrontendPage /></FrontendLayout>} />
                <Route path="frontend/find-providers" element={<FrontendLayout><FindProvidersPage /></FrontendLayout>} />
                <Route path="frontend/about" element={<FrontendLayout><AboutPage /></FrontendLayout>} />
                <Route path="frontend/help" element={<FrontendLayout><HelpPage /></FrontendLayout>} />
                <Route path="frontend/browse/specialties" element={<FrontendLayout><SpecialtiesPage /></FrontendLayout>} />
                <Route path="frontend/browse/specialties/:slug" element={<FrontendLayout><SpecialtyDetailPage /></FrontendLayout>} />
                <Route path="frontend/browse/procedures" element={<FrontendLayout><ProceduresPage /></FrontendLayout>} />
                <Route path="frontend/browse/procedures/:slug" element={<FrontendLayout><ProcedureDetailPage /></FrontendLayout>} />
                <Route path="frontend/provider-profile/:slug" element={<FrontendLayout><ProviderProfilePage /></FrontendLayout>} />
                <Route path="provider-profile/:slug" element={<FrontendLayout><ProviderProfilePage /></FrontendLayout>} />
                <Route path="for-business" element={<FrontendLayout><ForBusinessPage /></FrontendLayout>} />
                <Route path="pricing" element={<FrontendLayout><PricingPage /></FrontendLayout>} />
                <Route path="frontend/pricing" element={<FrontendLayout><PricingPage /></FrontendLayout>} />
                <Route path="legal/privacy-policy" element={<FrontendLayout><PrivacyPolicyPage /></FrontendLayout>} />
                <Route path="legal/terms-of-service" element={<FrontendLayout><TermsOfServicePage /></FrontendLayout>} />
                <Route path="legal/cookie-policy" element={<FrontendLayout><CookiePolicyPage /></FrontendLayout>} />
                <Route path="legal/hipaa-compliance" element={<FrontendLayout><HipaaCompliancePage /></FrontendLayout>} />
                <Route path="legal/security-whitepaper" element={<FrontendLayout><SecurityWhitepaperPage /></FrontendLayout>} />
                <Route path="legal/accessibility" element={<FrontendLayout><AccessibilityPage /></FrontendLayout>} />
                <Route path="legal/refund-policy" element={<FrontendLayout><RefundPolicyPage /></FrontendLayout>} />

                <Route path="login" element={<PatientLoginPage />} />
                <Route path="provider/login" element={<ProviderLoginPage />} />
                <Route path="portal/login" element={<BusinessPortalLoginPage />} />
                <Route path="platform-admin/login" element={<AdminLoginPage />} />
                <Route path="register" element={<RegisterPage />} />

                <Route path="dashboard" element={<ProtectedRoute allowedRoles={['patient', 'provider', 'admin', 'pharmacy', 'clinic', 'staff']}><DashboardLayout><DashboardPage /></DashboardLayout></ProtectedRoute>} />

                <Route path="dashboard/patient/dashboard" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><PatientDashboard /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/patient/profile" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><PatientProfile /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/patient/my-profile" element={<Navigate to="../profile" replace />} />
                <Route path="dashboard/patient/appointments" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><PatientAppointments /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/patient/appointments/book" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><BookAppointment /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/patient/appointments/history" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><AppointmentHistory /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/patient/pharmacy" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><PharmacyMarketplace /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/patient/pharmacy/orders" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><PharmacyOrders /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/patient/pharmacy/refills" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><PatientRefillRequests /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/patient/pharmacy-marketplace" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><PharmacyMarketplaceFull /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/patient/medical-records" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><MedicalRecords /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/patient/health-records" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><HealthRecords /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/patient/video-consultation" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><VideoConsultation /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/video-call/:appointmentId" element={<ProtectedRoute allowedRoles={['patient', 'provider']}><VideoCallPage /></ProtectedRoute>} />
                <Route path="dashboard/patient/messages" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><PatientMessages /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/patient/prescriptions" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><PatientPrescriptions /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/patient/medications" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><MedicationsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/patient/billing" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><BillingPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/patient/family" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><FamilyPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/patient/settings" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><SettingsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/help" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><HelpCenter /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/help/support" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><SupportTickets /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/help/faqs" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><FAQs /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/help/chat" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><LiveChat /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/patient/health-tracking/vital-signs" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><VitalSigns /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/patient/health-tracking/health-goals" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><HealthGoals /></DashboardLayout></ProtectedRoute>} />

                <Route path="dashboard/provider/dashboard" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><ProviderDashboard /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/appointments" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><ProviderAppointments /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/appointments/queue" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><ProviderAppointmentQueue /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/appointments/history" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><ProviderAppointmentHistory /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/prescriptions" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><ProviderPrescriptions /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/prescriptions/create" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><CreatePrescription /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/prescriptions/refills" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><ProviderRefillRequests /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/prescriptions/edit/:id" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><EditPrescription /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/schedule" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><ProviderSchedule /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/profile" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><ProviderProfile /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/locations" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><ProviderLocations /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/credentials" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><ProviderCredentials /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/staff" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><ProviderStaff /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/telemedicine" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><ProviderTelemedicine /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/telemedicine/waiting-room" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><ProviderTelemedicineWaitingRoom /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/telemedicine/history" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><ProviderTelemedicineHistory /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/clinical-documentation" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><ClinicalDocumentation /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/clinical-notes" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><ClinicalNotes /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/patients" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><PatientCharts /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/templates" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><Templates /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/billing/gateway-setup" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><GatewaySetup /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/billing/earnings" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><Earnings /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/billing/claims" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><InsuranceClaims /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/billing/transactions" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><Transactions /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/messaging/inbox" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><ProviderInbox /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/messaging/templates" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><MessageTemplates /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/messaging/automated" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><AutomatedMessaging /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/messaging/staff-chat" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><StaffChat /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/notifications-preferences" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><ProviderNotificationsPreferences /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/help-center" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><ProviderHelpCenter /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/affiliations" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><ProviderAffiliations /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/provider/referrals" element={<ProtectedRoute allowedRoles={['provider']}><DashboardLayout><ProviderReferrals /></DashboardLayout></ProtectedRoute>} />

                <Route path="dashboard/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminDashboard /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/dashboard/analytics" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminAnalytics /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/dashboard/finance" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminFinance /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/dashboard/sales" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminSales /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminUsers /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/provider-applications" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><ProviderApplications /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/provider-credentials" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminProviderCredentials /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/staff" element={<ProtectedRoute allowedRoles={['admin', 'provider']}><DashboardLayout><StaffManagement /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/activity" element={<ProtectedRoute allowedRoles={['admin', 'provider']}><DashboardLayout><ActivityMonitoring /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/pharmacies" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminPharmacies /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/messages" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminMessages /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/notifications" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminNotifications /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/clinic/clinics" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminClinicsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/clinic/clinic-applications" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminClinicApplications /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/clinic/providers" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminClinicProviders /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/clinic/providers/:id/schedule" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminProviderSchedule /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/clinic/patients" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminClinicPatients /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/clinic/pharmacies" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminClinicPharmacies /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/clinic/appointments" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminClinicAppointments /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/clinic/locations" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminClinicLocations /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/clinic/services" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminClinicServices /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/clinic/specializations" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminClinicSpecializations /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/clinic/insurance-providers" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminClinicInsuranceProviders /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/clinic/assets" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminClinicAssets /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/clinic/procedures" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminClinicProcedures /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/clinic/products" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminClinicProducts /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/clinic/custom-management" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminClinicCustomManagement /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/clinical-templates" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminClinicalTemplates /></DashboardLayout></ProtectedRoute>} />

                <Route path="dashboard/admin/hrm/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><HRMDashboard /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/hrm/departments" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><HRMDepartments /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/hrm/attendance" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><HRMAttendance /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/hrm/leaves" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><HRMLeaves /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/hrm/payroll" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><HRMPayroll /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/hrm/reports" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><HRMReports /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/permissions" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><PermissionsPage /></DashboardLayout></ProtectedRoute>} />

                <Route path="dashboard/admin/finance/expenses" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminFinanceExpenses /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/finance/income" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminFinanceIncome /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/finance/invoices" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminFinanceInvoices /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/finance/invoices/details" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminFinanceInvoiceDetails /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/finance/payments" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminFinancePayments /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/finance/transactions" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminFinanceTransactions /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/finance/billing-config" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminFinanceBillingConfig /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/finance/refunds" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminFinanceRefunds /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/finance/reports" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminFinanceReports /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/finance/delivery-costs" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminFinanceDeliveryCosts /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/finance/settlements" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminFinanceSettlements /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/finance/subscriptions" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminFinanceSubscriptions /></DashboardLayout></ProtectedRoute>} />

                <Route path="dashboard/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><ReportsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/reports/income" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><IncomeReportPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/reports/expenses" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><ExpensesReportPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/reports/profit-loss" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><ProfitLossReportPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/reports/appointments" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AppointmentReportPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/reports/patients" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><PatientReportPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/reports/custom" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><CustomReportBuilderPage /></DashboardLayout></ProtectedRoute>} />

                <Route path="dashboard/admin/settings/website" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><WebsiteSettingsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/settings/clinic" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><ClinicSettingsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/settings/app" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AppSettingsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/settings/system" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><SystemSettingsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/settings/finance" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><FinanceSettingsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/settings/account" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AccountSettingsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/settings/other" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><OtherSettingsPage /></DashboardLayout></ProtectedRoute>} />

                <Route path="dashboard/admin/content/pages" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><CMSPagesPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/content/blogs" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><CMSBlogsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/content/categories" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><CMSCategoriesPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/content/tags" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><CMSTagsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/content/media" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><CMSMediaLibraryPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/content/locations" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><CMSLocationsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/content/testimonials" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><CMSTestimonialsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/content/faqs" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><CMSFAQsPage /></DashboardLayout></ProtectedRoute>} />

                <Route path="dashboard/admin/interoperability/fhir-endpoints" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><FHIREndpointsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/interoperability/audit-trail" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AuditTrailPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/admin/interoperability/provincial-ehr" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><ProvincialEHRPage /></DashboardLayout></ProtectedRoute>} />

                <Route path="dashboard/clinic/dashboard" element={<ProtectedRoute allowedRoles={['clinic']}><DashboardLayout><ClinicDashboardPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/clinic/profile" element={<ProtectedRoute allowedRoles={['clinic']}><DashboardLayout><ClinicProfilePage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/clinic/providers" element={<ProtectedRoute allowedRoles={['clinic']}><DashboardLayout><ClinicProvidersPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/clinic/affiliations" element={<ProtectedRoute allowedRoles={['clinic']}><DashboardLayout><ClinicAffiliationsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/clinic/schedule" element={<ProtectedRoute allowedRoles={['clinic']}><DashboardLayout><ClinicSchedulePage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/clinic/settings" element={<ProtectedRoute allowedRoles={['clinic']}><DashboardLayout><ClinicSettingsPageView /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/clinic/messages" element={<ProtectedRoute allowedRoles={['clinic']}><DashboardLayout><ClinicMessagesPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/clinic/notifications" element={<ProtectedRoute allowedRoles={['clinic']}><DashboardLayout><ClinicNotificationsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/clinic/appointments" element={<ProtectedRoute allowedRoles={['clinic']}><DashboardLayout><ClinicAppointmentsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/clinic/appointments/availability" element={<ProtectedRoute allowedRoles={['clinic']}><DashboardLayout><ClinicAvailabilityPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/clinic/billing" element={<ProtectedRoute allowedRoles={['clinic']}><DashboardLayout><ClinicBillingPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/clinic/services" element={<ProtectedRoute allowedRoles={['clinic']}><DashboardLayout><ClinicServicesPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/clinic/specializations" element={<ProtectedRoute allowedRoles={['clinic']}><DashboardLayout><ClinicSpecializationsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/clinic/patients" element={<ProtectedRoute allowedRoles={['clinic']}><DashboardLayout><ClinicPatientsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/clinic/patients/:id" element={<ProtectedRoute allowedRoles={['clinic']}><DashboardLayout><ClinicPatientDetailPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/clinic/staff" element={<ProtectedRoute allowedRoles={['clinic']}><DashboardLayout><ClinicStaffPage /></DashboardLayout></ProtectedRoute>} />

                <Route path="dashboard/pharmacy/dashboard" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><PharmacyDashboard /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/pharmacy/orders" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><PharmacyPortalOrders /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/pharmacy/prescriptions" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><PharmacyPortalPrescriptions /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/pharmacy/inventory" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><PharmacyPortalInventory /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/pharmacy/customers" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><PharmacyPortalCustomers /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/pharmacy/profile" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><PharmacyPortalProfile /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/pharmacy/messages" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><PharmacyPortalMessages /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/pharmacy/notifications" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><PharmacyPortalNotifications /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/pharmacy/orders/pending" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><PharmacyOrdersPending /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/pharmacy/orders/history" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><PharmacyOrdersHistory /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/pharmacy/hours" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><PharmacyHours /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/pharmacy/staff" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><PharmacyStaff /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/pharmacy/prescriptions/pending" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><PharmacyPrescriptionsPending /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/pharmacy/prescriptions/refills" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><PharmacyPrescriptionsRefills /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/pharmacy/inventory/low-stock" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><PharmacyInventoryLowStock /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/pharmacy/inventory/add" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><PharmacyInventoryAdd /></DashboardLayout></ProtectedRoute>} />

                <Route path="dashboard/select-plan" element={<ProtectedRoute allowedRoles={['provider', 'pharmacy', 'clinic']}><DashboardLayout><SelectPlanPage /></DashboardLayout></ProtectedRoute>} />

                <Route path="dashboard/messages" element={<ProtectedRoute allowedRoles={['patient', 'provider', 'admin', 'pharmacy', 'clinic', 'staff']}><DashboardLayout><Messages /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/notifications" element={<ProtectedRoute allowedRoles={['patient', 'provider', 'admin', 'pharmacy', 'clinic', 'staff']}><DashboardLayout><Notifications /></DashboardLayout></ProtectedRoute>} />

                <Route path="dashboard/applications" element={<ProtectedRoute allowedRoles={['patient', 'provider', 'admin', 'pharmacy']}><DashboardLayout><ApplicationsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/chat" element={<ProtectedRoute allowedRoles={['patient', 'provider', 'admin', 'pharmacy']}><DashboardLayout><ChatPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/calls" element={<ProtectedRoute allowedRoles={['patient', 'provider', 'admin', 'pharmacy']}><DashboardLayout><CallsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/calls/voice" element={<ProtectedRoute allowedRoles={['patient', 'provider', 'admin', 'pharmacy']}><DashboardLayout><VoiceCallPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/calls/video" element={<ProtectedRoute allowedRoles={['patient', 'provider', 'admin', 'pharmacy']}><DashboardLayout><VideoCallPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/calls/incoming" element={<ProtectedRoute allowedRoles={['patient', 'provider', 'admin', 'pharmacy']}><DashboardLayout><IncomingCallsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/calls/outgoing" element={<ProtectedRoute allowedRoles={['patient', 'provider', 'admin', 'pharmacy']}><DashboardLayout><OutgoingCallsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/calls/history" element={<ProtectedRoute allowedRoles={['patient', 'provider', 'admin', 'pharmacy']}><DashboardLayout><CallHistoryPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/calendar" element={<ProtectedRoute allowedRoles={['patient', 'provider', 'admin', 'pharmacy']}><DashboardLayout><CalendarPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/contacts" element={<ProtectedRoute allowedRoles={['patient', 'provider', 'admin', 'pharmacy']}><DashboardLayout><ContactsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/email" element={<ProtectedRoute allowedRoles={['patient', 'provider', 'admin', 'pharmacy']}><DashboardLayout><EmailPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/invoices" element={<ProtectedRoute allowedRoles={['patient', 'provider', 'admin', 'pharmacy']}><DashboardLayout><InvoicesPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/invoices/:id" element={<ProtectedRoute allowedRoles={['patient', 'provider', 'admin', 'pharmacy']}><DashboardLayout><InvoiceDetailsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/notes" element={<ProtectedRoute allowedRoles={['patient', 'provider', 'admin', 'pharmacy']}><DashboardLayout><NotesPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/kanban" element={<ProtectedRoute allowedRoles={['patient', 'provider', 'admin', 'pharmacy']}><DashboardLayout><KanbanPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/file-manager" element={<ProtectedRoute allowedRoles={['patient', 'provider', 'admin', 'pharmacy']}><DashboardLayout><FileManagerPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/social-feed" element={<ProtectedRoute allowedRoles={['patient', 'provider', 'admin', 'pharmacy']}><DashboardLayout><SocialFeedPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="dashboard/search-results" element={<ProtectedRoute allowedRoles={['patient', 'provider', 'admin', 'pharmacy']}><DashboardLayout><SearchResultsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>

              <Route path="*" element={<LanguageRedirect />} />
            </Routes>
          </Suspense>
          </RouteErrorBoundary>
        </LanguageProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
