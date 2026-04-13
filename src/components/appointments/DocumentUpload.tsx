import { useState, useRef } from 'react';
import { Upload, File, Trash2, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { enhancedBookingService } from '../../services/enhancedBookingService';

interface DocumentUploadProps {
  appointmentId: string;
  userId: string;
  onUploadComplete?: () => void;
}

interface UploadedDocument {
  id: string;
  fileName: string;
  fileSize: number;
  documentType: string;
  uploadProgress: number;
  uploaded: boolean;
}

export default function DocumentUpload({
  appointmentId,
  userId,
  onUploadComplete,
}: DocumentUploadProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [selectedType, setSelectedType] = useState('lab_result');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentTypes = [
    { value: 'lab_result', label: 'Lab Results' },
    { value: 'imaging', label: 'Imaging/X-Ray' },
    { value: 'referral', label: 'Referral Letter' },
    { value: 'insurance_card', label: 'Insurance Card' },
    { value: 'medical_history', label: 'Medical History' },
    { value: 'other', label: 'Other Document' },
  ];

  const allowedFileTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!allowedFileTypes.includes(file.type)) {
        toast.error(`File "${file.name}" is not a supported format. Please upload PDF, JPG, PNG, or DOC files.`);
        continue;
      }

      // Validate file size
      if (file.size > maxFileSize) {
        toast.error(`File "${file.name}" is too large. Maximum size is 10MB.`);
        continue;
      }

      // Add to documents list
      const docId = `temp-${Date.now()}-${i}`;
      const newDoc: UploadedDocument = {
        id: docId,
        fileName: file.name,
        fileSize: file.size,
        documentType: selectedType,
        uploadProgress: 0,
        uploaded: false,
      };

      setDocuments((prev) => [...prev, newDoc]);

      // Simulate upload with progress
      await uploadFile(file, docId);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File, docId: string) => {
    try {
      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === docId ? { ...doc, uploadProgress: progress } : doc
          )
        );
      }

      // Actually upload the file
      await enhancedBookingService.uploadAppointmentDocument(
        appointmentId,
        file,
        selectedType,
        userId
      );

      setDocuments((prev) =>
        prev.map((doc) => (doc.id === docId ? { ...doc, uploaded: true } : doc))
      );

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(`Failed to upload ${file.name}`);
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    }
  };

  const handleRemove = (docId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-4">Upload Documents</h3>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-900 mb-2">Before Your Appointment</h4>
        <p className="text-sm text-blue-800 mb-2">
          Upload any relevant medical documents to help your provider prepare for your visit:
        </p>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Recent lab results or test reports</li>
          <li>• Imaging or X-ray results</li>
          <li>• Referral letters from other providers</li>
          <li>• Medical history or previous treatment records</li>
        </ul>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Document Type
        </label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {documentTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-6 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition flex flex-col items-center gap-3"
        >
          <Upload className="text-4xl text-gray-400" />
          <div>
            <p className="text-gray-700 font-medium">Click to upload documents</p>
            <p className="text-sm text-gray-500">
              PDF, JPG, PNG, or DOC (max 10MB each)
            </p>
          </div>
        </button>
      </div>

      {documents.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900">Uploaded Documents</h4>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  {doc.uploaded ? (
                    <CheckCircle className="text-green-600 text-xl" />
                  ) : (
                    <File className="text-blue-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {doc.fileName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {documentTypes.find((t) => t.value === doc.documentType)?.label} •{' '}
                        {formatFileSize(doc.fileSize)}
                      </p>
                    </div>

                    {doc.uploaded && (
                      <button
                        onClick={() => handleRemove(doc.id)}
                        className="ml-4 text-red-600 hover:text-red-700"
                      >
                        <Trash2 />
                      </button>
                    )}
                  </div>

                  {!doc.uploaded && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${doc.uploadProgress}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {doc.uploadProgress}%
                        </span>
                      </div>
                      {doc.uploadProgress < 100 && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Loader2 className="animate-spin" />
                          <span>Uploading...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {doc.uploaded && (
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        <CheckCircle />
                        Uploaded & Shared with Provider
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {documents.length > 0 && documents.every((d) => d.uploaded) && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="text-green-600 text-xl mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">
                All documents uploaded successfully
              </p>
              <p className="text-sm text-green-800">
                Your provider will review these documents before your appointment.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
