import { api } from '../lib/api-client';

export interface FHIREndpoint {
  id: string;
  name: string;
  description?: string;
  base_url: string;
  fhir_version: string;
  province?: string;
  authentication_type: string;
  auth_config: Record<string, any>;
  supported_resources: string[];
  status: 'active' | 'inactive' | 'testing';
  last_sync_at?: string;
  sync_frequency_minutes: number;
  headers: Record<string, any>;
  is_primary: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FHIRMedicationRequest {
  id: string;
  fhir_id: string;
  prescription_id?: string;
  status: string;
  intent: string;
  priority: string;
  medication_code_system?: string;
  medication_code: string;
  medication_display: string;
  patient_reference: string;
  patient_id?: string;
  practitioner_reference: string;
  provider_id?: string;
  authored_on: string;
  dosage_instruction: any[];
  dispense_request: Record<string, any>;
  substitution: Record<string, any>;
  raw_fhir_resource: Record<string, any>;
  sync_status: 'pending' | 'synced' | 'failed' | 'conflict';
  last_synced_at?: string;
  sync_error?: string;
}

export interface FHIRMedicationDispense {
  id: string;
  fhir_id: string;
  medication_request_id?: string;
  pharmacy_order_id?: string;
  status: string;
  medication_code: string;
  medication_display: string;
  patient_reference: string;
  patient_id?: string;
  performer_reference: string;
  pharmacy_id?: string;
  quantity?: Record<string, any>;
  days_supply?: number;
  when_prepared?: string;
  when_handed_over?: string;
  dosage_instruction: any[];
  raw_fhir_resource: Record<string, any>;
  sync_status: string;
}

export interface FHIRSyncLog {
  id: string;
  endpoint_id?: string;
  operation_type: string;
  resource_type: string;
  resource_id?: string;
  direction: 'inbound' | 'outbound';
  status: 'success' | 'failed' | 'partial';
  request_payload?: Record<string, any>;
  response_payload?: Record<string, any>;
  error_message?: string;
  validation_errors?: Record<string, any>;
  duration_ms?: number;
  http_status_code?: number;
  created_at: string;
}

export interface ProvincialEHRIntegration {
  id: string;
  province: string;
  system_name: string;
  description?: string;
  fhir_endpoint_id?: string;
  is_enabled: boolean;
  sync_enabled: boolean;
  last_successful_sync?: string;
  sync_schedule_cron: string;
  supported_operations: string[];
  rate_limit_per_hour: number;
  timeout_seconds: number;
  metadata: Record<string, any>;
}

class FHIRInteroperabilityService {
  async getAllEndpoints(): Promise<FHIREndpoint[]> {
    const { data, error } = await api.get<FHIREndpoint[]>('/fhir-endpoints');

    if (error) throw error;
    return data || [];
  }

  async getEndpoint(id: string): Promise<FHIREndpoint | null> {
    const { data, error } = await api.get<FHIREndpoint>(`/fhir-endpoints/${id}`);

    if (error) throw error;
    return data;
  }

  async createEndpoint(endpoint: Partial<FHIREndpoint>): Promise<FHIREndpoint> {
    const { data, error } = await api.post<FHIREndpoint>('/fhir-endpoints', endpoint);

    if (error) throw error;
    return data!;
  }

