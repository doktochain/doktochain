import { useState } from 'react';
import { toast } from 'sonner';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { helpCenterService } from '../../../../services/helpCenterService';
import { HelpCircle, BookOpen, Video, LifeBuoy, Mail, Phone, Search, ChevronDown, ChevronRight, Download, ExternalLink, MessageSquare, FileText, Headphones, MessageSquarePlus, Bug } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

interface GuideItem {
  title: string;
  description: string;
  duration: string;
  type: 'video' | 'article' | 'pdf';
  url: string;
}

export default function ProviderHelpCenter() {
  const { currentColors } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'faq' | 'guides' | 'support' | 'contact'>('faq');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [contactForm, setContactForm] = useState({ subject: '', category: 'Technical Support', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !contactForm.subject.trim() || !contactForm.message.trim()) return;

    setSubmitting(true);
    try {
      await helpCenterService.createSupportTicket({
        user_id: user.id,
        subject: contactForm.subject,
        description: contactForm.message,
        category: contactForm.category,
        priority: 'medium',
        status: 'open',
      });
      setSubmitted(true);
      setContactForm({ subject: '', category: 'Technical Support', message: '' });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast.error('Failed to submit support request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const faqs: FAQItem[] = [
    {
      category: 'getting-started',
      question: 'How do I complete provider onboarding?',
      answer: 'After signing up, complete the onboarding wizard: (1) Professional Info — provider type, specialty, title, years of experience; (2) License & Credentials — licence number, issuing province, expiry date, and upload your licence certificate and board certification; (3) Practice Details — practice name, address, languages, bio; (4) Review & Submit. Applications are reviewed by our admin team and you will be notified when approved.',
    },
    {
      category: 'getting-started',
      question: 'Where do I complete my profile after onboarding?',
      answer: 'Go to Profile & Settings → My Profile. The Bio, Specialties, Procedures, Languages, Fees, and Availability & Schedule tabs are all managed here. Your professional photo uploaded here also appears in the top-right avatar menu across the app.',
    },
    {
      category: 'getting-started',
      question: 'How long does verification take?',
      answer: 'Most applications are reviewed within 1–3 business days. You can check the current status on your dashboard and you will receive an in-app notification and email when the decision is made. If additional information is requested, you will see a "Resubmission Required" banner with instructions.',
    },
    {
      category: 'getting-started',
      question: 'Why don\'t I see my uploaded licence documents in Credentials & Certifications?',
      answer: 'Documents uploaded during onboarding are displayed in Profile & Settings → Credentials with a "From onboarding" badge. They cannot be deleted from there because they are part of your verification record. You can still add additional credentials (board certifications, malpractice insurance, etc.) using the Add Credential button.',
    },

    {
      category: 'appointments',
      question: 'How do I set my weekly availability?',
      answer: 'Two places keep the same data in sync: (a) the top-level Schedule menu, or (b) Profile & Settings → Availability & Schedule. Pick a location, then use the Weekly Schedule tab to add time blocks per weekday and the Time Off tab to add date-specific unavailability.',
    },
    {
      category: 'appointments',
      question: 'Why can\'t I add availability?',
      answer: 'You must first create at least one practice location under Profile & Settings → Clinic Locations. Schedules and time slots are always tied to a location so patients know where to show up (or that the visit is virtual).',
    },
    {
      category: 'appointments',
      question: 'How do I handle appointment cancellations?',
      answer: 'Open the appointment in the calendar or Appointments list, click the action menu, and choose "Cancel Appointment." Provide a reason; the patient is notified automatically. Cancellations are logged for audit purposes.',
    },
    {
      category: 'appointments',
      question: 'What are time slots vs. time blocks?',
      answer: 'Time blocks are the weekly recurring availability windows you set (e.g., every Tuesday 9am–noon). Time slots are the specific bookable slots generated from those blocks based on your default appointment duration. Patients book individual slots; you can also block off individual slots without changing the weekly template.',
    },

    {
      category: 'telemedicine',
      question: 'What equipment do I need for video consultations?',
      answer: 'A computer, tablet, or recent smartphone with a camera, microphone, and a stable internet connection (≥ 3 Mbps up/down is recommended). Chrome, Edge, Safari, and Firefox are supported; the latest two major versions work best. No plug-ins or extra software required.',
    },
    {
      category: 'telemedicine',
      question: 'How do I admit a patient from the Waiting Room?',
      answer: 'Go to Telemedicine → Waiting Room. Patients checked in for their scheduled visit appear as cards — click "Admit" to enter the consultation room. Admission is blocked until within the appointment window unless you manually allow early entry.',
    },
    {
      category: 'telemedicine',
      question: 'Which tools are available inside the consultation?',
      answer: 'Once in the consultation you have: camera/mic toggle, screen share, full-screen, recording (with patient consent), chat, file attach & download, video quality selector (Auto/HD/SD/Audio-only), connection-quality indicator, and End Call. All actions are logged to the session audit trail.',
    },
    {
      category: 'telemedicine',
      question: 'Can I record video consultations?',
      answer: 'Yes, but only after obtaining explicit patient consent. The platform displays a consent prompt before recording starts and both parties see a red "Recording" indicator for the duration. Recordings are encrypted at rest and retained per your clinic\'s retention policy.',
    },
    {
      category: 'telemedicine',
      question: 'How do I share a file or image during a call?',
      answer: 'Inside the consultation, open the side panel and switch to the Files tab. Click "Attach" to upload; the file is encrypted, stored against that session only, and made available to the patient for download during and after the call.',
    },

    {
      category: 'prescriptions',
      question: 'How do I write an e-prescription?',
      answer: 'Open the patient record and go to Prescriptions → New. Search the drug formulary, pick the product, select strength, dosage, quantity, and refills, and enter sig instructions. The system flags drug–drug interactions and allergies from the patient\'s chart before you sign and send.',
    },
    {
      category: 'prescriptions',
      question: 'How do patients choose a pharmacy?',
      answer: 'Patients can set a preferred pharmacy in their profile, or pick one at prescription time. Prescriptions are transmitted electronically to pharmacies on the platform; for external pharmacies a secure PDF/fax fallback is used.',
    },
    {
      category: 'prescriptions',
      question: 'How do I handle refill requests?',
      answer: 'Refill requests appear in Prescriptions → Refills and in your notifications. Review adherence, last dispense date, and any chart notes, then Approve, Deny, or Modify. The patient and pharmacy are notified automatically with your decision.',
    },

    {
      category: 'billing',
      question: 'How do I set my consultation fees?',
      answer: 'Go to Profile & Settings → My Profile → Fees. Set your consultation fee (CAD) and follow-up fee; these are shown to patients during booking. Clinics you are affiliated with may override pricing for services rendered at their location.',
    },
    {
      category: 'billing',
      question: 'How do I submit provincial billing claims?',
      answer: 'After an appointment, open Billing → Claims → New. Pick the service (mapped to the relevant provincial code set — OHIP, MSP, RAMQ, Alberta Health, etc.), add diagnosis codes (ICD-10-CA), and submit. Status updates appear in the Claims dashboard.',
    },
    {
      category: 'billing',
      question: 'When do I get paid?',
      answer: 'Patient-paid invoices settle to your connected Stripe account within 2–3 business days (minus platform fees). Provincial insurance claims pay on the provincial payment cycle (typically 2–6 weeks). You can view all payouts under Billing → Payouts.',
    },

    {
      category: 'clinical',
      question: 'How do I access patient medical records?',
      answer: 'Click a patient name in Appointments, Waiting Room, or Patients to open their chart: demographics, problem list, allergies, medications, immunizations, prior notes, lab results, and uploaded documents. All reads are logged to the blockchain audit trail.',
    },
    {
      category: 'clinical',
      question: 'Can I create SOAP notes?',
      answer: 'Yes. Inside a consultation or after the visit, choose Clinical Notes → SOAP. You get structured Subjective/Objective/Assessment/Plan fields, templates per specialty, and optional AI-assisted drafting based on the session transcript (if recording/transcription is enabled and consented).',
    },
    {
      category: 'clinical',
      question: 'How do I place a referral?',
      answer: 'Open the patient chart and go to the Referrals tab, or use the Referrals menu. Choose the specialty or search for a specific provider/clinic, attach relevant chart notes, and send. The referral target is notified and can accept/decline; you\'ll see status updates in your Referrals list.',
    },

    {
      category: 'messaging',
      question: 'How do I message patients?',
      answer: 'Go to Messages → Inbox. Pick an existing conversation or click "New Message" and search a patient. Messages are encrypted end-to-end; you can attach files, images, or lab results. Patients receive an email/in-app notification of new messages.',
    },
    {
      category: 'messaging',
      question: 'Can staff and I chat internally?',
      answer: 'Yes. Clinic staff channels live under Messages → Staff Chat. Channels are scoped to your clinic, and conversations are retained according to your clinic retention policy. External (patient-facing) and internal (staff) messages are separate by design.',
    },
    {
      category: 'messaging',
      question: 'How do I manage notification preferences?',
      answer: 'Profile & Settings → Notifications & Preferences lets you toggle email, in-app, and SMS notifications per category (appointments, messages, billing, system). Critical security alerts cannot be disabled.',
    },

    {
      category: 'clinic',
      question: 'How do I request an affiliation with a clinic?',
      answer: 'Go to Profile & Settings → Clinic Affiliations → Request Affiliation. Search the clinic by name or city, pick your role (consultant, attending, visiting specialist, locum), and send. The clinic admin approves or declines; you\'ll see the status in the Pending tab.',
    },
    {
      category: 'clinic',
      question: 'What happens when a clinic approves my affiliation?',
      answer: 'The affiliation appears under the Active tab. Patients of that clinic can now book you at that location, and the clinic\'s schedule templates become available when you set up availability. Revenue sharing follows the clinic\'s billing model.',
    },

    {
      category: 'security',
      question: 'How is my patients\' data protected?',
      answer: 'All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Access is governed by row-level security and every read/write is logged on an append-only audit trail (including a tamper-evident blockchain log for PHI access). The platform is designed to align with PHIPA, PIPEDA and provincial privacy legislation in Canada and with HIPAA for cross-border workflows.',
    },
    {
      category: 'security',
      question: 'How do I enable two-factor authentication?',
      answer: 'Go to Profile & Settings → Security → Enable 2FA. Scan the QR code with Google Authenticator, Authy, 1Password, or any TOTP app, enter the 6-digit code to confirm, and save the backup codes in a safe place. You can also register a trusted device to skip 2FA on that browser.',
    },
    {
      category: 'security',
      question: 'How do I review my session and access history?',
      answer: 'Profile & Settings → Security → Activity Log shows recent logins, trusted devices, and access events. If you see anything you don\'t recognise, sign out all sessions and rotate your password immediately, then contact support.',
    },
  ];

  const guides: GuideItem[] = [
    {
      title: 'Getting Started with DoktoChain',
      description: 'Walkthrough of onboarding, completing your profile, and getting verified',
      duration: '10 min read',
      type: 'article',
      url: '/dashboard/provider/my-profile',
    },
    {
      title: 'Managing Your Schedule',
      description: 'Set weekly availability, block time slots, and add time-off — synced with the main Schedule menu',
      duration: '8 min read',
      type: 'article',
      url: '/dashboard/provider/availability',
    },
    {
      title: 'Clinic Locations & Affiliations',
      description: 'Add practice locations and request affiliation with clinics so patients can find and book you',
      duration: '6 min read',
      type: 'article',
      url: '/dashboard/provider/affiliations',
    },
    {
      title: 'Conducting Video Consultations',
      description: 'Admitting from the waiting room, using the consultation toolbar, and session best practices',
      duration: '12 min read',
      type: 'article',
      url: '/dashboard/provider/telemedicine/waiting-room',
    },
    {
      title: 'E-Prescribing Guide',
      description: 'Writing prescriptions, checking interactions, and managing refill requests',
      duration: '10 min read',
      type: 'article',
      url: '/dashboard/provider/prescriptions',
    },
    {
      title: 'Clinical Documentation (SOAP)',
      description: 'Using SOAP templates, AI-assisted drafting, and maintaining proper documentation',
      duration: '15 min read',
      type: 'article',
      url: '/dashboard/provider/appointments',
    },
    {
      title: 'Billing & Claims in Canada',
      description: 'Provincial billing (OHIP, MSP, RAMQ, AHS), ICD-10-CA coding, and payout cycles',
      duration: '18 min read',
      type: 'article',
      url: '/dashboard/provider/billing',
    },
    {
      title: 'Credentials & Verification',
      description: 'How onboarding documents appear in Credentials and how to add more (board, malpractice, CME)',
      duration: '5 min read',
      type: 'article',
      url: '/dashboard/provider/credentials',
    },
    {
      title: 'Privacy & Security Checklist',
      description: 'Enable 2FA, review your activity log, and align your practice with PHIPA/PIPEDA and HIPAA',
      duration: '7 min read',
      type: 'pdf',
      url: '/dashboard/provider/settings',
    },
    {
      title: 'Patient Communication Tools',
      description: 'Secure messaging, automated reminders, referrals, and notification preferences',
      duration: '9 min read',
      type: 'article',
      url: '/dashboard/provider/messages',
    },
  ];

  const categories = [
    { id: 'all', label: 'All Topics', count: faqs.length },
    { id: 'getting-started', label: 'Getting Started', count: faqs.filter(f => f.category === 'getting-started').length },
    { id: 'appointments', label: 'Appointments', count: faqs.filter(f => f.category === 'appointments').length },
    { id: 'telemedicine', label: 'Telemedicine', count: faqs.filter(f => f.category === 'telemedicine').length },
    { id: 'prescriptions', label: 'Prescriptions', count: faqs.filter(f => f.category === 'prescriptions').length },
    { id: 'billing', label: 'Billing', count: faqs.filter(f => f.category === 'billing').length },
    { id: 'clinical', label: 'Clinical', count: faqs.filter(f => f.category === 'clinical').length },
    { id: 'messaging', label: 'Messaging', count: faqs.filter(f => f.category === 'messaging').length },
    { id: 'clinic', label: 'Clinic & Affiliations', count: faqs.filter(f => f.category === 'clinic').length },
    { id: 'security', label: 'Security & Privacy', count: faqs.filter(f => f.category === 'security').length },
  ];

  const filteredFAQs = faqs.filter((faq) => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="text-lg" />;
      case 'article':
        return <FileText className="text-lg" />;
      case 'pdf':
        return <Download className="text-lg" />;
      default:
        return <BookOpen className="text-lg" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full" style={{ backgroundColor: currentColors.primaryLight }}>
            <HelpCircle className="text-4xl" style={{ color: currentColors.primary }} />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">Help Center</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Find answers, tutorials, and support resources
        </p>

        {/* Search Bar */}
        <div className="mt-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help..."
              className="w-full pl-12 pr-4 py-4 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-current transition-colors"
              style={{ borderColor: searchQuery ? currentColors.primary : undefined }}
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
        <button
          type="button"
          onClick={() => { setActiveTab('support'); }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-blue-100">
              <Headphones className="text-2xl text-blue-600" />
            </div>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Live Chat</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Chat with support</p>
        </button>

        <a
          href="mailto:support@doktochain.com"
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center hover:shadow-lg transition-shadow cursor-pointer block"
        >
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-green-100">
              <Mail className="text-2xl text-green-600" />
            </div>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Email Support</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">support@doktochain.com</p>
        </a>

        <button
          type="button"
          onClick={() => { setContactForm({ subject: 'Feedback: ', category: 'Feature Request', message: '' }); setActiveTab('contact'); }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-blue-100">
              <MessageSquarePlus className="text-2xl text-blue-600" />
            </div>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Send Feedback</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Share your ideas</p>
        </button>

        <button
          type="button"
          onClick={() => { setContactForm({ subject: 'Bug report: ', category: 'Bug Report', message: '' }); setActiveTab('contact'); }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-red-100">
              <Bug className="text-2xl text-red-600" />
            </div>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Report Bug</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Report an issue</p>
        </button>
      </div>

      {/* Main Content Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-8 px-6">
            {[
              { key: 'faq', label: 'FAQs', icon: HelpCircle },
              { key: 'guides', label: 'Guides & Tutorials', icon: BookOpen },
              { key: 'support', label: 'Support Options', icon: LifeBuoy },
              { key: 'contact', label: 'Contact Us', icon: Phone },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.key
                      ? 'border-current text-current'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                  style={activeTab === tab.key ? { color: currentColors.primary, borderColor: currentColors.primary } : {}}
                >
                  <div className="flex items-center gap-2">
                    <Icon />
                    <span>{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Categories Sidebar */}
              <div className="lg:col-span-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Categories</h3>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        selectedCategory === cat.id
                          ? 'text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      style={selectedCategory === cat.id ? { backgroundColor: currentColors.primary } : {}}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{cat.label}</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-white/20">{cat.count}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* FAQ List */}
              <div className="lg:col-span-3">
                <div className="space-y-3">
                  {filteredFAQs.length === 0 ? (
                    <div className="text-center py-12">
                      <Search className="text-6xl text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No FAQs found matching your search</p>
                    </div>
                  ) : (
                    filteredFAQs.map((faq, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <span className="font-medium text-left text-gray-900 dark:text-white">{faq.question}</span>
                          {expandedFAQ === index ? (
                            <ChevronDown className="text-gray-400 flex-shrink-0 ml-4" />
                          ) : (
                            <ChevronRight className="text-gray-400 flex-shrink-0 ml-4" />
                          )}
                        </button>
                        {expandedFAQ === index && (
                          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-gray-600 dark:text-gray-400">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Guides Tab */}
        {activeTab === 'guides' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {guides.map((guide, index) => (
                <a
                  key={index}
                  href={guide.url}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer block"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: currentColors.primaryLight }}>
                      {getTypeIcon(guide.type)}
                    </div>
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400">
                      {guide.duration}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{guide.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{guide.description}</p>
                  <div className="flex items-center gap-2 text-sm font-medium" style={{ color: currentColors.primary }}>
                    <span>Open guide</span>
                    <ExternalLink className="text-xs" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Support Options Tab */}
        {activeTab === 'support' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 rounded-full bg-blue-100">
                      <Headphones className="text-3xl text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Live Chat Support</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Chat with a support specialist during business hours
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">Mon–Fri, 8AM–8PM ET · Sat 9AM–5PM ET</p>
                  <button
                    onClick={() => setActiveTab('contact')}
                    className="px-6 py-3 rounded-lg text-white font-medium transition-colors"
                    style={{ backgroundColor: currentColors.primary }}
                  >
                    Start Chat
                  </button>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 rounded-full bg-green-100">
                      <Phone className="text-3xl text-green-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Phone Support</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Speak directly with a support specialist
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">Mon–Fri, 9AM–6PM ET</p>
                  <a
                    href="tel:+18553658242"
                    className="px-6 py-3 rounded-lg text-white font-medium inline-block transition-colors"
                    style={{ backgroundColor: currentColors.primary }}
                  >
                    1-855-DOKTO-4-U
                  </a>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-full bg-blue-100">
                    <Mail className="text-2xl text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Email Support</h3>
                    <p className="text-gray-600 dark:text-gray-400">We typically respond within 24 hours</p>
                  </div>
                </div>
                <a
                  href="mailto:support@doktochain.com"
                  className="text-lg font-medium"
                  style={{ color: currentColors.primary }}
                >
                  support@doktochain.com
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-8 mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Send us a message</h3>

                {submitted && (
                  <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-green-800 dark:text-green-300 font-medium">
                      Your support request has been submitted successfully. Our team will get back to you shortly.
                    </p>
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleContactSubmit}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                      placeholder="Briefly describe your issue"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={contactForm.category}
                      onChange={(e) => setContactForm({ ...contactForm, category: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>Technical Support</option>
                      <option>Billing Question</option>
                      <option>Account Issue</option>
                      <option>Feature Request</option>
                      <option>Bug Report</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Message
                    </label>
                    <textarea
                      rows={6}
                      required
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder="Describe your issue in detail..."
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-6 py-3 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
                    style={{ backgroundColor: currentColors.primary }}
                  >
                    {submitting ? 'Submitting...' : 'Send Message'}
                  </button>
                </form>
              </div>

              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  For urgent, after-hours clinical/technical issues, please call the on-call line:
                </p>
                <a
                  href="tel:+18553658242"
                  className="text-lg font-semibold"
                  style={{ color: currentColors.primary }}
                >
                  1-855-DOKTO-4-U
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
