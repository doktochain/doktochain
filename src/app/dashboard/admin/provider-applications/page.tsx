import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../../../contexts/AuthContext';
import { providerOnboardingService, ProviderOnboardingApplication, VerificationDocument } from '../../../../services/providerOnboardingService';
import { CheckCircle, XCircle, Clock, Eye, FileText, RotateCcw, Search, ChevronRight, User, Stethoscope, MapPin, Shield } from 'lucide-react';

type TabFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'resubmission_required';

export default function ProviderApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ProviderOnboardingApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<ProviderOnboardingApplication | null>(null);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [verificationHistory, setVerificationHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadApplications();
  }, [activeTab]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const apps = await providerOnboardingService.getAllApplications(activeTab);
      setApplications(apps);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadApplicationDetails = async (applicationId: string) => {
    try {
      const [docs, history] = await Promise.all([
        providerOnboardingService.getApplicationDocuments(applicationId),
        providerOnboardingService.getVerificationHistory(applicationId)
      ]);
      setDocuments(docs);
      setVerificationHistory(history);
    } catch (error) {
      console.error('Error loading application details:', error);
    }
  };

  const handleSelectApplication = async (application: ProviderOnboardingApplication) => {
    setSelectedApplication(application);
    setSuccessMessage('');
    await loadApplicationDetails(application.id);
  };

  const handleApproveApplication = async () => {
    if (!selectedApplication || !user) return;
    setActionLoading(true);
    try {
      await providerOnboardingService.approveApplication(selectedApplication.id, user.id);
      setSuccessMessage('Application approved successfully. Provider account has been created.');
      setSelectedApplication(null);
      loadApplications();
    } catch (error) {
      console.error('Error approving application:', error);
      toast.error('Failed to approve application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectApplication = async () => {
    if (!selectedApplication || !user || !actionNotes.trim()) return;
    setActionLoading(true);
    try {
      await providerOnboardingService.rejectApplication(selectedApplication.id, user.id, actionNotes);
      setSuccessMessage('Application has been rejected.');
      setShowRejectModal(false);
      setActionNotes('');
      setSelectedApplication(null);
      loadApplications();
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestResubmission = async () => {
    if (!selectedApplication || !user || !actionNotes.trim()) return;
    setActionLoading(true);
    try {
      await providerOnboardingService.requestResubmission(selectedApplication.id, user.id, actionNotes);
      setSuccessMessage('Resubmission has been requested from the applicant.');
      setShowResubmitModal(false);
      setActionNotes('');
      setSelectedApplication(null);
      loadApplications();
    } catch (error) {
      console.error('Error requesting resubmission:', error);
      toast.error('Failed to request resubmission');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyDocument = async (documentId: string, status: 'verified' | 'rejected', notes?: string) => {
    if (!user) return;
    try {
      await providerOnboardingService.verifyDocument(documentId, status, user.id, notes);
      if (selectedApplication) {
        await loadApplicationDetails(selectedApplication.id);
      }
    } catch (error) {
      console.error('Error verifying document:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      submitted: 'bg-sky-100 text-sky-700',
      under_review: 'bg-amber-100 text-amber-700',
      approved: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700',
      resubmission_required: 'bg-orange-100 text-orange-700'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const filteredApplications = applications.filter(app => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      app.first_name?.toLowerCase().includes(term) ||
      app.last_name?.toLowerCase().includes(term) ||
      app.email?.toLowerCase().includes(term) ||
      app.license_number?.toLowerCase().includes(term)
    );
  });

  const tabs: { key: TabFilter; label: string; count?: number }[] = [
    { key: 'pending', label: 'Pending Review' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'resubmission_required', label: 'Resubmission' },
    { key: 'all', label: 'All' },
  ];

  const isPending = selectedApplication?.application_status === 'submitted' || selectedApplication?.application_status === 'under_review';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Provider Applications</h1>
        <p className="text-gray-600 mt-1">Review and manage provider registration applications</p>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-emerald-800">{successMessage}</p>
          <button onClick={() => setSuccessMessage('')} className="ml-auto text-emerald-600 hover:text-emerald-800">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSelectedApplication(null); setSuccessMessage(''); }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, license..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No applications found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[calc(100vh-320px)] overflow-y-auto">
                {filteredApplications.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => handleSelectApplication(app)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                      selectedApplication?.id === app.id ? 'bg-sky-50 border-l-4 border-l-sky-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {app.first_name} {app.last_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{app.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {app.provider_type} {app.specialty ? `- ${app.specialty}` : ''}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {app.submission_date
                            ? new Date(app.submission_date).toLocaleDateString()
                            : new Date(app.created_at).toLocaleDateString()
                          }
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${getStatusBadge(app.application_status)}`}>
                          {app.application_status.replace(/_/g, ' ')}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow min-h-[600px]">
            {!selectedApplication ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400">
                <FileText className="w-16 h-16 mb-4" />
                <p className="text-lg font-medium">Select an application to review</p>
                <p className="text-sm mt-1">Click on an application from the list to view details</p>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-sky-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          {selectedApplication.first_name} {selectedApplication.last_name}
                        </h2>
                        <p className="text-gray-500">{selectedApplication.email}</p>
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(selectedApplication.application_status)}`}>
                    {selectedApplication.application_status.replace(/_/g, ' ')}
                  </span>
                </div>

                {isPending && (
                  <div className="flex gap-3 p-4 bg-gray-50 rounded-lg">
                    <button
                      onClick={handleApproveApplication}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 font-medium"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => { setShowResubmitModal(true); setActionNotes(''); }}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 font-medium"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Request Changes
                    </button>
                    <button
                      onClick={() => { setShowRejectModal(true); setActionNotes(''); }}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 font-medium"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}

                {selectedApplication.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason</p>
                    <p className="text-sm text-red-700">{selectedApplication.rejection_reason}</p>
                  </div>
                )}

                {selectedApplication.resubmission_notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-amber-800 mb-1">Resubmission Notes</p>
                    <p className="text-sm text-amber-700">{selectedApplication.resubmission_notes}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Stethoscope className="w-4 h-4 text-sky-600" />
                      <h3 className="font-semibold text-gray-900">Professional Info</h3>
                    </div>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Provider Type</dt>
                        <dd className="font-medium text-gray-900 capitalize">{selectedApplication.provider_type}</dd>
                      </div>
                      {selectedApplication.specialty && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Specialty</dt>
                          <dd className="font-medium text-gray-900">{selectedApplication.specialty}</dd>
                        </div>
                      )}
                      {selectedApplication.professional_title && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Title</dt>
                          <dd className="font-medium text-gray-900">{selectedApplication.professional_title}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Experience</dt>
                        <dd className="font-medium text-gray-900">{selectedApplication.years_of_experience} years</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-sky-600" />
                      <h3 className="font-semibold text-gray-900">License Info</h3>
                    </div>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">License Number</dt>
                        <dd className="font-medium text-gray-900">{selectedApplication.license_number}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Province</dt>
                        <dd className="font-medium text-gray-900">{selectedApplication.license_province}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Expiry</dt>
                        <dd className="font-medium text-gray-900">
                          {selectedApplication.license_expiry
                            ? new Date(selectedApplication.license_expiry).toLocaleDateString()
                            : 'N/A'}
                        </dd>
                      </div>
                      {selectedApplication.phone && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Phone</dt>
                          <dd className="font-medium text-gray-900">{selectedApplication.phone}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>

                {selectedApplication.practice_name && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-4 h-4 text-sky-600" />
                      <h3 className="font-semibold text-gray-900">Practice Info</h3>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <dt className="text-gray-500">Practice Name</dt>
                        <dd className="font-medium text-gray-900">{selectedApplication.practice_name}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Phone</dt>
                        <dd className="font-medium text-gray-900">{selectedApplication.practice_phone || 'N/A'}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-gray-500">Address</dt>
                        <dd className="font-medium text-gray-900">
                          {selectedApplication.practice_address_line1}
                          {selectedApplication.practice_address_line2 && `, ${selectedApplication.practice_address_line2}`}
                          <br />
                          {selectedApplication.practice_city}, {selectedApplication.practice_province} {selectedApplication.practice_postal_code}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}

                {selectedApplication.bio && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Professional Biography</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedApplication.bio}</p>
                  </div>
                )}

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Uploaded Documents</h3>
                  {documents.length === 0 ? (
                    <p className="text-sm text-gray-500">No documents uploaded</p>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-sky-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{doc.document_type.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-gray-500">{doc.document_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              doc.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                              doc.verification_status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {doc.verification_status}
                            </span>
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-sky-600 hover:bg-sky-50 rounded"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                            {doc.verification_status === 'pending' && isPending && (
                              <>
                                <button
                                  onClick={() => handleVerifyDocument(doc.id, 'verified')}
                                  className="px-2.5 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700"
                                >
                                  Verify
                                </button>
                                <button
                                  onClick={() => {
                                    const notes = window.prompt('Reason for rejection:');
                                    if (notes) handleVerifyDocument(doc.id, 'rejected', notes);
                                  }}
                                  className="px-2.5 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {verificationHistory.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Activity History</h3>
                    <div className="space-y-3">
                      {verificationHistory.map((event) => (
                        <div key={event.id} className="flex items-start gap-3">
                          <div className="p-1.5 bg-gray-100 rounded-full mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 capitalize">
                              {event.action_type.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-gray-500">{event.action_description}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(event.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Reject Application</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this application. The applicant will be notified.
            </p>
            <textarea
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="Reason for rejection..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectApplication}
                disabled={!actionNotes.trim() || actionLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Request Changes</h3>
            <p className="text-sm text-gray-600 mb-4">
              Describe what the applicant needs to correct or provide. They will be able to update and resubmit their application.
            </p>
            <textarea
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="What needs to be corrected..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowResubmitModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestResubmission}
                disabled={!actionNotes.trim() || actionLoading}
                className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Sending...' : 'Request Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
