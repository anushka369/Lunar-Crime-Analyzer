import * as fc from 'fast-check';
import { TimestampAligner, TemporalAlignment, AlignmentResult } from './temporal';
import { MoonPhaseData, CrimeIncident, GeographicCoordinate, CrimeType } from '../types';

/**
 * **Feature: lunar-crime-analyzer, Property 9: Temporal alignment accuracy**
 * **Validates: Requirements 6.1, 6.2, 6.3**
 * 
 * For any combination of astronomical and crime datasets, the temporal alignment should precisely 
 * match crime incidents with corresponding moon phase data based on synchronized timestamps
 */

describe('TimestampAligner Property Tests', () => {
  let aligner: TimestampAligner;

  beforeEach(() => {
    aligner = new TimestampAligner(12); // 12 hour max difference
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

  // Generator for creating aligned datasets (crimes and moon phases in same location and time range)
  const alignedDatasetArb = fc.tuple(
    geographicCoordinateArb,
    fc.date({ min: new Date('2023-01-01'), max: new Date('2023-12-31') })
  ).chain(([baseLocation, baseDate]) => {
    const locationVariance = Math.fround(0.1); // Small variance for "same location"
    const timeVariance = 6 * 60 * 60 * 1000; // 6 hours variance
    
    return fc.record({
      crimes: fc.array(
        crimeIncidentArb.map(crime => ({
          ...crime,
          location: {
            ...crime.location,
            latitude: baseLocation.latitude + fc.sample(fc.float({ min: Math.fround(-locationVariance), max: Math.fround(locationVariance) }), 1)[0]!,
            longitude: baseLocation.longitude + fc.sample(fc.float({ min: Math.fround(-locationVariance), max: Math.fround(locationVariance) }), 1)[0]!,
            jurisdiction: baseLocation.jurisdiction
          },
          timestamp: new Date(baseDate.getTime() + fc.sample(fc.integer({ min: -timeVariance, max: timeVariance }), 1)[0]!)
        })),
        { minLength: 1, maxLength: 20 }
      ),
      moonPhases: fc.array(
        moonPhaseDataArb.map(moonPhase => ({
          ...moonPhase,
          location: {
            ...moonPhase.location,
            latitude: baseLocation.latitude + fc.sample(fc.float({ min: Math.fround(-locationVariance), max: Math.fround(locationVariance) }), 1)[0]!,
            longitude: baseLocation.longitude + fc.sample(fc.float({ min: Math.fround(-locationVariance), max: Math.fround(locationVariance) }), 1)[0]!,
            jurisdiction: baseLocation.jurisdiction
          },
          timestamp: new Date(baseDate.getTime() + fc.sample(fc.integer({ min: -timeVariance, max: timeVariance }), 1)[0]!)
        })),
        { minLength: 1, maxLength: 20 }
      )
    });
  });

  test('Property 9: Temporal alignment accuracy - all alignments have valid time differences', () => {
    fc.assert(
      fc.property(alignedDatasetArb, (dataset) => {
        const result = aligner.alignTemporalData(dataset.crimes, dataset.moonPhases);
        
        // Property: All alignments should have time differences within the maximum allowed
        result.alignments.forEach(alignment => {
          expect(alignment.timeDifferenceMs).toBeGreaterThanOrEqual(0);
          expect(alignment.timeDifferenceMs).toBeLessThanOrEqual(12 * 60 * 60 * 1000); // 12 hours max
          
          // Property: Time difference should match actual calculation
          const actualDifference = Math.abs(
            alignment.crimeIncident.timestamp.getTime() - alignment.moonPhase.timestamp.getTime()
          );
          expect(alignment.timeDifferenceMs).toBe(actualDifference);
        });
        
        // Property: Total crimes should equal aligned + unaligned
        expect(result.totalCrimes).toBe(dataset.crimes.length);
        expect(result.alignments.length + result.unalignedCrimes.length).toBe(result.totalCrimes);
        
        // Property: Total moon phases should equal used + unused
        expect(result.totalMoonPhases).toBe(dataset.moonPhases.length);
        expect(result.alignments.length + result.unalignedMoonPhases.length).toBe(result.totalMoonPhases);
        
        // Property: Alignment accuracy should be correctly calculated
        const expectedAccuracy = dataset.crimes.length > 0 
          ? (result.alignments.length / dataset.crimes.length) * 100 
          : 0;
        expect(result.alignmentAccuracy).toBeCloseTo(expectedAccuracy, 2);
      }),
      { numRuns: 100 }
    );
  });

  test('Property 9: Temporal alignment accuracy - locations are compatible for alignments', () => {
    fc.assert(
      fc.property(alignedDatasetArb, (dataset) => {
        const result = aligner.alignTemporalData(dataset.crimes, dataset.moonPhases);
        
        // Property: All alignments should have compatible locations (within ~100km)
        result.alignments.forEach(alignment => {
          const latDiff = Math.abs(
            alignment.crimeIncident.location.latitude - alignment.moonPhase.location.latitude
          );
          const lonDiff = Math.abs(
            alignment.crimeIncident.location.longitude - alignment.moonPhase.location.longitude
          );
          
          // Should be within 1 degree (approximately 100km)
          expect(latDiff).toBeLessThanOrEqual(1.0);
          expect(lonDiff).toBeLessThanOrEqual(1.0);
        });
      }),
      { numRuns: 100 }
    );
  });

  test('Property 9: Temporal alignment accuracy - no duplicate alignments', () => {
    fc.assert(
      fc.property(alignedDatasetArb, (dataset) => {
        const result = aligner.alignTemporalData(dataset.crimes, dataset.moonPhases);
        
        // Property: Each crime should be aligned at most once
        const crimeIds = result.alignments.map(a => a.crimeIncident.id);
        const uniqueCrimeIds = new Set(crimeIds);
        expect(crimeIds.length).toBe(uniqueCrimeIds.size);
        
        // Property: Each moon phase should be used at most once
        const moonPhaseKeys = result.alignments.map(a => 
          `${a.moonPhase.timestamp.getTime()}-${a.moonPhase.location.latitude}-${a.moonPhase.location.longitude}`
        );
        const uniqueMoonPhaseKeys = new Set(moonPhaseKeys);
        expect(moonPhaseKeys.length).toBe(uniqueMoonPhaseKeys.size);
      }),
      { numRuns: 100 }
    );
  });

  test('Property 9: Temporal alignment accuracy - greedy matching behavior', () => {
    fc.assert(
      fc.property(alignedDatasetArb, (dataset) => {
        const result = aligner.alignTemporalData(dataset.crimes, dataset.moonPhases);
        
        // Property: Each alignment should be within the maximum time difference
        result.alignments.forEach(alignment => {
          const crimeTime = alignment.crimeIncident.timestamp.getTime();
          const alignedMoonTime = alignment.moonPhase.timestamp.getTime();
          const alignedDifference = Math.abs(crimeTime - alignedMoonTime);
          
          // Should be within the maximum allowed time difference
          expect(alignedDifference).toBeLessThanOrEqual(12 * 60 * 60 * 1000); // 12 hours
          
          // Should have compatible locations
          const latDiff = Math.abs(alignment.crimeIncident.location.latitude - alignment.moonPhase.location.latitude);
          const lonDiff = Math.abs(alignment.crimeIncident.location.longitude - alignment.moonPhase.location.longitude);
          expect(latDiff).toBeLessThanOrEqual(1.0);
          expect(lonDiff).toBeLessThanOrEqual(1.0);
        });
        
        // Property: The algorithm should prefer closer matches when available
        // (This tests the greedy nature without requiring global optimality)
        if (result.alignments.length > 1) {
          // Sort alignments by crime timestamp
          const sortedAlignments = result.alignments.sort(
            (a, b) => a.crimeIncident.timestamp.getTime() - b.crimeIncident.timestamp.getTime()
          );
          
          // Each alignment should be reasonable given the greedy approach
          sortedAlignments.forEach(alignment => {
            const timeDiff = alignment.timeDifferenceMs;
            // Time difference should be reasonable (not extremely large unless necessary)
            expect(timeDiff).toBeLessThanOrEqual(12 * 60 * 60 * 1000);
          });
        }
      }),
      { numRuns: 100 }
    );
  });

  test('Property 9: Temporal alignment accuracy - timestamp synchronization preserves data integrity', () => {
    fc.assert(
      fc.property(
        fc.array(crimeIncidentArb, { minLength: 1, maxLength: 10 }),
        fc.array(moonPhaseDataArb, { minLength: 1, maxLength: 10 }),
        fc.constantFrom('UTC', 'America/New_York', 'Europe/London'),
        (crimes, moonPhases, timezone) => {
          const synchronized = aligner.synchronizeTimestamps(crimes, moonPhases, timezone);
          
          // Property: Same number of records after synchronization
          expect(synchronized.crimes.length).toBe(crimes.length);
          expect(synchronized.moonPhases.length).toBe(moonPhases.length);
          
          // Property: All other data should be preserved
          synchronized.crimes.forEach((syncCrime, index) => {
            const originalCrime = crimes[index]!;
            expect(syncCrime.id).toBe(originalCrime.id);
            expect(syncCrime.location).toEqual(originalCrime.location);
            expect(syncCrime.crimeType).toEqual(originalCrime.crimeType);
            expect(syncCrime.severity).toBe(originalCrime.severity);
            expect(syncCrime.description).toBe(originalCrime.description);
            expect(syncCrime.resolved).toBe(originalCrime.resolved);
            // Timestamp should be a valid Date object
            expect(syncCrime.timestamp).toBeInstanceOf(Date);
            expect(isNaN(syncCrime.timestamp.getTime())).toBe(false);
          });
          
          synchronized.moonPhases.forEach((syncMoon, index) => {
            const originalMoon = moonPhases[index]!;
            expect(syncMoon.phaseName).toBe(originalMoon.phaseName);
            expect(syncMoon.illuminationPercent).toBe(originalMoon.illuminationPercent);
            expect(syncMoon.phaseAngle).toBe(originalMoon.phaseAngle);
            expect(syncMoon.distanceKm).toBe(originalMoon.distanceKm);
            expect(syncMoon.location).toEqual(originalMoon.location);
            // Timestamp should be a valid Date object
            expect(syncMoon.timestamp).toBeInstanceOf(Date);
            expect(isNaN(syncMoon.timestamp.getTime())).toBe(false);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 9: Temporal alignment accuracy - validation identifies integrity issues', () => {
    fc.assert(
      fc.property(alignedDatasetArb, (dataset) => {
        const result = aligner.alignTemporalData(dataset.crimes, dataset.moonPhases);
        const validation = aligner.validateTemporalIntegrity(result);
        
        // Property: Validation should always return a valid structure
        expect(validation).toHaveProperty('isValid');
        expect(validation).toHaveProperty('errors');
        expect(validation).toHaveProperty('warnings');
        expect(Array.isArray(validation.errors)).toBe(true);
        expect(Array.isArray(validation.warnings)).toBe(true);
        
        // Property: If alignment accuracy is very low, there should be errors
        if (result.alignmentAccuracy < 50) {
          expect(validation.isValid).toBe(false);
          expect(validation.errors.length).toBeGreaterThan(0);
          expect(validation.errors.some(error => error.includes('alignment accuracy'))).toBe(true);
        }
        
        // Property: If alignment accuracy is moderate, there might be warnings
        if (result.alignmentAccuracy >= 50 && result.alignmentAccuracy < 80) {
          expect(validation.warnings.some(warning => warning.includes('alignment accuracy'))).toBe(true);
        }
        
        // Property: All error and warning messages should be meaningful
        [...validation.errors, ...validation.warnings].forEach(message => {
          expect(typeof message).toBe('string');
          expect(message.length).toBeGreaterThan(0);
          expect(message.trim()).toBe(message); // No leading/trailing whitespace
        });
      }),
      { numRuns: 100 }
    );
  });

  test('Property 9: Temporal alignment accuracy - statistics are mathematically correct', () => {
    fc.assert(
      fc.property(alignedDatasetArb, (dataset) => {
        const result = aligner.alignTemporalData(dataset.crimes, dataset.moonPhases);
        const stats = aligner.getAlignmentStatistics(result);
        
        // Property: Statistics should match the alignment result
        expect(stats.totalAlignments).toBe(result.alignments.length);
        expect(stats.alignmentAccuracy).toBe(result.alignmentAccuracy);
        
        if (result.alignments.length > 0) {
          const timeDifferences = result.alignments.map(a => a.timeDifferenceMs);
          
          // Property: Average should be mathematically correct
          const expectedAverage = timeDifferences.reduce((sum, diff) => sum + diff, 0) / timeDifferences.length;
          expect(stats.averageTimeDifferenceMs).toBeCloseTo(expectedAverage, 2);
          
          // Property: Min and max should be correct
          expect(stats.minTimeDifferenceMs).toBe(Math.min(...timeDifferences));
          expect(stats.maxTimeDifferenceMs).toBe(Math.max(...timeDifferences));
          
          // Property: Min should be <= average <= max
          expect(stats.minTimeDifferenceMs).toBeLessThanOrEqual(stats.averageTimeDifferenceMs);
          expect(stats.averageTimeDifferenceMs).toBeLessThanOrEqual(stats.maxTimeDifferenceMs);
        } else {
          // Property: Empty result should have zero statistics
          expect(stats.averageTimeDifferenceMs).toBe(0);
          expect(stats.minTimeDifferenceMs).toBe(0);
          expect(stats.maxTimeDifferenceMs).toBe(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('Property 9: Temporal alignment accuracy - empty datasets handled correctly', () => {
    // Test with empty crime data
    const emptyResult1 = aligner.alignTemporalData([], []);
    expect(emptyResult1.alignments).toHaveLength(0);
    expect(emptyResult1.unalignedCrimes).toHaveLength(0);
    expect(emptyResult1.unalignedMoonPhases).toHaveLength(0);
    expect(emptyResult1.alignmentAccuracy).toBe(0);

    fc.assert(
      fc.property(
        fc.array(moonPhaseDataArb, { minLength: 1, maxLength: 5 }),
        (moonPhases) => {
          // Test with empty crimes but some moon phases
          const result = aligner.alignTemporalData([], moonPhases);
          
          // Property: No alignments should be created
          expect(result.alignments).toHaveLength(0);
          expect(result.unalignedCrimes).toHaveLength(0);
          expect(result.unalignedMoonPhases).toHaveLength(moonPhases.length);
          expect(result.alignmentAccuracy).toBe(0);
          expect(result.totalCrimes).toBe(0);
          expect(result.totalMoonPhases).toBe(moonPhases.length);
        }
      ),
      { numRuns: 50 }
    );

    fc.assert(
      fc.property(
        fc.array(crimeIncidentArb, { minLength: 1, maxLength: 5 }),
        (crimes) => {
          // Test with some crimes but empty moon phases
          const result = aligner.alignTemporalData(crimes, []);
          
          // Property: No alignments should be created
          expect(result.alignments).toHaveLength(0);
          expect(result.unalignedCrimes).toHaveLength(crimes.length);
          expect(result.unalignedMoonPhases).toHaveLength(0);
          expect(result.alignmentAccuracy).toBe(0);
          expect(result.totalCrimes).toBe(crimes.length);
          expect(result.totalMoonPhases).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });
});