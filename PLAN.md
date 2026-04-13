# DoktoChain -- Implementation Plan

> This document breaks down every task required to make all features functional and all user flows complete.
> Tasks are ordered so each phase builds on the previous one. Each task is scoped for a junior developer.
>
> **Reference:** [`USER_FLOWS.md`](./USER_FLOWS.md) for user journeys, [`FEATURES.md`](./FEATURES.md) for feature specs.

---

## How to Read This Plan

- **Phases** are ordered by dependency -- Phase 1 must be done before Phase 2, etc.
- **Tasks** within a phase can often be done in parallel unless noted.
- Each task lists the **files to modify/create**, the **acceptance criteria**, and the **services/tables involved**.
- Status tags: `WORKING` (already done), `PARTIAL` (needs fixes), `SCAFFOLDED` (UI exists, needs real data), `NEW` (build from scratch).

---

## Current State Summary

| Area | Status | What Exists | What's Missing |
|------|--------|-------------|----------------|
| Auth (email/password) | WORKING | Supabase auth, login, register, role detection | Phone OTP delivery, MFA enrollment UI |
| Patient Dashboard | WORKING | Real data queries, appointment list, prescriptions | Some hardcoded change percentages |
| Appointment CRUD | WORKING | Create, read, cancel appointments | Reschedule flow, waitlist |
| Booking Wizard | PARTIAL | UI with 5 steps, provider search | Insurance card selection, real payment step, consent recording |
| Prescriptions | WORKING | Create, list, status tracking | Pharmacy delivery pipeline, patient redirect flow |
| Provider Dashboard | PARTIAL | Fetches real data | Hardcoded change metrics, incomplete quick actions |
| Provider Onboarding | PARTIAL | Registration form exists | Multi-step wizard incomplete, admin approval workflow |
| Pharmacy Dashboard | SCAFFOLDED | UI layout complete | All data hardcoded, no Supabase queries |
| Pharmacy Operations | SCAFFOLDED | Pages exist for orders, inventory, prescriptions | No real data, no fulfillment logic |
| Admin Dashboard | SCAFFOLDED | UI layout complete | All stats hardcoded, no real queries |
| Admin Clinic Management | PARTIAL | CRUD templates exist | Some pages incomplete, real data binding varies |
| Video Consultation | PARTIAL | Waiting room UI, video interface components | Daily.co SDK integration, room creation, token management |
| Health Records | PARTIAL | EHR viewer component, FHIR service | Data population, record sharing UI, export |
| Hash-Chain Audit | PARTIAL | Service with SHA-256 hashing exists | Not called from most actions, admin viewer incomplete |
| Billing/Payments | SCAFFOLDED | Service stubs, UI pages | No Stripe integration, no payment processing |
| Insurance Claims | SCAFFOLDED | Service types defined | No claim creation workflow, no status tracking UI |
| Consent System | PARTIAL | Database tables exist | Consent UI for patients, time-window enforcement |
| CMS | PARTIAL | Service with full CRUD | Admin pages need real data binding |
| Messaging | PARTIAL | Service exists | Real-time messaging, thread management |
| Notifications | PARTIAL | Service exists | In-app real-time delivery, email/SMS integration |
| Frontend Website | WORKING | All marketing pages render | CMS-driven content (currently hardcoded) |

---

## Phase 1: Foundation & Auth Completion

Everything else depends on a solid auth system, database connectivity, and navigation.

### Task 1.1: Verify and Fix Database Schema (PARTIAL)

**Goal:** Ensure all tables referenced by services actually exist in the database.

**Steps:**
1. Run `mcp__supabase__list_tables` to see what tables exist in the live database
2. Compare against tables referenced in services (e.g., `video_consultations`, `blockchain_audit_log`, `consent_records`, `messages`, `notifications`)
3. For each missing table, check if a migration exists in `.migrations_to_apply/`
4. Apply any needed pending migrations using `mcp__supabase__apply_migration`
5. Verify RLS is enabled on every table
6. Verify RLS policies exist for each role (patient, provider, pharmacy, admin)

**Files:** `supabase/migrations/`, `.migrations_to_apply/`
**Acceptance:** All services can query their tables without "relation does not exist" errors.

---

### Task 1.2: Fix Registration Flow for All Roles (PARTIAL)

**Goal:** Registration works end-to-end for patient, provider, and pharmacy roles.

**Steps:**
1. Read `src/components/auth/RegisterForm1.tsx` -- verify form submits to Supabase auth
2. Verify `user_profiles` row is created on registration with correct role
3. Verify `user_roles` row is created with the selected role
4. For **patients**: After registration, redirect to profile completion wizard
5. For **providers**: After registration, redirect to provider onboarding wizard
6. For **pharmacies**: After registration, redirect to pharmacy onboarding wizard
7. Test each registration path creates the correct database records

**Files:**
- `src/components/auth/RegisterForm1.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/auth/ProfileCompletionWizard.tsx`

**Acceptance:** A new user can register as patient/provider/pharmacy, lands on the correct onboarding flow, and their profile appears in the database.

---

### Task 1.3: Complete Profile Completion Wizard -- Patient (PARTIAL)

**Goal:** After patient registration, the wizard collects personal info, health info, insurance, and emergency contacts, saving each step to Supabase.

**Steps:**
1. Read `src/components/auth/ProfileCompletionWizard.tsx`
2. Verify Step 1 (Personal Info) saves to `user_profiles` table
3. Verify Step 2 (Health Info) saves to `patients` table (blood type, allergies)
4. Verify Step 3 (Insurance Info) saves to `patient_insurance` or `patient_insurance_cards` table
5. Verify Step 4 (Emergency Contacts) saves to `emergency_contacts` table
6. Add a completion flag so the wizard doesn't show again after completion
7. Wire up the "Skip" option so users can complete later

**Files:**
- `src/components/auth/ProfileCompletionWizard.tsx`
- `src/services/patientService.ts`

**Acceptance:** A patient can register, go through all 4 wizard steps, and all data persists in the database. Refreshing the page does not re-show the wizard.

---

### Task 1.4: Complete Provider Onboarding Wizard (PARTIAL)

**Goal:** After provider registration, a multi-step wizard collects professional info, practice details, credentials, services/pricing, insurance, and schedule. A solo practice is created by default, with optional clinic affiliation.

**Steps:**
1. Read `src/components/auth/ProviderRegistration.tsx` and related files
2. Build or complete a 6-step wizard:
   - Step 1: Professional Info (license number, province, specialty, years of experience) -> save to `providers` table
   - Step 2: Practice Details (solo practice created by default; practice name, type, address, phone, hours) -> save to `provider_locations` table. Optional: search and request affiliation with an existing clinic.
   - Step 3: Credential Upload (degree, license, insurance certs) -> upload to Supabase Storage, save refs to `provider_credentials`
   - Step 4: Services & Pricing (select procedures, set fees, telemedicine toggle) -> save to `provider_procedures`, `provider_specialties`
   - Step 5: Insurance Plans (select accepted insurers) -> save to `provider_insurance_plans`
   - Step 6: Schedule Setup (weekly template for solo practice, slot duration, buffer time) -> save to `provider_schedules`, `provider_availability`
3. Set provider status to `pending_approval` after completion
4. If clinic affiliation requested, create a `provider_clinic_affiliations` record with status `pending`
5. Show a "Your application is under review" message

**Files:**
- `src/components/auth/ProviderRegistration.tsx` (or create new wizard component)
- `src/services/providerOnboardingService.ts`
- `src/services/providerProfileService.ts`

**Acceptance:** A provider can register, complete all 6 steps with real data, and their application shows up in the admin's provider applications queue with "pending" status. If clinic affiliation was requested, it also appears in the clinic admin's queue.

---

### Task 1.5: Complete Pharmacy Onboarding Wizard (SCAFFOLDED)

**Goal:** After pharmacy registration, a wizard collects pharmacy details, operations, staff, inventory setup, and billing config.

**Steps:**
1. Read `src/components/pharmacy/PharmacyOnboardingWizard.tsx`
2. Build or complete a 5-step wizard:
   - Step 1: Pharmacy Details (license, type, address) -> save to `pharmacies` table
   - Step 2: Operations (business hours, delivery zones) -> save to `pharmacy_hours`, `pharmacy_delivery_zones`
   - Step 3: Staff (add pharmacists, technicians) -> save to `pharmacy_staff`
   - Step 4: Initial Inventory (manual entry or CSV) -> save to `pharmacy_inventory`
   - Step 5: Billing Config (payment preferences) -> save to `pharmacy_billing_config`
3. Set pharmacy status to `pending_approval`
4. Show "Application under review" state

**Files:**
- `src/components/pharmacy/PharmacyOnboardingWizard.tsx`
- `src/services/pharmacyOnboardingService.ts`

**Acceptance:** A pharmacy can register, complete all 5 wizard steps, and their application appears in admin's pharmacy queue.

---

### Task 1.6: Admin Application Review Workflow (NEW)

**Goal:** Admin can review, approve, or deny provider and pharmacy applications.