  async updateEndpoint(id: string, updates: Partial<FHIREndpoint>): Promise<FHIREndpoint> {
    const { data, error } = await api.put<FHIREndpoint>(`/fhir-endpoints/${id}`, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data!;
  }

  async deleteEndpoint(id: string): Promise<void> {
    const { error } = await api.delete(`/fhir-endpoints/${id}`);

    if (error) throw error;
  }

  async testEndpointConnection(endpointId: string): Promise<{
    success: boolean;
    message: string;
    supportedResources?: string[];
    fhirVersion?: string;
    serverName?: string;
  }> {
    const endpoint = await this.getEndpoint(endpointId);
    if (!endpoint) {
      return { success: false, message: 'Endpoint not found' };
    }

    const startTime = Date.now();

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/fhir+json',
      };
      if (endpoint.headers && typeof endpoint.headers === 'object') {
        Object.assign(headers, endpoint.headers);
      }
      if (endpoint.authentication_type === 'bearer' && endpoint.auth_config?.token) {
        headers['Authorization'] = `Bearer ${endpoint.auth_config.token}`;
      } else if (endpoint.authentication_type === 'basic' && endpoint.auth_config?.username) {
        headers['Authorization'] = `Basic ${btoa(`${endpoint.auth_config.username}:${endpoint.auth_config.password || ''}`)}`;
      }

      const response = await fetch(`${endpoint.base_url}/metadata`, {
        method: 'GET',
        headers,
      });

      const durationMs = Date.now() - startTime;

      if (response.ok) {
        let supportedResources: string[] = [];
        let fhirVersion = '';
        let serverName = '';

        try {
          const capabilityStatement = await response.json();

          if (capabilityStatement.resourceType === 'CapabilityStatement') {
            fhirVersion = capabilityStatement.fhirVersion || '';
            serverName = capabilityStatement.software?.name || capabilityStatement.implementation?.description || '';

            const restResources = capabilityStatement.rest?.[0]?.resource;
            if (Array.isArray(restResources)) {
              supportedResources = restResources
                .map((r: any) => r.type)
                .filter(Boolean)
                .sort();
            }
          }
        } catch {}

        await this.logSync({
          endpoint_id: endpointId,
          operation_type: 'read',
          resource_type: 'CapabilityStatement',
          direction: 'inbound',
          status: 'success',
          http_status_code: response.status,
          duration_ms: durationMs,
        });

        const updates: Partial<FHIREndpoint> = {
          status: 'active',
          last_sync_at: new Date().toISOString(),
          metadata: {
            ...endpoint.metadata,
            last_test_success: true,
            last_test_at: new Date().toISOString(),
            server_name: serverName,
            discovered_fhir_version: fhirVersion,
          },
        };

        if (supportedResources.length > 0) {
          updates.supported_resources = supportedResources;
        }
        if (fhirVersion) {
          updates.fhir_version = fhirVersion.startsWith('4') ? 'R4' : fhirVersion.startsWith('5') ? 'R5' : endpoint.fhir_version;
        }

        await this.updateEndpoint(endpointId, updates);

        const resourceCount = supportedResources.length;
        const message = resourceCount > 0
          ? `Connected successfully. ${serverName ? `Server: ${serverName}. ` : ''}${resourceCount} resource types supported.`
          : `Connected successfully.${serverName ? ` Server: ${serverName}.` : ''}`;

        return { success: true, message, supportedResources, fhirVersion, serverName };
      } else {
        await this.logSync({
          endpoint_id: endpointId,
          operation_type: 'read',
          resource_type: 'CapabilityStatement',
          direction: 'inbound',
          status: 'failed',
          http_status_code: response.status,
          duration_ms: durationMs,
          error_message: `HTTP ${response.status}: ${response.statusText}`,
        });

        await this.updateEndpoint(endpointId, {
          metadata: {
            ...endpoint.metadata,
            last_test_success: false,
            last_test_at: new Date().toISOString(),
            last_test_error: `HTTP ${response.status}: ${response.statusText}`,
          },
        });

        return { success: false, message: `HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      await this.logSync({
        endpoint_id: endpointId,
        operation_type: 'read',
        resource_type: 'CapabilityStatement',
        direction: 'inbound',
        status: 'failed',
        error_message: error.message,
        duration_ms: durationMs,
      });

      await this.updateEndpoint(endpointId, {
        metadata: {
          ...endpoint.metadata,
          last_test_success: false,
          last_test_at: new Date().toISOString(),
          last_test_error: error.message,
        },
      }).catch(() => {});

      return { success: false, message: error.message };
    }
  }

  async createMedicationRequest(request: Partial<FHIRMedicationRequest>): Promise<FHIRMedicationRequest> {
    const fhirId = request.fhir_id || `med-req-${Date.now()}`;

    const { data, error } = await api.post<FHIRMedicationRequest>('/fhir-medication-requests', {
      ...request,
      fhir_id: fhirId,
    });

    if (error) throw error;
    return data!;
  }

  async getMedicationRequest(id: string): Promise<FHIRMedicationRequest | null> {
    const { data, error } = await api.get<FHIRMedicationRequest>(`/fhir-medication-requests/${id}`);

    if (error) throw error;
    return data;
  }

  async getMedicationRequestsByPatient(patientId: string): Promise<FHIRMedicationRequest[]> {
    const { data, error } = await api.get<FHIRMedicationRequest[]>('/fhir-medication-requests', {
      params: { patient_id: patientId },
    });

    if (error) throw error;
    return data || [];
  }

  async getMedicationRequestsByProvider(providerId: string): Promise<FHIRMedicationRequest[]> {
    const { data, error } = await api.get<FHIRMedicationRequest[]>('/fhir-medication-requests', {
      params: { provider_id: providerId },
    });

    if (error) throw error;
    return data || [];
  }

  async updateMedicationRequestStatus(
    id: string,
    status: string,
    syncStatus?: string
  ): Promise<FHIRMedicationRequest> {
    const updates: any = { status };
    if (syncStatus) {
      updates.sync_status = syncStatus;
      updates.last_synced_at = new Date().toISOString();
    }

    const { data, error } = await api.put<FHIRMedicationRequest>(`/fhir-medication-requests/${id}`, updates);

    if (error) throw error;
    return data!;
  }

  async createMedicationDispense(dispense: Partial<FHIRMedicationDispense>): Promise<FHIRMedicationDispense> {
    const fhirId = dispense.fhir_id || `med-disp-${Date.now()}`;

    const { data, error } = await api.post<FHIRMedicationDispense>('/fhir-medication-dispenses', {
      ...dispense,
      fhir_id: fhirId,
    });

    if (error) throw error;
    return data!;
  }

  async getMedicationDispensesByPharmacy(pharmacyId: string): Promise<FHIRMedicationDispense[]> {
    const { data, error } = await api.get<FHIRMedicationDispense[]>('/fhir-medication-dispenses', {
      params: { pharmacy_id: pharmacyId },
    });

    if (error) throw error;
    return data || [];
  }

  async getMedicationDispensesByPatient(patientId: string): Promise<FHIRMedicationDispense[]> {
    const { data, error } = await api.get<FHIRMedicationDispense[]>('/fhir-medication-dispenses', {
      params: { patient_id: patientId },
    });

    if (error) throw error;
    return data || [];
  }

  async getMedicationKnowledge(code: string, codeSystem?: string): Promise<any | null> {
    const params: Record<string, any> = { code };

    if (codeSystem) {
      params.code_system = codeSystem;
    }

    const { data, error } = await api.get<any>('/fhir-medication-knowledge', { params });

    if (error) throw error;
    return data;
  }

  async searchMedicationKnowledge(searchTerm: string): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/fhir-medication-knowledge', {
      params: { search: searchTerm, status: 'active', limit: 50 },
    });

    if (error) throw error;
    return data || [];
  }

  async logSync(log: Partial<FHIRSyncLog>): Promise<void> {
    const { error } = await api.post('/fhir-sync-logs', log);

    if (error) console.error('Failed to log FHIR sync:', error);
  }

  async getSyncLogs(filters?: {
    endpointId?: string;
    resourceType?: string;
    status?: string;
    limit?: number;
  }): Promise<FHIRSyncLog[]> {
    const params: Record<string, any> = {};

    if (filters?.endpointId) {
      params.endpoint_id = filters.endpointId;
    }
    if (filters?.resourceType) {
      params.resource_type = filters.resourceType;
    }
    if (filters?.status) {
      params.status = filters.status;
    }

    params.limit = filters?.limit || 100;

    const { data, error } = await api.get<FHIRSyncLog[]>('/fhir-sync-logs', { params });

    if (error) throw error;
    return data || [];
  }

  async getProvincialIntegrations(): Promise<ProvincialEHRIntegration[]> {
    const { data, error } = await api.get<ProvincialEHRIntegration[]>('/provincial-ehr-integrations');

    if (error) throw error;
    return data || [];
  }

  async getProvincialIntegration(province: string): Promise<ProvincialEHRIntegration | null> {
    const { data, error } = await api.get<ProvincialEHRIntegration>('/provincial-ehr-integrations', {
      params: { province },
    });

    if (error) throw error;
    return data;
  }

  async updateProvincialIntegration(
    province: string,
    updates: Partial<ProvincialEHRIntegration>
  ): Promise<ProvincialEHRIntegration> {
    const { data, error } = await api.put<ProvincialEHRIntegration>(`/provincial-ehr-integrations/${province}`, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data!;
  }

  async enableProvincialSync(province: string, enable: boolean): Promise<void> {
    await this.updateProvincialIntegration(province, {
      sync_enabled: enable,
      last_successful_sync: enable ? new Date().toISOString() : undefined
    } as any);
  }

  transformPrescriptionToFHIR(prescription: any, patient: any, provider: any): Record<string, any> {
    return {
      resourceType: 'MedicationRequest',
      id: prescription.id,
      status: this.mapPrescriptionStatus(prescription.status),
      intent: 'order',
      medicationCodeableConcept: {
        coding: [{
          system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
          code: prescription.medication_code || 'unknown',
          display: prescription.medication_name
        }],
        text: prescription.medication_name
      },
      subject: {
        reference: `Patient/${patient.id}`,
        display: patient.full_name
      },
      requester: {
        reference: `Practitioner/${provider.id}`,
        display: provider.full_name
      },
      authoredOn: prescription.prescription_date,
      dosageInstruction: [{
        text: prescription.dosage_instructions,
        timing: {
          repeat: {
            frequency: 1,
            period: 1,
            periodUnit: 'd'
          }
        }
      }],
      dispenseRequest: {
        numberOfRepeatsAllowed: prescription.refills_allowed || 0,
        quantity: {
          value: prescription.quantity,
          unit: 'tablet'
        }
      }
    };
  }

  transformFHIRToPrescription(fhirResource: Record<string, any>): Partial<any> {
    return {
      medication_name: fhirResource.medicationCodeableConcept?.text,
      medication_code: fhirResource.medicationCodeableConcept?.coding?.[0]?.code,
      dosage_instructions: fhirResource.dosageInstruction?.[0]?.text,
      quantity: fhirResource.dispenseRequest?.quantity?.value,
      refills_allowed: fhirResource.dispenseRequest?.numberOfRepeatsAllowed,
      status: this.mapFHIRStatus(fhirResource.status)
    };
  }

  private mapPrescriptionStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'draft',
      'sent': 'active',
      'filled': 'completed',
      'cancelled': 'cancelled'
    };
    return statusMap[status] || 'draft';
  }

  private mapFHIRStatus(fhirStatus: string): string {
    const statusMap: Record<string, string> = {
      'draft': 'pending',
      'active': 'sent',
      'completed': 'filled',
      'cancelled': 'cancelled'
    };
    return statusMap[fhirStatus] || 'pending';
  }
}

export const fhirService = new FHIRInteroperabilityService();
