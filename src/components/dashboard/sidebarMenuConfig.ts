import {
  LayoutDashboard, CalendarDays, Users, Pill, Video, Grid2x2 as Grid,
  CalendarRange, ClipboardList, Settings, User, FileText, Mail, Bell,
  Store, ShieldCheck, HeartPulse, Users as Users2, CreditCard, History,
  CalendarCheck, HelpCircle, TrendingUp, Banknote, ShoppingCart,
  Calendar, Folder, Receipt, ArrowUp, ArrowLeftRight, Undo, Truck, BarChart,
  Globe, Building2, Smartphone, Server, DollarSign, Wrench, FileCode, BookOpen,
  Star, Link as LinkIcon, Network, StickyNote, Share2,
} from 'lucide-react';

export interface MenuItem {
  label: string;
  icon: React.ElementType;
  href?: string;
  submenu?: { label: string; href: string; icon?: React.ElementType }[];
}

export interface MenuSection {
  section: string;
  items: MenuItem[];
}

export const patientMenu: MenuItem[] = [
  { label: 'patient.dashboard', icon: LayoutDashboard, href: '/dashboard/patient/dashboard' },
  { label: 'patient.myProfile', icon: User, href: '/dashboard/patient/profile' },
  {
    label: 'patient.appointments',
    icon: CalendarDays,
    submenu: [
      { label: 'patient.allAppointments', href: '/dashboard/patient/appointments' },
      { label: 'patient.bookAppointment', href: '/dashboard/patient/appointments/book' },
      { label: 'patient.appointmentHistory', href: '/dashboard/patient/appointments/history' },
    ],
  },
  { label: 'patient.medicalRecords', icon: FileText, href: '/dashboard/patient/medical-records' },
  { label: 'patient.videoConsultation', icon: Video, href: '/dashboard/patient/video-consultation' },
  { label: 'patient.prescriptions', icon: ClipboardList, href: '/dashboard/patient/prescriptions' },
  {
    label: 'patient.pharmacy',
    icon: Pill,
    submenu: [
      { label: 'patient.pharmacyMarketplace', href: '/dashboard/patient/pharmacy-marketplace' },
      { label: 'patient.findPharmacy', href: '/dashboard/patient/pharmacy' },
      { label: 'patient.myOrders', href: '/dashboard/patient/pharmacy/orders' },
      { label: 'patient.refillRequests', href: '/dashboard/patient/pharmacy/refills' },
    ],
  },
  { label: 'patient.medications', icon: ClipboardList, href: '/dashboard/patient/medications' },
  { label: 'patient.healthRecords', icon: FileText, href: '/dashboard/patient/health-records' },
  {
    label: 'patient.healthTracking',
    icon: HeartPulse,
    submenu: [
      { label: 'patient.vitalSigns', href: '/dashboard/patient/health-tracking/vital-signs' },
      { label: 'patient.healthGoals', href: '/dashboard/patient/health-tracking/health-goals' },
    ],
  },
  { label: 'patient.familyMembers', icon: Users2, href: '/dashboard/patient/family' },
  { label: 'patient.billingInsurance', icon: CreditCard, href: '/dashboard/patient/billing' },
  { label: 'patient.messages', icon: Mail, href: '/dashboard/patient/messages' },
  { label: 'patient.notifications', icon: Bell, href: '/dashboard/notifications' },
  {
    label: 'patient.settings',
    icon: Settings,
    submenu: [
      { label: 'patient.accountSettings', href: '/dashboard/patient/settings' },
      { label: 'patient.dataConsents', href: '/dashboard/patient/settings?tab=consents' },
    ],
  },
  {
    label: 'patient.helpCenter',
    icon: HelpCircle,
    submenu: [
      { label: 'patient.browseHelp', href: '/dashboard/help' },
      { label: 'patient.faqs', href: '/dashboard/help/faqs' },
      { label: 'patient.supportTickets', href: '/dashboard/help/support' },
      { label: 'patient.liveChat', href: '/dashboard/help/chat' },
    ],
  },
];

