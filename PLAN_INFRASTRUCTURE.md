# DoktoChain -- Infrastructure Hardening Plan

> This plan covers the **security, consent, audit, and interoperability infrastructure** that underpins all DoktoChain features.
> It is designed to be executed **before or alongside** the feature-completion work in [`PLAN.md`](./PLAN.md).
>
> **Why a separate plan?** `PLAN.md` covers making scaffolded features functional (wiring mock data to real queries, adding Stripe, building UI flows). This plan addresses the **architectural plumbing** beneath those features: encryption, consent enforcement, audit trail integrity, FHIR gateway, cross-role data flow, and schema health.
>
> **Execution order:** Phases 1-4 here should be completed before resuming heavy feature work in `PLAN.md` Phases 4-8 (prescriptions, health records, pharmacy, messaging, billing). Phases 5-6 here wrap up after `PLAN.md` feature work is substantially complete.

---

## How to Read This Plan

- **Phases** are ordered by dependency -- Phase 1 must be done before Phase 2, etc.
- **Tasks** within a phase can often be done in parallel unless noted.
- Each task lists **exactly what to do**, **which files to touch**, and **how to verify it worked**.
- Status tags: `IMPLEMENTED` (code exists and works), `PARTIAL` (some code exists but incomplete), `SCAFFOLDED` (UI or service stub exists, no real logic), `NEW` (build from scratch).
- Every task is scoped so a junior developer can pick it up and complete it independently.

---

## Relationship to PLAN.md

```
PLAN_INFRASTRUCTURE.md              PLAN.md
========================            ========================
Phase 1: Schema & RLS    ------>    Phase 1: Foundation
Phase 2: Consent Engine   ------>   Phase 2-6: Features that need consent
Phase 3: Audit Trail      ------>   Phase 10: Audit integration
Phase 4: FHIR Gateway     ------>   Phase 5: Health Records & FHIR
                                    (Feature work continues...)
Phase 5: Role Integration  <------  Phase 2-9: All role features
Phase 6: Cleanup & Verify  <------  Phase 14: Final integration
```

---

## Current Infrastructure State

| Component | Status | What Exists | What Needs Work |
|-----------|--------|-------------|-----------------|
| SHA-256 Audit Chain | IMPLEMENTED | `blockchainAuditService.ts` with full hash chaining, integrity verification | Not called from most service actions; admin viewer needs real data |
| Consent System | PARTIAL | `patient_consents` table with time-windowed access, RLS policies, share/revoke in `healthRecordsService` | Not enforced in provider data queries; no consent UI for patients during booking; consent not checked in prescription pipeline |
| FHIR Service | PARTIAL | `fhirService.ts` with resource queries, `fhirInteroperabilityService.ts` with endpoint management and MedicationRequest transforms | Sync methods are mocked; no live FHIR server round-trips; no automated resource creation from clinical events |
| Notification Service | IMPLEMENTED | 10 categories, multi-channel preferences, full CRUD | Not triggered from most actions; no Supabase Realtime subscription on frontend |
| Encryption | PARTIAL | SHA-256 for audit hashing via Web Crypto API | No field-level encryption for PHI; relies entirely on Supabase RLS |
| RLS Policies | PARTIAL | Solid patterns exist (owner-based, role-based, consent-gated) | Many tables from `.migrations_to_apply/` may not have policies; some policies use `FOR ALL` instead of separate per-operation policies; some may have infinite recursion risks |
| Schema Health | UNKNOWN | 47 pending migrations in `.migrations_to_apply/`; 80+ migrations already applied | Need to verify which pending migrations are actually needed vs. already applied under different names |

---

## Phase 1: Schema Health & RLS Hardening

**Goal:** Ensure every table exists, every table has RLS enabled, and every RLS policy follows security best practices.

This phase is the foundation -- nothing else works if the schema is broken or data leaks through missing policies.

---

### Task 1.1: Audit All Existing Tables and Identify Gaps

**Status:** NEW

**Goal:** Create a complete inventory of what tables exist in the live database vs. what services expect.

**Steps:**

1. Run `mcp__supabase__list_tables` to get every table currently in the database
2. Open each service file in `src/services/` and search for `.from('table_name')` calls -- list every table name referenced
3. Compare the two lists:
   - Tables that exist in the database AND are referenced by services = OK
   - Tables referenced by services but NOT in the database = MISSING (need migration)
   - Tables in the database but NOT referenced by any service = ORPHANED (note but don't delete)
4. For each MISSING table, check if a migration exists in `.migrations_to_apply/` that creates it
5. Create a checklist document (or comment in this file) with the results

**Files to read:**
- All files in `src/services/*.ts` (search for `.from(` patterns)
- Output of `mcp__supabase__list_tables`
- All files in `.migrations_to_apply/`

**How to verify:** You have a complete list showing every table's status (exists/missing/orphaned). No service file references a table that doesn't exist.

---

### Task 1.2: Apply Missing Table Migrations

**Status:** NEW

**Goal:** For every MISSING table identified in Task 1.1, apply the appropriate migration.

**Steps:**

1. Take the list of MISSING tables from Task 1.1
2. For each missing table, find the corresponding migration in `.migrations_to_apply/`:
   - Read the migration SQL file
   - Check that it uses `CREATE TABLE IF NOT EXISTS` (safe to re-run)
   - Check that it includes `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
   - Check that it includes at least basic RLS policies
3. If the migration is safe, apply it using `mcp__supabase__apply_migration`
4. If the migration is NOT safe (uses `DROP`, lacks `IF NOT EXISTS`, or has no RLS):
   - Write a corrected version of the migration
   - Add `IF NOT EXISTS` guards
   - Add `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
   - Add basic RLS policies following the patterns in the codebase (see Task 1.3)
   - Apply the corrected migration
5. After applying all migrations, re-run `mcp__supabase__list_tables` and verify all MISSING tables now exist

**Important rules:**
- NEVER use `DROP TABLE` or `DROP COLUMN`
- ALWAYS use `IF NOT EXISTS` on `CREATE TABLE`
- ALWAYS use `IF EXISTS` on `ALTER TABLE` modifications
- ALWAYS add `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for every new table
- ALWAYS wrap column additions in `DO $$ BEGIN ... END $$` blocks with `IF NOT EXISTS` checks
- Add a detailed markdown comment block at the top of every migration explaining what it does

**Files to modify:**
- `supabase/migrations/` (new migration files via `mcp__supabase__apply_migration`)

**How to verify:** Run `mcp__supabase__list_tables` again. Every table referenced by a service file now exists. Run `mcp__supabase__execute_sql` with `SELECT tablename FROM pg_tables WHERE schemaname = 'public'` to double-check.

---

### Task 1.3: Audit and Fix RLS Policies on Every Table

**Status:** NEW

**Goal:** Every table in the `public` schema has RLS enabled and has proper per-operation policies.

**Steps:**

1. Run this SQL query to find tables WITHOUT RLS enabled:
   ```sql
   SELECT tablename
   FROM pg_tables
   WHERE schemaname = 'public'
     AND tablename NOT IN (
       SELECT tablename FROM pg_tables t
       JOIN pg_class c ON c.relname = t.tablename
       WHERE t.schemaname = 'public' AND c.relrowsecurity = true
     );
   ```
2. For each table without RLS, apply a migration that enables it:
   ```sql
   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
   ```
3. Run this SQL query to find tables that have RLS enabled but ZERO policies:
   ```sql
   SELECT c.relname as table_name
   FROM pg_class c
   JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind = 'r'
     AND c.relrowsecurity = true
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies p WHERE p.tablename = c.relname
     );
   ```
4. For each table with RLS but no policies (this means ALL access is blocked), create appropriate policies based on the table's purpose:
   - **Patient-owned data** (e.g., `patient_allergies`, `patient_medications`): Patient can CRUD their own rows; provider can SELECT with active consent; admin can SELECT all
   - **Provider-owned data** (e.g., `provider_schedules`, `clinical_notes`): Provider can CRUD their own rows; patient can SELECT notes shared with them; admin can SELECT all
   - **Pharmacy-owned data** (e.g., `pharmacy_inventory`, `pharmacy_orders`): Pharmacy owner/staff can CRUD; patient can SELECT their own orders; admin can SELECT all
   - **System/reference data** (e.g., `specialties_master`, `procedures_master`): All authenticated users can SELECT; only admin can INSERT/UPDATE/DELETE
   - **Shared data** (e.g., `appointments`): Both patient and provider on the appointment can SELECT/UPDATE; admin can SELECT all
5. Fix any policies that use `FOR ALL` -- split them into separate SELECT, INSERT, UPDATE, DELETE policies
6. Fix any policies that use `USING (true)` -- replace with proper ownership or role checks
7. Check for policies with potential infinite recursion (a policy on table A queries table A in its USING clause). The fix is to use a security definer function or restructure the query.

**RLS policy patterns to follow (from the existing codebase):**

Pattern A -- Direct ownership:
```sql
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
```

Pattern B -- Ownership via join:
```sql
CREATE POLICY "Providers can view own settlements"
  ON provider_settlements FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM providers
    WHERE providers.id = provider_settlements.provider_id
    AND providers.user_id = auth.uid()
  ));
