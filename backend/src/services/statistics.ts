import {
  sampleCorrelation,
  chiSquaredGoodnessOfFit,
  tTest,
  standardDeviation,
  mean,
  variance
} from 'simple-statistics';
import {
  CrimeIncident,
  MoonPhaseData,
  CorrelationResult,
  CrimeType,
  StatisticalSummary,
  GeographicCoordinate
} from '../types';

export interface CorrelationInput {
  crimeIncidents: CrimeIncident[];
  moonPhases: MoonPhaseData[];
}

export interface TrendAnalysisResult {
  moonPhase: string;
  crimeCount: number;
  averageCount: number;
  standardDeviation: number;
  isAnomaly: boolean;
  anomalyScore: number;
}

export interface PatternDetectionResult {
  pattern: 'increasing' | 'decreasing' | 'cyclical' | 'random';
  confidence: number;
  description: string;
}

/**
 * Statistical Analysis Service for Lunar Crime Correlations
 * Implements Pearson correlation, significance testing, and confidence intervals
 */
export class StatisticsService {
  private readonly SIGNIFICANCE_LEVEL = 0.05;
  private readonly CONFIDENCE_LEVEL = 0.95;

  /**
   * Calculate Pearson correlation coefficient between moon phases and crime incidents
   */
  public calculateCorrelation(input: CorrelationInput): CorrelationResult[] {
    const results: CorrelationResult[] = [];
    
    // Group crime incidents by type
    const crimesByType = this.groupCrimesByType(input.crimeIncidents);
    
    for (const [crimeTypeKey, crimes] of crimesByType.entries()) {
      // Get moon phase data for each crime incident
      const correlationData = this.alignCrimeWithMoonPhases(crimes, input.moonPhases);
      
      if (correlationData.length < 3) {
        // Need at least 3 data points for meaningful correlation
        continue;
      }

      // Calculate correlation for each moon phase
      const moonPhases = ['new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 
                         'full', 'waning_gibbous', 'last_quarter', 'waning_crescent'];
      
      for (const phase of moonPhases) {
        const result = this.calculatePhaseCorrelation(correlationData, phase, crimeTypeKey);
        if (result) {
          results.push(result);
        }
      }
    }
    
    return results;
  }

  /**
   * Calculate correlation for a specific moon phase and crime type
   */
  private calculatePhaseCorrelation(
    data: Array<{ crime: CrimeIncident; moonPhase: MoonPhaseData }>,
    targetPhase: string,
    crimeType: CrimeType
  ): CorrelationResult | null {
    // Create time series data
    const timeSeriesData = this.createTimeSeriesData(data, targetPhase);
    
    if (timeSeriesData.length < 3) {
      return null;
    }

    const illuminationValues = timeSeriesData.map(d => d.illumination);
    const crimeCountValues = timeSeriesData.map(d => d.crimeCount);

    try {
      // Calculate Pearson correlation coefficient
      const correlationCoefficient = sampleCorrelation(illuminationValues, crimeCountValues);
      
      // Calculate statistical significance using t-test
      const { pValue, confidenceInterval } = this.calculateSignificance(
        correlationCoefficient,
        timeSeriesData.length
      );

      return {
        crimeType,
        moonPhase: targetPhase,
        correlationCoefficient,
        pValue,
        confidenceInterval,
        sampleSize: timeSeriesData.length,
        significanceLevel: this.SIGNIFICANCE_LEVEL
      };
    } catch (error) {
      console.error(`Error calculating correlation for ${crimeType.category} and ${targetPhase}:`, error);
      return null;
    }
  }

  /**
   * Calculate statistical significance and confidence intervals
   */
  private calculateSignificance(
    correlation: number,
    sampleSize: number
  ): { pValue: number; confidenceInterval: [number, number] } {
    // Calculate t-statistic for correlation
    const degreesOfFreedom = sampleSize - 2;
    const tStatistic = correlation * Math.sqrt(degreesOfFreedom / (1 - correlation * correlation));
    
    // Calculate p-value using t-distribution approximation
    const pValue = this.calculateTTestPValue(tStatistic, degreesOfFreedom);
    
    // Calculate confidence interval for correlation coefficient
    const confidenceInterval = this.calculateCorrelationConfidenceInterval(
      correlation,
      sampleSize,
      this.CONFIDENCE_LEVEL
    );

    return { pValue, confidenceInterval };
  }

