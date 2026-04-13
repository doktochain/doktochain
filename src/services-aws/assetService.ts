import { api } from '../lib/api-client';
import { adminCRUDService } from './adminCRUDService';

export interface MedicalAsset {
  id?: string;
  asset_name: string;
  asset_type: string;
  serial_number?: string;
  manufacturer?: string;
  model?: string;
  purchase_date?: string;
  warranty_expiry?: string;
  location_id?: string;
  status?: 'active' | 'maintenance' | 'retired';
  last_maintenance?: string;
  next_maintenance?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

class AssetService {
  async getAllAssets(includeRetired: boolean = false): Promise<any[]> {
    const params: Record<string, any> = { deleted_at: null };

    if (!includeRetired) {
      params.exclude_status = 'retired';
    }

    const { data, error } = await api.get<any[]>('/medical-assets', { params });
    if (error) throw error;
    return data || [];
  }

  async getAssetById(id: string): Promise<MedicalAsset> {
    return await adminCRUDService.getById('medical_assets', id);
  }

  async createAsset(asset: Omit<MedicalAsset, 'id' | 'created_at' | 'updated_at'>): Promise<MedicalAsset> {
    return await adminCRUDService.create('medical_assets', asset);
  }

  async updateAsset(id: string, updates: Partial<MedicalAsset>): Promise<MedicalAsset> {
    const currentData = await this.getAssetById(id);
    return await adminCRUDService.update('medical_assets', id, updates, currentData);
  }

  async deleteAsset(id: string, reason?: string): Promise<void> {
    await adminCRUDService.softDelete('medical_assets', id, reason);
  }

  async restoreAsset(id: string): Promise<MedicalAsset> {
    return await adminCRUDService.restore('medical_assets', id);
  }

  async updateAssetStatus(id: string, status: string): Promise<void> {
    const currentData = await this.getAssetById(id);
    await adminCRUDService.update('medical_assets', id, { status }, currentData);
  }

  async getAssetsByLocation(locationId: string): Promise<MedicalAsset[]> {
    const { data, error } = await api.get<MedicalAsset[]>('/medical-assets', {
      params: { location_id: locationId, deleted_at: null },
    });

    if (error) throw error;
    return data || [];
  }

  async getAssetsByStatus(status: string): Promise<MedicalAsset[]> {
    const { data, error } = await api.get<MedicalAsset[]>('/medical-assets', {
      params: { status, deleted_at: null },
    });

    if (error) throw error;
    return data || [];
  }

  async getAssetsDueForMaintenance(): Promise<MedicalAsset[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await api.get<MedicalAsset[]>('/medical-assets', {
      params: {
        next_maintenance_before: today,
        deleted_at: null,
        status: 'active',
      },
    });

    if (error) throw error;
    return data || [];
  }

  async recordMaintenance(id: string, nextMaintenanceDate: string, notes?: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const currentData = await this.getAssetById(id);

    await adminCRUDService.update('medical_assets', id, {
      last_maintenance: today,
      next_maintenance: nextMaintenanceDate,
      notes: notes || currentData.notes,
      status: 'active',
    }, currentData);
  }

  async transferAsset(id: string, newLocationId: string, reason?: string): Promise<void> {
    const currentData = await this.getAssetById(id);
    await adminCRUDService.update('medical_assets', id, {
      location_id: newLocationId,
    }, currentData);

    await adminCRUDService.logAudit({
      action: 'transfer',
      entity_type: 'medical_assets',
      entity_id: id,
      changes: {
        before: { location_id: currentData.location_id },
        after: { location_id: newLocationId },
      },
      reason,
    });
  }

  async searchAssets(searchTerm: string): Promise<MedicalAsset[]> {
    return await adminCRUDService.search(
      'medical_assets',
      searchTerm,
      ['asset_name', 'asset_type', 'serial_number', 'manufacturer', 'model']
    );
  }

  async exportAssets(): Promise<Blob> {
    return await adminCRUDService.exportToCSV('medical_assets');
  }
}

export const assetService = new AssetService();
