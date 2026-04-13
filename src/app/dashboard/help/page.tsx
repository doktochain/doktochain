import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { helpCenterService, HelpCategory, HelpArticle, FAQ } from '../../../services/helpCenterService';
import {
  Search,
  BookOpen,
  MessageCircle,
  FileText,
  HelpCircle,
  Video,
  ArrowRight,
  TrendingUp,
  Star,
  LifeBuoy,
  Phone,
  Mail,
  Calendar,
  Pill,
  CreditCard,
  Settings,
} from 'lucide-react';

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [featuredArticles, setFeaturedArticles] = useState<HelpArticle[]>([]);
  const [popularArticles, setPopularArticles] = useState<HelpArticle[]>([]);
  const [featuredFAQs, setFeaturedFAQs] = useState<FAQ[]>([]);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHelpContent();
  }, []);

  const loadHelpContent = async () => {
    setLoading(true);
    try {
      const [cats, featured, popular, faqs] = await Promise.all([
        helpCenterService.getCategories(),
        helpCenterService.getFeaturedArticles(6),
        helpCenterService.getPopularArticles(5),
        helpCenterService.getFAQs(undefined, true),
      ]);

      if (cats.data) setCategories(cats.data);
      if (featured.data) setFeaturedArticles(featured.data);
      if (popular.data) setPopularArticles(popular.data);
      if (faqs.data) setFeaturedFAQs(faqs.data.slice(0, 5));
    } catch (error) {
      console.error('Error loading help content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const results = await helpCenterService.searchContent(searchQuery);
    setSearchResults(results);
  };

  const getCategoryIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      BookOpen,
      MessageCircle,
      FileText,
      HelpCircle,
      Video,
      LifeBuoy,
      Calendar,
      Pill,
      CreditCard,
      Settings,
    };
    return icons[iconName] || HelpCircle;
  };

  const COLOR_MAP: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-600' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-600' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading help center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <HelpCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">How can we help you?</h1>
          <p className="text-xl text-gray-600 mb-8">
            Search our knowledge base or browse categories below
          </p>

          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for help articles, FAQs, guides..."
                className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {searchResults ? (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Search Results for "{searchQuery}"
              </h2>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults(null);
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear Search
              </button>
            </div>

            {searchResults.articles.length === 0 && searchResults.faqs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-600">Try different keywords or browse categories below</p>
              </div>
            ) : (
              <div className="space-y-6">
                {searchResults.articles.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Articles ({searchResults.articles.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {searchResults.articles.map((article: HelpArticle) => (
                        <Link
                          key={article.id}
                          to={`/dashboard/help/article/${article.slug}`}
                          className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                        >
                          <h4 className="font-semibold text-gray-900 mb-2">{article.title}</h4>
                          <p className="text-sm text-gray-600 line-clamp-2">{article.summary}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.faqs.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      FAQs ({searchResults.faqs.length})
                    </h3>
                    <div className="space-y-3">
                      {searchResults.faqs.map((faq: FAQ) => (
                        <div key={faq.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-2">{faq.question}</h4>
                          <p className="text-sm text-gray-600 line-clamp-2">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {categories.map((category) => {
                const Icon = getCategoryIcon(category.icon);
                return (
                  <Link
                    key={category.id}
                    to={`/dashboard/help/category/${category.slug}`}
                    className="p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all group"
                  >
                    <div className={`w-12 h-12 ${COLOR_MAP[category.color]?.bg || 'bg-gray-100'} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-6 h-6 ${COLOR_MAP[category.color]?.text || 'text-gray-600'}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{category.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {category.article_count} articles
                      </span>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {featuredArticles.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <Star className="w-6 h-6 text-yellow-500" />
                  <h2 className="text-2xl font-bold text-gray-900">Featured Articles</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredArticles.map((article) => (
                    <Link
                      key={article.id}
                      to={`/dashboard/help/article/${article.slug}`}
                      className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      {article.video_url && (
                        <div className="relative h-40 bg-gray-100 flex items-center justify-center">
                          <Video className="w-12 h-12 text-gray-400" />
                          <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs font-medium rounded">
                            VIDEO
                          </div>
                        </div>
                      )}
                      <div className="p-5">
                        <span className="text-xs font-medium text-blue-600 mb-2 block">
                          {article.category?.name}
                        </span>
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                          {article.title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-3 mb-4">{article.summary}</p>
                        <div className="flex items-center text-xs text-gray-500">
                          <span>{article.view_count} views</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {featuredFAQs.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
                  <Link
                    to="/dashboard/help/faqs"
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    View All
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg divide-y">
                  {featuredFAQs.map((faq) => (
                    <details key={faq.id} className="group">
                      <summary className="p-5 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                        <span className="font-medium text-gray-900">{faq.question}</span>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-open:rotate-90 transition-transform" />
                      </summary>
                      <div className="p-5 pt-0">
                        <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {popularArticles.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Popular Articles</h2>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg divide-y">
                  {popularArticles.map((article, index) => (
                    <Link
                      key={article.id}
                      to={`/dashboard/help/article/${article.slug}`}
                      className="p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">{article.title}</h3>
                        <p className="text-sm text-gray-500">
                          {article.view_count} views • {article.category?.name}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link
            to="/dashboard/help/support"
            className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-shadow"
          >
            <MessageCircle className="w-10 h-10 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Contact Support</h3>
            <p className="text-blue-100 mb-4">Submit a ticket and get help from our team</p>
            <div className="flex items-center gap-2 font-medium">
              Open Ticket
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          <Link
            to="/dashboard/help/chat"
            className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transition-shadow"
          >
            <MessageCircle className="w-10 h-10 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Live Chat</h3>
            <p className="text-green-100 mb-4">Chat with a support agent in real-time</p>
            <div className="flex items-center gap-2 font-medium">
              Start Chat
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          <div className="p-6 bg-gradient-to-br from-slate-600 to-slate-700 text-white rounded-xl">
            <Phone className="w-10 h-10 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Call Us</h3>
            <p className="text-slate-200 mb-2">Mon-Fri, 8am-8pm EST</p>
            <p className="text-2xl font-bold">1-800-DOKTO-HELP</p>
          </div>
        </div>
      </div>
    </div>
  );
}
