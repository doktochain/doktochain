import { supabase } from '../lib/supabase';
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
    const { data, error } = await supabase
      .from('clinical_note_attachments')
      .select('*')
      .eq('clinical_note_id', clinicalNoteId)
      .order('created_at', { ascending: false });

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

    const fileExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const fileName = `clinical-notes/${clinicalNoteId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('medical-records')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('medical-records')
      .getPublicUrl(fileName);

    const { data, error } = await supabase
      .from('clinical_note_attachments')
      .insert({
        clinical_note_id: clinicalNoteId,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        attachment_category: category,
        uploaded_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAttachment(attachmentId: string): Promise<void> {
    const { data: attachment } = await supabase
      .from('clinical_note_attachments')
      .select('file_url')
      .eq('id', attachmentId)
      .maybeSingle();

    if (attachment?.file_url) {
      const urlParts = attachment.file_url.split('/medical-records/');
      if (urlParts[1]) {
        await supabase.storage.from('medical-records').remove([urlParts[1]]);
      }
    }

    const { error } = await supabase
      .from('clinical_note_attachments')
      .delete()
      .eq('id', attachmentId);

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
