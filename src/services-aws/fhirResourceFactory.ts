import { api } from '../lib/api-client';
import { blockchainAuditService } from './blockchainAuditService';
import type { VitalSigns } from './clinicalNotesService';

const LOINC_CODES: Record<string, { code: string; display: string; unit: string }> = {
  blood_pressure_systolic: { code: '8480-6', display: 'Systolic Blood Pressure', unit: 'mmHg' },
  blood_pressure_diastolic: { code: '8462-4', display: 'Diastolic Blood Pressure', unit: 'mmHg' },
  heart_rate: { code: '8867-4', display: 'Heart Rate', unit: '/min' },
  temperature: { code: '8310-5', display: 'Body Temperature', unit: 'Cel' },
  weight: { code: '29463-7', display: 'Body Weight', unit: 'kg' },
  height: { code: '8302-2', display: 'Body Height', unit: 'cm' },
  respiratory_rate: { code: '9279-1', display: 'Respiratory Rate', unit: '/min' },
  oxygen_saturation: { code: '2708-6', display: 'Oxygen Saturation', unit: '%' },
  bmi: { code: '39156-5', display: 'Body Mass Index', unit: 'kg/m2' },
};

async function computeDataHash(data: Record<string, unknown>): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(JSON.stringify(data));
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const fhirResourceFactory = {
  async createObservation(params: {
    patientId: string;
    providerId?: string;
    appointmentId?: string;
    code: string;
    display: string;
    category: 'vital-signs' | 'laboratory';
    valueQuantity?: number;
    valueUnit?: string;
    valueString?: string;
    components?: { code: string; display: string; value: number; unit: string }[];
    referenceRangeLow?: number;
    referenceRangeHigh?: number;
    referenceRangeText?: string;
    interpretation?: string;
    effectiveDatetime?: string;
    notes?: string;
  }) {
    const loincEntry = Object.values(LOINC_CODES).find(l => l.code === params.code);
    const observationCode = params.code;
    const observationDisplay = params.display || loincEntry?.display || 'Unknown';

    const record = {
      patient_id: params.patientId,
      provider_id: params.providerId || null,
      appointment_id: params.appointmentId || null,
      observation_code: observationCode,
      observation_display: observationDisplay,
      category: [params.category],
      value_quantity: params.valueQuantity ?? null,
      value_unit: params.valueUnit || loincEntry?.unit || null,
      value_string: params.valueString || null,
      components: params.components ? params.components.map(c => ({
        code: { coding: [{ system: 'http://loinc.org', code: c.code, display: c.display }] },
        valueQuantity: { value: c.value, unit: c.unit },
      })) : null,
      reference_range_low: params.referenceRangeLow ?? null,
      reference_range_high: params.referenceRangeHigh ?? null,
      reference_range_text: params.referenceRangeText || null,
      interpretation: params.interpretation || null,
      status: 'final',
      effective_datetime: params.effectiveDatetime || new Date().toISOString(),
      notes: params.notes || null,
    };

    const dataHash = await computeDataHash(record);

    const { data, error } = await api.post<any>('/fhir-observations', { ...record, data_hash: dataHash });

    if (error) throw error;

    try {
      await blockchainAuditService.logEvent({
        eventType: 'record_accessed',
        resourceType: 'fhir_observation',
        resourceId: data.id,
        actorId: params.providerId,
        actorRole: 'provider',
        actionData: {
          action: 'fhir_resource_created',
          resource_type: 'Observation',
          code: observationCode,
          patient_id: params.patientId,
        },
      });
    } catch {}

    return data;
  },

  async createObservationsFromVitals(params: {
    patientId: string;
    providerId: string;
    appointmentId?: string;
    vitals: VitalSigns;
  }) {
    const created = [];
    const { vitals } = params;

    if (vitals.blood_pressure_systolic && vitals.blood_pressure_diastolic) {
      const obs = await this.createObservation({
        patientId: params.patientId,
        providerId: params.providerId,
        appointmentId: params.appointmentId,
        code: '85354-9',
        display: 'Blood Pressure',
        category: 'vital-signs',
        components: [
          {
            code: LOINC_CODES.blood_pressure_systolic.code,
            display: LOINC_CODES.blood_pressure_systolic.display,
            value: vitals.blood_pressure_systolic,
            unit: 'mmHg',
          },
          {
            code: LOINC_CODES.blood_pressure_diastolic.code,
            display: LOINC_CODES.blood_pressure_diastolic.display,
            value: vitals.blood_pressure_diastolic,
            unit: 'mmHg',
          },
        ],
      });
      created.push(obs);
    }

    if (vitals.heart_rate) {
      const obs = await this.createObservation({
        patientId: params.patientId,
        providerId: params.providerId,
        appointmentId: params.appointmentId,
        code: LOINC_CODES.heart_rate.code,
        display: LOINC_CODES.heart_rate.display,
        category: 'vital-signs',
        valueQuantity: vitals.heart_rate,
        valueUnit: '/min',
      });
      created.push(obs);
    }

    if (vitals.temperature) {
      const tempVal = vitals.temperature_unit === 'F'
        ? (vitals.temperature - 32) * 5 / 9
        : vitals.temperature;
      const obs = await this.createObservation({
        patientId: params.patientId,
        providerId: params.providerId,
        appointmentId: params.appointmentId,
        code: LOINC_CODES.temperature.code,
        display: LOINC_CODES.temperature.display,
        category: 'vital-signs',
        valueQuantity: Math.round(tempVal * 10) / 10,
        valueUnit: 'Cel',
      });
      created.push(obs);
    }

    if (vitals.weight) {
      const weightKg = vitals.weight_unit === 'lbs'
        ? vitals.weight * 0.453592
        : vitals.weight;
      const obs = await this.createObservation({
        patientId: params.patientId,
        providerId: params.providerId,
        appointmentId: params.appointmentId,
        code: LOINC_CODES.weight.code,
        display: LOINC_CODES.weight.display,
        category: 'vital-signs',
        valueQuantity: Math.round(weightKg * 10) / 10,
        valueUnit: 'kg',
      });
      created.push(obs);
    }

    if (vitals.height) {
      const heightCm = vitals.height_unit === 'in'
        ? vitals.height * 2.54
        : vitals.height;
      const obs = await this.createObservation({
        patientId: params.patientId,
        providerId: params.providerId,
        appointmentId: params.appointmentId,
        code: LOINC_CODES.height.code,
        display: LOINC_CODES.height.display,
        category: 'vital-signs',
        valueQuantity: Math.round(heightCm * 10) / 10,
        valueUnit: 'cm',
      });
      created.push(obs);
    }

    if (vitals.respiratory_rate) {
      const obs = await this.createObservation({
        patientId: params.patientId,
        providerId: params.providerId,
        appointmentId: params.appointmentId,
        code: LOINC_CODES.respiratory_rate.code,
        display: LOINC_CODES.respiratory_rate.display,
        category: 'vital-signs',
        valueQuantity: vitals.respiratory_rate,
        valueUnit: '/min',
      });
      created.push(obs);
    }

    if (vitals.oxygen_saturation) {
      const obs = await this.createObservation({
        patientId: params.patientId,
        providerId: params.providerId,
        appointmentId: params.appointmentId,
        code: LOINC_CODES.oxygen_saturation.code,
        display: LOINC_CODES.oxygen_saturation.display,
        category: 'vital-signs',
        valueQuantity: vitals.oxygen_saturation,
        valueUnit: '%',
      });
      created.push(obs);
    }

    if (vitals.bmi) {
      const obs = await this.createObservation({
        patientId: params.patientId,
        providerId: params.providerId,
        appointmentId: params.appointmentId,
        code: LOINC_CODES.bmi.code,
        display: LOINC_CODES.bmi.display,
        category: 'vital-signs',
        valueQuantity: vitals.bmi,
        valueUnit: 'kg/m2',
      });
      created.push(obs);
    }

    return created;
  },

  async createCondition(params: {
    patientId: string;
    providerId: string;
    appointmentId?: string;
    conditionCode: string;
    conditionDisplay: string;
    icd10Code?: string;
    snomedCode?: string;
    clinicalStatus?: string;
    severity?: string;
    onsetDatetime?: string;
    notes?: string;
  }) {
    const record = {
      patient_id: params.patientId,
      provider_id: params.providerId,
      appointment_id: params.appointmentId || null,
      condition_code: params.conditionCode,
      condition_display: params.conditionDisplay,
      icd10_code: params.icd10Code || null,
      snomed_code: params.snomedCode || null,
      clinical_status: params.clinicalStatus || 'active',
      verification_status: 'confirmed',
      category: ['problem-list-item'],
      severity: params.severity || null,
      onset_datetime: params.onsetDatetime || new Date().toISOString(),
      notes: params.notes || null,
    };

    const dataHash = await computeDataHash(record);

    const { data, error } = await api.post<any>('/fhir-conditions', { ...record, data_hash: dataHash });

    if (error) throw error;

    try {
      await blockchainAuditService.logEvent({
        eventType: 'record_accessed',
        resourceType: 'fhir_condition',
        resourceId: data.id,
        actorId: params.providerId,
        actorRole: 'provider',
        actionData: {
          action: 'fhir_resource_created',
          resource_type: 'Condition',
          code: params.conditionCode,
          icd10: params.icd10Code,
          patient_id: params.patientId,
        },
      });
    } catch {}

    return data;
  },

  async createConditionsFromDiagnoses(params: {
    patientId: string;
    providerId: string;
    appointmentId?: string;
    diagnosisCodes: string[];
    assessmentText?: string;
  }) {
    const created = [];

    for (const code of params.diagnosisCodes) {
      const condition = await this.createCondition({
        patientId: params.patientId,
        providerId: params.providerId,
        appointmentId: params.appointmentId,
        conditionCode: code,
        conditionDisplay: code,
        icd10Code: code,
        notes: params.assessmentText,
      });
      created.push(condition);
    }

    return created;
  },

  async createMedicationRequest(params: {
    patientId: string;
    providerId: string;
    appointmentId?: string;
    prescriptionId?: string;
    medicationCode: string;
    medicationDisplay: string;
    dinNumber?: string;
    dosageText?: string;
    dosageQuantity?: number;
    dosageUnit?: string;
    frequency?: string;
    route?: string;
    quantityValue?: number;
    quantityUnit?: string;
    supplyDuration?: number;
    numberOfRefills?: number;
    refillsRemaining?: number;
    reasonCode?: string;
    notes?: string;
  }) {
    const record = {
      patient_id: params.patientId,
      provider_id: params.providerId,
      appointment_id: params.appointmentId || null,
      medication_code: params.medicationCode,
      medication_display: params.medicationDisplay,
      din_number: params.dinNumber || null,
      dosage_text: params.dosageText || null,
      dosage_quantity: params.dosageQuantity ?? null,
      dosage_unit: params.dosageUnit || null,
      frequency: params.frequency || null,
      route: params.route || null,
      quantity_value: params.quantityValue ?? null,
      quantity_unit: params.quantityUnit || null,
      supply_duration: params.supplyDuration ?? null,
      number_of_refills: params.numberOfRefills ?? 0,
      refills_remaining: params.refillsRemaining ?? params.numberOfRefills ?? 0,
      status: 'active',
      intent: 'order',
      reason_code: params.reasonCode || null,
      authored_on: new Date().toISOString(),
      notes: params.notes || null,
    };

    const dataHash = await computeDataHash(record);

    const { data, error } = await api.post<any>('/fhir-medication-requests', { ...record, data_hash: dataHash });

    if (error) throw error;

    try {
      await blockchainAuditService.logEvent({
        eventType: 'prescription_created',
        resourceType: 'fhir_medication_request',
        resourceId: data.id,
        actorId: params.providerId,
        actorRole: 'provider',
        actionData: {
          action: 'fhir_resource_created',
          resource_type: 'MedicationRequest',
          medication: params.medicationDisplay,
          patient_id: params.patientId,
        },
      });
    } catch {}

    return data;
  },

  async createAllergyIntolerance(params: {
    patientId: string;
    providerId?: string;
    allergenCode: string;
    allergenDisplay: string;
    allergyType?: string;
    category?: string[];
    criticality?: string;
    clinicalStatus?: string;
    reactionManifestations?: { coding: { code: string; display: string }[] }[];
    reactionSeverity?: string;
    reactionDescription?: string;
    onsetDatetime?: string;
    notes?: string;
  }) {
    const record = {
      patient_id: params.patientId,
      provider_id: params.providerId || null,
      allergen_code: params.allergenCode,
      allergen_display: params.allergenDisplay,
      allergy_type: params.allergyType || 'allergy',
      category: params.category || ['medication'],
      criticality: params.criticality || null,
      clinical_status: params.clinicalStatus || 'active',
      verification_status: 'confirmed',
      reaction_manifestations: params.reactionManifestations || null,
      reaction_severity: params.reactionSeverity || null,
      reaction_description: params.reactionDescription || null,
      onset_datetime: params.onsetDatetime || null,
      notes: params.notes || null,
    };

    const dataHash = await computeDataHash(record);

    const { data, error } = await api.post<any>('/fhir-allergy-intolerances', { ...record, data_hash: dataHash });

    if (error) throw error;

    try {
      await blockchainAuditService.logEvent({
        eventType: 'record_accessed',
        resourceType: 'fhir_allergy_intolerance',
        resourceId: data.id,
        actorId: params.providerId || params.patientId,
        actorRole: params.providerId ? 'provider' : 'patient',
        actionData: {
          action: 'fhir_resource_created',
          resource_type: 'AllergyIntolerance',
          allergen: params.allergenDisplay,
          patient_id: params.patientId,
        },
      });
    } catch {}

    return data;
  },

  async createImmunization(params: {
    patientId: string;
    vaccineName: string;
    vaccineCode?: string;
    doseNumber: number;
    totalDoses?: number;
    administrationDate: string;
    locationAdministered?: string;
    administeringProvider?: string;
    lotNumber?: string;
    expirationDate?: string;
    route?: string;
    site?: string;
  }) {
    const { data, error } = await api.post<any>('/immunizations', {
      patient_id: params.patientId,
      vaccine_name: params.vaccineName,
      vaccine_code: params.vaccineCode || null,
      dose_number: params.doseNumber,
      total_doses: params.totalDoses || null,
      administration_date: params.administrationDate,
      location_administered: params.locationAdministered || '',
      administering_provider: params.administeringProvider || '',
      lot_number: params.lotNumber || null,
      expiration_date: params.expirationDate || null,
      route: params.route || null,
      site: params.site || null,
    });

    if (error) throw error;

    try {
      await blockchainAuditService.logEvent({
        eventType: 'record_accessed',
        resourceType: 'immunization',
        resourceId: data.id,
        actorId: params.patientId,
        actorRole: 'patient',
        actionData: {
          action: 'fhir_resource_created',
          resource_type: 'Immunization',
          vaccine: params.vaccineName,
          patient_id: params.patientId,
        },
      });
    } catch {}

    return data;
  },
};
