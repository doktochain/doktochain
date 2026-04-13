import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

let mockAuthState = {
  user: null as any,
  userProfile: null as any,
  loading: false,
};

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

function renderProtected(
  allowedRoles: ('patient' | 'provider' | 'admin' | 'pharmacy' | 'clinic' | 'staff')[],
  initialPath: string,
  redirectTo?: string
) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ProtectedRoute allowedRoles={allowedRoles} redirectTo={redirectTo}>
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>
    </MemoryRouter>
  );
}

describe('ProtectedRoute component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = { user: null, userProfile: null, loading: false };
  });

  describe('loading state', () => {
    it('shows loading spinner while auth is loading', () => {
      mockAuthState = { user: null, userProfile: null, loading: true };
      renderProtected(['patient'], '/dashboard/patient/dashboard');
      expect(screen.getByText('Authenticating...')).toBeTruthy();
    });

    it('does not show protected content while loading', () => {
      mockAuthState = { user: null, userProfile: null, loading: true };
      renderProtected(['patient'], '/dashboard/patient/dashboard');
      expect(screen.queryByTestId('protected-content')).toBeNull();
    });
  });

  describe('unauthenticated user', () => {
    it('does not render protected content when user is null', () => {
      mockAuthState = { user: null, userProfile: null, loading: false };
      renderProtected(['patient'], '/dashboard/patient/dashboard');
      expect(screen.queryByTestId('protected-content')).toBeNull();
    });

    it('redirects to /login for patient routes', () => {
      mockAuthState = { user: null, userProfile: null, loading: false };
      renderProtected(['patient'], '/dashboard/patient/dashboard');
      expect(mockNavigate).toHaveBeenCalledWith('/login', expect.objectContaining({ replace: true }));
    });

    it('redirects to /provider/login for provider routes', () => {
      mockAuthState = { user: null, userProfile: null, loading: false };
      renderProtected(['provider'], '/dashboard/provider/dashboard');
      expect(mockNavigate).toHaveBeenCalledWith('/provider/login', expect.objectContaining({ replace: true }));
    });

    it('redirects to /portal/login for pharmacy routes', () => {
      mockAuthState = { user: null, userProfile: null, loading: false };
      renderProtected(['pharmacy'], '/dashboard/pharmacy/dashboard');
      expect(mockNavigate).toHaveBeenCalledWith('/portal/login', expect.objectContaining({ replace: true }));
    });

    it('redirects to /platform-admin/login for admin routes', () => {
      mockAuthState = { user: null, userProfile: null, loading: false };
      renderProtected(['admin'], '/dashboard/admin/dashboard');
      expect(mockNavigate).toHaveBeenCalledWith('/platform-admin/login', expect.objectContaining({ replace: true }));
    });
  });

  describe('authenticated user with correct role', () => {
    it('renders protected content for authorized patient', () => {
      mockAuthState = {
        user: { id: 'u1' },
        userProfile: { role: 'patient' },
        loading: false,
      };
      renderProtected(['patient'], '/dashboard/patient/dashboard');
      expect(screen.getByTestId('protected-content')).toBeTruthy();
    });

    it('renders protected content when user has one of multiple allowed roles', () => {
      mockAuthState = {
        user: { id: 'u1' },
        userProfile: { role: 'admin' },
        loading: false,
      };
      renderProtected(['admin', 'staff'], '/dashboard/admin/dashboard');
      expect(screen.getByTestId('protected-content')).toBeTruthy();
    });
  });

  describe('authenticated user with wrong role', () => {
    it('does not render protected content', () => {
      mockAuthState = {
        user: { id: 'u1' },
        userProfile: { role: 'patient' },
        loading: false,
      };
      renderProtected(['admin'], '/dashboard/admin/dashboard');
      expect(screen.queryByTestId('protected-content')).toBeNull();
    });

    it('redirects to custom redirectTo path when provided', () => {
      mockAuthState = {
        user: { id: 'u1' },
        userProfile: { role: 'patient' },
        loading: false,
      };
      renderProtected(['admin'], '/dashboard/admin/dashboard', '/dashboard/patient/dashboard');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/patient/dashboard', expect.objectContaining({ replace: true }));
    });

    it('redirects patient to patient dashboard by default', () => {
      mockAuthState = {
        user: { id: 'u1' },
        userProfile: { role: 'patient' },
        loading: false,
      };
      renderProtected(['admin'], '/dashboard/admin/dashboard');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/patient/dashboard', expect.objectContaining({ replace: true }));
    });

    it('redirects provider to provider dashboard by default', () => {
      mockAuthState = {
        user: { id: 'u1' },
        userProfile: { role: 'provider' },
        loading: false,
      };
      renderProtected(['admin'], '/dashboard/admin/dashboard');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/provider/dashboard', expect.objectContaining({ replace: true }));
    });

    it('redirects pharmacy to pharmacy dashboard by default', () => {
      mockAuthState = {
        user: { id: 'u1' },
        userProfile: { role: 'pharmacy' },
        loading: false,
      };
      renderProtected(['admin'], '/dashboard/admin/dashboard');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/pharmacy/dashboard', expect.objectContaining({ replace: true }));
    });
  });

  describe('user with no profile yet', () => {
    it('shows loading profile message', () => {
      mockAuthState = {
        user: { id: 'u1' },
        userProfile: null,
        loading: false,
      };
      renderProtected(['patient'], '/dashboard/patient/dashboard');
      expect(screen.getByText('Loading profile...')).toBeTruthy();
    });

    it('does not render protected content', () => {
      mockAuthState = {
        user: { id: 'u1' },
        userProfile: null,
        loading: false,
      };
      renderProtected(['patient'], '/dashboard/patient/dashboard');
      expect(screen.queryByTestId('protected-content')).toBeNull();
    });

    it('does not render protected content when role is missing', () => {
      mockAuthState = {
        user: { id: 'u1' },
        userProfile: { role: undefined },
        loading: false,
      };
      renderProtected(['patient'], '/dashboard/patient/dashboard');
      expect(screen.queryByTestId('protected-content')).toBeNull();
    });
  });
});
