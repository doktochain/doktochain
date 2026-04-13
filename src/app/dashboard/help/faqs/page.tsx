import React, { useState, useEffect } from 'react';
import { helpCenterService, FAQ } from '../../../../services/helpCenterService';
import { HelpCircle, Search, ChevronDown, ThumbsUp, ThumbsDown } from 'lucide-react';

export default function FAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    setLoading(true);
    const { data } = await helpCenterService.getFAQs();
    if (data) {
      setFaqs(data);
    }
    setLoading(false);
  };

  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <HelpCircle className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h1>
        <p className="text-gray-600">Find quick answers to common questions</p>
      </div>

      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {filteredFAQs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No FAQs found</h3>
          <p className="text-gray-600">Try different keywords</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-lg divide-y">
          {filteredFAQs.map((faq) => {
            const isExpanded = expandedFAQ === faq.id;

            return (
              <div key={faq.id} className="group">
                <button
                  onClick={() => setExpandedFAQ(isExpanded ? null : faq.id)}
                  className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-semibold text-gray-900 text-lg pr-4">{faq.question}</h3>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  {faq.category && (
                    <span className="inline-block mt-2 text-xs text-blue-600 font-medium">
                      {faq.category.name}
                    </span>
                  )}
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6">
                    <p className="text-gray-700 leading-relaxed mb-4 whitespace-pre-wrap">
                      {faq.answer}
                    </p>

                    {faq.tags && faq.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {faq.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-4 border-t">
                      <span className="text-sm text-gray-600">Was this helpful?</span>
                      <div className="flex gap-2">
                        <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                          <ThumbsUp className="w-4 h-4" />
                          <span>{faq.helpful_count}</span>
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                          <ThumbsDown className="w-4 h-4" />
                          <span>{faq.not_helpful_count}</span>
                        </button>
                      </div>
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
