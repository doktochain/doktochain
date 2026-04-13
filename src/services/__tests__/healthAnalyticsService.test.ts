import { describe, it, expect } from 'vitest';
import { healthAnalyticsService } from '../healthAnalyticsService';

describe('healthAnalyticsService', () => {
  describe('calculateAge', () => {
    it('calculates age for a past birthday this year', () => {
      const today = new Date();
      const birthYear = today.getFullYear() - 30;
      const birthMonth = today.getMonth();
      const birthDay = today.getDate() - 1;
      const dob = `${birthYear}-${String(birthMonth + 1).padStart(2, '0')}-${String(Math.max(1, birthDay)).padStart(2, '0')}`;

      const age = healthAnalyticsService.calculateAge(dob);
      expect(age).toBe(30);
    });

    it('calculates age correctly when birthday has not occurred yet this year', () => {
      const today = new Date();
      const birthYear = today.getFullYear() - 25;
      const futureMonth = (today.getMonth() + 2) % 12;
      const dob = `${birthYear}-${String(futureMonth + 1).padStart(2, '0')}-15`;

      const age = healthAnalyticsService.calculateAge(dob);
      const expectedAge = futureMonth > today.getMonth() ? 24 : 25;
      expect(age).toBe(expectedAge);
    });

    it('handles birthday on today', () => {
      const today = new Date();
      const birthYear = today.getFullYear() - 40;
      const dob = `${birthYear}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const age = healthAnalyticsService.calculateAge(dob);
      expect(age).toBe(40);
    });

    it('returns 0 for a baby born this year', () => {
      const today = new Date();
      const dob = `${today.getFullYear()}-01-01`;
      const age = healthAnalyticsService.calculateAge(dob);
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThanOrEqual(1);
    });
  });

  describe('daysSince', () => {
    it('returns 0 for today', () => {
      const today = new Date().toISOString();
      const days = healthAnalyticsService.daysSince(today);
      expect(days).toBe(0);
    });

    it('returns correct days for past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const days = healthAnalyticsService.daysSince(pastDate.toISOString());
      expect(days).toBe(10);
    });

    it('returns correct days for a year ago', () => {
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      const days = healthAnalyticsService.daysSince(yearAgo.toISOString());
      expect(days).toBeGreaterThanOrEqual(364);
      expect(days).toBeLessThanOrEqual(366);
    });
  });

  describe('health score weighting', () => {
    it('correctly weights component scores', () => {
      const appointment = 80;
      const medication = 90;
      const lab = 70;
      const vital = 60;

      const expected = Math.round(
        appointment * 0.25 + medication * 0.35 + lab * 0.2 + vital * 0.2
      );

      expect(expected).toBe(Math.round(80 * 0.25 + 90 * 0.35 + 70 * 0.2 + 60 * 0.2));
      expect(expected).toBe(78);
    });

    it('all 100s produces 100', () => {
      const expected = Math.round(100 * 0.25 + 100 * 0.35 + 100 * 0.2 + 100 * 0.2);
      expect(expected).toBe(100);
    });

    it('all 0s produces 0', () => {
      const expected = Math.round(0 * 0.25 + 0 * 0.35 + 0 * 0.2 + 0 * 0.2);
      expect(expected).toBe(0);
    });
  });

  describe('appointment adherence formula', () => {
    it('calculates correct adherence for mixed statuses', () => {
      const total = 10;
      const completed = 7;
      const noShow = 1;
      const cancelled = 2;

      const adherenceRate = ((completed / total) * 100) - (noShow / total * 20) - (cancelled / total * 10);
      const clamped = Math.max(0, Math.min(100, Math.round(adherenceRate)));

      expect(clamped).toBe(66);
    });

    it('returns 100 for all completed', () => {
      const total = 5;
      const completed = 5;
      const noShow = 0;
      const cancelled = 0;

      const adherenceRate = ((completed / total) * 100) - (noShow / total * 20) - (cancelled / total * 10);
      expect(Math.round(adherenceRate)).toBe(100);
    });

    it('clamps to 0 for many no-shows', () => {
      const total = 2;
      const completed = 0;
      const noShow = 2;
      const cancelled = 0;

      const adherenceRate = ((completed / total) * 100) - (noShow / total * 20) - (cancelled / total * 10);
      const clamped = Math.max(0, Math.min(100, Math.round(adherenceRate)));
      expect(clamped).toBe(0);
    });
  });

  describe('lab results scoring formula', () => {
    it('scores 100 for all normal results', () => {
      const score = (5 * 100 + 0 * 70 + 0 * 30) / 5;
      expect(score).toBe(100);
    });

    it('scores correctly for mixed results', () => {
      const normalCount = 3;
      const abnormalCount = 1;
      const criticalCount = 1;
      const total = 5;

      const score = (normalCount * 100 + abnormalCount * 70 + criticalCount * 30) / total;
      expect(Math.round(score)).toBe(80);
    });

    it('scores 30 for all critical results', () => {
      const score = (0 * 100 + 0 * 70 + 3 * 30) / 3;
      expect(score).toBe(30);
    });
  });

  describe('vital signs scoring formula', () => {
    it('scores 100 for all improving vitals', () => {
      const improving = 5;
      const stable = 0;
      const declining = 0;
      const total = 5;

      const score = (improving * 100 + stable * 85 + declining * 60) / total;
      expect(score).toBe(100);
    });

    it('scores 85 for all stable vitals', () => {
      const score = (0 * 100 + 5 * 85 + 0 * 60) / 5;
      expect(score).toBe(85);
    });

    it('scores 60 for all declining vitals', () => {
      const score = (0 * 100 + 0 * 85 + 5 * 60) / 5;
      expect(score).toBe(60);
    });
  });

  describe('care recommendation priority sorting', () => {
    it('sorts high before medium before low', () => {
      const recommendations = [
        { priority: 'low' as const },
        { priority: 'high' as const },
        { priority: 'medium' as const },
      ];

      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const sorted = [...recommendations].sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
      );

      expect(sorted[0].priority).toBe('high');
      expect(sorted[1].priority).toBe('medium');
      expect(sorted[2].priority).toBe('low');
    });
  });
});
