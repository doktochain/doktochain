# DoktoChain -- Project Reference

This file serves as the primary reference for AI-assisted development on DoktoChain.

---

## Project Description

DoktoChain is a Canadian healthcare platform that connects patients with healthcare providers and pharmacies. It supports the full care lifecycle: provider discovery, appointment booking, video consultations (Daily.co), clinical documentation, e-prescriptions with pharmacy fulfillment, and billing. The platform enforces data privacy through database-level consent rules with time-based access windows and maintains a cryptographic hash-chain audit trail for all significant actions.

---

## Key Documents

| Document | Path | Description |
|----------|------|-------------|
| User Flows | [`USER_FLOWS.md`](./USER_FLOWS.md) | Complete user journeys for every role (Patient, Provider, Pharmacy, Admin), cross-role flows, consent model, audit trail flow, and prescription pipeline |
| Features | [`FEATURES.md`](./FEATURES.md) | Full feature specification organized by domain, including technical architecture, multi-tenancy model, FHIR compliance, billing flows, and MVP scope |

**Always consult these documents before making architectural decisions or implementing new features.**

---

## Architecture Decisions

### Roles
- **Patient** -- seeks and receives healthcare
- **Provider** -- delivers healthcare services (individual provider tenancy)
- **Pharmacy** -- dispenses medications and OTC products
- **Admin** -- manages the platform

### Multi-Tenancy & Dual Affiliation
Individual provider tenancy with dual-affiliation support. Each provider has their own solo practice (their tenant) and can additionally affiliate with one or more clinics. When working under a clinic, the clinic's billing and schedule rules apply. Data isolation enforced via Supabase RLS. Cross-tenant access requires explicit patient consent with time-based windows. Clinic affiliations tracked in `provider_clinic_affiliations`.

### Tech Stack
- Frontend: React 18 + TypeScript + Vite 5
- Styling: Tailwind CSS 3
- Database: Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions)
- Video: Daily.co SDK
- Payments: Stripe + Stripe Connect
- Charts: Recharts
- Forms: React Hook Form
- Routing: React Router DOM v7
- Icons: Lucide React

### Data Privacy Model
1. **Consent Layer** -- Database-enforced consent with time-based access windows. Every cross-boundary data access requires active consent. RLS policies check consent records on every query.
2. **Audit Trail** -- Hash-chain audit trail stored in Supabase. Each entry contains a SHA-256 hash incorporating the previous entry's hash, creating a tamper-evident chain. All data access, consent actions, and clinical events are recorded.

### FHIR Compliance
- Internal data stored in FHIR R4-compatible structures
- Supported resources: Patient, Observation, Condition, Procedure, MedicationRequest, Immunization, AllergyIntolerance
- Coding systems: ICD-10, SNOMED CT, CPT, LOINC, DIN
- Live connections to FHIR test servers (HAPI FHIR, SmileCDR sandbox)

### Prescription Pipeline
Both options available:
- Provider can suggest a pharmacy when writing the prescription
- Patient can redirect the prescription to a different pharmacy
- All consent and redirection actions logged on the audit chain

### Billing (Three Flows)
1. **Patient -> Platform**: Stripe collects patient payments into the platform account. Admin manually settles with providers (no Stripe Connect automatic payouts).
2. **Provider/Pharmacy -> Platform**: SaaS subscription fees (fixed, percentage, or hybrid)
3. **Insurance Claim Tracking**: Status tracking only for MVP (no electronic submission)

### Health Records Access
Patients always have free, unrestricted access to their own health records. No paywall for viewing, sharing, or basic export. Premium analytics/insights/bulk-export features are planned for future monetization (not in MVP).

---

## MVP Scope

### Included in MVP
- Full patient journey (register, book, consult via video or in-person, receive prescriptions, pharmacy fulfillment)
- Full provider journey (onboard, manage schedule, conduct consultations, write prescriptions, track earnings)
- Full pharmacy journey (onboard, receive prescriptions, fill orders, manage inventory)
- Admin platform management (users, applications, clinic management, finance, CMS, reports)
- Telemedicine with Daily.co
- Billing with Stripe
- FHIR data layer with test server connections
- Hash-chain audit trail
- Database-enforced consent with time windows
- CMS for marketing website content

### Excluded from MVP
- HRM module (departments, attendance, payroll, leaves)
- Applications suite (chat, email, kanban, file manager, social feed, etc.)
- Custom table builder
- Provincial EHR live integration (test connections only)
- Electronic claim submission to insurers
- AI-powered features (AI SOAP notes, AI search)

---

## Project Structure

```
src/
  App.tsx                      -- Routing (all routes defined here)
  app/
    frontend/                  -- Public marketing pages
    dashboard/
      patient/                 -- Patient pages
      provider/                -- Provider pages
      pharmacy/                -- Pharmacy pages
      admin/                   -- Admin pages
  components/                  -- React components by domain
  services/                    -- Business logic (85+ files)
  contexts/                    -- AuthContext, ThemeContext
  hooks/                       -- Custom hooks
  lib/                         -- Supabase client, utilities
  config/                      -- Theme config
supabase/
  migrations/                  -- Database migrations
  functions/                   -- Edge Functions
```

---

## Database

- All tables use Row-Level Security
- Migrations in `supabase/migrations/`
- Pending migrations in `.migrations_to_apply/`
- Use `mcp__supabase__apply_migration` for schema changes
- Use `maybeSingle()` instead of `single()` for queries returning 0-1 rows
- Never use destructive operations (DROP, DELETE columns)

---

## Conventions

- TypeScript strict mode
- Tailwind CSS for all styling
- Lucide React for icons
- React Hook Form for form management
- Supabase client singleton in `src/lib/supabase.ts`
- Service files in `src/services/` for all business logic
- Page files follow Next.js-style `page.tsx` convention in `src/app/`
- No comments in code unless explicitly requested
- No purple/indigo colors in design
