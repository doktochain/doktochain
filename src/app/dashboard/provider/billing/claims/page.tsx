import { useState, useEffect } from 'react';
import { FileText, Plus, ExternalLink, Search, X, ChevronRight, AlertCircle } from 'lucide-react';
import { providerBillingService, InsuranceClaim } from '../../../../../services/providerBillingService';
import { useAuth } from '../../../../../contexts/AuthContext';

const PROVINCIAL_PORTALS = {
  ON: { name: 'OHIP', url: 'https://www.health.gov.on.ca/ohip' },
  BC: { name: 'MSP', url: 'https://www2.gov.bc.ca/gov/content/health/practitioner-professional-resources' },
  AB: { name: 'Alberta Health', url: 'https://www.alberta.ca/ahcip' },
  QC: { name: 'RAMQ', url: 'https://www.ramq.gouv.qc.ca' },
};

const CLAIM_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'pending', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'resubmitted', label: 'Resubmitted' },
];

export default function InsuranceClaimsPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  useEffect(() => {
    if (user) {
      loadClaims();
    }
  }, [user, statusFilter]);

  const loadClaims = async () => {
    if (!user) return;

    setLoading(true);
    const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined;
    const { data } = await providerBillingService.getClaims(user.id, filters);

    if (data) {
      setClaims(data);
    }

    setLoading(false);
  };

  const filteredClaims = claims.filter(
    (claim) =>
      claim.claim_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.insurance_company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewClaim = (claim: InsuranceClaim) => {
    setSelectedClaim(claim);
    setShowDetailModal(true);
  };

  const handleOpenStatusUpdate = (claim: InsuranceClaim) => {
    setSelectedClaim(claim);
    setNewStatus(claim.status);
    setStatusNotes('');
    setShowStatusModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedClaim || !newStatus) return;

    setUpdatingStatus(true);
    const updates: Partial<InsuranceClaim> = { status: newStatus as InsuranceClaim['status'] };

    if (newStatus === 'submitted') {
      updates.submitted_date = new Date().toISOString();
    }
    if (statusNotes) {
      updates.notes = statusNotes;
    }

    const { error } = await providerBillingService.updateClaim(selectedClaim.id, updates);
    if (!error) {
      setShowStatusModal(false);
      setSelectedClaim(null);
      loadClaims();
    }
    setUpdatingStatus(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'pending':
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'resubmitted':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Insurance Claims</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Submit and track insurance claims and billing
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          Quick Access - Provincial Billing Portals
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(PROVINCIAL_PORTALS).map(([code, portal]) => (
            <a
              key={code}
              href={portal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {portal.name}
              </span>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by claim number or insurance company..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              {CLAIM_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No claims found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start submitting insurance claims to track reimbursements
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Claim #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Insurance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Service Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {claim.claim_number || 'Draft'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {(claim as any).patients?.full_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {claim.insurance_company}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(claim.service_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                      ${claim.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenStatusUpdate(claim)}
                        className={`px-2 py-1 text-xs rounded-full cursor-pointer hover:opacity-80 ${getStatusColor(claim.status)}`}
                      >
                        {claim.status}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <button
                        onClick={() => handleViewClaim(claim)}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        View <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDetailModal && selectedClaim && (
        <ClaimDetailModal claim={selectedClaim} onClose={() => { setShowDetailModal(false); setSelectedClaim(null); }} getStatusColor={getStatusColor} />
      )}

      {showStatusModal && selectedClaim && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Update Claim Status</h2>
              <button onClick={() => setShowStatusModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Claim</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedClaim.claim_number || 'Draft'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {CLAIM_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={updatingStatus}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                >
                  {updatingStatus ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClaimDetailModal({
  claim,
  onClose,
  getStatusColor,
}: {
  claim: InsuranceClaim;
  onClose: () => void;
  getStatusColor: (status: string) => string;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Claim {claim.claim_number || 'Draft'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Created {new Date(claim.created_at).toLocaleDateString()}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(claim.status)}`}>
              {claim.status}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{claim.claim_type}</span>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Insurance Company</p>
              <p className="font-medium text-gray-900 dark:text-white">{claim.insurance_company}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Service Date</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {new Date(claim.service_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Patient</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {(claim as any).patients?.full_name || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Province</p>
              <p className="font-medium text-gray-900 dark:text-white">{claim.province || 'N/A'}</p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Financial Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Claimed</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">${claim.total_amount.toFixed(2)}</p>
              </div>
              {claim.approved_amount != null && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Approved Amount</p>
                  <p className="text-lg font-bold text-green-600">${claim.approved_amount.toFixed(2)}</p>
                </div>
              )}
              {claim.paid_amount != null && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Paid Amount</p>
                  <p className="text-lg font-bold text-green-600">${claim.paid_amount.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>

          {claim.insurance_plan_number && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Plan Number</p>
              <p className="font-medium text-gray-900 dark:text-white">{claim.insurance_plan_number}</p>
            </div>
          )}

          {claim.billing_codes && (
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Billing Codes</p>
              <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
                {typeof claim.billing_codes === 'string'
                  ? claim.billing_codes
                  : JSON.stringify(claim.billing_codes, null, 2)}
              </pre>
            </div>
          )}

          {claim.rejection_reason && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-300">Rejection Reason</p>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1">{claim.rejection_reason}</p>
                </div>
              </div>
            </div>
          )}

          {claim.notes && (
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</p>
              <p className="text-gray-700 dark:text-gray-300">{claim.notes}</p>
            </div>
          )}

          {claim.submitted_date && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Submitted Date</p>
              <p className="text-gray-900 dark:text-white">{new Date(claim.submitted_date).toLocaleDateString()}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
