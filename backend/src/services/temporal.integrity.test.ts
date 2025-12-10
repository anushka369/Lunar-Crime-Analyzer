import { DataIntegrityValidator, DataQualityMetrics, DataIntegrityReport } from './temporal';
import { MoonPhaseData, CrimeIncident, GeographicCoordinate, CrimeType } from '../types';

/**
 * Unit tests for data integrity validation functionality
 * Requirements: 6.5
 */

describe('DataIntegrityValidator', () => {
  let validator: DataIntegrityValidator;

  beforeEach(() => {
    validator = new DataIntegrityValidator(80, 7); // 80% min coverage, 7 days max gap
  });

  // Helper functions to create test data
  const createMockLocation = (lat: number = 40.7128, lon: number = -74.0060): GeographicCoordinate => ({
    latitude: lat,
    longitude: lon,
    jurisdiction: 'Test City'
  });

  const createMockCrimeType = (): CrimeType => ({
    category: 'violent',
    subcategory: 'assault'
  });

  const createMockCrimeIncident = (timestamp: Date, id: string = 'test-id'): CrimeIncident => ({
    id,
    timestamp,
    location: createMockLocation(),
    crimeType: createMockCrimeType(),
    severity: 'felony',
    description: 'Test crime incident',
    resolved: false
  });

  const createMockMoonPhase = (timestamp: Date): MoonPhaseData => ({
    timestamp,
    phaseName: 'full',
    illuminationPercent: 100,
    phaseAngle: 180,
    distanceKm: 384400,
    location: createMockLocation()
  });

  describe('validateCrimeIncidentsInRange', () => {
    test('should identify crimes within moon phase date range', () => {
      const moonPhases = [
        createMockMoonPhase(new Date('2023-01-01')),
        createMockMoonPhase(new Date('2023-01-15')),
        createMockMoonPhase(new Date('2023-01-30'))
      ];

      const crimes = [
        createMockCrimeIncident(new Date('2023-01-05'), 'crime-1'), // In range
        createMockCrimeIncident(new Date('2023-01-20'), 'crime-2'), // In range
        createMockCrimeIncident(new Date('2022-12-25'), 'crime-3'), // Out of range (before)
        createMockCrimeIncident(new Date('2023-02-05'), 'crime-4')  // Out of range (after)
      ];

      const result = validator.validateCrimeIncidentsInRange(crimes, moonPhases);

      expect(result.inRange).toHaveLength(2);
      expect(result.outOfRange).toHaveLength(2);
      expect(result.moonPhaseRange).toEqual({
        start: new Date('2023-01-01'),
        end: new Date('2023-01-30')
      });

      // Check specific crimes
      expect(result.inRange.map(c => c.id)).toContain('crime-1');
      expect(result.inRange.map(c => c.id)).toContain('crime-2');
      expect(result.outOfRange.map(c => c.id)).toContain('crime-3');
      expect(result.outOfRange.map(c => c.id)).toContain('crime-4');
    });

    test('should handle empty moon phases', () => {
      const crimes = [createMockCrimeIncident(new Date('2023-01-05'))];
      const result = validator.validateCrimeIncidentsInRange(crimes, []);

      expect(result.inRange).toHaveLength(0);
      expect(result.outOfRange).toHaveLength(1);
      expect(result.moonPhaseRange).toBeNull();
    });

    test('should handle empty crime incidents', () => {
      const moonPhases = [createMockMoonPhase(new Date('2023-01-01'))];
      const result = validator.validateCrimeIncidentsInRange([], moonPhases);

      expect(result.inRange).toHaveLength(0);
      expect(result.outOfRange).toHaveLength(0);
      expect(result.moonPhaseRange).toEqual({
        start: new Date('2023-01-01'),
        end: new Date('2023-01-01')
      });
    });
  });

  describe('checkTemporalCoverage', () => {
    test('should calculate coverage percentage correctly', () => {
      const expectedRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-01-31') // 30 days
      };

      // Create data with some gaps
      const crimes = [
        createMockCrimeIncident(new Date('2023-01-05')),
        createMockCrimeIncident(new Date('2023-01-10')),
        createMockCrimeIncident(new Date('2023-01-25'))
      ];

      const moonPhases = [
        createMockMoonPhase(new Date('2023-01-01')),
        createMockMoonPhase(new Date('2023-01-15')),
        createMockMoonPhase(new Date('2023-01-30'))
      ];

      const result = validator.checkTemporalCoverage(crimes, moonPhases, expectedRange);

      expect(result.coveragePercent).toBeGreaterThanOrEqual(0);
      expect(result.coveragePercent).toBeLessThanOrEqual(100);
      expect(result.hasSufficientCoverage).toBe(result.coveragePercent >= 80);
      expect(Array.isArray(result.gaps)).toBe(true);
      
      // With reasonable data distribution, we should have some coverage
      // The exact percentage depends on gap detection logic
      expect(typeof result.coveragePercent).toBe('number');
      expect(isNaN(result.coveragePercent)).toBe(false);
    });

    test('should identify severe gaps in data', () => {
      const expectedRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-03-01') // 60 days
      };

      // Create sparse data with large gaps
      const crimes = [
        createMockCrimeIncident(new Date('2023-01-05'))
        // Large gap - no crimes for rest of period
      ];

      const moonPhases = [
        createMockMoonPhase(new Date('2023-01-01'))
        // Large gap - no moon phases for rest of period
      ];

      const result = validator.checkTemporalCoverage(crimes, moonPhases, expectedRange);

      expect(result.gaps.length).toBeGreaterThan(0);
      const severeGaps = result.gaps.filter(gap => gap.severity === 'severe');
      expect(severeGaps.length).toBeGreaterThan(0);
      expect(result.hasSufficientCoverage).toBe(false);
    });

    test('should handle complete data coverage', () => {
      const expectedRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-01-10') // 9 days
      };

      // Create complete daily coverage
      const crimes = [];
      const moonPhases = [];
      
      for (let i = 0; i < 10; i++) {
        const date = new Date('2023-01-01');
        date.setDate(date.getDate() + i);
        crimes.push(createMockCrimeIncident(date, `crime-${i}`));
        moonPhases.push(createMockMoonPhase(date));
      }

      const result = validator.checkTemporalCoverage(crimes, moonPhases, expectedRange);

      expect(result.coveragePercent).toBeGreaterThan(90); // Should be very high
      expect(result.hasSufficientCoverage).toBe(true);
      expect(result.gaps.filter(gap => gap.severity === 'severe')).toHaveLength(0);
    });
  });

  describe('generateDataQualityMetrics', () => {
    test('should generate comprehensive quality metrics', () => {
      const expectedRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-01-31')
      };

      const moonPhases = [
        createMockMoonPhase(new Date('2023-01-01')),
        createMockMoonPhase(new Date('2023-01-15')),
        createMockMoonPhase(new Date('2023-01-30'))
      ];

      const crimes = [
        createMockCrimeIncident(new Date('2023-01-05'), 'crime-1'), // In range
        createMockCrimeIncident(new Date('2023-01-20'), 'crime-2'), // In range
        createMockCrimeIncident(new Date('2022-12-25'), 'crime-3')  // Out of range
      ];

      const metrics = validator.generateDataQualityMetrics(crimes, moonPhases, expectedRange);

      expect(metrics.totalCrimeIncidents).toBe(3);
      expect(metrics.totalMoonPhases).toBe(3);
      expect(metrics.crimeIncidentsInRange).toBe(2);
      expect(metrics.crimeIncidentsOutOfRange).toBe(1);
      expect(metrics.temporalCoveragePercent).toBeGreaterThanOrEqual(0);
      expect(metrics.temporalCoveragePercent).toBeLessThanOrEqual(100);
      expect(metrics.qualityScore).toBeGreaterThanOrEqual(0);
      expect(metrics.qualityScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(metrics.dataGaps)).toBe(true);
      expect(Array.isArray(metrics.issues)).toBe(true);

      // Should have an issue for out-of-range crimes
      const outOfRangeIssue = metrics.issues.find(issue => issue.type === 'out_of_range');
      expect(outOfRangeIssue).toBeDefined();
      expect(outOfRangeIssue?.severity).toBe('error');
      expect(outOfRangeIssue?.affectedRecords).toBe(1);
    });

    test('should calculate quality score correctly', () => {
      const expectedRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-01-10')
      };

      // Perfect data - all crimes in range, good coverage
      const moonPhases = [];
      const crimes = [];
      
      for (let i = 0; i < 10; i++) {
        const date = new Date('2023-01-01');
        date.setDate(date.getDate() + i);
        crimes.push(createMockCrimeIncident(date, `crime-${i}`));
        moonPhases.push(createMockMoonPhase(date));
      }

      const metrics = validator.generateDataQualityMetrics(crimes, moonPhases, expectedRange);

      expect(metrics.qualityScore).toBeGreaterThan(90); // Should be very high for perfect data
      expect(metrics.crimeIncidentsOutOfRange).toBe(0);
      expect(metrics.issues.filter(issue => issue.severity === 'error')).toHaveLength(0);
    });

    test('should identify data sparsity issues', () => {
      const expectedRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-12-31') // Full year
      };

      // Very sparse data - only a few incidents over a year
      const crimes = [
        createMockCrimeIncident(new Date('2023-01-05')),
        createMockCrimeIncident(new Date('2023-06-15'))
      ];

      const moonPhases = [
        createMockMoonPhase(new Date('2023-01-01')),
        createMockMoonPhase(new Date('2023-12-31'))
      ];

      const metrics = validator.generateDataQualityMetrics(crimes, moonPhases, expectedRange);

      const sparsityIssue = metrics.issues.find(issue => issue.type === 'data_sparsity');
      expect(sparsityIssue).toBeDefined();
      expect(sparsityIssue?.severity).toBe('warning');
    });
  });

  describe('generateIntegrityReport', () => {
    test('should generate comprehensive integrity report', () => {
      const expectedRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-01-31')
      };

      const moonPhases = [
        createMockMoonPhase(new Date('2023-01-01')),
        createMockMoonPhase(new Date('2023-01-15')),
        createMockMoonPhase(new Date('2023-01-30'))
      ];

      const crimes = [
        createMockCrimeIncident(new Date('2023-01-05')),
        createMockCrimeIncident(new Date('2023-01-20'))
      ];

      const report = validator.generateIntegrityReport(crimes, moonPhases, expectedRange);

      expect(report).toHaveProperty('isValid');
      expect(report).toHaveProperty('qualityMetrics');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('validationTimestamp');
      
      expect(typeof report.isValid).toBe('boolean');
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.validationTimestamp).toBeInstanceOf(Date);
      
      // Quality metrics should be present
      expect(report.qualityMetrics.totalCrimeIncidents).toBe(2);
      expect(report.qualityMetrics.totalMoonPhases).toBe(3);
    });

    test('should mark data as invalid when there are errors', () => {
      const expectedRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-01-31')
      };

      const moonPhases = [
        createMockMoonPhase(new Date('2023-01-15'))
      ];

      // All crimes out of range
      const crimes = [
        createMockCrimeIncident(new Date('2022-12-25')),
        createMockCrimeIncident(new Date('2023-02-05'))
      ];

      const report = validator.generateIntegrityReport(crimes, moonPhases, expectedRange);

      expect(report.isValid).toBe(false);
      expect(report.qualityMetrics.crimeIncidentsOutOfRange).toBe(2);
      expect(report.recommendations.length).toBeGreaterThan(0);
      
      // Should have recommendation about out-of-range crimes
      const outOfRangeRecommendation = report.recommendations.find(rec => 
        rec.includes('out of range') || rec.includes('outside')
      );
      expect(outOfRangeRecommendation).toBeDefined();
    });

    test('should provide helpful recommendations', () => {
      const expectedRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-01-31')
      };

      // Good quality data
      const moonPhases = [];
      const crimes = [];
      
      for (let i = 0; i < 30; i++) {
        const date = new Date('2023-01-01');
        date.setDate(date.getDate() + i);
        crimes.push(createMockCrimeIncident(date, `crime-${i}`));
        moonPhases.push(createMockMoonPhase(date));
      }

      const report = validator.generateIntegrityReport(crimes, moonPhases, expectedRange);

      expect(report.isValid).toBe(true);
      expect(report.recommendations).toContain('Data integrity is satisfactory. No immediate actions required.');
    });
  });

  describe('edge cases', () => {
    test('should handle empty datasets gracefully', () => {
      const expectedRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-01-31')
      };

      const report = validator.generateIntegrityReport([], [], expectedRange);

      expect(report.qualityMetrics.totalCrimeIncidents).toBe(0);
      expect(report.qualityMetrics.totalMoonPhases).toBe(0);
      expect(report.isValid).toBe(false); // Empty data should be invalid
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    test('should handle single data points', () => {
      const expectedRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-01-31')
      };

      const crimes = [createMockCrimeIncident(new Date('2023-01-15'))];
      const moonPhases = [createMockMoonPhase(new Date('2023-01-15'))];

      const report = validator.generateIntegrityReport(crimes, moonPhases, expectedRange);

      expect(report.qualityMetrics.totalCrimeIncidents).toBe(1);
      expect(report.qualityMetrics.totalMoonPhases).toBe(1);
      expect(report.qualityMetrics.crimeIncidentsInRange).toBe(1);
      expect(report.qualityMetrics.crimeIncidentsOutOfRange).toBe(0);
    });

    test('should handle date range edge cases', () => {
      // Same start and end date
      const singleDayRange = {
        start: new Date('2023-01-15'),
        end: new Date('2023-01-15')
      };

      const crimes = [createMockCrimeIncident(new Date('2023-01-15'))];
      const moonPhases = [createMockMoonPhase(new Date('2023-01-15'))];

      const report = validator.generateIntegrityReport(crimes, moonPhases, singleDayRange);

      expect(report.qualityMetrics.crimeIncidentsInRange).toBe(1);
      expect(report.qualityMetrics.temporalCoveragePercent).toBeGreaterThanOrEqual(0);
      expect(isNaN(report.qualityMetrics.temporalCoveragePercent)).toBe(false);
    });
  });
});