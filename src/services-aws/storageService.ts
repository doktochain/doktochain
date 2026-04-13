import { storageClient } from '../lib/storage-client';
import { validateFileUpload } from '../lib/security';

type UploadPrefix = 'profile-photos' | 'medical-records' | 'identity-documents' | 'prescriptions' | 'insurance-cards';

export const storageService = {
  async uploadMedicalRecord(file: File, _patientId: string): Promise<string> {
    const validation = validateFileUpload(file, 'medical');
    if (!validation.valid) throw new Error(validation.error);

    const { publicUrl } = await storageClient.uploadFile('medical-records', file);
    return publicUrl;
  },

  async uploadProfilePhoto(file: File, _userId: string): Promise<string> {
    const validation = validateFileUpload(file, 'image');
    if (!validation.valid) throw new Error(validation.error);

    const { publicUrl } = await storageClient.uploadFile('profile-photos', file);
    return publicUrl;
  },

  async uploadPrescriptionAttachment(file: File, _prescriptionId: string): Promise<string> {
    const validation = validateFileUpload(file, 'document');
    if (!validation.valid) throw new Error(validation.error);

    const { publicUrl } = await storageClient.uploadFile('prescriptions', file);
    return publicUrl;
  },

  async deleteFile(bucket: string, path: string): Promise<void> {
    await storageClient.deleteFile(`${bucket}/${path}`);
  },

  getPublicUrl(bucket: string, path: string): string {
    const cloudfront = import.meta.env.VITE_CLOUDFRONT_DOMAIN;
    if (cloudfront) {
      return `https://${cloudfront}/${bucket}/${path}`;
    }
    return `https://${import.meta.env.VITE_S3_BUCKET}.s3.${import.meta.env.VITE_AWS_REGION}.amazonaws.com/${bucket}/${path}`;
  },

  async uploadIdentityDocument(file: File, _userId: string, _side: 'front' | 'back'): Promise<string> {
    const validation = validateFileUpload(file, 'image');
    if (!validation.valid) throw new Error(validation.error);

    const { publicUrl } = await storageClient.uploadFile('identity-documents', file);
    return publicUrl;
  },

  async downloadFile(bucket: string, path: string): Promise<Blob> {
    return storageClient.downloadFile(`${bucket}/${path}`);
  },

  async uploadFile(file: File, bucket: string, folder?: string): Promise<string> {
    const validation = validateFileUpload(file, 'document');
    if (!validation.valid) throw new Error(validation.error);

    const prefix = (folder ? `${bucket}/${folder}` : bucket) as UploadPrefix;
    const { publicUrl } = await storageClient.uploadFile(
      prefix.includes('/') ? prefix.split('/')[0] as UploadPrefix : prefix,
      file
    );
    return publicUrl;
  },

  async listFiles(bucket: string, folder?: string): Promise<unknown[]> {
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
  },
};
