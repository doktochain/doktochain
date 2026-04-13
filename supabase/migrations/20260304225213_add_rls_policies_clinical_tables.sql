/*
  # Add RLS policies to clinical and provider-owned tables

  Tables covered:
    - `appointment_notes` - Provider SOAP notes for appointments
    - `ai_transcriptions` - AI-generated transcriptions of sessions
    - `consultation_notes` - Inter-provider consultation records
    - `consultation_workflow_steps` - Steps within a consultation session
    - `clinical_data_hashes` - Hash integrity records for clinical data
    - `procedure_notes` - Detailed procedure documentation
    - `provider_digital_signatures` - Provider e-signatures
    - `session_recordings` - Telemedicine session recordings
    - `fhir_allergy_intolerances` - FHIR allergy resources
    - `fhir_procedures` - FHIR procedure resources
    - `fhir_resources` - Generic FHIR resources
    - `blockchain_records` - Blockchain verification records

  Policy pattern:
    - Provider who created can CRUD
    - Patient who is the subject can SELECT
    - Admins can SELECT all
*/

-- appointment_notes (provider-created, patient-readable)
CREATE POLICY "Providers can view own appointment notes"
  ON appointment_notes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = appointment_notes.provider_id AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Providers can insert appointment notes"
  ON appointment_notes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = appointment_notes.provider_id AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Providers can update own appointment notes"
  ON appointment_notes FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = appointment_notes.provider_id AND providers.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = appointment_notes.provider_id AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Patients can view appointment notes for their appointments"
  ON appointment_notes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.id = appointment_notes.appointment_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all appointment notes"
  ON appointment_notes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- ai_transcriptions (linked to telemedicine sessions)
CREATE POLICY "Providers can view session transcriptions"
  ON ai_transcriptions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM telemedicine_sessions ts
    JOIN providers pv ON pv.id = ts.provider_id
    WHERE ts.id = ai_transcriptions.session_id
    AND pv.user_id = auth.uid()
  ));

CREATE POLICY "Providers can insert transcriptions"
  ON ai_transcriptions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM telemedicine_sessions ts
    JOIN providers pv ON pv.id = ts.provider_id
    WHERE ts.id = ai_transcriptions.session_id
    AND pv.user_id = auth.uid()
  ));

CREATE POLICY "Providers can update transcriptions"
  ON ai_transcriptions FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM telemedicine_sessions ts
    JOIN providers pv ON pv.id = ts.provider_id
    WHERE ts.id = ai_transcriptions.session_id
    AND pv.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM telemedicine_sessions ts
    JOIN providers pv ON pv.id = ts.provider_id
    WHERE ts.id = ai_transcriptions.session_id
    AND pv.user_id = auth.uid()
  ));

CREATE POLICY "Patients can view own session transcriptions"
  ON ai_transcriptions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM telemedicine_sessions ts
    JOIN patients p ON p.id = ts.patient_id
    WHERE ts.id = ai_transcriptions.session_id
    AND p.user_id = auth.uid()
  ));

-- consultation_notes (inter-provider, patient-readable)
CREATE POLICY "Referring providers can view consultation notes"
  ON consultation_notes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = consultation_notes.referring_provider_id AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Consultant providers can manage consultation notes"
  ON consultation_notes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = consultation_notes.consultant_provider_id AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Consultant providers can insert consultation notes"
  ON consultation_notes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = consultation_notes.consultant_provider_id AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Consultant providers can update consultation notes"
  ON consultation_notes FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = consultation_notes.consultant_provider_id AND providers.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = consultation_notes.consultant_provider_id AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Patients can view own consultation notes"
  ON consultation_notes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = consultation_notes.patient_id AND patients.user_id = auth.uid()
  ));

-- consultation_workflow_steps (linked to sessions)
CREATE POLICY "Session participants can view workflow steps"
  ON consultation_workflow_steps FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM telemedicine_sessions ts
    JOIN providers pv ON pv.id = ts.provider_id
    WHERE ts.id = consultation_workflow_steps.session_id
    AND pv.user_id = auth.uid()
  ));

CREATE POLICY "Providers can insert workflow steps"
  ON consultation_workflow_steps FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM telemedicine_sessions ts
    JOIN providers pv ON pv.id = ts.provider_id
    WHERE ts.id = consultation_workflow_steps.session_id
    AND pv.user_id = auth.uid()
  ));

CREATE POLICY "Providers can update workflow steps"
  ON consultation_workflow_steps FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM telemedicine_sessions ts
    JOIN providers pv ON pv.id = ts.provider_id
    WHERE ts.id = consultation_workflow_steps.session_id
    AND pv.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM telemedicine_sessions ts
    JOIN providers pv ON pv.id = ts.provider_id
    WHERE ts.id = consultation_workflow_steps.session_id
    AND pv.user_id = auth.uid()
  ));