export const providerMenu: MenuItem[] = [
  { label: 'provider.dashboard', icon: LayoutDashboard, href: '/dashboard/provider/dashboard' },
  {
    label: 'provider.appointments',
    icon: CalendarDays,
    submenu: [
      { label: 'provider.calendar', href: '/dashboard/provider/appointments' },
      { label: 'provider.patientQueue', href: '/dashboard/provider/appointments/queue' },
      { label: 'provider.appointmentHistory', href: '/dashboard/provider/appointments/history' },
    ],
  },
  { label: 'provider.mySchedule', icon: CalendarRange, href: '/dashboard/provider/schedule' },
  {
    label: 'provider.clinical',
    icon: FileText,
    submenu: [
      { label: 'provider.clinicalDocumentation', href: '/dashboard/provider/clinical-documentation' },
      { label: 'provider.clinicalNotes', href: '/dashboard/provider/clinical-notes' },
      { label: 'provider.patientHealthRecords', href: '/dashboard/provider/patients' },
      { label: 'provider.templates', href: '/dashboard/provider/templates' },
    ],
  },
  { label: 'provider.patientHealthRecords', icon: FileText, href: '/dashboard/provider/patients' },
  {
    label: 'provider.prescriptions',
    icon: ClipboardList,
    submenu: [
      { label: 'provider.writePrescription', href: '/dashboard/provider/prescriptions/create' },
      { label: 'provider.allPrescriptions', href: '/dashboard/provider/prescriptions' },
      { label: 'provider.refillRequests', href: '/dashboard/provider/prescriptions/refills' },
    ],
  },
  {
    label: 'provider.telemedicine',
    icon: Video,
    submenu: [
      { label: 'provider.videoConsultation', href: '/dashboard/provider/telemedicine' },
      { label: 'provider.waitingRoom', href: '/dashboard/provider/telemedicine/waiting-room' },
      { label: 'provider.sessionHistory', href: '/dashboard/provider/telemedicine/history' },
    ],
  },
  {
    label: 'provider.billing',
    icon: CreditCard,
    submenu: [
      { label: 'provider.earnings', href: '/dashboard/provider/billing/earnings' },
      { label: 'provider.gatewaySetup', href: '/dashboard/provider/billing/gateway-setup' },
      { label: 'provider.insuranceClaims', href: '/dashboard/provider/billing/claims' },
      { label: 'provider.transactions', href: '/dashboard/provider/billing/transactions' },
    ],
  },
  {
    label: 'provider.messagesMenu',
    icon: Mail,
    submenu: [
      { label: 'provider.inbox', href: '/dashboard/provider/messaging/inbox' },
      { label: 'provider.messageTemplates', href: '/dashboard/provider/messaging/templates' },
      { label: 'provider.automatedMessages', href: '/dashboard/provider/messaging/automated' },
      { label: 'provider.staffChat', href: '/dashboard/provider/messaging/staff-chat' },
    ],
  },
  { label: 'provider.referrals', icon: Share2, href: '/dashboard/provider/referrals' },
  { label: 'provider.notificationsPreferences', icon: Bell, href: '/dashboard/provider/notifications-preferences' },
  { label: 'provider.helpCenter', icon: HelpCircle, href: '/dashboard/provider/help-center' },
  {
    label: 'provider.profileSettings',
    icon: Settings,
    submenu: [
      { label: 'provider.myProfile', href: '/dashboard/provider/profile' },
      { label: 'provider.clinicLocations', href: '/dashboard/provider/locations' },
      { label: 'provider.affiliations', href: '/dashboard/provider/affiliations' },
      { label: 'provider.credentials', href: '/dashboard/provider/credentials' },
      { label: 'provider.staffManagement', href: '/dashboard/provider/staff' },
    ],
  },
];

