import { describe, it, expect } from 'vitest';
import { fhirService } from '../fhirService';

describe('fhirService', () => {
  describe('determineLabStatus', () => {
    it('returns normal when value is within range', () => {
      expect(fhirService.determineLabStatus(5, { low: 3, high: 7 })).toBe('normal');
    });

    it('returns normal at exact low boundary', () => {
      expect(fhirService.determineLabStatus(3, { low: 3, high: 7 })).toBe('normal');
    });

    it('returns normal at exact high boundary', () => {
      expect(fhirService.determineLabStatus(7, { low: 3, high: 7 })).toBe('normal');
    });

    it('returns abnormal when slightly below low', () => {
      expect(fhirService.determineLabStatus(2.9, { low: 3, high: 7 })).toBe('abnormal');
    });

    it('returns abnormal when slightly above high', () => {
      expect(fhirService.determineLabStatus(7.1, { low: 3, high: 7 })).toBe('abnormal');
    });

    it('returns critical when far below range (below 70% of low)', () => {
      expect(fhirService.determineLabStatus(2, { low: 3, high: 7 })).toBe('critical');
    });

    it('returns critical when far above range (above 130% of high)', () => {
      expect(fhirService.determineLabStatus(10, { low: 3, high: 7 })).toBe('critical');
    });

    it('returns normal when referenceRange is null', () => {
      expect(fhirService.determineLabStatus(5, null)).toBe('normal');
    });

    it('returns normal when value is null', () => {
      expect(fhirService.determineLabStatus(null as any, { low: 3, high: 7 })).toBe('normal');
    });

    it('returns normal when low/high are null', () => {
      expect(fhirService.determineLabStatus(5, { low: null, high: null })).toBe('normal');
    });

    it('handles boundary between abnormal and critical for low values', () => {
      expect(fhirService.determineLabStatus(2.0, { low: 3, high: 7 })).toBe('critical');
      expect(fhirService.determineLabStatus(2.1, { low: 3, high: 7 })).toBe('abnormal');
    });

    it('handles boundary between abnormal and critical for high values', () => {
      expect(fhirService.determineLabStatus(9.2, { low: 3, high: 7 })).toBe('critical');
      expect(fhirService.determineLabStatus(9.1, { low: 3, high: 7 })).toBe('abnormal');
    });
  });

  describe('mapVitalType', () => {
    it('maps blood pressure text', () => {
      expect(fhirService.mapVitalType('Blood Pressure')).toBe('blood_pressure');
    });

    it('maps BP abbreviation', () => {
      expect(fhirService.mapVitalType('BP Systolic')).toBe('blood_pressure');
    });

    it('maps heart rate', () => {
      expect(fhirService.mapVitalType('Heart Rate')).toBe('heart_rate');
    });

    it('maps pulse to heart rate', () => {
      expect(fhirService.mapVitalType('Pulse')).toBe('heart_rate');
    });

    it('maps temperature', () => {
      expect(fhirService.mapVitalType('Body Temperature')).toBe('temperature');
    });

    it('maps temp abbreviation', () => {
      expect(fhirService.mapVitalType('Temp')).toBe('temperature');
    });

    it('maps weight', () => {
      expect(fhirService.mapVitalType('Body Weight')).toBe('weight');
    });

    it('maps height', () => {
      expect(fhirService.mapVitalType('Body Height')).toBe('height');
    });

    it('maps BMI', () => {
      expect(fhirService.mapVitalType('BMI')).toBe('bmi');
    });

    it('maps body mass index', () => {
      expect(fhirService.mapVitalType('Body Mass Index')).toBe('bmi');
    });

    it('maps glucose', () => {
      expect(fhirService.mapVitalType('Blood Glucose')).toBe('glucose');
    });

    it('maps blood sugar to glucose', () => {
      expect(fhirService.mapVitalType('Blood Sugar Level')).toBe('glucose');
    });

    it('maps oxygen saturation', () => {
      expect(fhirService.mapVitalType('Oxygen Saturation')).toBe('oxygen_saturation');
    });

    it('maps SpO2', () => {
      expect(fhirService.mapVitalType('SpO2')).toBe('oxygen_saturation');
    });

    it('defaults to blood_pressure for unknown types', () => {
      expect(fhirService.mapVitalType('Unknown Reading')).toBe('blood_pressure');
    });

    it('handles null/undefined input', () => {
      expect(fhirService.mapVitalType(null as any)).toBe('blood_pressure');
      expect(fhirService.mapVitalType(undefined as any)).toBe('blood_pressure');
    });

    it('is case insensitive', () => {
      expect(fhirService.mapVitalType('HEART RATE')).toBe('heart_rate');
      expect(fhirService.mapVitalType('heart rate')).toBe('heart_rate');
    });
  });

  describe('calculateTrends', () => {
    it('returns empty array for empty input', () => {
      expect(fhirService.calculateTrends([])).toEqual([]);
    });

    it('returns single item without trend', () => {
      const results = [{ value: 5, date: '2025-01-01' }];
      const trended = fhirService.calculateTrends(results);
      expect(trended).toHaveLength(1);
      expect(trended[0].trend).toBeUndefined();
    });

    it('marks upward trend when value increases by more than 5%', () => {
      const results = [
        { value: 110, date: '2025-01-02' },
        { value: 100, date: '2025-01-01' },
      ];
      const trended = fhirService.calculateTrends(results);
      expect(trended[0].trend).toBe('up');
    });

    it('marks downward trend when value decreases by more than 5%', () => {
      const results = [
        { value: 90, date: '2025-01-02' },
        { value: 100, date: '2025-01-01' },
      ];
      const trended = fhirService.calculateTrends(results);
      expect(trended[0].trend).toBe('down');
    });

    it('marks stable when change is within 5%', () => {
      const results = [
        { value: 102, date: '2025-01-02' },
        { value: 100, date: '2025-01-01' },
      ];
      const trended = fhirService.calculateTrends(results);
      expect(trended[0].trend).toBe('stable');
    });

    it('does not assign trend to the last item', () => {
      const results = [
        { value: 120, date: '2025-01-02' },
        { value: 100, date: '2025-01-01' },
      ];
      const trended = fhirService.calculateTrends(results);
      expect(trended[1].trend).toBeUndefined();
    });
  });

  describe('calculateVitalTrends', () => {
    it('groups vitals by type before calculating trends', () => {
      const vitals = [
        { id: '1', type: 'heart_rate' as const, value: '85', unit: '/min', date: '2025-01-03' },
        { id: '2', type: 'weight' as const, value: '75', unit: 'kg', date: '2025-01-03' },
        { id: '3', type: 'heart_rate' as const, value: '80', unit: '/min', date: '2025-01-02' },
        { id: '4', type: 'weight' as const, value: '76', unit: 'kg', date: '2025-01-02' },
      ];

      const result = fhirService.calculateVitalTrends(vitals);

      const hr1 = result.find(v => v.id === '1');
      expect(hr1?.trend).toBeDefined();
    });

    it('handles blood pressure composite values (systolic/diastolic)', () => {
      const vitals = [
        { id: '1', type: 'blood_pressure' as const, value: '130/85', unit: 'mmHg', date: '2025-01-02' },
        { id: '2', type: 'blood_pressure' as const, value: '120/80', unit: 'mmHg', date: '2025-01-01' },
      ];

      const result = fhirService.calculateVitalTrends(vitals);
      expect(result[0].trend).toBeDefined();
    });

    it('does not assign trend to single vital per type', () => {
      const vitals = [
        { id: '1', type: 'heart_rate' as const, value: '80', unit: '/min', date: '2025-01-01' },
      ];

      const result = fhirService.calculateVitalTrends(vitals);
      expect(result[0].trend).toBeUndefined();
    });
  });
});
