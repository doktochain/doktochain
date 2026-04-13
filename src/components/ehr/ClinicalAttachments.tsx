import { useState, useRef, useCallback } from 'react';
import { Upload, Paperclip, Trash2, Eye, Image as ImageIcon, FileText, File, Download } from 'lucide-react';
import { toast } from 'sonner';
import { clinicalAttachmentService, ClinicalAttachment } from '../../services/clinicalAttachmentService';
import DocumentViewer from '../ui/DocumentViewer';

interface ClinicalAttachmentsProps {
  noteId: string;
  userId: string;
  attachments: ClinicalAttachment[];
  onAttachmentsChange: (attachments: ClinicalAttachment[]) => void;
  readOnly?: boolean;
}

const CATEGORIES = [
  { value: 'lab_result', label: 'Lab Result' },
  { value: 'imaging', label: 'Imaging' },
  { value: 'referral_letter', label: 'Referral Letter' },
  { value: 'consent_form', label: 'Consent Form' },
  { value: 'other', label: 'Other' },
];

export default function ClinicalAttachments({
  noteId,
  userId,
  attachments,
  onAttachmentsChange,
  readOnly = false,
}: ClinicalAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('other');
  const [viewingFile, setViewingFile] = useState<ClinicalAttachment | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newAttachments: ClinicalAttachment[] = [];
      for (const file of Array.from(files)) {
        const attachment = await clinicalAttachmentService.uploadAttachment(
          file, noteId, userId, selectedCategory
        );
        newAttachments.push(attachment);
      }
      onAttachmentsChange([...newAttachments, ...attachments]);
      toast.success(`${newAttachments.length} file(s) uploaded`);
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (attachmentId: string) => {
    try {
      await clinicalAttachmentService.deleteAttachment(attachmentId);
      onAttachmentsChange(attachments.filter(a => a.id !== attachmentId));
      toast.success('Attachment removed');
    } catch {
      toast.error('Failed to remove attachment');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }, [noteId, userId, selectedCategory, attachments]);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
    if (fileType === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      lab_result: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      imaging: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      referral_letter: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      consent_form: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
      other: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[category] || colors.other;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Paperclip className="w-4 h-4" />
          Attachments ({attachments.length})
        </h4>
      </div>

      {!readOnly && (
        <div className="flex items-center gap-3 mb-3">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      )}

      {!readOnly && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
            dragOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.dicom"
            onChange={e => handleUpload(e.target.files)}
          />
          <Upload className={`w-8 h-8 mx-auto mb-2 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
          {uploading ? (
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Uploading...</p>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Drop files here or click to upload
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                PDF, images, documents, DICOM -- up to 10MB each
              </p>
            </>
          )}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map(att => (
            <div
              key={att.id}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {getFileIcon(att.file_type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{att.file_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryBadge(att.attachment_category)}`}>
                    {att.attachment_category.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-gray-400">
                    {clinicalAttachmentService.formatFileSize(att.file_size)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setViewingFile(att)}
                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                  title="Preview"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <a
                  href={att.file_url}
                  download={att.file_name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </a>
                {!readOnly && (
                  <button
                    onClick={() => handleDelete(att.id)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingFile && (
        <DocumentViewer
          fileUrl={viewingFile.file_url}
          fileName={viewingFile.file_name}
          fileType={viewingFile.file_type}
          onClose={() => setViewingFile(null)}
        />
      )}
    </div>
  );
}
