import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 'u1' },
  }),
}));

vi.mock('../../../services/enhancedBookingService', () => ({
  enhancedBookingService: {
    getProviderServices: vi.fn().mockResolvedValue([]),
    getProviderAvailability: vi.fn().mockResolvedValue([]),
    getQuestionnaireForService: vi.fn().mockResolvedValue([]),
    getConsentForms: vi.fn().mockResolvedValue([]),
    createAppointment: vi.fn().mockResolvedValue('apt1'),
    submitQuestionnaire: vi.fn().mockResolvedValue(undefined),
    signConsentForm: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../services/financeService', () => ({
  FinanceService: {
    isBookingFeeActive: vi.fn().mockResolvedValue(false),
    getBookingFeeAmount: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('../../../services/patientService', () => ({
  patientService: {
    getPatientByUserId: vi.fn().mockResolvedValue({ id: 'pat1' }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { enhancedBookingService } from '../../../services/enhancedBookingService';
import ComprehensiveBookingWizard from '../ComprehensiveBookingWizard';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ComprehensiveBookingWizard', () => {
  const defaultProps = {
    providerId: 'prov1',
    onComplete: vi.fn(),
  };

  it('renders loading state initially', () => {
    (enhancedBookingService.getProviderServices as any).mockReturnValue(new Promise(() => {}));
    render(<ComprehensiveBookingWizard {...defaultProps} />);
    expect(screen.getByText('Loading services...')).toBeInTheDocument();
  });

  it('renders step indicator', async () => {
    (enhancedBookingService.getProviderServices as any).mockResolvedValue([]);
    render(<ComprehensiveBookingWizard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Select Service')).toBeInTheDocument();
      expect(screen.getByText('Consultation Type')).toBeInTheDocument();
      expect(screen.getByText('Date & Time')).toBeInTheDocument();
    });
  });

  it('shows empty state when no services', async () => {
    (enhancedBookingService.getProviderServices as any).mockResolvedValue([]);
    render(<ComprehensiveBookingWizard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No Services Available')).toBeInTheDocument();
    });
  });

  it('renders services when available', async () => {
    const services = [
      { id: 's1', service_name: 'General Checkup', service_type: 'General', base_price: 100, duration_minutes: 30 },
    ];
    (enhancedBookingService.getProviderServices as any).mockResolvedValue(services);

    render(<ComprehensiveBookingWizard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Select a Service')).toBeInTheDocument();
    });
  });

  it('loads services on mount', async () => {
    (enhancedBookingService.getProviderServices as any).mockResolvedValue([]);
    render(<ComprehensiveBookingWizard {...defaultProps} />);

    await waitFor(() => {
      expect(enhancedBookingService.getProviderServices).toHaveBeenCalledWith('prov1');
    });
  });

  it('starts on the service step', async () => {
    (enhancedBookingService.getProviderServices as any).mockResolvedValue([]);
    render(<ComprehensiveBookingWizard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No Services Available')).toBeInTheDocument();
    });
  });
});
