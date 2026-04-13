import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase');

function chainMock(resolveValue: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
    eq: vi.fn(), neq: vi.fn(), in: vi.fn(), or: vi.fn(),
    order: vi.fn(), limit: vi.fn(),
    single: vi.fn().mockResolvedValue(resolveValue),
    maybeSingle: vi.fn().mockResolvedValue(resolveValue),
    then: (resolve: any) => resolve(resolveValue),
  };
  Object.keys(chain).forEach((k) => {
    if (!['then', 'single', 'maybeSingle'].includes(k)) chain[k].mockReturnValue(chain);
  });
  return chain;
}

const { familyManagementService } = await import('../familyManagementService');

describe('familyManagementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getChildren', () => {
    it('queries active children for guardian', async () => {
      const children = [{ id: 'c1', first_name: 'Alice' }];
      const chain = chainMock({ data: children, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await familyManagementService.getChildren('g1');
      expect(result.data).toEqual(children);
      expect(supabase.from).toHaveBeenCalledWith('child_profiles');
      expect(chain.eq).toHaveBeenCalledWith('guardian_id', 'g1');
      expect(chain.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('returns error on failure', async () => {
      const chain = chainMock({ data: null, error: new Error('DB error') });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await familyManagementService.getChildren('g1');
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('getChildById', () => {
    it('returns child by id', async () => {
      const child = { id: 'c1', first_name: 'Bob' };
      const chain = chainMock({ data: child, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await familyManagementService.getChildById('c1');
      expect(result.data).toEqual(child);
    });
  });

  describe('addChild', () => {
    it('inserts child and creates guardian relationship', async () => {
      const child = { id: 'c1', guardian_id: 'g1' };
      const chain = chainMock({ data: child, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await familyManagementService.addChild({ guardian_id: 'g1', first_name: 'New' } as any);
      expect(result.data).toEqual(child);
      expect(supabase.from).toHaveBeenCalledWith('child_profiles');
    });
  });

  describe('deactivateChild', () => {
    it('sets is_active to false', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await familyManagementService.deactivateChild('c1');
      expect(result.data).toBe(true);
    });
  });

  describe('getGrowthRecords', () => {
    it('queries growth records for child', async () => {
      const records = [{ id: 'gr1', height_cm: 100 }];
      const chain = chainMock({ data: records, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await familyManagementService.getGrowthRecords('c1');
      expect(result.data).toEqual(records);
      expect(supabase.from).toHaveBeenCalledWith('child_growth_records');
    });
  });

  describe('getMilestones', () => {
    it('returns milestones ordered by expected age', async () => {
      const milestones = [{ id: 'm1', milestone_name: 'First word' }];
      const chain = chainMock({ data: milestones, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await familyManagementService.getMilestones('c1');
      expect(result.data).toEqual(milestones);
      expect(supabase.from).toHaveBeenCalledWith('child_developmental_milestones');
    });
  });

  describe('getVaccinations', () => {
    it('returns vaccinations for child', async () => {
      const vaccinations = [{ id: 'v1', vaccine_name: 'MMR' }];
      const chain = chainMock({ data: vaccinations, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await familyManagementService.getVaccinations('c1');
      expect(result.data).toEqual(vaccinations);
      expect(supabase.from).toHaveBeenCalledWith('child_vaccinations');
    });
  });

  describe('getUpcomingVaccinations', () => {
    it('queries scheduled/overdue vaccinations limited to 5', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await familyManagementService.getUpcomingVaccinations('c1');
      expect(chain.in).toHaveBeenCalledWith('status', ['scheduled', 'overdue']);
      expect(chain.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('calculateAge', () => {
    it('calculates age in years and months', () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const result = familyManagementService.calculateAge(twoYearsAgo.toISOString());
      expect(result.years).toBe(2);
      expect(result.months).toBe(0);
    });

    it('handles partial year', () => {
      const date = new Date();
      date.setFullYear(date.getFullYear() - 1);
      date.setMonth(date.getMonth() - 6);
      const result = familyManagementService.calculateAge(date.toISOString());
      expect(result.years).toBe(1);
      expect(result.months).toBe(6);
    });

    it('handles negative month difference', () => {
      const date = new Date();
      date.setFullYear(date.getFullYear() - 3);
      date.setMonth(date.getMonth() + 3);
      const result = familyManagementService.calculateAge(date.toISOString());
      expect(result.years).toBe(2);
      expect(result.months).toBe(9);
    });
  });

  describe('calculateAgeMonths', () => {
    it('returns total months', () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const result = familyManagementService.calculateAgeMonths(oneYearAgo.toISOString());
      expect(result).toBe(12);
    });
  });

  describe('formatAge', () => {
    it('shows months only when under 1 year', () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const result = familyManagementService.formatAge(sixMonthsAgo.toISOString());
      expect(result).toBe('6 months');
    });

    it('shows years only when months is 0', () => {
      const exactlyThreeYears = new Date();
      exactlyThreeYears.setFullYear(exactlyThreeYears.getFullYear() - 3);
      const result = familyManagementService.formatAge(exactlyThreeYears.toISOString());
      expect(result).toBe('3 years');
    });

    it('shows years and months when both present', () => {
      const date = new Date();
      date.setFullYear(date.getFullYear() - 2);
      date.setMonth(date.getMonth() - 5);
      const result = familyManagementService.formatAge(date.toISOString());
      expect(result).toBe('2y 5m');
    });

    it('uses singular for 1 month', () => {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const result = familyManagementService.formatAge(oneMonthAgo.toISOString());
      expect(result).toBe('1 month');
    });

    it('uses singular for 1 year', () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const result = familyManagementService.formatAge(oneYearAgo.toISOString());
      expect(result).toBe('1 year');
    });
  });

  describe('isEligibleForIndependence', () => {
    it('returns true for 18+', () => {
      const adult = new Date();
      adult.setFullYear(adult.getFullYear() - 18);
      expect(familyManagementService.isEligibleForIndependence(adult.toISOString())).toBe(true);
    });

    it('returns false for under 18', () => {
      const minor = new Date();
      minor.setFullYear(minor.getFullYear() - 17);
      expect(familyManagementService.isEligibleForIndependence(minor.toISOString())).toBe(false);
    });

    it('returns true for 25-year-old', () => {
      const adult = new Date();
      adult.setFullYear(adult.getFullYear() - 25);
      expect(familyManagementService.isEligibleForIndependence(adult.toISOString())).toBe(true);
    });
  });

  describe('calculateBMI', () => {
    it('calculates BMI correctly', () => {
      const bmi = familyManagementService.calculateBMI(170, 70);
      expect(bmi).toBeCloseTo(24.22, 1);
    });

    it('handles short height', () => {
      const bmi = familyManagementService.calculateBMI(100, 20);
      expect(bmi).toBe(20);
    });
  });

  describe('getVaccinationStatusColor', () => {
    it('returns correct colors', () => {
      expect(familyManagementService.getVaccinationStatusColor('completed')).toBe('green');
      expect(familyManagementService.getVaccinationStatusColor('scheduled')).toBe('blue');
      expect(familyManagementService.getVaccinationStatusColor('overdue')).toBe('red');
      expect(familyManagementService.getVaccinationStatusColor('skipped')).toBe('gray');
      expect(familyManagementService.getVaccinationStatusColor('not_applicable')).toBe('gray');
    });

    it('returns gray for unknown status', () => {
      expect(familyManagementService.getVaccinationStatusColor('unknown')).toBe('gray');
    });
  });

  describe('getMilestoneStatusColor', () => {
    it('returns green when achieved', () => {
      expect(familyManagementService.getMilestoneStatusColor(true)).toBe('green');
    });

    it('returns red when significantly delayed', () => {
      expect(familyManagementService.getMilestoneStatusColor(false, 12, 16)).toBe('red');
    });

    it('returns yellow when not achieved but not delayed', () => {
      expect(familyManagementService.getMilestoneStatusColor(false, 12, 13)).toBe('yellow');
    });

    it('returns yellow when no age data provided', () => {
      expect(familyManagementService.getMilestoneStatusColor(false)).toBe('yellow');
    });
  });
});
