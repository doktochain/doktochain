import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
  },
  getCurrentUser: vi.fn(),
  getUserProfile: vi.fn(),
  getUserRoles: vi.fn(),
}));

vi.mock('@/services/auditTrailService', () => ({
  auditTrailService: {
    logEvent: vi.fn().mockResolvedValue({}),
    logEventSafe: vi.fn().mockResolvedValue(undefined),
    logPrescriptionCreated: vi.fn().mockResolvedValue(undefined),
    logPharmacyValidation: vi.fn().mockResolvedValue(undefined),
    logOrderFulfillment: vi.fn().mockResolvedValue(undefined),
    logDeliveryEvent: vi.fn().mockResolvedValue(undefined),
    logAppointmentCreated: vi.fn().mockResolvedValue(undefined),
    logClinicalNote: vi.fn().mockResolvedValue(undefined),
    logInsuranceClaim: vi.fn().mockResolvedValue(undefined),
    logPayment: vi.fn().mockResolvedValue(undefined),
    verifyChainIntegrity: vi.fn(),
    calculateHash: vi.fn(),
    getAuditTrail: vi.fn(),
  },
}));

vi.mock('@/services/blockchainAuditService', () => ({
  blockchainAuditService: {
    logEvent: vi.fn().mockResolvedValue({}),
    logEventSafe: vi.fn().mockResolvedValue(undefined),
  },
}));
