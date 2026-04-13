import { api } from '../lib/api-client';

export interface OTPCode {
  id: string;
  code: string;
  expires_at: string;
  verified: boolean;
  attempts: number;
}

export const otpService = {
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  async sendEmailOTP(
    email: string,
    purpose: 'registration' | 'password_reset' | 'verification',
    userId?: string
  ): Promise<void> {
    const code = this.generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const { error } = await api.post('/email-verification-codes', {
      email,
      code,
      user_id: userId,
      purpose,
      expires_at: expiresAt.toISOString(),
    });

    if (error) throw new Error(error.message);

    await new Promise((resolve) => setTimeout(resolve, 500));
  },

  async sendPhoneOTP(
    phone: string,
    purpose: 'registration' | 'login' | 'verification' | 'mfa',
    userId?: string
  ): Promise<void> {
    const canadianPhoneRegex = /^(\+1|1)?[\s-]?\(?[2-9]\d{2}\)?[\s-]?\d{3}[\s-]?\d{4}$/;
    if (!canadianPhoneRegex.test(phone)) {
      throw new Error('Please enter a valid Canadian phone number');
    }

    const code = this.generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const { error } = await api.post('/phone-verification-codes', {
      phone,
      code,
      user_id: userId,
      purpose,
      expires_at: expiresAt.toISOString(),
    });

    if (error) throw new Error(error.message);

    await new Promise((resolve) => setTimeout(resolve, 500));
  },

  async verifyEmailOTP(email: string, code: string): Promise<boolean> {
    const { data, error } = await api.get<OTPCode>('/email-verification-codes', {
      params: {
        email,
        code,
        verified: 'false',
        expires_at_gt: new Date().toISOString(),
        order: 'created_at.desc',
        limit: '1',
      },
    });

    if (error) throw new Error(error.message);
    if (!data) return false;

    const newAttempts = data.attempts + 1;

    if (newAttempts > 5) {
      throw new Error('Too many attempts. Please request a new code.');
    }

    const { error: updateError } = await api.put(`/email-verification-codes/${data.id}`, {
      verified: true,
      verified_at: new Date().toISOString(),
      attempts: newAttempts,
    });

    if (updateError) throw new Error(updateError.message);

    return true;
  },

  async verifyPhoneOTP(phone: string, code: string): Promise<boolean> {
    const { data, error } = await api.get<OTPCode>('/phone-verification-codes', {
      params: {
        phone,
        code,
        verified: 'false',
        expires_at_gt: new Date().toISOString(),
        order: 'created_at.desc',
        limit: '1',
      },
    });

    if (error) throw new Error(error.message);
    if (!data) return false;

    const newAttempts = data.attempts + 1;

    if (newAttempts > 5) {
      throw new Error('Too many attempts. Please request a new code.');
    }

    const { error: updateError } = await api.put(`/phone-verification-codes/${data.id}`, {
      verified: true,
      verified_at: new Date().toISOString(),
      attempts: newAttempts,
    });

    if (updateError) throw new Error(updateError.message);

    return true;
  },

  async hasVerifiedOTP(
    identifier: string,
    type: 'email' | 'phone',
    purpose: string,
    withinMinutes: number = 30
  ): Promise<boolean> {
    const sinceTime = new Date();
    sinceTime.setMinutes(sinceTime.getMinutes() - withinMinutes);

    const endpoint = type === 'email' ? '/email-verification-codes' : '/phone-verification-codes';
    const field = type === 'email' ? 'email' : 'phone';

    const { data, error } = await api.get<{ id: string }>(endpoint, {
      params: {
        [field]: identifier,
        purpose,
        verified: 'true',
        verified_at_gte: sinceTime.toISOString(),
        limit: '1',
      },
    });

    if (error) throw new Error(error.message);
    return !!data;
  },

  async cleanupExpiredCodes(): Promise<void> {
    const now = new Date().toISOString();

    await Promise.all([
      api.delete('/email-verification-codes', {
        params: { expires_at_lt: now },
      }),
      api.delete('/phone-verification-codes', {
        params: { expires_at_lt: now },
      }),
    ]);
  },
};
