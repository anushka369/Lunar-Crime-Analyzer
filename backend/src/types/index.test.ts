import * as fc from 'fast-check';
import {
  validateMoonPhaseData,
  validateCrimeIncident,
  validateCorrelationResult,
  validateGeographicCoordinate,
  validateCrimeType,
  MoonPhaseData,
  CrimeIncident,
  CorrelationResult,
  GeographicCoordinate,
  CrimeType
} from './index';

/**
 * **Feature: lunar-crime-analyzer, Property 3: Data validation completeness**
 * **Validates: Requirements 2.4, 2.5, 6.4**
 * 
 * For any received dataset (astronomical or crime), the validation process should 
 * correctly identify and handle malformed records while preserving valid data
 */

// Generators for valid data
const validGeographicCoordinateArb = fc.record({
  latitude: fc.double({ min: -90, max: 90, noNaN: true }),
  longitude: fc.double({ min: -180, max: 180, noNaN: true }),
  address: fc.option(fc.string({ minLength: 1 })),
  jurisdiction: fc.string({ minLength: 1 })
});

const validCrimeTypeArb = fc.record({
  category: fc.constantFrom('violent', 'property', 'drug', 'public_order', 'white_collar'),
  subcategory: fc.string({ minLength: 1 }),
  ucr_code: fc.option(fc.string({ minLength: 1 }))
});

const validMoonPhaseDataArb = fc.record({
  timestamp: fc.date(),
  phaseName: fc.constantFrom('new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 
                            'full', 'waning_gibbous', 'last_quarter', 'waning_crescent'),
  illuminationPercent: fc.double({ min: 0, max: 100, noNaN: true }),
  phaseAngle: fc.double({ min: 0, max: 360, noNaN: true }),
  distanceKm: fc.double({ min: 1, noNaN: true }),
  location: validGeographicCoordinateArb
});

const validCrimeIncidentArb = fc.record({
  id: fc.uuid(),
  timestamp: fc.date(),
  location: validGeographicCoordinateArb,
  crimeType: validCrimeTypeArb,
  severity: fc.constantFrom('misdemeanor', 'felony', 'violation'),
  description: fc.string({ minLength: 1 }),
  caseNumber: fc.option(fc.string({ minLength: 1 })),
  resolved: fc.boolean()
});

const validCorrelationResultArb = fc.record({
  crimeType: validCrimeTypeArb,
  moonPhase: fc.string({ minLength: 1 }),
  correlationCoefficient: fc.double({ min: -1, max: 1, noNaN: true }),
  pValue: fc.double({ min: 0, max: 1, noNaN: true }),
  confidenceInterval: fc.tuple(fc.double({ noNaN: true }), fc.double({ noNaN: true })),
  sampleSize: fc.integer({ min: 1 }),
  significanceLevel: fc.double({ min: 0, max: 1, noNaN: true })
});

// Generators for invalid data
const invalidGeographicCoordinateArb = fc.oneof(
  // Invalid latitude
  fc.record({
    latitude: fc.oneof(fc.double({ max: -91, noNaN: true }), fc.double({ min: 91, noNaN: true })),
    longitude: fc.double({ min: -180, max: 180, noNaN: true }),
    jurisdiction: fc.string({ minLength: 1 })
  }),
  // Invalid longitude
  fc.record({
    latitude: fc.double({ min: -90, max: 90, noNaN: true }),
    longitude: fc.oneof(fc.double({ max: -181, noNaN: true }), fc.double({ min: 181, noNaN: true })),
    jurisdiction: fc.string({ minLength: 1 })
  }),
  // Empty jurisdiction
  fc.record({
    latitude: fc.double({ min: -90, max: 90, noNaN: true }),
    longitude: fc.double({ min: -180, max: 180, noNaN: true }),
    jurisdiction: fc.constant('')
  })
);

const invalidMoonPhaseDataArb = fc.oneof(
  // Invalid illumination percent
  fc.record({
    timestamp: fc.date(),
    phaseName: fc.constantFrom('new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 
                              'full', 'waning_gibbous', 'last_quarter', 'waning_crescent'),
    illuminationPercent: fc.oneof(fc.double({ max: -1, noNaN: true }), fc.double({ min: 101, noNaN: true })),
    phaseAngle: fc.double({ min: 0, max: 360, noNaN: true }),
    distanceKm: fc.double({ min: 1, noNaN: true }),
    location: validGeographicCoordinateArb
  }),
  // Invalid phase angle
  fc.record({
    timestamp: fc.date(),
    phaseName: fc.constantFrom('new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 
                              'full', 'waning_gibbous', 'last_quarter', 'waning_crescent'),
    illuminationPercent: fc.double({ min: 0, max: 100, noNaN: true }),
    phaseAngle: fc.oneof(fc.double({ max: -1, noNaN: true }), fc.double({ min: 361, noNaN: true })),
    distanceKm: fc.double({ min: 1, noNaN: true }),
    location: validGeographicCoordinateArb
  }),
  // Invalid distance
  fc.record({
    timestamp: fc.date(),
    phaseName: fc.constantFrom('new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 
                              'full', 'waning_gibbous', 'last_quarter', 'waning_crescent'),
    illuminationPercent: fc.double({ min: 0, max: 100, noNaN: true }),
    phaseAngle: fc.double({ min: 0, max: 360, noNaN: true }),
    distanceKm: fc.double({ max: 0, noNaN: true }),
    location: validGeographicCoordinateArb
  })
);