**Steps:**
1. Read `src/app/dashboard/admin/provider-applications/page.tsx`
2. Fetch pending provider applications from `providers` table where status = `pending_approval`
3. Display application list with details (name, specialty, license, documents)
4. Add "Approve" button -> sets provider status to `active`, creates notification
5. Add "Request More Info" button -> sends message to applicant
6. Add "Deny" button -> sets status to `denied`, records reason, creates notification
7. Repeat for pharmacy applications in `src/app/dashboard/admin/pharmacies/page.tsx`

**Files:**
- `src/app/dashboard/admin/provider-applications/page.tsx`
- `src/app/dashboard/admin/pharmacies/page.tsx`
- `src/services/adminService.ts`
- `src/services/notificationService.ts`

**Acceptance:** Admin sees pending applications, can approve/deny, and the applicant's account status updates accordingly.

---

## Phase 2: Core Patient Journey

This phase makes the patient's primary workflow functional: search, book, consult, prescriptions, pharmacy.

### Task 2.1: Provider Discovery & Search (PARTIAL)

**Goal:** Patients can search for providers by specialty, name, location, insurance, and language.

**Steps:**
1. Read `src/components/providers/EnhancedProviderSearch.tsx` and `src/services/providerSearchService.ts`
2. Verify the search queries the `providers` table with joins to `provider_specialties`, `provider_locations`, `provider_insurance_plans`
3. Implement filters:
   - Specialty dropdown (from `specialties_master` table)
   - Location (city/province text filter)
   - Insurance accepted (from `insurance_providers_master`)
   - Language spoken
   - Availability (has open slots in next 7 days)
   - Gender preference
4. Return provider cards with: photo, name, specialty, rating, next available slot
5. Wire up the public-facing search at `/frontend/find-providers`
6. Wire up the dashboard search at `/dashboard/patient/appointments/book` (Step 1 of booking wizard)

**Files:**
- `src/components/providers/EnhancedProviderSearch.tsx`
- `src/services/providerSearchService.ts`
- `src/services/enhancedProviderSearchService.ts`
- `src/app/frontend/find-providers/page.tsx`

**Acceptance:** A patient can search for providers using any filter combination and see real results from the database.

---

### Task 2.2: Provider Profile Page (PARTIAL)

**Goal:** Each provider has a public profile page with tabs for About, Services, Insurance, Location, Reviews, Highlights.

**Steps:**
1. Read `src/app/frontend/provider-profile/[slug]/page.tsx` and tab components
2. Verify the page fetches provider data from `providers` table by slug
3. Wire each tab to real data:
   - About: `providers` (bio, education, certifications, languages)
   - Services: `provider_procedures` joined with `procedures_master`
   - Insurance: `provider_insurance_plans` joined with `insurance_providers_master`
   - Location: `provider_locations` with address and hours
   - Reviews: `provider_reviews` with ratings and text
   - Highlights: `provider_credentials`
4. Add "Book Appointment" CTA that links to booking wizard with provider pre-selected

**Files:**
- `src/app/frontend/provider-profile/[slug]/page.tsx`
- `src/app/frontend/provider-profile/AboutTab.tsx`
- `src/app/frontend/provider-profile/ServicesTab.tsx`
- `src/app/frontend/provider-profile/InsurancesTab.tsx`
- `src/app/frontend/provider-profile/LocationTab.tsx`
- `src/app/frontend/provider-profile/ReviewsTab.tsx`
- `src/services/providerProfileService.ts`

**Acceptance:** Navigating to `/frontend/provider-profile/[slug]` shows real provider data across all tabs.

---

### Task 2.3: Booking Wizard -- Full Flow (PARTIAL)

**Goal:** Complete the 5-step booking wizard so patients can book real appointments.

**Steps:**
1. Read `src/components/booking/UnifiedSearchBookingWizard.tsx`
2. **Step 1 (Search & Select):** Already connected to provider search. Verify selecting a provider advances to Step 2.
3. **Step 2 (Date & Time):**
   - Fetch provider's available slots from `provider_schedules` and `provider_availability`
   - Subtract already-booked slots from `appointments` table
   - Display calendar with available slots
   - Allow selecting visit type (in-person or video)
4. **Step 3 (Pre-Visit Questionnaire):**
   - Read `src/components/booking/QuestionnaireStep.tsx`
   - Save questionnaire answers to the appointment record (or a separate `appointment_questionnaires` table)
   - Allow document upload to Supabase Storage
5. **Step 4 (Insurance & Payment):**
   - Read `src/components/booking/PaymentStep.tsx`
   - Fetch patient's saved insurance cards from `patient_insurance_cards`
   - Allow selecting an existing card or "Self-Pay"
   - Display estimated cost based on provider's fee schedule
   - For MVP: record payment intent (no actual Stripe charge yet -- placeholder)
6. **Step 5 (Consent & Confirmation):**
   - Read `src/components/booking/ConsentFormsStep.tsx`
   - Display consent forms (data sharing, treatment consent)
   - Record digital consent acceptance (create `consent_records` entry)
   - Create the appointment in `appointments` table
   - Create a consent record granting the provider access to patient data
   - Show confirmation screen with appointment details
7. Send notification to provider about new booking

**Files:**
- `src/components/booking/UnifiedSearchBookingWizard.tsx`
- `src/components/booking/QuestionnaireStep.tsx`
- `src/components/booking/PaymentStep.tsx`
- `src/components/booking/ConsentFormsStep.tsx`
- `src/services/bookingService.ts`
- `src/services/enhancedBookingService.ts`
- `src/services/appointmentService.ts`

**Acceptance:** A patient can search for a provider, select a time slot, fill the questionnaire, choose insurance or self-pay, sign consent, and the appointment appears in both the patient's and provider's calendars.

---

### Task 2.4: Appointment Management -- Patient Side (PARTIAL)

**Goal:** Patients can view, reschedule, and cancel appointments.

**Steps:**
1. Read `src/app/dashboard/patient/appointments/page.tsx`
2. Verify upcoming and past appointment lists query real data (currently WORKING)
3. Implement **Reschedule** flow:
   - Click "Reschedule" on an appointment
   - Open a modal or inline calendar showing the provider's available slots
   - Select new date/time -> update the `appointments` record
   - Notify the provider of the change
4. Verify **Cancel** flow works (currently WORKING -- just verify)
5. Implement **"Join Video Call"** button:
   - Show only for video appointments within 15 minutes of start time
   - Button links to the video consultation page with the appointment ID
6. Add **document upload** for upcoming appointments (attach files to `appointment_documents`)

**Files:**
- `src/app/dashboard/patient/appointments/page.tsx`
- `src/components/appointments/RescheduleAppointment.tsx`
- `src/components/appointments/CancelAppointment.tsx`
- `src/services/appointmentService.ts`

**Acceptance:** Patients can see all appointments, reschedule to a new time, cancel with a reason, and join video calls when the time arrives.

---

### Task 2.5: Appointment Management -- Provider Side (PARTIAL)

**Goal:** Providers can view appointments in calendar/list/queue views and manage them.

**Steps:**
1. Read `src/app/dashboard/provider/appointments/page.tsx`
2. Wire the **Calendar View** to show real appointments:
   - Read `src/components/appointments/AppointmentCalendarView.tsx`
   - Fetch provider's appointments from `appointments` table
   - Display on day/week/month calendar
3. Wire the **List View** with filters:
   - Read `src/components/appointments/AppointmentListView.tsx`
   - Filter by date range, status, visit type
4. Wire the **Queue View** for today's patients:
   - Show today's appointments in order
   - "Start Consultation" button -> update status to `in_progress`
   - "Mark Complete" -> update status to `completed`
5. Add patient details preview (name, reason, questionnaire answers) for each appointment
6. Wire the appointment history page at `/dashboard/provider/appointments/history`

**Files:**
- `src/app/dashboard/provider/appointments/page.tsx`
- `src/app/dashboard/provider/appointments/queue/page.tsx`
- `src/app/dashboard/provider/appointments/history/page.tsx`
- `src/components/appointments/AppointmentCalendarView.tsx`
- `src/components/appointments/AppointmentListView.tsx`
- `src/services/appointmentService.ts`
- `src/services/enhancedAppointmentService.ts`

**Acceptance:** Providers see their appointments in all three views, can start/complete consultations, and view patient details.

---

### Task 2.6: Provider Schedule Management (PARTIAL)

**Goal:** Providers can set their weekly availability, appointment slot durations, and date overrides.

**Steps:**
1. Read `src/app/dashboard/provider/schedule/page.tsx` and `src/components/provider/AvailabilityManager.tsx`
2. Build the weekly template editor:
   - For each day of the week, set start time, end time, and whether available
   - Save to `provider_schedules` table
3. Build the slot duration selector (15, 20, 30, 45, 60 minutes)
4. Build the buffer time selector (0, 5, 10, 15 minutes between appointments)
5. Build date-specific overrides:
   - Block specific dates (vacation)
   - Add extra availability (weekend clinic)
   - Save to `provider_availability` or `provider_schedule_overrides` table
6. Separate in-person and video availability toggles

**Files:**
- `src/app/dashboard/provider/schedule/page.tsx`
- `src/components/provider/AvailabilityManager.tsx`
- `src/services/providerProfileService.ts`

