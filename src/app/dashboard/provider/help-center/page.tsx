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
      question: 'How do I complete my provider profile?',
      answer: 'Navigate to your Profile page from the sidebar. Complete all required fields including your credentials, specializations, education, and practice locations. Upload your professional photo and license documents. Once complete, submit for verification.',
    },
    {
      category: 'getting-started',
      question: 'How long does profile verification take?',
      answer: 'Profile verification typically takes 24-48 hours. Our team reviews your credentials, license information, and professional details. You will receive a notification once your profile is approved.',
    },
    {
      category: 'appointments',
      question: 'How do I manage my availability?',
      answer: 'Go to Schedule > Availability Manager. Set your working hours for each day of the week, add breaks, and mark holidays. You can also set custom availability for specific dates. Changes take effect immediately.',
    },
    {
      category: 'appointments',
      question: 'Can I block specific time slots?',
      answer: 'Yes! In the Availability Manager, you can block individual time slots for personal appointments, meetings, or breaks. Blocked slots will not be available for patient bookings.',
    },
    {
      category: 'appointments',
      question: 'How do I handle appointment cancellations?',
      answer: 'View the appointment in your calendar, click the three-dot menu, and select "Cancel Appointment." Enter a reason and choose whether to notify the patient. You can also configure your cancellation policy in Settings.',
    },
    {
      category: 'telemedicine',
      question: 'What equipment do I need for video consultations?',
      answer: 'You need a computer or tablet with a webcam, microphone, and stable internet connection (minimum 5 Mbps). We recommend using Chrome or Firefox browsers for the best experience. Test your setup using the Video Test tool in Settings.',
    },
    {
      category: 'telemedicine',
      question: 'How do I join a video consultation?',
      answer: 'When it\'s time for your appointment, go to Appointments > Queue or click the notification. Click "Start Consultation" to enter the virtual waiting room. The patient will join automatically when ready.',
    },
    {
      category: 'telemedicine',
      question: 'Can I record video consultations?',
      answer: 'Recording video consultations requires explicit patient consent and must comply with local regulations. Enable recording in Settings > Telemedicine, and always inform patients when recording is active.',
    },
    {
      category: 'prescriptions',
      question: 'How do I write an e-prescription?',
      answer: 'Go to Prescriptions > Write New. Search for the medication, select strength and dosage form, enter instructions, and specify quantity and refills. Review drug interactions and allergies before sending to the patient\'s preferred pharmacy.',
    },
    {
      category: 'prescriptions',
      question: 'How do I handle refill requests?',
      answer: 'Refill requests appear in Prescriptions > Refills. Review the patient\'s medication history and any notes. You can approve, deny, or modify the refill. The patient and pharmacy are notified automatically.',
    },
    {
      category: 'billing',
      question: 'How do I submit insurance claims?',
      answer: 'After each appointment, go to Billing > Claims and click "Create Claim." Enter diagnosis codes (ICD-10), procedure codes (CPT), and service details. Review and submit to the insurance provider. Track status in the Claims dashboard.',
    },
    {
      category: 'billing',
      question: 'When do I receive payments?',
      answer: 'Payments are processed according to your payout schedule (weekly or bi-weekly). Insurance reimbursements typically arrive 7-14 days after claim approval. Patient payments are deposited within 2-3 business days.',
    },
    {
      category: 'clinical',
      question: 'How do I access patient medical records?',
      answer: 'Click on any patient name to view their complete medical history, including previous visits, diagnoses, medications, allergies, lab results, and uploaded documents. All access is logged for HIPAA compliance.',
    },
    {
      category: 'clinical',
      question: 'Can I create SOAP notes?',
      answer: 'Yes! During or after a consultation, click "Clinical Notes" and select SOAP Note template. The system provides structured fields for Subjective, Objective, Assessment, and Plan. You can also use voice dictation.',
    },
    {
      category: 'messaging',
      question: 'How do I message patients?',
      answer: 'Go to Messages > Inbox and select a patient or click "New Message." All messages are HIPAA-compliant and encrypted. You can attach files, images, or lab results. Patients receive email notifications of new messages.',
    },
    {
      category: 'security',
      question: 'Is the platform HIPAA compliant?',
      answer: 'Yes, DoktoChain is fully HIPAA compliant. All data is encrypted in transit and at rest. We conduct regular security audits, maintain BAAs with all providers, and log all access to PHI.',
    },
    {
      category: 'security',
      question: 'How do I enable two-factor authentication?',
      answer: 'Go to Settings > Security and click "Enable 2FA." Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.) and enter the verification code. Store your backup codes securely.',
    },
  ];

  const guides: GuideItem[] = [
    {
      title: 'Getting Started with DoktoChain',
      description: 'Complete guide to setting up your provider account and completing your profile',
      duration: '15 min',
      type: 'video',
      url: '#',
    },
    {
      title: 'Managing Your Schedule',
      description: 'Learn how to set availability, block time slots, and manage appointments efficiently',
      duration: '10 min',
      type: 'video',
      url: '#',
    },
    {
      title: 'Conducting Video Consultations',
      description: 'Best practices for telemedicine appointments, including technical setup and patient interaction',
      duration: '20 min',
      type: 'video',
      url: '#',
    },
    {
      title: 'E-Prescribing Guide',
      description: 'Step-by-step instructions for writing prescriptions, checking interactions, and managing refills',
      duration: '12 min',
      type: 'article',
      url: '#',
    },
    {
      title: 'Clinical Documentation Best Practices',
      description: 'Guidelines for writing SOAP notes, progress notes, and maintaining proper clinical documentation',
      duration: '18 min',
      type: 'article',
      url: '#',
    },
    {
      title: 'Billing and Claims Processing',
      description: 'Complete guide to insurance billing, submitting claims, and managing payments',
      duration: '25 min',
      type: 'video',
      url: '#',
    },
    {
      title: 'HIPAA Compliance Checklist',
      description: 'Essential checklist for maintaining HIPAA compliance in your practice',
      duration: '8 min',
      type: 'pdf',
      url: '#',
    },
    {
      title: 'Patient Communication Tools',
      description: 'Using secure messaging, automated reminders, and patient engagement features',
      duration: '14 min',
      type: 'article',
      url: '#',
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
    { id: 'security', label: 'Security', count: faqs.filter(f => f.category === 'security').length },
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-blue-100">
              <Headphones className="text-2xl text-blue-600" />
            </div>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Live Chat</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Chat with support</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-green-100">
              <Mail className="text-2xl text-green-600" />
            </div>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Email Support</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Get help via email</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-blue-100">
              <MessageSquarePlus className="text-2xl text-blue-600" />
            </div>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Send Feedback</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Share your ideas</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-red-100">
              <Bug className="text-2xl text-red-600" />
            </div>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Report Bug</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Report an issue</p>
        </div>
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
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
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
                    <span>View {guide.type}</span>
                    <ExternalLink className="text-xs" />
                  </div>
                </div>
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
                    Get instant help from our support team
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">Available 24/7</p>
                  <button
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
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">Mon-Fri, 9AM-6PM EST</p>
                  <a
                    href="tel:1-800-DOKTOCHAIN"
                    className="px-6 py-3 rounded-lg text-white font-medium inline-block transition-colors"
                    style={{ backgroundColor: currentColors.primary }}
                  >
                    1-800-DOKTOCHAIN
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
                  For urgent matters, please call us directly
                </p>
                <a
                  href="tel:1-800-DOKTOCHAIN"
                  className="text-lg font-semibold"
                  style={{ color: currentColors.primary }}
                >
                  1-800-DOKTOCHAIN
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
