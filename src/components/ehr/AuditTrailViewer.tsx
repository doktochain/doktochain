import { useState, useEffect } from 'react';
import { Shield, Eye, CreditCard as Edit, Trash2, Ligature as FileSignature, Share, Download, Clock } from 'lucide-react';
import { ehrService } from '../../services/ehrService';

interface AuditTrailViewerProps {
  resourceType: string;
  resourceId: string;
}

export default function AuditTrailViewer({ resourceType, resourceId }: AuditTrailViewerProps) {
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [integrityStatus, setIntegrityStatus] = useState<boolean | null>(null);

  useEffect(() => {
    loadAuditTrail();
  }, [resourceType, resourceId]);

  const loadAuditTrail = async () => {
    setLoading(true);
    try {
      const trail = await ehrService.getAuditTrail(resourceType, resourceId);
      setAuditLog(trail);
    } catch (error) {
      console.error('Error loading audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyIntegrity = async () => {
    setVerifying(true);
    try {
      const isValid = await ehrService.verifyDataIntegrity(resourceType, resourceId);
      setIntegrityStatus(isValid);
    } catch (error) {
      console.error('Error verifying integrity:', error);
      setIntegrityStatus(false);
    } finally {
      setVerifying(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <FileSignature className="w-4 h-4" />;
      case 'read':
        return <Eye className="w-4 h-4" />;
      case 'update':
        return <Edit className="w-4 h-4" />;
      case 'delete':
        return <Trash2 className="w-4 h-4" />;
      case 'sign':
        return <FileSignature className="w-4 h-4" />;
      case 'share':
        return <Share className="w-4 h-4" />;
      case 'export':
        return <Download className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'read':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'update':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'delete':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'sign':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'share':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'export':
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Cryptographic Audit Trail
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Immutable record of all actions
            </p>
          </div>
        </div>

        <button
          onClick={verifyIntegrity}
          disabled={verifying}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
        >
          <Shield className="w-4 h-4" />
          {verifying ? 'Verifying...' : 'Verify Integrity'}
        </button>
      </div>

      {integrityStatus !== null && (
        <div
          className={`mb-4 p-4 rounded-lg border ${
            integrityStatus
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield
              className={`w-5 h-5 ${
                integrityStatus ? 'text-green-600' : 'text-red-600'
              }`}
            />
            <p
              className={`font-semibold ${
                integrityStatus
                  ? 'text-green-900 dark:text-green-100'
                  : 'text-red-900 dark:text-red-100'
              }`}
            >
              {integrityStatus
                ? 'Data integrity verified - No tampering detected'
                : 'Data integrity compromised - Possible tampering detected'}
            </p>
          </div>
        </div>
      )}

      {auditLog.length === 0 ? (
        <div className="text-center py-12 text-gray-600 dark:text-gray-400">
          No audit trail entries found
        </div>
      ) : (
        <div className="space-y-4">
          {auditLog.map((entry, index) => (
            <div
              key={entry.id}
              className="relative pl-8 pb-8 border-l-2 border-gray-200 dark:border-gray-700"
            >
              <div
                className={`absolute left-0 top-0 transform -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center ${getActionColor(
                  entry.action
                )}`}
              >
                {getActionIcon(entry.action)}
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${getActionColor(
                        entry.action
                      )}`}
                    >
                      {entry.action.toUpperCase()}
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Block #{entry.block_number}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Actor: {entry.actor_role || 'User'}
                    </p>
                  </div>
                </div>

                {entry.reason && (
                  <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-semibold">Reason:</span> {entry.reason}
                    </p>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                    Hash: {entry.data_hash?.substring(0, 16)}...
                  </div>

                  {entry.previous_hash && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Linked to previous block
                    </div>
                  )}
                </div>

                {entry.blockchain_transaction_id && (
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    Ledger TX: {entry.blockchain_transaction_id}
                  </div>
                )}
              </div>

              {index === auditLog.length - 1 && (
                <div className="absolute left-0 bottom-0 transform -translate-x-1/2 w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-semibold mb-1">Cryptographic Security</p>
            <p>
              All actions are hashed with SHA-256 and linked in an immutable chain. Each entry
              references the previous hash, making tampering mathematically detectable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
