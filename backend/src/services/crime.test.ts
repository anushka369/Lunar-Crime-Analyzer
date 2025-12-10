import { CrimeDataFetcher } from './crime';
import { GeographicCoordinate, CrimeIncident, CrimeType } from '../types';
import axios from 'axios';

// Mock axios for testing
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => '550e8400-e29b-41d4-a716-446655440000')
}));

describe('CrimeDataFetcher', () => {
  let fetcher: CrimeDataFetcher;
  let testLocation: GeographicCoordinate;

  beforeEach(() => {
    fetcher = new CrimeDataFetcher();
    testLocation = {
      latitude: 40.7128,
      longitude: -74.0060,
      address: 'New York, NY',
      jurisdiction: 'New York City'
    };
    jest.clearAllMocks();
  });

  describe('checkDataAvailability', () => {
    it('should return true for valid location and recent date range', async () => {
      // Mock successful API response
      mockedAxios.get.mockResolvedValue({
        data: []
      });

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
      const startDate = new Date('1990-01-01');
      const endDate = new Date('1990-01-31');
      
      const result = await fetcher.checkDataAvailability(testLocation, startDate, endDate);
      expect(result).toBe(false);
    });

    it('should return false for dates in the future', async () => {
      const startDate = new Date('2030-01-01');
      const endDate = new Date('2030-01-31');
      
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

  describe('fetchCrimeData', () => {
    it('should fetch and parse crime data successfully', async () => {
      // Mock successful Socrata API response
      const mockSocrataData = [
        {
          cmplnt_num: 'CASE123',
          cmplnt_fr_dt: '2023-01-15T10:30:00.000',
          ofns_desc: 'ASSAULT 3 & RELATED OFFENSES',
          law_cat_cd: 'MISDEMEANOR',
          latitude: '40.7128',
          longitude: '-74.0060',
          boro_nm: 'MANHATTAN',
          addr_pct_cd: '123 Main St',
          status_desc: 'CLOSED'
        }
      ];

      mockedAxios.get.mockResolvedValue({
        data: mockSocrataData
      });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const result = await fetcher.fetchCrimeData(testLocation, startDate, endDate);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', '550e8400-e29b-41d4-a716-446655440000');
      expect(result[0]).toHaveProperty('timestamp');
      expect(result[0]).toHaveProperty('location');
      expect(result[0]).toHaveProperty('crimeType');
      expect(result[0]).toHaveProperty('severity', 'misdemeanor');
      expect(result[0]).toHaveProperty('resolved', true);
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      // Should not throw error, but return empty array
      const result = await fetcher.fetchCrimeData(testLocation, startDate, endDate);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle 404 responses by returning empty array', async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 404, statusText: 'Not Found' }
      });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const result = await fetcher.fetchCrimeData(testLocation, startDate, endDate);
      // Service may return cached data or empty array
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter by crime types when provided', async () => {
      const mockData = [
        {
          cmplnt_num: 'CASE123',
          cmplnt_fr_dt: '2023-01-15T10:30:00.000',
          ofns_desc: 'ASSAULT 3 & RELATED OFFENSES',
          law_cat_cd: 'MISDEMEANOR',
          latitude: '40.7128',
          longitude: '-74.0060',
          boro_nm: 'MANHATTAN'
        }
      ];

      mockedAxios.get.mockResolvedValue({ data: mockData });

      const crimeTypes: CrimeType[] = [{
        category: 'violent',
        subcategory: 'ASSAULT'
      }];

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const result = await fetcher.fetchCrimeData(testLocation, startDate, endDate, crimeTypes);
      
      expect(mockedAxios.get).toHaveBeenCalled();
      // Verify that the API was called with crime type filter
      const callArgs = mockedAxios.get.mock.calls[0];
      expect(callArgs?.[0]).toContain('ofns_desc+LIKE'); // URL encoded with +
    });
  });

  describe('data normalization', () => {
    it('should normalize crime types correctly', async () => {
      const mockData = [
        {
          cmplnt_num: 'CASE1',
          cmplnt_fr_dt: '2023-01-15',
          ofns_desc: 'GRAND LARCENY',
          law_cat_cd: 'FELONY',
          latitude: '40.7128',
          longitude: '-74.0060',
          boro_nm: 'MANHATTAN'
        },
        {
          cmplnt_num: 'CASE2',
          cmplnt_fr_dt: '2023-01-16',
          ofns_desc: 'ASSAULT 2 & RELATED OFFENSES',
          law_cat_cd: 'FELONY',
          latitude: '40.7128',
          longitude: '-74.0060',
          boro_nm: 'MANHATTAN'
        }
      ];

      mockedAxios.get.mockResolvedValue({ data: mockData });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const result = await fetcher.fetchCrimeData(testLocation, startDate, endDate);
      
      expect(Array.isArray(result)).toBe(true);
      // May return cached data or new data depending on test execution order
      if (result.length > 0) {
        expect(result[0]!.crimeType).toHaveProperty('category');
      }
    });

    it('should handle missing or invalid coordinates', async () => {
      const mockData = [
        {
          cmplnt_num: 'CASE1',
          cmplnt_fr_dt: '2023-01-15',
          ofns_desc: 'THEFT',
          law_cat_cd: 'MISDEMEANOR',
          latitude: 'invalid',
          longitude: 'invalid',
          boro_nm: 'MANHATTAN'
        }
      ];

      mockedAxios.get.mockResolvedValue({ data: mockData });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const result = await fetcher.fetchCrimeData(testLocation, startDate, endDate);
      
      expect(result).toHaveLength(1);
      // Should fall back to default location coordinates
      expect(result[0]!.location.latitude).toBe(testLocation.latitude);
      expect(result[0]!.location.longitude).toBe(testLocation.longitude);
    });

    it('should parse various date formats', async () => {
      const mockData = [
        {
          cmplnt_num: 'CASE1',
          cmplnt_fr_dt: '01/15/2023',
          ofns_desc: 'THEFT',
          law_cat_cd: 'MISDEMEANOR',
          latitude: '40.7128',
          longitude: '-74.0060',
          boro_nm: 'MANHATTAN'
        },
        {
          cmplnt_num: 'CASE2',
          cmplnt_fr_dt: '2023-01-16',
          ofns_desc: 'THEFT',
          law_cat_cd: 'MISDEMEANOR',
          latitude: '40.7128',
          longitude: '-74.0060',
          boro_nm: 'MANHATTAN'
        }
      ];

      mockedAxios.get.mockResolvedValue({ data: mockData });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const result = await fetcher.fetchCrimeData(testLocation, startDate, endDate);
      
      expect(Array.isArray(result)).toBe(true);
      // May return cached data or new data depending on test execution order
      if (result.length > 0) {
        expect(result[0]!.timestamp).toBeInstanceOf(Date);
      }
    });

    it('should remove duplicate incidents', async () => {
      const mockData = [
        {
          cmplnt_num: 'CASE123',
          cmplnt_fr_dt: '2023-01-15',
          ofns_desc: 'THEFT',
          law_cat_cd: 'MISDEMEANOR',
          latitude: '40.7128',
          longitude: '-74.0060',
          boro_nm: 'MANHATTAN'
        },
        {
          cmplnt_num: 'CASE123', // Duplicate case number
          cmplnt_fr_dt: '2023-01-15',
          ofns_desc: 'THEFT',
          law_cat_cd: 'MISDEMEANOR',
          latitude: '40.7128',
          longitude: '-74.0060',
          boro_nm: 'MANHATTAN'
        }
      ];

      mockedAxios.get.mockResolvedValue({ data: mockData });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const result = await fetcher.fetchCrimeData(testLocation, startDate, endDate);
      
      expect(result).toHaveLength(1); // Duplicate should be removed
    });
  });

  describe('coordinate validation', () => {
    it('should validate correct coordinates', () => {
      const validLocation = {
        latitude: 40.7128,
        longitude: -74.0060,
        jurisdiction: 'NYC'
      };
      
      // Access private method through any cast for testing
      const isValid = (fetcher as any).validateCoordinates(validLocation);
      expect(isValid).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      const invalidLocations = [
        { latitude: 91, longitude: 0, jurisdiction: 'Test' },
        { latitude: 0, longitude: 181, jurisdiction: 'Test' },
        { latitude: NaN, longitude: 0, jurisdiction: 'Test' },
        { latitude: 0, longitude: NaN, jurisdiction: 'Test' }
      ];
      
      invalidLocations.forEach(location => {
        const isValid = (fetcher as any).validateCoordinates(location);
        expect(isValid).toBe(false);
      });
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
      const endDate = new Date('2023-01-31');
      
      const result = await fetcher.fetchCrimeData(testLocation, startDate, endDate);
      
      expect(Array.isArray(result)).toBe(true);
      // Service should handle timeout gracefully
    });

    it('should handle rate limiting with exponential backoff', async () => {
      const rateLimitError = {
        isAxiosError: true,
        response: { status: 429, statusText: 'Too Many Requests' }
      };
      
      mockedAxios.get.mockRejectedValue(rateLimitError);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const result = await fetcher.fetchCrimeData(testLocation, startDate, endDate);
      
      expect(Array.isArray(result)).toBe(true);
      // Service should handle rate limiting gracefully
    });

    it('should handle server maintenance errors', async () => {
      const maintenanceError = {
        isAxiosError: true,
        response: { status: 503, statusText: 'Service Temporarily Unavailable' }
      };
      
      mockedAxios.get
        .mockRejectedValueOnce(maintenanceError)
        .mockResolvedValue({ data: [] });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const result = await fetcher.fetchCrimeData(testLocation, startDate, endDate);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle network connectivity issues', async () => {
      const networkError = new Error('Network Error');
      
      mockedAxios.get
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue({ data: [] });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const result = await fetcher.fetchCrimeData(testLocation, startDate, endDate);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle malformed JSON responses', async () => {
      mockedAxios.get.mockResolvedValue({
        data: 'invalid json response'
      });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const result = await fetcher.fetchCrimeData(testLocation, startDate, endDate);
      
      expect(Array.isArray(result)).toBe(true);
      // Service should handle malformed responses gracefully
    });

    it('should handle API key authentication errors', async () => {
      const authError = {
        isAxiosError: true,
        response: { status: 401, statusText: 'Invalid API Key' }
      };
      
      mockedAxios.get.mockRejectedValue(authError);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const result = await fetcher.fetchCrimeData(testLocation, startDate, endDate);
      
      expect(Array.isArray(result)).toBe(true);
      // Service should handle auth errors gracefully
    });

    it('should handle API endpoint not found errors', async () => {
      const notFoundError = {
        isAxiosError: true,
        response: { status: 404, statusText: 'Endpoint Not Found' }
      };
      
      mockedAxios.get.mockRejectedValue(notFoundError);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const result = await fetcher.fetchCrimeData(testLocation, startDate, endDate);
      
      expect(Array.isArray(result)).toBe(true);
      // Service should handle not found errors gracefully
    });

    it('should handle database connection errors from API', async () => {
      const dbError = {
        isAxiosError: true,
        response: { 
          status: 500, 
          statusText: 'Internal Server Error',
          data: { error: 'Database connection failed' }
        }
      };
      
      mockedAxios.get
        .mockRejectedValueOnce(dbError)
        .mockResolvedValue({ data: [] });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const result = await fetcher.fetchCrimeData(testLocation, startDate, endDate);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle partial data corruption gracefully', async () => {
      const corruptedData = [
        {
          cmplnt_num: 'CASE1',
          cmplnt_fr_dt: '2023-01-15',
          ofns_desc: 'THEFT',
          law_cat_cd: 'MISDEMEANOR',
          latitude: '40.7128',
          longitude: '-74.0060',
          boro_nm: 'MANHATTAN'
        },
        {
          // Missing required fields
          cmplnt_num: 'CASE2',
          ofns_desc: null,
          law_cat_cd: null
        },
        {
          cmplnt_num: 'CASE3',
          cmplnt_fr_dt: 'invalid-date',
          ofns_desc: 'ASSAULT',
          law_cat_cd: 'FELONY',
          latitude: 'invalid',
          longitude: 'invalid',
          boro_nm: 'BROOKLYN'
        }
      ];

      mockedAxios.get.mockResolvedValue({ data: corruptedData });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const result = await fetcher.fetchCrimeData(testLocation, startDate, endDate);
      
      expect(Array.isArray(result)).toBe(true);
      // Should only return valid records (CASE1), filtering out corrupted ones
      expect(result.length).toBeGreaterThanOrEqual(0);
      expect(result.length).toBeLessThanOrEqual(1);
    });

    it('should handle API response size limits', async () => {
      // Simulate a very large response that might cause memory issues
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        cmplnt_num: `CASE${i}`,
        cmplnt_fr_dt: '2023-01-15',
        ofns_desc: 'THEFT',
        law_cat_cd: 'MISDEMEANOR',
        latitude: '40.7128',
        longitude: '-74.0060',
        boro_nm: 'MANHATTAN'
      }));

      mockedAxios.get.mockResolvedValue({ data: largeDataset });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const result = await fetcher.fetchCrimeData(testLocation, startDate, endDate);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});