  /**
   * Calculate p-value for t-test (simplified approximation)
   */
  private calculateTTestPValue(tStatistic: number, degreesOfFreedom: number): number {
    // Simplified p-value calculation using normal approximation for large samples
    if (degreesOfFreedom > 30) {
      const z = Math.abs(tStatistic);
      return 2 * (1 - this.normalCDF(z));
    }
    
    // For smaller samples, use a conservative estimate
    const absT = Math.abs(tStatistic);
    if (absT > 2.576) return 0.01;  // p < 0.01
    if (absT > 1.96) return 0.05;   // p < 0.05
    if (absT > 1.645) return 0.10;  // p < 0.10
    return 0.20; // p >= 0.10
  }

  /**
   * Normal cumulative distribution function approximation
   */
  private normalCDF(x: number): number {
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  /**
   * Error function approximation
   */
  private erf(x: number): number {
    // Abramowitz and Stegun approximation
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  /**
   * Calculate confidence interval for correlation coefficient using Fisher transformation
   */
  private calculateCorrelationConfidenceInterval(
    r: number,
    n: number,
    confidenceLevel: number
  ): [number, number] {
    if (Math.abs(r) >= 1 || n < 4) {
      return [-1, 1]; // Return full range for invalid inputs
    }

    // Fisher z-transformation
    const z = 0.5 * Math.log((1 + r) / (1 - r));
    const standardError = 1 / Math.sqrt(n - 3);
    
    // Critical value for confidence level (approximation)
    const alpha = 1 - confidenceLevel;
    const criticalValue = this.getZCriticalValue(alpha / 2);
    
    // Calculate confidence interval in z-space
    const zLower = z - criticalValue * standardError;
    const zUpper = z + criticalValue * standardError;
    
    // Transform back to correlation space
    const rLower = (Math.exp(2 * zLower) - 1) / (Math.exp(2 * zLower) + 1);
    const rUpper = (Math.exp(2 * zUpper) - 1) / (Math.exp(2 * zUpper) + 1);
    
    return [Math.max(-1, rLower), Math.min(1, rUpper)];
  }

  /**
   * Get critical value for standard normal distribution
   */
  private getZCriticalValue(alpha: number): number {
    // Common critical values
    if (alpha <= 0.005) return 2.576; // 99% confidence
    if (alpha <= 0.01) return 2.326;  // 98% confidence
    if (alpha <= 0.025) return 1.96;  // 95% confidence
    if (alpha <= 0.05) return 1.645;  // 90% confidence
    return 1.282; // 80% confidence
  }

  /**
   * Group crime incidents by type for analysis
   */
  private groupCrimesByType(crimes: CrimeIncident[]): Map<CrimeType, CrimeIncident[]> {
    const grouped = new Map<CrimeType, CrimeIncident[]>();
    
    for (const crime of crimes) {
      // Find existing crime type or create new entry
      let existingType: CrimeType | undefined;
      for (const [type] of grouped.entries()) {
        if (type.category === crime.crimeType.category && 
            type.subcategory === crime.crimeType.subcategory) {
          existingType = type;
          break;
        }
      }
      
      if (existingType) {
        grouped.get(existingType)!.push(crime);
      } else {
        grouped.set(crime.crimeType, [crime]);
      }
    }
    
    return grouped;
  }

  /**
   * Align crime incidents with corresponding moon phase data
   */
  private alignCrimeWithMoonPhases(
    crimes: CrimeIncident[],
    moonPhases: MoonPhaseData[]
  ): Array<{ crime: CrimeIncident; moonPhase: MoonPhaseData }> {
    const aligned: Array<{ crime: CrimeIncident; moonPhase: MoonPhaseData }> = [];
    
    for (const crime of crimes) {
      // Find the closest moon phase data point
      const closestMoonPhase = this.findClosestMoonPhase(crime.timestamp, moonPhases);
      if (closestMoonPhase) {
        aligned.push({ crime, moonPhase: closestMoonPhase });
      }
    }
    
    return aligned;
  }

  /**
   * Find the moon phase data closest to a given timestamp
   */
  private findClosestMoonPhase(timestamp: Date, moonPhases: MoonPhaseData[]): MoonPhaseData | null {
    if (moonPhases.length === 0) return null;
    
    let closest = moonPhases[0]!;
    let minDiff = Math.abs(timestamp.getTime() - closest.timestamp.getTime());
    
    for (const phase of moonPhases) {
      const diff = Math.abs(timestamp.getTime() - phase.timestamp.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closest = phase;
      }
    }
    
    // Only return if within 24 hours (reasonable alignment window)
    const maxDiff = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    return minDiff <= maxDiff ? closest : null;
  }

  /**
   * Create time series data for correlation analysis
   */
  private createTimeSeriesData(
    alignedData: Array<{ crime: CrimeIncident; moonPhase: MoonPhaseData }>,
    targetPhase: string
  ): Array<{ timestamp: Date; illumination: number; crimeCount: number }> {
    // Group by day and moon phase
    const dailyData = new Map<string, { illumination: number; crimes: CrimeIncident[] }>();
    
    for (const { crime, moonPhase } of alignedData) {
      if (moonPhase.phaseName === targetPhase) {
        const dateKey = crime.timestamp.toISOString().split('T')[0]!;
        
        if (!dailyData.has(dateKey)) {
          dailyData.set(dateKey, {
            illumination: moonPhase.illuminationPercent,
            crimes: []
          });
        }
        
        dailyData.get(dateKey)!.crimes.push(crime);
      }
    }
    
    // Convert to time series format
    const timeSeries: Array<{ timestamp: Date; illumination: number; crimeCount: number }> = [];
    
    for (const [dateKey, data] of dailyData.entries()) {
      timeSeries.push({
        timestamp: new Date(dateKey),
        illumination: data.illumination,
        crimeCount: data.crimes.length
      });
    }
    
    // Sort by timestamp
    timeSeries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return timeSeries;
  }

  /**
   * Generate statistical summary from correlation results
   */
  public generateStatisticalSummary(
    correlationResults: CorrelationResult[],
    crimeIncidents: CrimeIncident[],
    location: GeographicCoordinate,
    dateRange: { start: Date; end: Date }
  ): StatisticalSummary {
    const significantCorrelations = correlationResults.filter(
      result => result.pValue <= this.SIGNIFICANCE_LEVEL
    );

    // Calculate overall correlation (weighted by sample size)
    const totalSampleSize = correlationResults.reduce((sum, result) => sum + result.sampleSize, 0);
    const overallCorrelation = totalSampleSize > 0 
      ? correlationResults.reduce((sum, result) => 
          sum + (result.correlationCoefficient * result.sampleSize), 0) / totalSampleSize
      : 0;

    // Calculate overall significance (minimum p-value)
    const overallSignificance = correlationResults.length > 0
      ? Math.min(...correlationResults.map(r => r.pValue))
      : 1;

    return {
      totalCrimeIncidents: crimeIncidents.length,
      dateRange,
      location,
      correlationResults,
      significantCorrelations,
      overallSignificance,
      overallCorrelation,
      totalSampleSize,
      analysisDateRange: dateRange,
      confidenceLevel: this.CONFIDENCE_LEVEL
    };
  }

  /**
   * Analyze trends in lunar-crime relationships
   */
  public analyzeTrends(input: CorrelationInput): TrendAnalysisResult[] {
    const results: TrendAnalysisResult[] = [];
    
    // Group crimes by moon phase
    const crimesByPhase = this.groupCrimesByMoonPhase(input.crimeIncidents, input.moonPhases);
    
    // Calculate statistics for each moon phase
    const phaseCounts: number[] = [];
    const phaseNames = ['new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 
                      'full', 'waning_gibbous', 'last_quarter', 'waning_crescent'];
    
    for (const phase of phaseNames) {
      const count = crimesByPhase.get(phase)?.length || 0;
      phaseCounts.push(count);
    }
    
    // Calculate overall statistics
    const overallMean = mean(phaseCounts);
    const overallStdDev = standardDeviation(phaseCounts);
    
    // Analyze each phase for anomalies
    for (let i = 0; i < phaseNames.length; i++) {
      const phase = phaseNames[i]!;
      const count = phaseCounts[i]!;
      
      // Calculate anomaly score (z-score)
      const anomalyScore = overallStdDev > 0 ? Math.abs(count - overallMean) / overallStdDev : 0;
      const isAnomaly = anomalyScore > 2; // More than 2 standard deviations
      
      results.push({
        moonPhase: phase,
        crimeCount: count,
        averageCount: overallMean,
        standardDeviation: overallStdDev,
        isAnomaly,
        anomalyScore
      });
    }
    
    return results;
  }

  /**
   * Detect patterns in lunar-crime relationships
   */
  public detectPatterns(trendResults: TrendAnalysisResult[]): PatternDetectionResult {
    const counts = trendResults.map(r => r.crimeCount);
    
    if (counts.length < 3) {
      return {
        pattern: 'random',
        confidence: 0,
        description: 'Insufficient data for pattern detection'
      };
    }
    
    // Check for increasing trend
    const increasingTrend = this.detectIncreasingTrend(counts);
    if (increasingTrend.confidence > 0.7) {
      return {
        pattern: 'increasing',
        confidence: increasingTrend.confidence,
        description: `Crime rates show an increasing trend across lunar phases (confidence: ${(increasingTrend.confidence * 100).toFixed(1)}%)`
      };
    }
    
    // Check for decreasing trend
    const decreasingTrend = this.detectDecreasingTrend(counts);
    if (decreasingTrend.confidence > 0.7) {
      return {
        pattern: 'decreasing',
        confidence: decreasingTrend.confidence,
        description: `Crime rates show a decreasing trend across lunar phases (confidence: ${(decreasingTrend.confidence * 100).toFixed(1)}%)`
      };
    }
    
    // Check for cyclical pattern
    const cyclicalPattern = this.detectCyclicalPattern(counts);
    if (cyclicalPattern.confidence > 0.6) {
      return {
        pattern: 'cyclical',
        confidence: cyclicalPattern.confidence,
        description: `Crime rates show a cyclical pattern across lunar phases (confidence: ${(cyclicalPattern.confidence * 100).toFixed(1)}%)`
      };
    }
    
    // Default to random if no clear pattern
    return {
      pattern: 'random',
      confidence: 0.5,
      description: 'No clear pattern detected in crime rates across lunar phases'
    };
  }

  /**
   * Detect increasing trend in data
   */
  private detectIncreasingTrend(data: number[]): { confidence: number } {
    let increasingPairs = 0;
    let totalPairs = 0;
    
    for (let i = 0; i < data.length - 1; i++) {
      if (data[i + 1]! > data[i]!) {
        increasingPairs++;
      }
      totalPairs++;
    }
    
    const confidence = totalPairs > 0 ? increasingPairs / totalPairs : 0;
    return { confidence };
  }

  /**
   * Detect decreasing trend in data
   */
  private detectDecreasingTrend(data: number[]): { confidence: number } {
    let decreasingPairs = 0;
    let totalPairs = 0;
    
    for (let i = 0; i < data.length - 1; i++) {
      if (data[i + 1]! < data[i]!) {
        decreasingPairs++;
      }
      totalPairs++;
    }
    
    const confidence = totalPairs > 0 ? decreasingPairs / totalPairs : 0;
    return { confidence };
  }

  /**
   * Detect cyclical pattern in data
   */
  private detectCyclicalPattern(data: number[]): { confidence: number } {
    if (data.length < 4) {
      return { confidence: 0 };
    }
    
    // Look for peaks and valleys
    let peaks = 0;
    let valleys = 0;
    
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i]! > data[i - 1]! && data[i]! > data[i + 1]!) {
        peaks++;
      } else if (data[i]! < data[i - 1]! && data[i]! < data[i + 1]!) {
        valleys++;
      }
    }
    