**Acceptance:** Provider sets weekly hours, and those hours appear as available slots when patients try to book.

---

## Phase 3: Video Consultation (Telemedicine)

### Task 3.1: Daily.co SDK Integration (NEW)

**Goal:** Integrate Daily.co for real video calls between patients and providers.

**Steps:**
1. Add Daily.co SDK: install `@daily-co/daily-js` package
2. Create a utility service `src/services/dailyService.ts`:
   - `createRoom()` -- calls Daily.co API (via Edge Function) to create a video room
   - `getToken()` -- generates a meeting token for a participant
   - `deleteRoom()` -- cleanup after consultation ends
3. Create a Supabase Edge Function `create-daily-room`:
   - Accepts appointment ID, validates the caller is the provider or patient
   - Calls Daily.co REST API to create a room with appropriate settings
   - Returns the room URL and tokens
   - Store Daily.co API key as a Supabase secret
4. Update `telemedicineService.ts` to call the Edge Function when creating a consultation

**Files:**
- `src/services/dailyService.ts` (new)
- `supabase/functions/create-daily-room/index.ts` (new Edge Function)
- `src/services/telemedicineService.ts`

**Acceptance:** Calling `createRoom()` returns a valid Daily.co room URL that can be joined by two participants.

---

### Task 3.2: Virtual Waiting Room (PARTIAL)

**Goal:** Before a video call, patients wait in a virtual waiting room. Providers admit them.

**Steps:**
1. Read `src/components/telemedicine/VirtualWaitingRoom.tsx`
2. When patient clicks "Join Video Call":
   - Update consultation status to `waiting`
   - Show system check UI (camera/mic permissions test)
   - Show queue position and estimated wait time
   - Show pre-visit questionnaire summary
3. Provider side: Read `src/components/telemedicine/VirtualWaitingRoomManager.tsx`
   - Show list of waiting patients with their details
   - "Admit" button -> update status to `in_progress`, trigger room join for both parties
4. Use Supabase Realtime to update waiting room status in real-time:
   - Patient sees when they're admitted
   - Provider sees when patient joins waiting room

**Files:**
- `src/components/telemedicine/VirtualWaitingRoom.tsx`
- `src/components/telemedicine/VirtualWaitingRoomManager.tsx`
- `src/app/dashboard/patient/video-consultation/page.tsx`
- `src/app/dashboard/provider/telemedicine/waiting-room/page.tsx`

**Acceptance:** Patient enters waiting room, provider sees them waiting, provider clicks "Admit", both parties join the same video room.

---

### Task 3.3: Video Consultation Interface (PARTIAL)

**Goal:** Live video/audio session with in-session tools for the provider.

**Steps:**
1. Read `src/components/telemedicine/VideoConsultationInterface.tsx`
2. Replace hardcoded provider names with real data from the consultation record
3. Embed Daily.co iframe or use Daily.co React component:
   - Pass room URL and participant token
   - Handle join/leave events
   - Handle connection quality indicators
4. Add provider-side tool panels:
   - **Patient Summary:** Read `src/components/telemedicine/PatientSummaryPanel.tsx` -- fetch real patient data
   - **Secure Chat:** Read `src/components/telemedicine/SecureMessaging.tsx` -- wire to `consultation_messages` table with Realtime
   - **SOAP Notes:** Read `src/components/telemedicine/AISoapNotesEditor.tsx` -- save to `clinical_notes` table
   - **E-Prescription:** Wire to `src/components/prescriptions/PrescriptionWriter.tsx`
5. Add "End Consultation" button:
   - Update consultation status to `completed`
   - Record actual end time and duration
   - Trigger post-visit workflow

**Files:**
- `src/components/telemedicine/VideoConsultationInterface.tsx`
- `src/components/telemedicine/AdvancedVideoConsultation.tsx`
- `src/components/telemedicine/PatientSummaryPanel.tsx`
- `src/components/telemedicine/SecureMessaging.tsx`
- `src/services/telemedicineService.ts`

**Acceptance:** Two users can have a live video call. Provider can view patient info, chat, take SOAP notes, and write prescriptions during the call.

---

### Task 3.4: Post-Visit Workflow (PARTIAL)

**Goal:** After consultation ends, provider completes notes and patient sees a visit summary.

**Steps:**
1. Read `src/components/telemedicine/PostVisitWorkflow.tsx`
2. Provider side after ending call:
   - Finalize SOAP notes
   - Generate prescriptions (if needed)
   - Set follow-up recommendation (date, reason)
   - Mark consultation as fully complete
3. Patient side:
   - Show visit summary (diagnosis, prescriptions, follow-up instructions)
   - Show "Leave a Review" prompt
   - Show any prescriptions written during the visit
   - Show follow-up booking CTA

**Files:**
- `src/components/telemedicine/PostVisitWorkflow.tsx`
- `src/components/telemedicine/ConsultationFeedback.tsx`

**Acceptance:** After a video call ends, the provider can finalize notes, and the patient sees a summary with prescriptions and follow-up info.

---

## Phase 4: Prescription Pipeline

### Task 4.1: Prescription Writer (PARTIAL)

**Goal:** Providers can write e-prescriptions during or after consultations.

**Steps:**
1. Read `src/components/prescriptions/PrescriptionWriter.tsx`
2. Implement medication search:
   - Query `medications` or use a hardcoded Canadian drug list with DIN codes
   - Autocomplete search by drug name
3. Implement the prescription form:
   - Medication name, DIN, dosage, frequency, duration, quantity
   - Number of refills allowed
   - Patient instructions
   - Pharmacy notes
   - Substitution allowed toggle
4. Implement drug interaction check:
   - Compare new medication against patient's existing medications (from `patient_medications`)
   - Show warning if conflicts detected
5. Save prescription to `prescriptions` table with items in `prescription_items`
6. Generate a unique prescription number
7. Log the creation on the audit chain via `blockchainAuditService.logPrescriptionCreated()`

**Files:**
- `src/components/prescriptions/PrescriptionWriter.tsx`
- `src/services/prescriptionService.ts`
- `src/services/enhancedPrescriptionService.ts`
- `src/services/blockchainAuditService.ts`

**Acceptance:** Provider writes a prescription, it's saved with a unique number, drug interactions are checked, and the audit chain records the event.

---

### Task 4.2: Prescription Delivery -- Provider Suggests Pharmacy (NEW)

**Goal:** When writing a prescription, the provider can suggest a pharmacy to send it to.

**Steps:**
1. In the Prescription Writer, add a "Suggest Pharmacy" option:
   - Search pharmacies by name or location
   - Select a pharmacy -> set `pharmacy_id` on the prescription
   - Set prescription status to `sent`
2. Patient receives notification: "Dr. X sent your prescription to [Pharmacy Name]"
3. Patient can accept (no action needed) or redirect (see Task 4.3)
4. Log the prescription-send event on audit chain

**Files:**
- `src/components/prescriptions/PrescriptionWriter.tsx`
- `src/services/prescriptionService.ts`
- `src/services/notificationService.ts`

**Acceptance:** Provider can suggest a pharmacy, and the prescription shows in that pharmacy's incoming queue.

---

### Task 4.3: Prescription Delivery -- Patient Chooses/Redirects Pharmacy (NEW)

**Goal:** Patient can choose a pharmacy for their prescription, or redirect one that was already sent.

**Steps:**
1. Read `src/app/dashboard/patient/prescriptions/page.tsx`
2. For prescriptions with status `pending` (no pharmacy assigned):
   - Add "Send to Pharmacy" button
   - Open pharmacy discovery UI (search by name, location, hours, delivery)
   - Select pharmacy -> update `pharmacy_id`, set status to `sent`
3. For prescriptions already sent to a pharmacy:
   - Add "Redirect to Different Pharmacy" button
   - Same pharmacy discovery UI
   - Update `pharmacy_id` to new pharmacy, notify old pharmacy of cancellation
4. Log all consent and redirection actions on audit chain
5. Create consent record granting the chosen pharmacy access to the prescription

**Files:**
- `src/app/dashboard/patient/prescriptions/page.tsx`
- `src/components/pharmacy/PharmacyDiscovery.tsx`
- `src/services/prescriptionService.ts`
- `src/services/blockchainAuditService.ts`

**Acceptance:** Patient can send a prescription to any pharmacy and redirect it after the fact. Both actions are audit-logged.

---

### Task 4.4: Pharmacy Prescription Receiving & Processing (SCAFFOLDED)

**Goal:** Pharmacies receive prescriptions and process them through a verification workflow.

**Steps:**
1. Read `src/app/dashboard/pharmacy/prescriptions/page.tsx` and `src/app/dashboard/pharmacy/prescriptions/pending/page.tsx`
2. Replace mock data with real Supabase queries:
   - Fetch prescriptions where `pharmacy_id` = current pharmacy AND status = `sent`
3. For each incoming prescription, display:
   - Patient name and contact info
   - Prescribing provider name and license
   - Medications, dosages, quantities
   - Patient insurance info
   - Provider notes
