import { z } from 'zod';

// Core Data Interfaces
export interface GeographicCoordinate {
  latitude: number;
  longitude: number;
  address?: string | null | undefined;
  jurisdiction: string;
}

export interface CrimeType {
  category: 'violent' | 'property' | 'drug' | 'public_order' | 'white_collar';
  subcategory: string;
  ucr_code?: string | null | undefined; // FBI Uniform Crime Reporting code
}

export interface MoonPhaseData {
  timestamp: Date;
  phaseName: 'new' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous' | 
            'full' | 'waning_gibbous' | 'last_quarter' | 'waning_crescent';
  illuminationPercent: number; // 0-100
  phaseAngle: number; // 0-360 degrees
  distanceKm: number;
  location: GeographicCoordinate;
}

export interface CrimeIncident {
  id: string;
  timestamp: Date;
  location: GeographicCoordinate;
  crimeType: CrimeType;
  severity: 'misdemeanor' | 'felony' | 'violation';
  description: string;
  caseNumber?: string | null | undefined;
  resolved: boolean;
}

export interface CorrelationResult {
  crimeType: CrimeType;
  moonPhase: string;
  correlationCoefficient: number;
  pValue: number;
  confidenceInterval: [number, number];
  sampleSize: number;
  significanceLevel: number;
}

// Additional Statistical Analysis Interfaces
export interface StatisticalSummary {
  totalCrimeIncidents: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  location: GeographicCoordinate;
  correlationResults: CorrelationResult[];
  significantCorrelations: CorrelationResult[];
  overallSignificance: number;
}

export interface DataAvailability {
  locationId: string;
  jurisdiction: string;
  crimeDataAvailable: boolean;
  moonDataAvailable: boolean;
  dateRangeStart?: Date | null | undefined;
  dateRangeEnd?: Date | null | undefined;
  supportedCrimeTypes: CrimeType[];
}

export interface LocationInfo {
  id: string;
  name: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
  population?: number;
  timezone?: string;
  coordinates: GeographicCoordinate;
  jurisdiction: string;
  dataAvailability: DataAvailability;
}

export interface DataAvailability {
  locationId: string;
  jurisdiction: string;
  crimeDataAvailable: boolean;
  moonDataAvailable: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  limitations?: string[];
  dataQuality?: 'high' | 'medium' | 'low';
  supportedCrimeTypes: CrimeType[];
}

export interface StatisticalSummary {
  totalCrimeIncidents: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  location: GeographicCoordinate;
  correlationResults: CorrelationResult[];
  significantCorrelations: CorrelationResult[];
  overallSignificance: number;
  overallCorrelation: number;
  totalSampleSize: number;
  analysisDateRange: {
    start: Date;
    end: Date;
  };
  confidenceLevel: number;
}

export interface CorrelationAnalysis {
  id: string;
  location: LocationInfo;
  dateRange: {
    start: Date;
    end: Date;
  };
  filters: {
    crimeTypes?: CrimeType[];
    severityLevels?: ('misdemeanor' | 'felony' | 'violation')[];
    timeOfDay?: {
      startHour: number;
      endHour: number;
    };
  };
  results: CorrelationResult[];
  statistics: StatisticalSummary;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportResult {
  id: string;
  format: 'png' | 'pdf' | 'csv';
  url: string;
  expiresAt: Date;
  analysisId: string;
}

export interface SharedAnalysis {
  id: string;
  analysisConfig: CorrelationAnalysis;
  shareUrl: string;
  createdAt: Date;
  expiresAt?: Date | null | undefined;
}

// Additional types for API integration
export interface CorrelationDataPoint {
  crimeIncident: CrimeIncident;
  moonPhase: MoonPhaseData;
  correlationValue?: number;
}

export interface ExportConfiguration {
  format: 'png' | 'pdf' | 'csv';
  includeCharts: boolean;
  includeStatistics: boolean;
  includeRawData: boolean;
  customTitle?: string;
  customDescription?: string;
}

export interface ShareableAnalysis {
  id: string;
  location: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  filters: any; // FilterState type would be imported from frontend
  exportConfig: ExportConfiguration;
  createdAt: Date;
  expiresAt?: Date;
}

// Zod Validation Schemas
export const GeographicCoordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional().nullable(),
  jurisdiction: z.string().min(1)
});

export const CrimeTypeSchema = z.object({
  category: z.enum(['violent', 'property', 'drug', 'public_order', 'white_collar']),
  subcategory: z.string().min(1),
  ucr_code: z.string().optional().nullable()
});

export const MoonPhaseDataSchema = z.object({
  timestamp: z.date(),
  phaseName: z.enum(['new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 
                     'full', 'waning_gibbous', 'last_quarter', 'waning_crescent']),
  illuminationPercent: z.number().min(0).max(100),
  phaseAngle: z.number().min(0).max(360),
  distanceKm: z.number().positive(),
  location: GeographicCoordinateSchema
});

export const CrimeIncidentSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  location: GeographicCoordinateSchema,
  crimeType: CrimeTypeSchema,
  severity: z.enum(['misdemeanor', 'felony', 'violation']),
  description: z.string().min(1),
  caseNumber: z.string().optional().nullable(),
  resolved: z.boolean()
});

export const CorrelationResultSchema = z.object({
  crimeType: CrimeTypeSchema,
  moonPhase: z.string().min(1),
  correlationCoefficient: z.number().min(-1).max(1),
  pValue: z.number().min(0).max(1),
  confidenceInterval: z.tuple([z.number(), z.number()]),
  sampleSize: z.number().int().positive(),
  significanceLevel: z.number().min(0).max(1)
});

export const StatisticalSummarySchema = z.object({
  totalCrimeIncidents: z.number().int().nonnegative(),
  dateRange: z.object({
    start: z.date(),
    end: z.date()
  }),
  location: GeographicCoordinateSchema,
  correlationResults: z.array(CorrelationResultSchema),
  significantCorrelations: z.array(CorrelationResultSchema),
  overallSignificance: z.number().min(0).max(1)
});

export const DataAvailabilitySchema = z.object({
  locationId: z.string().min(1),
  jurisdiction: z.string().min(1),
  crimeDataAvailable: z.boolean(),
  moonDataAvailable: z.boolean(),
  dateRangeStart: z.date().optional().nullable(),
  dateRangeEnd: z.date().optional().nullable(),
  supportedCrimeTypes: z.array(CrimeTypeSchema)
});

export const LocationInfoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  coordinates: GeographicCoordinateSchema,
  jurisdiction: z.string().min(1),
  population: z.number().int().positive().optional().nullable(),
  dataAvailability: DataAvailabilitySchema
});

// Validation helper functions
export const validateMoonPhaseData = (data: unknown): MoonPhaseData => {
  return MoonPhaseDataSchema.parse(data);
};

export const validateCrimeIncident = (data: unknown): CrimeIncident => {
  return CrimeIncidentSchema.parse(data);
};

export const validateCorrelationResult = (data: unknown): CorrelationResult => {
  return CorrelationResultSchema.parse(data);
};

export const validateGeographicCoordinate = (data: unknown): GeographicCoordinate => {
  return GeographicCoordinateSchema.parse(data);
};

export const validateCrimeType = (data: unknown): CrimeType => {
  return CrimeTypeSchema.parse(data);
};