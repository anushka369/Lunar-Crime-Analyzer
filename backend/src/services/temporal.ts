import { MoonPhaseData, CrimeIncident, GeographicCoordinate } from '../types';

export interface TemporalAlignment {
  crimeIncident: CrimeIncident;
  moonPhase: MoonPhaseData;
  timeDifferenceMs: number;
}

export interface AlignmentResult {
  alignments: TemporalAlignment[];
  unalignedCrimes: CrimeIncident[];
  unalignedMoonPhases: MoonPhaseData[];
  totalCrimes: number;
  totalMoonPhases: number;
  alignmentAccuracy: number; // Percentage of crimes that were aligned
}

/**
 * Service for aligning temporal data between astronomical and crime datasets
 * Requirements: 6.1, 6.2, 6.3
 */
export class TimestampAligner {
  private readonly maxTimeDifferenceMs: number;

  constructor(maxTimeDifferenceHours: number = 12) {
    // Maximum time difference allowed for alignment (default 12 hours)
    this.maxTimeDifferenceMs = maxTimeDifferenceHours * 60 * 60 * 1000;
  }

  /**
   * Align crime incidents with corresponding moon phase data
   * Requirements: 6.1, 6.2, 6.3
   */
  alignTemporalData(
    crimeIncidents: CrimeIncident[],
    moonPhases: MoonPhaseData[]
  ): AlignmentResult {
    const alignments: TemporalAlignment[] = [];
    const unalignedCrimes: CrimeIncident[] = [];
    const usedMoonPhaseIndices = new Set<number>();

    // Sort both arrays by timestamp for efficient matching
    const sortedCrimes = [...crimeIncidents].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const sortedMoonPhases = [...moonPhases].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Align each crime incident with the closest moon phase
    for (const crime of sortedCrimes) {
      const result = this.findClosestMoonPhase(crime, sortedMoonPhases, usedMoonPhaseIndices);
      
      if (result) {
        alignments.push(result.alignment);
        usedMoonPhaseIndices.add(result.moonPhaseIndex);
      } else {
        unalignedCrimes.push(crime);
      }
    }

    // Find unused moon phases
    const unalignedMoonPhases = sortedMoonPhases.filter((_, index) => !usedMoonPhaseIndices.has(index));

    const alignmentAccuracy = crimeIncidents.length > 0 
      ? (alignments.length / crimeIncidents.length) * 100 
      : 0;

    return {
      alignments,
      unalignedCrimes,
      unalignedMoonPhases,
      totalCrimes: crimeIncidents.length,
      totalMoonPhases: moonPhases.length,
      alignmentAccuracy
    };
  }

  /**
   * Find the closest moon phase for a given crime incident
   * Requirements: 6.1, 6.3
   */
  private findClosestMoonPhase(
    crime: CrimeIncident,
    moonPhases: MoonPhaseData[],
    usedIndices: Set<number>
  ): { alignment: TemporalAlignment; moonPhaseIndex: number } | null {
    let closestAlignment: TemporalAlignment | null = null;
    let closestIndex = -1;
    let minTimeDifference = Infinity;

    for (let i = 0; i < moonPhases.length; i++) {
      if (usedIndices.has(i)) continue;

      const moonPhase = moonPhases[i]!;
      
      // Check if locations are compatible (within reasonable distance)
      if (!this.areLocationsCompatible(crime.location, moonPhase.location)) {
        continue;
      }

      // Calculate time difference
      const timeDifference = Math.abs(crime.timestamp.getTime() - moonPhase.timestamp.getTime());
      
      // Skip if time difference is too large
      if (timeDifference > this.maxTimeDifferenceMs) {
        continue;
      }

      // Update closest match if this is better
      if (timeDifference < minTimeDifference) {
        minTimeDifference = timeDifference;
        closestIndex = i;
        closestAlignment = {
          crimeIncident: crime,
          moonPhase,
          timeDifferenceMs: timeDifference
        };
      }
    }

    if (closestAlignment && closestIndex >= 0) {
      return { alignment: closestAlignment, moonPhaseIndex: closestIndex };
    }

    return null;
  }

  /**
   * Check if two locations are compatible for temporal alignment
   * Requirements: 6.1
   */
  private areLocationsCompatible(
    crimeLocation: GeographicCoordinate,
    moonLocation: GeographicCoordinate
  ): boolean {
    // Calculate approximate distance between locations
    const latDiff = Math.abs(crimeLocation.latitude - moonLocation.latitude);
    const lonDiff = Math.abs(crimeLocation.longitude - moonLocation.longitude);
    
    // Allow up to ~100km difference (approximately 1 degree)
    const maxDifference = 1.0;
    
    return latDiff <= maxDifference && lonDiff <= maxDifference;
  }

