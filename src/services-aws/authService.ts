import { api } from '../lib/api-client';
import { otpService } from './otpService';

export interface RegistrationData {
  email?: string;
  password?: string;
  phone?: string;
  registrationMethod: 'email' | 'phone';
}

export interface CompleteRegistrationData {
  role: 'patient' | 'provider' | 'pharmacy';
  firstName?: string;
  lastName?: string;
}

export const authService = {
  async initiateRegistration(data: RegistrationData): Promise<{ needsVerification: boolean; userId?: string }> {
    if (data.registrationMethod === 'email') {
      if (!data.email || !data.password) {
        throw new Error('Email and password are required');
      }

      const { data: authData, error } = await api.post<{ user: { id: string } }>('/auth/register', {
        email: data.email,
        password: data.password,
        registration_method: 'email',
      });

      if (error) throw new Error(error.message);
      if (!authData?.user) throw new Error('Failed to create user');

      await otpService.sendEmailOTP(data.email, 'registration', authData.user.id);

      return {
        needsVerification: true,
        userId: authData.user.id,
      };
    } else {
      if (!data.phone) {
        throw new Error('Phone number is required');
      }

      const { data: existing } = await api.get<{ id: string }>('/user-profiles', {
        params: { phone: data.phone, limit: '1' },
      });

      if (existing) {
        throw new Error('Phone number already registered');
      }

      await otpService.sendPhoneOTP(data.phone, 'registration');

      return {
        needsVerification: true,
      };
    }
  },

  async verifyRegistrationOTP(
    identifier: string,
    code: string,
    method: 'email' | 'phone'
  ): Promise<{ verified: boolean; userId?: string }> {
    let verified = false;

    if (method === 'email') {
      verified = await otpService.verifyEmailOTP(identifier, code);
    } else {
      verified = await otpService.verifyPhoneOTP(identifier, code);

      if (verified) {
        const randomPassword = Math.random().toString(36).slice(-20) + Math.random().toString(36).slice(-20);

        const { data: authData, error } = await api.post<{ user: { id: string } }>('/auth/register', {
          email: `${identifier.replace(/\D/g, '')}@doktochain-phone.temp`,
          password: randomPassword,
          registration_method: 'phone',
          phone: identifier,
        });

        if (error) throw new Error(error.message);
        if (!authData?.user) throw new Error('Failed to create user');

        await api.put(`/user-profiles/${authData.user.id}`, {
          phone: identifier,
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
          registration_method: 'phone',
        });

        return {
          verified: true,
          userId: authData.user.id,
        };
      }
    }

    if (method === 'email' && verified) {
      const { data: profile } = await api.get<{ id: string }>('/user-profiles', {
        params: { email: identifier, limit: '1' },
      });

      return {
        verified: true,
        userId: profile?.id,
      };
    }

    return { verified: false };
  },

  async completeRegistration(userId: string, data: CompleteRegistrationData): Promise<void> {
    const { error: profileError } = await api.put(`/user-profiles/${userId}`, { role: data.role });

    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await api.post('/user-roles', {
      user_id: userId,
      role: data.role,
    });

    if (roleError) throw new Error(roleError.message);

    if (data.role === 'patient') {
      const { error } = await api.post('/patients', {
        user_id: userId,
        profile_completed: false,
      });
      if (error) throw new Error(error.message);
    } else if (data.role === 'provider') {
      const { error } = await api.post('/providers', {
        user_id: userId,
        accepting_new_patients: false,
      });
      if (error) throw new Error(error.message);
    } else if (data.role === 'pharmacy') {
      const { error } = await api.post('/pharmacies', {
        user_id: userId,
        is_active: false,
      });
      if (error) throw new Error(error.message);
    }

    const { data: profile } = await api.get(`/user-profiles/${userId}`);

    if (profile) {
      const { data: completion } = await api.post<number>('/rpc/calculate-profile-completion', {
        user_profile_id: userId,
      });

      await api.put(`/user-profiles/${userId}`, {
        profile_completion_percentage: completion || 0,
      });
    }
  },

  async loginWithPhone(phone: string): Promise<void> {
    await otpService.sendPhoneOTP(phone, 'login');
  },

  async verifyPhoneLogin(phone: string, code: string): Promise<void> {
    const verified = await otpService.verifyPhoneOTP(phone, code);

    if (!verified) {
      throw new Error('Invalid verification code');
    }

    const { data: profile, error } = await api.get<{ id: string; email: string }>('/user-profiles', {
      params: { phone, phone_verified: 'true', limit: '1' },
    });

    if (error || !profile) {
      throw new Error('Phone number not registered');
    }

    throw new Error('Phone login requires additional setup. Please use email login for now.');
  },

  async resendOTP(identifier: string, method: 'email' | 'phone', purpose: string): Promise<void> {
    if (method === 'email') {
      await otpService.sendEmailOTP(identifier, purpose as any);
    } else {
      await otpService.sendPhoneOTP(identifier, purpose as any);
    }
  },

  async finalizeRegistration(
    userId: string,
    role: string,
    options?: { businessName?: string; specialtyId?: string; specialtyName?: string }
  ): Promise<void> {
    if (!options) return;

    if (options.businessName) {
      if (role === 'pharmacy') {
        const { data: existing } = await api.get<any[]>('/pharmacies', {
          params: { user_id: userId, limit: 1 },
        });
        const existingRow = Array.isArray(existing) ? existing[0] : null;
        if (existingRow?.id) {
          await api.put(`/pharmacies/${existingRow.id}`, { pharmacy_name: options.businessName });
        } else {
          await api.post('/pharmacies', {
            user_id: userId,
            pharmacy_name: options.businessName,
            onboarding_status: 'pending',
          });
        }
      } else if (role === 'clinic') {
        const { data: existing } = await api.get<any[]>('/clinics', {
          params: { owner_id: userId, limit: 1 },
        });
        const existingRow = Array.isArray(existing) ? existing[0] : null;
        if (existingRow?.id) {
          await api.put(`/clinics/${existingRow.id}`, { name: options.businessName });
        } else {
          await api.post('/clinics', {
            owner_id: userId,
            name: options.businessName,
            onboarding_status: 'pending',
            is_active: false,
            is_verified: false,
          });
        }
      }
    }

    if (role === 'provider' && options.specialtyId) {
      const { data: provider } = await api.get<{ id: string }>('/providers', {
        params: { user_id: userId, limit: '1' },
      });

      if (provider) {
        await api.post('/provider-specialties', {
          provider_id: provider.id,
          specialty_id: options.specialtyId,
          specialty_name: options.specialtyName,
          is_primary: true,
        });
      }
    }
  },
};