4. Add verification workflow:
   - "Verify & Accept" -> creates a pharmacy order, updates prescription status to `processing`
   - "Flag Issue" -> sends message back to prescribing provider
5. Wire up `src/app/dashboard/pharmacy/prescriptions/refills/page.tsx` with real refill request data

**Files:**
- `src/app/dashboard/pharmacy/prescriptions/page.tsx`
- `src/app/dashboard/pharmacy/prescriptions/pending/page.tsx`
- `src/app/dashboard/pharmacy/prescriptions/refills/page.tsx`
- `src/services/pharmacyPrescriptionService.ts`

**Acceptance:** Pharmacy sees incoming prescriptions from real data, can verify and accept them, which creates orders in the fulfillment queue.

---

### Task 4.5: Pharmacy Order Fulfillment (SCAFFOLDED)

**Goal:** Pharmacies can process orders from verified prescriptions through to patient pickup/delivery.

**Steps:**
1. Read `src/app/dashboard/pharmacy/orders/page.tsx`, `pending/page.tsx`, `history/page.tsx`
2. Replace all mock data with real Supabase queries from `pharmacy_orders` table
3. Build the fulfillment workflow:
   - **Pending:** Show orders awaiting fulfillment
   - **Processing:** Pharmacist picks medications, verifies correct items
   - **Filled:** Pharmacist approves, marks order ready
   - **Ready for Pickup:** Patient notified
   - **Delivered** (if delivery): Assign to delivery, track status
4. Each status change:
   - Update `pharmacy_orders` status
   - Send notification to patient
   - Log on audit chain
5. Subtract fulfilled items from `pharmacy_inventory`

**Files:**
- `src/app/dashboard/pharmacy/orders/page.tsx`
- `src/app/dashboard/pharmacy/orders/pending/page.tsx`
- `src/app/dashboard/pharmacy/orders/history/page.tsx`
- `src/services/pharmacyOrderFulfillmentService.ts`
- `src/services/pharmacyInventoryService.ts`

**Acceptance:** Prescription acceptance creates an order. Pharmacy moves it through Processing -> Filled -> Ready. Patient receives notifications at each step.

---

### Task 4.6: Medication Refills (PARTIAL)

**Goal:** Patients can request medication refills, providers approve, and pharmacies fulfill.

**Steps:**
1. Read `src/app/dashboard/patient/medications/page.tsx`
2. For each active medication, add "Request Refill" button:
   - Check if refills remaining > 0
   - Create a refill request in `prescription_refills` table with status `pending`
   - Notify the prescribing provider
3. Provider refill management at `/dashboard/provider/prescriptions/refills`:
   - Show pending refill requests
   - Provider reviews and approves/denies
   - Approval sends notification to pharmacy
4. Pharmacy processes approved refill as a new order

**Files:**
- `src/app/dashboard/patient/medications/page.tsx`
- `src/app/dashboard/provider/prescriptions/refills/page.tsx`
- `src/services/prescriptionService.ts`

**Acceptance:** Patient requests refill -> Provider approves -> Pharmacy receives and fills -> Patient notified.

---

## Phase 5: Health Records & FHIR

### Task 5.1: Health Records Viewer -- Patient (PARTIAL)

**Goal:** Patients can view their complete health records across all tabs. All record access is free -- no paywall.

**Steps:**
1. Read `src/app/dashboard/patient/health-records/page.tsx` and `src/components/ehr/PatientEHRViewer.tsx`
2. Wire each tab to real data:
   - **Timeline:** Read `src/components/health-records/HealthTimelineTab.tsx` -- query all events (appointments, prescriptions, lab results) in chronological order
   - **Medications:** Read `src/components/health-records/MedicationsTab.tsx` -- query `patient_medications`
   - **Lab Results:** Read `src/components/health-records/LabResultsTab.tsx` -- query `fhir_observations` where category = lab
   - **Allergies:** Read `src/components/health-records/AllergiesTab.tsx` -- query `patient_allergies`
   - **Immunizations:** Read `src/components/health-records/ImmunizationsTab.tsx` -- query immunization records
   - **Clinical Notes:** Read `src/components/health-records/ClinicalNotesTab.tsx` -- query `clinical_notes` shared with patient
3. Each tab should show real data from Supabase with proper loading states and empty states
4. Record sharing and basic export are also free (no premium gating for MVP)

**Files:**
- `src/components/ehr/PatientEHRViewer.tsx`
- `src/components/health-records/HealthTimelineTab.tsx`
- `src/components/health-records/MedicationsTab.tsx`
- `src/components/health-records/LabResultsTab.tsx`
- `src/components/health-records/AllergiesTab.tsx`
- `src/components/health-records/ImmunizationsTab.tsx`
- `src/components/health-records/ClinicalNotesTab.tsx`
- `src/services/healthRecordsService.ts`

**Acceptance:** Each tab shows real patient data. Empty states display when no records exist.

---

### Task 5.2: Record Sharing & Consent UI (NEW)

**Goal:** Patients can share records with providers and set time-based access windows.

**Steps:**
1. Read `src/components/health-records/ShareRecordsModal.tsx`
2. Build the sharing workflow:
   - Patient selects records to share (or "all records")
   - Patient selects recipient provider from their provider list
   - Patient sets time window (7 days, 30 days, 90 days, permanent)
   - Patient confirms -> create `consent_records` entry with scope, grantee, and time window
3. Build the consent management view:
   - Show all active consents
   - Show expired consents
   - "Revoke" button -> update consent status to `revoked`, log on audit chain
4. Ensure RLS policies check consent records before allowing provider access to patient data

**Files:**
- `src/components/health-records/ShareRecordsModal.tsx`
- New: consent management component
- `src/services/healthRecordsService.ts`

**Acceptance:** Patient shares records with a provider, provider can access them within the time window, patient can revoke access.

---

### Task 5.3: Record Export (PARTIAL)

**Goal:** Patients can export their health records as PDF or FHIR bundle.

**Steps:**
1. Read `src/components/health-records/ExportRecordsModal.tsx`
2. Implement PDF export:
   - Select date range and record types
   - Generate a formatted PDF (using browser print or a PDF library)
   - Download to user's device
3. Implement FHIR bundle export:
   - Map selected records to FHIR R4 JSON resources
   - Package as a FHIR Bundle resource
   - Download as JSON file
4. Log export actions on audit chain

**Files:**
- `src/components/health-records/ExportRecordsModal.tsx`
- `src/services/fhirService.ts`
- `src/services/healthRecordsService.ts`

**Acceptance:** Patient can export their records in both formats. Exported FHIR JSON is valid R4 format.

---

### Task 5.4: Clinical Documentation -- Provider (PARTIAL)

**Goal:** Providers can write, edit, and finalize SOAP notes for patient visits.

**Steps:**
1. Read `src/app/dashboard/provider/clinical-notes/page.tsx` and `src/components/clinical/ClinicalNotesEditor.tsx`
2. Build the notes interface:
   - Select patient (from recent visits or search)
   - SOAP sections: Subjective, Objective, Assessment, Plan
   - ICD-10 code lookup for Assessment (read `src/components/ehr/ICD10Lookup.tsx`)
   - Vital signs entry (read `src/components/ehr/VitalSignsForm.tsx`)
3. Save draft notes to `clinical_notes` table
4. "Finalize & Sign" -> mark as signed, record digital signature, log on audit chain
5. Note versioning: each edit creates a new version, previous versions preserved
6. Wire up clinical note templates at `/dashboard/provider/templates`

**Files:**
- `src/app/dashboard/provider/clinical-notes/page.tsx`
- `src/components/clinical/ClinicalNotesEditor.tsx`
- `src/components/ehr/ICD10Lookup.tsx`
- `src/components/ehr/VitalSignsForm.tsx`
- `src/components/ehr/SOAPNoteEditor.tsx`
- `src/services/clinicalNotesService.ts`
- `src/services/ehrService.ts`

**Acceptance:** Provider can write SOAP notes, search ICD-10 codes, enter vitals, save drafts, finalize with signature, and notes are versioned.

---

### Task 5.5: Provider Patient Charts (PARTIAL)

**Goal:** Providers can view a patient's chart with history, medications, allergies, labs, and notes.

**Steps:**
1. Read `src/app/dashboard/provider/patients/page.tsx`
2. Build patient list (patients who have had appointments with this provider)
3. Patient chart view:
   - Demographics (from `user_profiles` + `patients`)
   - Visit history with this provider
   - Active medications (from `patient_medications`)
   - Allergies (from `patient_allergies`)
   - Lab results (from `fhir_observations`)
   - Clinical notes (only notes written by this provider)
4. All data access must check consent records:
   - Only show data within active consent windows
   - Log every data access on audit chain

**Files:**
- `src/app/dashboard/provider/patients/page.tsx`
- `src/services/patientService.ts`
- `src/services/ehrService.ts`
- `src/services/blockchainAuditService.ts`

**Acceptance:** Provider sees only their patients, views consent-gated data, and every access is audit-logged.

---

## Phase 6: Pharmacy Operations

### Task 6.1: Pharmacy Dashboard -- Real Data (SCAFFOLDED)