  /**
   * Synchronize timestamps to a common timezone
   * Requirements: 6.1
   */
  synchronizeTimestamps(
    crimeIncidents: CrimeIncident[],
    moonPhases: MoonPhaseData[],
    targetTimezone: string = 'UTC'
  ): { crimes: CrimeIncident[], moonPhases: MoonPhaseData[] } {
    // For now, we'll work with UTC timestamps
    // In a production system, you'd use a proper timezone library like date-fns-tz
    
    const synchronizedCrimes = crimeIncidents.map(crime => ({
      ...crime,
      timestamp: this.convertToTimezone(crime.timestamp, targetTimezone)
    }));

    const synchronizedMoonPhases = moonPhases.map(moonPhase => ({
      ...moonPhase,
      timestamp: this.convertToTimezone(moonPhase.timestamp, targetTimezone)
    }));

    return {
      crimes: synchronizedCrimes,
      moonPhases: synchronizedMoonPhases
    };
  }

  /**
   * Convert timestamp to target timezone
   * Requirements: 6.1
   */
  private convertToTimezone(timestamp: Date, timezone: string): Date {
    // Simplified timezone conversion - in production use proper timezone library
    if (timezone === 'UTC') {
      return new Date(timestamp.getTime());
    }
    
    // For now, return the original timestamp
    // In production, implement proper timezone conversion
    return timestamp;
  }

  /**
   * Validate temporal data integrity
   * Requirements: 6.3
   */
  validateTemporalIntegrity(alignmentResult: AlignmentResult): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check alignment accuracy
    if (alignmentResult.alignmentAccuracy < 50) {
      errors.push(`Low alignment accuracy: ${alignmentResult.alignmentAccuracy.toFixed(1)}% (expected >50%)`);
    } else if (alignmentResult.alignmentAccuracy < 80) {
      warnings.push(`Moderate alignment accuracy: ${alignmentResult.alignmentAccuracy.toFixed(1)}% (recommended >80%)`);
    }

    // Check for temporal gaps
    if (alignmentResult.alignments.length > 0) {
      const sortedAlignments = alignmentResult.alignments.sort(
        (a, b) => a.crimeIncident.timestamp.getTime() - b.crimeIncident.timestamp.getTime()
      );

      for (let i = 1; i < sortedAlignments.length; i++) {
        const prevTime = sortedAlignments[i - 1]!.crimeIncident.timestamp.getTime();
        const currTime = sortedAlignments[i]!.crimeIncident.timestamp.getTime();
        const gap = currTime - prevTime;
        
        // Warn about gaps larger than 7 days
        if (gap > 7 * 24 * 60 * 60 * 1000) {
          warnings.push(`Large temporal gap detected: ${Math.round(gap / (24 * 60 * 60 * 1000))} days`);
        }
      }
    }

