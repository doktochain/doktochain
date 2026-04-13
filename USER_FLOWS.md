# DoktoChain -- User Flows

> This document describes every user journey in the DoktoChain healthcare platform.
> Each flow is written from the user's perspective and maps to concrete screens/actions in the application.

---

## Table of Contents

1. [Public Visitor Flows](#1-public-visitor-flows)
2. [Registration & Onboarding Flows](#2-registration--onboarding-flows)
3. [Patient Flows](#3-patient-flows)
4. [Provider Flows](#4-provider-flows)
5. [Pharmacy Flows](#5-pharmacy-flows)
6. [Admin Flows](#6-admin-flows)
7. [Cross-Role Flows](#7-cross-role-flows)

---

## 1. Public Visitor Flows

### 1.1 Discover the Platform

```
Landing Page (/)
  -> Read hero section, value propositions
  -> Browse "How It Works" steps
  -> View patient/provider tabbed benefits
  -> Read testimonials
  -> See insurance partner logos (OHIP, RAMQ, MSP BC, Alberta Health)
  -> Subscribe to newsletter
  -> Click CTA -> Registration or Find Providers
```

### 1.2 Browse Providers

```
Find Providers (/frontend/find-providers)
  -> Search by specialty, condition, or provider name
  -> Filter by location, language, insurance accepted, availability
  -> View provider cards with photo, specialty, rating, next available slot
  -> Click provider card -> Provider Profile Page
```

### 1.3 View Provider Profile

```
Provider Profile (/frontend/provider-profile/[slug])
  -> Banner with provider photo, name, credentials
  -> Tabs:
     - About: Bio, education, certifications, languages
     - Services: Procedures offered with pricing
     - Insurance: Accepted insurance plans
     - Location: Map, address, office hours
     - Reviews: Patient ratings and written reviews
     - Highlights: Awards, publications, special qualifications
  -> CTA: "Book Appointment" -> Redirects to login or booking wizard
```

### 1.4 Browse Specialties & Procedures

```
Browse Specialties (/frontend/browse/specialties)
  -> Grid of medical specialties with icons and descriptions
  -> Click specialty -> Specialty Detail Page
     -> Description, common conditions treated
     -> List of providers in that specialty
     -> "Book with a [Specialty] specialist" CTA

Browse Procedures (/frontend/browse/procedures)
  -> Searchable catalog of medical procedures
  -> Click procedure -> Procedure Detail Page
     -> What to expect, preparation, recovery
     -> Providers who perform this procedure
     -> Estimated cost range
```

### 1.5 Get Help (Public)

```
Help Center (/frontend/help)
  -> Search knowledge base articles
  -> Browse FAQ categories
  -> Contact support form
```

---

## 2. Registration & Onboarding Flows

### 2.1 Patient Registration

```
Register Page (/register)
  -> Select role: "I'm a Patient"
  -> Enter: first name, last name, email, password, phone
  -> Submit -> Account created
  -> Auto-login -> Profile Completion Wizard
     Step 1: Personal Info (date of birth, gender, address)
     Step 2: Health Info (blood type, allergies, current medications)
     Step 3: Insurance Info (provider, policy number, upload card)
     Step 4: Emergency Contacts (name, phone, relationship)
  -> Complete -> Patient Dashboard
```

### 2.2 Provider Registration

```
Register Page (/register)
  -> Select role: "I'm a Healthcare Provider"
  -> Enter: first name, last name, email, password, phone
  -> Submit -> Account created
  -> Provider Onboarding Wizard:
     Step 1: Professional Info
       - Medical license number, issuing province
       - Specialty selection (from master list)
       - Years of experience
     Step 2: Practice Details
       - Solo practice is created by default
       - Practice name, practice type (solo, group, hospital)
       - Clinic address, phone, business hours
       - Optional: Request affiliation with an existing clinic
     Step 3: Credentials Upload
       - Medical degree, license, insurance certificates
       - Profile photo
     Step 4: Services & Pricing
       - Select procedures offered
       - Set consultation fees
       - Configure telemedicine availability
     Step 5: Insurance & Billing
       - Select accepted insurance plans
       - Billing preferences
     Step 6: Schedule Setup
       - Set weekly availability template (for solo practice)
       - Define appointment duration defaults
       - Configure buffer time between appointments
  -> Submit for Review -> Status: "Pending Admin Approval"
  -> Admin approves -> Provider Dashboard unlocked
  -> If clinic affiliation requested -> Clinic admin also approves
```

### 2.3 Pharmacy Registration

```
Register Page (/register)
  -> Select role: "I'm a Pharmacy"
  -> Enter: pharmacy name, owner name, email, password, phone
  -> Submit -> Account created
  -> Pharmacy Onboarding Wizard:
     Step 1: Pharmacy Details
       - License number, issuing authority
       - Pharmacy type (retail, hospital, compounding)
       - Address, phone, fax
     Step 2: Operations
       - Business hours
       - Delivery zones and fees
       - Accepted insurance plans
     Step 3: Staff Setup
       - Add pharmacists (name, license number)
       - Add technicians
     Step 4: Inventory Setup
       - Import initial inventory (CSV or manual)
       - Set low-stock thresholds
     Step 5: Billing Configuration
       - Payment gateway setup
       - Insurance billing preferences
  -> Submit for Review -> Status: "Pending Admin Approval"
  -> Admin approves -> Pharmacy Dashboard unlocked
```

### 2.4 Login Flow

```
Login Page (/login)
  -> Enter email + password (or phone + OTP)
  -> MFA challenge (if enabled) -> Enter code
  -> Role detected from profile -> Redirect to role-specific dashboard:
     - Patient -> /dashboard/patient/dashboard
     - Provider -> /dashboard/provider/dashboard
     - Pharmacy -> /dashboard/pharmacy/dashboard
     - Admin -> /dashboard/admin/dashboard
```

---

## 3. Patient Flows

### 3.1 Book an Appointment

```
Patient Dashboard -> "Book Appointment"
  OR Sidebar -> Appointments -> Book New

Booking Wizard (5 steps):
  Step 1: Search & Select Provider
    -> Search by specialty, name, or medical service
    -> Filter by location, insurance, language, availability
    -> View provider cards -> Select provider

  Step 2: Choose Date & Time
    -> Calendar view of available slots
    -> Select preferred date and time
    -> Choose visit type: In-Person or Video Consultation

  Step 3: Pre-Visit Questionnaire
    -> Answer health questions relevant to the visit reason
    -> Describe symptoms or reason for visit
    -> Upload any supporting documents (lab results, referral letters)

  Step 4: Insurance & Payment
    -> Select insurance card on file (or add new)
    -> Or select "Self-Pay"
    -> Review estimated cost
    -> Enter payment method (if self-pay)

  Step 5: Consent & Confirmation
    -> Review consent forms (data sharing, treatment consent)
    -> Digital signature
    -> Review appointment summary
    -> Confirm booking

  -> Appointment created
  -> Notification sent to provider
  -> Confirmation email/SMS to patient
  -> Appointment appears in patient calendar
```

### 3.2 Manage Appointments

```
Sidebar -> Appointments
  -> View upcoming appointments (list or calendar view)
  -> For each appointment:
     - View details (provider, time, location, type)
     - Reschedule -> Select new date/time -> Confirm
     - Cancel -> Provide reason -> Confirm cancellation
     - Join Video Call (if telemedicine, when time arrives)
     - Upload Documents -> Attach pre-visit files

Sidebar -> Appointments -> History
  -> View past appointments
  -> View consultation notes (if shared by provider)
  -> Leave a review for the provider
  -> Download visit summary
  -> Request follow-up appointment
```

### 3.3 Video Consultation (Telemedicine)

```
Appointment time arrives -> Patient receives notification
  -> Click "Join Consultation"
  -> Virtual Waiting Room:
     - Check camera/microphone
     - See position in queue
     - View estimated wait time
     - Review pre-visit questionnaire answers

  -> Provider admits patient -> Video Session Starts:
     - Live video/audio via Daily.co SDK
     - Secure in-session messaging (chat sidebar)
     - Screen sharing capability
     - Patient can see provider's shared screen

  -> Consultation concludes:
     - Provider ends session
     - Patient sees post-visit summary:
       - Diagnosis notes (if shared)
       - Prescriptions written
       - Follow-up instructions
       - Next appointment recommendation
     - Provide consultation feedback (rating + comments)
```

### 3.4 View & Manage Health Records (Always Free)

```
Sidebar -> Health Records
  -> All record access is free for patients -- no paywall
  -> Tabbed interface:
     - Timeline: Chronological view of all health events
     - Medications: Active medications with dosage, frequency
     - Lab Results: Test results with normal/abnormal indicators
     - Allergies: Known allergies and reactions
     - Immunizations: Vaccination history
     - Clinical Notes: Provider notes from visits
  -> Export Records (free):
     - Select date range and record types
     - Export as PDF or FHIR bundle
  -> Share Records (free):
     - Select provider to share with
     - Set time-based access window (e.g., 7 days, 30 days, permanent)
     - Consent recorded on audit chain
     - Revoke access at any time

  Premium features (future, not in MVP):
     - Health analytics and trend insights
     - Bulk formatted PDF export bundles
     - Wellness score and recommendations
```

### 3.5 Prescription-to-Pharmacy Pipeline

```
After consultation, provider writes prescription:

Path A -- Provider suggests pharmacy:
  -> Patient receives notification: "Dr. X sent prescription to [Pharmacy Name]"
  -> Patient can:
     - Accept -> Prescription sent to suggested pharmacy
     - Redirect -> Choose different pharmacy from discovery list
       -> Select new pharmacy -> Prescription redirected
       -> Consent and redirection logged on audit chain

Path B -- Patient chooses pharmacy:
  -> Patient receives notification: "New prescription from Dr. X"
  -> Sidebar -> Prescriptions -> View new prescription
  -> Click "Send to Pharmacy"
  -> Pharmacy Discovery screen:
     - Search by name, location, proximity
     - Filter by delivery availability, insurance accepted
     - View pharmacy ratings and hours
  -> Select pharmacy -> Confirm
  -> Prescription sent to selected pharmacy
  -> Consent logged on audit chain

After pharmacy receives prescription:
  -> Patient tracks status:
     - Received -> Processing -> Ready for Pickup / Out for Delivery
  -> Notifications at each status change
  -> Patient can request delivery (if pharmacy supports it)
```

### 3.6 Pharmacy Marketplace

```
Sidebar -> Pharmacy -> Marketplace
  -> Browse OTC products by category
  -> Search for specific medications
  -> View product details (price, availability, pharmacy)
  -> Add to cart -> Checkout
  -> Select delivery or pickup
  -> Payment processing
  -> Order tracking with status updates
```

### 3.7 Manage Medications & Refills

```
Sidebar -> Medications
  -> View active medications
  -> Medication details: name, dosage, frequency, prescribing doctor, pharmacy
  -> Request Refill:
     -> Select medication -> Request sent to pharmacy
     -> Track refill status (Requested -> Approved -> Ready)
  -> Set medication reminders (time-based alerts)
```

### 3.8 Family Member Management

```
Sidebar -> Family Members
  -> Add family member (child, spouse, dependent)
     - Enter name, date of birth, relationship
     - Link to existing patient account (optional)
  -> Book appointments on behalf of family member
  -> View family member health records (with appropriate consent)
  -> Manage family member medications
```

### 3.9 Insurance & Billing

```
Sidebar -> Billing & Insurance
  -> Insurance Cards:
     - View saved insurance cards
     - Add new card (upload front/back images, enter policy details)
     - Set primary/secondary insurance
  -> Payment History:
     - View all transactions
     - Download receipts/invoices
  -> Outstanding Balance:
     - View pending payments
     - Make payment
```

### 3.10 Patient Profile Management

```
Sidebar -> My Profile
  -> Personal Information: name, DOB, gender, contact info
  -> Address management
  -> Emergency contacts (add, edit, remove)
  -> Allergies management (add, edit, remove)
  -> Current medications list
  -> Insurance information
  -> Profile photo upload
  -> Language and notification preferences
```

### 3.11 Messaging

```
Sidebar -> Messages
  -> View message threads with providers
  -> Start new conversation:
     - Select provider from recent or search
     - Compose message
     - Attach files (lab results, images)
  -> Receive and respond to provider messages
  -> Messages are encrypted and logged on audit chain
```

---

## 4. Provider Flows

### 4.1 Daily Dashboard

```
Provider Dashboard (/dashboard/provider/dashboard)
  -> Today's snapshot:
     - Appointments today (count, next up)
     - Patients in waiting room (video)
     - Pending prescription refills
     - Unread messages
  -> Financial summary:
     - This month's earnings
     - Pending insurance claims
     - Outstanding invoices
  -> Quick actions:
     - Start next consultation
     - View waiting room
     - Write prescription
```

### 4.2 Manage Appointments

```
Sidebar -> Appointments
  -> Calendar View: Day/week/month views with appointments
  -> List View: Sortable, filterable appointment list
  -> Queue View: Today's patients in order

  For each appointment:
  -> View patient info, reason for visit, pre-visit questionnaire
  -> Start Consultation (opens video or marks in-person as started)
  -> Mark as Complete -> Triggers post-visit workflow
  -> Reschedule -> Select new slot -> Patient notified
  -> Cancel -> Provide reason -> Patient notified

Sidebar -> Appointments -> History
  -> Past appointments with search and filters
  -> View consultation notes, prescriptions written
  -> Generate reports
```

### 4.3 Conduct Video Consultation

```
Sidebar -> Telemedicine -> Waiting Room
  -> See all patients waiting for video calls
  -> Patient details: name, reason, wait time, questionnaire answers
  -> Click "Admit" -> Video Session Opens:

  During Session (Daily.co SDK):
  -> Live video/audio with patient
  -> Side panel tools:
     - Patient Summary: demographics, allergies, medications, past visits
     - SOAP Notes Editor: structured clinical documentation
     - Prescription Writer: create e-prescription during visit
     - Secure Messaging: text chat with patient
     - Virtual Examination Tools: guided self-examination instructions
     - Screen Share: share lab results, imaging
  -> Emergency Contact Panel: quick access if needed

  End Session:
  -> Complete SOAP notes
  -> Generate prescriptions
  -> Set follow-up recommendation
  -> Session recorded on audit trail (metadata, not video)
```

### 4.4 Clinical Documentation

```
Sidebar -> Clinical Notes
  -> View all patients with recent visits
  -> Select patient -> Clinical Notes Editor:
     - SOAP format:
       S: Subjective (patient complaints, history)
       O: Objective (vitals, examination findings)
       A: Assessment (diagnosis with ICD-10 codes)
       P: Plan (treatment plan, prescriptions, follow-ups)
     - Attach lab results, imaging references
     - Sign and finalize note
     - Note versioning with audit trail

Sidebar -> Templates
  -> Create reusable note templates by visit type
  -> Apply template to new note -> Customize -> Save
```

### 4.5 Write & Manage Prescriptions

```
Sidebar -> Prescriptions -> Create New
  -> Select patient (from recent or search)
  -> Prescription Writer:
     - Search medication database (DIN codes for Canada)
     - Set dosage, frequency, duration, quantity
     - Add instructions for patient
     - Add pharmacy notes
     - Check drug interactions (alerts if conflicts detected)
     - Mark as substitution allowed or DAW (dispense as written)
  -> Choose delivery method:
     - Suggest pharmacy (provider selects) -> Patient can redirect
     - Let patient choose pharmacy
  -> Sign prescription (digital signature)
  -> Prescription created -> Logged on audit chain

Sidebar -> Prescriptions -> Refills
  -> View pending refill requests from patients
  -> Review patient history and original prescription
  -> Approve / Deny / Modify refill
  -> Notification sent to patient and pharmacy
```

### 4.6 Patient Management

```
Sidebar -> Patients
  -> View all patients who have had appointments
  -> Search by name, health card number
  -> Patient Chart:
     - Demographics
     - Visit history
     - Active medications
     - Allergies
     - Lab results and vitals (FHIR format)
     - Clinical notes from all visits
     - Insurance information
  -> Consent-gated: Provider only sees data within active consent window
  -> Access logged on audit chain
```

### 4.7 Schedule Management

```
Sidebar -> Schedule
  -> Weekly availability template:
     - Set available hours per day of week
     - Define appointment slot duration (15, 20, 30, 45, 60 min)
     - Set buffer time between appointments
  -> Exceptions:
     - Block specific dates (vacation, conferences)
     - Add extra availability (weekend clinic)
  -> Appointment types:
     - In-person consultation
     - Video consultation
     - Follow-up (shorter slots)
```

### 4.8 Billing & Earnings

```
Sidebar -> Billing -> Earnings
  -> Revenue dashboard:
     - Total earned (period)
     - Platform commission deducted
     - Net payable (unsettled balance)
     - Breakdown: consultations, procedures, prescriptions
  -> Settlement history:
     - Past payouts from admin (date, amount, method, reference)
  -> Pending settlement amount

Sidebar -> Billing -> Claims
  -> Insurance claims submitted
  -> Claim status: Submitted -> Under Review -> Approved/Denied
  -> Claim details with procedure codes

Sidebar -> Billing -> Transactions
  -> All financial transactions
  -> Download statements
  -> Export for tax purposes

Note: Provider payments are collected by the platform.
Admin manually settles with providers (no automatic Stripe payouts).
```

### 4.9 Provider Profile & Settings

```
Sidebar -> Profile
  -> Edit public-facing profile:
     - Photo, bio, education, certifications
     - Specialties and procedures
     - Languages spoken
     - Office locations and hours
  -> Manage credentials:
     - Upload/renew license documents
     - Track expiration dates
  -> Notification preferences:
     - Email, SMS, in-app toggles
     - Appointment reminders timing
     - Marketing communications
```

### 4.10 Provider Messaging

```
Sidebar -> Messaging -> Inbox
  -> Patient messages with read/unread status
  -> Reply with text and attachments
  -> Message history per patient

Sidebar -> Messaging -> Templates
  -> Create reusable message templates
  -> Categories: appointment reminders, follow-ups, general

Sidebar -> Messaging -> Automated
  -> Configure automated messages:
     - Appointment reminders (24h, 1h before)
     - Post-visit follow-up
     - Prescription refill reminders

Sidebar -> Messaging -> Staff Chat
  -> Internal communication with clinic staff
```

---

## 5. Pharmacy Flows

### 5.1 Pharmacy Dashboard

```
Pharmacy Dashboard (/dashboard/pharmacy/dashboard)
  -> Key metrics:
     - Pending orders
     - Prescriptions awaiting verification
     - Low stock alerts
     - Today's revenue
     - Active customers
  -> Quick actions:
     - Process next order
     - Review pending prescriptions
     - Check low stock items
```

### 5.2 Receive & Process Prescriptions

```
Sidebar -> Prescriptions -> Pending
  -> View incoming prescriptions from providers
  -> Each prescription shows:
     - Patient name and contact
     - Prescribing provider
     - Medications, dosages, quantities
     - Insurance information
     - Provider notes
  -> Verify prescription:
     - Check provider license validity
     - Verify drug interactions with patient profile
     - Confirm insurance coverage
  -> Accept -> Move to order fulfillment
  -> Flag issue -> Send query back to provider
  -> All actions logged on audit chain

Sidebar -> Prescriptions -> Refills
  -> View refill requests from patients
  -> Check refill eligibility (remaining refills, expiration)
  -> Process or deny with reason
```

### 5.3 Order Fulfillment

```
Sidebar -> Orders -> Pending
  -> Queue of orders to fill
  -> For each order:
     - Pick medications from inventory
     - Verify correct medication, dosage, quantity
     - Pharmacist review and approval
     - Update status: Processing -> Filled -> Ready
  -> Notify patient: "Your order is ready"

Sidebar -> Orders -> All
  -> Full order history with search/filters
  -> Order details: items, status, payments, delivery info

Delivery Orders:
  -> Assign to delivery partner
  -> Track delivery status
  -> Patient receives real-time updates
  -> Delivery confirmation with signature
```

### 5.4 Inventory Management

```
Sidebar -> Inventory
  -> Full product catalog with stock levels
  -> Search and filter by category, brand, stock status
  -> For each product:
     - Current quantity
     - Reorder point (threshold)
     - Supplier information
     - Expiration dates
     - Batch/lot numbers
  -> Low stock alerts with recommended reorder quantities

Sidebar -> Inventory -> Add Product
  -> Enter product details:
     - DIN number, name, manufacturer
     - Category, form (tablet, capsule, liquid)
     - Unit price, quantity on hand
     - Reorder threshold
     - Storage requirements
     - Expiration date
```

### 5.5 Customer Management

```
Sidebar -> Customers
  -> View all customers who have used the pharmacy
  -> Customer profile:
     - Contact information
     - Prescription history
     - Insurance on file
     - Allergy alerts
     - Preferred communication method
  -> Send message to customer
```

### 5.6 Pharmacy Profile & Hours

```
Sidebar -> Profile
  -> Edit pharmacy information:
     - Name, address, phone, fax
     - License details
     - Logo upload
     - Description and services offered
  -> Accepted insurance plans

Sidebar -> Hours
  -> Set business hours per day of week
  -> Holiday closures
  -> Special hours (e.g., vaccine clinic hours)
```

### 5.7 Pharmacy Staff

```
Sidebar -> Staff
  -> Add/manage pharmacy staff members
  -> Assign roles (pharmacist, technician, cashier)
  -> View staff schedules
  -> Track who processed which orders (audit compliance)
```

### 5.8 Pharmacy Messaging & Notifications

```
Sidebar -> Messages
  -> Patient messages about orders, prescriptions
  -> Provider messages about prescription clarifications
  -> Reply and manage conversations

Sidebar -> Notifications
  -> New prescription received
  -> Refill request received
  -> Low stock alert
  -> Order status changes
  -> Patient messages
```

---

## 6. Admin Flows

### 6.1 Admin Dashboard

```
Admin Dashboard (/dashboard/admin/dashboard)
  -> Platform-wide metrics:
     - Total users (patients, providers, pharmacies)
     - Active appointments today
     - Revenue this period
     - New registrations
  -> Sub-dashboards:
     - Analytics: User growth, engagement, retention
     - Finance: Revenue, expenses, profit
     - Sales: Subscription and transaction metrics
```

### 6.2 User Management

```
Sidebar -> Users
  -> View all platform users
  -> Search by name, email, role
  -> Filter by role, status, registration date
  -> User detail:
     - Profile information
     - Activity history
     - Account status (active, suspended, pending)
  -> Actions: Activate, Suspend, Reset password

Sidebar -> Activity
  -> System-wide activity log
  -> User actions, login history, data access events
```

### 6.3 Provider Application Review

```
Sidebar -> Provider Applications
  -> List of pending provider registrations
  -> For each application:
     - Personal and professional information
     - Uploaded credentials
     - License verification status
  -> Actions:
     - Approve -> Provider account activated, notification sent
     - Request more info -> Message sent to applicant
     - Deny -> Reason recorded, notification sent
```

### 6.4 Clinic Management

```
Sidebar -> Clinic Management:

  Providers:
    -> View/edit all provider profiles
    -> Manage provider schedules
    -> View provider performance metrics

  Patients:
    -> View all patient records (admin access)
    -> Assist with account issues

  Pharmacies:
    -> View/edit pharmacy profiles
    -> Approve pharmacy applications
    -> Monitor pharmacy performance

  Appointments:
    -> View all platform appointments
    -> Resolve scheduling conflicts
    -> Override appointment status if needed

  Services:
    -> Manage the medical services catalog
    -> Set service categories and pricing guidelines

  Specializations:
    -> Manage the specialties master list
    -> Add/edit medical specialties

  Procedures:
    -> Manage the procedures catalog
    -> Set CPT codes and descriptions

  Insurance Providers:
    -> Manage accepted insurance providers
    -> Configure insurance plan details

  Locations:
    -> Manage clinic locations across the platform

  Products:
    -> Manage the OTC product catalog
```

### 6.5 Finance & Billing Administration

```
Sidebar -> Finance:

  Provider Settlements:
    -> Settlement queue: list of providers with unsettled balances
    -> For each provider:
       - Total earned since last settlement
       - Platform commission to deduct
       - Net amount payable
    -> "Record Settlement" action:
       - Enter amount paid
       - Select payment method (e-transfer, cheque, wire, other)
       - Enter reference number
       - Add notes (optional)
       - Confirm -> settlement recorded, provider notified
    -> Settlement history: past payouts with dates, amounts, methods

  Expenses:
    -> Track platform operating expenses
    -> Categorize and approve expenses

  Income:
    -> View all income streams
    -> Patient payments collected, platform fees, subscriptions, commissions

  Invoices:
    -> Generate and manage invoices
    -> Send to providers/pharmacies
    -> Track payment status

  Payments:
    -> View all payment transactions
    -> Process refunds

  Transactions:
    -> Complete transaction ledger
    -> Filter by type, date, amount

  Billing Configuration:
    -> Set platform fee structures
    -> Configure commission rates
    -> Define billing cycles

  Refunds:
    -> Process and track refunds
    -> Refund approval workflow

  Financial Reports:
    -> Revenue reports
    -> Expense reports
    -> Settlement reports
    -> Profit and loss statements
    -> Tax-ready exports
```

### 6.6 Reports & Analytics

```
Sidebar -> Reports:

  Income Report -> Revenue breakdown by source, period
  Expense Report -> Expense categorization and trends
  Profit & Loss -> Net financial position
  Appointments Report -> Booking metrics, cancellation rates
  Patient Report -> Demographics, growth, retention
  Custom Reports -> Build ad-hoc reports with filters
```

### 6.7 Content Management (CMS)

```
Sidebar -> CMS:

  Pages:
    -> Create/edit marketing website pages
    -> Rich text editor with media embedding
    -> SEO metadata (title, description, keywords)
    -> Publish/draft/schedule status

  Blogs:
    -> Write and publish health articles
    -> Categories and tags
    -> Featured article designation

  Testimonials:
    -> Manage patient testimonials
    -> Approve/moderate submissions
    -> Display on frontend

  FAQs:
    -> Create FAQ entries by category
    -> Organize display order

  Media Library:
    -> Upload and manage images, documents
    -> Organize by folders/tags

  Locations:
    -> Location-specific landing pages

  Tags & Categories:
    -> Organize all content taxonomy
```

### 6.8 Platform Settings

```
Sidebar -> Settings:

  Website -> Branding, logo, colors, domain
  Clinic -> Default appointment settings, time zones
  App -> Feature toggles, maintenance mode
  System -> Email/SMS configuration, storage
  Finance -> Currency, tax rates, payment gateways
  Account -> Admin personal account settings
```

### 6.9 Interoperability & Compliance

```
Sidebar -> Interoperability:

  FHIR Endpoints:
    -> Configure FHIR server connections
    -> Map internal data to FHIR resources
    -> Test endpoint connectivity
    -> Monitor data exchange logs

  Blockchain Audit:
    -> View the hash-chain audit trail
    -> Verify integrity of any record
    -> Search audit entries by user, action, date
    -> Export compliance reports

  Provincial EHR:
    -> Configure connections to provincial health systems
    -> Monitor data synchronization status
    -> View exchange history
```

### 6.10 Staff & Permissions

```
Sidebar -> Staff
  -> Manage admin team members
  -> Assign roles and departments

Sidebar -> Permissions
  -> Define custom roles
  -> Assign granular permissions per role
  -> Feature-level access control
```

---

## 7. Cross-Role Flows

### 7.1 The Complete Patient Journey (End-to-End)

```
1. Patient registers and completes profile
2. Patient searches for a dermatologist accepting OHIP
3. Patient views Dr. Smith's profile and reviews
4. Patient books a video consultation for Tuesday at 2pm
5. Patient fills pre-visit questionnaire about skin concerns
6. Patient uploads photo of skin condition
7. Patient provides consent for data sharing
8. Patient pays $0 (OHIP covered) or copay

9. Tuesday 2pm: Patient joins virtual waiting room
10. Provider admits patient, video consultation begins
11. Provider reviews patient history, examines via video
12. Provider writes SOAP note during consultation
13. Provider diagnoses eczema, writes prescription for topical cream
14. Provider suggests sending prescription to "MediPharm" near patient
15. Provider ends consultation

16. Patient reviews visit summary and prescription
17. Patient accepts suggested pharmacy (or redirects to preferred one)
18. Consent for pharmacy data sharing logged on audit chain

19. Pharmacy receives prescription notification
20. Pharmacist verifies prescription and drug interactions
21. Pharmacist fills order, marks as ready
22. Patient receives "Ready for Pickup" notification
23. Patient picks up medication (or receives delivery)
24. Patient can request refill when medication runs low

25. Provider's earnings balance updated; admin will settle manually
26. Insurance claim tracked
27. All actions recorded on hash-chain audit trail
```

### 7.2 The Consent & Data Sharing Flow

```
Any data access across provider boundaries:

1. Data owner (patient) initiates or approves share request
2. System records consent:
   - Who is sharing (patient ID)
   - With whom (provider/pharmacy ID)
   - What data (record types)
   - Time window (start date, end date, or permanent)
   - Purpose (treatment, referral, prescription)
3. Consent entry created with cryptographic hash
4. Hash chained to previous audit entry (hash chain)
5. Recipient can now query data within allowed scope
6. Every data access logged on audit chain
7. Patient can revoke consent at any time:
   - Revocation logged on chain
   - Access immediately terminated
   - Previous access records remain for compliance
```

### 7.3 The Hash-Chain Audit Trail

```
Every significant action in the platform:

1. Action occurs (record create/read/update, consent, prescription, etc.)
2. System creates audit entry:
   - Timestamp
   - Actor (user ID and role)
   - Action type
   - Resource affected
   - Data snapshot hash (SHA-256 of the data state)
   - Previous entry hash (creates the chain)
   - Combined hash = SHA-256(timestamp + actor + action + data_hash + previous_hash)
3. Entry stored in audit_trail table
4. Chain integrity verifiable:
   - Any record can be verified by recomputing its hash
   - Chain continuity verified by checking previous_hash links
   - Tampering detectable if any hash doesn't match
5. Admin can:
   - Browse full audit trail
   - Verify chain integrity
   - Export for compliance audits
   - Search by user, action type, date range
```

### 7.4 The Insurance Claim Tracking Flow

```
After a billable service is rendered:

1. Provider marks consultation as complete
2. System generates claim record:
   - Patient insurance info
   - Provider billing codes (CPT, ICD-10)
   - Service date and description
   - Amount billed
3. Claim status: Created
4. Admin/provider can update status manually:
   - Created -> Submitted (to insurer, tracked externally for MVP)
   - Submitted -> Under Review
   - Under Review -> Approved / Denied / Partial
5. If Approved: Payment recorded against claim
6. If Denied: Reason recorded, appeal option noted
7. Claim history visible to: provider, admin, patient (their own claims)
```

### 7.5 FHIR Data Exchange Flow

```
For interoperability with external systems:

1. Patient data stored internally with FHIR-compatible structure
2. When sharing externally:
   - Data mapped to FHIR R4 resources
   - Resources: Patient, Observation, Condition, Procedure, MedicationRequest
   - Coding systems: ICD-10, SNOMED CT, CPT, LOINC, DIN
3. Export options:
   - Single resource (e.g., one lab result)
   - Patient bundle (all records for a patient)
   - Date-filtered bundle
4. Connection to FHIR test servers:
   - HAPI FHIR public test server
   - SmileCDR sandbox
   - Configurable endpoints in admin panel
5. Data exchange logged on audit chain
```

### 7.6 Platform Billing & Provider Settlement Flow

```
Patient payments flow to the platform:

1. Patient pays at booking -> funds collected by platform via Stripe
2. Platform holds funds in its account
3. Platform tracks each provider's earned amount
4. Platform commission automatically calculated per transaction
5. Admin views settlement queue -> sees each provider's net balance
6. Admin manually records a settlement:
   - Selects provider, confirms amount
   - Enters payment method and reference number
   - Provider is notified of the payout
7. Settlement history maintained for both admin and provider

Provider/Pharmacy SaaS fees:

1. After approval, provider/pharmacy selects subscription tier
2. Platform generates invoice based on billing configuration:
   - Fixed monthly fee, or
   - Percentage of transactions, or
   - Hybrid model
3. Invoice sent to provider/pharmacy
4. Payment collected via connected payment method
5. Transaction recorded in platform finance
6. Admin can:
   - View all subscriptions
   - Adjust billing terms
   - Handle payment failures
   - Process credits or refunds
```

### 7.7 Notification Flow (All Roles)

```
System-generated notifications:

Patient receives:
  - Appointment confirmations, reminders, cancellations
  - Prescription status updates
  - Order status changes
  - Provider messages
  - Refill reminders

Provider receives:
  - New appointment bookings
  - Patient cancellations/reschedules
  - Refill requests
  - Patient messages
  - Credential expiration warnings

Pharmacy receives:
  - New prescriptions received
  - Refill requests
  - Order status requiring attention
  - Low stock alerts
  - Customer messages

Admin receives:
  - New provider/pharmacy applications
  - System alerts
  - Financial thresholds
  - Compliance events

Delivery channels: In-app, Email, SMS (configurable per user)
```

---

## Appendix: Route Map

| Role | Route | Description |
|------|-------|-------------|
| Public | `/` | Landing page |
| Public | `/frontend/find-providers` | Provider search |
| Public | `/frontend/provider-profile/[slug]` | Provider profile |
| Public | `/frontend/browse/specialties` | Browse specialties |
| Public | `/frontend/browse/procedures` | Browse procedures |
| Public | `/frontend/about` | About page |
| Public | `/frontend/help` | Help center |
| Auth | `/login` | Login |
| Auth | `/register` | Registration |
| Patient | `/dashboard/patient/dashboard` | Patient home |
| Patient | `/dashboard/patient/appointments` | Appointments |
| Patient | `/dashboard/patient/appointments/book` | Book appointment |
| Patient | `/dashboard/patient/video-consultation` | Video calls |
| Patient | `/dashboard/patient/health-records` | Health records |
| Patient | `/dashboard/patient/prescriptions` | Prescriptions |
| Patient | `/dashboard/patient/pharmacy` | Find pharmacy |
| Patient | `/dashboard/patient/pharmacy-marketplace` | Shop OTC |
| Patient | `/dashboard/patient/medications` | Medications |
| Patient | `/dashboard/patient/family` | Family members |
| Patient | `/dashboard/patient/billing` | Billing |
| Patient | `/dashboard/patient/messages` | Messages |
| Provider | `/dashboard/provider/dashboard` | Provider home |
| Provider | `/dashboard/provider/appointments` | Appointments |
| Provider | `/dashboard/provider/schedule` | Availability |
| Provider | `/dashboard/provider/telemedicine` | Video consults |
| Provider | `/dashboard/provider/clinical-notes` | Clinical notes |
| Provider | `/dashboard/provider/prescriptions` | Prescriptions |
| Provider | `/dashboard/provider/patients` | Patient charts |
| Provider | `/dashboard/provider/billing/earnings` | Earnings |
| Provider | `/dashboard/provider/billing/claims` | Claims |
| Provider | `/dashboard/provider/messaging/inbox` | Messages |
| Provider | `/dashboard/provider/profile` | Profile |
| Pharmacy | `/dashboard/pharmacy/dashboard` | Pharmacy home |
| Pharmacy | `/dashboard/pharmacy/prescriptions` | Prescriptions |
| Pharmacy | `/dashboard/pharmacy/orders` | Orders |
| Pharmacy | `/dashboard/pharmacy/inventory` | Inventory |
| Pharmacy | `/dashboard/pharmacy/customers` | Customers |
| Pharmacy | `/dashboard/pharmacy/profile` | Profile |
| Admin | `/dashboard/admin/dashboard` | Admin home |
| Admin | `/dashboard/admin/users` | User mgmt |
| Admin | `/dashboard/admin/provider-applications` | Applications |
| Admin | `/dashboard/admin/clinic/*` | Clinic mgmt |
| Admin | `/dashboard/admin/finance/*` | Finance |
| Admin | `/dashboard/admin/reports/*` | Reports |
| Admin | `/dashboard/admin/content/*` | CMS |
| Admin | `/dashboard/admin/settings/*` | Settings |
| Admin | `/dashboard/admin/interoperability/*` | FHIR & Audit |
