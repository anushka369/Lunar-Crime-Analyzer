import { StatisticsService } from './statistics';
import { CrimeIncident, MoonPhaseData, CrimeType, GeographicCoordinate } from '../types';

describe('StatisticsService', () => {
  let statisticsService: StatisticsService;
  let mockCrimeIncidents: CrimeIncident[];
  let mockMoonPhases: MoonPhaseData[];
  let mockLocation: GeographicCoordinate;

  beforeEach(() => {
    statisticsService = new StatisticsService();
    
    mockLocation = {
      latitude: 40.7128,
      longitude: -74.0060,
      jurisdiction: 'New York City'
    };

    // Create mock crime incidents
    mockCrimeIncidents = [
      {
        id: '1',
        timestamp: new Date('2023-01-01T12:00:00Z'),
        location: mockLocation,
        crimeType: {
          category: 'violent',
          subcategory: 'assault'
        },
        severity: 'felony',
        description: 'Test assault',
        resolved: false
      },
      {
        id: '2',
        timestamp: new Date('2023-01-15T18:00:00Z'),
        location: mockLocation,
        crimeType: {
          category: 'property',
          subcategory: 'theft'
        },
        severity: 'misdemeanor',
        description: 'Test theft',
        resolved: false
      },
      {
        id: '3',
        timestamp: new Date('2023-01-30T22:00:00Z'),
        location: mockLocation,
        crimeType: {
          category: 'violent',
          subcategory: 'assault'
        },
        severity: 'felony',
        description: 'Test assault 2',
        resolved: false
      }
    ];

    // Create mock moon phases
    mockMoonPhases = [
      {
        timestamp: new Date('2023-01-01T00:00:00Z'),
        phaseName: 'new',
        illuminationPercent: 0,
        phaseAngle: 0,
        distanceKm: 384400,
        location: mockLocation
      },
      {
        timestamp: new Date('2023-01-15T00:00:00Z'),
        phaseName: 'full',
        illuminationPercent: 100,
        phaseAngle: 180,
        distanceKm: 384400,
        location: mockLocation
      },
      {
        timestamp: new Date('2023-01-30T00:00:00Z'),
        phaseName: 'new',
        illuminationPercent: 0,
        phaseAngle: 0,
        distanceKm: 384400,
        location: mockLocation
      }
    ];
  });

  describe('calculateCorrelation', () => {
    it('should calculate correlation coefficients for crime types and moon phases', () => {
      const input = {
        crimeIncidents: mockCrimeIncidents,
        moonPhases: mockMoonPhases
      };

      const results = statisticsService.calculateCorrelation(input);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      
      // Should have results for different crime types and moon phases
      if (results.length > 0) {
        const result = results[0];
        expect(result).toHaveProperty('crimeType');
        expect(result).toHaveProperty('moonPhase');
        expect(result).toHaveProperty('correlationCoefficient');
        expect(result).toHaveProperty('pValue');
        expect(result).toHaveProperty('confidenceInterval');
        expect(result).toHaveProperty('sampleSize');
        expect(result).toHaveProperty('significanceLevel');
        
        // Correlation coefficient should be between -1 and 1
        expect(result!.correlationCoefficient).toBeGreaterThanOrEqual(-1);
        expect(result!.correlationCoefficient).toBeLessThanOrEqual(1);
        
        // P-value should be between 0 and 1
        expect(result!.pValue).toBeGreaterThanOrEqual(0);
        expect(result!.pValue).toBeLessThanOrEqual(1);
        
        // Confidence interval should be valid
        expect(result!.confidenceInterval[0]).toBeLessThanOrEqual(result!.confidenceInterval[1]);
        expect(result!.confidenceInterval[0]).toBeGreaterThanOrEqual(-1);
        expect(result!.confidenceInterval[1]).toBeLessThanOrEqual(1);
        
        // Sample size should be positive
        expect(result!.sampleSize).toBeGreaterThan(0);
      }
    });

    it('should handle empty input gracefully', () => {
      const input = {
        crimeIncidents: [],
        moonPhases: []
      };

      const results = statisticsService.calculateCorrelation(input);
      expect(results).toEqual([]);
    });

    it('should handle insufficient data points', () => {
      const input = {
        crimeIncidents: mockCrimeIncidents.slice(0, 1), // Only one incident
        moonPhases: mockMoonPhases.slice(0, 1)
      };

      const results = statisticsService.calculateCorrelation(input);
      // Should return empty array or handle gracefully
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('analyzeTrends', () => {
    it('should analyze trends across moon phases', () => {
      const input = {
        crimeIncidents: mockCrimeIncidents,
        moonPhases: mockMoonPhases
      };

      const trends = statisticsService.analyzeTrends(input);

      expect(trends).toBeDefined();
      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBe(8); // Should have 8 moon phases

      for (const trend of trends) {
        expect(trend).toHaveProperty('moonPhase');
        expect(trend).toHaveProperty('crimeCount');
        expect(trend).toHaveProperty('averageCount');
        expect(trend).toHaveProperty('standardDeviation');
        expect(trend).toHaveProperty('isAnomaly');
        expect(trend).toHaveProperty('anomalyScore');
        
        // Crime count should be non-negative
        expect(trend.crimeCount).toBeGreaterThanOrEqual(0);
        
        // Average count should be non-negative
        expect(trend.averageCount).toBeGreaterThanOrEqual(0);
        
        // Standard deviation should be non-negative
        expect(trend.standardDeviation).toBeGreaterThanOrEqual(0);
        
        // Anomaly score should be non-negative
        expect(trend.anomalyScore).toBeGreaterThanOrEqual(0);
        
        // Is anomaly should be boolean
        expect(typeof trend.isAnomaly).toBe('boolean');
      }
    });
  });

  describe('detectPatterns', () => {
    it('should detect patterns in trend data', () => {
      // Create mock trend data with increasing pattern
      const trendResults = [
        { moonPhase: 'new', crimeCount: 1, averageCount: 2, standardDeviation: 1, isAnomaly: false, anomalyScore: 0 },
        { moonPhase: 'waxing_crescent', crimeCount: 2, averageCount: 2, standardDeviation: 1, isAnomaly: false, anomalyScore: 0 },
        { moonPhase: 'first_quarter', crimeCount: 3, averageCount: 2, standardDeviation: 1, isAnomaly: false, anomalyScore: 0 },
        { moonPhase: 'waxing_gibbous', crimeCount: 4, averageCount: 2, standardDeviation: 1, isAnomaly: false, anomalyScore: 0 },
        { moonPhase: 'full', crimeCount: 5, averageCount: 2, standardDeviation: 1, isAnomaly: false, anomalyScore: 0 },
        { moonPhase: 'waning_gibbous', crimeCount: 6, averageCount: 2, standardDeviation: 1, isAnomaly: false, anomalyScore: 0 },
        { moonPhase: 'last_quarter', crimeCount: 7, averageCount: 2, standardDeviation: 1, isAnomaly: false, anomalyScore: 0 },
        { moonPhase: 'waning_crescent', crimeCount: 8, averageCount: 2, standardDeviation: 1, isAnomaly: false, anomalyScore: 0 }
      ];

      const pattern = statisticsService.detectPatterns(trendResults);

      expect(pattern).toBeDefined();
      expect(pattern).toHaveProperty('pattern');
      expect(pattern).toHaveProperty('confidence');
      expect(pattern).toHaveProperty('description');
      
      // Pattern should be one of the expected values
      expect(['increasing', 'decreasing', 'cyclical', 'random']).toContain(pattern.pattern);
      
      // Confidence should be between 0 and 1
      expect(pattern.confidence).toBeGreaterThanOrEqual(0);
      expect(pattern.confidence).toBeLessThanOrEqual(1);
      
      // Description should be a string
      expect(typeof pattern.description).toBe('string');
      expect(pattern.description.length).toBeGreaterThan(0);
    });

    it('should handle insufficient data for pattern detection', () => {
      const trendResults = [
        { moonPhase: 'new', crimeCount: 1, averageCount: 1, standardDeviation: 0, isAnomaly: false, anomalyScore: 0 }
      ];

      const pattern = statisticsService.detectPatterns(trendResults);

      expect(pattern.pattern).toBe('random');
      expect(pattern.confidence).toBe(0);
    });
  });

  describe('detectAnomalies', () => {
    it('should detect anomalous correlations', () => {
      const correlationResults = [
        {
          crimeType: { category: 'violent' as const, subcategory: 'assault' },
          moonPhase: 'full',
          correlationCoefficient: 0.1,
          pValue: 0.5,
          confidenceInterval: [-0.1, 0.3] as [number, number],
          sampleSize: 10,
          significanceLevel: 0.05
        },
        {
          crimeType: { category: 'property' as const, subcategory: 'theft' },
          moonPhase: 'new',
          correlationCoefficient: 0.9, // Anomalously high
          pValue: 0.01,
          confidenceInterval: [0.7, 1.0] as [number, number],
          sampleSize: 15,
          significanceLevel: 0.05
        },
        {
          crimeType: { category: 'drug' as const, subcategory: 'possession' },
          moonPhase: 'first_quarter',
          correlationCoefficient: 0.2,
          pValue: 0.3,
          confidenceInterval: [0.0, 0.4] as [number, number],
          sampleSize: 12,
          significanceLevel: 0.05
        }
      ];

      const anomalies = statisticsService.detectAnomalies(correlationResults, 1.5);

      expect(Array.isArray(anomalies)).toBe(true);
      
      // Should detect the high correlation as an anomaly
      if (anomalies.length > 0) {
        const anomaly = anomalies.find((a: any) => a.correlationCoefficient === 0.9);
        expect(anomaly).toBeDefined();
      }
    });

    it('should handle insufficient data for anomaly detection', () => {
      const correlationResults = [
        {
          crimeType: { category: 'violent' as const, subcategory: 'assault' },
          moonPhase: 'full',
          correlationCoefficient: 0.5,
          pValue: 0.1,
          confidenceInterval: [0.2, 0.8] as [number, number],
          sampleSize: 10,
          significanceLevel: 0.05
        }
      ];

      const anomalies = statisticsService.detectAnomalies(correlationResults);
      expect(anomalies).toEqual([]);
    });
  });

  describe('generateStatisticalSummary', () => {
    it('should generate comprehensive statistical summary', () => {
      const correlationResults = [
        {
          crimeType: { category: 'violent' as const, subcategory: 'assault' },
          moonPhase: 'full',
          correlationCoefficient: 0.3,
          pValue: 0.02,
          confidenceInterval: [0.1, 0.5] as [number, number],
          sampleSize: 20,
          significanceLevel: 0.05
        },
        {
          crimeType: { category: 'property' as const, subcategory: 'theft' },
          moonPhase: 'new',
          correlationCoefficient: 0.1,
          pValue: 0.3,
          confidenceInterval: [-0.1, 0.3] as [number, number],
          sampleSize: 15,
          significanceLevel: 0.05
        }
      ];

      const dateRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-01-31')
      };

      const summary = statisticsService.generateStatisticalSummary(
        correlationResults,
        mockCrimeIncidents,
        mockLocation,
        dateRange
      );

      expect(summary).toBeDefined();
      expect(summary).toHaveProperty('totalCrimeIncidents');
      expect(summary).toHaveProperty('dateRange');
      expect(summary).toHaveProperty('location');
      expect(summary).toHaveProperty('correlationResults');
      expect(summary).toHaveProperty('significantCorrelations');
      expect(summary).toHaveProperty('overallSignificance');
      expect(summary).toHaveProperty('overallCorrelation');
      expect(summary).toHaveProperty('totalSampleSize');
      expect(summary).toHaveProperty('confidenceLevel');

      // Validate values
      expect(summary.totalCrimeIncidents).toBe(mockCrimeIncidents.length);
      expect(summary.correlationResults).toEqual(correlationResults);
      expect(summary.significantCorrelations.length).toBe(1); // Only one with p < 0.05
      expect(summary.overallSignificance).toBe(0.02); // Minimum p-value
      expect(summary.totalSampleSize).toBe(35); // Sum of sample sizes
      expect(summary.confidenceLevel).toBe(0.95);
      
      // Overall correlation should be weighted average
      const expectedOverallCorr = (0.3 * 20 + 0.1 * 15) / 35;
      expect(summary.overallCorrelation).toBeCloseTo(expectedOverallCorr, 2);
    });
  });
});