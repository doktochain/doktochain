import { api } from './api-client';

interface PresignedUploadResponse {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

interface PresignedDownloadResponse {
  downloadUrl: string;
}

interface StorageFile {
  key: string;
  size: number;
  lastModified: string;
}

type UploadPrefix =
  | 'profile-photos'
  | 'medical-records'
  | 'identity-documents'
  | 'prescriptions'
  | 'insurance-cards';

export const storageClient = {
  async getUploadUrl(
    prefix: UploadPrefix,
    fileName: string,
    contentType: string,
    fileSize: number
  ): Promise<PresignedUploadResponse> {
    const { data, error } = await api.post<PresignedUploadResponse>('/storage/presign-upload', {
      prefix,
      fileName,
      contentType,
      fileSize,
    });

    if (error || !data) {
      throw new Error(error?.message || 'Failed to get upload URL');
    }

    return data;
  },

  async uploadFile(
    prefix: UploadPrefix,
    file: File
  ): Promise<{ key: string; publicUrl: string }> {
    const { uploadUrl, key, publicUrl } = await this.getUploadUrl(
      prefix,
      file.name,
      file.type,
      file.size
    );

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    return { key, publicUrl };
  },

  async getDownloadUrl(key: string): Promise<string> {
    const { data, error } = await api.post<PresignedDownloadResponse>('/storage/presign-download', {
      key,
    });

    if (error || !data) {
      throw new Error(error?.message || 'Failed to get download URL');
    }

    return data.downloadUrl;
  },

  async deleteFile(key: string): Promise<void> {
    const { error } = await api.delete(`/storage/${encodeURIComponent(key)}`);
    if (error) {
      throw new Error(error.message);
    }
  },

  async listFiles(prefix: string): Promise<StorageFile[]> {
    const { data, error } = await api.get<StorageFile[]>('/storage/list', {
      params: { prefix },
    });

    if (error || !data) {
      throw new Error(error?.message || 'Failed to list files');
    }

    return data;
  },

  async downloadFile(key: string): Promise<Blob> {
    const url = await this.getDownloadUrl(key);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }
    return response.blob();
  },
};
