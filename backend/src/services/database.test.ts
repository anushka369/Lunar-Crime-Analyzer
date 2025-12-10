import { DatabaseService } from './database';
import { 
  MoonPhaseData, 
  CrimeIncident, 
  GeographicCoordinate,
  CrimeType 
} from '../types';

// Mock the database pool
jest.mock('../config/database', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn()
}));

describe('DatabaseService', () => {
  let dbService: DatabaseService;
  let mockQuery: jest.Mock;

  beforeAll(() => {
    dbService = new DatabaseService();
    mockQuery = require('../config/database').query;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('insertMoonPhase', () => {
    it('should insert moon phase data successfully', async () => {
      const moonPhase: MoonPhaseData = {
        timestamp: new Date('2024-01-01T00:00:00Z'),
        phaseName: 'full',
        illuminationPercent: 100,
        phaseAngle: 180,
        distanceKm: 384400,
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: 'New York, NY',
          jurisdiction: 'test_jurisdiction'
        }
      };

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await expect(dbService.insertMoonPhase(moonPhase)).resolves.not.toThrow();

      // Verify correct SQL was called
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO moon_phases'),
        [
          moonPhase.timestamp,
          moonPhase.phaseName,
          moonPhase.illuminationPercent,
          moonPhase.phaseAngle,
          moonPhase.distanceKm,
          moonPhase.location.latitude,
          moonPhase.location.longitude,
          moonPhase.location.address,
          moonPhase.location.jurisdiction
        ]
      );
    });

    it('should handle moon phase data with null address', async () => {
      const moonPhase: MoonPhaseData = {
        timestamp: new Date('2024-01-01T00:00:00Z'),
        phaseName: 'new',
        illuminationPercent: 0,
        phaseAngle: 0,
        distanceKm: 384400,
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: null,
          jurisdiction: 'test_jurisdiction'
        }
      };

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await expect(dbService.insertMoonPhase(moonPhase)).resolves.not.toThrow();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO moon_phases'),
        expect.arrayContaining([null]) // Should include null for address
      );
    });
  });

  describe('insertCrimeIncident', () => {
    it('should insert crime incident data successfully', async () => {
      const crimeIncident: CrimeIncident = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: '123 Main St, New York, NY',
          jurisdiction: 'test_jurisdiction'
        },
        crimeType: {
          category: 'violent',
          subcategory: 'assault',
          ucr_code: '13A'
        },
        severity: 'felony',
        description: 'Test crime incident',
        caseNumber: 'CASE-2024-001',
        resolved: false
      };

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await expect(dbService.insertCrimeIncident(crimeIncident)).resolves.not.toThrow();

      // Verify correct SQL was called
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO crime_incidents'),
        [
          crimeIncident.id,
          crimeIncident.timestamp,
          crimeIncident.location.latitude,
          crimeIncident.location.longitude,
          crimeIncident.crimeType.category,
          crimeIncident.crimeType.subcategory,
          crimeIncident.crimeType.ucr_code,
          crimeIncident.severity,
          crimeIncident.description,
          crimeIncident.caseNumber,
          crimeIncident.location.jurisdiction,
          crimeIncident.resolved,
          crimeIncident.location.address
        ]
      );
    });

    it('should handle crime incident with null optional fields', async () => {
      const crimeIncident: CrimeIncident = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: null,
          jurisdiction: 'test_jurisdiction'
        },
        crimeType: {
          category: 'property',
          subcategory: 'theft',
          ucr_code: null
        },
        severity: 'misdemeanor',
        description: 'Test crime incident without optional fields',
        caseNumber: null,
        resolved: true
      };

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await expect(dbService.insertCrimeIncident(crimeIncident)).resolves.not.toThrow();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO crime_incidents'),
        expect.arrayContaining([null, null, null]) // Should include nulls for optional fields
      );
    });
  });

  describe('database error handling', () => {
    it('should handle database connection errors', async () => {
      const moonPhase: MoonPhaseData = {
        timestamp: new Date('2024-01-01T00:00:00Z'),
        phaseName: 'full',
        illuminationPercent: 100,
        phaseAngle: 180,
        distanceKm: 384400,
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: 'Test',
          jurisdiction: 'test_jurisdiction'
        }
      };

      mockQuery.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(dbService.insertMoonPhase(moonPhase)).rejects.toThrow('Connection failed');
    });

    it('should handle constraint violation errors', async () => {
      const crimeIncident: CrimeIncident = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: 'Test',
          jurisdiction: 'test_jurisdiction'
        },
        crimeType: {
          category: 'violent',
          subcategory: 'test',
          ucr_code: null
        },
        severity: 'felony',
        description: 'Test',
        caseNumber: null,
        resolved: false
      };

      mockQuery.mockRejectedValueOnce(new Error('Check constraint violation'));

      await expect(dbService.insertCrimeIncident(crimeIncident)).rejects.toThrow('Check constraint violation');
    });
  });

  describe('SQL query structure', () => {
    it('should use correct table names and column names', async () => {
      const moonPhase: MoonPhaseData = {
        timestamp: new Date('2024-01-01T00:00:00Z'),
        phaseName: 'full',
        illuminationPercent: 100,
        phaseAngle: 180,
        distanceKm: 384400,
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: 'Test',
          jurisdiction: 'test_jurisdiction'
        }
      };

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await dbService.insertMoonPhase(moonPhase);

      const [query] = mockQuery.mock.calls[0];
      
      // Verify correct table and column names
      expect(query).toContain('INSERT INTO moon_phases');
      expect(query).toContain('timestamp');
      expect(query).toContain('phase_name');
      expect(query).toContain('illumination_percent');
      expect(query).toContain('phase_angle');
      expect(query).toContain('distance_km');
      expect(query).toContain('latitude');
      expect(query).toContain('longitude');
      expect(query).toContain('address');
      expect(query).toContain('jurisdiction');
    });

    it('should use parameterized queries for security', async () => {
      const crimeIncident: CrimeIncident = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: 'Test',
          jurisdiction: 'test_jurisdiction'
        },
        crimeType: {
          category: 'violent',
          subcategory: 'assault',
          ucr_code: '13A'
        },
        severity: 'felony',
        description: 'Test crime incident',
        caseNumber: 'CASE-2024-001',
        resolved: false
      };

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await dbService.insertCrimeIncident(crimeIncident);

      const [query, params] = mockQuery.mock.calls[0];
      
      // Verify parameterized query structure
      expect(query).toContain('$1');
      expect(query).toContain('$13'); // Should have 13 parameters
      expect(params).toHaveLength(13);
      expect(params).toEqual([
        crimeIncident.id,
        crimeIncident.timestamp,
        crimeIncident.location.latitude,
        crimeIncident.location.longitude,
        crimeIncident.crimeType.category,
        crimeIncident.crimeType.subcategory,
        crimeIncident.crimeType.ucr_code,
        crimeIncident.severity,
        crimeIncident.description,
        crimeIncident.caseNumber,
        crimeIncident.location.jurisdiction,
        crimeIncident.resolved,
        crimeIncident.location.address
      ]);
    });
  });
});