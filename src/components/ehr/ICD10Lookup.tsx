import { useState, useEffect } from 'react';
import { Search, X, Star } from 'lucide-react';
import { ehrService } from '../../services/ehrService';

interface ICD10LookupProps {
  onSelect: (code: string) => void;
  onClose: () => void;
}

export default function ICD10Lookup({ onSelect, onClose }: ICD10LookupProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [commonCodes, setCommonCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCommonCodes();
  }, []);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchCodes();
    } else {
      setResults([]);
    }
  }, [searchTerm]);

  const loadCommonCodes = async () => {
    try {
      const codes = await ehrService.getCommonICD10Codes();
      setCommonCodes(codes);
    } catch (error) {
      console.error('Error loading common codes:', error);
    }
  };

  const searchCodes = async () => {
    setLoading(true);
    try {
      const codes = await ehrService.searchICD10Codes(searchTerm);
      setResults(codes);
    } catch (error) {
      console.error('Error searching codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (code: any) => {
    onSelect(`${code.code} - ${code.description}`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              ICD-10-CA Code Lookup
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by code or description..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              autoFocus
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh] p-6">
          {searchTerm.length >= 2 ? (
            <div>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Searching...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-2">
                  {results.map((code) => (
                    <button
                      key={code.id}
                      onClick={() => handleSelect(code)}
                      className="w-full text-left p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
                            {code.code}
                          </div>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {code.description}
                          </div>
                          {code.category && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              Category: {code.category}
                            </div>
                          )}
                        </div>
                        {code.commonly_used && (
                          <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  No codes found matching "{searchTerm}"
                </div>
              )}
            </div>
          ) : (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Commonly Used Codes
              </h4>
              <div className="space-y-2">
                {commonCodes.map((code) => (
                  <button
                    key={code.id}
                    onClick={() => handleSelect(code)}
                    className="w-full text-left p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <div className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
                      {code.code}
                    </div>
                    <div className="text-sm text-gray-900 dark:text-white">
                      {code.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
            Type at least 2 characters to search • ICD-10-CA 2024 Edition
          </p>
        </div>
      </div>
    </div>
  );
}