**Goal:** Replace all hardcoded stats with real Supabase queries.

**Steps:**
1. Read `src/app/dashboard/pharmacy/dashboard/page.tsx`
2. Replace hardcoded stats:
   - Pending orders: `SELECT count(*) FROM pharmacy_orders WHERE pharmacy_id = ? AND status = 'pending'`
   - Total orders: `SELECT count(*) FROM pharmacy_orders WHERE pharmacy_id = ?`
   - Active products: `SELECT count(*) FROM pharmacy_inventory WHERE pharmacy_id = ? AND quantity > 0`
   - Low stock: `SELECT count(*) FROM pharmacy_inventory WHERE pharmacy_id = ? AND quantity <= reorder_level`
   - Customers: `SELECT count(DISTINCT patient_id) FROM pharmacy_orders WHERE pharmacy_id = ?`
   - Revenue: `SELECT sum(total) FROM pharmacy_orders WHERE pharmacy_id = ? AND status = 'completed' AND created_at >= [month_start]`
3. Replace mock recent orders with real query
4. Replace mock low stock alerts with real query

**Files:**
- `src/app/dashboard/pharmacy/dashboard/page.tsx`
- `src/services/pharmacyService.ts`

**Acceptance:** Dashboard shows real numbers from the database. Numbers update as data changes.

---

### Task 6.2: Pharmacy Inventory Management (SCAFFOLDED)

**Goal:** Pharmacies can manage their product inventory with real data.

**Steps:**
1. Read `src/app/dashboard/pharmacy/inventory/page.tsx` and `src/app/dashboard/pharmacy/inventory/add/page.tsx`
2. Inventory list page:
   - Fetch products from `pharmacy_inventory` table
   - Search by product name, DIN, category
   - Filter by stock status (all, low stock, out of stock)
   - Sort by name, quantity, expiration date
3. Add product page:
   - Form: DIN, name, manufacturer, category, form, unit price, quantity, reorder threshold, expiration date
   - Save to `pharmacy_inventory`
4. Edit product:
   - Update quantity, price, threshold
   - Record stock adjustments
5. Low stock alerts:
   - Highlight items where `quantity <= reorder_level`

**Files:**
- `src/app/dashboard/pharmacy/inventory/page.tsx`
- `src/app/dashboard/pharmacy/inventory/add/page.tsx`
- `src/services/pharmacyInventoryService.ts`

**Acceptance:** Pharmacy can view, add, edit inventory items. Low stock alerts show accurately.

---

### Task 6.3: Pharmacy Customer Management (SCAFFOLDED)

**Goal:** Pharmacies can view and manage their customers.

**Steps:**
1. Read `src/app/dashboard/pharmacy/customers/page.tsx`
2. Fetch customers from `pharmacy_orders` joined with `user_profiles`:
   - Distinct patients who have ordered from this pharmacy
3. Customer detail view:
   - Contact information
   - Prescription history at this pharmacy
   - Active medications
   - Insurance on file
   - Allergy alerts (flagged prominently)

**Files:**
- `src/app/dashboard/pharmacy/customers/page.tsx`
- `src/services/pharmacyService.ts`

**Acceptance:** Pharmacy sees real customer list with prescription history and allergy alerts.

---

### Task 6.4: Pharmacy Profile & Hours (SCAFFOLDED)

**Goal:** Pharmacy can edit their profile and business hours.

**Steps:**
1. Read `src/app/dashboard/pharmacy/profile/page.tsx` and `src/app/dashboard/pharmacy/hours/page.tsx`
2. Profile page:
   - Fetch pharmacy data from `pharmacies` table
   - Edit: name, address, phone, fax, description, services
   - Logo upload to Supabase Storage
   - Accepted insurance plans
   - Save changes to database
3. Hours page:
   - Set business hours per day of week
   - Save to pharmacy record or `pharmacy_hours` table
   - Holiday closures

**Files:**
- `src/app/dashboard/pharmacy/profile/page.tsx`
- `src/app/dashboard/pharmacy/hours/page.tsx`
- `src/components/pharmacy/PharmacyProfile.tsx`
- `src/services/pharmacyService.ts`

**Acceptance:** Pharmacy can update their profile and hours, changes persist and display correctly.

---

## Phase 7: Messaging & Notifications

### Task 7.1: In-App Notification System (PARTIAL)

**Goal:** All roles receive real-time in-app notifications.

**Steps:**
1. Read `src/components/notifications/NotificationBell.tsx` and `src/services/notificationService.ts`
2. Verify notifications are created in the `notifications` table when events occur:
   - Appointment booked/cancelled/rescheduled
   - Prescription status changed
   - New message received
   - Order status changed
   - Application approved/denied
3. Fetch notifications for current user on page load
4. Subscribe to Supabase Realtime for new notifications:
   - `supabase.channel('notifications').on('postgres_changes', ...)`
   - Play a sound or show browser notification for new items
5. Mark as read on click
6. Wire up the notification pages for all roles

**Files:**
- `src/components/notifications/NotificationBell.tsx`
- `src/app/dashboard/notifications/page.tsx`
- `src/services/notificationService.ts`

**Acceptance:** Users receive real-time notifications in the bell icon. Clicking shows the notification list. Unread count updates live.

---

### Task 7.2: Secure Messaging System (PARTIAL)

**Goal:** Patients and providers can exchange secure messages.

**Steps:**
1. Read `src/app/dashboard/patient/messages/page.tsx` and `src/services/messagingService.ts`
2. Build the messaging interface:
   - Thread list showing conversations with providers
   - Click thread -> show message history
   - Compose new message with text and file attachments
   - Upload attachments to Supabase Storage
3. Wire to Supabase Realtime for live message delivery:
   - Subscribe to messages table changes for current user
   - New messages appear instantly without refresh
4. Provider messaging at `/dashboard/provider/messaging/inbox`:
   - Same thread-based interface
   - Reply to patient messages
   - Mark as read/unread
5. Read receipts: update `read_at` timestamp when message is viewed

**Files:**
- `src/app/dashboard/patient/messages/page.tsx`
- `src/app/dashboard/provider/messaging/inbox/page.tsx`
- `src/services/messagingService.ts`

**Acceptance:** Patient sends message -> Provider sees it in real-time -> Provider replies -> Patient sees reply in real-time. Attachments work.

---

### Task 7.3: Provider Message Templates & Automation (NEW)

**Goal:** Providers can create message templates and configure automated messages.

**Steps:**
1. Read `src/app/dashboard/provider/messaging/templates/page.tsx`
2. Template CRUD:
   - Create templates with category (appointment reminder, follow-up, general)
   - Template body with placeholder variables ({patient_name}, {appointment_date}, etc.)
   - Apply template when composing a new message
3. Automated messages at `/dashboard/provider/messaging/automated`:
   - Configure triggers: appointment reminder (24h before), post-visit follow-up (24h after)
   - Select template for each trigger
   - Enable/disable toggles

**Files:**
- `src/app/dashboard/provider/messaging/templates/page.tsx`
- `src/app/dashboard/provider/messaging/automated/page.tsx`
- `src/services/messagingService.ts`

**Acceptance:** Provider creates templates, configures automated messages, and they send at the configured triggers.

---

## Phase 8: Billing & Payments

### Task 8.1: Stripe Integration Setup (NEW)

**Goal:** Set up Stripe for collecting patient payments (platform collects all payments, no Stripe Connect).

**Steps:**
1. Create a Supabase Edge Function `create-stripe-checkout`:
   - Accepts appointment ID, amount, patient ID, provider ID
   - Creates a Stripe Checkout Session (or Payment Intent)
   - Payments go to the platform's Stripe account (not directly to providers)
   - Returns the client secret or checkout URL
2. Create a Supabase Edge Function `stripe-webhook`:
   - Handles `payment_intent.succeeded`, `payment_intent.failed` events
   - Updates `billing_transactions` table
   - Creates notification for patient and provider
   - Updates provider's unsettled earnings balance
3. Store Stripe API keys as Supabase secrets (never in frontend code)

**Files:**
- `supabase/functions/create-stripe-checkout/index.ts` (new)
- `supabase/functions/stripe-webhook/index.ts` (new)

**Acceptance:** Edge functions deploy successfully and can create Stripe sessions. Payments flow to the platform account.

---

### Task 8.2: Payment at Booking (NEW)

**Goal:** Patients pay (or authorize payment) during the booking process.

**Steps:**
1. Update the booking wizard's Payment Step:
   - If self-pay: call `create-stripe-checkout` Edge Function
   - Display estimated cost
   - Redirect to Stripe Checkout or embed Stripe Elements
   - On success: create appointment with payment status `paid`
   - On failure: show error, allow retry
2. If insurance: record insurance card selection, mark payment as `insurance_pending`
3. Create `billing_transactions` record for every payment
4. Update the provider's unsettled balance in the `provider_settlements` tracking

**Files:**
- `src/components/booking/PaymentStep.tsx`
- `src/services/paymentService.ts`

**Acceptance:** Patient can complete a payment during booking. Transaction is recorded in the database. Provider's unsettled balance increases.

---

### Task 8.3: Provider Earnings Dashboard with Settlement History (PARTIAL)

