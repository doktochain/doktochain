import { useState, useEffect, useMemo } from 'react';
import { Plus, CreditCard as Edit2, Trash2, CheckCircle, XCircle, Server, RefreshCw, Clock, ArrowUpDown, ChevronLeft, ChevronRight, Globe, Shield, Zap, FileText, X, AlertTriangle, Search } from 'lucide-react';
import { fhirService, FHIREndpoint, FHIRSyncLog } from '../../../../../services/fhirInteroperabilityService';
import { ConfirmDialog } from '../../../../../components/ui/confirm-dialog';

const FHIR_VERSIONS = ['R4', 'R4B', 'R5', 'STU3'];
const AUTH_TYPES = ['none', 'basic', 'bearer', 'oauth2', 'smart-on-fhir'];
const PROVINCES = ['ON', 'BC', 'QC', 'AB', 'MB', 'SK', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU'];
const RESOURCE_TYPES = [
  'Patient', 'Observation', 'Condition', 'Procedure', 'MedicationRequest',
  'MedicationDispense', 'Immunization', 'AllergyIntolerance', 'DiagnosticReport',
  'Encounter', 'Practitioner', 'Organization', 'Location', 'CapabilityStatement'
];

const TEST_SERVERS: Partial<FHIREndpoint>[] = [
  {
    name: 'HAPI FHIR R4 Test Server',
    description: 'Public HAPI FHIR R4 test server for development and testing',
    base_url: 'https://hapi.fhir.org/baseR4',
    fhir_version: 'R4',
    authentication_type: 'none',
    auth_config: {},
    supported_resources: ['Patient', 'Observation', 'Condition', 'MedicationRequest', 'Immunization', 'AllergyIntolerance'],
    status: 'testing' as const,
    sync_frequency_minutes: 60,
    headers: {},
    is_primary: false,
    metadata: { source: 'pre-configured', environment: 'test' }
  },
  {
    name: 'SmileCDR Sandbox',
    description: 'SmileCDR FHIR R4 sandbox for integration testing',
    base_url: 'https://try.smilecdr.com/baseR4',
    fhir_version: 'R4',
    authentication_type: 'none',
    auth_config: {},
    supported_resources: ['Patient', 'Observation', 'Condition', 'MedicationRequest', 'Procedure', 'Encounter'],
    status: 'testing' as const,
    sync_frequency_minutes: 60,
    headers: {},
    is_primary: false,
    metadata: { source: 'pre-configured', environment: 'test' }
  }
];

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  testing: 'bg-amber-50 text-amber-700 border border-amber-200',
  inactive: 'bg-gray-50 text-gray-600 border border-gray-200',
};

const SYNC_STATUS_STYLES: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
  partial: 'bg-amber-50 text-amber-700',
};

const ITEMS_PER_PAGE = 15;

interface EndpointFormData {
  name: string;
  description: string;
  base_url: string;
  fhir_version: string;
  province: string;
  authentication_type: string;
  auth_config: Record<string, any>;
  supported_resources: string[];
  status: 'active' | 'inactive' | 'testing';
  sync_frequency_minutes: number;
  headers: Record<string, any>;
  is_primary: boolean;
}

const defaultFormData: EndpointFormData = {
  name: '',
  description: '',
  base_url: '',
  fhir_version: 'R4',
  province: '',
  authentication_type: 'none',
  auth_config: {},
  supported_resources: [],
  status: 'testing',
  sync_frequency_minutes: 60,
  headers: {},
  is_primary: false,
};

interface ConnectionResult {
  endpointId: string;
  success: boolean;
  message: string;
  testedAt: string;
}

