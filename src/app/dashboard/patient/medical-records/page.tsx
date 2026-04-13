import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../../../contexts/AuthContext';
import { patientService } from '../../../../services/patientService';
import { medicalRecordService, MedicalRecord } from '../../../../services/medicalRecordService';
import { ConfirmDialog } from '../../../../components/ui/confirm-dialog';
import { FileText, FileImage, Download, Upload, Eye, Trash2, Folder } from 'lucide-react';


export default function MedicalRecords() {
  const { user } = useAuth();
  const [patient, setPatient] = useState<any>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    record_type: '',
    record_date: '',
    description: '',
    category: '',
    tags: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const categories = [
    'all',
    'lab-result',
    'imaging',
    'document',
    'report',
    'note',
  ];

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const patientData = await patientService.getPatientByUserId(user.id);
      setPatient(patientData);

      if (patientData) {
        const recordsData = await medicalRecordService.getPatientRecords(patientData.id);
        setRecords(recordsData);
      }
    } catch (error) {
      console.error('Error loading medical records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!patient || !uploadForm.title || !uploadForm.record_type || !uploadForm.record_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);

    try {
      await medicalRecordService.createMedicalRecord(
        patient.id,
        {
          title: uploadForm.title,
          record_type: uploadForm.record_type as any,
          record_date: uploadForm.record_date,
          description: uploadForm.description || undefined,
          category: uploadForm.category || undefined,
          tags: uploadForm.tags ? uploadForm.tags.split(',').map(t => t.trim()) : undefined,
        },
        selectedFile || undefined
      );

      setShowUploadModal(false);
      setUploadForm({
        title: '',
        record_type: '',
        record_date: '',
        description: '',
        category: '',
        tags: '',
      });
      setSelectedFile(null);
      loadData();
    } catch (error: any) {
      console.error('Error uploading record:', error);
      toast.error('Failed to upload record: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteRecord = (recordId: string) => {
    setDeleteRecordId(recordId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteRecord = async () => {
    if (!deleteRecordId) return;

    try {
      setDeleteLoading(true);
      await medicalRecordService.deleteMedicalRecord(deleteRecordId);
      setDeleteConfirmOpen(false);
      setDeleteRecordId(null);
      loadData();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete record');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <FileText className="text-gray-600" />;

    if (fileType.includes('pdf')) return <FileText className="text-red-600" />;
    if (fileType.includes('image')) return <FileImage className="text-blue-600" />;
    return <FileText className="text-gray-600" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredRecords = selectedCategory === 'all'
    ? records
    : records.filter(record => record.record_type === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading medical records...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Medical Records</h1>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Upload /> Upload Document
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-4 text-sm font-medium capitalize whitespace-nowrap ${
                  selectedCategory === category
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {category.replace('-', ' ')}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Folder className="mx-auto text-5xl mb-4 text-gray-400" />
              <p>No medical records found</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Upload Your First Document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-gray-100 rounded-lg">
                      {getFileIcon(record.file_type)}
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full capitalize">
                      {record.record_type?.replace('-', ' ')}
                    </span>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-2">{record.title}</h3>

                  {record.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {record.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex justify-between">
                      <span>Date:</span>
                      <span className="font-medium">
                        {new Date(record.record_date).toLocaleDateString()}
                      </span>
                    </div>
                    {record.file_size_bytes && (
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span className="font-medium">
                          {formatFileSize(record.file_size_bytes)}
                        </span>
                      </div>
                    )}
                    {record.category && (
                      <div className="flex justify-between">
                        <span>Category:</span>
                        <span className="font-medium capitalize">{record.category}</span>
                      </div>
                    )}
                  </div>

                  {record.tags && record.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {record.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                      <Eye /> View
                    </button>
                    <button className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300">
                      <Download />
                    </button>
                    <button
                      onClick={() => handleDeleteRecord(record.id)}
                      className="px-3 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200"
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open);
          if (!open) setDeleteRecordId(null);
        }}
        title="Delete Record"
        description="Are you sure you want to delete this record?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={confirmDeleteRecord}
        loading={deleteLoading}
      />

      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Upload Medical Document</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Title *
                </label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  placeholder="e.g., Blood Test Results - Jan 2024"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Record Type *
                </label>
                <select
                  value={uploadForm.record_type}
                  onChange={(e) => setUploadForm({ ...uploadForm, record_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select type</option>
                  <option value="lab-result">Lab Result</option>
                  <option value="imaging">Imaging</option>
                  <option value="document">Document</option>
                  <option value="report">Report</option>
                  <option value="note">Note</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Record Date *
                </label>
                <input
                  type="date"
                  value={uploadForm.record_date}
                  onChange={(e) => setUploadForm({ ...uploadForm, record_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Add any notes or description"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  placeholder="e.g., Cardiology, General"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                  placeholder="e.g., urgent, follow-up, chronic"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload File *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="mx-auto text-4xl text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-2">
                    Drag and drop your file here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Supported formats: PDF, JPG, PNG (Max 10MB)
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="mt-4 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                    Choose File
                  </label>
                  {selectedFile && (
                    <p className="mt-2 text-sm text-gray-600">Selected: {selectedFile.name}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleFileUpload}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </button>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
