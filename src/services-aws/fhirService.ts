import { api } from '../lib/api-client';

export interface FHIRResource {
  id: string;
  resource_type: string;
  resource_id: string;
  patient_id: string;
  provider_id: string | null;
  resource_data: any;
  version: number;
  last_updated: string;
  created_at: string;
}

export interface LabResult {
  id: string;
  test_name: string;
  value: number;
  unit: string;
  reference_range: string;
  status: 'normal' | 'abnormal' | 'critical';
  date: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface VitalSign {
  id: string;
  type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'weight' | 'height' | 'bmi' | 'glucose' | 'oxygen_saturation';
  value: string;
  unit: string;
  date: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface Immunization {
  id: string;
  vaccine_name: string;
  vaccine_code: string;
  date_administered: string;
  provider: string;
  lot_number?: string;
  expiration_date?: string;
  site?: string;
}

export interface Diagnosis {
  id: string;
  condition: string;
  icd10_code: string;
  onset_date: string;
  status: 'active' | 'resolved' | 'inactive';
  severity?: 'mild' | 'moderate' | 'severe';
  notes?: string;
}

export interface HealthSyncStatus {
  last_sync: string;
  sync_status: 'synced' | 'syncing' | 'error';
  records_synced: number;
  error_message?: string;
}

const LOINC_VITAL_MAP: Record<string, VitalSign['type']> = {
  '85354-9': 'blood_pressure',
  '8480-6': 'blood_pressure',
  '8462-4': 'blood_pressure',
  '8867-4': 'heart_rate',
  '8310-5': 'temperature',
  '29463-7': 'weight',
  '8302-2': 'height',
  '39156-5': 'bmi',
  '2708-6': 'oxygen_saturation',
  '2339-0': 'glucose',
  '9279-1': 'heart_rate',
};

export const fhirService = {
  async getPatientResources(patientId: string, resourceType?: string): Promise<FHIRResource[]> {
    const params: Record<string, any> = { patient_id: patientId };

    if (resourceType) {
      params.resource_type = resourceType;
    }

    const { data, error } = await api.get<FHIRResource[]>('/fhir-resources', { params });
    if (error) throw error;
    return data || [];
  },

  async getLabResults(patientId: string, limit: number = 10): Promise<LabResult[]> {
    const { data, error } = await api.get<any[]>('/fhir-observations', {
      params: { patient_id: patientId, category: 'laboratory', limit },
    });

    if (error) throw error;

    const labResults: LabResult[] = (data || []).map(obs => ({
      id: obs.id,
      test_name: obs.observation_display || 'Unknown Test',
      value: obs.value_quantity ?? 0,
      unit: obs.value_unit || '',
      reference_range: obs.reference_range_text ||
        (obs.reference_range_low != null && obs.reference_range_high != null
          ? `${obs.reference_range_low}-${obs.reference_range_high} ${obs.value_unit || ''}`
          : ''),
      status: this.determineLabStatus(obs.value_quantity, {
        low: obs.reference_range_low,
        high: obs.reference_range_high,
      }),
      date: obs.effective_datetime,
    }));

    return this.calculateTrends(labResults);
  },

  async getVitalSigns(patientId: string, type?: string, limit: number = 30): Promise<VitalSign[]> {
    const { data, error } = await api.get<any[]>('/fhir-observations', {
      params: { patient_id: patientId, category: 'vital-signs', limit },
    });

    if (error) throw error;

    let vitals: VitalSign[] = (data || []).map(obs => {
      const vitalType = LOINC_VITAL_MAP[obs.observation_code] || this.mapVitalType(obs.observation_display);

      let value = '';
      if (obs.components && Array.isArray(obs.components) && obs.components.length > 0) {
        value = obs.components
          .map((c: any) => c.valueQuantity?.value ?? '')
          .filter((v: any) => v !== '')
          .join('/');
      } else if (obs.value_quantity != null) {
        value = String(obs.value_quantity);
      } else if (obs.value_string) {
        value = obs.value_string;
      }

      return {
        id: obs.id,
        type: vitalType,
        value,
        unit: obs.value_unit || 'mmHg',
        date: obs.effective_datetime,
      };
    });

    if (type) {
      vitals = vitals.filter(v => v.type === type);
    }

    return this.calculateVitalTrends(vitals);
  },

  async getImmunizations(patientId: string): Promise<Immunization[]> {
    const { data, error } = await api.get<any[]>('/immunizations', {
      params: { patient_id: patientId },
    });

    if (error) throw error;

    return (data || []).map(imm => ({
      id: imm.id,
      vaccine_name: imm.vaccine_name,
      vaccine_code: imm.vaccine_code || '',
      date_administered: imm.administration_date,
      provider: imm.administering_provider || 'Unknown Provider',
      lot_number: imm.lot_number,
      expiration_date: imm.expiration_date,
      site: imm.site,
    }));
  },

  async getDiagnoses(patientId: string): Promise<Diagnosis[]> {
    const { data, error } = await api.get<any[]>('/fhir-conditions', {
      params: { patient_id: patientId },
    });

    if (error) throw error;

    return (data || []).map(cond => ({
      id: cond.id,
      condition: cond.condition_display || 'Unknown Condition',
      icd10_code: cond.icd10_code || cond.condition_code || '',
      onset_date: cond.onset_datetime || cond.recorded_date || cond.created_at,
      status: (cond.clinical_status === 'resolved' ? 'resolved' :
        cond.clinical_status === 'inactive' ? 'inactive' : 'active') as Diagnosis['status'],
      severity: cond.severity as Diagnosis['severity'],
      notes: cond.notes,
    }));
  },

  async syncFHIRData(patientId: string): Promise<HealthSyncStatus> {
    try {
      const [obsResult, condResult, immResult] = await Promise.all([
        api.get<{ count: number }>('/fhir-observations/count', { params: { patient_id: patientId } }),
        api.get<{ count: number }>('/fhir-conditions/count', { params: { patient_id: patientId } }),
        api.get<{ count: number }>('/immunizations/count', { params: { patient_id: patientId } }),
      ]);

      const totalRecords = (obsResult.data?.count || 0) + (condResult.data?.count || 0) + (immResult.data?.count || 0);

      return {
        last_sync: new Date().toISOString(),
        sync_status: 'synced',
        records_synced: totalRecords,
      };
    } catch {
      return {
        last_sync: new Date().toISOString(),
        sync_status: 'error',
        records_synced: 0,
        error_message: 'Failed to sync FHIR data',
      };
    }
  },

  determineLabStatus(
    value: number,
    referenceRange: any
  ): 'normal' | 'abnormal' | 'critical' {
    if (!referenceRange || value == null) return 'normal';

    const { low, high } = referenceRange;
    if (low == null || high == null) return 'normal';

    if (value < low * 0.7 || value > high * 1.3) return 'critical';
    if (value < low || value > high) return 'abnormal';
    return 'normal';
  },

  mapVitalType(text: string): VitalSign['type'] {
    const lowerText = text?.toLowerCase() || '';

    if (lowerText.includes('blood pressure') || lowerText.includes('bp')) return 'blood_pressure';
    if (lowerText.includes('heart rate') || lowerText.includes('pulse')) return 'heart_rate';
    if (lowerText.includes('temperature') || lowerText.includes('temp')) return 'temperature';
    if (lowerText.includes('weight')) return 'weight';
    if (lowerText.includes('height')) return 'height';
    if (lowerText.includes('bmi') || lowerText.includes('body mass')) return 'bmi';
    if (lowerText.includes('glucose') || lowerText.includes('sugar')) return 'glucose';
    if (lowerText.includes('oxygen') || lowerText.includes('spo2') || lowerText.includes('saturation')) return 'oxygen_saturation';

    return 'blood_pressure';
  },

  calculateTrends<T extends { value: number; date: string }>(results: T[]): (T & { trend?: 'up' | 'down' | 'stable' })[] {
    if (results.length < 2) return results;

    return results.map((result, index) => {
      if (index === results.length - 1) return result;

      const nextResult = results[index + 1];
      if (!nextResult.value) return result;
      const change = ((result.value - nextResult.value) / nextResult.value) * 100;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (change > 5) trend = 'up';
      else if (change < -5) trend = 'down';

      return { ...result, trend };
    });
  },

  calculateVitalTrends(vitals: VitalSign[]): VitalSign[] {
    const grouped = vitals.reduce((acc, vital) => {
      if (!acc[vital.type]) acc[vital.type] = [];
      acc[vital.type].push(vital);
      return acc;
    }, {} as Record<string, VitalSign[]>);

    Object.keys(grouped).forEach(type => {
      const typeVitals = grouped[type];
      if (typeVitals.length < 2) return;

      typeVitals.forEach((vital, index) => {
        if (index === typeVitals.length - 1) return;

        const current = parseFloat(vital.value.split('/')[0]);
        const previous = parseFloat(typeVitals[index + 1].value.split('/')[0]);
        if (isNaN(current) || isNaN(previous) || previous === 0) return;

        const change = ((current - previous) / previous) * 100;

        if (change > 5) vital.trend = 'up';
        else if (change < -5) vital.trend = 'down';
        else vital.trend = 'stable';
      });
    });

    return vitals;
  },

  async getSyncStatus(patientId: string): Promise<HealthSyncStatus> {
    const [obsResult, condResult, immResult] = await Promise.all([
      api.get<any>('/fhir-observations/latest', { params: { patient_id: patientId } }),
      api.get<any>('/fhir-conditions/latest', { params: { patient_id: patientId } }),
      api.get<any>('/immunizations/latest', { params: { patient_id: patientId } }),
    ]);

    const dates = [
      obsResult.data?.effective_datetime,
      condResult.data?.recorded_date,
      immResult.data?.created_at,
    ].filter(Boolean) as string[];

    if (dates.length === 0) {
      return {
        last_sync: 'Never',
        sync_status: 'error',
        records_synced: 0,
        error_message: 'No health records found',
      };
    }

    const lastDate = dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    const [obsCount, condCount, immCount] = await Promise.all([
      api.get<{ count: number }>('/fhir-observations/count', { params: { patient_id: patientId } }),
      api.get<{ count: number }>('/fhir-conditions/count', { params: { patient_id: patientId } }),
      api.get<{ count: number }>('/immunizations/count', { params: { patient_id: patientId } }),
    ]);

    const totalRecords = (obsCount.data?.count || 0) + (condCount.data?.count || 0) + (immCount.data?.count || 0);
    const hoursSinceLastRecord = (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60);

    return {
      last_sync: lastDate,
      sync_status: hoursSinceLastRecord < 720 ? 'synced' : 'error',
      records_synced: totalRecords,
      error_message: hoursSinceLastRecord >= 720 ? 'Data may be outdated' : undefined,
    };
  },
};