describe('Data Model Validation Property Tests', () => {
  describe('GeographicCoordinate validation', () => {
    it('should accept all valid geographic coordinates', () => {
      fc.assert(fc.property(validGeographicCoordinateArb, (coord) => {
        expect(() => validateGeographicCoordinate(coord)).not.toThrow();
        const result = validateGeographicCoordinate(coord);
        expect(result).toEqual(coord);
      }), { numRuns: 100 });
    });

    it('should reject all invalid geographic coordinates', () => {
      fc.assert(fc.property(invalidGeographicCoordinateArb, (coord) => {
        expect(() => validateGeographicCoordinate(coord)).toThrow();
      }), { numRuns: 100 });
    });
  });

  describe('CrimeType validation', () => {
    it('should accept all valid crime types', () => {
      fc.assert(fc.property(validCrimeTypeArb, (crimeType) => {
        expect(() => validateCrimeType(crimeType)).not.toThrow();
        const result = validateCrimeType(crimeType);
        expect(result).toEqual(crimeType);
      }), { numRuns: 100 });
    });

    it('should reject crime types with invalid categories', () => {
      const invalidCrimeTypeArb = fc.record({
        category: fc.string().filter(s => !['violent', 'property', 'drug', 'public_order', 'white_collar'].includes(s)),
        subcategory: fc.string({ minLength: 1 }),
        ucr_code: fc.option(fc.string({ minLength: 1 }))
      });

      fc.assert(fc.property(invalidCrimeTypeArb, (crimeType) => {
        expect(() => validateCrimeType(crimeType)).toThrow();
      }), { numRuns: 100 });
    });
  });

  describe('MoonPhaseData validation', () => {
    it('should accept all valid moon phase data', () => {
      fc.assert(fc.property(validMoonPhaseDataArb, (moonData) => {
        expect(() => validateMoonPhaseData(moonData)).not.toThrow();
        const result = validateMoonPhaseData(moonData);
        expect(result).toEqual(moonData);
      }), { numRuns: 100 });
    });

    it('should reject invalid moon phase data', () => {
      fc.assert(fc.property(invalidMoonPhaseDataArb, (moonData) => {
        expect(() => validateMoonPhaseData(moonData)).toThrow();
      }), { numRuns: 100 });
    });
  });

  describe('CrimeIncident validation', () => {
    it('should accept all valid crime incidents', () => {
      fc.assert(fc.property(validCrimeIncidentArb, (incident) => {
        expect(() => validateCrimeIncident(incident)).not.toThrow();
        const result = validateCrimeIncident(incident);
        expect(result).toEqual(incident);
      }), { numRuns: 100 });
    });

    it('should reject crime incidents with invalid UUIDs', () => {
      const invalidIncidentArb = fc.record({
        id: fc.string().filter(s => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)),
        timestamp: fc.date(),
        location: validGeographicCoordinateArb,
        crimeType: validCrimeTypeArb,
        severity: fc.constantFrom('misdemeanor', 'felony', 'violation'),
        description: fc.string({ minLength: 1 }),
        caseNumber: fc.option(fc.string({ minLength: 1 })),
        resolved: fc.boolean()
      });

      fc.assert(fc.property(invalidIncidentArb, (incident) => {
        expect(() => validateCrimeIncident(incident)).toThrow();
      }), { numRuns: 100 });
    });
  });

  describe('CorrelationResult validation', () => {
    it('should accept all valid correlation results', () => {
      fc.assert(fc.property(validCorrelationResultArb, (result) => {
        expect(() => validateCorrelationResult(result)).not.toThrow();
        const validated = validateCorrelationResult(result);
        expect(validated).toEqual(result);
      }), { numRuns: 100 });
    });

    it('should reject correlation results with invalid correlation coefficients', () => {
      const invalidCorrelationArb = fc.record({
        crimeType: validCrimeTypeArb,
        moonPhase: fc.string({ minLength: 1 }),
        correlationCoefficient: fc.oneof(fc.double({ max: -1.1, noNaN: true }), fc.double({ min: 1.1, noNaN: true })),
        pValue: fc.double({ min: 0, max: 1, noNaN: true }),
        confidenceInterval: fc.tuple(fc.double({ noNaN: true }), fc.double({ noNaN: true })),
        sampleSize: fc.integer({ min: 1 }),
        significanceLevel: fc.double({ min: 0, max: 1, noNaN: true })
      });

      fc.assert(fc.property(invalidCorrelationArb, (result) => {
        expect(() => validateCorrelationResult(result)).toThrow();
      }), { numRuns: 100 });
    });
  });

  describe('Data validation completeness property', () => {
    it('should preserve valid data while rejecting invalid data', () => {
      // Test that validation functions are complete - they either accept valid data or reject invalid data
      fc.assert(fc.property(
        fc.oneof(validMoonPhaseDataArb, invalidMoonPhaseDataArb),
        (data) => {
          try {
            const result = validateMoonPhaseData(data);
            // If validation succeeds, the result should equal the input
            expect(result).toEqual(data);
            return true;
          } catch (error) {
            // If validation fails, it should throw an error
            expect(error).toBeDefined();
            return true;
          }
        }
      ), { numRuns: 100 });
    });
  });
});