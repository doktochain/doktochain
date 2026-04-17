import { api } from '../lib/api-client';

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
  async searchProviders(filters: {
    specialty?: string;
    city?: string;
    province?: string;
    language?: string;
    acceptsNewPatients?: boolean;
  }): Promise<Provider[]> {
    const params: Record<string, any> = {
      is_active: true,
      is_verified: true,
      include: 'provider_specialties,provider_locations',
    };

    if (filters.acceptsNewPatients !== undefined) {
      params.accepts_new_patients = filters.acceptsNewPatients;
    }

    const { data, error } = await api.get<Provider[]>('/providers', { params });

    if (error) throw error;
    return data || [];
  },

  async getProvider(providerId: string): Promise<Provider | null> {
    const { data, error } = await api.get<Provider>(`/providers/${providerId}`, {
      params: { include: 'provider_specialties,provider_locations,user_profiles' },
    });

    if (error) throw error;
    return data;
  },

  async getProviderByUserId(_userId: string): Promise<Provider | null> {
    const { data, error, status } = await api.get<Provider>('/providers/me');

    if (status === 404) return null;
    if (error) {
      if (error.status === 404) return null;
      throw error;
    }
    return data || null;
  },

  async createProvider(providerData: Partial<Provider>): Promise<Provider> {
    const { data, error } = await api.post<Provider>('/providers', providerData);

    if (error) throw error;
    return data!;
  },

  async updateProvider(providerId: string, updates: Partial<Provider>): Promise<Provider> {
    const { data, error } = await api.put<Provider>(`/providers/${providerId}`, updates);

    if (error) throw error;
    return data!;
  },

  async getLocations(providerId: string): Promise<ProviderLocation[]> {
    const { data, error } = await api.get<ProviderLocation[]>('/provider-locations', {
      params: { provider_id: providerId, order: 'is_primary:desc' },
    });

    if (error) throw error;
    return data || [];
  },

  async addLocation(locationData: Partial<ProviderLocation>): Promise<ProviderLocation> {
    const { data, error } = await api.post<ProviderLocation>('/provider-locations', locationData);

    if (error) throw error;
    return data!;
  },

  async updateLocation(locationId: string, updates: Partial<ProviderLocation>): Promise<ProviderLocation> {
    const { data, error } = await api.put<ProviderLocation>(`/provider-locations/${locationId}`, updates);

    if (error) throw error;
    return data!;
  },

  async deleteLocation(locationId: string): Promise<void> {
    const { error } = await api.delete(`/provider-locations/${locationId}`);

    if (error) throw error;
  },

  async getSchedule(providerId: string, locationId?: string): Promise<ProviderSchedule[]> {
    const params: Record<string, any> = {
      provider_id: providerId,
      is_available: true,
      order: 'day_of_week:asc',
    };

    if (locationId) {
      params.location_id = locationId;
    }

    const { data, error } = await api.get<ProviderSchedule[]>('/provider-schedules', { params });

    if (error) throw error;
    return data || [];
  },

  async addSchedule(scheduleData: Partial<ProviderSchedule>): Promise<ProviderSchedule> {
    const { data, error } = await api.post<ProviderSchedule>('/provider-schedules', scheduleData);

    if (error) throw error;
    return data!;
  },

  async deleteSchedule(scheduleId: string): Promise<void> {
    const { error } = await api.delete(`/provider-schedules/${scheduleId}`);

    if (error) throw error;
  },

  async getAvailableSlots(
    providerId: string,
    date: string,
    locationId?: string
  ): Promise<{ start_time: string; end_time: string }[]> {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

    const params: Record<string, any> = {
      provider_id: providerId,
      day_of_week: dayOfWeek,
      is_available: true,
    };

    if (locationId) {
      params.location_id = locationId;
    }

    const { data: schedules, error: scheduleError } = await api.get<any[]>('/provider-schedules', { params });

    if (scheduleError) throw scheduleError;
    if (!schedules || schedules.length === 0) return [];

    const { data: appointments, error: appointmentError } = await api.get<any[]>('/appointments', {
      params: {
        provider_id: providerId,
        appointment_date: date,
        status: 'scheduled,confirmed,in-progress',
      },
    });

    if (appointmentError) throw appointmentError;

    const slots: { start_time: string; end_time: string }[] = [];

    schedules.forEach(schedule => {
      slots.push({
        start_time: schedule.start_time,
        end_time: schedule.end_time,
      });
    });

    return slots;
  },

  async getReviews(providerId: string): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/provider-reviews', {
      params: {
        provider_id: providerId,
        is_published: true,
        order: 'created_at:desc',
      },
    });

    if (error) throw error;
    return data || [];
  },

  async addReview(reviewData: {
    provider_id: string;
    patient_id: string;
    appointment_id?: string;
    rating: number;
    review_text?: string;
    is_anonymous?: boolean;
  }): Promise<any> {
    const { data, error } = await api.post<any>('/provider-reviews', reviewData);

    if (error) throw error;

    await this.updateProviderRating(reviewData.provider_id);

    return data;
  },

  async updateProviderRating(providerId: string): Promise<void> {
    const { data: reviews, error } = await api.get<any[]>('/provider-reviews', {
      params: {
        provider_id: providerId,
        is_published: true,
        select: 'rating',
      },
    });

    if (error) throw error;

    if (reviews && reviews.length > 0) {
      const total = reviews.reduce((sum, r) => sum + r.rating, 0);
      const average = total / reviews.length;

      await api.put(`/providers/${providerId}`, {
        rating_average: average,
        rating_count: reviews.length,
      });
    }
  },
};
