import { supabase } from '../lib/supabase';
import { storageClient } from '../lib/storage-client';
import { validateFileUpload } from '../lib/security';

const USE_S3 = !!import.meta.env.VITE_API_URL;

export const storageService = {
  async uploadMedicalRecord(file: File, patientId: string): Promise<string> {
    const validation = validateFileUpload(file, 'medical');
    if (!validation.valid) throw new Error(validation.error);

    if (USE_S3) {
      const { publicUrl } = await storageClient.uploadFile('medical-records', file);
      return publicUrl;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const fileName = `${patientId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error } = await supabase.storage
      .from('medical-records')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('medical-records')
      .getPublicUrl(fileName);

    return publicUrl;
  },

  async uploadProfilePhoto(file: File, userId: string): Promise<string> {
    const validation = validateFileUpload(file, 'image');
    if (!validation.valid) throw new Error(validation.error);

    if (USE_S3) {
      const { publicUrl } = await storageClient.uploadFile('profile-photos', file);
      return publicUrl;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const fileName = `${userId}/profile.${fileExt}`;

    const { error } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName);

    return publicUrl;
  },

  async uploadPrescriptionAttachment(file: File, prescriptionId: string): Promise<string> {
    const validation = validateFileUpload(file, 'document');
    if (!validation.valid) throw new Error(validation.error);

    if (USE_S3) {
      const { publicUrl } = await storageClient.uploadFile('prescriptions', file);
      return publicUrl;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const fileName = `prescriptions/${prescriptionId}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('prescriptions')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('prescriptions')
      .getPublicUrl(fileName);

    return publicUrl;
  },

  async deleteFile(bucket: string, path: string): Promise<void> {
    if (USE_S3) {
      await storageClient.deleteFile(`${bucket}/${path}`);
      return;
    }

    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  },

  getPublicUrl(bucket: string, path: string): string {
    if (USE_S3) {
      const cloudfront = import.meta.env.VITE_CLOUDFRONT_DOMAIN;
      if (cloudfront) {
        return `https://${cloudfront}/${bucket}/${path}`;
      }
      return `https://${import.meta.env.VITE_S3_BUCKET}.s3.${import.meta.env.VITE_AWS_REGION}.amazonaws.com/${bucket}/${path}`;
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  },

  async uploadIdentityDocument(file: File, userId: string, side: 'front' | 'back'): Promise<string> {
    const validation = validateFileUpload(file, 'image');
    if (!validation.valid) throw new Error(validation.error);

    if (USE_S3) {
      const { publicUrl } = await storageClient.uploadFile('identity-documents', file);
      return publicUrl;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const fileName = `${userId}/${side}_${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('identity-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('identity-documents')
      .getPublicUrl(fileName);

    return publicUrl;
  },

  async downloadFile(bucket: string, path: string): Promise<Blob> {
    if (USE_S3) {
      return storageClient.downloadFile(`${bucket}/${path}`);
    }

    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) throw error;
    return data;
  },

  async uploadFile(file: File, bucket: string, folder?: string): Promise<string> {
    const validation = validateFileUpload(file, 'document');
    if (!validation.valid) throw new Error(validation.error);

    if (USE_S3) {
      const prefix = (folder ? `${bucket}/${folder}` : bucket) as 'profile-photos' | 'medical-records' | 'identity-documents' | 'prescriptions' | 'insurance-cards';
      const { publicUrl } = await storageClient.uploadFile(
        prefix.includes('/') ? prefix.split('/')[0] as 'profile-photos' : prefix,
        file
      );
      return publicUrl;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const fileName = folder
      ? `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      : `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  },

  async listFiles(bucket: string, folder?: string): Promise<unknown[]> {
    if (USE_S3) {
      try {
        const prefix = folder ? `${bucket}/${folder}` : bucket;
        const files = await storageClient.listFiles(prefix);
        return files.map((file) => ({
          id: file.key,
          name: file.key.split('/').pop() || file.key,
          url: this.getPublicUrl(bucket, file.key.replace(`${bucket}/`, '')),
          size: file.size,
          type: 'unknown',
          folder: folder || 'root',
          created_at: file.lastModified,
        }));
      } catch {
        return [];
      }
    }

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(folder, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;

      return (data || []).map((file: { id?: string; name: string; metadata?: { size?: number; mimetype?: string }; created_at?: string }) => ({
        id: file.id,
        name: file.name,
        url: this.getPublicUrl(bucket, folder ? `${folder}/${file.name}` : file.name),
        size: file.metadata?.size || 0,
        type: file.metadata?.mimetype || 'unknown',
        folder: folder || 'root',
        created_at: file.created_at,
      }));
    } catch {
      return [];
    }
  },
};
