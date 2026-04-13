import { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { providerService } from '../../../../services/providerService';
import {
  providerProfileService,
  ProviderCredential,
} from '../../../../services/providerProfileService';
import { ConfirmDialog } from '../../../../components/ui/confirm-dialog';
import {
  Award,
  Plus,
  Trash2,
  FileText,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Upload,
  Loader2,
  ExternalLink,
  Shield,
  GraduationCap,
  X,
} from 'lucide-react';

const CREDENTIAL_TYPES = [
  { value: 'license', label: 'Medical License' },
  { value: 'certification', label: 'Board Certification' },
  { value: 'education', label: 'Education/Degree' },
  { value: 'malpractice', label: 'Malpractice Insurance' },
  { value: 'other', label: 'Other' },
];

const TYPE_ICONS: Record<string, typeof Award> = {
  license: Shield,
  certification: Award,
  education: GraduationCap,
  malpractice: FileText,
  other: FileText,
};

export default function CredentialsPage() {
  const { user } = useAuth();
  const [providerId, setProviderId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<ProviderCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    credential_type: 'license',
    credential_name: '',
    issuing_organization: '',
    credential_number: '',
    issue_date: '',
    expiry_date: '',
  });
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  useEffect(() => {
    loadProvider();
  }, [user]);

  const loadProvider = async () => {
    if (!user) return;
    try {
      const provider = await providerService.getProviderByUserId(user.id);
      if (provider) {
        setProviderId(provider.id);
        await loadCredentials(provider.id);
      }
    } catch (error) {
      console.error('Error loading provider:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCredentials = async (pid: string) => {
    try {
      const data = await providerProfileService.getCredentials(pid);
      setCredentials(data);
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerId) return;

    setSaving(true);
    setMessage(null);

    try {
      let documentUrl: string | undefined;
      if (documentFile) {
        documentUrl = await providerProfileService.uploadCredentialDocument(documentFile);
      }

      await providerProfileService.addCredential(providerId, {
        credential_type: formData.credential_type,
        credential_name: formData.credential_name,
        issuing_organization: formData.issuing_organization,
        credential_number: formData.credential_number || undefined,
        issue_date: formData.issue_date || undefined,
        expiry_date: formData.expiry_date || undefined,
        document_url: documentUrl,
      });

      setMessage({ type: 'success', text: 'Credential added successfully' });
      setShowAddModal(false);
      setFormData({
        credential_type: 'license',
        credential_name: '',
        issuing_organization: '',
        credential_number: '',
        issue_date: '',
        expiry_date: '',
      });
      setDocumentFile(null);
      await loadCredentials(providerId);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to add credential' });
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async (id: string) => {
    if (!providerId) return;

    try {
      await providerProfileService.deleteCredential(id);
      setMessage({ type: 'success', text: 'Credential removed' });
      await loadCredentials(providerId);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to remove credential' });
    }
  };

  const getStatus = (cred: ProviderCredential) => {
    if (!cred.expiry_date) return 'active';
    const expiry = new Date(cred.expiry_date);
    const now = new Date();
    if (expiry < now) return 'expired';
    const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilExpiry <= 90) return 'expiring_soon';
    return 'active';
  };

  const STATUS_STYLES: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    expired: 'bg-red-50 text-red-700',
    expiring_soon: 'bg-amber-50 text-amber-700',
  };

  const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    expired: 'Expired',
    expiring_soon: 'Expiring Soon',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!providerId) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-amber-800 mb-2">Complete Your Registration</h2>
          <p className="text-amber-700">
            Your provider profile is not yet complete. Please complete your registration first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </div>
          <button onClick={() => setMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credentials & Certifications</h1>
          <p className="text-gray-600 mt-1">
            Manage your professional credentials, licenses, and certifications
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Credential
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {credentials.filter((c) => c.is_verified).length}
              </p>
              <p className="text-sm text-gray-500">Verified</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {credentials.filter((c) => !c.is_verified).length}
              </p>
              <p className="text-sm text-gray-500">Pending Verification</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {credentials.filter((c) => getStatus(c) === 'expired' || getStatus(c) === 'expiring_soon').length}
              </p>
              <p className="text-sm text-gray-500">Need Attention</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {credentials.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 p-12 text-center">
            <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No credentials added yet
            </h3>
            <p className="text-gray-500 mb-6">
              Add your professional credentials to build trust with patients
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Add Your First Credential
            </button>
          </div>
        ) : (
          credentials.map((credential) => {
            const status = getStatus(credential);
            const Icon = TYPE_ICONS[credential.credential_type] || FileText;

            return (
              <div
                key={credential.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {credential.credential_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {credential.issuing_organization}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}
                        >
                          {STATUS_LABELS[status]}
                        </span>
                        <button
                          onClick={() => setDeleteTargetId(credential.id)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <span className="text-xs text-gray-500">Type</span>
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {credential.credential_type}
                        </p>
                      </div>
                      {credential.credential_number && (
                        <div>
                          <span className="text-xs text-gray-500">Number</span>
                          <p className="text-sm font-medium text-gray-900 font-mono">
                            {credential.credential_number}
                          </p>
                        </div>
                      )}
                      {credential.issue_date && (
                        <div>
                          <span className="text-xs text-gray-500">Issued</span>
                          <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {new Date(credential.issue_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {credential.expiry_date && (
                        <div>
                          <span className="text-xs text-gray-500">Expires</span>
                          <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {new Date(credential.expiry_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs">
                        {credential.is_verified ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Clock className="w-4 h-4" />
                            Pending Verification
                          </span>
                        )}
                      </div>
                      {credential.document_url && (
                        <a
                          href={credential.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View Document
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add New Credential</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Enter your credential details below
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Credential Type *
                </label>
                <select
                  required
                  value={formData.credential_type}
                  onChange={(e) => setFormData({ ...formData, credential_type: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CREDENTIAL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Credential Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Medical License, Board Certification in Family Medicine"
                  value={formData.credential_name}
                  onChange={(e) => setFormData({ ...formData, credential_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Issuing Organization *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., College of Physicians and Surgeons of Ontario"
                  value={formData.issuing_organization}
                  onChange={(e) => setFormData({ ...formData, issuing_organization: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Credential Number
                </label>
                <input
                  type="text"
                  placeholder="e.g., CPSO-12345"
                  value={formData.credential_number}
                  onChange={(e) => setFormData({ ...formData, credential_number: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Upload Document
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="mt-2 text-xs text-gray-500">PDF, JPG, or PNG (Max 10MB)</p>
                  {documentFile && (
                    <p className="mt-1 text-sm text-green-600">{documentFile.name}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Credential'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Remove Credential"
        description="Are you sure you want to remove this credential?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => deleteTargetId && executeDelete(deleteTargetId)}
      />
    </div>
  );
}
