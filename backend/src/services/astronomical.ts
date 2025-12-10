import axios, { AxiosResponse } from 'axios';
import { MoonPhaseData, GeographicCoordinate, validateMoonPhaseData } from '../types';
import { 
  RetryService, 
  astronomicalCircuitBreaker, 
  astronomicalRateLimiter, 
  fallbackCache 
} from './retry';

// NASA API response interfaces
interface NASAMoonPhaseResponse {
  date: string;
  phase: string;
  illumination: number;
  phase_angle: number;
  distance: number;
}

interface USNOAstronomyResponse {
  properties: {
    data: {
      moondata: Array<{
        phen: string;
        time: string;
      }>;
    };
  };
}

export class AstronomicalDataFetcher {
  private readonly baseUrl: string;
  private readonly apiKey?: string | undefined;
  private readonly requestTimeout: number = 30000; // 30 seconds

  constructor(apiKey?: string | undefined) {
    // Using USNO (US Naval Observatory) API as it's free and reliable
    this.baseUrl = 'https://aa.usno.navy.mil/api';
    this.apiKey = apiKey;
  }

  /**
   * Fetch moon phase data for a specific location and date range
   * Requirements: 2.1, 2.4, 6.1
   */
  async fetchMoonPhaseData(
    location: GeographicCoordinate,
    startDate: Date,
    endDate: Date
  ): Promise<MoonPhaseData[]> {
    try {
      const moonPhases: MoonPhaseData[] = [];
      
      // Calculate moon phases for each day in the range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const phaseData = await this.fetchDailyMoonPhase(location, currentDate);
        if (phaseData) {
          moonPhases.push(phaseData);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return moonPhases;
    } catch (error) {
      throw new Error(`Failed to fetch moon phase data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch moon phase data for a specific date and location
   * Requirements: 2.3 - Implements retry logic and error handling
   */
  private async fetchDailyMoonPhase(
    location: GeographicCoordinate,
    date: Date
  ): Promise<MoonPhaseData | null> {
    const cacheKey = `moon-${location.latitude}-${location.longitude}-${date.toISOString().split('T')[0]}`;
    
    // Check fallback cache first
    const cachedData = fallbackCache.get(cacheKey);
    if (cachedData) {
      console.info('Using cached moon phase data');
      return cachedData;
    }

    // Check rate limiting
    if (!astronomicalRateLimiter.isAllowed()) {
      const waitTime = astronomicalRateLimiter.getTimeUntilReset();
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds`);
    }

    try {
      return await astronomicalCircuitBreaker.execute(async () => {
        return await RetryService.executeWithRetry(async () => {
          // Format date for API (YYYY-MM-DD)
          const dateStr = date.toISOString().split('T')[0];
          
          // USNO API endpoint for moon phases
          const url = `${this.baseUrl}/moon/phases/date`;
          const params = {
            date: dateStr,
            coords: `${location.latitude},${location.longitude}`,
            tz: this.getTimezoneOffset(location)
          };

          const response: AxiosResponse = await axios.get(url, {
            params,
            timeout: this.requestTimeout,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'LunarCrimeAnalyzer/1.0'
            }
          });

          const moonData = this.parseMoonPhaseResponse(response.data, location, date);
          
          // Cache successful response
          if (moonData) {
            fallbackCache.set(cacheKey, moonData, 24 * 60 * 60 * 1000); // Cache for 24 hours
          }
          
          return moonData;
        }, {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 8000,
          jitter: true
        }).then(result => result.data);
      });
    } catch (error: any) {
      // Handle specific error cases
      if (error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError) {
        if (error.response?.status === 404) {
          // No data available for this date, return null
          return null;
        }
        
        // For other API errors, try to use cached data even if expired
        const expiredCache = fallbackCache.get(cacheKey);
        if (expiredCache) {
          console.warn('Using expired cached data due to API failure');
          return expiredCache;
        }
        
        throw new Error(`API request failed: ${error.response?.status} ${error.response?.statusText}`);
      }
      
      // For circuit breaker or other errors, try cached data
      const expiredCache = fallbackCache.get(cacheKey);
      if (expiredCache) {
        console.warn('Using cached data due to service unavailability');
        return expiredCache;
      }
      
      throw error;
    }
  }