**Goal:** Providers see their earnings, unsettled balance, and settlement history from admin payouts.

**Steps:**
1. Read `src/app/dashboard/provider/billing/earnings/page.tsx`
2. Query `billing_transactions` for this provider:
   - Total earned (period)
   - Platform commission deducted
   - Net payable (unsettled balance)
   - Breakdown by service type
3. Settlement history:
   - Query `provider_settlements` table
   - Show past payouts: date, amount, method (e-transfer, cheque, wire), reference number
4. Transaction list with date, patient, service, amount, status
5. Export functionality for tax purposes

**Files:**
- `src/app/dashboard/provider/billing/earnings/page.tsx`
- `src/services/providerBillingService.ts`

**Acceptance:** Provider sees real earnings data with unsettled balance, settlement history, and can export statements.

---

### Task 8.4: Admin Manual Settlement System (NEW)

**Goal:** Admin can manually settle with providers by recording payouts.

**Steps:**
1. Create `provider_settlements` table (via migration):
   - `id`, `provider_id`, `amount`, `commission_deducted`, `net_paid`, `payment_method` (e-transfer, cheque, wire, other), `reference_number`, `notes`, `settled_by` (admin user ID), `settled_at`, `period_start`, `period_end`
2. Build the admin settlement queue page:
   - List all providers with unsettled balances
   - For each provider: total earned since last settlement, commission rate, net payable
   - Sort by highest balance
3. Build the "Record Settlement" form:
   - Pre-filled with provider's unsettled amount
   - Admin enters: amount paid, payment method, reference number, optional notes
   - Confirm -> creates `provider_settlements` record
   - Updates provider's settled-through date
   - Creates notification for the provider
   - Logs on audit chain
4. Settlement history view with filters by provider, date, method

**Files:**
- New migration for `provider_settlements` table
- `src/app/dashboard/admin/finance/settlements/page.tsx` (new)
- `src/services/financeService.ts`
- `src/services/notificationService.ts`

**Acceptance:** Admin can view unsettled balances, record a manual settlement, and provider sees it in their settlement history.

---

### Task 8.5: Insurance Claim Tracking (SCAFFOLDED)

**Goal:** Track insurance claims through their lifecycle (no electronic submission for MVP).

**Steps:**
1. Read `src/app/dashboard/provider/billing/claims/page.tsx`
2. After a billable appointment is completed:
   - Auto-generate a claim record in `insurance_claims` table
   - Include: patient insurance info, CPT codes, ICD-10 codes, amounts
3. Provider/admin can manually update claim status:
   - Created -> Submitted -> Under Review -> Approved/Denied/Partial
4. Show claim history with filters

**Files:**
- `src/app/dashboard/provider/billing/claims/page.tsx`
- `src/services/insuranceBillingService.ts`

**Acceptance:** Claims are auto-created after appointments. Status can be manually updated. History is visible.

---

### Task 8.6: Patient Billing & Insurance (PARTIAL)

**Goal:** Patients can view their payment history, manage insurance cards, and see outstanding balances.

**Steps:**
1. Read `src/app/dashboard/patient/billing/page.tsx`
2. Insurance card management:
   - Read `src/components/patient/InsuranceCardManager.tsx`
   - Add new card (upload images, enter details)
   - Edit/delete existing cards
   - Set primary/secondary designation
3. Payment history from `billing_transactions` where patient_id matches
4. Download receipts/invoices
5. Outstanding balance display

**Files:**
- `src/app/dashboard/patient/billing/page.tsx`
- `src/components/patient/InsuranceCardManager.tsx`
- `src/services/patientInsuranceCardService.ts`
- `src/services/paymentService.ts`

**Acceptance:** Patient can manage insurance cards, view all past payments, and download receipts.

---

## Phase 9: Admin Operations

### Task 9.1: Admin Dashboard -- Real Data (SCAFFOLDED)

**Goal:** Replace all hardcoded admin dashboard stats with real Supabase queries.

**Steps:**
1. Read `src/app/dashboard/admin/dashboard/page.tsx`
2. Replace hardcoded stats:
   - Total users: `SELECT count(*) FROM user_profiles`
   - Total providers: `SELECT count(*) FROM providers WHERE status = 'active'`
   - Total patients: `SELECT count(*) FROM patients`
   - Total pharmacies: `SELECT count(*) FROM pharmacies WHERE status = 'active'`
   - Active appointments: `SELECT count(*) FROM appointments WHERE date = today AND status IN ('scheduled', 'in_progress')`
   - Revenue this month: `SELECT sum(amount) FROM billing_transactions WHERE created_at >= [month_start]`
   - New registrations: `SELECT count(*) FROM user_profiles WHERE created_at >= [period_start]`
3. Wire the analytics sub-dashboard at `/dashboard/admin/dashboard/analytics`
4. Wire the finance sub-dashboard at `/dashboard/admin/dashboard/finance`
5. Wire the sales sub-dashboard at `/dashboard/admin/dashboard/sales`

**Files:**
- `src/app/dashboard/admin/dashboard/page.tsx`
- `src/app/dashboard/admin/dashboard/analytics/page.tsx`
- `src/app/dashboard/admin/dashboard/finance/page.tsx`
- `src/app/dashboard/admin/dashboard/sales/page.tsx`
- `src/services/adminService.ts`
- `src/services/dashboardAnalyticsService.ts`

**Acceptance:** Admin dashboard shows real, accurate platform stats.

---

### Task 9.2: Admin User Management (PARTIAL)

**Goal:** Admin can view, search, and manage all platform users.

**Steps:**
1. Read `src/app/dashboard/admin/users/page.tsx`
2. Fetch all users from `user_profiles` with pagination
3. Search by name, email, phone
4. Filter by role, status, registration date
5. User detail view: profile info, activity history, account status
6. Actions: activate, suspend, reset password (via Supabase Admin API Edge Function)

**Files:**
- `src/app/dashboard/admin/users/page.tsx`
- `src/services/adminService.ts`

**Acceptance:** Admin can find any user, view their details, and change their account status.

---

### Task 9.3: Admin Clinic Management -- Providers & Pharmacies (PARTIAL)

**Goal:** Admin can manage all providers and pharmacies on the platform.

**Steps:**
1. `/dashboard/admin/clinic/providers`:
   - List all providers with status, specialty, location
   - View/edit provider profiles
   - Manage provider schedules
   - View provider performance (appointments, ratings)
2. `/dashboard/admin/clinic/pharmacies`:
   - List all pharmacies with status, location
   - View/edit pharmacy profiles
   - Monitor pharmacy performance (orders, fulfillment time)
3. `/dashboard/admin/clinic/patients`:
   - List all patients (admin-level access)
   - Assist with account issues
4. Ensure all data comes from real Supabase queries

**Files:**
- `src/app/dashboard/admin/clinic/providers/page.tsx`
- `src/app/dashboard/admin/clinic/pharmacies/page.tsx`
- `src/app/dashboard/admin/clinic/patients/page.tsx`
- `src/services/adminCRUDService.ts`

**Acceptance:** Admin can browse and manage all providers, pharmacies, and patients with real data.

---

### Task 9.4: Admin Finance Management (SCAFFOLDED)

**Goal:** Admin can track platform finances with real data, including the provider settlement queue.

**Steps:**
1. Wire each finance page to real data:
   - **Settlements:** Provider settlement queue and history (see Task 8.4 for core implementation). Ensure this page is accessible from the admin finance sidebar.
   - Expenses: CRUD on `platform_expenses` table
   - Income: query `billing_transactions`, platform fees, subscriptions
   - Invoices: generate and track invoices to providers/pharmacies
   - Payments: view all payment transactions
   - Transactions: complete financial ledger
   - Refunds: process and track refund requests
2. Billing configuration: set fee structures, commission rates
3. Financial reports: aggregate queries for P&L, revenue breakdown, settlement summary

**Files:**
- `src/app/dashboard/admin/finance/settlements/page.tsx` (new -- settlement queue and history)
- `src/app/dashboard/admin/finance/expenses/page.tsx`
- `src/app/dashboard/admin/finance/income/page.tsx`
- `src/app/dashboard/admin/finance/invoices/page.tsx`
- `src/app/dashboard/admin/finance/payments/page.tsx`
- `src/app/dashboard/admin/finance/transactions/page.tsx`
- `src/app/dashboard/admin/finance/billing-config/page.tsx`
- `src/app/dashboard/admin/finance/refunds/page.tsx`
- `src/app/dashboard/admin/finance/reports/page.tsx`
- `src/services/financeService.ts`

**Acceptance:** All finance pages show real data. Admin can settle with providers, add expenses, view income, and generate reports.

---

### Task 9.5: Admin Reports (SCAFFOLDED)

**Goal:** Admin can generate platform reports.

**Steps:**
1. Income report: revenue by source, provider, period
2. Expense report: expenses by category, period
3. Profit & loss: revenue minus expenses for a period
4. Appointments report: bookings, cancellations, completion rates
5. Patients report: demographics, growth, retention
6. All reports: date range filters, export to CSV