    // Check time difference distribution
    if (alignmentResult.alignments.length > 0) {
      const timeDifferences = alignmentResult.alignments.map(a => a.timeDifferenceMs);
      const avgTimeDiff = timeDifferences.reduce((sum, diff) => sum + diff, 0) / timeDifferences.length;
      
      // Warn if average time difference is large
      if (avgTimeDiff > 6 * 60 * 60 * 1000) { // 6 hours
        warnings.push(`High average time difference: ${Math.round(avgTimeDiff / (60 * 60 * 1000))} hours`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get alignment statistics
   */
  getAlignmentStatistics(alignmentResult: AlignmentResult): {
    totalAlignments: number;
    averageTimeDifferenceMs: number;
    maxTimeDifferenceMs: number;
    minTimeDifferenceMs: number;
    alignmentAccuracy: number;
  } {
    if (alignmentResult.alignments.length === 0) {
      return {
        totalAlignments: 0,
        averageTimeDifferenceMs: 0,
        maxTimeDifferenceMs: 0,
        minTimeDifferenceMs: 0,
        alignmentAccuracy: 0
      };
    }

    const timeDifferences = alignmentResult.alignments.map(a => a.timeDifferenceMs);
    
    return {
      totalAlignments: alignmentResult.alignments.length,
      averageTimeDifferenceMs: timeDifferences.reduce((sum, diff) => sum + diff, 0) / timeDifferences.length,
      maxTimeDifferenceMs: Math.max(...timeDifferences),
      minTimeDifferenceMs: Math.min(...timeDifferences),
      alignmentAccuracy: alignmentResult.alignmentAccuracy
    };
  }
}

/**
 * Data integrity validation interfaces and types
 * Requirements: 6.5
 */
export interface DataQualityMetrics {
  totalCrimeIncidents: number;
  totalMoonPhases: number;
  crimeIncidentsInRange: number;
  crimeIncidentsOutOfRange: number;
  temporalCoveragePercent: number;
  dataGaps: TemporalGap[];
  qualityScore: number; // 0-100
  issues: DataQualityIssue[];
}

export interface TemporalGap {
  startDate: Date;
  endDate: Date;
  durationDays: number;
  type: 'crime_data' | 'moon_data' | 'both';
  severity: 'minor' | 'moderate' | 'severe';
}

export interface DataQualityIssue {
  type: 'out_of_range' | 'temporal_gap' | 'insufficient_coverage' | 'data_sparsity';
  severity: 'warning' | 'error';
  message: string;
  affectedRecords?: number;
  dateRange?: { start: Date; end: Date } | undefined;
}

export interface DataIntegrityReport {
  isValid: boolean;
  qualityMetrics: DataQualityMetrics;
  recommendations: string[];
  validationTimestamp: Date;
}

/**
 * Service for validating data integrity between astronomical and crime datasets
 * Requirements: 6.5
 */
export class DataIntegrityValidator {
  private readonly minCoveragePercent: number;
  private readonly maxGapDays: number;

  constructor(minCoveragePercent: number = 80, maxGapDays: number = 7) {
    this.minCoveragePercent = minCoveragePercent;
    this.maxGapDays = maxGapDays;
  }

  /**
   * Validate that all crime incidents fall within moon phase date ranges
   * Requirements: 6.5
   */
  validateCrimeIncidentsInRange(
    crimeIncidents: CrimeIncident[],
    moonPhases: MoonPhaseData[]
  ): {
    inRange: CrimeIncident[];
    outOfRange: CrimeIncident[];
    moonPhaseRange: { start: Date; end: Date } | null;
  } {
    if (moonPhases.length === 0) {
      return {
        inRange: [],
        outOfRange: [...crimeIncidents],
        moonPhaseRange: null
      };
    }

    // Determine moon phase date range
    const moonPhaseDates = moonPhases.map(mp => mp.timestamp);
    const minMoonDate = new Date(Math.min(...moonPhaseDates.map(d => d.getTime())));
    const maxMoonDate = new Date(Math.max(...moonPhaseDates.map(d => d.getTime())));

    const moonPhaseRange = { start: minMoonDate, end: maxMoonDate };

    // Categorize crime incidents
    const inRange: CrimeIncident[] = [];
    const outOfRange: CrimeIncident[] = [];

    for (const crime of crimeIncidents) {
      const crimeTime = crime.timestamp.getTime();
      if (crimeTime >= minMoonDate.getTime() && crimeTime <= maxMoonDate.getTime()) {
        inRange.push(crime);
      } else {
        outOfRange.push(crime);
      }
    }

    return { inRange, outOfRange, moonPhaseRange };
  }

  /**
   * Check temporal coverage completeness
   * Requirements: 6.5
   */
  checkTemporalCoverage(
    crimeIncidents: CrimeIncident[],
    moonPhases: MoonPhaseData[],
    expectedDateRange: { start: Date; end: Date }
  ): {
    coveragePercent: number;
    gaps: TemporalGap[];
    hasSufficientCoverage: boolean;
  } {
    const gaps: TemporalGap[] = [];
    
    // Find gaps in crime data
    const crimeGaps = this.findDataGaps(
      crimeIncidents.map(c => c.timestamp),
      expectedDateRange,
      'crime_data'
    );
    gaps.push(...crimeGaps);

    // Find gaps in moon phase data
    const moonGaps = this.findDataGaps(
      moonPhases.map(mp => mp.timestamp),
      expectedDateRange,
      'moon_data'
    );
    gaps.push(...moonGaps);

    // Calculate overall coverage
    const totalExpectedDays = Math.max(1, Math.ceil(
      (expectedDateRange.end.getTime() - expectedDateRange.start.getTime()) / (24 * 60 * 60 * 1000)
    ));
    
    const gapDays = gaps.reduce((sum, gap) => sum + gap.durationDays, 0);
    const coveragePercent = totalExpectedDays > 0 
      ? Math.max(0, ((totalExpectedDays - gapDays) / totalExpectedDays) * 100)
      : 0;

    return {
      coveragePercent,
      gaps,
      hasSufficientCoverage: coveragePercent >= this.minCoveragePercent
    };
  }

  /**
   * Find gaps in temporal data
   * Requirements: 6.5
   */
  private findDataGaps(
    timestamps: Date[],
    expectedRange: { start: Date; end: Date },
    dataType: 'crime_data' | 'moon_data'
  ): TemporalGap[] {
    if (timestamps.length === 0) {
      const durationDays = Math.max(1, Math.ceil(
        (expectedRange.end.getTime() - expectedRange.start.getTime()) / (24 * 60 * 60 * 1000)
      ));
      return [{
        startDate: expectedRange.start,
        endDate: expectedRange.end,
        durationDays,
        type: dataType,
        severity: 'severe'
      }];
    }

    const gaps: TemporalGap[] = [];
    const sortedTimestamps = [...timestamps].sort((a, b) => a.getTime() - b.getTime());

    // Check for gap at the beginning
    const firstTimestamp = sortedTimestamps[0]!;
    if (firstTimestamp.getTime() > expectedRange.start.getTime()) {
      const gapDays = Math.ceil(
        (firstTimestamp.getTime() - expectedRange.start.getTime()) / (24 * 60 * 60 * 1000)
      );
      if (gapDays > this.maxGapDays) {
        gaps.push({
          startDate: expectedRange.start,
          endDate: firstTimestamp,
          durationDays: gapDays,
          type: dataType,
          severity: this.getGapSeverity(gapDays)
        });
      }
    }

    // Check for gaps between timestamps
    for (let i = 1; i < sortedTimestamps.length; i++) {
      const prevTimestamp = sortedTimestamps[i - 1]!;
      const currTimestamp = sortedTimestamps[i]!;
      
      const gapDays = Math.ceil(
        (currTimestamp.getTime() - prevTimestamp.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (gapDays > this.maxGapDays) {
        gaps.push({
          startDate: prevTimestamp,
          endDate: currTimestamp,
          durationDays: gapDays,
          type: dataType,
          severity: this.getGapSeverity(gapDays)
        });
      }
    }

    // Check for gap at the end
    const lastTimestamp = sortedTimestamps[sortedTimestamps.length - 1]!;
    if (lastTimestamp.getTime() < expectedRange.end.getTime()) {
      const gapDays = Math.ceil(
        (expectedRange.end.getTime() - lastTimestamp.getTime()) / (24 * 60 * 60 * 1000)
      );
      if (gapDays > this.maxGapDays) {
        gaps.push({
          startDate: lastTimestamp,
          endDate: expectedRange.end,
          durationDays: gapDays,
          type: dataType,
          severity: this.getGapSeverity(gapDays)
        });
      }
    }

    return gaps;
  }

  /**
   * Determine gap severity based on duration
   */
  private getGapSeverity(gapDays: number): 'minor' | 'moderate' | 'severe' {
    if (gapDays <= 14) return 'minor';
    if (gapDays <= 30) return 'moderate';
    return 'severe';
  }

  /**
   * Generate comprehensive data quality metrics
   * Requirements: 6.5
   */
  generateDataQualityMetrics(
    crimeIncidents: CrimeIncident[],
    moonPhases: MoonPhaseData[],
    expectedDateRange: { start: Date; end: Date }
  ): DataQualityMetrics {
    // Validate crime incidents are in range
    const rangeValidation = this.validateCrimeIncidentsInRange(crimeIncidents, moonPhases);
    
    // Check temporal coverage
    const coverageCheck = this.checkTemporalCoverage(crimeIncidents, moonPhases, expectedDateRange);

    // Generate quality issues
    const issues: DataQualityIssue[] = [];

    // Check for out-of-range crimes
    if (rangeValidation.outOfRange.length > 0) {
      const issue: DataQualityIssue = {
        type: 'out_of_range',
        severity: 'error',
        message: `${rangeValidation.outOfRange.length} crime incidents fall outside moon phase date range`,
        affectedRecords: rangeValidation.outOfRange.length
      };
      
      if (rangeValidation.moonPhaseRange) {
        issue.dateRange = rangeValidation.moonPhaseRange;
      }
      
      issues.push(issue);
    }

    // Check for insufficient coverage
    if (!coverageCheck.hasSufficientCoverage) {
      issues.push({
        type: 'insufficient_coverage',
        severity: 'warning',
        message: `Temporal coverage is ${coverageCheck.coveragePercent.toFixed(1)}% (minimum required: ${this.minCoveragePercent}%)`,
        dateRange: expectedDateRange
      });
    }

    // Check for significant gaps
    const severeGaps = coverageCheck.gaps.filter(gap => gap.severity === 'severe');
    if (severeGaps.length > 0) {
      issues.push({
        type: 'temporal_gap',
        severity: 'error',
        message: `${severeGaps.length} severe temporal gaps detected`,
        affectedRecords: severeGaps.length
      });
    }

    // Check for data sparsity
    const totalExpectedDays = Math.ceil(
      (expectedDateRange.end.getTime() - expectedDateRange.start.getTime()) / (24 * 60 * 60 * 1000)
    );
    const crimeIncidentsPerDay = crimeIncidents.length / totalExpectedDays;
    
    if (crimeIncidentsPerDay < 0.1) { // Less than 1 incident per 10 days
      issues.push({
        type: 'data_sparsity',
        severity: 'warning',
        message: `Low crime incident density: ${crimeIncidentsPerDay.toFixed(3)} incidents per day`,
        dateRange: expectedDateRange
      });
    }

    // Calculate overall quality score
    let qualityScore = 100;
    
    // Deduct points for out-of-range crimes
    const outOfRangePercent = crimeIncidents.length > 0 
      ? (rangeValidation.outOfRange.length / crimeIncidents.length) * 100 
      : 0;
    qualityScore -= outOfRangePercent * 0.5; // 0.5 points per percent out of range
    
    // Deduct points for insufficient coverage
    const coverageDeficit = Math.max(0, this.minCoveragePercent - coverageCheck.coveragePercent);
    qualityScore -= coverageDeficit * 0.3; // 0.3 points per percent below minimum
    
    // Deduct points for severe gaps
    qualityScore -= severeGaps.length * 10; // 10 points per severe gap
    
    // Ensure score doesn't go below 0
    qualityScore = Math.max(0, qualityScore);

    return {
      totalCrimeIncidents: crimeIncidents.length,
      totalMoonPhases: moonPhases.length,
      crimeIncidentsInRange: rangeValidation.inRange.length,
      crimeIncidentsOutOfRange: rangeValidation.outOfRange.length,
      temporalCoveragePercent: coverageCheck.coveragePercent,
      dataGaps: coverageCheck.gaps,
      qualityScore,
      issues
    };
  }

  /**
   * Generate comprehensive data integrity report
   * Requirements: 6.5
   */
  generateIntegrityReport(
    crimeIncidents: CrimeIncident[],
    moonPhases: MoonPhaseData[],
    expectedDateRange: { start: Date; end: Date }
  ): DataIntegrityReport {
    const qualityMetrics = this.generateDataQualityMetrics(crimeIncidents, moonPhases, expectedDateRange);
    
    // Determine if data is valid
    const hasErrors = qualityMetrics.issues.some(issue => issue.severity === 'error');
    const isValid = !hasErrors && qualityMetrics.qualityScore >= 70; // Minimum quality threshold

    // Generate recommendations
    const recommendations: string[] = [];

    if (qualityMetrics.crimeIncidentsOutOfRange > 0) {
      recommendations.push(
        `Remove or adjust ${qualityMetrics.crimeIncidentsOutOfRange} crime incidents that fall outside the moon phase date range`
      );
    }

    if (qualityMetrics.temporalCoveragePercent < this.minCoveragePercent) {
      recommendations.push(
        `Improve temporal coverage from ${qualityMetrics.temporalCoveragePercent.toFixed(1)}% to at least ${this.minCoveragePercent}%`
      );
    }

    const severeGaps = qualityMetrics.dataGaps.filter(gap => gap.severity === 'severe');
    if (severeGaps.length > 0) {
      recommendations.push(
        `Address ${severeGaps.length} severe temporal gaps by obtaining additional data or adjusting the analysis period`
      );
    }

    if (qualityMetrics.qualityScore < 80) {
      recommendations.push(
        `Improve overall data quality score from ${qualityMetrics.qualityScore.toFixed(1)} to at least 80`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Data integrity is satisfactory. No immediate actions required.');
    }

    return {
      isValid,
      qualityMetrics,
      recommendations,
      validationTimestamp: new Date()
    };
  }
}

// Export singleton instance
export const timestampAligner = new TimestampAligner();
export const dataIntegrityValidator = new DataIntegrityValidator();