import { describe, it, expect } from 'vitest';
import { otpService } from '../otpService';

describe('otpService', () => {
  describe('generateOTP', () => {
    it('generates a 6-digit string', () => {
      const otp = otpService.generateOTP();
      expect(otp).toMatch(/^\d{6}$/);
    });

    it('generates numeric values only', () => {
      for (let i = 0; i < 20; i++) {
        const otp = otpService.generateOTP();
        expect(Number(otp)).toBeGreaterThanOrEqual(100000);
        expect(Number(otp)).toBeLessThanOrEqual(999999);
      }
    });

    it('produces varying codes (not constant)', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 50; i++) {
        codes.add(otpService.generateOTP());
      }
      expect(codes.size).toBeGreaterThan(1);
    });
  });

  describe('Canadian phone number validation regex', () => {
    const canadianPhoneRegex = /^(\+1|1)?[\s-]?\(?[2-9]\d{2}\)?[\s-]?\d{3}[\s-]?\d{4}$/;

    it('accepts +1 format', () => {
      expect(canadianPhoneRegex.test('+14165551234')).toBe(true);
    });

    it('accepts 1 prefix format', () => {
      expect(canadianPhoneRegex.test('14165551234')).toBe(true);
    });

    it('accepts bare 10-digit format', () => {
      expect(canadianPhoneRegex.test('4165551234')).toBe(true);
    });

    it('accepts format with dashes', () => {
      expect(canadianPhoneRegex.test('416-555-1234')).toBe(true);
    });

    it('accepts format with spaces', () => {
      expect(canadianPhoneRegex.test('416 555 1234')).toBe(true);
    });

    it('accepts format with parentheses', () => {
      expect(canadianPhoneRegex.test('(416) 555-1234')).toBe(true);
    });

    it('accepts +1 with dashes', () => {
      expect(canadianPhoneRegex.test('+1-416-555-1234')).toBe(true);
    });

    it('rejects area codes starting with 0', () => {
      expect(canadianPhoneRegex.test('0165551234')).toBe(false);
    });

    it('rejects area codes starting with 1', () => {
      expect(canadianPhoneRegex.test('1165551234')).toBe(false);
    });

    it('rejects too-short numbers', () => {
      expect(canadianPhoneRegex.test('416555')).toBe(false);
    });

    it('rejects too-long numbers', () => {
      expect(canadianPhoneRegex.test('41655512345678')).toBe(false);
    });

    it('rejects alphabetic characters', () => {
      expect(canadianPhoneRegex.test('416-ABC-1234')).toBe(false);
    });
  });
});
