import { api } from '../lib/api-client';
import { storageClient } from '../lib/storage-client';
import { validateFileUpload } from '../lib/security';

export interface ClinicalAttachment {
  id: string;
  clinical_note_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  attachment_category: string;
  uploaded_by: string;
  created_at: string;
}

export const clinicalAttachmentService = {
  async getAttachments(clinicalNoteId: string): Promise<ClinicalAttachment[]> {
    const { data, error } = await api.get<ClinicalAttachment[]>('/clinical-note-attachments', {
      params: { clinical_note_id: clinicalNoteId, order: 'created_at.desc' }
    });

    if (error) throw error;
    return data || [];
  },

  async uploadAttachment(
    file: File,
    clinicalNoteId: string,
    userId: string,
    category: string = 'other'
  ): Promise<ClinicalAttachment> {
    const validation = validateFileUpload(file, 'medical');
    if (!validation.valid) throw new Error(validation.error);

    const { publicUrl } = await storageClient.uploadFile('medical-records', file);

    const { data, error } = await api.post<ClinicalAttachment>('/clinical-note-attachments', {
      clinical_note_id: clinicalNoteId,
      file_url: publicUrl,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      attachment_category: category,
      uploaded_by: userId,
    });

    if (error) throw error;
    return data!;
  },

  async deleteAttachment(attachmentId: string): Promise<void> {
    const { data: attachment } = await api.get<{ file_url: string }>(`/clinical-note-attachments/${attachmentId}`);

    if (attachment?.file_url) {
      const urlParts = attachment.file_url.split('/medical-records/');
      if (urlParts[1]) {
        await storageClient.deleteFile(`medical-records/${urlParts[1]}`);
      }
    }

    const { error } = await api.delete(`/clinical-note-attachments/${attachmentId}`);

    if (error) throw error;
  },

  async downloadAttachment(fileUrl: string): Promise<Blob> {
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error('Failed to download file');
    return response.blob();
  },

  getFileIcon(fileType: string): string {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType === 'application/pdf') return 'pdf';
    if (fileType.includes('word') || fileType.includes('document')) return 'doc';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return 'spreadsheet';
    return 'file';
  },

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  },
};
