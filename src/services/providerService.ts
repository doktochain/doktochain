import { supabase } from '../lib/supabase';

export interface Provider {
  id: string;
  user_id: string;
  provider_type: 'doctor' | 'dentist' | 'specialist' | 'nurse' | 'therapist' | 'physician';
  license_number: string;
  license_province: string;
  license_expiry?: string;
  professional_title?: string;
  bio?: string;
  years_of_experience?: number;
  languages_spoken: string[];
  accepts_new_patients: boolean;
  consultation_fee_cents?: number;
  rating_average: number;
  rating_count: number;
  is_verified: boolean;
  is_active: boolean;
  onboarding_status?: 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  specialty?: string;
}

export interface ProviderLocation {
  id: string;
  provider_id: string;
  location_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  province: string;
  postal_code: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  is_primary: boolean;
  accepts_in_person: boolean;
  accepts_virtual: boolean;
}

export interface ProviderSchedule {
  id: string;
  provider_id: string;
  location_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_available: boolean;
}

export interface ProviderSpecialty {
  id: string;
  provider_id: string;
  specialty: string;
  sub_specialty?: string;
  is_primary: boolean;
}

export const providerService = {
  // Search providers
  async searchProviders(filters: {
    specialty?: string;
    city?: string;
    province?: string;
    language?: string;
    acceptsNewPatients?: boolean;
  }): Promise<Provider[]> {
    let query = supabase
      .from('providers')
      .select('*, provider_specialties(*), provider_locations(*)')
      .eq('is_active', true)
      .eq('is_verified', true);

    if (filters.acceptsNewPatients !== undefined) {
      query = query.eq('accepts_new_patients', filters.acceptsNewPatients);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  // Get provider by ID
  async getProvider(providerId: string): Promise<Provider | null> {
    const { data, error } = await supabase
      .from('providers')
      .select('*, provider_specialties(*), provider_locations(*), user_profiles(*)')
      .eq('id', providerId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Get provider by user ID
  async getProviderByUserId(userId: string): Promise<Provider | null> {
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Create provider profile
  async createProvider(providerData: Partial<Provider>): Promise<Provider> {
    const { data, error } = await supabase
      .from('providers')
      .insert(providerData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update provider
  async updateProvider(providerId: string, updates: Partial<Provider>): Promise<Provider> {
    const { data, error } = await supabase
      .from('providers')
      .update(updates)
      .eq('id', providerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get provider locations
  async getLocations(providerId: string): Promise<ProviderLocation[]> {
    const { data, error } = await supabase
      .from('provider_locations')
      .select('*')
      .eq('provider_id', providerId)
      .order('is_primary', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Add location
  async addLocation(locationData: Partial<ProviderLocation>): Promise<ProviderLocation> {
    const { data, error } = await supabase
      .from('provider_locations')
      .insert(locationData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get provider schedule
  async getSchedule(providerId: string, locationId?: string): Promise<ProviderSchedule[]> {
    let query = supabase
      .from('provider_schedules')
      .select('*')
      .eq('provider_id', providerId)
      .eq('is_available', true);

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query.order('day_of_week');

    if (error) throw error;
    return data || [];
  },

  // Add schedule
  async addSchedule(scheduleData: Partial<ProviderSchedule>): Promise<ProviderSchedule> {
    const { data, error } = await supabase
      .from('provider_schedules')
      .insert(scheduleData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSchedule(scheduleId: string): Promise<void> {
    const { error } = await supabase
      .from('provider_schedules')
      .delete()
      .eq('id', scheduleId);

    if (error) throw error;
  },

  async getAvailableSlots(
    providerId: string,
    date: string,
    locationId?: string
  ): Promise<{ start_time: string; end_time: string }[]> {
    // Get day of week from date
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

    // Get schedule for this day
    let query = supabase
      .from('provider_schedules')
      .select('*')
      .eq('provider_id', providerId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true);

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data: schedules, error: scheduleError } = await query;

    if (scheduleError) throw scheduleError;
    if (!schedules || schedules.length === 0) return [];

    // Get existing appointments for this date
    const { data: appointments, error: appointmentError } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('provider_id', providerId)
      .eq('appointment_date', date)
      .in('status', ['scheduled', 'confirmed', 'in-progress']);

    if (appointmentError) throw appointmentError;

    // Generate available slots (simplified - would need more complex logic)
    const slots: { start_time: string; end_time: string }[] = [];

    schedules.forEach(schedule => {
      // This is a simplified version - real implementation would calculate slots properly
      slots.push({
        start_time: schedule.start_time,
        end_time: schedule.end_time,
      });
    });

    return slots;
  },

  // Get provider reviews
  async getReviews(providerId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('provider_reviews')
      .select('*')
      .eq('provider_id', providerId)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Add review
  async addReview(reviewData: {
    provider_id: string;
    patient_id: string;
    appointment_id?: string;
    rating: number;
    review_text?: string;
    is_anonymous?: boolean;
  }): Promise<any> {
    const { data, error } = await supabase
      .from('provider_reviews')
      .insert(reviewData)
      .select()
      .single();

    if (error) throw error;

    // Update provider's average rating
    await this.updateProviderRating(reviewData.provider_id);

    return data;
  },

  // Update provider rating average
  async updateProviderRating(providerId: string): Promise<void> {
    const { data: reviews, error } = await supabase
      .from('provider_reviews')
      .select('rating')
      .eq('provider_id', providerId)
      .eq('is_published', true);

    if (error) throw error;

    if (reviews && reviews.length > 0) {
      const total = reviews.reduce((sum, r) => sum + r.rating, 0);
      const average = total / reviews.length;

      await supabase
        .from('providers')
        .update({
          rating_average: average,
          rating_count: reviews.length,
        })
        .eq('id', providerId);
    }
  },
};
