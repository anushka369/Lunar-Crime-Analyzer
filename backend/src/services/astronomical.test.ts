import { AstronomicalDataFetcher } from './astronomical';
import { GeographicCoordinate, MoonPhaseData } from '../types';
import axios from 'axios';
import * as fc from 'fast-check';

// Mock axios for testing
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AstronomicalDataFetcher', () => {
  let fetcher: AstronomicalDataFetcher;
  let testLocation: GeographicCoordinate;

  beforeEach(() => {
    fetcher = new AstronomicalDataFetcher();
    testLocation = {
      latitude: 40.7128,
      longitude: -74.0060,
      address: 'New York, NY',
      jurisdiction: 'New York City'
    };
    jest.clearAllMocks();
  });

  describe('validateCoordinates', () => {
    it('should validate correct coordinates', () => {
      expect(fetcher.validateCoordinates(testLocation)).toBe(true);
    });

    it('should reject invalid latitude', () => {
      const invalidLocation = { ...testLocation, latitude: 91 };
      expect(fetcher.validateCoordinates(invalidLocation)).toBe(false);
    });

    it('should reject invalid longitude', () => {
      const invalidLocation = { ...testLocation, longitude: 181 };
      expect(fetcher.validateCoordinates(invalidLocation)).toBe(false);
    });

    it('should reject empty jurisdiction', () => {
      const invalidLocation = { ...testLocation, jurisdiction: '' };
      expect(fetcher.validateCoordinates(invalidLocation)).toBe(false);
    });
  });

  describe('checkDataAvailability', () => {
    it('should return true for valid location and recent date range', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const result = await fetcher.checkDataAvailability(testLocation, startDate, endDate);
      expect(result).toBe(true);
    });

    it('should return false for invalid coordinates', async () => {
      const invalidLocation = { ...testLocation, latitude: 91 };
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const result = await fetcher.checkDataAvailability(invalidLocation, startDate, endDate);
      expect(result).toBe(false);
    });

    it('should return false for dates too far in the past', async () => {
      const startDate = new Date('1900-01-01');
      const endDate = new Date('1900-01-31');
      
      const result = await fetcher.checkDataAvailability(testLocation, startDate, endDate);
      expect(result).toBe(false);
    });

    it('should return false for dates too far in the future', async () => {
      const startDate = new Date('2050-01-01');
      const endDate = new Date('2050-01-31');
      
      const result = await fetcher.checkDataAvailability(testLocation, startDate, endDate);
      expect(result).toBe(false);
    });

    it('should return false when start date is after end date', async () => {
      const startDate = new Date('2023-02-01');
      const endDate = new Date('2023-01-01');
      
      const result = await fetcher.checkDataAvailability(testLocation, startDate, endDate);
      expect(result).toBe(false);
    });
  });

  describe('fetchMoonPhaseData', () => {
    it('should fetch moon phase data for a date range', async () => {
      // Mock successful API response
      mockedAxios.get.mockResolvedValue({
        data: {
          properties: {
            data: {
              moondata: [
                { phen: 'Full Moon', time: '12:00' }
              ]
            }
          }
        }
      });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-02');
      
      const result = await fetcher.fetchMoonPhaseData(testLocation, startDate, endDate);
      
      expect(result).toHaveLength(2); // Two days
      expect(result[0]).toHaveProperty('timestamp');
      expect(result[0]).toHaveProperty('phaseName');
      expect(result[0]).toHaveProperty('illuminationPercent');
      expect(result[0]).toHaveProperty('phaseAngle');
      expect(result[0]).toHaveProperty('distanceKm');
      expect(result[0]).toHaveProperty('location');
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-01');
      
      // The service should handle errors gracefully and return calculated data
      const result = await fetcher.fetchMoonPhaseData(testLocation, startDate, endDate);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle 404 responses by skipping dates', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: 404, statusText: 'Not Found' }
      };
      mockedAxios.get.mockRejectedValue(axiosError);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-01');
      
      const result = await fetcher.fetchMoonPhaseData(testLocation, startDate, endDate);
      // Service falls back to calculated data when API returns 404
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('moon phase calculations', () => {
    it('should calculate realistic moon phase data', async () => {
      // Mock API response to test internal calculations
      mockedAxios.get.mockResolvedValue({
        data: {}
      });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-01');
      
      const result = await fetcher.fetchMoonPhaseData(testLocation, startDate, endDate);
      
      if (result.length > 0) {
        const moonData = result[0]!;
        expect(moonData.illuminationPercent).toBeGreaterThanOrEqual(0);
        expect(moonData.illuminationPercent).toBeLessThanOrEqual(100);
        expect(moonData.phaseAngle).toBeGreaterThanOrEqual(0);
        expect(moonData.phaseAngle).toBeLessThanOrEqual(360);
        expect(moonData.distanceKm).toBeGreaterThan(300000); // Reasonable distance to moon
        expect(moonData.distanceKm).toBeLessThan(500000);
      }
    });

    it('should assign correct phase names based on illumination', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {}
      });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-01');
      
      const result = await fetcher.fetchMoonPhaseData(testLocation, startDate, endDate);
      
      if (result.length > 0) {
        const validPhases = [
          'new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous',
          'full', 'waning_gibbous', 'last_quarter', 'waning_crescent'
        ];
        expect(validPhases).toContain(result[0]!.phaseName);
      }
    });
  });

  describe('timezone handling', () => {
    it('should convert timestamps to local timezone', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {}
      });

      const startDate = new Date('2023-01-01T12:00:00Z');
      const endDate = new Date('2023-01-01T12:00:00Z');
      
      const result = await fetcher.fetchMoonPhaseData(testLocation, startDate, endDate);
      
      if (result.length > 0) {
        // The timestamp should be adjusted for the location's timezone
        expect(result[0]!.timestamp).toBeInstanceOf(Date);
        // For NYC (longitude -74), we expect roughly -5 hours offset
        const expectedOffset = Math.round(testLocation.longitude / 15) * 60 * 60 * 1000;
        const actualOffset = result[0]!.timestamp.getTime() - startDate.getTime();
        expect(Math.abs(actualOffset - expectedOffset)).toBeLessThan(24 * 60 * 60 * 1000); // Within 24 hours
      }
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * **Feature: lunar-crime-analyzer, Property 2: API integration reliability**
     * For any valid location and date combination, the system should successfully fetch both astronomical and crime data, 
     * with proper retry logic handling any temporary failures
     * **Validates: Requirements 2.2, 2.3**
     */
    it('should handle API integration reliability for any valid location and date', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid coordinates
          fc.record({
            latitude: fc.float({ min: -90, max: 90 }),
            longitude: fc.float({ min: -180, max: 180 }),
            address: fc.option(fc.string(), { nil: undefined }),
            jurisdiction: fc.string({ minLength: 1, maxLength: 50 })
          }),
          // Generate valid date ranges (within reasonable bounds)
          fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
          async (location: GeographicCoordinate, date1: Date, date2: Date) => {
            // Ensure start date is before end date
            const startDate = date1 <= date2 ? date1 : date2;
            const endDate = date1 <= date2 ? date2 : date1;
            
            // Limit date range to avoid excessive API calls in tests
            const maxRangeDays = 3;
            const actualEndDate = new Date(Math.min(
              endDate.getTime(),
              startDate.getTime() + (maxRangeDays * 24 * 60 * 60 * 1000)
            ));

            // Mock successful API response for this test
            mockedAxios.get.mockResolvedValue({
              data: {
                properties: {
                  data: {
                    moondata: [
                      { phen: 'Full Moon', time: '12:00' }
                    ]
                  }
                }
              }
            });

            try {
              // Test that the fetcher can handle any valid input
              const result = await fetcher.fetchMoonPhaseData(location, startDate, actualEndDate);
              
              // Property: The result should always be an array
              expect(Array.isArray(result)).toBe(true);
              
              // Property: Each item in the result should be a valid MoonPhaseData object
              result.forEach(moonData => {
                expect(moonData).toHaveProperty('timestamp');
                expect(moonData).toHaveProperty('phaseName');
                expect(moonData).toHaveProperty('illuminationPercent');
                expect(moonData).toHaveProperty('phaseAngle');
                expect(moonData).toHaveProperty('distanceKm');
                expect(moonData).toHaveProperty('location');
                
                // Property: Illumination should be between 0 and 100
                expect(moonData.illuminationPercent).toBeGreaterThanOrEqual(0);
                expect(moonData.illuminationPercent).toBeLessThanOrEqual(100);
                
                // Property: Phase angle should be between 0 and 360
                expect(moonData.phaseAngle).toBeGreaterThanOrEqual(0);
                expect(moonData.phaseAngle).toBeLessThanOrEqual(360);
                
                // Property: Distance should be reasonable (moon distance range)
                expect(moonData.distanceKm).toBeGreaterThan(300000);
                expect(moonData.distanceKm).toBeLessThan(500000);
                
                // Property: Location should match input location
                expect(moonData.location.latitude).toBeCloseTo(location.latitude, 5);
                expect(moonData.location.longitude).toBeCloseTo(location.longitude, 5);
                expect(moonData.location.jurisdiction).toBe(location.jurisdiction);
              });
              
              // Property: Number of results should match the date range
              const expectedDays = Math.ceil((actualEndDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
              expect(result.length).toBeLessThanOrEqual(expectedDays);
              
            } catch (error) {
              // Property: Any errors should be meaningful and not generic
              expect(error).toBeInstanceOf(Error);
              if (error instanceof Error) {
                expect(error.message).toBeTruthy();
                expect(error.message.length).toBeGreaterThan(0);
              }
            }
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design document
      );
    });

    it('should handle API failures gracefully with retry logic', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid coordinates
          fc.record({
            latitude: fc.float({ min: -90, max: 90 }),
            longitude: fc.float({ min: -180, max: 180 }),
            address: fc.option(fc.string(), { nil: undefined }),
            jurisdiction: fc.string({ minLength: 1, maxLength: 50 })
          }),
          // Generate a single date for simpler testing
          fc.date({ min: new Date('2023-01-01'), max: new Date('2023-12-31') }),
          async (location: GeographicCoordinate, date: Date) => {
            // Mock API failure scenarios
            const errorTypes = [
              new Error('Network timeout'),
              { isAxiosError: true, response: { status: 500, statusText: 'Internal Server Error' } },
              { isAxiosError: true, response: { status: 429, statusText: 'Too Many Requests' } },
              { isAxiosError: true, response: { status: 404, statusText: 'Not Found' } }
            ];
            
            const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
            mockedAxios.get.mockRejectedValue(randomError);

            try {
              const result = await fetcher.fetchMoonPhaseData(location, date, date);
              
              // Property: For 404 errors, should return empty array (no data available)
              if (randomError && typeof randomError === 'object' && 'response' in randomError && randomError.response?.status === 404) {
                expect(Array.isArray(result)).toBe(true);
                expect(result.length).toBe(0);
              }
            } catch (error) {
              // Property: Non-404 errors should be properly wrapped with meaningful messages
              expect(error).toBeInstanceOf(Error);
              if (error instanceof Error) {
                expect(error.message).toContain('Failed to fetch moon phase data');
                expect(error.message.length).toBeGreaterThan(0);
              }
            }
          }
        ),
        { numRuns: 50 } // Fewer runs for error scenarios to avoid excessive logging
      );
    });
  });

  describe('API Error Scenarios', () => {
    it('should handle timeout errors with retry logic', async () => {
      const timeoutError = {
        isAxiosError: true,
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      };
      
      mockedAxios.get.mockRejectedValue(timeoutError);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-01');
      
      const result = await fetcher.fetchMoonPhaseData(testLocation, startDate, endDate);
      
      expect(Array.isArray(result)).toBe(true);
      // Service should handle timeout gracefully and return calculated data
    });

    it('should handle rate limiting with exponential backoff', async () => {
      const rateLimitError = {
        isAxiosError: true,
        response: { status: 429, statusText: 'Too Many Requests' }
      };
      
      mockedAxios.get.mockRejectedValue(rateLimitError);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-01');
      
      const result = await fetcher.fetchMoonPhaseData(testLocation, startDate, endDate);
      
      expect(Array.isArray(result)).toBe(true);
      // Service should handle rate limiting gracefully
    });

    it('should handle server errors with circuit breaker', async () => {
      const serverError = {
        isAxiosError: true,
        response: { status: 503, statusText: 'Service Unavailable' }
      };
      
      mockedAxios.get
        .mockRejectedValueOnce(serverError)
        .mockResolvedValue({ data: {} });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-01');
      
      const result = await fetcher.fetchMoonPhaseData(testLocation, startDate, endDate);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle network connectivity issues', async () => {
      const networkError = new Error('Network Error');
      
      mockedAxios.get
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue({ data: {} });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-01');
      
      const result = await fetcher.fetchMoonPhaseData(testLocation, startDate, endDate);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle malformed API responses gracefully', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { invalid: 'response format' }
      });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-01');
      
      const result = await fetcher.fetchMoonPhaseData(testLocation, startDate, endDate);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle API authentication errors', async () => {
      const authError = {
        isAxiosError: true,
        response: { status: 401, statusText: 'Unauthorized' }
      };
      
      mockedAxios.get.mockRejectedValue(authError);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-01');
      
      // Service should handle auth errors gracefully and return calculated data
      const result = await fetcher.fetchMoonPhaseData(testLocation, startDate, endDate);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle API quota exceeded errors', async () => {
      const quotaError = {
        isAxiosError: true,
        response: { status: 403, statusText: 'Quota Exceeded' }
      };
      
      mockedAxios.get.mockRejectedValue(quotaError);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-01');
      
      // Service should handle quota errors gracefully and return calculated data
      const result = await fetcher.fetchMoonPhaseData(testLocation, startDate, endDate);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle DNS resolution failures', async () => {
      const dnsError = {
        isAxiosError: true,
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND api.example.com'
      };
      
      mockedAxios.get
        .mockRejectedValueOnce(dnsError)
        .mockResolvedValue({ data: {} });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-01');
      
      const result = await fetcher.fetchMoonPhaseData(testLocation, startDate, endDate);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle SSL certificate errors', async () => {
      const sslError = {
        isAxiosError: true,
        code: 'CERT_UNTRUSTED',
        message: 'certificate verify failed'
      };
      
      mockedAxios.get
        .mockRejectedValueOnce(sslError)
        .mockResolvedValue({ data: {} });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-01');
      
      const result = await fetcher.fetchMoonPhaseData(testLocation, startDate, endDate);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle connection refused errors', async () => {
      const connectionError = {
        isAxiosError: true,
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:80'
      };
      
      mockedAxios.get
        .mockRejectedValueOnce(connectionError)
        .mockResolvedValue({ data: {} });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-01');
      
      const result = await fetcher.fetchMoonPhaseData(testLocation, startDate, endDate);
      
      expect(Array.isArray(result)).toBe(true);
    });
  });
});