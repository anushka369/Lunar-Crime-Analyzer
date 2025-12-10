import express from 'express';
import { CorrelationDataPoint, StatisticalSummary, CorrelationResult } from '../types';

const router = express.Router();

// POST /api/correlations - Perform correlation analysis
router.post('/correlations', (req, res) => {
  try {
    const { location, startDate, endDate, filters, crimeTypes, moonPhases } = req.body;
    
    if (!location || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Missing required parameters: location, startDate, endDate' 
      });
    }
    
    // Generate mock correlation data
    const correlationData = generateMockCorrelationData(
      new Date(startDate),
      new Date(endDate),
      location,
      filters
    );
    
    return res.json(correlationData);
  } catch (error) {
    console.error('Error performing correlation analysis:', error);
    return res.status(500).json({ error: 'Failed to perform correlation analysis' });
  }
});

// GET /api/statistics - Get statistical summary
router.get('/statistics', (req, res) => {
  try {
    const { location, startDate, endDate } = req.query;
    
    if (!location || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Missing required parameters: location, startDate, endDate' 
      });
    }
    
    // Generate mock statistical summary
    const statistics = generateMockStatistics(
      new Date(startDate as string),
      new Date(endDate as string),
      location as string
    );
    
    return res.json(statistics);
  } catch (error) {
    console.error('Error generating statistics:', error);
    return res.status(500).json({ error: 'Failed to generate statistics' });
  }
});

// Helper function to generate mock correlation data
function generateMockCorrelationData(
  startDate: Date,
  endDate: Date,
  location: string,
  filters?: any
): CorrelationDataPoint[] {
  const correlationData: CorrelationDataPoint[] = [];
  
  // This would normally fetch real moon phase and crime data and correlate them
  // For now, we'll generate mock data that shows some correlation patterns
  
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const numPoints = Math.min(daysDiff * 5, 500); // Limit to 500 points for performance
  
  for (let i = 0; i < numPoints; i++) {
    const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
    
    // Mock moon phase data
    const moonPhase = {
      timestamp: randomDate,
      phaseName: getMoonPhaseForDate(randomDate),
      illuminationPercent: Math.random() * 100,
      phaseAngle: Math.random() * 360,
      distanceKm: 384400 + Math.random() * 20000 - 10000,
      location: {
        latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
        longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
        jurisdiction: location,
      },
    };
    
    // Mock crime incident data
    const crimeIncident = {
      id: `crime-${i}`,
      timestamp: randomDate,
      location: {
        latitude: 40.7128 + (Math.random() - 0.5) * 0.2,
        longitude: -74.0060 + (Math.random() - 0.5) * 0.2,
        jurisdiction: location,
      },
      crimeType: {
        category: getRandomCrimeCategory(),
        subcategory: 'Mock crime',
      },
      severity: getRandomSeverity(),
      description: 'Mock crime incident',
      resolved: Math.random() > 0.3,
    };
    
    correlationData.push({
      crimeIncident,
      moonPhase,
      correlationValue: Math.random() * 2 - 1, // -1 to 1
    });
  }
  
  return correlationData;
}

// Helper function to generate mock statistical summary
function generateMockStatistics(
  startDate: Date,
  endDate: Date,
  location: string
): StatisticalSummary {
  const significantCorrelations: CorrelationResult[] = [
    {
      crimeType: { category: 'violent', subcategory: 'assault' },
      moonPhase: 'full',
      correlationCoefficient: 0.31,
      pValue: 0.002,
      confidenceInterval: [0.15, 0.47],
      sampleSize: 150,
      significanceLevel: 0.05,
    },
    {
      crimeType: { category: 'property', subcategory: 'theft' },
      moonPhase: 'new',
      correlationCoefficient: -0.18,
      pValue: 0.045,
      confidenceInterval: [-0.35, -0.01],
      sampleSize: 200,
      significanceLevel: 0.05,
    },
    {
      crimeType: { category: 'drug', subcategory: 'possession' },
      moonPhase: 'full',
      correlationCoefficient: 0.42,
      pValue: 0.001,
      confidenceInterval: [0.28, 0.56],
      sampleSize: 95,
      significanceLevel: 0.05,
    },
  ];
  
  return {
    totalCrimeIncidents: 445,
    dateRange: {
      start: startDate,
      end: endDate,
    },
    location: {
      latitude: 40.7128,
      longitude: -74.0060,
      jurisdiction: location
    },
    correlationResults: significantCorrelations,
    significantCorrelations,
    overallSignificance: 0.002,
    overallCorrelation: 0.23,
    totalSampleSize: 445,
    analysisDateRange: {
      start: startDate,
      end: endDate,
    },
    confidenceLevel: 0.95,
  };
}

// Helper functions
function getMoonPhaseForDate(date: Date): any {
  const phases = ['new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 'full', 'waning_gibbous', 'last_quarter', 'waning_crescent'];
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return phases[Math.floor(dayOfYear / 3.7) % phases.length];
}

function getRandomCrimeCategory(): any {
  const categories = ['violent', 'property', 'drug', 'public_order', 'white_collar'];
  return categories[Math.floor(Math.random() * categories.length)];
}

function getRandomSeverity(): any {
  const severities = ['misdemeanor', 'felony', 'violation'];
  return severities[Math.floor(Math.random() * severities.length)];
}

export default router;