import React, { useState, useEffect } from 'react';
import { healthRecordsService, LabResult } from '../../services/healthRecordsService';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Calendar,
  Building2,
  AlertCircle,
  CheckCircle,
  Plus,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Props {
  patientId: string;
}

export default function LabResultsTab({ patientId }: Props) {
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [showTrends, setShowTrends] = useState(false);
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    loadLabResults();
  }, [patientId, selectedCategory]);

  const loadLabResults = async () => {
    setLoading(true);
    const filters = selectedCategory !== 'all' ? { category: selectedCategory } : undefined;
    const { data } = await healthRecordsService.getLabResults(patientId, filters);
    if (data) {
      setLabResults(data);
    }
    setLoading(false);
  };

  const loadTrends = async (testName: string) => {
    const { data } = await healthRecordsService.getLabTrends(patientId, testName, 12);
    if (data) {
      setTrendData(data);
      setShowTrends(true);
    }
  };

  const categories = healthRecordsService.getTestCategories();

  const groupedResults = labResults.reduce((acc, result) => {
    if (!acc[result.test_name]) {
      acc[result.test_name] = [];
    }
    acc[result.test_name].push(result);
    return acc;
  }, {} as Record<string, LabResult[]>);

  const getAbnormalIcon = (flag: string) => {
    switch (flag) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'high':
        return <TrendingUp className="w-5 h-5 text-orange-600" />;
      case 'low':
        return <TrendingDown className="w-5 h-5 text-blue-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50">
          <Plus className="w-5 h-5" />
          Add Result
        </button>
      </div>

      {labResults.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No lab results</h3>
          <p className="text-gray-600">Lab results will appear here once available</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedResults).map(([testName, results]) => {
            const latestResult = results[0];
            const isExpanded = expandedTest === testName;

            return (
              <div key={testName} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedTest(isExpanded ? null : testName)}
                  className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getAbnormalIcon(latestResult.abnormal_flag)}
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">{testName}</h3>
                        <p className="text-sm text-gray-600">{latestResult.test_category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          {latestResult.result_value}
                          <span className="text-sm text-gray-600 ml-1">{latestResult.unit}</span>
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(latestResult.result_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${healthRecordsService.getAbnormalFlagColor(
                            latestResult.abnormal_flag
                          )}`}
                        >
                          {latestResult.abnormal_flag.toUpperCase()}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 bg-white border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Latest Result Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Reference Range:</span>
                            <span className="font-medium text-gray-900">
                              {latestResult.reference_range_low !== null &&
                              latestResult.reference_range_high !== null
                                ? `${latestResult.reference_range_low} - ${latestResult.reference_range_high} ${latestResult.unit}`
                                : 'Not specified'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Order Date:</span>
                            <span className="font-medium text-gray-900">
                              {new Date(latestResult.order_date).toLocaleDateString()}
                            </span>
                          </div>
                          {latestResult.lab_facility && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Lab Facility:</span>
                              <span className="font-medium text-gray-900">
                                {latestResult.lab_facility}
                              </span>
                            </div>
                          )}
                          {latestResult.provider_comments && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm font-semibold text-blue-900 mb-1">
                                Provider Comments:
                              </p>
                              <p className="text-sm text-blue-800">{latestResult.provider_comments}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {results.length > 1 && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900">Result History</h4>
                            <button
                              onClick={() => loadTrends(testName)}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              View Trend Graph
                            </button>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {results.map((result, idx) => (
                              <div
                                key={result.id}
                                className={`flex items-center justify-between p-2 rounded ${
                                  idx === 0 ? 'bg-blue-50' : 'bg-gray-50'
                                }`}
                              >
                                <span className="text-sm text-gray-600">
                                  {new Date(result.result_date).toLocaleDateString()}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">
                                    {result.result_value} {result.unit}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs ${healthRecordsService.getAbnormalFlagColor(
                                      result.abnormal_flag
                                    )}`}
                                  >
                                    {result.abnormal_flag}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <button className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 text-sm">
                        Download Result
                      </button>
                      <button className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                        Share with Provider
                      </button>
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
