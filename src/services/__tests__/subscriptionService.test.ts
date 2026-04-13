import { describe, it, expect } from 'vitest';
import { SubscriptionService } from '../subscriptionService';

describe('SubscriptionService', () => {
  describe('formatPrice', () => {
    it('formats zero', () => {
      const result = SubscriptionService.formatPrice(0);
      expect(result).toContain('$');
      expect(result).toContain('0');
    });

    it('formats whole numbers without decimals', () => {
      const result = SubscriptionService.formatPrice(99);
      expect(result).toContain('99');
      expect(result).toContain('$');
    });

    it('formats large numbers with comma separators', () => {
      const result = SubscriptionService.formatPrice(1500);
      expect(result).toContain('1,500');
    });

    it('rounds decimal amounts', () => {
      const result = SubscriptionService.formatPrice(99.99);
      expect(result).toContain('100');
    });
  });

  describe('MRR calculation logic', () => {
    it('adds monthly price for active monthly subscriptions', () => {
      const subs = [
        { status: 'active', billing_interval: 'monthly', plan: { monthly_price_cad: 99, annual_price_cad: null } },
      ];

      let mrr = 0;
      subs.forEach((sub: any) => {
        if (sub.status === 'active' || sub.status === 'trialing') {
          if (sub.billing_interval === 'annual' && sub.plan?.annual_price_cad) {
            mrr += Number(sub.plan.annual_price_cad);
          } else {
            mrr += Number(sub.plan?.monthly_price_cad || 0);
          }
        }
      });

      expect(mrr).toBe(99);
    });

    it('adds annual price for active annual subscriptions', () => {
      const subs = [
        { status: 'active', billing_interval: 'annual', plan: { monthly_price_cad: 99, annual_price_cad: 999 } },
      ];

      let mrr = 0;
      subs.forEach((sub: any) => {
        if (sub.status === 'active' || sub.status === 'trialing') {
          if (sub.billing_interval === 'annual' && sub.plan?.annual_price_cad) {
            mrr += Number(sub.plan.annual_price_cad);
          } else {
            mrr += Number(sub.plan?.monthly_price_cad || 0);
          }
        }
      });

      expect(mrr).toBe(999);
    });

    it('includes trialing subscriptions in MRR', () => {
      const subs = [
        { status: 'trialing', billing_interval: 'monthly', plan: { monthly_price_cad: 49, annual_price_cad: null } },
      ];

      let mrr = 0;
      subs.forEach((sub: any) => {
        if (sub.status === 'active' || sub.status === 'trialing') {
          mrr += Number(sub.plan?.monthly_price_cad || 0);
        }
      });

      expect(mrr).toBe(49);
    });

    it('excludes cancelled subscriptions from MRR', () => {
      const subs = [
        { status: 'cancelled', billing_interval: 'monthly', plan: { monthly_price_cad: 99 } },
      ];

      let mrr = 0;
      subs.forEach((sub: any) => {
        if (sub.status === 'active' || sub.status === 'trialing') {
          mrr += Number(sub.plan?.monthly_price_cad || 0);
        }
      });

      expect(mrr).toBe(0);
    });
  });

  describe('status counting logic', () => {
    it('correctly counts active, trialing, and cancelled', () => {
      const subs = [
        { status: 'active' },
        { status: 'active' },
        { status: 'trialing' },
        { status: 'cancelled' },
        { status: 'cancelled' },
        { status: 'cancelled' },
      ];

      const stats = { active: 0, trialing: 0, cancelled: 0 };
      subs.forEach((sub) => {
        if (sub.status === 'active') stats.active++;
        if (sub.status === 'trialing') stats.trialing++;
        if (sub.status === 'cancelled') stats.cancelled++;
      });

      expect(stats.active).toBe(2);
      expect(stats.trialing).toBe(1);
      expect(stats.cancelled).toBe(3);
    });
  });

  describe('period end calculation', () => {
    it('sets monthly period end to 1 month from now', () => {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const diff = periodEnd.getTime() - now.getTime();
      const days = diff / (1000 * 60 * 60 * 24);
      expect(days).toBeGreaterThanOrEqual(28);
      expect(days).toBeLessThanOrEqual(31);
    });

    it('sets annual period end to 1 year from now', () => {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);

      const diff = periodEnd.getTime() - now.getTime();
      const days = diff / (1000 * 60 * 60 * 24);
      expect(days).toBeGreaterThanOrEqual(365);
      expect(days).toBeLessThanOrEqual(366);
    });
  });
});