export default function FHIREndpointsPage() {
  const [endpoints, setEndpoints] = useState<FHIREndpoint[]>([]);
  const [syncLogs, setSyncLogs] = useState<FHIRSyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'endpoints' | 'sync-logs'>('endpoints');
  const [showModal, setShowModal] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<FHIREndpoint | null>(null);
  const [formData, setFormData] = useState<EndpointFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [connectionResults, setConnectionResults] = useState<Record<string, ConnectionResult>>({});
  const [logFilterEndpoint, setLogFilterEndpoint] = useState('');
  const [logFilterStatus, setLogFilterStatus] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [formError, setFormError] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [endpointsData, logsData] = await Promise.all([
        fhirService.getAllEndpoints(),
        fhirService.getSyncLogs({ limit: 200 })
      ]);
      setEndpoints(endpointsData);
      setSyncLogs(logsData);
    } catch (error) {
      console.error('Error loading FHIR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    let filtered = syncLogs;
    if (logFilterEndpoint) {
      filtered = filtered.filter(l => l.endpoint_id === logFilterEndpoint);
    }
    if (logFilterStatus) {
      filtered = filtered.filter(l => l.status === logFilterStatus);
    }
    return filtered;
  }, [syncLogs, logFilterEndpoint, logFilterStatus]);

  const paginatedLogs = useMemo(() => {
    const start = (logPage - 1) * ITEMS_PER_PAGE;
    return filteredLogs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLogs, logPage]);

  const totalLogPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);

  const openAddModal = (preConfigured?: Partial<FHIREndpoint>) => {
    setEditingEndpoint(null);
    setFormError('');
    if (preConfigured) {
      setFormData({
        name: preConfigured.name || '',
        description: preConfigured.description || '',
        base_url: preConfigured.base_url || '',
        fhir_version: preConfigured.fhir_version || 'R4',
        province: '',
        authentication_type: preConfigured.authentication_type || 'none',
        auth_config: preConfigured.auth_config || {},
        supported_resources: preConfigured.supported_resources || [],
        status: (preConfigured.status as any) || 'testing',
        sync_frequency_minutes: preConfigured.sync_frequency_minutes || 60,
        headers: preConfigured.headers || {},
        is_primary: preConfigured.is_primary || false,
      });
    } else {
      setFormData(defaultFormData);
    }
    setShowModal(true);
  };

  const openEditModal = (endpoint: FHIREndpoint) => {
    setEditingEndpoint(endpoint);
    setFormError('');
    setFormData({
      name: endpoint.name,
      description: endpoint.description || '',
      base_url: endpoint.base_url,
      fhir_version: endpoint.fhir_version,
      province: endpoint.province || '',
      authentication_type: endpoint.authentication_type,
      auth_config: endpoint.auth_config || {},
      supported_resources: endpoint.supported_resources || [],
      status: endpoint.status,
      sync_frequency_minutes: endpoint.sync_frequency_minutes,
      headers: endpoint.headers || {},
      is_primary: endpoint.is_primary,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setFormError('Endpoint name is required');
      return;
    }
    if (!formData.base_url.trim()) {
      setFormError('Base URL is required');
      return;
    }
    try {
      new URL(formData.base_url);
    } catch {
      setFormError('Please enter a valid URL');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload: Partial<FHIREndpoint> = {
        ...formData,
        province: formData.province || undefined,
        metadata: editingEndpoint?.metadata || { source: 'manual' },
      };

      if (editingEndpoint) {
        await fhirService.updateEndpoint(editingEndpoint.id, payload);
      } else {
        await fhirService.createEndpoint(payload);
      }
      setShowModal(false);
      await loadData();
    } catch (error: any) {
      setFormError(error.message || 'Failed to save endpoint');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (endpointId: string) => {
    setTestingEndpoint(endpointId);
    try {
      const result = await fhirService.testEndpointConnection(endpointId);
      setConnectionResults(prev => ({
        ...prev,
        [endpointId]: {
          endpointId,
          success: result.success,
          message: result.message,
          testedAt: new Date().toISOString(),
        }
      }));
      const [endpointsData, logsData] = await Promise.all([
        fhirService.getAllEndpoints(),
        fhirService.getSyncLogs({ limit: 200 }),
      ]);
      setEndpoints(endpointsData);
      setSyncLogs(logsData);
    } catch (error: any) {
      setConnectionResults(prev => ({
        ...prev,
        [endpointId]: {
          endpointId,
          success: false,
          message: error.message,
          testedAt: new Date().toISOString(),
        }
      }));
    } finally {
      setTestingEndpoint(null);
    }
  };

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  const executeDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await fhirService.deleteEndpoint(pendingDeleteId);
      await loadData();
    } catch (error) {
      console.error('Error deleting endpoint:', error);
    } finally {
      setDeleteConfirmOpen(false);
      setPendingDeleteId(null);
    }
  };

  const toggleResource = (resource: string) => {
    setFormData(prev => ({
      ...prev,
      supported_resources: prev.supported_resources.includes(resource)
        ? prev.supported_resources.filter(r => r !== resource)
        : [...prev.supported_resources, resource]
    }));
  };

  const getEndpointName = (endpointId?: string) => {
    if (!endpointId) return 'N/A';
    const ep = endpoints.find(e => e.id === endpointId);
    return ep?.name || endpointId.slice(0, 8);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="flex gap-4 mt-6">
            <div className="h-10 bg-gray-200 rounded w-32"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FHIR Endpoints</h1>
          <p className="text-gray-500 mt-1">
            Manage FHIR server connections for provincial EHR integration and data exchange
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Endpoint
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Server className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Endpoints</p>
              <p className="text-xl font-bold text-gray-900">{endpoints.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-xl font-bold text-gray-900">{endpoints.filter(e => e.status === 'active').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Testing</p>
              <p className="text-xl font-bold text-gray-900">{endpoints.filter(e => e.status === 'testing').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-50 rounded-lg">
              <ArrowUpDown className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Sync Events (24h)</p>
              <p className="text-xl font-bold text-gray-900">
                {syncLogs.filter(l => {
                  const logDate = new Date(l.created_at);
                  const dayAgo = new Date(Date.now() - 86400000);
                  return logDate > dayAgo;
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'endpoints'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              Endpoints ({endpoints.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab('sync-logs')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'sync-logs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Sync Logs ({syncLogs.length})
            </span>
          </button>
        </nav>
      </div>

      {activeTab === 'endpoints' && (
        <div className="space-y-6">
          {endpoints.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Server className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No FHIR Endpoints</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Get started by adding a FHIR endpoint or use one of the pre-configured test servers below.
              </p>
              <button
                onClick={() => openAddModal()}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add First Endpoint
              </button>
            </div>
          )}

          {endpoints.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {endpoints.map((endpoint) => {
                const connResult = connectionResults[endpoint.id];
                return (
                  <div key={endpoint.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <h3 className="font-semibold text-gray-900 truncate">{endpoint.name}</h3>
                          </div>
                          {endpoint.description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{endpoint.description}</p>
                          )}
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_STYLES[endpoint.status] || STATUS_STYLES.inactive}`}>
                          {endpoint.status}
                        </span>
                      </div>

                      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 font-mono truncate">
                        {endpoint.base_url}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-400 text-xs">FHIR Version</span>
                          <p className="font-medium text-gray-700">{endpoint.fhir_version}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-xs">Auth Type</span>
                          <p className="font-medium text-gray-700 capitalize">{endpoint.authentication_type}</p>
                        </div>
                        {endpoint.province && (
                          <div>
                            <span className="text-gray-400 text-xs">Province</span>
                            <p className="font-medium text-gray-700">{endpoint.province}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-400 text-xs">Sync Interval</span>
                          <p className="font-medium text-gray-700">{endpoint.sync_frequency_minutes}min</p>
                        </div>
                      </div>

                      {endpoint.supported_resources?.length > 0 && (
                        <div>
                          <span className="text-gray-400 text-xs">Resources</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {endpoint.supported_resources.slice(0, 4).map(r => (
                              <span key={r} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">{r}</span>
                            ))}
                            {endpoint.supported_resources.length > 4 && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                                +{endpoint.supported_resources.length - 4}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {connResult && (
                        <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                          connResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {connResult.success ? (
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 flex-shrink-0" />
                          )}
                          <span className="truncate">{connResult.message}</span>
                        </div>
                      )}

                      {endpoint.last_sync_at && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          Last sync: {new Date(endpoint.last_sync_at).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/50 flex gap-2">
                      <button
                        onClick={() => handleTestConnection(endpoint.id)}
                        disabled={testingEndpoint === endpoint.id}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                      >
                        {testingEndpoint === endpoint.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Zap className="w-3.5 h-3.5" />
                        )}
                        {testingEndpoint === endpoint.id ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        onClick={() => openEditModal(endpoint)}
                        className="px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(endpoint.id)}
                        className="px-3 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Pre-configured Test Servers</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Quickly add well-known FHIR test servers for development and integration testing
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {TEST_SERVERS.map((server, idx) => {
                const alreadyAdded = endpoints.some(e => e.base_url === server.base_url);
                return (
                  <div key={idx} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <h4 className="font-medium text-gray-900">{server.name}</h4>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{server.description}</p>
                      <p className="text-xs text-gray-400 font-mono mt-1">{server.base_url}</p>
                    </div>
                    {alreadyAdded ? (
                      <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium flex-shrink-0">
                        <CheckCircle className="w-4 h-4" />
                        Added
                      </span>
                    ) : (
                      <button
                        onClick={() => openAddModal(server)}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sync-logs' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={logFilterEndpoint}
                  onChange={e => { setLogFilterEndpoint(e.target.value); setLogPage(1); }}
                  className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white appearance-none min-w-[200px]"
                >
                  <option value="">All Endpoints</option>
                  {endpoints.map(ep => (
                    <option key={ep.id} value={ep.id}>{ep.name}</option>
                  ))}
                </select>
              </div>
              <select
                value={logFilterStatus}
                onChange={e => { setLogFilterStatus(e.target.value); setLogPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">All Statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="partial">Partial</option>
              </select>
              {(logFilterEndpoint || logFilterStatus) && (
                <button
                  onClick={() => { setLogFilterEndpoint(''); setLogFilterStatus(''); setLogPage(1); }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear filters
                </button>
              )}
              <span className="text-sm text-gray-500 ml-auto">
                {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {filteredLogs.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No sync logs found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Timestamp</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Endpoint</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Operation</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Resource</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Direction</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">HTTP</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Duration</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedLogs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-700 max-w-[150px] truncate">
                            {getEndpointName(log.endpoint_id)}
                          </td>
                          <td className="px-4 py-3 text-gray-700 capitalize">{log.operation_type}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
                              {log.resource_type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium ${
                              log.direction === 'inbound' ? 'text-sky-600' : 'text-teal-600'
                            }`}>
                              {log.direction === 'inbound' ? 'IN' : 'OUT'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SYNC_STATUS_STYLES[log.status] || ''}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{log.http_status_code || '-'}</td>
                          <td className="px-4 py-3 text-gray-500">
                            {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            {log.error_message ? (
                              <span className="text-red-600 text-xs truncate block" title={log.error_message}>
                                {log.error_message}
                              </span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalLogPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                    <span className="text-sm text-gray-500">
                      Showing {(logPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(logPage * ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setLogPage(p => Math.max(1, p - 1))}
                        disabled={logPage === 1}
                        className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-3 py-1.5 text-sm text-gray-600">
                        {logPage} / {totalLogPages}
                      </span>
                      <button
                        onClick={() => setLogPage(p => Math.min(totalLogPages, p + 1))}
                        disabled={logPage === totalLogPages}
                        className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">
                {editingEndpoint ? 'Edit FHIR Endpoint' : 'Add FHIR Endpoint'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Ontario EHR Gateway"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    rows={2}
                    placeholder="Brief description of this endpoint"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base URL *</label>
                  <input
                    type="url"
                    value={formData.base_url}
                    onChange={e => setFormData(p => ({ ...p, base_url: e.target.value }))}
                    placeholder="https://fhir.example.com/baseR4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">FHIR Version</label>
                  <select
                    value={formData.fhir_version}
                    onChange={e => setFormData(p => ({ ...p, fhir_version: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {FHIR_VERSIONS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                  <select
                    value={formData.province}
                    onChange={e => setFormData(p => ({ ...p, province: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">None</option>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Authentication Type</label>
                  <select
                    value={formData.authentication_type}
                    onChange={e => setFormData(p => ({ ...p, authentication_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {AUTH_TYPES.map(t => (
                      <option key={t} value={t}>{t === 'smart-on-fhir' ? 'SMART on FHIR' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(p => ({ ...p, status: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="testing">Testing</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sync Interval (minutes)</label>
                  <input
                    type="number"
                    value={formData.sync_frequency_minutes}
                    onChange={e => setFormData(p => ({ ...p, sync_frequency_minutes: parseInt(e.target.value) || 60 }))}
                    min={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_primary"
                    checked={formData.is_primary}
                    onChange={e => setFormData(p => ({ ...p, is_primary: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_primary" className="text-sm font-medium text-gray-700">Primary endpoint</label>
                </div>
              </div>

              {(formData.authentication_type === 'basic' || formData.authentication_type === 'bearer') && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Authentication Credentials
                  </h4>
                  {formData.authentication_type === 'basic' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Username</label>
                        <input
                          type="text"
                          value={formData.auth_config.username || ''}
                          onChange={e => setFormData(p => ({ ...p, auth_config: { ...p.auth_config, username: e.target.value } }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Password</label>
                        <input
                          type="password"
                          value={formData.auth_config.password || ''}
                          onChange={e => setFormData(p => ({ ...p, auth_config: { ...p.auth_config, password: e.target.value } }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  )}
                  {formData.authentication_type === 'bearer' && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Bearer Token</label>
                      <input
                        type="password"
                        value={formData.auth_config.token || ''}
                        onChange={e => setFormData(p => ({ ...p, auth_config: { ...p.auth_config, token: e.target.value } }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Supported Resources</label>
                <div className="flex flex-wrap gap-2">
                  {RESOURCE_TYPES.map(resource => (
                    <button
                      key={resource}
                      type="button"
                      onClick={() => toggleResource(resource)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        formData.supported_resources.includes(resource)
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {resource}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {saving ? 'Saving...' : editingEndpoint ? 'Update Endpoint' : 'Create Endpoint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    <ConfirmDialog
      open={deleteConfirmOpen}
      onOpenChange={setDeleteConfirmOpen}
      title="Delete Endpoint"
      description="Are you sure you want to delete this endpoint?"
      confirmLabel="Delete"
      variant="destructive"
      onConfirm={executeDelete}
    />
    </>
  );
}
