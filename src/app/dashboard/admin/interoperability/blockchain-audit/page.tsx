import { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  Activity,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  Clock,
  Hash,
  FileText,
} from 'lucide-react';
import {
  auditTrailService,
  AuditTrailEntry,
  IntegrityCheck,
} from '../../../../../services/auditTrailService';

const EVENT_TYPES = [
  'appointment_created',
  'appointment_updated',
  'appointment_cancelled',
  'appointment_rescheduled',
  'prescription_created',
  'prescription_sent',
  'prescription_validated',
  'prescription_filled',
  'prescription_cancelled',
  'prescription_approved',
  'prescription_rejected',
  'prescription_redirected',
  'order_created',
  'order_fulfilled',
  'order_delivered',
  'clinical_note_created',
  'clinical_note_updated',
  'clinical_note_signed',
  'payment_processed',
  'refund_issued',
  'pharmacy_validation',
  'delivery_event',
  'consent_granted',
  'consent_revoked',
  'consent_checked',
  'consent_window_created',
  'consent_window_extended',
  'consent_window_expired',
  'data_access',
  'cross_provider_access',
  'record_exported',
  'record_shared',
  'record_accessed',
  'user_login',
  'user_logout',
];

const RESOURCE_TYPES = [
  'appointment',
  'prescription',
  'pharmacy_order',
  'clinical_note',
  'appointment_note',
  'order_fulfillment',
  'payment',
  'transaction',
  'consent',
  'health_record',
  'auth',
  'record_share',
  'lab_result',
  'medication_history',
  'allergy',
  'immunization',
  'staff_member',
  'insurance_claim',
];

const ACTOR_ROLES = ['patient', 'provider', 'pharmacy', 'admin', 'system'];

const EVENT_COLORS: Record<string, string> = {
  appointment_created: 'bg-blue-100 text-blue-700',
  appointment_updated: 'bg-blue-50 text-blue-600',
  appointment_cancelled: 'bg-red-100 text-red-700',
  prescription_created: 'bg-cyan-100 text-cyan-700',
  prescription_sent: 'bg-teal-100 text-teal-700',
  prescription_validated: 'bg-green-100 text-green-700',
  prescription_filled: 'bg-emerald-100 text-emerald-700',
  prescription_cancelled: 'bg-red-50 text-red-600',
  order_created: 'bg-amber-100 text-amber-700',
  order_fulfilled: 'bg-teal-100 text-teal-700',
  order_delivered: 'bg-green-100 text-green-700',
  clinical_note_created: 'bg-sky-100 text-sky-700',
  clinical_note_updated: 'bg-sky-50 text-sky-600',
  clinical_note_signed: 'bg-emerald-100 text-emerald-700',
  payment_processed: 'bg-green-100 text-green-700',
  refund_issued: 'bg-orange-100 text-orange-700',
  pharmacy_validation: 'bg-teal-50 text-teal-600',
  delivery_event: 'bg-amber-100 text-amber-700',
  consent_granted: 'bg-green-50 text-green-600',
  consent_revoked: 'bg-red-50 text-red-600',
  consent_checked: 'bg-gray-50 text-gray-600',
  consent_window_created: 'bg-blue-50 text-blue-600',
  consent_window_extended: 'bg-blue-100 text-blue-700',
  consent_window_expired: 'bg-gray-100 text-gray-600',
  data_access: 'bg-gray-100 text-gray-700',
  cross_provider_access: 'bg-amber-100 text-amber-700',
  record_exported: 'bg-blue-50 text-blue-600',
  record_shared: 'bg-cyan-50 text-cyan-600',
  record_accessed: 'bg-gray-100 text-gray-700',
  appointment_rescheduled: 'bg-amber-100 text-amber-700',
  prescription_approved: 'bg-green-100 text-green-700',
  prescription_rejected: 'bg-red-100 text-red-700',
  prescription_redirected: 'bg-amber-100 text-amber-700',
  user_login: 'bg-blue-50 text-blue-600',
  user_logout: 'bg-gray-50 text-gray-600',
};

const ITEMS_PER_PAGE = 50;