-- clinical_data_hashes (system-generated integrity records)
CREATE POLICY "Authenticated users can view clinical data hashes"
  ON clinical_data_hashes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can insert clinical data hashes"
  ON clinical_data_hashes FOR INSERT TO authenticated
  WITH CHECK (true);

-- procedure_notes (provider-created, patient-readable)
CREATE POLICY "Providers can view own procedure notes"
  ON procedure_notes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = procedure_notes.provider_id AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Providers can insert procedure notes"
  ON procedure_notes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = procedure_notes.provider_id AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Providers can update own procedure notes"
  ON procedure_notes FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = procedure_notes.provider_id AND providers.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = procedure_notes.provider_id AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Patients can view own procedure notes"
  ON procedure_notes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = procedure_notes.patient_id AND patients.user_id = auth.uid()
  ));

-- provider_digital_signatures (provider-owned)
CREATE POLICY "Providers can view own signatures"
  ON provider_digital_signatures FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = provider_digital_signatures.provider_id AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Providers can insert own signatures"
  ON provider_digital_signatures FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = provider_digital_signatures.provider_id AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all signatures"
  ON provider_digital_signatures FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- session_recordings (linked to telemedicine sessions, consent-required)
CREATE POLICY "Providers can view session recordings"
  ON session_recordings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM telemedicine_sessions ts
    JOIN providers pv ON pv.id = ts.provider_id
    WHERE ts.id = session_recordings.session_id
    AND pv.user_id = auth.uid()
  ));

CREATE POLICY "Patients can view own session recordings"
  ON session_recordings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM telemedicine_sessions ts
    JOIN patients p ON p.id = ts.patient_id
    WHERE ts.id = session_recordings.session_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "System can insert session recordings"
  ON session_recordings FOR INSERT TO authenticated
  WITH CHECK (true);

-- fhir_allergy_intolerances (patient FHIR resources)
CREATE POLICY "Patients can view own FHIR allergies"
  ON fhir_allergy_intolerances FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = fhir_allergy_intolerances.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Providers can view FHIR allergies with consent"
  ON fhir_allergy_intolerances FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patient_consents pc
    JOIN providers pv ON pv.id = pc.provider_id
    WHERE pc.patient_id = fhir_allergy_intolerances.patient_id
    AND pv.user_id = auth.uid()
    AND pc.status = 'active'
    AND pc.start_date <= now()
    AND (pc.end_date IS NULL OR pc.end_date >= now())
  ));

CREATE POLICY "Providers can insert FHIR allergies"
  ON fhir_allergy_intolerances FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = fhir_allergy_intolerances.provider_id AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Providers can update FHIR allergies"
  ON fhir_allergy_intolerances FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = fhir_allergy_intolerances.provider_id AND providers.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = fhir_allergy_intolerances.provider_id AND providers.user_id = auth.uid()
  ));

-- fhir_procedures (patient FHIR resources)
CREATE POLICY "Patients can view own FHIR procedures"
  ON fhir_procedures FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = fhir_procedures.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Providers can view FHIR procedures with consent"
  ON fhir_procedures FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patient_consents pc
    JOIN providers pv ON pv.id = pc.provider_id
    WHERE pc.patient_id = fhir_procedures.patient_id
    AND pv.user_id = auth.uid()
    AND pc.status = 'active'
    AND pc.start_date <= now()
    AND (pc.end_date IS NULL OR pc.end_date >= now())
  ));

CREATE POLICY "Providers can insert FHIR procedures"
  ON fhir_procedures FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = fhir_procedures.provider_id AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Providers can update FHIR procedures"
  ON fhir_procedures FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = fhir_procedures.provider_id AND providers.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = fhir_procedures.provider_id AND providers.user_id = auth.uid()
  ));

-- fhir_resources (generic FHIR resource store)
CREATE POLICY "Patients can view own FHIR resources"
  ON fhir_resources FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = fhir_resources.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Providers can view FHIR resources with consent"
  ON fhir_resources FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patient_consents pc
    JOIN providers pv ON pv.id = pc.provider_id
    WHERE pc.patient_id = fhir_resources.patient_id
    AND pv.user_id = auth.uid()
    AND pc.status = 'active'
    AND pc.start_date <= now()
    AND (pc.end_date IS NULL OR pc.end_date >= now())
  ));

CREATE POLICY "Providers can insert FHIR resources"
  ON fhir_resources FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = fhir_resources.provider_id AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Providers can update FHIR resources"
  ON fhir_resources FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = fhir_resources.provider_id AND providers.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = fhir_resources.provider_id AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all FHIR resources"
  ON fhir_resources FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- blockchain_records (system integrity data)
CREATE POLICY "Authenticated can view blockchain records"
  ON blockchain_records FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can insert blockchain records"
  ON blockchain_records FOR INSERT TO authenticated
  WITH CHECK (true);
