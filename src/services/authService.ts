import { supabase } from '../lib/supabase';
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
  // Step 1: Initial registration (email/password or phone)
  async initiateRegistration(data: RegistrationData): Promise<{ needsVerification: boolean; userId?: string }> {
    if (data.registrationMethod === 'email') {
      if (!data.email || !data.password) {
        throw new Error('Email and password are required');
      }

      // Create Supabase auth user
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            registration_method: 'email',
          },
        },
      });

      if (error) throw error;
      if (!authData.user) throw new Error('Failed to create user');

      // Send email OTP
      await otpService.sendEmailOTP(data.email, 'registration', authData.user.id);

      return {
        needsVerification: true,
        userId: authData.user.id,
      };
    } else {
      // Phone registration
      if (!data.phone) {
        throw new Error('Phone number is required');
      }

      // Check if phone already exists
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('phone', data.phone)
        .maybeSingle();

      if (existing) {
        throw new Error('Phone number already registered');
      }

      // Send phone OTP (we'll create the user after verification)
      await otpService.sendPhoneOTP(data.phone, 'registration');

      return {
        needsVerification: true,
      };
    }
  },

  // Step 2: Verify OTP
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
        // For phone registration, create the auth user now
        // Generate a random password since we're using phone auth
        const randomPassword = Math.random().toString(36).slice(-20) + Math.random().toString(36).slice(-20);

        const { data: authData, error } = await supabase.auth.signUp({
          email: `${identifier.replace(/\D/g, '')}@doktochain-phone.temp`,
          password: randomPassword,
          options: {
            data: {
              registration_method: 'phone',
              phone: identifier,
            },
          },
        });

        if (error) throw error;
        if (!authData.user) throw new Error('Failed to create user');

        // Update user profile with phone
        await supabase
          .from('user_profiles')
          .update({
            phone: identifier,
            phone_verified: true,
            phone_verified_at: new Date().toISOString(),
            registration_method: 'phone',
          })
          .eq('id', authData.user.id);

        return {
          verified: true,
          userId: authData.user.id,
        };
      }
    }

    if (method === 'email' && verified) {
      // Get user ID for email registration
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', identifier)
        .maybeSingle();

      return {
        verified: true,
        userId: profile?.id,
      };
    }

    return { verified: false };
  },

  // Step 3: Complete registration with role
  async completeRegistration(userId: string, data: CompleteRegistrationData): Promise<void> {
    // Update user profile with role
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ role: data.role })
      .eq('id', userId);

    if (profileError) throw profileError;

    // Add role to user_roles table
    const { error: roleError } = await supabase.from('user_roles').insert({
      user_id: userId,
      role: data.role,
    });

    if (roleError) throw roleError;

    // Create role-specific profile
    if (data.role === 'patient') {
      const { error } = await supabase.from('patients').insert({
        user_id: userId,
        profile_completed: false,
      });
      if (error) throw error;
    } else if (data.role === 'provider') {
      const { error } = await supabase.from('providers').insert({
        user_id: userId,
        accepting_new_patients: false,
      });
      if (error) throw error;
    } else if (data.role === 'pharmacy') {
      const { error } = await supabase.from('pharmacies').insert({
        user_id: userId,
        is_active: false,
      });
      if (error) throw error;
    }

    // Update profile completion percentage
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      const { data: completion } = await supabase.rpc('calculate_profile_completion', {
        user_profile_id: userId,
      });

      await supabase
        .from('user_profiles')
        .update({
          profile_completion_percentage: completion || 0,
        })
        .eq('id', userId);
    }
  },

  // Phone login
  async loginWithPhone(phone: string): Promise<void> {
    // Send OTP
    await otpService.sendPhoneOTP(phone, 'login');
  },

  // Verify phone login OTP
  async verifyPhoneLogin(phone: string, code: string): Promise<void> {
    const verified = await otpService.verifyPhoneOTP(phone, code);

    if (!verified) {
      throw new Error('Invalid verification code');
    }

    // Get user by phone
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('phone', phone)
      .eq('phone_verified', true)
      .maybeSingle();

    if (error || !profile) {
      throw new Error('Phone number not registered');
    }

    // Sign in using Supabase auth (we need the email for this)
    // In production, you'd want to use a custom token or magic link
    // For now, we'll need to handle this differently
    throw new Error('Phone login requires additional setup. Please use email login for now.');
  },

  // Resend OTP
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
        await supabase
          .from('pharmacies')
          .update({ pharmacy_name: options.businessName })
          .eq('user_id', userId);
      } else if (role === 'clinic') {
        await supabase
          .from('clinics')
          .update({ name: options.businessName })
          .eq('owner_id', userId);
      }
    }

    if (role === 'provider' && options.specialtyId) {
      const { data: provider } = await supabase
        .from('providers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (provider) {
        await supabase.from('provider_specialties').insert({
          provider_id: provider.id,
          specialty_id: options.specialtyId,
          specialty_name: options.specialtyName,
          is_primary: true,
        });
      }
    }
  },
};