export const pharmacyMenu: MenuItem[] = [
  { label: 'pharmacy.dashboard', icon: LayoutDashboard, href: '/dashboard/pharmacy/dashboard' },
  {
    label: 'pharmacy.orders',
    icon: Store,
    submenu: [
      { label: 'pharmacy.allOrders', href: '/dashboard/pharmacy/orders' },
      { label: 'pharmacy.pendingOrders', href: '/dashboard/pharmacy/orders/pending' },
      { label: 'pharmacy.orderHistory', href: '/dashboard/pharmacy/orders/history' },
    ],
  },
  {
    label: 'pharmacy.prescriptions',
    icon: ClipboardList,
    submenu: [
      { label: 'pharmacy.allPrescriptions', href: '/dashboard/pharmacy/prescriptions' },
      { label: 'pharmacy.pendingVerification', href: '/dashboard/pharmacy/prescriptions/pending' },
      { label: 'pharmacy.refillRequests', href: '/dashboard/pharmacy/prescriptions/refills' },
    ],
  },
  {
    label: 'pharmacy.inventory',
    icon: Pill,
    submenu: [
      { label: 'pharmacy.allProducts', href: '/dashboard/pharmacy/inventory' },
      { label: 'pharmacy.lowStock', href: '/dashboard/pharmacy/inventory/low-stock' },
      { label: 'pharmacy.addProduct', href: '/dashboard/pharmacy/inventory/add' },
    ],
  },
  { label: 'pharmacy.customers', icon: Users, href: '/dashboard/pharmacy/customers' },
  {
    label: 'pharmacy.profileSettings',
    icon: Settings,
    submenu: [
      { label: 'pharmacy.pharmacyProfile', href: '/dashboard/pharmacy/profile' },
      { label: 'pharmacy.businessHours', href: '/dashboard/pharmacy/hours' },
      { label: 'pharmacy.staffManagement', href: '/dashboard/pharmacy/staff' },
    ],
  },
  { label: 'pharmacy.messages', icon: Mail, href: '/dashboard/pharmacy/messages' },
  { label: 'pharmacy.notifications', icon: Bell, href: '/dashboard/pharmacy/notifications' },
];

export const clinicMenu: MenuItem[] = [
  { label: 'clinic.dashboard', icon: LayoutDashboard, href: '/dashboard/clinic/dashboard' },
  { label: 'clinic.clinicProfile', icon: Building2, href: '/dashboard/clinic/profile' },
  { label: 'clinic.providers', icon: Users, href: '/dashboard/clinic/providers' },
  {
    label: 'clinic.appointments',
    icon: CalendarDays,
    submenu: [
      { label: 'clinic.allAppointments', href: '/dashboard/clinic/appointments' },
      { label: 'clinic.setAvailability', href: '/dashboard/clinic/appointments/availability' },
    ],
  },
  { label: 'clinic.services', icon: HeartPulse, href: '/dashboard/clinic/services' },
  { label: 'clinic.specializations', icon: FileText, href: '/dashboard/clinic/specializations' },
  {
    label: 'clinic.patients',
    icon: Users2,
    submenu: [
      { label: 'clinic.patientList', href: '/dashboard/clinic/patients' },
    ],
  },
  { label: 'clinic.staff', icon: ShieldCheck, href: '/dashboard/clinic/staff' },
  { label: 'clinic.schedule', icon: CalendarRange, href: '/dashboard/clinic/schedule' },
  { label: 'clinic.affiliations', icon: LinkIcon, href: '/dashboard/clinic/affiliations' },
  { label: 'clinic.billing', icon: CreditCard, href: '/dashboard/clinic/billing' },
  { label: 'clinic.settings', icon: Settings, href: '/dashboard/clinic/settings' },
  { label: 'clinic.messages', icon: Mail, href: '/dashboard/clinic/messages' },
  { label: 'clinic.notifications', icon: Bell, href: '/dashboard/clinic/notifications' },
];

