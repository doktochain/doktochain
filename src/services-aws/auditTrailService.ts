import { api } from '../lib/api-client';

export interface AuditTrailEntry {
  id: string;
  block_number: number;
  previous_hash?: string;
  current_hash: string;
  timestamp: string;
  event_type: string;
  resource_type: string;
  resource_id: string;
  actor_id?: string;
  actor_role?: string;
  action_data: Record<string, any>;
  metadata: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  location_data?: Record<string, any>;
  verified: boolean;
  verification_timestamp?: string;
  tamper_detected: boolean;
  created_at: string;
}

export interface AuditNode {
  id: string;
  node_name: string;
  node_type: 'audit' | 'verification' | 'backup';
  endpoint_url?: string;
  public_key?: string;
  status: 'active' | 'inactive' | 'maintenance';
  last_sync_block?: number;
  last_sync_at?: string;
  sync_lag_seconds?: number;
  configuration: Record<string, any>;
  performance_metrics: Record<string, any>;
  is_primary: boolean;
}

export interface IntegrityCheck {
  id: string;
  check_type: 'routine' | 'triggered' | 'manual' | 'scheduled';
  start_block: number;
  end_block: number;
  blocks_checked: number;
  status: 'in_progress' | 'completed' | 'failed';
  integrity_status?: 'valid' | 'compromised' | 'suspicious';
  issues_found: number;
  issue_details: any[];
  hash_mismatches: number;
  missing_blocks: number;
  execution_time_ms?: number;
  started_at: string;
  completed_at?: string;
}

export type AuditEventType =
  | 'appointment_created'
  | 'appointment_updated'
  | 'appointment_cancelled'
  | 'appointment_rescheduled'
  | 'prescription_created'
  | 'prescription_sent'
  | 'prescription_validated'
  | 'prescription_filled'
  | 'prescription_cancelled'
  | 'prescription_approved'
  | 'prescription_rejected'
  | 'prescription_redirected'
  | 'order_created'
  | 'order_fulfilled'
  | 'order_delivered'
  | 'clinical_note_created'
  | 'clinical_note_updated'
  | 'clinical_note_signed'
  | 'insurance_claim_submitted'
  | 'insurance_claim_processed'
  | 'insurance_claim_paid'
  | 'payment_processed'
  | 'refund_issued'
  | 'pharmacy_validation'
  | 'delivery_event'
  | 'consent_granted'
  | 'consent_revoked'
  | 'consent_checked'
  | 'consent_window_created'
  | 'consent_window_extended'
  | 'consent_window_expired'
  | 'record_exported'
  | 'record_shared'
  | 'record_accessed'
  | 'data_access'
  | 'cross_provider_access'
  | 'user_login'
  | 'user_logout'
  | `admin_${string}`;

class CryptoAuditTrailService {
  private async getLastBlock(): Promise<AuditTrailEntry | null> {
    const { data, error } = await api.get<AuditTrailEntry[]>('/blockchain-audit-log', {
      params: { order: 'block_number:desc', limit: '1' },
    });

    if (error && error.code !== 'PGRST116') throw error;
    return data && data.length > 0 ? data[0] : null;
  }

