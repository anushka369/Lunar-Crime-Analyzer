// Frontend data types for visualization components

export interface GeographicCoordinate {
  latitude: number;
  longitude: number;
  address?: string;
  jurisdiction: string;
}

export interface CrimeType {
  category: 'violent' | 'property' | 'drug' | 'public_order' | 'white_collar';
  subcategory: string;
  ucr_code?: string;
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
  caseNumber?: string;
  resolved: boolean;
}

export interface CorrelationDataPoint {
  crimeIncident: CrimeIncident;
  moonPhase: MoonPhaseData;
  correlationValue?: number;
}

export interface ChartDimensions {
  width: number;
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface TooltipData {
  crimeIncident: CrimeIncident;
  moonPhase: MoonPhaseData;
  x: number;
  y: number;
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

export interface StatisticalSummary {
  overallCorrelation: number;
  significantCorrelations: CorrelationResult[];
  totalSampleSize: number;
  analysisDateRange: {
    start: Date;
    end: Date;
  };
  location: string;
  confidenceLevel: number;
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
  filters: any; // FilterState type would be imported from filters.ts
  exportConfig: ExportConfiguration;
  createdAt: Date;
  expiresAt?: Date;
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
}

export interface DataAvailability {
  crimeDataAvailable: boolean;
  moonDataAvailable: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  limitations?: string[];
  dataQuality?: 'high' | 'medium' | 'low';
}