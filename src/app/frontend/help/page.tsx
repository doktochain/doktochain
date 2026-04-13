import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  HelpCircle,
  BookOpen,
  MessageCircle,
  Mail,
  Phone,
  Users,
  Heart,
  Store,
  Shield,
} from 'lucide-react';
import Footer from '../../../components/frontend/Footer';

export default function HelpPage() {
  const { t } = useTranslation('frontend');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const popularTopics = [
    {
      title: t('help.topicGettingStarted'),
      description: t('help.topicGettingStartedDesc'),
      icon: BookOpen,
      link: '#getting-started',
    },
    {
      title: t('help.topicForPatients'),
      description: t('help.topicForPatientsDesc'),
      icon: Users,
      link: '#patients',
    },
    {
      title: t('help.topicForProviders'),
      description: t('help.topicForProvidersDesc'),
      icon: Heart,
      link: '#providers',
    },
    {
      title: t('help.topicForPharmacies'),
      description: t('help.topicForPharmaciesDesc'),
      icon: Store,
      link: '#pharmacies',
    },
    {
      title: t('help.topicSecurity'),
      description: t('help.topicSecurityDesc'),
      icon: Shield,
      link: '#security',
    },
  ];

  const faqs = [
    {
      category: t('help.catGettingStarted'),
      questions: [
        {
          question: t('help.gsQ1'),
          answer: t('help.gsA1'),
        },
        {
          question: t('help.gsQ2'),
          answer: t('help.gsA2'),
        },
        {
          question: t('help.gsQ3'),
          answer: t('help.gsA3'),
        },
      ],
    },
    {
      category: t('help.catForPatients'),
      questions: [
        {
          question: t('help.patQ1'),
          answer: t('help.patA1'),
        },
        {
          question: t('help.patQ2'),
          answer: t('help.patA2'),
        },
        {
          question: t('help.patQ3'),
          answer: t('help.patA3'),
        },
        {
          question: t('help.patQ4'),
          answer: t('help.patA4'),
        },
      ],
    },
    {
      category: t('help.catForProviders'),
      questions: [
        {
          question: t('help.provQ1'),
          answer: t('help.provA1'),
        },
        {
          question: t('help.provQ2'),
          answer: t('help.provA2'),
        },
        {
          question: t('help.provQ3'),
          answer: t('help.provA3'),
        },
      ],
    },
    {
      category: t('help.catTechnicalSupport'),
      questions: [
        {
          question: t('help.techQ1'),
          answer: t('help.techA1'),
        },
        {
          question: t('help.techQ2'),
          answer: t('help.techA2'),
        },
        {
          question: t('help.techQ3'),
          answer: t('help.techA3'),
        },
      ],
    },
    {
      category: t('help.catSecurity'),
      questions: [
        {
          question: t('help.secQ1'),
          answer: t('help.secA1'),
        },
        {
          question: t('help.secQ2'),
          answer: t('help.secA2'),
        },
        {
          question: t('help.secQ3'),
          answer: t('help.secA3'),
        },
        {
          question: t('help.secQ4'),
          answer: t('help.secA4'),
        },
        {
          question: t('help.secQ5'),
          answer: t('help.secA5'),
        },
        {
          question: t('help.secQ6'),
          answer: t('help.secA6'),
        },
        {
          question: t('help.secQ7'),
          answer: t('help.secA7'),
        },
        {
          question: t('help.secQ8'),
          answer: t('help.secA8'),
        },
      ],
    },
  ];

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gray-50 mt-10">
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <HelpCircle className="text-white mx-auto mb-4" size={64} />
          <h1 className="text-4xl font-bold text-white mb-4">
            {t('help.title')}
          </h1>
          <p className="text-xl text-white mb-8">
            {t('help.subtitle')}
          </p>

          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder={t('help.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-lg border-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            {t('help.popularTopics')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {popularTopics.map((topic) => (
              <a
                key={topic.title}
                href={topic.link}
                className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <topic.icon className="text-blue-600 mb-4" size={48} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {topic.title}
                </h3>
                <p className="text-gray-600 text-sm">{topic.description}</p>
              </a>
            ))}
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            {t('help.faqTitle')}
          </h2>
          <div className="space-y-8">
            {faqs.map((category, categoryIndex) => (
              <div key={category.category}>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  {category.category}
                </h3>
                <div className="space-y-4">
                  {category.questions.map((faq, faqIndex) => {
                    const faqId = `${categoryIndex}-${faqIndex}`;
                    return (
                      <div
                        key={faqId}
                        className="bg-white rounded-lg shadow-sm overflow-hidden"
                      >
                        <button
                          onClick={() => toggleFAQ(faqId)}
                          className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50"
                        >
                          <span className="font-semibold text-gray-900">
                            {faq.question}
                          </span>
                          <span className="text-2xl text-gray-500">
                            {expandedFAQ === faqId ? '−' : '+'}
                          </span>
                        </button>
                        {expandedFAQ === faqId && (
                          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <p className="text-gray-700">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            {t('help.stillNeedHelp')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <MessageCircle className="text-blue-600 mx-auto mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('help.liveChat')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('help.liveChatDesc')}
              </p>
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                {t('help.startChat')}
              </button>
            </div>

            <div className="text-center">
              <Mail className="text-blue-600 mx-auto mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('help.emailSupport')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('help.emailSupportDesc')}
              </p>
              <a
                href="mailto:support@doktochain.com"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                {t('help.sendEmail')}
              </a>
            </div>

            <div className="text-center">
              <Phone className="text-blue-600 mx-auto mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('help.phoneSupport')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('help.phoneSupportDesc')}
              </p>
              <a
                href="tel:1-800-DOKTO-HELP"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                1-800-DOKTO-HELP
              </a>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