export const adminMenu: MenuSection[] = [
  {
    section: 'admin.sections.mainMenu',
    items: [
      {
        label: 'admin.dashboard',
        icon: LayoutDashboard,
        submenu: [
          { label: 'admin.analytics', href: '/dashboard/admin/dashboard/analytics', icon: TrendingUp },
          { label: 'admin.finance', href: '/dashboard/admin/dashboard/finance', icon: Banknote },
          { label: 'admin.sales', href: '/dashboard/admin/dashboard/sales', icon: ShoppingCart },
        ],
      },
      {
        label: 'admin.applications',
        icon: Grid,
        submenu: [
          { label: 'admin.chat', href: '/dashboard/chat' },
          { label: 'admin.calls', href: '/dashboard/calls' },
          { label: 'admin.calendarApp', href: '/dashboard/calendar' },
          { label: 'admin.contacts', href: '/dashboard/contacts' },
          { label: 'admin.emailApp', href: '/dashboard/email' },
          { label: 'admin.invoicesApp', href: '/dashboard/invoices' },
          { label: 'admin.notesApp', href: '/dashboard/notes' },
          { label: 'admin.kanbanBoard', href: '/dashboard/kanban' },
          { label: 'admin.fileManager', href: '/dashboard/file-manager' },
          { label: 'admin.socialFeed', href: '/dashboard/social-feed' },
          { label: 'admin.searchResults', href: '/dashboard/search-results' },
        ],
      },
    ],
  },
  {
    section: 'admin.sections.general',
    items: [
      { label: 'admin.userManagement', icon: ShieldCheck, href: '/dashboard/admin/users' },
      { label: 'admin.systemActivity', icon: History, href: '/dashboard/admin/activity' },
    ],
  },
  {
    section: 'admin.sections.clinicManagement',
    items: [
      {
        label: 'admin.clinics',
        icon: Building2,
        submenu: [
          { label: 'admin.manageClinics', href: '/dashboard/admin/clinic/clinics' },
          { label: 'admin.clinicApplications', href: '/dashboard/admin/clinic/clinic-applications' },
        ],
      },
      {
        label: 'admin.providers',
        icon: Users,
        submenu: [
          { label: 'admin.manageProviders', href: '/dashboard/admin/clinic/providers' },
          { label: 'admin.providerApplications', href: '/dashboard/admin/provider-applications' },
        ],
      },
      { label: 'admin.patients', icon: User, href: '/dashboard/admin/clinic/patients' },
      {
        label: 'admin.pharmacies',
        icon: Pill,
        submenu: [
          { label: 'admin.managePharmacies', href: '/dashboard/admin/clinic/pharmacies' },
          { label: 'admin.pendingApproval', href: '/dashboard/admin/pharmacies' },
        ],
      },
      { label: 'admin.appointmentsMenu', icon: CalendarCheck, href: '/dashboard/admin/clinic/appointments' },
      { label: 'admin.locations', icon: Store, href: '/dashboard/admin/clinic/locations' },
      { label: 'admin.servicesMenu', icon: HeartPulse, href: '/dashboard/admin/clinic/services' },
      { label: 'admin.specializationsMenu', icon: ShieldCheck, href: '/dashboard/admin/clinic/specializations' },
      { label: 'admin.insuranceProviders', icon: ShieldCheck, href: '/dashboard/admin/clinic/insurance-providers' },
      { label: 'admin.assets', icon: Folder, href: '/dashboard/admin/clinic/assets' },
      { label: 'admin.procedures', icon: HeartPulse, href: '/dashboard/admin/clinic/procedures' },
      { label: 'admin.products', icon: Pill, href: '/dashboard/admin/clinic/products' },
      { label: 'admin.customManagement', icon: Settings, href: '/dashboard/admin/clinic/custom-management' },
      { label: 'admin.clinicalTemplates', icon: FileText, href: '/dashboard/admin/clinical-templates' },
    ],
  },
  {
    section: 'admin.sections.hrm',
    items: [
      { label: 'admin.hrmDashboard', icon: LayoutDashboard, href: '/dashboard/admin/hrm/dashboard' },
      { label: 'admin.staffManagement', icon: Users2, href: '/dashboard/admin/staff' },
      { label: 'admin.departments', icon: Store, href: '/dashboard/admin/hrm/departments' },
      { label: 'admin.attendance', icon: CalendarCheck, href: '/dashboard/admin/hrm/attendance' },
      { label: 'admin.leaveManagement', icon: Calendar, href: '/dashboard/admin/hrm/leaves' },
      { label: 'admin.payroll', icon: Banknote, href: '/dashboard/admin/hrm/payroll' },
      { label: 'admin.reports', icon: TrendingUp, href: '/dashboard/admin/hrm/reports' },
    ],
  },
  {
    section: 'admin.sections.financeAccounts',
    items: [
      { label: 'admin.expenses', icon: Receipt, href: '/dashboard/admin/finance/expenses' },
      { label: 'admin.income', icon: ArrowUp, href: '/dashboard/admin/finance/income' },
      {
        label: 'admin.invoicesFinance',
        icon: FileText,
        submenu: [
          { label: 'admin.allInvoices', href: '/dashboard/admin/finance/invoices' },
          { label: 'admin.invoiceDetails', href: '/dashboard/admin/finance/invoices/details' },
        ],
      },
      { label: 'admin.payments', icon: CreditCard, href: '/dashboard/admin/finance/payments' },
      { label: 'admin.transactions', icon: ArrowLeftRight, href: '/dashboard/admin/finance/transactions' },
      { label: 'admin.billingConfiguration', icon: Settings, href: '/dashboard/admin/finance/billing-config' },
      { label: 'admin.refunds', icon: Undo, href: '/dashboard/admin/finance/refunds' },
      { label: 'admin.financialReports', icon: TrendingUp, href: '/dashboard/admin/finance/reports' },
      { label: 'admin.deliveryCosts', icon: Truck, href: '/dashboard/admin/finance/delivery-costs' },
      { label: 'admin.settlements', icon: DollarSign, href: '/dashboard/admin/finance/settlements' },
      { label: 'admin.subscriptions', icon: CreditCard, href: '/dashboard/admin/finance/subscriptions' },
    ],
  },
  {
    section: 'admin.sections.reportsAnalytics',
    items: [
      {
        label: 'admin.reportsAnalyticsMenu',
        icon: BarChart,
        submenu: [
          { label: 'admin.allReports', href: '/dashboard/admin/reports' },
          { label: 'admin.incomeReport', href: '/dashboard/admin/reports/income' },
          { label: 'admin.expensesReport', href: '/dashboard/admin/reports/expenses' },
          { label: 'admin.profitLoss', href: '/dashboard/admin/reports/profit-loss' },
          { label: 'admin.appointmentsReport', href: '/dashboard/admin/reports/appointments' },
          { label: 'admin.patientsReport', href: '/dashboard/admin/reports/patients' },
          { label: 'admin.customReportBuilder', href: '/dashboard/admin/reports/custom' },
        ],
      },
    ],
  },
  {
    section: 'admin.sections.interoperability',
    items: [
      { label: 'admin.fhirEndpoints', icon: LinkIcon, href: '/dashboard/admin/interoperability/fhir-endpoints' },
      { label: 'admin.auditTrail', icon: ShieldCheck, href: '/dashboard/admin/interoperability/audit-trail' },
      { label: 'admin.provincialEhr', icon: Network, href: '/dashboard/admin/interoperability/provincial-ehr' },
    ],
  },
  {
    section: 'admin.sections.administration',
    items: [
      { label: 'admin.permissionsRoles', icon: ShieldCheck, href: '/dashboard/admin/permissions' },
      { label: 'admin.messages', icon: Mail, href: '/dashboard/admin/messages' },
      { label: 'admin.notifications', icon: Bell, href: '/dashboard/admin/notifications' },
    ],
  },
  {
    section: 'admin.sections.settings',
    items: [
      { label: 'admin.websiteSettings', icon: Globe, href: '/dashboard/admin/settings/website' },
      { label: 'admin.clinicSettings', icon: Building2, href: '/dashboard/admin/settings/clinic' },
      { label: 'admin.appSettings', icon: Smartphone, href: '/dashboard/admin/settings/app' },
      { label: 'admin.systemSettings', icon: Server, href: '/dashboard/admin/settings/system' },
      { label: 'admin.financeSettings', icon: DollarSign, href: '/dashboard/admin/settings/finance' },
      { label: 'admin.accountSettings', icon: User, href: '/dashboard/admin/settings/account' },
      { label: 'admin.otherSettings', icon: Wrench, href: '/dashboard/admin/settings/other' },
    ],
  },
  {
    section: 'admin.sections.contentManagement',
    items: [
      { label: 'admin.pages', icon: FileCode, href: '/dashboard/admin/content/pages' },
      { label: 'admin.blogs', icon: BookOpen, href: '/dashboard/admin/content/blogs' },
      { label: 'admin.categories', icon: Folder, href: '/dashboard/admin/content/categories' },
      { label: 'admin.tags', icon: StickyNote, href: '/dashboard/admin/content/tags' },
      { label: 'admin.mediaLibrary', icon: Folder, href: '/dashboard/admin/content/media' },
      { label: 'admin.cmsLocations', icon: Store, href: '/dashboard/admin/content/locations' },
      { label: 'admin.testimonials', icon: Star, href: '/dashboard/admin/content/testimonials' },
      { label: 'admin.cmsFaqs', icon: HelpCircle, href: '/dashboard/admin/content/faqs' },
    ],
  },
];