export default function BlockchainAuditPage() {
  const [auditLogs, setAuditLogs] = useState<AuditTrailEntry[]>([]);
  const [integrityChecks, setIntegrityChecks] = useState<IntegrityCheck[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [selectedResourceType, setSelectedResourceType] = useState('all');
  const [selectedActorRole, setSelectedActorRole] = useState('all');
  const [searchActorId, setSearchActorId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditTrailEntry | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'integrity'>('logs');

  useEffect(() => {
    loadData();
  }, [selectedEventType, selectedResourceType, selectedActorRole, searchActorId, startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const filters: any = { limit: 500 };
      if (selectedEventType !== 'all') filters.eventType = selectedEventType;
      if (selectedResourceType !== 'all') filters.resourceType = selectedResourceType;
      if (searchActorId.trim()) filters.actorId = searchActorId.trim();
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const [logs, checks, statsData] = await Promise.all([
        auditTrailService.getAuditTrail(filters),
        auditTrailService.getIntegrityChecks(20),
        auditTrailService.getStats(),
      ]);

      setAuditLogs(logs);
      setIntegrityChecks(checks);
      setStats(statsData);
      setPage(1);
    } catch (error) {
      console.error('Error loading audit trail data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    if (!stats?.latestBlock) return;
    setVerifying(true);
    try {
      const startBlock = Math.max(1, stats.latestBlock.block_number - 1000);
      const endBlock = stats.latestBlock.block_number;
      await auditTrailService.runIntegrityCheck(startBlock, endBlock, 'manual');
      await loadData();
    } catch (error: any) {
      console.error('Integrity check failed:', error);
    } finally {
      setVerifying(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (selectedActorRole === 'all') return auditLogs;
    return auditLogs.filter((log) => log.actor_role === selectedActorRole);
  }, [auditLogs, selectedActorRole]);

  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredLogs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLogs, page]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);

  const exportAuditTrail = (format: 'csv' | 'json') => {
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['Block #', 'Timestamp', 'Event Type', 'Resource Type', 'Resource ID', 'Actor ID', 'Actor Role', 'Hash', 'Previous Hash'];
      const rows = filteredLogs.map((log) => [
        log.block_number,
        log.timestamp,
        log.event_type,
        log.resource_type,
        log.resource_id,
        log.actor_id || '',
        log.actor_role || '',
        log.current_hash,
        log.previous_hash || '',
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const clearFilters = () => {
    setSelectedEventType('all');
    setSelectedResourceType('all');
    setSelectedActorRole('all');
    setSearchActorId('');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = selectedEventType !== 'all' || selectedResourceType !== 'all' || selectedActorRole !== 'all' || searchActorId || startDate || endDate;

  if (loading && !auditLogs.length) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const lastCheck = integrityChecks[0];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-7 h-7 text-blue-600" />
            Cryptographic Audit Trail
          </h1>
          <p className="text-gray-600 mt-1">
            Immutable, hash-chained audit log with cryptographic integrity verification
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => exportAuditTrail('csv')}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>
          <button
            onClick={() => exportAuditTrail('json')}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            <Download className="w-4 h-4" />
            JSON
          </button>
          <button
            onClick={handleVerifyIntegrity}
            disabled={verifying || !stats?.latestBlock}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            {verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {verifying ? 'Verifying...' : 'Verify Chain'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Hash className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Blocks</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalBlocks?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Latest Block</p>
              <p className="text-2xl font-bold text-gray-900">#{stats?.latestBlock?.block_number || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-50 rounded-lg">
              <FileText className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Event Types</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.totalEvents ? Object.keys(stats.totalEvents).length : 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${lastCheck?.integrity_status === 'valid' ? 'bg-green-50' : lastCheck ? 'bg-red-50' : 'bg-gray-50'}`}>
              {lastCheck?.integrity_status === 'valid' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : lastCheck ? (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              ) : (
                <Shield className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Chain Status</p>
              <p className={`text-lg font-bold capitalize ${lastCheck?.integrity_status === 'valid' ? 'text-green-600' : lastCheck ? 'text-red-600' : 'text-gray-400'}`}>
                {lastCheck?.integrity_status || 'Not verified'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'logs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Audit Logs ({filteredLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('integrity')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'integrity' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Integrity Checks ({integrityChecks.length})
        </button>
      </div>

      {activeTab === 'logs' && (
        <>
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-4 border-b">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Event Type</label>
                  <select
                    value={selectedEventType}
                    onChange={(e) => setSelectedEventType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Events</option>
                    {EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Resource Type</label>
                  <select
                    value={selectedResourceType}
                    onChange={(e) => setSelectedResourceType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Resources</option>
                    {RESOURCE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Actor Role</label>
                  <select
                    value={selectedActorRole}
                    onChange={(e) => setSelectedActorRole(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Roles</option>
                    {ACTOR_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Actor ID</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchActorId}
                      onChange={(e) => setSearchActorId(e.target.value)}
                      placeholder="Search by user ID..."
                      className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 whitespace-nowrap"
                      >
                        <X className="w-3 h-3" />
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Block</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Timestamp</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Event</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Resource</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Hash</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-gray-700">#{log.block_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">{new Date(log.timestamp).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${EVENT_COLORS[log.event_type] || 'bg-gray-100 text-gray-700'}`}>
                          {log.event_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700 capitalize">{log.resource_type.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-gray-400 font-mono">{log.resource_id.substring(0, 12)}...</div>
                      </td>
                      <td className="px-4 py-3">
                        {log.actor_id ? (
                          <div>
                            <div className="text-xs text-gray-400 font-mono">{log.actor_id.substring(0, 12)}...</div>
                            {log.actor_role && <div className="text-xs text-gray-500 capitalize">{log.actor_role}</div>}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-400">{log.current_hash.substring(0, 16)}...</span>
                      </td>
                      <td className="px-4 py-3">
                        {log.tamper_detected ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600">
                            <AlertTriangle className="w-3 h-3" /> Tampered
                          </span>
                        ) : log.verified ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredLogs.length === 0 && (
              <div className="text-center py-16">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No audit entries found matching your filters</p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="mt-2 text-sm text-blue-600 hover:text-blue-700">
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-gray-600">
                  Showing {(page - 1) * ITEMS_PER_PAGE + 1}-{Math.min(page * ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length} entries
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                    if (pageNum > totalPages) return null;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 text-sm rounded ${pageNum === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'integrity' && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Integrity Verification History</h2>
            <button
              onClick={handleVerifyIntegrity}
              disabled={verifying || !stats?.latestBlock}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              {verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Run New Check
            </button>
          </div>
          <div className="divide-y">
            {integrityChecks.map((check) => (
              <div key={check.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {check.integrity_status === 'valid' ? (
                      <div className="p-2 bg-green-50 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                    ) : (
                      <div className="p-2 bg-red-50 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        Blocks #{check.start_block} - #{check.end_block}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(check.started_at).toLocaleString()}
                        </span>
                        <span>{check.blocks_checked} blocks checked</span>
                        {check.execution_time_ms && <span>{check.execution_time_ms}ms</span>}
                        <span className="capitalize text-xs bg-gray-100 px-2 py-0.5 rounded">{check.check_type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${
                        check.integrity_status === 'valid'
                          ? 'bg-green-100 text-green-700'
                          : check.integrity_status === 'compromised'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {check.integrity_status}
                    </span>
                    {check.issues_found > 0 && (
                      <p className="text-sm text-red-600 mt-1">
                        {check.issues_found} issue{check.issues_found !== 1 ? 's' : ''} | {check.hash_mismatches} hash mismatch{check.hash_mismatches !== 1 ? 'es' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {integrityChecks.length === 0 && (
              <div className="text-center py-16">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No integrity checks have been run yet</p>
                <button
                  onClick={handleVerifyIntegrity}
                  disabled={verifying || !stats?.latestBlock}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Run your first integrity check
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white rounded-t-xl">
              <h3 className="text-lg font-semibold text-gray-900">
                Block #{selectedLog.block_number} Details
              </h3>
              <button onClick={() => setSelectedLog(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Event Type</label>
                  <p className="mt-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-sm font-medium capitalize ${EVENT_COLORS[selectedLog.event_type] || 'bg-gray-100 text-gray-700'}`}>
                      {selectedLog.event_type.replace(/_/g, ' ')}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Timestamp</label>
                  <p className="mt-1 text-sm text-gray-900">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Resource Type</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{selectedLog.resource_type.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Resource ID</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono break-all">{selectedLog.resource_id}</p>
                </div>
                {selectedLog.actor_id && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Actor ID</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono break-all">{selectedLog.actor_id}</p>
                  </div>
                )}
                {selectedLog.actor_role && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Actor Role</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{selectedLog.actor_role}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Current Hash</label>
                <p className="mt-1 text-xs text-gray-700 font-mono bg-gray-50 p-2 rounded break-all">{selectedLog.current_hash}</p>
              </div>

              {selectedLog.previous_hash && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Previous Hash</label>
                  <p className="mt-1 text-xs text-gray-700 font-mono bg-gray-50 p-2 rounded break-all">{selectedLog.previous_hash}</p>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Action Data</label>
                <pre className="mt-1 text-xs text-gray-700 font-mono bg-gray-50 p-3 rounded overflow-x-auto max-h-48">
                  {JSON.stringify(selectedLog.action_data, null, 2)}
                </pre>
              </div>

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Metadata</label>
                  <pre className="mt-1 text-xs text-gray-700 font-mono bg-gray-50 p-3 rounded overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex items-center gap-4 pt-2 border-t">
                {selectedLog.tamper_detected ? (
                  <span className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
                    <AlertTriangle className="w-4 h-4" /> Tampering Detected
                  </span>
                ) : selectedLog.verified ? (
                  <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                    <CheckCircle className="w-4 h-4" /> Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Clock className="w-4 h-4" /> Awaiting Verification
                  </span>
                )}
                {selectedLog.ip_address && (
                  <span className="text-xs text-gray-500">IP: {selectedLog.ip_address}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