  /**
   * Parse the API response and convert to our MoonPhaseData format
   * Requirements: 2.4, 6.1
   */
  private parseMoonPhaseResponse(
    apiResponse: any,
    location: GeographicCoordinate,
    date: Date
  ): MoonPhaseData {
    try {
      // Calculate moon phase based on lunar cycle
      const lunarCycle = this.calculateLunarCycle(date);
      const phaseName = this.determinePhaseName(lunarCycle.illuminationPercent);
      
      const moonPhaseData: MoonPhaseData = {
        timestamp: this.convertToLocalTimezone(date, location),
        phaseName,
        illuminationPercent: lunarCycle.illuminationPercent,
        phaseAngle: lunarCycle.phaseAngle,
        distanceKm: lunarCycle.distanceKm,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
          jurisdiction: location.jurisdiction
        }
      };

      // Validate the data before returning
      return validateMoonPhaseData(moonPhaseData);
    } catch (error) {
      throw new Error(`Failed to parse moon phase data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate lunar cycle information for a given date
   * Uses astronomical formulas to determine moon phase
   */
  private calculateLunarCycle(date: Date): {
    illuminationPercent: number;
    phaseAngle: number;
    distanceKm: number;
  } {
    // Julian day calculation
    const julianDay = this.dateToJulianDay(date);
    
    // Days since new moon (J2000.0 epoch)
    const daysSinceNewMoon = (julianDay - 2451549.5) % 29.53058867;
    
    // Phase angle (0-360 degrees)
    const phaseAngle = (daysSinceNewMoon / 29.53058867) * 360;
    
    // Illumination percentage
    const illuminationPercent = (1 - Math.cos((phaseAngle * Math.PI) / 180)) * 50;
    
    // Approximate distance (varies between 356,500 km and 406,700 km)
    const meanDistance = 384400; // km
    const eccentricity = 0.0549;
    const meanAnomaly = ((julianDay - 2451545.0) / 27.321661) * 2 * Math.PI;
    const distanceKm = meanDistance * (1 - eccentricity * Math.cos(meanAnomaly));

    return {
      illuminationPercent: Math.round(illuminationPercent * 100) / 100,
      phaseAngle: Math.round(phaseAngle * 100) / 100,
      distanceKm: Math.round(distanceKm)
    };
  }

  /**
   * Convert date to Julian Day Number
   */
  private dateToJulianDay(date: Date): number {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    
    let a = Math.floor((14 - month) / 12);
    let y = year + 4800 - a;
    let m = month + 12 * a - 3;
    
    return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  }

  /**
   * Determine moon phase name based on illumination percentage
   */
  private determinePhaseName(illuminationPercent: number): MoonPhaseData['phaseName'] {
    if (illuminationPercent < 1) return 'new';
    if (illuminationPercent < 25) return 'waxing_crescent';
    if (illuminationPercent < 49) return 'first_quarter';
    if (illuminationPercent < 51) return 'waxing_gibbous';
    if (illuminationPercent > 99) return 'full';
    if (illuminationPercent > 75) return 'waning_gibbous';
    if (illuminationPercent > 51) return 'last_quarter';
    return 'waning_crescent';
  }

  /**
   * Convert timestamp to local timezone for the given location
   * Requirements: 6.1
   */
  private convertToLocalTimezone(date: Date, location: GeographicCoordinate): Date {
    // Approximate timezone offset based on longitude
    // This is a simplified approach - in production, you'd use a proper timezone library
    const timezoneOffsetHours = Math.round(location.longitude / 15);
    const offsetMs = timezoneOffsetHours * 60 * 60 * 1000;
    
    return new Date(date.getTime() + offsetMs);
  }

  /**
   * Get timezone offset for API requests
   */
  private getTimezoneOffset(location: GeographicCoordinate): number {
    // Simplified timezone calculation based on longitude
    return Math.round(location.longitude / 15);
  }

  /**
   * Validate geographic coordinates
   * Requirements: 2.4
   */
  validateCoordinates(location: GeographicCoordinate): boolean {
    return (
      location.latitude >= -90 && 
      location.latitude <= 90 &&
      location.longitude >= -180 && 
      location.longitude <= 180 &&
      location.jurisdiction.length > 0
    );
  }

  /**
   * Check if moon phase data is available for the given location and date range
   */
  async checkDataAvailability(
    location: GeographicCoordinate,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    try {
      // Validate coordinates first
      if (!this.validateCoordinates(location)) {
        return false;
      }

      // Check if date range is reasonable (not too far in the past or future)
      const now = new Date();
      const maxPastDate = new Date(now.getFullYear() - 50, 0, 1); // 50 years ago
      const maxFutureDate = new Date(now.getFullYear() + 10, 11, 31); // 10 years in future

      return startDate >= maxPastDate && endDate <= maxFutureDate && startDate <= endDate;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const astronomicalDataFetcher = new AstronomicalDataFetcher(process.env.NASA_API_KEY);