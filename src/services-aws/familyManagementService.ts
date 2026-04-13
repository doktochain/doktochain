import { api } from '../lib/api-client';

export interface ChildProfile {
  id: string;
  guardian_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  profile_photo_url?: string;
  health_card_number?: string;
  health_card_province?: string;
  blood_type?: string;
  allergies?: string[];
  medical_conditions?: string[];
  current_medications?: string[];
  pediatrician_id?: string;
  pediatrician_name?: string;
  pediatrician_phone?: string;
  school_name?: string;
  grade_level?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  special_needs?: string;
  dietary_restrictions?: string[];
  notes?: string;
  is_active: boolean;
  independence_granted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GuardianRelationship {
  id: string;
  guardian_id: string;
  child_id: string;
  relationship_type: 'parent' | 'legal_guardian' | 'stepparent' | 'grandparent' | 'other';
  has_full_access: boolean;
  can_book_appointments: boolean;
  can_view_medical_records: boolean;
  can_manage_medications: boolean;
  can_authorize_treatment: boolean;
  is_primary_guardian: boolean;
  verified: boolean;
  verified_at?: string;
  created_at: string;
}

export interface GrowthRecord {
  id: string;
  child_id: string;
  recorded_by: string;
  record_date: string;
  age_months: number;
  height_cm?: number;
  weight_kg?: number;
  head_circumference_cm?: number;
  bmi?: number;
  height_percentile?: number;
  weight_percentile?: number;
  bmi_percentile?: number;
  notes?: string;
  created_at: string;
}

export interface DevelopmentalMilestone {
  id: string;
  child_id: string;
  milestone_category: 'motor' | 'language' | 'cognitive' | 'social' | 'emotional';
  milestone_name: string;
  milestone_description?: string;
  expected_age_months?: number;
  achieved: boolean;
  achieved_date?: string;
  achieved_age_months?: number;
  notes?: string;
  created_at: string;
}

export interface Vaccination {
  id: string;
  child_id: string;
  vaccine_name: string;
  vaccine_type?: string;
  dose_number?: number;
  total_doses?: number;
  administered_date?: string;
  due_date?: string;
  administered_by?: string;
  administration_site?: string;
  lot_number?: string;
  manufacturer?: string;
  next_dose_due?: string;
  status: 'scheduled' | 'completed' | 'overdue' | 'skipped' | 'not_applicable';
  side_effects?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const familyManagementService = {
  async getChildren(guardianId: string): Promise<{
    data: ChildProfile[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.get<ChildProfile[]>('/child-profiles', {
        params: { guardian_id: guardianId, is_active: 'true', order: 'date_of_birth.desc' },
      });

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getChildById(childId: string): Promise<{
    data: ChildProfile | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.get<ChildProfile>(`/child-profiles/${childId}`);

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async addChild(child: Partial<ChildProfile>): Promise<{
    data: ChildProfile | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.post<ChildProfile>('/child-profiles', child);

      if (error) throw new Error(error.message);

      if (data) {
        await api.post('/guardian-relationships', {
          guardian_id: child.guardian_id,
          child_id: data.id,
          relationship_type: 'parent',
          is_primary_guardian: true,
          verified: true,
          verified_at: new Date().toISOString(),
        });
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async updateChild(
    childId: string,
    updates: Partial<ChildProfile>
  ): Promise<{
    data: ChildProfile | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.put<ChildProfile>(`/child-profiles/${childId}`, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async deactivateChild(childId: string): Promise<{
    data: boolean;
    error: Error | null;
  }> {
    try {
      const { error } = await api.put(`/child-profiles/${childId}`, {
        is_active: false,
        updated_at: new Date().toISOString(),
      });

      if (error) throw new Error(error.message);
      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: error as Error };
    }
  },

  async getGrowthRecords(childId: string): Promise<{
    data: GrowthRecord[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.get<GrowthRecord[]>('/child-growth-records', {
        params: { child_id: childId, order: 'record_date.desc' },
      });

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async addGrowthRecord(record: Partial<GrowthRecord>): Promise<{
    data: GrowthRecord | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.post<GrowthRecord>('/child-growth-records', record);

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getMilestones(childId: string): Promise<{
    data: DevelopmentalMilestone[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.get<DevelopmentalMilestone[]>('/child-developmental-milestones', {
        params: { child_id: childId, order: 'expected_age_months.asc' },
      });

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async updateMilestone(
    milestoneId: string,
    updates: Partial<DevelopmentalMilestone>
  ): Promise<{
    data: DevelopmentalMilestone | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.put<DevelopmentalMilestone>(`/child-developmental-milestones/${milestoneId}`, updates);

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async addMilestone(milestone: Partial<DevelopmentalMilestone>): Promise<{
    data: DevelopmentalMilestone | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.post<DevelopmentalMilestone>('/child-developmental-milestones', milestone);

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getVaccinations(childId: string): Promise<{
    data: Vaccination[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.get<Vaccination[]>('/child-vaccinations', {
        params: { child_id: childId, order: 'due_date.asc' },
      });

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async addVaccination(vaccination: Partial<Vaccination>): Promise<{
    data: Vaccination | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.post<Vaccination>('/child-vaccinations', vaccination);

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async updateVaccination(
    vaccinationId: string,
    updates: Partial<Vaccination>
  ): Promise<{
    data: Vaccination | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.put<Vaccination>(`/child-vaccinations/${vaccinationId}`, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getUpcomingVaccinations(childId: string): Promise<{
    data: Vaccination[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.get<Vaccination[]>('/child-vaccinations', {
        params: {
          child_id: childId,
          status_in: 'scheduled,overdue',
          order: 'due_date.asc',
          limit: '5',
        },
      });

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  calculateAge(dateOfBirth: string): { years: number; months: number } {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let years = today.getFullYear() - dob.getFullYear();
    let months = today.getMonth() - dob.getMonth();

    if (months < 0) {
      years--;
      months += 12;
    }

    return { years, months };
  },

  calculateAgeMonths(dateOfBirth: string): number {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    const years = today.getFullYear() - dob.getFullYear();
    const months = today.getMonth() - dob.getMonth();
    return years * 12 + months;
  },

  formatAge(dateOfBirth: string): string {
    const { years, months } = this.calculateAge(dateOfBirth);
    if (years === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else if (months === 0) {
      return `${years} year${years !== 1 ? 's' : ''}`;
    } else {
      return `${years}y ${months}m`;
    }
  },

  isEligibleForIndependence(dateOfBirth: string): boolean {
    const { years } = this.calculateAge(dateOfBirth);
    return years >= 18;
  },

  calculateBMI(heightCm: number, weightKg: number): number {
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  },

  getVaccinationStatusColor(status: string): string {
    const colors: Record<string, string> = {
      completed: 'green',
      scheduled: 'blue',
      overdue: 'red',
      skipped: 'gray',
      not_applicable: 'gray',
    };
    return colors[status] || 'gray';
  },

  getMilestoneStatusColor(achieved: boolean, expectedAgeMonths?: number, currentAgeMonths?: number): string {
    if (achieved) return 'green';
    if (expectedAgeMonths && currentAgeMonths && currentAgeMonths > expectedAgeMonths + 3) {
      return 'red';
    }
    return 'yellow';
  },
};
