/*
  # Add RLS policies to patient-owned tables

  Tables covered:
    - `patient_allergies` - Patient allergy records
    - `patient_insurance` - Patient insurance policy details
    - `patient_medications` - Patient active/past medications
    - `emergency_contacts` - Patient emergency contacts
    - `family_relationships` - Parent-child family relationships
    - `medical_records` - Patient medical documents/files
    - `waitlist` - Patient waitlist entries for providers

  Policy pattern:
    - Patients can CRUD their own data
    - Providers with active consent can SELECT
    - Admins can SELECT all
*/

-- patient_allergies
CREATE POLICY "Patients can view own allergies"
  ON patient_allergies FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = patient_allergies.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Patients can insert own allergies"
  ON patient_allergies FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = patient_allergies.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Patients can update own allergies"
  ON patient_allergies FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = patient_allergies.patient_id AND patients.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = patient_allergies.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Patients can delete own allergies"
  ON patient_allergies FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = patient_allergies.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Providers can view patient allergies with consent"
  ON patient_allergies FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patient_consents pc
    JOIN providers pv ON pv.id = pc.provider_id
    WHERE pc.patient_id = patient_allergies.patient_id
    AND pv.user_id = auth.uid()
    AND pc.status = 'active'
    AND pc.start_date <= now()
    AND (pc.end_date IS NULL OR pc.end_date >= now())
  ));

CREATE POLICY "Admins can view all patient allergies"
  ON patient_allergies FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- patient_insurance
CREATE POLICY "Patients can view own insurance"
  ON patient_insurance FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = patient_insurance.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Patients can insert own insurance"
  ON patient_insurance FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = patient_insurance.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Patients can update own insurance"
  ON patient_insurance FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = patient_insurance.patient_id AND patients.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = patient_insurance.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all patient insurance"
  ON patient_insurance FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- patient_medications
CREATE POLICY "Patients can view own medications"
  ON patient_medications FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = patient_medications.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Patients can insert own medications"
  ON patient_medications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = patient_medications.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Patients can update own medications"
  ON patient_medications FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = patient_medications.patient_id AND patients.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = patient_medications.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Providers can view patient medications with consent"
  ON patient_medications FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patient_consents pc
    JOIN providers pv ON pv.id = pc.provider_id
    WHERE pc.patient_id = patient_medications.patient_id
    AND pv.user_id = auth.uid()
    AND pc.status = 'active'
    AND pc.start_date <= now()
    AND (pc.end_date IS NULL OR pc.end_date >= now())
  ));

CREATE POLICY "Admins can view all patient medications"
  ON patient_medications FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- emergency_contacts
CREATE POLICY "Patients can view own emergency contacts"
  ON emergency_contacts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = emergency_contacts.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Patients can insert own emergency contacts"
  ON emergency_contacts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = emergency_contacts.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Patients can update own emergency contacts"
  ON emergency_contacts FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = emergency_contacts.patient_id AND patients.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = emergency_contacts.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Patients can delete own emergency contacts"
  ON emergency_contacts FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = emergency_contacts.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Providers can view patient emergency contacts with consent"
  ON emergency_contacts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patient_consents pc
    JOIN providers pv ON pv.id = pc.provider_id
    WHERE pc.patient_id = emergency_contacts.patient_id
    AND pv.user_id = auth.uid()
    AND pc.status = 'active'
    AND pc.start_date <= now()
    AND (pc.end_date IS NULL OR pc.end_date >= now())
  ));

-- family_relationships
CREATE POLICY "Users can view own family relationships"
  ON family_relationships FOR SELECT TO authenticated
  USING (auth.uid() = parent_user_id OR auth.uid() = child_user_id);

CREATE POLICY "Users can insert family relationships as parent"
  ON family_relationships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = parent_user_id);

CREATE POLICY "Users can update own family relationships"
  ON family_relationships FOR UPDATE TO authenticated
  USING (auth.uid() = parent_user_id)
  WITH CHECK (auth.uid() = parent_user_id);

CREATE POLICY "Users can delete own family relationships"
  ON family_relationships FOR DELETE TO authenticated
  USING (auth.uid() = parent_user_id);

CREATE POLICY "Admins can view all family relationships"
  ON family_relationships FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- medical_records
CREATE POLICY "Patients can view own medical records"
  ON medical_records FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = medical_records.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Patients can insert own medical records"
  ON medical_records FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = medical_records.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Providers can view patient medical records with consent"
  ON medical_records FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patient_consents pc
    JOIN providers pv ON pv.id = pc.provider_id
    WHERE pc.patient_id = medical_records.patient_id
    AND pv.user_id = auth.uid()
    AND pc.status = 'active'
    AND pc.start_date <= now()
    AND (pc.end_date IS NULL OR pc.end_date >= now())
  ));

CREATE POLICY "Providers can insert medical records for patients"
  ON medical_records FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = medical_records.provider_id AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all medical records"
  ON medical_records FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- waitlist
CREATE POLICY "Patients can view own waitlist entries"
  ON waitlist FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = waitlist.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Patients can insert waitlist entries"
  ON waitlist FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = waitlist.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Patients can delete own waitlist entries"
  ON waitlist FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = waitlist.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Providers can view their waitlist"
  ON waitlist FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = waitlist.provider_id AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Providers can update waitlist entries"
  ON waitlist FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = waitlist.provider_id AND providers.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = waitlist.provider_id AND providers.user_id = auth.uid()
  ));