**Files:**
- `src/app/dashboard/admin/reports/income/page.tsx`
- `src/app/dashboard/admin/reports/expenses/page.tsx`
- `src/app/dashboard/admin/reports/profit-loss/page.tsx`
- `src/app/dashboard/admin/reports/appointments/page.tsx`
- `src/app/dashboard/admin/reports/patients/page.tsx`
- `src/services/reportsService.ts`

**Acceptance:** Each report generates accurate data with date range filtering and CSV export.

---

### Task 9.6: Admin CMS -- Wire to Real Data (PARTIAL)

**Goal:** Admin can manage all marketing website content through the CMS.

**Steps:**
1. Pages: CRUD on `cms_pages` table via `cmsService`
2. Blogs: CRUD on `cms_blogs` with categories and tags
3. Testimonials: CRUD on `cms_testimonials` with moderation
4. FAQs: CRUD on `cms_faqs` by category
5. Media: upload to Supabase Storage, track in `cms_media`
6. Each content type needs: list view, create form, edit form, delete confirmation
7. Rich text editor for content body (read `src/components/ui/RichTextEditor.tsx`)
8. SEO metadata fields on each content item

**Files:**
- `src/app/dashboard/admin/content/pages/page.tsx`
- `src/app/dashboard/admin/content/blogs/page.tsx`
- `src/app/dashboard/admin/content/testimonials/page.tsx`
- `src/app/dashboard/admin/content/faqs/page.tsx`
- `src/app/dashboard/admin/content/media/page.tsx`
- `src/services/cmsService.ts`

**Acceptance:** Admin can create, edit, publish, and delete all content types. Changes appear on the frontend.

---

### Task 9.7: Admin Platform Settings (SCAFFOLDED)

**Goal:** Admin can configure platform settings.

**Steps:**
1. Read existing settings pages under `/dashboard/admin/settings/`
2. Website settings: branding, logo upload, primary colors
3. Clinic settings: default appointment durations, timezone, working hours
4. App settings: feature toggles (enable/disable telemedicine, marketplace, etc.)
5. System settings: email provider config (display-only for MVP)
6. Finance settings: currency, tax rates, default billing model
7. Save all settings to `platform_settings` table

**Files:**
- `src/app/dashboard/admin/settings/website/page.tsx`
- `src/app/dashboard/admin/settings/clinic/page.tsx`
- `src/app/dashboard/admin/settings/app/page.tsx`
- `src/app/dashboard/admin/settings/system/page.tsx`
- `src/app/dashboard/admin/settings/finance/page.tsx`
- `src/services/platformSettingsService.ts`

**Acceptance:** Admin can view and update all settings. Changes persist and affect platform behavior.

---

## Phase 10: Audit Trail & FHIR Integration

### Task 10.1: Integrate Audit Logging Across All Actions (PARTIAL)

**Goal:** Every significant action in the platform creates an audit trail entry.

**Steps:**
1. Read `src/services/blockchainAuditService.ts` -- the service with SHA-256 hashing already exists
2. Add audit logging calls to every action that needs it:
   - **Appointments:** book, reschedule, cancel, complete (in `appointmentService`)
   - **Prescriptions:** create, send, redirect, fill (in `prescriptionService`)
   - **Consent:** grant, revoke (in consent service)
   - **Health records:** view, share, export (in `healthRecordsService`)
   - **Clinical notes:** create, update, sign (in `clinicalNotesService`)
   - **Pharmacy orders:** create, fill, deliver (in `pharmacyOrderFulfillmentService`)
   - **Payments:** process, refund (in `paymentService`)
   - **Admin actions:** user management, application reviews (in `adminService`)
3. Each call should include: event type, resource type, resource ID, actor ID, actor role, action data

**Files:**
- `src/services/blockchainAuditService.ts` (already built)
- All service files listed above (add `blockchainAuditService.logEvent()` calls)

**Acceptance:** Every major action creates a hash-chained audit entry. The chain is verifiable.

---

### Task 10.2: Admin Audit Trail Viewer (SCAFFOLDED)

**Goal:** Admin can browse and verify the audit trail.

**Steps:**
1. Read `src/app/dashboard/admin/interoperability/blockchain-audit/page.tsx`
2. Build the audit log browser:
   - Fetch entries from `blockchain_audit_log` table
   - Search by user, action type, resource type, date range
   - Display entry details: timestamp, actor, action, resource, hash
   - Pagination for large result sets
3. Add chain integrity verification:
   - "Verify Chain" button -> iterate through entries, recompute hashes, verify linkage
   - Display result: "Chain Valid" or "Integrity Issue at Block #X"
4. Export functionality for compliance audits (CSV/JSON)

**Files:**
- `src/app/dashboard/admin/interoperability/blockchain-audit/page.tsx`
- `src/services/blockchainAuditService.ts`

**Acceptance:** Admin can search audit entries, verify chain integrity, and export for compliance.

---

### Task 10.3: FHIR Endpoint Management (PARTIAL)

**Goal:** Admin can configure and test FHIR server connections.

**Steps:**
1. Read `src/app/dashboard/admin/interoperability/fhir-endpoints/page.tsx`
2. Build endpoint configuration UI:
   - Add FHIR server (name, URL, authentication type, credentials)
   - Save to `fhir_endpoints` table
   - Test connection button -> attempt to fetch the server's CapabilityStatement
   - Display connection status (connected, failed, timeout)
3. Pre-configure two test servers:
   - HAPI FHIR public test server
   - SmileCDR sandbox
4. Show data exchange log (recent sync attempts, successes, failures)

**Files:**
- `src/app/dashboard/admin/interoperability/fhir-endpoints/page.tsx`
- `src/services/fhirInteroperabilityService.ts`

**Acceptance:** Admin can add FHIR endpoints, test connectivity, and see exchange logs.

---

## Phase 11: Patient Profile & Supplementary Features

### Task 11.1: Patient Profile Management (PARTIAL)

**Goal:** Patient can view and edit all profile information.

**Steps:**
1. Read `src/app/dashboard/patient/my-profile/page.tsx`
2. Wire all sections to real data:
   - Personal info (name, DOB, gender, contact) -> `user_profiles`
   - Address -> `user_profiles`
   - Emergency contacts -> `emergency_contacts` table
   - Allergies -> `patient_allergies` table
   - Current medications -> `patient_medications` table
   - Insurance cards -> `patient_insurance_cards` table
   - Profile photo upload -> Supabase Storage
3. Each section should have edit modals:
   - Read `src/components/patient/EditProfileModal.tsx`
   - Read `src/components/patient/AddEmergencyContactModal.tsx`
   - Read `src/components/patient/AddAllergyModal.tsx`
   - Read `src/components/patient/AddMedicationModal.tsx`
4. Language and notification preferences

**Files:**
- `src/app/dashboard/patient/my-profile/page.tsx`
- `src/components/patient/EditProfileModal.tsx`
- `src/components/patient/AddEmergencyContactModal.tsx`
- `src/components/patient/AddAllergyModal.tsx`
- `src/components/patient/AddMedicationModal.tsx`
- `src/services/patientService.ts`

**Acceptance:** Patient can view and edit all profile sections. Changes persist to the database.

---

### Task 11.2: Family Member Management (PARTIAL)

**Goal:** Patients can add family members and book on their behalf.

**Steps:**
1. Read `src/app/dashboard/patient/family/page.tsx`
2. Add family member form:
   - Name, date of birth, relationship (child, spouse, parent, dependent)
   - Optional: link to existing patient account
   - Save to `family_relationships` table
3. View family members list
4. Book appointment on behalf: in booking wizard, add "Booking for" selector (self or family member)
5. View family member's health records (with appropriate consent)

**Files:**
- `src/app/dashboard/patient/family/page.tsx`
- `src/services/familyManagementService.ts`
- `src/components/booking/UnifiedSearchBookingWizard.tsx`

**Acceptance:** Patient adds a family member, books an appointment for them, and the appointment is linked to the family member.

---

### Task 11.3: Pharmacy Marketplace for Patients (SCAFFOLDED)

**Goal:** Patients can browse and order OTC products from pharmacies.

**Steps:**
1. Read `src/app/dashboard/patient/pharmacy-marketplace/page.tsx`
2. Browse OTC products:
   - Fetch from `pharmacy_inventory` where category = OTC and quantity > 0
   - Filter by category, search by name
   - Show price, pharmacy name, availability
3. Product detail view
4. Add to cart -> simple cart state management
5. Checkout:
   - Select delivery or pickup
   - Select pharmacy (if multiple sell the same product)
   - Payment (self-pay)
   - Create order in `pharmacy_orders`
6. Order tracking at `/dashboard/patient/pharmacy/orders`

**Files:**
- `src/app/dashboard/patient/pharmacy-marketplace/page.tsx`
- `src/components/pharmacy/OTCProductBrowser.tsx`
- `src/components/pharmacy/OrderTracking.tsx`
- `src/services/pharmacyMarketplaceService.ts`

**Acceptance:** Patient can browse products, add to cart, checkout, and track their order.

---

### Task 11.4: Provider Profile & Credential Management (PARTIAL)

**Goal:** Providers can manage their public-facing profile and credential documents.

