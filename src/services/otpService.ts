import { supabase } from '../lib/supabase';

export interface OTPCode {
  id: string;
  code: string;
  expires_at: string;
  verified: boolean;
  attempts: number;
}

export const otpService = {
  // Generate a random 6-digit OTP
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  // Send OTP to email
  async sendEmailOTP(
    email: string,
    purpose: 'registration' | 'password_reset' | 'verification',
    userId?: string
  ): Promise<void> {
    const code = this.generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    // Store OTP in database
    const { error } = await supabase.from('email_verification_codes').insert({
      email,
      code,
      user_id: userId,
      purpose,
      expires_at: expiresAt.toISOString(),
    });

    if (error) throw error;

    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)

    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 500));
  },

  // Send OTP to phone (SMS)
  async sendPhoneOTP(
    phone: string,
    purpose: 'registration' | 'login' | 'verification' | 'mfa',
    userId?: string
  ): Promise<void> {
    // Validate Canadian phone number
    const canadianPhoneRegex = /^(\+1|1)?[\s-]?\(?[2-9]\d{2}\)?[\s-]?\d{3}[\s-]?\d{4}$/;
    if (!canadianPhoneRegex.test(phone)) {
      throw new Error('Please enter a valid Canadian phone number');
    }

    const code = this.generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    // Store OTP in database
    const { error } = await supabase.from('phone_verification_codes').insert({
      phone,
      code,
      user_id: userId,
      purpose,
      expires_at: expiresAt.toISOString(),
    });

    if (error) throw error;

    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)

    // Simulate SMS sending delay
    await new Promise((resolve) => setTimeout(resolve, 500));
  },

  // Verify email OTP
  async verifyEmailOTP(email: string, code: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('email_verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return false;

    // Increment attempts
    const newAttempts = data.attempts + 1;

    if (newAttempts > 5) {
      throw new Error('Too many attempts. Please request a new code.');
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from('email_verification_codes')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
        attempts: newAttempts,
      })
      .eq('id', data.id);

    if (updateError) throw updateError;

    return true;
  },

  // Verify phone OTP
  async verifyPhoneOTP(phone: string, code: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('phone_verification_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return false;

    // Increment attempts
    const newAttempts = data.attempts + 1;

    if (newAttempts > 5) {
      throw new Error('Too many attempts. Please request a new code.');
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from('phone_verification_codes')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
        attempts: newAttempts,
      })
      .eq('id', data.id);

    if (updateError) throw updateError;

    return true;
  },

  // Check if email/phone has a valid verified OTP recently
  async hasVerifiedOTP(
    identifier: string,
    type: 'email' | 'phone',
    purpose: string,
    withinMinutes: number = 30
  ): Promise<boolean> {
    const sinceTime = new Date();
    sinceTime.setMinutes(sinceTime.getMinutes() - withinMinutes);

    const table = type === 'email' ? 'email_verification_codes' : 'phone_verification_codes';
    const field = type === 'email' ? 'email' : 'phone';

    const { data, error } = await supabase
      .from(table)
      .select('id')
      .eq(field, identifier)
      .eq('purpose', purpose)
      .eq('verified', true)
      .gte('verified_at', sinceTime.toISOString())
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  },

  // Clean up expired codes
  async cleanupExpiredCodes(): Promise<void> {
    const now = new Date().toISOString();

    await Promise.all([
      supabase
        .from('email_verification_codes')
        .delete()
        .lt('expires_at', now),
      supabase
        .from('phone_verification_codes')
        .delete()
        .lt('expires_at', now),
    ]);
  },
};
