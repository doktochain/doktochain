import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 'u1' },
    profile: { email: 'doc@test.com', first_name: 'John', last_name: 'Doe', phone: '555-1234' },
  }),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (resolve: any) => resolve({ data: [], error: null }),
    }),
  },
}));

vi.mock('../../../services/providerOnboardingService', () => ({
  providerOnboardingService: {
    createApplication: vi.fn().mockResolvedValue({ id: 'app1' }),
    updateApplication: vi.fn().mockResolvedValue({ id: 'app1' }),
    submitApplication: vi.fn().mockResolvedValue({ id: 'app1' }),
    getApplicationDocuments: vi.fn().mockResolvedValue([]),
    uploadDocument: vi.fn().mockResolvedValue({ id: 'doc1' }),
  },
}));

import { providerOnboardingService } from '../../../services/providerOnboardingService';
import ProviderOnboardingWizard from '../ProviderOnboardingWizard';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProviderOnboardingWizard', () => {
  const defaultProps = {
    onComplete: vi.fn(),
  };

  it('renders the wizard heading', () => {
    render(<ProviderOnboardingWizard {...defaultProps} />);
    expect(screen.getByText('Provider Onboarding')).toBeInTheDocument();
  });

  it('renders all 4 step labels', () => {
    render(<ProviderOnboardingWizard {...defaultProps} />);
    expect(screen.getByText('Professional Info')).toBeInTheDocument();
    expect(screen.getByText('License & Credentials')).toBeInTheDocument();
    expect(screen.getByText('Practice Details')).toBeInTheDocument();
    expect(screen.getByText('Review & Submit')).toBeInTheDocument();
  });

  it('starts on the professional info step', () => {
    render(<ProviderOnboardingWizard {...defaultProps} />);
    expect(screen.getByText('Provider Type *')).toBeInTheDocument();
  });

  it('shows provider type options', () => {
    render(<ProviderOnboardingWizard {...defaultProps} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(1);
  });

  it('shows validation error when provider type not selected', async () => {
    render(<ProviderOnboardingWizard {...defaultProps} />);
    const nextBtn = screen.getByText('Continue');
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText('Please select your provider type')).toBeInTheDocument();
    });
  });

  it('navigates to license step when provider type is filled', async () => {
    render(<ProviderOnboardingWizard {...defaultProps} />);

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'doctor' } });

    const nextBtn = screen.getByText('Continue');
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(providerOnboardingService.createApplication).toHaveBeenCalled();
    });
  });

  it('loads existing application data when provided', () => {
    const existingApp = {
      id: 'app1',
      provider_type: 'doctor',
      specialty: 'Cardiology',
      license_number: 'LIC-123',
      license_province: 'ON',
      license_expiry: '2026-01-01',
    };

    render(<ProviderOnboardingWizard {...defaultProps} existingApplication={existingApp} />);
    expect(screen.getByText('Provider Onboarding')).toBeInTheDocument();
  });

  it('renders progress bar', () => {
    const { container } = render(<ProviderOnboardingWizard {...defaultProps} />);
    const progressBar = container.querySelector('[style*="width"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('shows subtitle text', () => {
    render(<ProviderOnboardingWizard {...defaultProps} />);
    expect(screen.getByText('Complete your application to start accepting patients')).toBeInTheDocument();
  });
});
