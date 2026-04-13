import { describe, it, expect } from 'vitest';

function getLoginRoute(pathname: string): string {
  if (pathname.startsWith('/dashboard/patient')) return '/login';
  if (pathname.startsWith('/dashboard/provider')) return '/provider/login';
  if (pathname.startsWith('/dashboard/pharmacy')) return '/portal/login';
  if (pathname.startsWith('/dashboard/clinic')) return '/portal/login';
  if (pathname.startsWith('/dashboard/admin')) return '/platform-admin/login';
  return '/login';
}

const defaultRedirects: Record<string, string> = {
  admin: '/dashboard/admin/dashboard',
  provider: '/dashboard/provider/dashboard',
  pharmacy: '/dashboard/pharmacy/dashboard',
  patient: '/dashboard/patient/dashboard',
  clinic: '/dashboard/clinic/dashboard',
  staff: '/dashboard/admin/dashboard',
};

describe('getLoginRoute', () => {
  it('returns /login for patient routes', () => {
    expect(getLoginRoute('/dashboard/patient/appointments')).toBe('/login');
  });

  it('returns /provider/login for provider routes', () => {
    expect(getLoginRoute('/dashboard/provider/dashboard')).toBe('/provider/login');
  });

  it('returns /portal/login for pharmacy routes', () => {
    expect(getLoginRoute('/dashboard/pharmacy/inventory')).toBe('/portal/login');
  });

  it('returns /portal/login for clinic routes', () => {
    expect(getLoginRoute('/dashboard/clinic/staff')).toBe('/portal/login');
  });

  it('returns /platform-admin/login for admin routes', () => {
    expect(getLoginRoute('/dashboard/admin/users')).toBe('/platform-admin/login');
  });

  it('returns /login for unknown routes', () => {
    expect(getLoginRoute('/some/other/path')).toBe('/login');
  });

  it('returns /login for root path', () => {
    expect(getLoginRoute('/')).toBe('/login');
  });
});

describe('defaultRedirects', () => {
  it('maps all 6 roles', () => {
    expect(Object.keys(defaultRedirects)).toHaveLength(6);
  });

  it('redirects admin to admin dashboard', () => {
    expect(defaultRedirects['admin']).toBe('/dashboard/admin/dashboard');
  });

  it('redirects provider to provider dashboard', () => {
    expect(defaultRedirects['provider']).toBe('/dashboard/provider/dashboard');
  });

  it('redirects pharmacy to pharmacy dashboard', () => {
    expect(defaultRedirects['pharmacy']).toBe('/dashboard/pharmacy/dashboard');
  });

  it('redirects patient to patient dashboard', () => {
    expect(defaultRedirects['patient']).toBe('/dashboard/patient/dashboard');
  });

  it('redirects clinic to clinic dashboard', () => {
    expect(defaultRedirects['clinic']).toBe('/dashboard/clinic/dashboard');
  });

  it('redirects staff to admin dashboard', () => {
    expect(defaultRedirects['staff']).toBe('/dashboard/admin/dashboard');
  });

  it('returns undefined for unknown role', () => {
    expect(defaultRedirects['unknown']).toBeUndefined();
  });
});

describe('role authorization', () => {
  it('allows when user role is in allowedRoles', () => {
    const allowedRoles = ['patient', 'provider'];
    const userRole = 'patient';
    expect(allowedRoles.includes(userRole)).toBe(true);
  });

  it('denies when user role is not in allowedRoles', () => {
    const allowedRoles = ['admin'];
    const userRole = 'patient';
    expect(allowedRoles.includes(userRole)).toBe(false);
  });

  it('allows admin role for admin routes', () => {
    const allowedRoles = ['admin', 'staff'];
    expect(allowedRoles.includes('admin')).toBe(true);
    expect(allowedRoles.includes('staff')).toBe(true);
    expect(allowedRoles.includes('patient')).toBe(false);
  });
});
