import { useState, useEffect } from 'react';
import { Globe, Check, X, Settings } from 'lucide-react';
import { fhirService, ProvincialEHRIntegration } from '../../../../../services/fhirInteroperabilityService';

const provinceNames: Record<string, string> = {
  ON: 'Ontario',
  BC: 'British Columbia',
  AB: 'Alberta',
  QC: 'Quebec',
  MB: 'Manitoba',
  SK: 'Saskatchewan',
  NS: 'Nova Scotia',
  NB: 'New Brunswick',
  PE: 'Prince Edward Island',
  NL: 'Newfoundland and Labrador'
};

export default function ProvincialEHRPage() {
  const [integrations, setIntegrations] = useState<ProvincialEHRIntegration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const data = await fhirService.getProvincialIntegrations();
      setIntegrations(data);
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSync = async (province: string, currentState: boolean) => {
    try {
      await fhirService.enableProvincialSync(province, !currentState);
      loadIntegrations();
    } catch (error) {
      console.error('Error toggling sync:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Provincial EHR Integrations</h1>
        <p className="text-gray-600 mt-1">
          Manage connections to Canadian provincial health information systems
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration) => (
          <div key={integration.id} className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${
                    integration.is_enabled ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Globe className={`w-6 h-6 ${
                      integration.is_enabled ? 'text-green-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {provinceNames[integration.province]}
                    </h3>
                    <p className="text-sm text-gray-600">{integration.system_name}</p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    integration.is_enabled
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {integration.is_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">{integration.description}</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Sync Enabled:</span>
                  <div className="flex items-center gap-2">
                    {integration.sync_enabled ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <X className="w-4 h-4 text-gray-400" />
                    )}
                    <span className={integration.sync_enabled ? 'text-green-600' : 'text-gray-600'}>
                      {integration.sync_enabled ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                {integration.last_successful_sync && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last Sync:</span>
                    <span className="font-medium">
                      {new Date(integration.last_successful_sync).toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Rate Limit:</span>
                  <span className="font-medium">{integration.rate_limit_per_hour}/hour</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Schedule:</span>
                  <span className="font-medium font-mono text-xs">
                    {integration.sync_schedule_cron}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="text-sm text-gray-600 mb-2">Supported Operations:</div>
                <div className="flex flex-wrap gap-2">
                  {integration.supported_operations.map((op) => (
                    <span
                      key={op}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                    >
                      {op}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  onClick={() =>
                    handleToggleSync(integration.province, integration.sync_enabled)
                  }
                  className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                    integration.sync_enabled
                      ? 'bg-red-50 text-red-700 hover:bg-red-100'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {integration.sync_enabled ? 'Disable Sync' : 'Enable Sync'}
                </button>
                <button className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <Globe className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">
              Provincial EHR Integration Information
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Each provincial system uses FHIR R4 standards for interoperability</li>
              <li>• Sync schedules are configurable per province</li>
              <li>• Data is synchronized bidirectionally when enabled</li>
              <li>• All sync operations are logged in the blockchain audit trail</li>
              <li>• Rate limits are enforced to comply with provincial policies</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
