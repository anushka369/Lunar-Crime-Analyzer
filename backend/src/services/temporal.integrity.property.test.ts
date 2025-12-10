import * as fc from 'fast-check';
import { DataIntegrityValidator, DataQualityMetrics, DataIntegrityReport } from './temporal';
import { MoonPhaseData, CrimeIncident, GeographicCoordinate, CrimeType } from '../types';

/**
 * **Feature: lunar-crime-analyzer, Property 10: Data integrity validation**
 * **Validates: Requirements 6.5**
 * 
 * For any completed temporal alignment, all crime incidents should fall within the available 
 * moon phase date ranges, ensuring complete temporal coverage
 */

describe('DataIntegrityValidator Property Tests', () => {
  let validator: DataIntegrityValidator;

  beforeEach(() => {
    validator = new DataIntegrityValidator(80, 7); // 80% min coverage, 7 days max gap
  });

  // Generators for property-based testing
  const geographicCoordinateArb = fc.record({
    latitude: fc.float({ min: -90, max: 90 }),
    longitude: fc.float({ min: -180, max: 180 }),
    address: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    jurisdiction: fc.string({ minLength: 1, maxLength: 50 })
  });

  const crimeTypeArb = fc.record({
    category: fc.constantFrom('violent' as const, 'property' as const, 'drug' as const, 'public_order' as const, 'white_collar' as const),
    subcategory: fc.string({ minLength: 1, maxLength: 50 }),
    ucr_code: fc.option(fc.string({ minLength: 2, maxLength: 5 }), { nil: undefined })
  });

  const crimeIncidentArb = fc.record({
    id: fc.uuid(),
    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
    location: geographicCoordinateArb,
    crimeType: crimeTypeArb,
    severity: fc.constantFrom('misdemeanor' as const, 'felony' as const, 'violation' as const),
    description: fc.string({ minLength: 1, maxLength: 200 }),
    caseNumber: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    resolved: fc.boolean()
  });

  const moonPhaseDataArb = fc.record({
    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
    phaseName: fc.constantFrom(
      'new' as const, 'waxing_crescent' as const, 'first_quarter' as const, 'waxing_gibbous' as const,
      'full' as const, 'waning_gibbous' as const, 'last_quarter' as const, 'waning_crescent' as const
    ),
    illuminationPercent: fc.float({ min: 0, max: 100 }),
    phaseAngle: fc.float({ min: 0, max: 360 }),
    distanceKm: fc.float({ min: 350000, max: 400000 }),
    location: geographicCoordinateArb
  });

  // Generator for date ranges
  const dateRangeArb = fc.tuple(
    fc.date({ min: new Date('2020-01-01'), max: new Date('2023-12-31') }),
    fc.integer({ min: 1, max: 365 }) // Duration in days
  ).map(([startDate, durationDays]) => ({
    start: startDate,
    end: new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000)
  }));

  // Generator for datasets with controlled temporal relationships
  const controlledTemporalDataArb = fc.tuple(
    fc.date({ min: new Date('2020-01-01'), max: new Date('2023-12-31') }),
    fc.integer({ min: 30, max: 365 }) // Duration in days (minimum 30 days to allow for buffer)
  ).chain(([startDate, durationDays]) => {
    const dateRange = {
      start: startDate,
      end: new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000)
    };
    
    // Create moon phase range with buffer (5 days from each end)
    const bufferMs = 5 * 24 * 60 * 60 * 1000;
    const moonPhaseRange = {
      start: new Date(dateRange.start.getTime() + bufferMs),
      end: new Date(dateRange.end.getTime() - bufferMs)
    };

    return fc.record({
      expectedRange: fc.constant(dateRange),
      moonPhases: fc.array(
        moonPhaseDataArb.map(mp => ({
          ...mp,
          timestamp: fc.sample(fc.date({ min: moonPhaseRange.start, max: moonPhaseRange.end }), 1)[0]!
        })),
        { minLength: 1, maxLength: 20 }
      ),
      crimesInRange: fc.array(
        crimeIncidentArb.map(crime => ({
          ...crime,
          timestamp: fc.sample(fc.date({ min: moonPhaseRange.start, max: moonPhaseRange.end }), 1)[0]!
        })),
        { minLength: 0, maxLength: 15 }
      ),
      crimesOutOfRange: fc.array(
        crimeIncidentArb.map(crime => ({
          ...crime,
          timestamp: fc.sample(fc.oneof(
            fc.date({ min: dateRange.start, max: moonPhaseRange.start }),
            fc.date({ min: moonPhaseRange.end, max: dateRange.end })
          ), 1)[0]!
        })),
        { minLength: 0, maxLength: 10 }
      )
    });
  });

  test('Property 10: Data integrity validation - crime incidents classification accuracy', () => {
    fc.assert(
      fc.property(controlledTemporalDataArb, (data) => {
        const allCrimes = [...data.crimesInRange, ...data.crimesOutOfRange];
        const result = validator.validateCrimeIncidentsInRange(allCrimes, data.moonPhases);
        
        // Property: All crimes should be classified as either in-range or out-of-range
        expect(result.inRange.length + result.outOfRange.length).toBe(allCrimes.length);
        
        // Property: No crime should appear in both categories
        const inRangeIds = new Set(result.inRange.map(c => c.id));
        const outOfRangeIds = new Set(result.outOfRange.map(c => c.id));
        expect(inRangeIds.size).toBe(result.inRange.length); // No duplicates in inRange
        expect(outOfRangeIds.size).toBe(result.outOfRange.length); // No duplicates in outOfRange
        
        // Property: No overlap between in-range and out-of-range
        const intersection = [...inRangeIds].filter(id => outOfRangeIds.has(id));
        expect(intersection).toHaveLength(0);
        
        // Property: Moon phase range should be correctly calculated
        if (data.moonPhases.length > 0) {
          expect(result.moonPhaseRange).not.toBeNull();
          const moonTimes = data.moonPhases.map(mp => mp.timestamp.getTime());
          const expectedStart = new Date(Math.min(...moonTimes));
          const expectedEnd = new Date(Math.max(...moonTimes));
          expect(result.moonPhaseRange!.start.getTime()).toBe(expectedStart.getTime());
          expect(result.moonPhaseRange!.end.getTime()).toBe(expectedEnd.getTime());
        } else {
          expect(result.moonPhaseRange).toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });

  test('Property 10: Data integrity validation - temporal range validation correctness', () => {
    fc.assert(
      fc.property(controlledTemporalDataArb, (data) => {
        const allCrimes = [...data.crimesInRange, ...data.crimesOutOfRange];
        const result = validator.validateCrimeIncidentsInRange(allCrimes, data.moonPhases);
        
        if (result.moonPhaseRange) {
          const moonStart = result.moonPhaseRange.start.getTime();
          const moonEnd = result.moonPhaseRange.end.getTime();
          
          // Property: All crimes classified as in-range should actually be within the moon phase range
          result.inRange.forEach(crime => {
            const crimeTime = crime.timestamp.getTime();
            expect(crimeTime).toBeGreaterThanOrEqual(moonStart);
            expect(crimeTime).toBeLessThanOrEqual(moonEnd);
          });
          
          // Property: All crimes classified as out-of-range should actually be outside the moon phase range
          result.outOfRange.forEach(crime => {
            const crimeTime = crime.timestamp.getTime();
            expect(crimeTime < moonStart || crimeTime > moonEnd).toBe(true);
          });
        } else {
          // Property: If no moon phase range, all crimes should be out-of-range
          expect(result.inRange).toHaveLength(0);
          expect(result.outOfRange).toHaveLength(allCrimes.length);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('Property 10: Data integrity validation - temporal coverage calculation consistency', () => {
    fc.assert(
      fc.property(controlledTemporalDataArb, (data) => {
        const allCrimes = [...data.crimesInRange, ...data.crimesOutOfRange];
        const coverage = validator.checkTemporalCoverage(allCrimes, data.moonPhases, data.expectedRange);
        
        // Property: Coverage percentage should be between 0 and 100
        expect(coverage.coveragePercent).toBeGreaterThanOrEqual(0);
        expect(coverage.coveragePercent).toBeLessThanOrEqual(100);
        expect(isNaN(coverage.coveragePercent)).toBe(false);
        
        // Property: Sufficient coverage determination should be consistent with percentage
        expect(coverage.hasSufficientCoverage).toBe(coverage.coveragePercent >= 80);
        
        // Property: All gaps should have valid properties
        coverage.gaps.forEach(gap => {
          expect(gap.startDate).toBeInstanceOf(Date);
          expect(gap.endDate).toBeInstanceOf(Date);
          expect(gap.startDate.getTime()).toBeLessThan(gap.endDate.getTime());
          expect(gap.durationDays).toBeGreaterThan(0);
          expect(['crime_data', 'moon_data', 'both']).toContain(gap.type);
          expect(['minor', 'moderate', 'severe']).toContain(gap.severity);
        });
        
        // Property: Gap durations should be mathematically correct
        coverage.gaps.forEach(gap => {
          const expectedDuration = Math.max(1, Math.ceil(
            (gap.endDate.getTime() - gap.startDate.getTime()) / (24 * 60 * 60 * 1000)
          ));
          expect(gap.durationDays).toBe(expectedDuration);
        });
      }),
      { numRuns: 100 }
    );
  });

  test('Property 10: Data integrity validation - quality metrics mathematical consistency', () => {
    fc.assert(
      fc.property(controlledTemporalDataArb, (data) => {
        const allCrimes = [...data.crimesInRange, ...data.crimesOutOfRange];
        const metrics = validator.generateDataQualityMetrics(allCrimes, data.moonPhases, data.expectedRange);
        
        // Property: Basic counts should be accurate
        expect(metrics.totalCrimeIncidents).toBe(allCrimes.length);
        expect(metrics.totalMoonPhases).toBe(data.moonPhases.length);
        expect(metrics.crimeIncidentsInRange + metrics.crimeIncidentsOutOfRange).toBe(allCrimes.length);
        
        // Property: Quality score should be between 0 and 100
        expect(metrics.qualityScore).toBeGreaterThanOrEqual(0);
        expect(metrics.qualityScore).toBeLessThanOrEqual(100);
        expect(isNaN(metrics.qualityScore)).toBe(false);
        
        // Property: Temporal coverage should be valid
        expect(metrics.temporalCoveragePercent).toBeGreaterThanOrEqual(0);
        expect(metrics.temporalCoveragePercent).toBeLessThanOrEqual(100);
        expect(isNaN(metrics.temporalCoveragePercent)).toBe(false);
        
        // Property: All issues should have valid structure
        metrics.issues.forEach(issue => {
          expect(['out_of_range', 'temporal_gap', 'insufficient_coverage', 'data_sparsity']).toContain(issue.type);
          expect(['warning', 'error']).toContain(issue.severity);
          expect(typeof issue.message).toBe('string');
          expect(issue.message.length).toBeGreaterThan(0);
          
          if (issue.affectedRecords !== undefined) {
            expect(issue.affectedRecords).toBeGreaterThanOrEqual(0);
          }
          
          if (issue.dateRange !== undefined) {
            expect(issue.dateRange.start).toBeInstanceOf(Date);
            expect(issue.dateRange.end).toBeInstanceOf(Date);
            expect(issue.dateRange.start.getTime()).toBeLessThanOrEqual(issue.dateRange.end.getTime());
          }
        });
        
        // Property: Out-of-range crimes should generate appropriate issues
        if (metrics.crimeIncidentsOutOfRange > 0) {
          const outOfRangeIssue = metrics.issues.find(issue => issue.type === 'out_of_range');
          expect(outOfRangeIssue).toBeDefined();
          expect(outOfRangeIssue!.severity).toBe('error');
          expect(outOfRangeIssue!.affectedRecords).toBe(metrics.crimeIncidentsOutOfRange);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('Property 10: Data integrity validation - integrity report completeness', () => {
    fc.assert(
      fc.property(controlledTemporalDataArb, (data) => {
        const allCrimes = [...data.crimesInRange, ...data.crimesOutOfRange];
        const report = validator.generateIntegrityReport(allCrimes, data.moonPhases, data.expectedRange);
        
        // Property: Report should have all required fields
        expect(report).toHaveProperty('isValid');
        expect(report).toHaveProperty('qualityMetrics');
        expect(report).toHaveProperty('recommendations');
        expect(report).toHaveProperty('validationTimestamp');
        
        expect(typeof report.isValid).toBe('boolean');
        expect(Array.isArray(report.recommendations)).toBe(true);
        expect(report.validationTimestamp).toBeInstanceOf(Date);
        
        // Property: Validation should be false if there are error-level issues
        const hasErrors = report.qualityMetrics.issues.some(issue => issue.severity === 'error');
        if (hasErrors || report.qualityMetrics.qualityScore < 70) {
          expect(report.isValid).toBe(false);
        }
        
        // Property: Recommendations should be meaningful
        report.recommendations.forEach(recommendation => {
          expect(typeof recommendation).toBe('string');
          expect(recommendation.length).toBeGreaterThan(0);
          expect(recommendation.trim()).toBe(recommendation);
        });
        
        // Property: Should always have at least one recommendation
        expect(report.recommendations.length).toBeGreaterThan(0);
        
        // Property: Quality metrics should be consistent with validation result
        expect(report.qualityMetrics.totalCrimeIncidents).toBe(allCrimes.length);
        expect(report.qualityMetrics.totalMoonPhases).toBe(data.moonPhases.length);
      }),
      { numRuns: 100 }
    );
  });

  test('Property 10: Data integrity validation - edge case handling', () => {
    // Test empty datasets
    const emptyReport = validator.generateIntegrityReport([], [], {
      start: new Date('2023-01-01'),
      end: new Date('2023-01-31')
    });
    
    expect(emptyReport.qualityMetrics.totalCrimeIncidents).toBe(0);
    expect(emptyReport.qualityMetrics.totalMoonPhases).toBe(0);
    expect(emptyReport.isValid).toBe(false);
    expect(emptyReport.recommendations.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(
        fc.array(crimeIncidentArb, { minLength: 1, maxLength: 5 }),
        dateRangeArb,
        (crimes, expectedRange) => {
          // Test with crimes but no moon phases
          const result = validator.validateCrimeIncidentsInRange(crimes, []);
          
          // Property: All crimes should be out-of-range when no moon phases exist
          expect(result.inRange).toHaveLength(0);
          expect(result.outOfRange).toHaveLength(crimes.length);
          expect(result.moonPhaseRange).toBeNull();
          
          // Property: Quality metrics should reflect the lack of moon phase data
          const metrics = validator.generateDataQualityMetrics(crimes, [], expectedRange);
          expect(metrics.totalMoonPhases).toBe(0);
          expect(metrics.crimeIncidentsInRange).toBe(0);
          expect(metrics.crimeIncidentsOutOfRange).toBe(crimes.length);
        }
      ),
      { numRuns: 50 }
    );

    fc.assert(
      fc.property(
        fc.array(moonPhaseDataArb, { minLength: 1, maxLength: 5 }),
        dateRangeArb,
        (moonPhases, expectedRange) => {
          // Test with moon phases but no crimes
          const result = validator.validateCrimeIncidentsInRange([], moonPhases);
          
          // Property: No crimes should be classified when no crimes exist
          expect(result.inRange).toHaveLength(0);
          expect(result.outOfRange).toHaveLength(0);
          expect(result.moonPhaseRange).not.toBeNull();
          
          // Property: Quality metrics should reflect the lack of crime data
          const metrics = validator.generateDataQualityMetrics([], moonPhases, expectedRange);
          expect(metrics.totalCrimeIncidents).toBe(0);
          expect(metrics.crimeIncidentsInRange).toBe(0);
          expect(metrics.crimeIncidentsOutOfRange).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 10: Data integrity validation - temporal boundary precision', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2023-01-01'), max: new Date('2023-12-31') }),
        fc.integer({ min: 1, max: 100 }),
        (baseDate, offsetMs) => {
          // Create moon phases with precise boundaries
          const moonStart = new Date(baseDate.getTime());
          const moonEnd = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000); // 1 day later
          
          const moonPhases = [
            {
              timestamp: moonStart,
              phaseName: 'new' as const,
              illuminationPercent: 0,
              phaseAngle: 0,
              distanceKm: 384400,
              location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'Test' }
            },
            {
              timestamp: moonEnd,
              phaseName: 'full' as const,
              illuminationPercent: 100,
              phaseAngle: 180,
              distanceKm: 384400,
              location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'Test' }
            }
          ];
          
          // Create crimes at exact boundaries and just outside
          const crimeAtStart = {
            id: 'crime-start',
            timestamp: new Date(moonStart.getTime()),
            location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'Test' },
            crimeType: { category: 'violent' as const, subcategory: 'assault' },
            severity: 'felony' as const,
            description: 'Test crime at start',
            resolved: false
          };
          
          const crimeAtEnd = {
            id: 'crime-end',
            timestamp: new Date(moonEnd.getTime()),
            location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'Test' },
            crimeType: { category: 'violent' as const, subcategory: 'assault' },
            severity: 'felony' as const,
            description: 'Test crime at end',
            resolved: false
          };
          
          const crimeJustBefore = {
            id: 'crime-before',
            timestamp: new Date(moonStart.getTime() - offsetMs),
            location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'Test' },
            crimeType: { category: 'violent' as const, subcategory: 'assault' },
            severity: 'felony' as const,
            description: 'Test crime just before',
            resolved: false
          };
          
          const crimeJustAfter = {
            id: 'crime-after',
            timestamp: new Date(moonEnd.getTime() + offsetMs),
            location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'Test' },
            crimeType: { category: 'violent' as const, subcategory: 'assault' },
            severity: 'felony' as const,
            description: 'Test crime just after',
            resolved: false
          };
          
          const crimes = [crimeAtStart, crimeAtEnd, crimeJustBefore, crimeJustAfter];
          const result = validator.validateCrimeIncidentsInRange(crimes, moonPhases);
          
          // Property: Crimes at exact boundaries should be in-range (inclusive boundaries)
          expect(result.inRange.map(c => c.id)).toContain('crime-start');
          expect(result.inRange.map(c => c.id)).toContain('crime-end');
          
          // Property: Crimes outside boundaries should be out-of-range
          expect(result.outOfRange.map(c => c.id)).toContain('crime-before');
          expect(result.outOfRange.map(c => c.id)).toContain('crime-after');
          
          // Property: Exactly 2 crimes should be in-range and 2 out-of-range
          expect(result.inRange).toHaveLength(2);
          expect(result.outOfRange).toHaveLength(2);
        }
      ),
      { numRuns: 100 }
    );
  });
});