```

Pattern C -- Admin access:
```sql
CREATE POLICY "Admins can view all records"
  ON some_table FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));
```

Pattern D -- Consent-gated access (provider accessing patient data):
```sql
CREATE POLICY "Providers can view patient data with consent"
  ON patient_health_data FOR SELECT TO authenticated
  USING (
    -- Patient owns the data
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR
    -- Provider has active consent
    EXISTS (
      SELECT 1 FROM patient_consents pc
      JOIN providers p ON p.id = pc.provider_id
      WHERE pc.patient_id = patient_health_data.patient_id
        AND p.user_id = auth.uid()
        AND pc.status = 'active'
        AND pc.start_date <= now()
        AND (pc.end_date IS NULL OR pc.end_date >= now())
    )
    OR
    -- Admin access
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
```

**Files to modify:**
- `supabase/migrations/` (new migration files for RLS fixes)

**How to verify:**
- Run the "tables without RLS" query again -- should return zero rows
- Run the "tables with RLS but no policies" query -- should return zero rows
- No policy in the database uses `USING (true)` (check with: `SELECT * FROM pg_policies WHERE qual = 'true'`)
- Test as a patient user: can only see own data
- Test as a provider user: can only see data they have consent for

---

### Task 1.4: Create Helper Functions for RLS Policies

**Status:** NEW

**Goal:** Create reusable SQL functions that simplify RLS policies and prevent infinite recursion.

**Steps:**

1. Create a `SECURITY DEFINER` function `is_admin()` that checks if the current user is an admin:
   ```sql
   CREATE OR REPLACE FUNCTION public.is_admin()
   RETURNS boolean
   LANGUAGE sql
   SECURITY DEFINER
   SET search_path = public
   AS $$
     SELECT EXISTS (
       SELECT 1 FROM user_roles
       WHERE user_roles.user_id = auth.uid()
       AND user_roles.role = 'admin'
     );
   $$;
   ```
   - `SECURITY DEFINER` means this function runs with the privileges of the function creator, not the calling user
   - This avoids infinite recursion when the `user_roles` table itself has RLS policies that check admin status

2. Create `get_patient_id()` -- returns the patient record ID for the current auth user:
   ```sql
   CREATE OR REPLACE FUNCTION public.get_patient_id()
   RETURNS uuid
   LANGUAGE sql
   SECURITY DEFINER
   SET search_path = public
   AS $$
     SELECT id FROM patients WHERE user_id = auth.uid() LIMIT 1;
   $$;
   ```

3. Create `get_provider_id()` -- returns the provider record ID for the current auth user:
   ```sql
   CREATE OR REPLACE FUNCTION public.get_provider_id()
   RETURNS uuid
   LANGUAGE sql
   SECURITY DEFINER
   SET search_path = public
   AS $$
     SELECT id FROM providers WHERE user_id = auth.uid() LIMIT 1;
   $$;
   ```

4. Create `get_pharmacy_id()` -- returns the pharmacy record ID for the current auth user:
   ```sql
   CREATE OR REPLACE FUNCTION public.get_pharmacy_id()
   RETURNS uuid
   LANGUAGE sql
   SECURITY DEFINER
   SET search_path = public
   AS $$
     SELECT id FROM pharmacies WHERE owner_id = auth.uid() LIMIT 1;
   $$;
   ```

5. Create `has_active_consent(p_patient_id uuid, p_provider_id uuid)` -- checks if a provider has active, time-valid consent for a patient:
   ```sql
   CREATE OR REPLACE FUNCTION public.has_active_consent(p_patient_id uuid, p_provider_id uuid)
   RETURNS boolean
   LANGUAGE sql
   SECURITY DEFINER
   SET search_path = public
   AS $$
     SELECT EXISTS (
       SELECT 1 FROM patient_consents
       WHERE patient_id = p_patient_id
         AND provider_id = p_provider_id
         AND status = 'active'
         AND start_date <= now()
         AND (end_date IS NULL OR end_date >= now())
     );
   $$;
   ```

6. After creating these functions, update existing RLS policies to use them where appropriate. For example, instead of:
   ```sql
   USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
   ```
   Use:
   ```sql
   USING (public.is_admin())
   ```

**Files to modify:**
- `supabase/migrations/` (one new migration creating all helper functions)

**How to verify:**
- Run `SELECT public.is_admin()` as an admin user -- returns `true`
- Run `SELECT public.is_admin()` as a patient user -- returns `false`
- Run `SELECT public.get_patient_id()` as a patient user -- returns a valid UUID
- Run `SELECT public.has_active_consent(patient_uuid, provider_uuid)` with valid consent -- returns `true`
- Run the same with expired consent -- returns `false`

---

### Task 1.5: Verify No Destructive Pending Migrations

**Status:** NEW

**Goal:** Review all 47 files in `.migrations_to_apply/` and categorize them as safe/unsafe/already-applied.

**Steps:**

1. For each file in `.migrations_to_apply/`, read the SQL and check:
   - Does it use `DROP TABLE` or `DROP COLUMN`? -> Mark as UNSAFE
   - Does it use `CREATE TABLE IF NOT EXISTS`? -> Mark as SAFE (idempotent)
   - Does it create a table that already exists in the database? -> Mark as ALREADY APPLIED
   - Does it add columns to existing tables? -> Check if columns already exist
   - Does it seed data? -> Check if data already exists
2. Create three lists:
   - **SAFE TO APPLY:** Migrations that create new tables/columns not yet in the database, with proper guards
   - **ALREADY APPLIED:** Migrations whose changes are already in the database (skip these)
   - **NEEDS REVIEW:** Migrations with destructive operations or missing guards (rewrite before applying)
3. For each SAFE TO APPLY migration, verify it includes RLS setup
4. Do NOT apply anything in this task -- just categorize. Application happens in Task 1.2.

**Files to read:**
- All 47 files in `.migrations_to_apply/`
- Compare against `mcp__supabase__list_tables` output

**How to verify:** You have a categorized spreadsheet/list of all 47 pending migrations with clear status for each.

---

## Phase 2: Consent Engine Hardening

**Goal:** Make the consent system actually enforce data access boundaries across all data flows, not just in RLS policies but also in frontend service calls and UI.

**Depends on:** Phase 1 (RLS policies and helper functions must exist first)

---

### Task 2.1: Map Every Cross-Boundary Data Access Point

**Status:** NEW

**Goal:** Identify every place in the codebase where one role accesses another role's data.

**Steps:**

1. Search all service files for Supabase queries that access patient data:
   - Search for `.from('patients')`, `.from('patient_medications')`, `.from('patient_allergies')`, `.from('patient_insurance_cards')`, `.from('fhir_observations')`, `.from('clinical_notes')`
   - For each query, note: which service file, which function, what role is expected to call it
2. Categorize each access point:
   - **Patient accessing own data** -- no consent needed, should always work
   - **Provider accessing patient data** -- MUST check consent
   - **Pharmacy accessing prescription data** -- MUST check prescription assignment
   - **Admin accessing any data** -- allowed for management, should still be audit-logged
3. For each "MUST check consent" access point, determine if the current code checks consent:
   - Does the Supabase query join with `patient_consents`?
   - Does the RLS policy on the target table check consent?
   - If NEITHER -- this is a **consent gap** that needs fixing
4. Document every consent gap found

**Files to read:**
- `src/services/patientService.ts`
- `src/services/ehrService.ts`
- `src/services/healthRecordsService.ts`
- `src/services/clinicalNotesService.ts`
- `src/services/prescriptionService.ts`
- `src/services/pharmacyPrescriptionService.ts`
- `src/services/medicalRecordService.ts`
- Any other service that queries patient-owned tables

**How to verify:** You have a complete list of every cross-boundary access point and whether it's consent-gated or not.

---

### Task 2.2: Add Consent Checks to Provider Data Access Services

**Status:** NEW

**Goal:** Every provider-facing service function that reads patient data first verifies active consent exists.

**Steps:**

1. Open `src/services/ehrService.ts`
2. Find every function that takes a `patientId` parameter and queries patient data
3. At the top of each such function, add a consent check:
   ```typescript
   const { data: consent } = await supabase
     .from('patient_consents')
     .select('id')
     .eq('patient_id', patientId)
     .eq('provider_id', providerId)
     .eq('status', 'active')
     .lte('start_date', new Date().toISOString())
     .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
     .maybeSingle();

   if (!consent) {
     throw new Error('No active consent for this patient');
   }
   ```
4. Repeat for `src/services/clinicalNotesService.ts` -- provider viewing patient's notes
5. Repeat for `src/services/healthRecordsService.ts` -- provider viewing patient's records
6. Repeat for `src/services/prescriptionService.ts` -- provider viewing patient's prescription history
7. In each case, also log the data access on the audit trail:
   ```typescript
   await blockchainAuditService.logEvent({
     event_type: 'data_access',
     resource_type: 'patient_health_data',
     resource_id: patientId,
     actor_id: providerId,
     actor_role: 'provider',
     action_data: { accessed_data: 'medications', consent_id: consent.id }
   });
   ```

**Important:** The RLS policies from Phase 1 Task 1.3 (Pattern D) provide a second layer of defense at the database level. The application-level checks here provide better error messages and audit logging.

**Files to modify:**
- `src/services/ehrService.ts`
- `src/services/clinicalNotesService.ts`
- `src/services/healthRecordsService.ts`
- `src/services/prescriptionService.ts`

**How to verify:**
- Call a provider function with a valid consent -- returns data
- Call it with no consent -- throws an error
- Call it with an expired consent (end_date in the past) -- throws an error
- Check that every access creates an audit trail entry

---

### Task 2.3: Build the Consent Management UI for Patients

**Status:** NEW

**Goal:** Patients can view, manage, and revoke all active data-sharing consents from their dashboard.

**Steps:**

1. Create a new component `src/components/patient/ConsentManager.tsx`:
   - Fetch all consents from `patient_consents` where `patient_id` matches the current patient
   - Group by status: Active, Expired, Revoked
   - For each active consent, display:
     - Provider name (join with `providers` and `user_profiles`)
     - Consent type (record_access, treatment, data_sharing)
     - Record types shared (array of strings)
     - Start date
     - End date (or "No expiration")
     - Time remaining (calculated from `end_date - now()`)
   - For each active consent, show a "Revoke Access" button
   - Revoke action:
     - Update consent `status` to `revoked` and set `revoked_at` to now
     - Call `blockchainAuditService.logEvent()` with type `consent_revoked`
     - Show success toast notification

2. Add a "Grant Access" button that opens a modal:
   - Search for providers (by name)
   - Select consent type
   - Select record types to share (checkboxes: all, medications, allergies, lab results, clinical notes, immunizations)
   - Select time window: 7 days, 30 days, 90 days, 1 year, no expiration
   - Confirm -> create `patient_consents` record
   - Call `blockchainAuditService.logEvent()` with type `consent_granted`

3. Wire this component into the patient settings page at `src/app/dashboard/patient/settings/page.tsx` (as a tab or section)

4. Also wire a simplified version into the booking wizard's consent step (`src/components/booking/ConsentFormsStep.tsx`):
   - When patient books with a provider, auto-create a consent record
   - Default scope: all record types
   - Default duration: 90 days (or let patient choose)
   - Patient must check a checkbox to acknowledge the data sharing

**Files to create:**
- `src/components/patient/ConsentManager.tsx`

**Files to modify:**
- `src/app/dashboard/patient/settings/page.tsx` (add consent management section)
- `src/components/booking/ConsentFormsStep.tsx` (add consent creation during booking)
- `src/services/healthRecordsService.ts` (ensure `createRecordShare` creates proper consent record)

**How to verify:**
- Patient can see all their active, expired, and revoked consents
- Patient can grant new consent to a provider with a time window
- Patient can revoke an active consent
- After revoking, the provider can no longer query that patient's data (RLS blocks it)
- Every grant/revoke action creates an audit trail entry

---

### Task 2.4: Add Consent to the Prescription Pipeline

**Status:** NEW

**Goal:** When a provider writes a prescription, consent is automatically created for the pharmacy. When a patient redirects a prescription, consent is transferred.

**Steps:**

1. Open `src/services/prescriptionService.ts`

2. In the function that sends a prescription to a pharmacy (or create one if it doesn't exist):
   - When `pharmacy_id` is set on a prescription, create a consent record:
     ```typescript
     await supabase.from('patient_consents').insert({
       patient_id: prescription.patient_id,
       provider_id: null, // pharmacy consent, not provider
       consent_type: 'data_sharing',
       record_types: ['prescription'],
       start_date: new Date().toISOString(),
       end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
       status: 'active'
     });
     ```
   - Note: You may need to add a `pharmacy_id` column to `patient_consents` or use a generic `grantee_id` + `grantee_type` pattern. Check the current table schema first.
   - If the table only has `provider_id`, create a migration to add `pharmacy_id` (nullable) to `patient_consents`

3. In the function that redirects a prescription to a different pharmacy:
   - Revoke the consent for the old pharmacy (set `status` = `revoked`, `revoked_at` = now)
   - Create a new consent for the new pharmacy
   - Log both actions on the audit chain

4. Add RLS policies to the `prescriptions` table (if not already there) that check:
   - Patient owns the prescription (`patient_id` matches)
   - Provider wrote the prescription (`provider_id` matches)
   - Pharmacy has been assigned the prescription AND has active consent

**Files to modify:**
- `src/services/prescriptionService.ts`
- Possibly a new migration to add `pharmacy_id` to `patient_consents`
- RLS policies on `prescriptions` table

**How to verify:**
- Provider sends prescription to Pharmacy A -> consent record created for Pharmacy A
- Patient redirects prescription to Pharmacy B -> Pharmacy A consent revoked, Pharmacy B consent created
- Pharmacy A can no longer see the prescription (RLS blocks it)
- Pharmacy B can now see the prescription
- All actions appear in the audit trail

---

### Task 2.5: Display Consent Status in Provider and Pharmacy Views

**Status:** NEW

**Goal:** Providers and pharmacies see clear indicators of what data they can access and why.

**Steps:**

1. In provider patient views (e.g., `src/components/provider/PatientChartViewer.tsx`):
   - Before loading patient data, check consent status
   - If consent is active, show a small badge: "Access granted until [date]"
   - If consent is expired or revoked, show: "No active consent -- request access from patient"
   - If consent will expire within 7 days, show a warning: "Access expires in X days"

2. In pharmacy prescription views:
   - Show whether the pharmacy has an active consent to view the prescription
   - If the patient redirected the prescription away, show a clear "Prescription redirected" message instead of the prescription data

3. Create a simple `ConsentStatusBadge` component that takes a consent record and renders the appropriate badge:
   - Active: teal badge with time remaining
   - Expiring soon: amber badge with days remaining
   - Expired: gray badge
   - Revoked: red badge

**Files to create:**
- `src/components/ui/ConsentStatusBadge.tsx`

**Files to modify:**
- `src/components/provider/PatientChartViewer.tsx`
- `src/app/dashboard/pharmacy/prescriptions/page.tsx`

**How to verify:**
- Provider sees consent badge when viewing patient data
- Badge accurately reflects consent status and time remaining
- Expired/revoked consent shows a clear "no access" message

---

## Phase 3: Audit Trail Integration

**Goal:** Ensure every significant action in the platform creates a hash-chained audit entry, and the admin can browse and verify the chain.

**Depends on:** Phase 1 (tables must exist), Phase 2 (consent actions must be audit-logged)

---

### Task 3.1: Create an Audit Logging Wrapper Utility

**Status:** NEW

**Goal:** Make it trivially easy for any service to log an audit event, reducing the chance developers forget to add logging.

**Steps:**

1. Open `src/services/blockchainAuditService.ts` and review the existing `logEvent()` method signature

2. Create a thin wrapper module `src/services/auditLogger.ts` that re-exports simplified logging functions:
   ```typescript
   import { blockchainAuditService } from './blockchainAuditService';

   export const auditLog = {
     appointmentCreated: (appointmentId: string, actorId: string, actorRole: string, data?: Record<string, unknown>) =>
       blockchainAuditService.logEvent({ event_type: 'appointment_created', resource_type: 'appointment', resource_id: appointmentId, actor_id: actorId, actor_role: actorRole, action_data: data }),

     appointmentCancelled: (appointmentId: string, actorId: string, actorRole: string, data?: Record<string, unknown>) =>
       blockchainAuditService.logEvent({ event_type: 'appointment_cancelled', resource_type: 'appointment', resource_id: appointmentId, actor_id: actorId, actor_role: actorRole, action_data: data }),

     appointmentRescheduled: (appointmentId: string, actorId: string, actorRole: string, data?: Record<string, unknown>) =>
       blockchainAuditService.logEvent({ event_type: 'appointment_rescheduled', resource_type: 'appointment', resource_id: appointmentId, actor_id: actorId, actor_role: actorRole, action_data: data }),

     prescriptionCreated: (prescriptionId: string, actorId: string, data?: Record<string, unknown>) =>
       blockchainAuditService.logEvent({ event_type: 'prescription_created', resource_type: 'prescription', resource_id: prescriptionId, actor_id: actorId, actor_role: 'provider', action_data: data }),

     prescriptionSentToPharmacy: (prescriptionId: string, actorId: string, actorRole: string, data?: Record<string, unknown>) =>
       blockchainAuditService.logEvent({ event_type: 'prescription_sent', resource_type: 'prescription', resource_id: prescriptionId, actor_id: actorId, actor_role: actorRole, action_data: data }),

     prescriptionRedirected: (prescriptionId: string, actorId: string, data?: Record<string, unknown>) =>
       blockchainAuditService.logEvent({ event_type: 'prescription_redirected', resource_type: 'prescription', resource_id: prescriptionId, actor_id: actorId, actor_role: 'patient', action_data: data }),

     consentGranted: (consentId: string, patientId: string, granteeId: string, data?: Record<string, unknown>) =>
       blockchainAuditService.logEvent({ event_type: 'consent_granted', resource_type: 'consent', resource_id: consentId, actor_id: patientId, actor_role: 'patient', action_data: { grantee_id: granteeId, ...data } }),

     consentRevoked: (consentId: string, patientId: string, granteeId: string, data?: Record<string, unknown>) =>
       blockchainAuditService.logEvent({ event_type: 'consent_revoked', resource_type: 'consent', resource_id: consentId, actor_id: patientId, actor_role: 'patient', action_data: { grantee_id: granteeId, ...data } }),

     dataAccessed: (resourceType: string, resourceId: string, actorId: string, actorRole: string, data?: Record<string, unknown>) =>
       blockchainAuditService.logEvent({ event_type: 'data_access', resource_type: resourceType, resource_id: resourceId, actor_id: actorId, actor_role: actorRole, action_data: data }),

     clinicalNoteCreated: (noteId: string, providerId: string, data?: Record<string, unknown>) =>
       blockchainAuditService.logEvent({ event_type: 'clinical_note_created', resource_type: 'clinical_note', resource_id: noteId, actor_id: providerId, actor_role: 'provider', action_data: data }),

     clinicalNoteSigned: (noteId: string, providerId: string, data?: Record<string, unknown>) =>
       blockchainAuditService.logEvent({ event_type: 'clinical_note_signed', resource_type: 'clinical_note', resource_id: noteId, actor_id: providerId, actor_role: 'provider', action_data: data }),

     paymentProcessed: (transactionId: string, actorId: string, data?: Record<string, unknown>) =>
       blockchainAuditService.logEvent({ event_type: 'payment_processed', resource_type: 'transaction', resource_id: transactionId, actor_id: actorId, actor_role: 'patient', action_data: data }),

     pharmacyOrderCreated: (orderId: string, pharmacyId: string, data?: Record<string, unknown>) =>
       blockchainAuditService.logEvent({ event_type: 'order_created', resource_type: 'pharmacy_order', resource_id: orderId, actor_id: pharmacyId, actor_role: 'pharmacy', action_data: data }),

     pharmacyOrderFulfilled: (orderId: string, pharmacyId: string, data?: Record<string, unknown>) =>
       blockchainAuditService.logEvent({ event_type: 'order_fulfilled', resource_type: 'pharmacy_order', resource_id: orderId, actor_id: pharmacyId, actor_role: 'pharmacy', action_data: data }),

     recordExported: (patientId: string, data?: Record<string, unknown>) =>
       blockchainAuditService.logEvent({ event_type: 'record_exported', resource_type: 'health_record', resource_id: patientId, actor_id: patientId, actor_role: 'patient', action_data: data }),

     recordShared: (shareId: string, patientId: string, data?: Record<string, unknown>) =>
       blockchainAuditService.logEvent({ event_type: 'record_shared', resource_type: 'health_record', resource_id: shareId, actor_id: patientId, actor_role: 'patient', action_data: data }),

     adminAction: (actionType: string, resourceType: string, resourceId: string, adminId: string, data?: Record<string, unknown>) =>
       blockchainAuditService.logEvent({ event_type: `admin_${actionType}`, resource_type: resourceType, resource_id: resourceId, actor_id: adminId, actor_role: 'admin', action_data: data }),

     userLogin: (userId: string, data?: Record<string, unknown>) =>
       blockchainAuditService.logEvent({ event_type: 'user_login', resource_type: 'auth', resource_id: userId, actor_id: userId, actor_role: 'system', action_data: data }),

     userLogout: (userId: string, data?: Record<string, unknown>) =>
       blockchainAuditService.logEvent({ event_type: 'user_logout', resource_type: 'auth', resource_id: userId, actor_id: userId, actor_role: 'system', action_data: data }),
   };
   ```

3. The purpose of this wrapper is:
   - Standardized event type strings (no typos across service files)
   - Simpler call signature (fewer parameters to remember)
   - Single import (`import { auditLog } from './auditLogger'`)
   - Easy to grep for usage (`auditLog.` prefix makes it searchable)

**Files to create:**
- `src/services/auditLogger.ts`

**How to verify:** Import the module and call any function -- it should create an audit entry in `blockchain_audit_log`.

---

### Task 3.2: Add Audit Logging to Appointment Service

**Status:** NEW

**Goal:** Every appointment action creates an audit entry.

**Steps:**

1. Open `src/services/appointmentService.ts`
2. Find the function that creates appointments (likely `createAppointment` or similar)
3. After the appointment is successfully created in the database, add:
   ```typescript
   import { auditLog } from './auditLogger';

   // After successful insert:
   await auditLog.appointmentCreated(appointment.id, userId, userRole, {
     provider_id: appointment.provider_id,
     patient_id: appointment.patient_id,
     appointment_type: appointment.visit_type,
     scheduled_date: appointment.date
   });
   ```
4. Find the cancel function and add:
   ```typescript
   await auditLog.appointmentCancelled(appointmentId, userId, userRole, {
     reason: cancellationReason
   });
   ```
5. Find the reschedule function and add:
   ```typescript
   await auditLog.appointmentRescheduled(appointmentId, userId, userRole, {
     old_date: originalDate,
     new_date: newDate
   });
   ```
6. Also check `src/services/enhancedAppointmentService.ts` for any additional appointment actions

**Files to modify:**
- `src/services/appointmentService.ts`
- `src/services/enhancedAppointmentService.ts` (if it has appointment CRUD)

**How to verify:** Create an appointment, cancel it, reschedule another -- each action creates a new entry in `blockchain_audit_log` with the correct event type and data.

---

### Task 3.3: Add Audit Logging to Prescription Service

**Status:** NEW

**Goal:** Every prescription lifecycle event creates an audit entry.

**Steps:**

1. Open `src/services/prescriptionService.ts`
2. Find the function that creates prescriptions and add:
   ```typescript
   await auditLog.prescriptionCreated(prescription.id, providerId, {
     patient_id: prescription.patient_id,
     medications: prescription.items.map(i => i.medication_name)
   });
   ```
3. Find the function that sends a prescription to a pharmacy and add:
   ```typescript
   await auditLog.prescriptionSentToPharmacy(prescriptionId, actorId, actorRole, {
     pharmacy_id: pharmacyId,
     sent_by: actorRole // 'provider' or 'patient'
   });
   ```
4. Find the function that redirects a prescription and add:
   ```typescript
   await auditLog.prescriptionRedirected(prescriptionId, patientId, {
     from_pharmacy_id: oldPharmacyId,
     to_pharmacy_id: newPharmacyId
   });
   ```
5. Also check `src/services/enhancedPrescriptionService.ts` and `src/services/ePrescriptionService.ts`

**Files to modify:**
- `src/services/prescriptionService.ts`
- `src/services/enhancedPrescriptionService.ts`
- `src/services/ePrescriptionService.ts`

**How to verify:** Write a prescription, send it to a pharmacy, redirect it -- each step creates an audit entry.

---

### Task 3.4: Add Audit Logging to Clinical Notes Service

**Status:** NEW

**Goal:** Clinical note creation, editing, and signing are audit-logged.

**Steps:**

1. Open `src/services/clinicalNotesService.ts`
2. After creating a new note:
   ```typescript
   await auditLog.clinicalNoteCreated(note.id, providerId, {
     patient_id: note.patient_id,
     note_type: note.type,
     appointment_id: note.appointment_id
   });
   ```
3. After signing/finalizing a note:
   ```typescript
   await auditLog.clinicalNoteSigned(noteId, providerId, {
     patient_id: note.patient_id,
     signed_at: new Date().toISOString()
   });
   ```

**Files to modify:**
- `src/services/clinicalNotesService.ts`

**How to verify:** Create a clinical note, then sign it -- two audit entries appear.

---

### Task 3.5: Add Audit Logging to Pharmacy Order Service

**Status:** NEW

**Goal:** Pharmacy order lifecycle events are audit-logged.

**Steps:**

1. Open `src/services/pharmacyOrderFulfillmentService.ts`
2. After creating an order from a verified prescription:
   ```typescript
   await auditLog.pharmacyOrderCreated(order.id, pharmacyId, {
     prescription_id: order.prescription_id,
     patient_id: order.patient_id
   });
   ```
3. After fulfilling an order (marking as ready/delivered):
   ```typescript
   await auditLog.pharmacyOrderFulfilled(orderId, pharmacyId, {
     status: newStatus,
     fulfilled_at: new Date().toISOString()
   });
   ```

**Files to modify:**
- `src/services/pharmacyOrderFulfillmentService.ts`

**How to verify:** Accept a prescription, fulfill the order -- audit entries appear for each step.

---

### Task 3.6: Add Audit Logging to Admin Actions

**Status:** NEW

**Goal:** Admin actions (approving/denying applications, managing users) are audit-logged.

**Steps:**

1. Open `src/services/adminService.ts`
2. After approving a provider application:
   ```typescript
   await auditLog.adminAction('approve_provider', 'provider', providerId, adminUserId, {
     previous_status: 'pending_approval',
     new_status: 'active'
   });
   ```
3. After denying a provider application:
   ```typescript
   await auditLog.adminAction('deny_provider', 'provider', providerId, adminUserId, {
     reason: denialReason
   });
   ```
4. After suspending a user:
   ```typescript
   await auditLog.adminAction('suspend_user', 'user', userId, adminUserId, {
     reason: suspensionReason
   });
   ```
5. Repeat for pharmacy application reviews
6. Repeat for any user management actions in `src/services/adminCRUDService.ts`

**Files to modify:**
- `src/services/adminService.ts`
- `src/services/adminCRUDService.ts`

**How to verify:** Approve a provider, suspend a user -- audit entries appear with the admin's ID as the actor.

---

### Task 3.7: Add Audit Logging to Auth Events

**Status:** NEW

**Goal:** Login and logout events are audit-logged.

**Steps:**

1. Open `src/contexts/AuthContext.tsx`
2. In the `onAuthStateChange` callback, when a `SIGNED_IN` event occurs:
   ```typescript
   // Use an async IIFE to avoid deadlock (see mandatory_auth_requirements)
   supabase.auth.onAuthStateChange((event, session) => {
     (async () => {
       if (event === 'SIGNED_IN' && session?.user) {
         await auditLog.userLogin(session.user.id, {
           email: session.user.email,
           login_method: 'email_password'
         });
       }
       if (event === 'SIGNED_OUT') {
         // Note: user may be null here, use stored user ID
         if (previousUserId) {
           await auditLog.userLogout(previousUserId);
         }
       }
     })();
   });
   ```
3. Be careful with the async pattern -- follow the Supabase auth guidelines to avoid deadlocks

**Files to modify:**
- `src/contexts/AuthContext.tsx`

**How to verify:** Log in, then log out -- both events create audit entries.

---

### Task 3.8: Build the Admin Audit Trail Viewer

**Status:** SCAFFOLDED (page exists, needs real data)

**Goal:** Admin can browse, search, filter, and verify the audit trail.

**Steps:**

1. Open `src/app/dashboard/admin/interoperability/blockchain-audit/page.tsx`
2. Replace any mock data with real queries to `blockchain_audit_log` table
3. Build the UI with these features:
   - **Search bar:** Search by event type, resource ID, actor ID
   - **Filters:**
     - Event type dropdown (appointment_created, prescription_created, consent_granted, etc.)
     - Actor role dropdown (patient, provider, pharmacy, admin, system)
     - Date range picker (from date, to date)
     - Resource type dropdown (appointment, prescription, consent, clinical_note, etc.)
   - **Results table:** Columns: Timestamp, Event Type, Actor (name + role), Resource Type, Resource ID, Hash (truncated)
   - **Detail view:** Click a row to see full entry: all fields, full hash, previous hash, action data JSON
   - **Pagination:** 50 entries per page with next/previous
4. Add a "Verify Chain Integrity" button:
   - Calls `blockchainAuditService.verifyBlockchainIntegrity()`
   - Shows result: "Chain Valid -- X blocks verified" or "Integrity Issue at Block #Y"
   - Displays verification timestamp
5. Add "Export" button:
   - Export filtered results as CSV
   - Export filtered results as JSON
   - Include all fields in export

**Files to modify:**
- `src/app/dashboard/admin/interoperability/blockchain-audit/page.tsx`

**How to verify:**
- Admin sees real audit entries with accurate data
- Filters narrow results correctly
- Chain verification passes (all hashes link correctly)
- Export produces valid CSV/JSON files

---

## Phase 4: FHIR Resource Gateway

**Goal:** Clinical events automatically create FHIR R4-compatible resources, and the FHIR endpoint management works with real connections.

**Depends on:** Phase 1 (tables), Phase 3 (audit logging for FHIR operations)

---

### Task 4.1: Auto-Create FHIR Resources from Clinical Events

**Status:** NEW

**Goal:** When a provider records clinical data (vitals, diagnoses, prescriptions), corresponding FHIR resources are automatically created.

**Steps:**

1. Create a utility `src/services/fhirResourceFactory.ts` with functions that map internal data to FHIR R4 JSON:

   - `createObservation(vitalSign)` -- Maps vital signs (BP, heart rate, temp, weight, height) to FHIR Observation resources:
     ```typescript
     function createObservation(vital: VitalSign): FHIRObservation {
       return {
         resourceType: 'Observation',
         status: 'final',
         category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
         code: { coding: [{ system: 'http://loinc.org', code: vital.loincCode, display: vital.name }] },
         subject: { reference: `Patient/${vital.patientId}` },
         effectiveDateTime: vital.recordedAt,
         valueQuantity: { value: vital.value, unit: vital.unit, system: 'http://unitsofmeasure.org' }
       };
     }
     ```

   - `createCondition(diagnosis)` -- Maps ICD-10 diagnoses to FHIR Condition resources
   - `createMedicationRequest(prescription)` -- Maps prescriptions to FHIR MedicationRequest resources (already partially in `fhirInteroperabilityService.ts`)
   - `createAllergyIntolerance(allergy)` -- Maps patient allergies to FHIR AllergyIntolerance resources
   - `createImmunization(immunization)` -- Maps immunization records to FHIR Immunization resources

2. In `src/services/clinicalNotesService.ts`, after a SOAP note is finalized:
   - Extract diagnoses from the Assessment section
   - Call `createCondition()` for each diagnosis
   - Save the FHIR JSON to the `fhir_resources` table (or `fhir_observations` depending on existing schema)
   - If vitals were recorded, call `createObservation()` for each

3. In `src/services/prescriptionService.ts`, after a prescription is created:
   - Call `createMedicationRequest()` for each medication
   - Save to the FHIR resources table

4. In `src/services/patientService.ts`, when allergies are added:
   - Call `createAllergyIntolerance()`
   - Save to the FHIR resources table

5. Each FHIR resource creation should also log to the audit trail

**LOINC codes for common vital signs (use these in the mapping):**
| Vital | LOINC Code | Unit |
|-------|-----------|------|
| Blood Pressure Systolic | 8480-6 | mmHg |
| Blood Pressure Diastolic | 8462-4 | mmHg |
| Heart Rate | 8867-4 | /min |
| Body Temperature | 8310-5 | Cel |
| Body Weight | 29463-7 | kg |
| Body Height | 8302-2 | cm |
| Respiratory Rate | 9279-1 | /min |
| Oxygen Saturation | 2708-6 | % |

**Files to create:**
- `src/services/fhirResourceFactory.ts`

**Files to modify:**
- `src/services/clinicalNotesService.ts` (trigger FHIR resource creation after note finalization)
- `src/services/prescriptionService.ts` (trigger FHIR MedicationRequest creation)
- `src/services/patientService.ts` (trigger FHIR AllergyIntolerance creation when allergies are added)

**How to verify:**
- Finalize a SOAP note with a diagnosis -> a FHIR Condition resource is created in the database
- Record vital signs -> FHIR Observation resources are created
- Write a prescription -> a FHIR MedicationRequest resource is created
- Each created resource is valid FHIR R4 JSON (correct resourceType, required fields present)

---

### Task 4.2: Wire FHIR Endpoint Connectivity Testing

**Status:** PARTIAL

**Goal:** The admin FHIR endpoints page can actually test connections to FHIR servers.

**Steps:**

1. Open `src/services/fhirInteroperabilityService.ts` and find the `testEndpointConnection()` method
2. Verify it actually makes an HTTP request to the FHIR server's metadata endpoint:
   ```
   GET [fhir_server_url]/metadata
   ```
   - This endpoint returns a CapabilityStatement resource
   - If the request succeeds and returns valid JSON with `resourceType: 'CapabilityStatement'`, the connection is working
3. If the method is mocked (returns fake data), replace with a real implementation:
   ```typescript
   async testEndpointConnection(endpointId: string): Promise<{ success: boolean; message: string; capabilities?: string[] }> {
     const { data: endpoint } = await supabase
       .from('fhir_endpoints')
       .select('*')
       .eq('id', endpointId)
       .maybeSingle();

     if (!endpoint) return { success: false, message: 'Endpoint not found' };

     try {
       const response = await fetch(`${endpoint.base_url}/metadata`, {
         headers: {
           'Accept': 'application/fhir+json',
           ...(endpoint.auth_token ? { 'Authorization': `Bearer ${endpoint.auth_token}` } : {})
         }
       });

       if (!response.ok) {
         return { success: false, message: `HTTP ${response.status}: ${response.statusText}` };
       }

       const capability = await response.json();
       if (capability.resourceType !== 'CapabilityStatement') {
         return { success: false, message: 'Invalid response: not a CapabilityStatement' };
       }

       const supportedResources = capability.rest?.[0]?.resource?.map((r: { type: string }) => r.type) || [];

       // Update endpoint status in database
       await supabase.from('fhir_endpoints').update({
         status: 'active',
         last_connected_at: new Date().toISOString()
       }).eq('id', endpointId);

       return {
         success: true,
         message: `Connected successfully. ${supportedResources.length} resource types supported.`,
         capabilities: supportedResources
       };
     } catch (error) {
       await supabase.from('fhir_endpoints').update({
         status: 'error',
         last_error: error instanceof Error ? error.message : 'Unknown error'
       }).eq('id', endpointId);

       return { success: false, message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
     }
   }
   ```

4. Pre-configure two public test servers in the admin UI (seed data or hardcoded defaults):
   - HAPI FHIR R4: `https://hapi.fhir.org/baseR4`
   - SmileCDR Sandbox: `https://try.smilecdr.com/baseR4` (or current URL)

5. Wire the admin page at `src/app/dashboard/admin/interoperability/fhir-endpoints/page.tsx`:
   - List all configured endpoints with status (active, error, testing)
   - "Test Connection" button per endpoint
   - Display last connection time and supported resources
   - Add/edit/delete endpoint configuration

**Files to modify:**
- `src/services/fhirInteroperabilityService.ts`
- `src/app/dashboard/admin/interoperability/fhir-endpoints/page.tsx`

**How to verify:**
- Add the HAPI FHIR test server endpoint
- Click "Test Connection" -> shows success with list of supported resource types
- Endpoint status updates to "active" in the database
- Test with an invalid URL -> shows clear error message

---

### Task 4.3: Build FHIR Resource Export for Patients

**Status:** PARTIAL (export modal exists but may not produce valid FHIR)

**Goal:** Patients can export their health records as a valid FHIR R4 Bundle.

**Steps:**

1. Open `src/components/health-records/ExportRecordsModal.tsx`
2. Add a "FHIR Bundle (JSON)" export option alongside any existing export formats
3. When the patient clicks "Export as FHIR Bundle":
   - Fetch all the patient's FHIR resources from the database
   - Construct a FHIR Bundle resource:
     ```typescript
     const bundle = {
       resourceType: 'Bundle',
       type: 'collection',
       timestamp: new Date().toISOString(),
       total: resources.length,
       entry: resources.map(resource => ({
         fullUrl: `urn:uuid:${resource.id}`,
         resource: resource.fhir_json
       }))
     };
     ```
   - Trigger a file download of the JSON
   - Log the export on the audit trail:
     ```typescript
     await auditLog.recordExported(patientId, {
       format: 'fhir_bundle',
       resource_count: resources.length,
       exported_at: new Date().toISOString()
     });
     ```

4. Validate the bundle structure:
   - `resourceType` must be `'Bundle'`
   - `type` must be `'collection'`
   - Each `entry` must have `fullUrl` and `resource`
   - Each resource must have a valid `resourceType`

**Files to modify:**
- `src/components/health-records/ExportRecordsModal.tsx`
- `src/services/fhirService.ts` (add bundle construction helper)
- `src/services/healthRecordsService.ts` (add FHIR export function)

**How to verify:**
- Patient clicks export -> downloads a `.json` file
- The JSON is valid FHIR R4 Bundle format
- The bundle contains all the patient's resources (observations, conditions, medications, etc.)
- An audit entry is created for the export

---

### Task 4.4: Wire FHIR Data Into Health Records Tabs

**Status:** PARTIAL

**Goal:** The patient health records viewer displays data from FHIR resources stored in the database.

**Steps:**

1. Open `src/services/fhirService.ts` and verify the query methods actually work:
   - `getLabResults(patientId)` -- should query FHIR Observation resources where category = 'laboratory'
   - `getVitalSigns(patientId)` -- should query FHIR Observation resources where category = 'vital-signs'
   - `getImmunizations(patientId)` -- should query FHIR Immunization resources
   - `getDiagnoses(patientId)` -- should query FHIR Condition resources

2. If these methods are using mock data or fake delays, replace with real Supabase queries:
   ```typescript
   async getLabResults(patientId: string) {
     const { data, error } = await supabase
       .from('fhir_observations')
       .select('*')
       .eq('patient_id', patientId)
       .eq('category', 'laboratory')
       .order('effective_date', { ascending: false });

     if (error) throw error;
     return data;
   }
   ```

3. Open each health records tab component and verify it calls the correct FHIR service method:
   - `src/components/health-records/LabResultsTab.tsx` -> `fhirService.getLabResults()`
   - `src/components/health-records/ImmunizationsTab.tsx` -> `fhirService.getImmunizations()`
   - `src/components/health-records/MedicationsTab.tsx` -> queries `patient_medications` (not FHIR, this is fine)
   - `src/components/health-records/AllergiesTab.tsx` -> queries `patient_allergies`

4. Add proper loading states (spinner while fetching)
5. Add proper empty states ("No lab results recorded yet")
6. Add proper error states ("Failed to load records. Please try again.")

**Files to modify:**
- `src/services/fhirService.ts`
- `src/components/health-records/LabResultsTab.tsx`
- `src/components/health-records/ImmunizationsTab.tsx`
- `src/components/health-records/HealthTimelineTab.tsx`

**How to verify:**
- Patient with FHIR resources sees them displayed in the correct tabs
- Patient with no records sees empty state messages
- Loading spinner shows while data is fetching

---

## Phase 5: Cross-Role Data Flow Integration

**Goal:** Ensure data flows correctly between all four roles (patient, provider, pharmacy, admin) through the consent and audit infrastructure built in Phases 1-4.

**Depends on:** Phases 1-4 complete, plus some feature work from `PLAN.md` Phases 2-8

---

### Task 5.1: Verify the Complete Prescription Pipeline Data Flow

**Status:** NEW

**Goal:** Walk through the entire prescription lifecycle and verify every data handoff works with consent and audit.

**Steps:**

1. Trace the prescription data flow end-to-end:
   ```
   Provider writes prescription
     -> Prescription saved to database
     -> FHIR MedicationRequest created
     -> Audit entry: prescription_created
     -> Provider suggests pharmacy (optional)
       -> Consent record created for pharmacy
       -> Prescription status: 'sent'
       -> Audit entry: prescription_sent
       -> Notification to patient
     -> Patient can redirect to different pharmacy
       -> Old pharmacy consent revoked
       -> New pharmacy consent created
       -> Audit entries: consent_revoked, prescription_redirected, consent_granted
       -> Notification to both pharmacies
     -> Pharmacy receives prescription
       -> Pharmacy verifies (checks consent is active)
       -> Pharmacy accepts -> order created
       -> Audit entry: order_created
     -> Pharmacy fulfills order
       -> Inventory decremented
       -> Order status updated
       -> Audit entry: order_fulfilled
       -> Notification to patient
   ```

2. For each step above, verify in the code:
   - Is the correct service function being called?
   - Is consent being checked/created/revoked as described?
   - Is an audit entry being created?
   - Is a notification being sent?

3. Create a checklist marking each step as verified or needs-fix

4. For any step that is missing or broken, create a specific sub-task to fix it

**Files to read (do not modify in this task -- just audit):**
- `src/services/prescriptionService.ts`
- `src/services/enhancedPrescriptionService.ts`
- `src/services/pharmacyPrescriptionService.ts`
- `src/services/pharmacyOrderFulfillmentService.ts`
- `src/services/notificationService.ts`
- `src/services/blockchainAuditService.ts` (or `auditLogger.ts`)

**How to verify:** You have a checklist showing every step in the pipeline and whether it's implemented correctly.

---

### Task 5.2: Verify the Complete Appointment-to-Consultation Data Flow

**Status:** NEW

**Goal:** Walk through appointment booking through video consultation and verify data integrity.

**Steps:**

1. Trace the appointment data flow:
   ```
   Patient searches for provider
     -> Patient selects time slot
     -> Patient fills questionnaire
     -> Patient selects insurance/self-pay
     -> Patient signs consent (consent record created)
     -> Appointment created
     -> Audit entry: appointment_created
     -> Notification to provider
   Provider sees appointment
     -> Patient joins waiting room (status: waiting)
     -> Provider admits patient (status: in_progress)
     -> Video room created via Daily.co
     -> Consultation in progress
       -> Provider views patient data (consent checked, access logged)
       -> Provider writes SOAP notes
       -> Provider records vitals -> FHIR Observations created
       -> Provider writes prescription (see Task 5.1 flow)
     -> Consultation ends (status: completed)
     -> Audit entry: consultation_completed
     -> Post-visit: provider finalizes notes
       -> Clinical note signed
       -> Audit entry: clinical_note_signed
       -> FHIR Condition resources created from diagnoses
     -> Patient sees visit summary
     -> Patient can leave review
   ```

2. Verify each step has:
   - Correct database operations
   - Consent checks where needed
   - Audit logging
   - Notifications
   - FHIR resource creation where applicable

3. Document any gaps

**Files to read (do not modify):**
- `src/services/appointmentService.ts`
- `src/services/enhancedAppointmentService.ts`
- `src/services/bookingService.ts`
- `src/services/telemedicineService.ts`
- `src/services/clinicalNotesService.ts`
- `src/services/prescriptionService.ts`

**How to verify:** Complete checklist showing every step's implementation status.

---

### Task 5.3: Verify the Pharmacy Operations Data Flow

**Status:** NEW

**Goal:** Walk through pharmacy operations and verify data integrity.

**Steps:**

1. Trace the pharmacy data flow:
   ```
   Pharmacy receives prescription
     -> Consent verified (pharmacy has active consent for this patient's prescription)
     -> Prescription details displayed
     -> Pharmacist verifies prescription
       -> Checks for drug interactions against patient medications
       -> Checks insurance coverage
     -> Pharmacist accepts -> Order created
       -> Audit entry: order_created
       -> Notification to patient: "Your prescription is being prepared"
     -> Pharmacist fills order
       -> Selects items from inventory
       -> Inventory quantities decremented
       -> Order status: 'processing' -> 'filled' -> 'ready'
       -> Audit entries at each status change
       -> Notification to patient at each status change
     -> Patient picks up / receives delivery
       -> Order status: 'completed'
       -> Audit entry: order_fulfilled
     -> Refill requests
       -> Patient requests refill
       -> Provider approves/denies
       -> If approved, pharmacy receives new order
   ```

2. Verify each step in the codebase
3. Document any gaps

**Files to read (do not modify):**
- `src/services/pharmacyPrescriptionService.ts`
- `src/services/pharmacyOrderFulfillmentService.ts`
- `src/services/pharmacyInventoryService.ts`
- `src/services/pharmacyDeliveryService.ts`
- `src/services/notificationService.ts`

**How to verify:** Complete checklist for the pharmacy pipeline.

---

### Task 5.4: Verify Admin Data Access and Visibility

**Status:** NEW

**Goal:** Admin can see all platform data for management purposes, with proper audit logging.

**Steps:**

1. Verify admin RLS policies allow SELECT on all tables:
   - Admin should be able to query `appointments`, `prescriptions`, `pharmacy_orders`, `user_profiles`, etc.
   - All admin access should go through the `is_admin()` helper function (from Phase 1 Task 1.4)

2. Verify admin CANNOT bypass consent for viewing detailed patient health data:
   - Admin can see aggregate data (counts, stats, user lists)
   - Admin can see appointment details (for operational management)
   - Admin should NOT be able to view detailed clinical notes content (unless there's a specific compliance reason)
   - This is a design decision -- document the current behavior and flag if it seems wrong

3. Verify admin actions are audit-logged (from Phase 3 Task 3.6):
   - Application approvals/denials
   - User status changes
   - Settlement recordings
   - Platform settings changes

4. Verify the admin dashboard queries work:
   - Total user counts by role
   - Appointment statistics
   - Revenue summaries
   - Active provider/pharmacy counts

**Files to read:**
- `src/services/adminService.ts`
- `src/services/adminCRUDService.ts`
- `src/services/dashboardAnalyticsService.ts`
- `src/app/dashboard/admin/dashboard/page.tsx`

**How to verify:** Checklist confirming admin access patterns are appropriate and audit-logged.

---

### Task 5.5: Wire Supabase Realtime for Cross-Role Notifications

**Status:** NEW

**Goal:** When one role takes an action, the affected role sees an update in real-time without refreshing.

**Steps:**

1. Open `src/components/notifications/NotificationBell.tsx`
2. Add a Supabase Realtime subscription for the current user's notifications:
   ```typescript
   useEffect(() => {
     const channel = supabase
       .channel('user-notifications')
       .on(
         'postgres_changes',
         {
           event: 'INSERT',
           schema: 'public',
           table: 'notifications',
           filter: `user_id=eq.${userId}`
         },
         (payload) => {
           // Add new notification to state
           setNotifications(prev => [payload.new as Notification, ...prev]);
           setUnreadCount(prev => prev + 1);
         }
       )
       .subscribe();

     return () => {
       supabase.removeChannel(channel);
     };
   }, [userId]);
   ```

3. Test the real-time flow:
   - Provider books an appointment -> patient's notification bell updates without refresh
   - Patient cancels an appointment -> provider's notification bell updates
   - Pharmacy fills an order -> patient's notification bell updates

4. Add a similar Realtime subscription for appointment status changes in the waiting room:
   - When provider admits patient, the patient's waiting room page should update
   - Use a channel filtering on `appointments` table changes

5. Add Realtime for pharmacy prescription queue:
   - When a new prescription is sent to the pharmacy, it appears in their queue without refresh

**Files to modify:**
- `src/components/notifications/NotificationBell.tsx`
- `src/components/telemedicine/VirtualWaitingRoom.tsx` (appointment status changes)
- `src/app/dashboard/pharmacy/prescriptions/pending/page.tsx` (new prescriptions)

**How to verify:**
- Open two browser windows (patient and provider)
- Provider takes an action -> patient's notification count increases in real-time
- No page refresh needed

---

## Phase 6: Schema Cleanup & Integrity Verification

**Goal:** Clean up orphaned code, verify schema consistency, and run integration checks.

**Depends on:** All previous phases and most of `PLAN.md` feature work complete.

---

### Task 6.1: Remove Orphaned Service References

**Status:** NEW

**Goal:** Clean up service files that reference tables or features that were removed or never built.

**Steps:**

1. For every service file in `src/services/`:
   - Check that every table it queries exists in the database
   - Check that every function it exports is actually imported somewhere
   - If a function is never called from any component or other service, mark it for removal

2. For every component page in `src/app/`:
   - Check that every service import resolves to a real function
   - Check that the page renders without errors (no missing imports)

3. Remove any dead code:
   - Unused imports
   - Functions that are never called
   - Service files that are entirely unused
   - Note: do NOT remove code that is part of planned features in `PLAN.md` -- only truly dead code

**Files to modify:**
- Various service files (remove dead functions)
- Various component files (clean up unused imports)

**How to verify:** `npm run build` succeeds with no TypeScript errors related to missing imports.

---

### Task 6.2: Run Full Schema Consistency Check

**Status:** NEW

**Goal:** Verify that the database schema matches what the application expects.

**Steps:**

1. Run `mcp__supabase__list_tables` to get the final table list
2. For each table, run:
   ```sql
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name = 'table_name'
   ORDER BY ordinal_position;
   ```
3. Compare the columns against what the service file expects (look at `.select()`, `.insert()`, `.update()` calls)
4. If a service references a column that doesn't exist:
   - Add the column via migration
   - OR update the service to not reference that column
5. If a table has columns that no service references:
   - Leave them (they might be used by RLS policies or triggers)

**How to verify:** Every `.select()`, `.insert()`, and `.update()` call in every service file references columns that actually exist in the database.

---

### Task 6.3: Run Build and Fix All TypeScript Errors

**Status:** NEW

**Goal:** The project builds cleanly with `npm run build`.

**Steps:**

1. Run `npm run build`
2. For each TypeScript error:
   - Fix type mismatches
   - Fix missing imports
   - Fix references to non-existent modules
   - Do NOT add `// @ts-ignore` comments -- fix the actual issue
3. Run `npm run build` again until it passes with zero errors

**Files to modify:** Whatever files have TypeScript errors.

**How to verify:** `npm run build` exits with code 0 and no errors.

---

### Task 6.4: Verify Audit Chain Integrity

**Status:** NEW

**Goal:** Run the chain integrity verification and confirm all audit entries are properly linked.

**Steps:**

1. Call `blockchainAuditService.verifyBlockchainIntegrity()` (or run it from the admin audit viewer)
2. If the chain is valid -> document the total number of blocks verified
3. If the chain has integrity issues:
   - Identify the broken block
   - Determine the cause (missing previous_hash, incorrect hash calculation, etc.)
   - Fix the issue (may require a data migration to recalculate hashes)
4. Set up a periodic integrity check:
   - The admin dashboard should show last verification timestamp
   - Consider adding a "Verify Now" button that runs the check on demand

**How to verify:** Chain integrity verification returns "valid" with all blocks verified.

---

### Task 6.5: Final RLS Security Audit

**Status:** NEW

**Goal:** One final pass to verify no data leaks between roles.

**Steps:**

1. Run this query to find any policies using `USING (true)`:
   ```sql
   SELECT schemaname, tablename, policyname, qual
   FROM pg_policies
   WHERE qual = 'true' OR qual LIKE '%true%';
   ```
   If any exist, replace with proper checks.

2. Run this query to find tables with RLS enabled but only `FOR ALL` policies:
   ```sql
   SELECT tablename, policyname, cmd
   FROM pg_policies
   WHERE cmd = '*';
   ```
   Split any found into separate SELECT, INSERT, UPDATE, DELETE policies.

3. Test data isolation (manual verification):
   - Log in as Patient A, query another patient's data -> should return empty
   - Log in as Provider A, query Provider B's appointments -> should return empty
   - Log in as Provider, query patient data without consent -> should return empty
   - Log in as Pharmacy A, query Pharmacy B's orders -> should return empty

4. Document the security verification results

**How to verify:** No policies use `USING (true)`, no `FOR ALL` policies remain, and manual data isolation tests pass.

---

## Quick Reference: What To Do When

| When you are... | Start with... |
|---|---|
| Starting fresh on infrastructure | Phase 1, Task 1.1 |
| Tables exist but RLS is missing | Phase 1, Task 1.3 |
| Building a feature that accesses patient data | Phase 2 (consent checks) |
| Adding a new service function | Phase 3 (add audit logging) |
| Working on health records or clinical docs | Phase 4 (FHIR resource creation) |
| Doing integration testing | Phase 5 (data flow verification) |
| Preparing for production | Phase 6 (cleanup and verification) |

---

## Notes

- **Do not skip RLS policies.** Every table must have RLS enabled and at least one policy per operation (SELECT, INSERT, UPDATE, DELETE) per role that accesses it.
- **Do not skip audit logging.** Every significant action should call the audit logger. If you're unsure whether an action is "significant," log it.
- **Consent is non-negotiable.** Cross-boundary data access without consent is a privacy violation. The consent check at the service level provides a good error message; the RLS policy provides defense-in-depth.
- **FHIR resources are created automatically.** Providers don't manually create FHIR data -- it's generated from their clinical actions.
- **The `is_admin()` helper function** prevents infinite recursion in RLS policies. Always use it instead of inline admin checks.
- **Supabase Realtime** requires that the table has replication enabled. Check that important tables (notifications, appointments, prescriptions) have replication turned on.
- **All migrations** must use `IF NOT EXISTS` / `IF EXISTS` guards for safety.
- **Never use `DROP TABLE` or `DROP COLUMN`** -- this is a data safety rule with no exceptions.