    // A cyclical pattern should have multiple peaks and valleys
    const totalExtrema = peaks + valleys;
    const expectedExtrema = Math.floor(data.length / 2); // Rough estimate
    
    const confidence = totalExtrema >= 2 ? Math.min(totalExtrema / expectedExtrema, 1) : 0;
    return { confidence };
  }

  /**
   * Group crimes by moon phase
   */
  private groupCrimesByMoonPhase(
    crimes: CrimeIncident[],
    moonPhases: MoonPhaseData[]
  ): Map<string, CrimeIncident[]> {
    const grouped = new Map<string, CrimeIncident[]>();
    
    // Initialize all phases
    const phaseNames = ['new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 
                      'full', 'waning_gibbous', 'last_quarter', 'waning_crescent'];
    
    for (const phase of phaseNames) {
      grouped.set(phase, []);
    }
    
    // Align crimes with moon phases
    for (const crime of crimes) {
      const closestMoonPhase = this.findClosestMoonPhase(crime.timestamp, moonPhases);
      if (closestMoonPhase) {
        const phaseGroup = grouped.get(closestMoonPhase.phaseName);
        if (phaseGroup) {
          phaseGroup.push(crime);
        }
      }
    }
    
    return grouped;
  }

  /**
   * Detect anomalies in correlation data
   */
  public detectAnomalies(
    correlationResults: CorrelationResult[],
    threshold: number = 2
  ): CorrelationResult[] {
    if (correlationResults.length < 3) {
      return [];
    }
    
    // Calculate mean and standard deviation of correlation coefficients
    const coefficients = correlationResults.map(r => Math.abs(r.correlationCoefficient));
    const meanCoeff = mean(coefficients);
    const stdDevCoeff = standardDeviation(coefficients);
    
    // Find anomalies (correlations that are unusually high or low)
    const anomalies: CorrelationResult[] = [];
    
    for (const result of correlationResults) {
      const zScore = stdDevCoeff > 0 ? Math.abs(Math.abs(result.correlationCoefficient) - meanCoeff) / stdDevCoeff : 0;
      
      if (zScore > threshold) {
        anomalies.push(result);
      }
    }
    
    return anomalies;
  }
}

export const statisticsService = new StatisticsService();