import * as fc from 'fast-check';
import { isValidLatitude, isValidLongitude, isValidCoordinate } from './validation';

describe('Coordinate Validation', () => {
  test('valid latitudes are accepted', () => {
    fc.assert(fc.property(
      fc.float({ min: -90, max: 90, noNaN: true }),
      (lat) => {
        expect(isValidLatitude(lat)).toBe(true);
      }
    ), { numRuns: 100 });
  });

  test('invalid latitudes are rejected', () => {
    fc.assert(fc.property(
      fc.oneof(
        fc.float({ min: -1000, max: Math.fround(-90.1) }),
        fc.float({ min: Math.fround(90.1), max: 1000 })
      ),
      (lat) => {
        expect(isValidLatitude(lat)).toBe(false);
      }
    ), { numRuns: 100 });
  });

  test('valid longitudes are accepted', () => {
    fc.assert(fc.property(
      fc.float({ min: -180, max: 180, noNaN: true }),
      (lng) => {
        expect(isValidLongitude(lng)).toBe(true);
      }
    ), { numRuns: 100 });
  });

  test('coordinate validation combines lat/lng validation', () => {
    fc.assert(fc.property(
      fc.float({ min: -90, max: 90, noNaN: true }),
      fc.float({ min: -180, max: 180, noNaN: true }),
      (lat, lng) => {
        expect(isValidCoordinate(lat, lng)).toBe(true);
      }
    ), { numRuns: 100 });
  });
});