**Steps:**
1. Read `src/app/dashboard/provider/profile/page.tsx` and `src/components/provider/ProfileManagement.tsx`
2. Profile editing:
   - Bio, education, training
   - Specialties and procedures (from master lists)
   - Languages spoken
   - Office locations and hours
3. Credential management at `/dashboard/provider/credentials`:
   - Upload license, degree, insurance certificates to Supabase Storage
   - Track expiration dates
   - Alerts when credentials are expiring
4. Insurance plan management:
   - Read `src/components/provider/InsuranceBillingConfig.tsx`
   - Select/deselect accepted insurance plans

**Files:**
- `src/app/dashboard/provider/profile/page.tsx`
- `src/app/dashboard/provider/credentials/page.tsx`
- `src/components/provider/ProfileManagement.tsx`
- `src/components/provider/InsuranceBillingConfig.tsx`
- `src/services/providerProfileService.ts`

**Acceptance:** Provider edits profile, uploads credentials, manages insurance plans, all persisted to database.

---

### Task 11.5: Help Center (PARTIAL)

**Goal:** All users can access the help center with FAQs, articles, and support.

**Steps:**
1. Read `/dashboard/help/page.tsx` and sub-pages (chat, faqs, support)
2. FAQs page:
   - Fetch from `cms_faqs` table
   - Display by category with accordion
   - Search functionality
3. Support page:
   - Contact form that creates a support ticket (or sends to a messages table)
4. Help center articles:
   - Fetch from `help_center_articles` table
   - Search and browse by category

**Files:**
- `src/app/dashboard/help/page.tsx`
- `src/app/dashboard/help/faqs/page.tsx`
- `src/app/dashboard/help/support/page.tsx`
- `src/services/helpCenterService.ts`

**Acceptance:** Users can browse FAQs, search help articles, and submit support requests.

---

## Phase 12: Frontend Website & Polish

### Task 12.1: CMS-Driven Frontend Content (NEW)

**Goal:** Marketing website content comes from the CMS instead of being hardcoded.

**Steps:**
1. Read frontend page components in `src/components/frontend/`
2. For testimonials: fetch from `cms_testimonials` where status = 'published'
3. For FAQs: fetch from `cms_faqs` where status = 'published'
4. For any CMS-managed pages: fetch content from `cms_pages` by slug
5. Keep the hardcoded content as fallback if CMS returns empty

**Files:**
- `src/components/frontend/Testimonials.tsx`
- `src/components/frontend/FAQ.tsx`
- `src/app/frontend/page.tsx`
- `src/services/cmsService.ts`

**Acceptance:** Frontend displays CMS content. Admin changes in CMS appear on the marketing site.

---

### Task 12.2: Browse Specialties & Procedures Pages (PARTIAL)

**Goal:** Public pages for browsing specialties and procedures show real data.

**Steps:**
1. `/frontend/browse/specialties`:
   - Fetch from `specialties_master` table
   - Display as grid with descriptions
   - Click -> specialty detail page with providers who have that specialty
2. `/frontend/browse/procedures`:
   - Fetch from `procedures_master` table
   - Searchable catalog
   - Click -> procedure detail page with providers who perform it
3. Detail pages should include "Book with a [Specialty] specialist" CTA

**Files:**
- `src/app/frontend/browse/specialties/page.tsx`
- `src/app/frontend/browse/specialties/[slug]/page.tsx`
- `src/app/frontend/browse/procedures/page.tsx`
- `src/app/frontend/browse/procedures/[slug]/page.tsx`
- `src/services/specialtiesService.ts`
- `src/services/proceduresService.ts`

**Acceptance:** Specialty and procedure pages show real data with working links to providers.

---

### Task 12.3: Provider Reviews (PARTIAL)

**Goal:** Patients can leave reviews for providers after consultations.

**Steps:**
1. After a consultation is completed, show "Leave a Review" prompt
2. Review form: star rating (1-5), written review, recommend (yes/no)
3. Save to `provider_reviews` table
4. Display on provider profile page (Reviews tab)
5. Calculate average rating for provider
6. Provider can view their reviews at `/dashboard/provider/profile`

**Files:**
- `src/components/providers/ProviderReviews.tsx`
- `src/app/frontend/provider-profile/ReviewsTab.tsx`
- `src/services/providerReviewService.ts`

**Acceptance:** Patient leaves a review. It appears on the provider's public profile. Average rating is calculated.

---

## Phase 13: Admin Permissions & Staff

### Task 13.1: Admin Staff Management (PARTIAL)

**Goal:** Admin can manage admin team members with roles and permissions.

**Steps:**
1. Read `src/app/dashboard/admin/staff/page.tsx`
2. List admin staff with roles
3. Add new staff member (invite by email)
4. Assign roles and departments
5. Read `src/app/dashboard/admin/permissions/page.tsx`
6. Define custom roles with granular permissions
7. Assign permissions per role (which menu items, which actions)

**Files:**
- `src/app/dashboard/admin/staff/page.tsx`
- `src/app/dashboard/admin/permissions/page.tsx`
- `src/services/adminStaffPermissionsService.ts`
- `src/services/rolesPermissionsService.ts`

**Acceptance:** Admin can manage staff, create custom roles, and assign permissions that actually restrict access.

---

## Phase 14: Final Integration & Testing

### Task 14.1: End-to-End Flow Verification

**Goal:** Walk through every complete user flow and verify it works.

**Steps:**
1. **Patient Journey:** Register -> Complete profile -> Search provider -> Book appointment -> Join video call -> Receive prescription -> Send to pharmacy -> Track order -> Leave review
2. **Provider Journey:** Register -> Complete onboarding -> Get approved -> Set schedule -> Receive appointment -> Conduct consultation -> Write SOAP note -> Write prescription -> Track earnings
3. **Pharmacy Journey:** Register -> Complete onboarding -> Get approved -> Receive prescription -> Verify -> Fill order -> Mark ready -> Track inventory
4. **Admin Journey:** Review applications -> Manage users -> View analytics -> Manage finances -> Update CMS content -> Verify audit trail

For each flow: document any broken steps, file bugs, and fix them.

---

### Task 14.2: Audit Trail Verification

**Goal:** Verify the hash-chain audit trail is recording all significant events.

**Steps:**
1. Perform a complete patient journey
2. Check that every action created an audit entry
3. Verify chain integrity (each hash links to the previous)
4. Verify admin can browse and export the trail

---

### Task 14.3: RLS Policy Verification

**Goal:** Verify data isolation between roles and tenants.

**Steps:**
1. As Patient A: try to access Patient B's data -> should fail
2. As Provider A: try to access Provider B's patients -> should fail
3. As Provider: try to access patient data without consent -> should fail
4. As Provider: access patient data with active consent -> should succeed
5. As Provider: access patient data with expired consent -> should fail
6. As Pharmacy: try to access prescriptions from another pharmacy -> should fail
7. As Admin: verify admin can access all data for management purposes

---

### Task 14.4: Performance & UX Polish

**Goal:** Ensure the application is performant and has a polished user experience.

**Steps:**
1. Add loading skeletons to all pages that fetch data
2. Add empty states to all pages that might have no data
3. Add error handling and user-friendly error messages
4. Verify responsive design works on mobile viewports
5. Fix any console errors or warnings
6. Run `npm run build` and fix all TypeScript errors
7. Optimize large page bundles with code splitting where possible

---

## Dependency Graph

```
Phase 1 (Foundation)
  |
  v
Phase 2 (Patient Journey) -----> Phase 3 (Video) -----> Phase 4 (Prescriptions)
  |                                                          |
  v                                                          v
Phase 5 (Health Records)                              Phase 6 (Pharmacy Ops)
  |                                                          |
  v                                                          v
Phase 7 (Messaging) ---------> Phase 8 (Billing) -----> Phase 9 (Admin)
                                                             |
                                                             v
                                                      Phase 10 (Audit/FHIR)
                                                             |
                                                             v
                                Phase 11 (Supplementary) --> Phase 12 (Frontend)
                                                             |
                                                             v
                                                      Phase 13 (Permissions)
                                                             |
                                                             v
                                                      Phase 14 (Integration)
```

---

## Notes

- **Stripe** requires API keys. The platform collects all payments (no Stripe Connect for providers). Stripe API keys must be configured as Supabase secrets before Phase 8.
- **Provider payouts** are handled manually by the admin. No automatic Stripe Connect payouts. Admin records settlements via the settlement queue.
- **Patient health records** are always free. Monetization comes from premium analytics/insights features (post-MVP).
- **Dual affiliation:** Providers always have a solo practice and can optionally affiliate with clinics. The `provider_clinic_affiliations` table tracks these relationships.
- **Daily.co** requires an API key. Must be configured as a Supabase secret before Phase 3.
- **Supabase Storage** buckets for profile photos, credential documents, insurance cards, and media must be created if they don't exist.
- **RLS policies** must be verified and created for every new table added.
- When a task says "create notification," it means insert into the `notifications` table. Actual email/SMS delivery is not in MVP scope -- in-app only.
- All tasks assume the Supabase database is already provisioned and accessible (it is).
