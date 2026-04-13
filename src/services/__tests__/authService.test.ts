import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase');

function chainMock(resolveValue: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(),
    eq: vi.fn(), neq: vi.fn(), or: vi.fn(), order: vi.fn(), limit: vi.fn(),
    single: vi.fn().mockResolvedValue(resolveValue),
    maybeSingle: vi.fn().mockResolvedValue(resolveValue),
    then: (resolve: any) => resolve(resolveValue),
  };
  Object.keys(chain).forEach((k) => {
    if (!['then', 'single', 'maybeSingle'].includes(k)) chain[k].mockReturnValue(chain);
  });
  return chain;
}

const { authService } = await import('../authService');

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initiateRegistration', () => {
    it('calls supabase signUp for email registration', async () => {
      (supabase.auth.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: { id: 'u1', email: 'test@example.com' } },
        error: null,
      });
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await authService.initiateRegistration({
        email: 'test@example.com',
        password: 'SecurePass123!',
        registrationMethod: 'email',
      });

      expect(result.needsVerification).toBe(true);
      expect(supabase.auth.signUp).toHaveBeenCalled();
    });

    it('throws when email is missing for email registration', async () => {
      await expect(
        authService.initiateRegistration({ registrationMethod: 'email', password: 'pass' })
      ).rejects.toThrow();
    });

    it('throws when password is missing for email registration', async () => {
      await expect(
        authService.initiateRegistration({ registrationMethod: 'email', email: 'test@example.com' })
      ).rejects.toThrow();
    });
  });

  describe('completeRegistration', () => {
    it('updates user profile with role and name', async () => {
      const chain = chainMock({ data: { id: 'u1' }, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);
      (supabase.rpc as ReturnType<typeof vi.fn>)?.mockResolvedValue?.({ data: 80, error: null });

      await authService.completeRegistration('u1', {
        role: 'patient',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
    });

    it('creates a patient record for patient role', async () => {
      const chain = chainMock({ data: { id: 'u1' }, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);
      (supabase.rpc as ReturnType<typeof vi.fn>)?.mockResolvedValue?.({ data: 80, error: null });

      await authService.completeRegistration('u1', { role: 'patient' });

      const fromCalls = (supabase.from as ReturnType<typeof vi.fn>).mock.calls.map((c: any) => c[0]);
      expect(fromCalls).toContain('patients');
    });

    it('creates a provider record for provider role', async () => {
      const chain = chainMock({ data: { id: 'u1' }, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);
      (supabase.rpc as ReturnType<typeof vi.fn>)?.mockResolvedValue?.({ data: 80, error: null });

      await authService.completeRegistration('u1', { role: 'provider' });

      const fromCalls = (supabase.from as ReturnType<typeof vi.fn>).mock.calls.map((c: any) => c[0]);
      expect(fromCalls).toContain('providers');
    });

    it('creates a pharmacy record for pharmacy role', async () => {
      const chain = chainMock({ data: { id: 'u1' }, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);
      (supabase.rpc as ReturnType<typeof vi.fn>)?.mockResolvedValue?.({ data: 80, error: null });

      await authService.completeRegistration('u1', { role: 'pharmacy' });

      const fromCalls = (supabase.from as ReturnType<typeof vi.fn>).mock.calls.map((c: any) => c[0]);
      expect(fromCalls).toContain('pharmacies');
    });

    it('inserts user role record', async () => {
      const chain = chainMock({ data: { id: 'u1' }, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);
      (supabase.rpc as ReturnType<typeof vi.fn>)?.mockResolvedValue?.({ data: 80, error: null });

      await authService.completeRegistration('u1', { role: 'patient' });

      const fromCalls = (supabase.from as ReturnType<typeof vi.fn>).mock.calls.map((c: any) => c[0]);
      expect(fromCalls).toContain('user_roles');
    });
  });
});
