import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../../services/ePrescriptionService', () => ({
  ePrescriptionService: {
    searchMedications: vi.fn().mockResolvedValue([]),
    checkDrugInteractions: vi.fn().mockResolvedValue([]),
    checkAllergies: vi.fn().mockResolvedValue([]),
    createPrescription: vi.fn().mockResolvedValue({ id: 'rx1' }),
    sendToPharmacy: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../services/pharmacyService', () => ({
  pharmacyService: {
    getAllPharmacies: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../services/blockchainAuditService', () => ({
  blockchainAuditService: {
    logEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { ePrescriptionService } from '../../../services/ePrescriptionService';
import { pharmacyService } from '../../../services/pharmacyService';
import { toast } from 'sonner';
import PrescriptionWriter from '../PrescriptionWriter';

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PrescriptionWriter', () => {
  const defaultProps = {
    patientId: 'pat1',
    providerId: 'prov1',
    appointmentId: 'apt1',
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders the heading and search input', () => {
    render(<PrescriptionWriter {...defaultProps} />);
    expect(screen.getByText('Write Prescription')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search by drug name/i)).toBeInTheDocument();
  });

  it('renders cancel button when onCancel provided', () => {
    render(<PrescriptionWriter {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('does not render cancel button when onCancel not provided', () => {
    const { onCancel, ...rest } = defaultProps;
    render(<PrescriptionWriter {...rest} />);
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('shows search results after typing 3+ characters', async () => {
    const medications = [
      { drug_name: 'Amoxicillin', generic_name: 'Amoxicillin', brand_name: 'Amoxil', strength: '500mg', form: 'Capsule', din: '12345' },
    ];
    (ePrescriptionService.searchMedications as any).mockResolvedValue(medications);

    render(<PrescriptionWriter {...defaultProps} />);
    const input = screen.getByPlaceholderText(/search by drug name/i);

    await userEvent.type(input, 'amo');
    vi.advanceTimersByTime(400);

    await waitFor(() => {
      expect(ePrescriptionService.searchMedications).toHaveBeenCalledWith('amo');
    });
  });

  it('does not search with fewer than 3 characters', async () => {
    render(<PrescriptionWriter {...defaultProps} />);
    const input = screen.getByPlaceholderText(/search by drug name/i);

    await userEvent.type(input, 'am');
    vi.advanceTimersByTime(400);

    await waitFor(() => {
      expect(ePrescriptionService.searchMedications).not.toHaveBeenCalled();
    });
  });

  it('loads pharmacies on mount', async () => {
    (pharmacyService.getAllPharmacies as any).mockResolvedValue([
      { id: 'ph1', pharmacy_name: 'Test Pharmacy', status: 'active' },
      { id: 'ph2', pharmacy_name: 'Inactive Pharm', status: 'inactive' },
    ]);

    render(<PrescriptionWriter {...defaultProps} />);

    await waitFor(() => {
      expect(pharmacyService.getAllPharmacies).toHaveBeenCalled();
    });
  });

  it('shows allergy alerts when present', async () => {
    const allergies = [
      { allergen: 'Penicillin', severity: 'high', reaction: 'Anaphylaxis' },
    ];
    const medications = [
      { drug_name: 'Amoxicillin', generic_name: 'Amoxicillin', brand_name: 'Amoxil', strength: '500mg', form: 'Capsule' },
    ];

    (ePrescriptionService.searchMedications as any).mockResolvedValue(medications);
    (ePrescriptionService.checkAllergies as any).mockResolvedValue(allergies);
    (ePrescriptionService.checkDrugInteractions as any).mockResolvedValue([]);

    render(<PrescriptionWriter {...defaultProps} />);
    const input = screen.getByPlaceholderText(/search by drug name/i);

    await userEvent.type(input, 'amo');
    vi.advanceTimersByTime(400);

    await waitFor(() => {
      expect(screen.getByText('Amoxicillin')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Amoxicillin'));

    await waitFor(() => {
      expect(screen.getByText('ALLERGY ALERT')).toBeInTheDocument();
      expect(screen.getByText(/Penicillin/)).toBeInTheDocument();
    });
  });

  it('shows drug interaction warnings when present', async () => {
    const interactions = [
      { drug_a: 'Amoxicillin', drug_b: 'Warfarin', severity: 'moderate', description: 'May increase bleeding risk' },
    ];
    const medications = [
      { drug_name: 'Amoxicillin', generic_name: 'Amoxicillin', brand_name: 'Amoxil', strength: '500mg', form: 'Capsule' },
    ];

    (ePrescriptionService.searchMedications as any).mockResolvedValue(medications);
    (ePrescriptionService.checkDrugInteractions as any).mockResolvedValue(interactions);
    (ePrescriptionService.checkAllergies as any).mockResolvedValue([]);

    render(<PrescriptionWriter {...defaultProps} />);
    const input = screen.getByPlaceholderText(/search by drug name/i);

    await userEvent.type(input, 'amo');
    vi.advanceTimersByTime(400);

    await waitFor(() => {
      expect(screen.getByText('Amoxicillin')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Amoxicillin'));

    await waitFor(() => {
      expect(screen.getByText('MODERATE DRUG INTERACTION')).toBeInTheDocument();
      expect(screen.getByText('May increase bleeding risk')).toBeInTheDocument();
    });
  });

  it('disables save buttons when no medication is selected', () => {
    render(<PrescriptionWriter {...defaultProps} />);

    const saveBtn = screen.getByText('Save Draft').closest('button');
    expect(saveBtn).toBeDisabled();
  });

  it('renders frequency dropdown with all options', () => {
    render(<PrescriptionWriter {...defaultProps} />);
    const frequencySelect = screen.getByDisplayValue('Once daily');
    expect(frequencySelect).toBeInTheDocument();
  });

  it('renders default quantity and refills', () => {
    render(<PrescriptionWriter {...defaultProps} />);
    const quantityInput = screen.getByDisplayValue('30');
    const refillsInput = screen.getByDisplayValue('0');
    expect(quantityInput).toBeInTheDocument();
    expect(refillsInput).toBeInTheDocument();
  });
});
