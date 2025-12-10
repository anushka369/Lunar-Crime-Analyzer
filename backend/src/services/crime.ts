import axios, { AxiosResponse } from 'axios';
import { CrimeIncident, CrimeType, GeographicCoordinate, validateCrimeIncident, validateGeographicCoordinate } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { 
  RetryService, 
  crimeDataCircuitBreaker, 
  crimeDataRateLimiter, 
  fallbackCache 
} from './retry';

// External API response interfaces
interface SocrataResponse {
  data: Array<{
    [key: string]: string | number | null;
  }>;
}

interface FBIUCRResponse {
  results: Array<{
    incident_id: string;
    date_occurred: string;
    offense_type: string;
    offense_category: string;
    latitude: number;
    longitude: number;
    address: string;
    jurisdiction: string;
    case_status: string;
  }>;
}

export class CrimeDataFetcher {
  private readonly requestTimeout: number = 30000; // 30 seconds
  private readonly maxRecordsPerRequest: number = 1000;

  constructor() {}

  /**
   * Fetch crime data for a specific location and date range
   * Requirements: 2.2, 2.5, 6.2
   */
  async fetchCrimeData(
    location: GeographicCoordinate,
    startDate: Date,
    endDate: Date,
    crimeTypes?: CrimeType[]
  ): Promise<CrimeIncident[]> {
    try {
      const crimeIncidents: CrimeIncident[] = [];
      
      // Try multiple data sources for comprehensive coverage
      const dataSources = [
        () => this.fetchFromSocrata(location, startDate, endDate, crimeTypes),
        () => this.fetchFromOpenDataPortal(location, startDate, endDate, crimeTypes),
        () => this.fetchFromLocalAPI(location, startDate, endDate, crimeTypes)
      ];

      // Attempt to fetch from each data source
      for (const fetchFunction of dataSources) {
        try {
          const sourceData = await fetchFunction();
          crimeIncidents.push(...sourceData);
        } catch (error) {
          // Log error but continue with other sources
          console.warn(`Crime data source failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Remove duplicates based on case number or location+time
      const uniqueIncidents = this.removeDuplicates(crimeIncidents);
      
      // Validate and normalize all incidents
      return uniqueIncidents.map(incident => this.normalizeIncident(incident));
    } catch (error) {
      throw new Error(`Failed to fetch crime data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch crime data from Socrata-based open data portals
   * Requirements: 2.3 - Implements retry logic and error handling
   */
  private async fetchFromSocrata(
    location: GeographicCoordinate,
    startDate: Date,
    endDate: Date,
    crimeTypes?: CrimeType[]
  ): Promise<CrimeIncident[]> {
    const cacheKey = `crime-${location.latitude}-${location.longitude}-${startDate.toISOString()}-${endDate.toISOString()}-${crimeTypes?.map(ct => ct.category).join(',')}`;
    
    // Check fallback cache first
    const cachedData = fallbackCache.get(cacheKey);
    if (cachedData) {
      console.info('Using cached crime data');
      return cachedData;
    }

    // Check rate limiting
    if (!crimeDataRateLimiter.isAllowed()) {
      const waitTime = crimeDataRateLimiter.getTimeUntilReset();
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds`);
    }

    try {
      return await crimeDataCircuitBreaker.execute(async () => {
        return await RetryService.executeWithRetry(async () => {
          // Example: NYC Open Data API (many cities use Socrata)
          const baseUrl = 'https://data.cityofnewyork.us/resource/5uac-w243.json';
          
          // Build query parameters
          const params = new URLSearchParams({
            '$limit': this.maxRecordsPerRequest.toString(),
            '$where': this.buildSocrataWhereClause(location, startDate, endDate, crimeTypes),
            '$order': 'cmplnt_fr_dt DESC'
          });

          const response: AxiosResponse = await axios.get(`${baseUrl}?${params}`, {
            timeout: this.requestTimeout,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'LunarCrimeAnalyzer/1.0'
            }
          });

          const crimeData = this.parseSocrataResponse(response.data, location);
          
          // Cache successful response
          if (crimeData.length > 0) {
            fallbackCache.set(cacheKey, crimeData, 60 * 60 * 1000); // Cache for 1 hour
          }
          
          return crimeData;
        }, {
          maxRetries: 5,
          baseDelay: 1000,
          maxDelay: 16000,
          jitter: true
        }).then(result => result.data);
      });
    } catch (error) {
      // Handle specific error cases
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return []; // No data available
      }
      
      // For other errors, try to use cached data even if expired
      const expiredCache = fallbackCache.get(cacheKey);
      if (expiredCache) {
        console.warn('Using expired cached crime data due to API failure');
        return expiredCache;
      }
      
      throw error;
    }
  }

  /**
   * Fetch crime data from generic open data portals
   */
  private async fetchFromOpenDataPortal(
    location: GeographicCoordinate,
    startDate: Date,
    endDate: Date,
    crimeTypes?: CrimeType[]
  ): Promise<CrimeIncident[]> {
    try {
      // This would be configured based on the specific jurisdiction
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Fetch crime data from local/regional APIs
   */
  private async fetchFromLocalAPI(
    location: GeographicCoordinate,
    startDate: Date,
    endDate: Date,
    crimeTypes?: CrimeType[]
  ): Promise<CrimeIncident[]> {
    try {
      // This would be configured based on the specific jurisdiction
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Build WHERE clause for Socrata API queries
   */
  private buildSocrataWhereClause(
    location: GeographicCoordinate,
    startDate: Date,
    endDate: Date,
    crimeTypes?: CrimeType[]
  ): string {
    const conditions: string[] = [];
    
    // Date range filter
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    conditions.push(`cmplnt_fr_dt >= '${startDateStr}' AND cmplnt_fr_dt <= '${endDateStr}'`);
    
    // Geographic bounding box (approximate 10km radius)
    const latDelta = 0.09; // ~10km
    const lonDelta = 0.09; // ~10km
    conditions.push(
      `latitude BETWEEN ${location.latitude - latDelta} AND ${location.latitude + latDelta}`
    );
    conditions.push(
      `longitude BETWEEN ${location.longitude - lonDelta} AND ${location.longitude + lonDelta}`
    );
    
    // Crime type filter
    if (crimeTypes && crimeTypes.length > 0) {
      const crimeTypeConditions = crimeTypes.map(ct => `ofns_desc LIKE '%${ct.subcategory}%'`);
      conditions.push(`(${crimeTypeConditions.join(' OR ')})`);
    }
    
    return conditions.join(' AND ');
  }

  /**
   * Parse Socrata API response into CrimeIncident objects
   */
  private parseSocrataResponse(data: any[], location: GeographicCoordinate): CrimeIncident[] {
    const incidents: CrimeIncident[] = [];
    
    for (const record of data) {
      try {
        const incident = this.parseSocrataRecord(record, location);
        if (incident) {
          incidents.push(incident);
        }
      } catch (error) {
        // Skip invalid records but log the error
        console.warn(`Failed to parse crime record: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return incidents;
  }

  /**
   * Parse individual Socrata record
   */
  private parseSocrataRecord(record: any, defaultLocation: GeographicCoordinate): CrimeIncident | null {
    try {
      // Extract and validate required fields
      const timestamp = this.parseTimestamp(record.cmplnt_fr_dt || record.rpt_dt);
      if (!timestamp) return null;

      const latitude = parseFloat(record.latitude || record.lat);
      const longitude = parseFloat(record.longitude || record.lon);
      
      // Use provided coordinates or fall back to default location
      const incidentLocation: GeographicCoordinate = {
        latitude: isNaN(latitude) ? defaultLocation.latitude : latitude,
        longitude: isNaN(longitude) ? defaultLocation.longitude : longitude,
        address: record.addr_pct_cd || record.incident_address || defaultLocation.address,
        jurisdiction: record.boro_nm || record.jurisdiction || defaultLocation.jurisdiction
      };

      // Validate coordinates
      if (!this.validateCoordinates(incidentLocation)) {
        incidentLocation.latitude = defaultLocation.latitude;
        incidentLocation.longitude = defaultLocation.longitude;
      }

      const crimeType = this.normalizeCrimeType(
        record.ofns_desc || record.offense_description || 'Unknown',
        record.law_cat_cd || record.offense_category || 'Unknown'
      );

      const severity = this.normalizeSeverity(record.law_cat_cd || record.offense_level || 'MISDEMEANOR');

      const incident: CrimeIncident = {
        id: uuidv4(), // Always generate a UUID for the ID
        timestamp,
        location: incidentLocation,
        crimeType,
        severity,
        description: record.ofns_desc || record.offense_description || 'No description available',
        caseNumber: record.cmplnt_num || record.case_number || undefined,
        resolved: this.parseResolutionStatus(record.status_desc || record.case_status)
      };

      // Validate the incident - if validation fails, return null
      try {
        return validateCrimeIncident(incident);
      } catch (error) {
        console.warn(`Crime incident validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse timestamp from various formats
   * Requirements: 6.2
   */
  private parseTimestamp(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    
    try {
      // Handle various date formats
      const cleanDateStr = dateStr.toString().trim();
      
      // ISO format
      if (cleanDateStr.includes('T')) {
        return new Date(cleanDateStr);
      }
      
      // MM/DD/YYYY format
      if (cleanDateStr.includes('/')) {
        const parts = cleanDateStr.split('/');
        if (parts.length === 3) {
          const [month, day, year] = parts;
          return new Date(parseInt(year!), parseInt(month!) - 1, parseInt(day!));
        }
      }
      
      // YYYY-MM-DD format
      if (cleanDateStr.includes('-')) {
        return new Date(cleanDateStr);
      }
      
      // Fallback to Date constructor
      const parsed = new Date(cleanDateStr);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch (error) {
      return null;
    }
  }

  /**
   * Normalize crime type from various API formats
   * Requirements: 2.5
   */
  private normalizeCrimeType(description: string, category: string): CrimeType {
    const desc = description.toLowerCase();
    const cat = category.toLowerCase();
    
    // Map to standard categories
    let standardCategory: CrimeType['category'] = 'public_order';
    
    if (desc.includes('assault') || desc.includes('battery') || desc.includes('homicide') || 
        desc.includes('robbery') || desc.includes('rape') || desc.includes('murder')) {
      standardCategory = 'violent';
    } else if (desc.includes('burglary') || desc.includes('theft') || desc.includes('larceny') || 
               desc.includes('stolen') || desc.includes('vandalism')) {
      standardCategory = 'property';
    } else if (desc.includes('drug') || desc.includes('narcotic') || desc.includes('controlled substance')) {
      standardCategory = 'drug';
    } else if (desc.includes('fraud') || desc.includes('embezzlement') || desc.includes('forgery')) {
      standardCategory = 'white_collar';
    }
    
    return {
      category: standardCategory,
      subcategory: description,
      ucr_code: this.mapToUCRCode(description)
    };
  }

  /**
   * Map crime description to FBI UCR code
   */
  private mapToUCRCode(description: string): string | undefined {
    const desc = description.toLowerCase();
    
    const ucrMapping: { [key: string]: string } = {
      'murder': '09A',
      'rape': '11A',
      'robbery': '120',
      'assault': '13A',
      'burglary': '220',
      'larceny': '23A',
      'motor vehicle theft': '240',
      'arson': '200'
    };
    
    for (const [crime, code] of Object.entries(ucrMapping)) {
      if (desc.includes(crime)) {
        return code;
      }
    }
    
    return undefined;
  }

  /**
   * Normalize severity level
   */
  private normalizeSeverity(severityStr: string): CrimeIncident['severity'] {
    const severity = severityStr.toLowerCase();
    
    if (severity.includes('felony')) return 'felony';
    if (severity.includes('violation')) return 'violation';
    return 'misdemeanor';
  }

  /**
   * Parse case resolution status
   */
  private parseResolutionStatus(statusStr: string | null | undefined): boolean {
    if (!statusStr) return false;
    
    const status = statusStr.toLowerCase();
    return status.includes('closed') || status.includes('solved') || status.includes('cleared');
  }

  /**
   * Validate geographic coordinates
   * Requirements: 2.5
   */
  private validateCoordinates(location: GeographicCoordinate): boolean {
    return (
      location.latitude >= -90 && 
      location.latitude <= 90 &&
      location.longitude >= -180 && 
      location.longitude <= 180 &&
      !isNaN(location.latitude) &&
      !isNaN(location.longitude)
    );
  }

  /**
   * Remove duplicate crime incidents
   */
  private removeDuplicates(incidents: CrimeIncident[]): CrimeIncident[] {
    const seen = new Set<string>();
    const unique: CrimeIncident[] = [];
    
    for (const incident of incidents) {
      // Create unique key based on case number or location+time+type
      const key = incident.caseNumber || 
        `${incident.location.latitude}_${incident.location.longitude}_${incident.timestamp.getTime()}_${incident.crimeType.subcategory}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(incident);
      }
    }
    
    return unique;
  }

  /**
   * Normalize incident data to ensure consistency
   * Requirements: 2.5, 6.2
   */
  private normalizeIncident(incident: CrimeIncident): CrimeIncident {
    return {
      ...incident,
      // Ensure coordinates are properly validated
      location: {
        ...incident.location,
        latitude: Math.round(incident.location.latitude * 1000000) / 1000000, // 6 decimal places
        longitude: Math.round(incident.location.longitude * 1000000) / 1000000
      },
      // Ensure description is not empty
      description: incident.description.trim() || 'No description available',
      // Normalize case number format
      caseNumber: incident.caseNumber?.trim() || undefined
    };
  }

  /**
   * Check if crime data is available for the given location and date range
   */
  async checkDataAvailability(
    location: GeographicCoordinate,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    try {
      // Validate coordinates
      if (!this.validateCoordinates(location)) {
        return false;
      }

      // Check if date range is reasonable
      const now = new Date();
      const maxPastDate = new Date(now.getFullYear() - 20, 0, 1); // 20 years ago
      const maxFutureDate = new Date(now.getFullYear(), 11, 31); // End of current year

      if (startDate < maxPastDate || endDate > maxFutureDate || startDate > endDate) {
        return false;
      }

      // Try a small test query to check data availability
      try {
        const testData = await this.fetchFromSocrata(location, startDate, new Date(startDate.getTime() + 24 * 60 * 60 * 1000));
        return true; // If no error, data is available
      } catch (error) {
        return false;
      }
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const crimeDataFetcher = new CrimeDataFetcher();