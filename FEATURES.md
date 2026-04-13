# DoktoChain -- Feature Specification

> This document describes every feature of the DoktoChain healthcare platform, organized by domain.
> Each feature includes its scope, technical approach, and implementation status.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Authentication & Identity](#2-authentication--identity)
3. [Patient Features](#3-patient-features)
4. [Provider Features](#4-provider-features)
5. [Pharmacy Features](#5-pharmacy-features)
6. [Admin Features](#6-admin-features)
7. [Telemedicine & Video](#7-telemedicine--video)
8. [Prescriptions & Medications](#8-prescriptions--medications)
9. [Booking & Appointments](#9-booking--appointments)
10. [Billing & Payments](#10-billing--payments)
11. [Health Records & FHIR](#11-health-records--fhir)
12. [Consent & Data Sharing](#12-consent--data-sharing)
13. [Hash-Chain Audit Trail](#13-hash-chain-audit-trail)
14. [Messaging & Notifications](#14-messaging--notifications)
15. [Content Management System](#15-content-management-system)
16. [Public Marketing Website](#16-public-marketing-website)
17. [Multi-Tenancy Model](#17-multi-tenancy-model)
18. [Technical Architecture](#18-technical-architecture)
19. [Features Excluded from MVP](#19-features-excluded-from-mvp)

---

## 1. Platform Overview

DoktoChain is a Canadian healthcare platform connecting patients with healthcare providers and pharmacies. It supports the complete care lifecycle: discovery, booking, consultation (in-person and video), clinical documentation, prescription, pharmacy fulfillment, and billing.

**Core Principles:**
- Individual provider tenancy (each provider is their own tenant)
- Canadian healthcare compliance (PIPEDA, provincial health systems)
- FHIR R4 interoperability for health data
- Cryptographic audit trail for all data access and consent
- Database-enforced consent with time-based access windows

**Four User Roles:**
- **Patient** -- seeks and receives healthcare
- **Provider** -- delivers healthcare services
- **Pharmacy** -- dispenses medications and OTC products
- **Admin** -- manages the platform

---

## 2. Authentication & Identity

### 2.1 Registration

| Feature | Description |
|---------|-------------|
| Email/Password Registration | Standard email + password signup with role selection |
| Phone Registration | Phone number with OTP verification |
| Role Selection | Patient, Provider, or Pharmacy chosen at registration |
| Profile Completion Wizard | Multi-step guided profile setup after registration |

### 2.2 Login & Session

| Feature | Description |
|---------|-------------|
| Email/Password Login | Standard credential-based login |
| Phone OTP Login | SMS-based one-time password login |
| Multi-Factor Authentication (MFA) | Optional second factor for enhanced security |
| Persistent Sessions | Auto-refresh JWT tokens with Supabase Auth |
| Role-Based Redirect | Auto-routes to correct dashboard after login |

### 2.3 Authorization

| Feature | Description |
|---------|-------------|
| Protected Routes | Role-gated route access via ProtectedRoute component |
| Row-Level Security (RLS) | Database-enforced data isolation per user/role |
| Granular Permissions | Admin-configurable feature-level access control |

**Tech:** Supabase Auth, JWT tokens, RLS policies, React context

---

## 3. Patient Features

### 3.1 Patient Dashboard

- Personalized health overview
- Upcoming appointments summary
- Active medications count
- Unread messages indicator
- Quick action buttons (book appointment, view records, message provider)
- Health analytics and wellness score

### 3.2 Patient Profile

- Personal information management (name, DOB, gender, contact)
- Address management
- Emergency contacts (add, edit, delete)
- Allergy management with severity levels
- Current medications list
- Insurance card management (upload front/back images, policy details)
- Primary/secondary insurance designation
- Profile photo upload
- Language and notification preferences

### 3.3 Family Management

- Add family members (children, spouse, dependents)
- Book appointments on behalf of family members
- View family member health records (consent-gated)
- Manage family member medications

### 3.4 Health Tracking

- Vital signs logging (blood pressure, heart rate, temperature, weight)
- Health goal setting and tracking
- Trend visualization with charts

### 3.5 Insurance Card Management

- Upload and store insurance card images (front and back)
- Store policy details (provider, policy number, group number)
- Designate primary and secondary insurance
- Select insurance card when booking appointments
- Self-pay option available

---

## 4. Provider Features

### 4.1 Provider Dashboard

- Today's appointment count and upcoming schedule
- Patients in virtual waiting room
- Pending prescription refills
- Unread messages count
- Monthly earnings summary
- Pending insurance claims
- Quick-start actions

### 4.2 Provider Profile (Public-Facing)

- Professional biography
- Education and training history
- Board certifications and credentials
- Specialty and sub-specialty designations
- Procedures offered with pricing
- Languages spoken
- Office locations with maps
- Accepted insurance plans
- Patient reviews and ratings
- Awards and publications

### 4.3 Provider Onboarding

- Multi-step registration wizard
- Medical license verification
- Credential document upload
- Practice details configuration (solo practice by default)
- Optional clinic affiliation (join an existing clinic or create a new one)
- Specialty and procedure selection
- Insurance plan selection
- Schedule template creation (separate for solo and each clinic affiliation)
- Admin review and approval workflow

### 4.4 Schedule & Availability

- Weekly availability template (per day)
- Configurable slot durations (15, 20, 30, 45, 60 minutes)
- Buffer time between appointments
- Date-specific overrides (vacation, extra hours)
- Separate in-person and video availability
- Multiple location support

### 4.5 Patient Chart Access

- View patient demographics
- Visit history timeline
- Active medications and allergies
- Lab results and vitals (FHIR format)
- Clinical notes from all visits with this provider
- Consent-gated: only data within active consent window
- Every access logged on audit chain

### 4.6 Clinical Documentation

- SOAP note editor (Subjective, Objective, Assessment, Plan)
- ICD-10 code lookup for diagnoses
- CPT code lookup for procedures
- Vital signs entry form
- Reusable note templates
- Note versioning
- Digital signature on finalized notes
- Audit trail for all changes

### 4.7 Staff Management

- Add clinic staff members
- Assign roles and permissions
- Manage staff schedules

### 4.8 Dual-Affiliation (Solo + Clinic)

- Every provider has a solo practice profile they fully control
- Providers can request to join one or more clinics
- Clinic admin approves or denies affiliation requests
- When affiliated with a clinic:
  - Provider appears on the clinic's provider roster
  - Clinic admin can manage the provider's clinic-specific schedule
  - Clinic billing rules apply to appointments booked through the clinic
  - Provider retains their own solo billing for independent appointments
- Provider's public profile shows all practice contexts (solo + clinics)
- Provider can leave a clinic affiliation at any time

---

## 5. Pharmacy Features

### 5.1 Pharmacy Dashboard

- Pending orders count
- Prescriptions awaiting verification
- Low stock alerts
- Daily revenue
- Active customer count
- Quick action buttons

### 5.2 Pharmacy Onboarding

- Multi-step registration wizard
- Pharmacy license verification
- Business details configuration
- Operating hours setup
- Delivery zone configuration
- Staff registration (pharmacists, technicians)
- Inventory setup (manual or CSV import)
- Insurance billing configuration
- Admin review and approval

### 5.3 Prescription Management

- Receive prescriptions from providers
- Prescription verification workflow
- Drug interaction checking
- Insurance coverage verification
- Query provider for clarification
- Refill request processing
- All actions logged on audit chain

### 5.4 Order Fulfillment

- Order queue management (pending, processing, filled, ready)
- Pick and verify workflow
- Pharmacist approval step
- Status updates with patient notifications
- Delivery assignment and tracking
- Delivery confirmation

### 5.5 Inventory Management

- Full product catalog with stock levels
- Search and filter by category, brand, stock status
- DIN number tracking
- Batch and lot number tracking
- Expiration date monitoring
- Low stock threshold alerts
- Reorder recommendations
- Add new products (manual entry)

### 5.6 Customer Management

- Customer directory
- Prescription history per customer
- Insurance information on file
- Allergy alerts
- Communication history

### 5.7 Pharmacy Profile & Operations

- Edit pharmacy information and description
- Logo upload
- Business hours management
- Holiday closures
- Accepted insurance plans
- Delivery zone configuration

### 5.8 Pharmacy Staff

- Add and manage staff members
- Role assignment (pharmacist, technician, cashier)
- Activity tracking per staff member

---

## 6. Admin Features

### 6.1 Admin Dashboard

- Platform-wide user statistics
- Active appointments today
- Revenue and growth metrics
- New registration trends
- Sub-dashboards: Analytics, Finance, Sales

### 6.2 User Management

- View, search, and filter all platform users
- User detail view with activity history
- Account status management (activate, suspend)
- Password reset capability

### 6.3 Provider & Pharmacy Applications

- Review pending registrations
- View submitted credentials and documents
- Approve, request more info, or deny applications
- Notification to applicants on status change

### 6.4 Clinic Management

| Module | Description |
|--------|-------------|
| Providers | View/edit provider profiles, manage schedules |
| Patients | View patient records, assist with account issues |
| Pharmacies | View/edit pharmacy profiles, monitor performance |
| Appointments | View all bookings, resolve conflicts |
| Services | Manage medical services catalog and pricing |
| Specializations | Manage specialties master list |
| Procedures | Manage procedures with CPT codes |
| Insurance Providers | Configure accepted insurance providers and plans |
| Locations | Manage clinic locations |
| Products | Manage OTC product catalog |

### 6.5 Finance Administration

| Module | Description |
|--------|-------------|
| Expenses | Track platform operating expenses |
| Income | View all revenue streams |
| Invoices | Generate, send, and track invoices |
| Payments | View transactions, process refunds |
| Transactions | Complete financial ledger |
| Billing Configuration | Fee structures, commission rates, billing cycles |
| Refunds | Process and track refund requests |
| Financial Reports | Revenue, expense, P&L, tax exports |

### 6.6 Reporting

- Income reports with breakdowns
- Expense reports with categorization
- Profit & loss statements
- Appointment analytics (booking rates, cancellations)
- Patient demographics and growth
- Custom report builder with flexible filters

### 6.7 Platform Settings

| Setting Area | Description |
|--------------|-------------|
| Website | Branding, logo, colors |
| Clinic | Default appointment settings, time zones |
| App | Feature toggles, maintenance mode |
| System | Email/SMS provider configuration |
| Finance | Currency, tax rates, gateway config |
| Account | Admin personal settings |

### 6.8 Staff & Permissions

- Admin team management
- Custom role creation
- Granular permission assignment
- Feature-level access control

---

## 7. Telemedicine & Video

### 7.1 Video Consultation

| Feature | Description |
|---------|-------------|
| SDK | Daily.co for WebRTC video/audio |
| Virtual Waiting Room | Pre-call area with camera/mic check, queue position |
| Video Session | Live video/audio between patient and provider |
| Screen Sharing | Provider can share screen (lab results, imaging) |
| In-Session Chat | Secure text messaging during consultation |
| Patient Summary Panel | Provider sees patient history during call |
| Emergency Contact Panel | Quick access to emergency contacts |
| Session Recording Metadata | Audit log of session (no video recording) |
| Consultation Feedback | Post-call patient rating and comments |

### 7.2 Provider-Side Tools (During Video)

| Feature | Description |
|---------|-------------|
| SOAP Notes Editor | Write clinical notes during consultation |
| Prescription Writer | Create e-prescription during call |
| Virtual Examination Tools | Guided self-examination instructions for patient |
| Post-Visit Workflow | Follow-up scheduling, referral generation |

### 7.3 Waiting Room Management

- Provider sees all waiting patients
- Patient details: name, reason, wait time, questionnaire answers
- Admit/dismiss patients
- Estimated wait time display for patients

---

## 8. Prescriptions & Medications

### 8.1 E-Prescription Creation (Provider)

- Patient selection (from recent or search)
- Medication search with DIN codes (Canadian drug database)
- Dosage, frequency, duration, quantity configuration
- Patient instructions
- Pharmacy notes
- Drug interaction alerts
- Substitution allowed / Dispense As Written flag
- Digital signature

### 8.2 Prescription Delivery (Provider to Pharmacy)

- **Provider suggests pharmacy:** Provider selects a pharmacy; patient can accept or redirect
- **Patient chooses pharmacy:** Patient selects from pharmacy discovery after receiving prescription
- Consent for prescription data sharing logged on audit chain
- Prescription redirection logged on chain

### 8.3 Prescription Management (Patient)

- View all prescriptions (active, expired, completed)
- Send prescription to pharmacy
- Redirect prescription to different pharmacy
- Request refills
- Track pharmacy processing status
- Receive status notifications

### 8.4 Prescription Processing (Pharmacy)

- Receive and verify prescriptions
- Drug interaction checking
- Insurance coverage verification
- Flag issues to prescribing provider
- Fill and dispense workflow
- Refill request processing

### 8.5 Medication Management (Patient)

- Active medications list with details
- Refill requests to pharmacy
- Medication reminders (configurable)
- Medication history

---

## 9. Booking & Appointments

### 9.1 Provider Discovery

- Search by specialty, condition, provider name, or medical service
- Filter by location, language, insurance accepted, availability, gender
- Provider cards with photo, specialty, rating, next available slot
- Map view of nearby providers

### 9.2 Booking Wizard (5 Steps)

1. **Search & Select Provider** -- find and choose a provider
2. **Choose Date & Time** -- calendar view of available slots, visit type selection
3. **Pre-Visit Questionnaire** -- health questions, symptom description, document upload
4. **Insurance & Payment** -- select insurance card or self-pay, review cost
5. **Consent & Confirmation** -- consent forms, digital signature, booking confirmation

### 9.3 Appointment Management

| Feature | Description |
|---------|-------------|
| Calendar View | Day/week/month views |
| List View | Sortable, filterable list |
| Reschedule | Select new date/time with notification |
| Cancel | With reason, notification to other party |
| Join Video | Launch video consultation when time arrives |
| Document Upload | Attach files to upcoming appointments |
| Appointment History | Past appointments with notes and summaries |
| Follow-Up Booking | Quick rebook with same provider |
| Waitlist | Join waitlist for earlier slots |

### 9.4 Provider-Side Appointment Tools

- Queue view of today's patients
- Start consultation action
- Mark as complete
- Post-visit workflow trigger
- Multi-view: calendar, list, kanban board

---

## 10. Billing & Payments

### 10.1 Patient-to-Provider Payments

| Feature | Description |
|---------|-------------|
| Gateway | Stripe for collecting patient payments |
| Self-Pay | Patient pays consultation fee at booking |
| Insurance + Copay | Insurance covers base, patient pays copay |
| Payment at Booking | Collected during booking wizard |
| Receipts | Downloadable receipt after payment |
| Refunds | Patient can request, admin approves |

All patient payments flow to the platform. The platform holds the funds and the admin manually settles with providers (see 10.4).

### 10.2 Provider/Pharmacy-to-Platform (SaaS Billing)

| Feature | Description |
|---------|-------------|
| Subscription Tiers | Platform charges providers/pharmacies for access |
| Commission Model | Percentage of transactions |
| Hybrid Model | Fixed fee + percentage |
| Invoice Generation | Automated invoicing based on billing cycle |
| Billing Cycles | Weekly, biweekly, monthly, quarterly, yearly |
| Payment Collection | Via connected payment method |
| Payment Failure Handling | Retry logic, suspension after failures |

### 10.3 Insurance Claim Tracking

| Feature | Description |
|---------|-------------|
| Claim Creation | Auto-generated after billable service |
| Status Tracking | Created -> Submitted -> Under Review -> Approved/Denied |
| Billing Codes | CPT codes for procedures, ICD-10 for diagnoses |
| Claim History | Full history per patient, provider, or period |
| Reporting | Claims summary, approval rates, amounts |

*Note: MVP tracks claims. Electronic submission to actual insurers is Phase 2.*

### 10.4 Provider Earnings & Admin Manual Settlement

Payments from patients are collected by the platform. The admin manually settles with providers.

**Provider side:**
- Revenue dashboard showing total earned, platform commission deducted, and net payable
- Breakdown by service type
- Settlement history (past payouts from admin)
- Pending settlement amount
- Statement export for tax purposes

**Admin side:**
- Settlement queue showing each provider's unsettled balance
- Admin reviews balance, deducts platform commission, and records a manual payout
- Settlement record created with amount, method (e-transfer, cheque, wire), reference number, and date
- Provider notified of settlement
- No automatic Stripe Connect payouts -- admin controls all disbursements

### 10.5 Admin Financial Management

- Platform revenue tracking (all streams)
- Provider settlement queue and history
- Expense management
- Invoice generation and sending
- Refund processing
- Profit & loss reporting
- Billing configuration (fee structures, commission rates)
- Financial report exports

---

## 11. Health Records & FHIR

### 11.1 Patient Health Records -- Free Access

Patients always have free, unrestricted access to their own health records. This is a core platform principle -- patients never pay to view their own data.

| Record Type | Description |
|-------------|-------------|
| Timeline | Chronological view of all health events |
| Medications | Active medications with dosage and frequency |
| Lab Results | Test results with normal/abnormal indicators and reference ranges |
| Allergies | Known allergies with severity and reaction descriptions |
| Immunizations | Vaccination history with dates and providers |
| Clinical Notes | Provider notes from consultations |
| Vital Signs | Blood pressure, heart rate, temperature, weight, BMI |

**Free for all patients:**
- View all record types listed above
- Share records with providers (consent-gated)
- Basic record export (single-record PDF, FHIR JSON)

**Premium features (future monetization, not in MVP):**
- Health analytics and trend insights (AI-powered analysis)
- Bulk PDF export bundles (full medical history in a formatted document)
- Health score and wellness dashboards
- Medication interaction analysis reports
- Personalized health recommendations

### 11.2 FHIR R4 Compliance

| FHIR Resource | Internal Mapping |
|---------------|------------------|
| Patient | user_profiles + patients |
| Observation | fhir_observations (labs, vitals) |
| Condition | fhir_conditions (diagnoses) |
| Procedure | fhir_procedures |
| MedicationRequest | fhir_medication_requests / prescriptions |
| Immunization | immunizations |
| AllergyIntolerance | patient_allergies |

**Supported Coding Systems:**
- ICD-10 (diagnoses)
- SNOMED CT (clinical concepts)
- CPT (procedures)
- LOINC (laboratory tests)
- DIN (Canadian drug identification numbers)

### 11.3 FHIR Interoperability

| Feature | Description |
|---------|-------------|
| FHIR Test Server Connections | Live connections to HAPI FHIR and SmileCDR test servers |
| Resource Export | Export patient data as FHIR bundles |
| Endpoint Configuration | Admin-configurable FHIR server endpoints |
| Data Mapping | Internal schema to FHIR R4 resource mapping |
| Exchange Logging | All FHIR exchanges logged on audit chain |

### 11.4 Record Sharing

- Patient selects records to share
- Selects recipient (provider or pharmacy)
- Sets time-based access window (7 days, 30 days, custom, permanent)
- Consent recorded on hash-chain audit trail
- Recipient accesses data within allowed window
- Patient can revoke access at any time
- Revocation logged on chain

### 11.5 Record Export

- Export as PDF (human-readable)
- Export as FHIR bundle (machine-readable)
- Date range selection
- Record type filtering

---

## 12. Consent & Data Sharing

### 12.1 Consent Model

Every cross-boundary data access requires explicit patient consent.

**Consent Record Structure:**
- Subject (patient ID)
- Grantee (provider or pharmacy ID)
- Scope (specific record types or "all records")
- Purpose (treatment, referral, prescription fulfillment)
- Time window (start datetime, end datetime)
- Status (active, revoked, expired)
- Created timestamp
- Revoked timestamp (if applicable)

### 12.2 Database-Enforced Access

- RLS policies check active consent records before allowing data access
- Time-based windows enforced at the database level
- Expired consents automatically block access (no application-level workaround)
- Consent status checked on every query

### 12.3 Consent Actions

| Action | Description |
|--------|-------------|
| Grant | Patient creates consent for a specific provider/pharmacy |
| Auto-Grant on Booking | Consent auto-created when patient books with provider |
| Auto-Grant on Prescription | Consent created when patient sends prescription to pharmacy |
| Revoke | Patient revokes active consent; access immediately terminated |
| Expire | System expires consent when time window closes |
| Audit | Every consent action logged on hash-chain |

### 12.4 Consent Transparency

- Patient can view all active consents in their profile
- Patient can see who has accessed their data and when
- Full audit trail of consent history
- Revocation reasons optionally recorded

---

## 13. Hash-Chain Audit Trail

### 13.1 How It Works

The audit trail provides tamper-evident logging by cryptographically chaining each entry to the previous one.

**Each audit entry contains:**
- `id` -- unique identifier
- `timestamp` -- when the action occurred
- `actor_id` -- who performed the action
- `actor_role` -- role of the actor
- `action_type` -- what was done (CREATE, READ, UPDATE, DELETE, CONSENT, REVOKE, etc.)
- `resource_type` -- what type of resource was affected
- `resource_id` -- which specific resource
- `data_hash` -- SHA-256 hash of the data state at time of action
- `previous_hash` -- hash of the previous audit entry
- `entry_hash` -- SHA-256(timestamp + actor + action + data_hash + previous_hash)
- `metadata` -- additional context (IP address, session ID, etc.)

### 13.2 Chain Integrity

- Each entry's `entry_hash` incorporates the `previous_hash`
- This creates an unbroken chain where altering any entry invalidates all subsequent entries
- Integrity verification: recompute hashes and verify chain continuity
- Admin can run full chain verification at any time

### 13.3 What Gets Audited

| Category | Actions |
|----------|---------|
| Authentication | Login, logout, MFA verification, password changes |
| Patient Records | Create, view, update health records |
| Prescriptions | Create, send, redirect, fill, dispense |
| Consent | Grant, revoke, expire consent |
| Appointments | Book, reschedule, cancel, complete |
| Data Sharing | Share records, access shared records |
| FHIR Exchange | Export, import, sync with external systems |
| Admin Actions | User management, setting changes, application reviews |
| Financial | Payments, refunds, claim submissions |

### 13.4 Audit Trail Features

- Searchable by user, action type, resource, date range
- Exportable for compliance audits
- Chain integrity verification tool
- Visual chain browser in admin panel
- Per-record audit history view

---

## 14. Messaging & Notifications

### 14.1 Secure Messaging

| Feature | Description |
|---------|-------------|
| Patient-Provider Messaging | Threaded conversations between patients and their providers |
| Provider-Staff Chat | Internal clinic communication |
| Pharmacy Messaging | Patient-pharmacy and provider-pharmacy communication |
| File Attachments | Share documents, images, lab results within messages |
| Read Receipts | Track message delivery and read status |
| Message Templates | Provider-created reusable message templates |
| Automated Messages | Configurable auto-messages (reminders, follow-ups) |

### 14.2 Notifications

**Delivery Channels:**
- In-app (real-time via Supabase Realtime)
- Email
- SMS

**Notification Types:**
- Appointment reminders and status changes
- Prescription status updates
- Order fulfillment status
- New messages
- Refill reminders
- Low stock alerts (pharmacy)
- Application status updates
- Credential expiration warnings
- System alerts

**User Controls:**
- Per-channel toggle (in-app, email, SMS)
- Per-notification-type toggle
- Quiet hours configuration

---

## 15. Content Management System

### 15.1 CMS Features (Admin-Managed)

| Content Type | Description |
|-------------|-------------|
| Pages | Marketing website pages with rich text editor, SEO metadata |
| Blog Articles | Health content with categories, tags, featured designation |
| Testimonials | Patient testimonials with ratings, moderation workflow |
| FAQs | Knowledge base entries organized by category |
| Media Library | Image and document management |
| Location Pages | Location-specific landing pages |

### 15.2 CMS Capabilities

- Rich text editor with media embedding
- SEO metadata per content item (title, description, keywords, OG image)
- Publish, draft, and schedule states
- Content categorization with tags and categories
- Featured content designation
- View tracking and analytics
- Custom CSS/JS per page (for advanced layouts)

### 15.3 Purpose

The CMS exists solely to manage the public-facing marketing website content. It allows the admin team to update the landing page, publish health articles, manage testimonials, and maintain the help center -- without developer involvement.

---

## 16. Public Marketing Website

### 16.1 Pages

| Page | Description |
|------|-------------|
| Home (`/`) | Hero, value propositions, how it works, testimonials, newsletter |
| Find Providers (`/frontend/find-providers`) | Provider search and discovery |
| Provider Profile (`/frontend/provider-profile/[slug]`) | Detailed provider page |
| Browse Specialties (`/frontend/browse/specialties`) | Specialty catalog |
| Browse Procedures (`/frontend/browse/procedures`) | Procedure catalog |
| About (`/frontend/about`) | Company information |
| Help (`/frontend/help`) | Help center and support |
| For Patients (`/frontend/for-patients`) | Patient value proposition |
| For Providers (`/frontend/for-providers`) | Provider value proposition |

### 16.2 Marketing Components

- Hero section with search bar and CTA
- Tabbed content sections (patients/providers benefits)
- "How It Works" step-by-step
- Insurance partner logos (OHIP, RAMQ, MSP BC, Alberta Health)
- Testimonials carousel
- Newsletter subscription
- FAQ accordion
- Responsive navigation with mega menu
- Footer with site links

---

## 17. Multi-Tenancy & Provider Affiliation Model

### 17.1 Dual-Affiliation Provider Tenancy

Providers can operate in two modes simultaneously:

1. **Solo Practice** -- The provider manages their own independent practice with their own schedule, patients, billing, and clinical notes.
2. **Clinic Affiliation** -- The same provider can also belong to one or more clinics (managed by other providers or organizations). When working under a clinic, the provider follows the clinic's schedule, policies, and billing configuration.

**Key rules:**
- A provider always has a "solo practice" profile that they fully control
- A provider can additionally be affiliated with one or more clinics
- When seeing patients under a clinic, the clinic's billing and schedule rules apply
- When seeing patients independently, the provider's own billing and schedule apply
- Clinical notes are authored by the provider regardless of context, but tagged with the practice context (solo or clinic)
- The provider's public profile shows all contexts in which they practice

### 17.2 Data Isolation

| Data | Isolation Level |
|------|----------------|
| Patient records | Accessible only to providers with active consent |
| Provider schedules | Solo schedule visible only to the provider; clinic schedule visible to clinic admin and staff |
| Clinical notes | Accessible only to the authoring provider; tagged with practice context |
| Prescriptions | Visible to prescriber, patient, and designated pharmacy |
| Financial data | Solo earnings visible to provider; clinic earnings visible to clinic admin; admin settles manually |
| Staff | Belongs to specific provider or clinic |

### 17.3 Shared Resources

| Resource | Scope |
|----------|-------|
| Specialties master list | Platform-wide, admin-managed |
| Procedures catalog | Platform-wide, admin-managed |
| Insurance providers | Platform-wide, admin-managed |
| Medical services | Platform-wide, admin-managed |
| CMS content | Platform-wide, admin-managed |

### 17.4 Enforcement

- Supabase RLS policies enforce tenant isolation at the database level
- Application-level checks as secondary enforcement
- Audit trail records all cross-tenant data access
- Consent system governs all cross-boundary access
- Clinic affiliation enforced via `provider_clinic_affiliations` join table

---

## 18. Technical Architecture

### 18.1 Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Build | Vite 5 |
| Routing | React Router DOM v7 |
| Styling | Tailwind CSS 3 |
| UI Components | Headless UI, Lucide React |
| Animation | Framer Motion |
| Forms | React Hook Form |
| Charts | Recharts |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime |
| Edge Functions | Supabase Edge Functions (Deno) |
| Video | Daily.co SDK |
| Payments | Stripe + Stripe Connect |

### 18.2 Project Structure

```
src/
  App.tsx                     -- Main routing configuration
  main.tsx                    -- Application entry point
  index.css                   -- Global styles
  app/
    frontend/                 -- Public marketing pages
    dashboard/                -- Protected dashboard pages
      patient/                -- Patient role pages
      provider/               -- Provider role pages
      pharmacy/               -- Pharmacy role pages
      admin/                  -- Admin role pages
  components/
    auth/                     -- Authentication components
    booking/                  -- Booking wizard variants
    telemedicine/             -- Video consultation components
    dashboard/                -- Layout (Sidebar, NavBar)
    frontend/                 -- Marketing components
    health-records/           -- Health record tabs
    pharmacy/                 -- Pharmacy components
    prescriptions/            -- Prescription components
    provider/                 -- Provider management components
    clinical/                 -- Clinical documentation
    ehr/                      -- EHR/FHIR components
    admin/                    -- Admin components
    ui/                       -- Shared UI components
  services/                   -- Business logic (85+ service files)
  contexts/                   -- React contexts (Auth, Theme)
  hooks/                      -- Custom React hooks
  lib/                        -- Utility libraries (Supabase client, utils)
  config/                     -- Theme configuration
supabase/
  migrations/                 -- Database migrations (SQL)
  functions/                  -- Edge Functions
```

### 18.3 Database

- PostgreSQL via Supabase
- 80+ migrations defining the schema
- Row-Level Security on all tables
- FHIR-compatible data structures
- Hash-chain audit trail table
- Consent records with time-window enforcement

### 18.4 Security

| Measure | Implementation |
|---------|---------------|
| Authentication | Supabase Auth with JWT |
| Authorization | RLS policies + application-level checks |
| Data Isolation | Per-provider tenant isolation via RLS |
| Consent Enforcement | Database-level consent checks |
| Audit Trail | Cryptographic hash-chain |
| Data Encryption | TLS in transit, Supabase encryption at rest |
| MFA | Optional multi-factor authentication |
| Session Management | Auto-refresh with token expiration |

---

## 19. Features Excluded from MVP

The following features exist in the current codebase as scaffolding but are **excluded from the MVP scope**. They may be built in future phases.

### Removed Entirely

| Feature | Reason |
|---------|--------|
| HRM Module | Not core to healthcare delivery |
| Applications Suite | Chat, email, kanban, file manager, social feed, etc. -- not core |
| Custom Table Builder | Admin tool, not needed for MVP |
| Provincial EHR Live Integration | Test server connections only for MVP |
| Electronic Claim Submission | Tracking only for MVP; no live insurer connections |
| AI-Powered Features | AI SOAP notes, AI search -- future enhancement |

### Kept but Simplified

| Feature | MVP Scope |
|---------|-----------|
| CMS | Retained for frontend marketing content management only |
| Reports | Core reports only (income, expenses, appointments, patients) |
| Admin Settings | Essential settings only |
| Automated Messaging | Basic appointment reminders only |
| Provider Payouts | Manual admin settlement only (no Stripe Connect automatic payouts) |
| Clinic Affiliation | Providers can affiliate with clinics; full multi-clinic billing is simplified for MVP |
| Health Record Premium Features | Free access to all records; analytics/insights/bulk-export monetization is post-MVP |

---

## Appendix: Feature-to-File Map

Key files for each major feature area:

| Feature | Key Files |
|---------|-----------|
| Auth | `src/contexts/AuthContext.tsx`, `src/services/authService.ts`, `src/components/auth/*` |
| Booking | `src/components/booking/UnifiedSearchBookingWizard.tsx`, `src/services/bookingService.ts` |
| Video | `src/components/telemedicine/*`, `src/services/telemedicineService.ts` |
| Prescriptions | `src/components/prescriptions/PrescriptionWriter.tsx`, `src/services/prescriptionService.ts` |
| Health Records | `src/components/health-records/*`, `src/services/healthRecordsService.ts` |
| FHIR | `src/services/fhirService.ts`, `src/services/fhirInteroperabilityService.ts`, `src/components/ehr/*` |
| Pharmacy | `src/components/pharmacy/*`, `src/services/pharmacy*.ts` |
| Billing | `src/services/financeService.ts`, `src/services/paymentService.ts`, `src/services/providerBillingService.ts` |
| Audit Trail | `src/services/blockchainAuditService.ts` |
| CMS | `src/services/cmsService.ts`, `src/app/dashboard/admin/content/*` |
| Admin | `src/services/adminService.ts`, `src/app/dashboard/admin/*` |
| Sidebar | `src/components/dashboard/Sidebar.tsx` |
| Routing | `src/App.tsx` |