  private async calculateHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async logEvent(params: {
    eventType: AuditEventType;
    resourceType: string;
    resourceId: string;
    actorId?: string;
    actorRole?: string;
    actionData: Record<string, any>;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditTrailEntry> {
    const lastBlock = await this.getLastBlock();
    const timestamp = new Date().toISOString();
    const meta = params.metadata || {};

    const hashInput = JSON.stringify({
      previous_hash: lastBlock?.current_hash || '0',
      timestamp,
      event_type: params.eventType,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      action_data: params.actionData,
      metadata: meta,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
    });

    const currentHash = await this.calculateHash(hashInput);

    const { data, error } = await api.post<AuditTrailEntry>('/blockchain-audit-log', {
      previous_hash: lastBlock?.current_hash || null,
      current_hash: currentHash,
      data_hash: currentHash,
      action: params.eventType,
      timestamp,
      event_type: params.eventType,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      actor_id: params.actorId || '00000000-0000-0000-0000-000000000000',
      actor_role: params.actorRole,
      action_data: params.actionData,
      data_after: params.actionData,
      metadata: meta,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      verified: false,
      tamper_detected: false,
    });

    if (error) throw error;
    return data!;
  }

  async logEventSafe(params: {
    eventType: AuditEventType;
    resourceType: string;
    resourceId: string;
    actorId?: string;
    actorRole?: string;
    actionData: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.logEvent(params);
    } catch (err: any) {
      try {
        await api.post('/audit-failures', {
          attempted_event_type: params.eventType,
          attempted_resource_type: params.resourceType,
          attempted_resource_id: params.resourceId,
          attempted_actor_id: params.actorId || null,
          error_message: err?.message || 'Unknown audit logging error',
          attempted_data: params.actionData,
        });
      } catch {
        console.error('Critical: audit logging and failure recording both failed', err);
      }
    }
  }

  async logPrescriptionCreated(prescriptionId: string, providerId: string, patientId: string, details: any): Promise<void> {
    await this.logEvent({
      eventType: 'prescription_created',
      resourceType: 'prescription',
      resourceId: prescriptionId,
      actorId: providerId,
      actorRole: 'provider',
      actionData: {
        patient_id: patientId,
        medication: details.medication,
        dosage: details.dosage,
        quantity: details.quantity,
        refills: details.refills
      }
    });
  }

  async logPharmacyValidation(
    prescriptionId: string,
    pharmacyId: string,
    validationStatus: string,
    details: any
  ): Promise<void> {
    await this.logEvent({
      eventType: 'pharmacy_validation',
      resourceType: 'prescription',
      resourceId: prescriptionId,
      actorId: pharmacyId,
      actorRole: 'pharmacy',
      actionData: {
        validation_status: validationStatus,
        pharmacy_id: pharmacyId,
        validation_checks: details.checks,
        flags: details.flags || []
      }
    });
  }

  async logOrderFulfillment(orderId: string, pharmacyId: string, details: any): Promise<void> {
    await this.logEvent({
      eventType: 'order_fulfilled',
      resourceType: 'pharmacy_order',
      resourceId: orderId,
      actorId: pharmacyId,
      actorRole: 'pharmacy',
      actionData: {
        pharmacy_id: pharmacyId,
        items_filled: details.items,
        total_amount: details.totalAmount,
        filled_at: new Date().toISOString()
      }
    });
  }

  async logDeliveryEvent(orderId: string, deliveryStatus: string, details: any): Promise<void> {
    await this.logEvent({
      eventType: 'delivery_event',
      resourceType: 'pharmacy_order',
      resourceId: orderId,
      actionData: {
        delivery_status: deliveryStatus,
        courier_id: details.courierId,
        location: details.location,
        estimated_delivery: details.estimatedDelivery,
        actual_delivery: details.actualDelivery,
        proof_of_delivery: details.proofUrl
      }
    });
  }

  async logAppointmentCreated(appointmentId: string, patientId: string, providerId: string, details: any): Promise<void> {
    await this.logEvent({
      eventType: 'appointment_created',
      resourceType: 'appointment',
      resourceId: appointmentId,
      actorId: patientId,
      actorRole: 'patient',
      actionData: {
        patient_id: patientId,
        provider_id: providerId,
        appointment_date: details.appointmentDate,
        appointment_type: details.type,
        service: details.service
      }
    });
  }

  async logClinicalNote(noteId: string, providerId: string, patientId: string, action: string): Promise<void> {
    const eventType = `clinical_note_${action}` as AuditEventType;
    await this.logEvent({
      eventType,
      resourceType: 'clinical_note',
      resourceId: noteId,
      actorId: providerId,
      actorRole: 'provider',
      actionData: {
        patient_id: patientId,
        action,
        timestamp: new Date().toISOString()
      }
    });
  }

  async logInsuranceClaim(claimId: string, action: string, details: any): Promise<void> {
    const eventType = `insurance_claim_${action}` as AuditEventType;
    await this.logEvent({
      eventType,
      resourceType: 'insurance_claim',
      resourceId: claimId,
      actorId: details.providerId,
      actorRole: 'provider',
      actionData: {
        claim_number: details.claimNumber,
        patient_id: details.patientId,
        amount: details.amount,
        status: details.status,
        action
      }
    });
  }

  async logPayment(paymentId: string, userId: string, details: any): Promise<void> {
    await this.logEvent({
      eventType: 'payment_processed',
      resourceType: 'payment',
      resourceId: paymentId,
      actorId: userId,
      actionData: {
        amount: details.amount,
        currency: details.currency,
        payment_method: details.paymentMethod,
        transaction_id: details.transactionId,
        status: details.status
      }
    });
  }

  async getAuditTrail(filters?: {
    resourceType?: string;
    resourceId?: string;
    eventType?: string;
    actorId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AuditTrailEntry[]> {
    const params: Record<string, string | number | boolean | undefined> = {
      order: 'block_number:desc',
      limit: filters?.limit || 100,
    };

    if (filters?.resourceType) {
      params.resource_type = filters.resourceType;
    }
    if (filters?.resourceId) {
      params.resource_id = filters.resourceId;
    }
    if (filters?.eventType) {
      params.event_type = filters.eventType;
    }
    if (filters?.actorId) {
      params.actor_id = filters.actorId;
    }
    if (filters?.startDate) {
      params.start_date = filters.startDate;
    }
    if (filters?.endDate) {
      params.end_date = filters.endDate;
    }

    const { data, error } = await api.get<AuditTrailEntry[]>('/blockchain-audit-log', { params });

    if (error) throw error;
    return data || [];
  }

  async getPatientAccessLog(patientId: string, limit: number = 100): Promise<AuditTrailEntry[]> {
    const { data, error } = await api.get<AuditTrailEntry[]>(`/blockchain-audit-log/patient-access/${patientId}`, {
      params: { limit },
    });

    if (error) throw error;
    return data || [];
  }

  async getPrescriptionAuditTrail(prescriptionId: string): Promise<AuditTrailEntry[]> {
    return this.getAuditTrail({
      resourceType: 'prescription',
      resourceId: prescriptionId
    });
  }

  async getOrderAuditTrail(orderId: string): Promise<AuditTrailEntry[]> {
    return this.getAuditTrail({
      resourceType: 'pharmacy_order',
      resourceId: orderId
    });
  }

  async verifyChainIntegrity(
    startBlock?: number,
    endBlock?: number
  ): Promise<{
    isValid: boolean;
    totalBlocks: number;
    validBlocks: number;
    invalidBlocks: number;
    issues: any[];
  }> {
    const result = {
      isValid: true,
      totalBlocks: 0,
      validBlocks: 0,
      invalidBlocks: 0,
      issues: [] as any[]
    };

    const params: Record<string, string | number | boolean | undefined> = {
      order: 'block_number:asc',
    };

    if (startBlock) {
      params.start_block = startBlock;
    }
    if (endBlock) {
      params.end_block = endBlock;
    }

    const { data: blocks, error } = await api.get<AuditTrailEntry[]>('/blockchain-audit-log', { params });

    if (error) throw error;
    if (!blocks) return result;

    result.totalBlocks = blocks.length;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const previousBlock = i > 0 ? blocks[i - 1] : null;

      if (previousBlock && block.previous_hash !== previousBlock.current_hash) {
        result.isValid = false;
        result.invalidBlocks++;
        result.issues.push({
          block_number: block.block_number,
          issue: 'Hash mismatch',
          expected_previous: previousBlock.current_hash,
          actual_previous: block.previous_hash
        });
      } else {
        result.validBlocks++;
      }
    }

    return result;
  }

  async runIntegrityCheck(
    startBlock: number,
    endBlock: number,
    checkType: 'routine' | 'triggered' | 'manual' | 'scheduled' = 'manual'
  ): Promise<IntegrityCheck> {
    const startTime = Date.now();
    const verificationResult = await this.verifyChainIntegrity(startBlock, endBlock);
    const executionTime = Date.now() - startTime;

    const { data, error } = await api.post<IntegrityCheck>('/blockchain-integrity-checks', {
      check_type: checkType,
      start_block: startBlock,
      end_block: endBlock,
      blocks_checked: verificationResult.totalBlocks,
      status: 'completed',
      integrity_status: verificationResult.isValid ? 'valid' : 'compromised',
      issues_found: verificationResult.issues.length,
      issue_details: verificationResult.issues,
      hash_mismatches: verificationResult.invalidBlocks,
      missing_blocks: 0,
      execution_time_ms: executionTime,
      completed_at: new Date().toISOString()
    });

    if (error) throw error;
    return data!;
  }

  async getIntegrityChecks(limit: number = 50): Promise<IntegrityCheck[]> {
    const { data, error } = await api.get<IntegrityCheck[]>('/blockchain-integrity-checks', {
      params: { order: 'started_at:desc', limit },
    });

    if (error) throw error;
    return data || [];
  }

  async getNodes(): Promise<AuditNode[]> {
    const { data, error } = await api.get<AuditNode[]>('/blockchain-nodes', {
      params: { order: 'created_at:desc' },
    });

    if (error) throw error;
    return data || [];
  }

  async getNode(id: string): Promise<AuditNode | null> {
    const { data, error } = await api.get<AuditNode>(`/blockchain-nodes/${id}`);

    if (error) throw error;
    return data;
  }

  async createNode(node: Partial<AuditNode>): Promise<AuditNode> {
    const { data, error } = await api.post<AuditNode>('/blockchain-nodes', node);

    if (error) throw error;
    return data!;
  }

  async updateNode(id: string, updates: Partial<AuditNode>): Promise<AuditNode> {
    const { data, error } = await api.put<AuditNode>(`/blockchain-nodes/${id}`, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data!;
  }

  async getStats(): Promise<{
    totalBlocks: number;
    latestBlock?: AuditTrailEntry;
    totalEvents: Record<string, number>;
    recentActivity: AuditTrailEntry[];
  }> {
    const { data: statsData } = await api.get<{ count: number }>('/blockchain-audit-log/count');

    const latestBlock = await this.getLastBlock();

    const { data: recentActivity } = await api.get<AuditTrailEntry[]>('/blockchain-audit-log', {
      params: { order: 'block_number:desc', limit: 10 },
    });

    const { data: eventCounts } = await api.get<{ event_type: string }[]>('/blockchain-audit-log/event-types');

    const totalEvents: Record<string, number> = {};
    eventCounts?.forEach((row) => {
      totalEvents[row.event_type] = (totalEvents[row.event_type] || 0) + 1;
    });

    return {
      totalBlocks: statsData?.count || 0,
      latestBlock: latestBlock || undefined,
      totalEvents,
      recentActivity: recentActivity || []
    };
  }
}

export const auditTrailService = new CryptoAuditTrailService();
