import express from 'express';
import { MoonPhaseData, CrimeIncident, GeographicCoordinate, CrimeType } from '../types';

const router = express.Router();

// GET /api/moon-phases - Fetch moon phase data
router.get('/moon-phases', (req, res) => {
  try {
    const { location, startDate, endDate } = req.query;
    
    if (!location || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Missing required parameters: location, startDate, endDate' 
      });
    }
    
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    // Generate mock moon phase data
    const moonPhases = generateMockMoonPhases(start, end, location as string);
    
    return res.json(moonPhases);
  } catch (error) {
    console.error('Error fetching moon phases:', error);
    return res.status(500).json({ error: 'Failed to fetch moon phase data' });
  }
});

// GET /api/crime-data - Fetch crime incident data
router.get('/crime-data', (req, res) => {
  try {
    const { location, startDate, endDate } = req.query;
    
    if (!location || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Missing required parameters: location, startDate, endDate' 
      });
    }
    
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    // Generate mock crime data
    const crimeData = generateMockCrimeData(start, end, location as string);
    
    return res.json(crimeData);
  } catch (error) {
    console.error('Error fetching crime data:', error);
    return res.status(500).json({ error: 'Failed to fetch crime data' });
  }
});

// Helper function to generate mock moon phase data
function generateMockMoonPhases(startDate: Date, endDate: Date, location: string): MoonPhaseData[] {
  const phases: MoonPhaseData[] = [];
  const phaseNames: MoonPhaseData['phaseName'][] = [
    'new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous',
    'full', 'waning_gibbous', 'last_quarter', 'waning_crescent'
  ];
  
  // Mock coordinates for different locations
  const coordinates: Record<string, GeographicCoordinate> = {
    'New York City': { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' },
    'Los Angeles': { latitude: 34.0522, longitude: -118.2437, jurisdiction: 'LA' },
    'Chicago': { latitude: 41.8781, longitude: -87.6298, jurisdiction: 'Chicago' },
    'Houston': { latitude: 29.7604, longitude: -95.3698, jurisdiction: 'Houston' },
    'Phoenix': { latitude: 33.4484, longitude: -112.0740, jurisdiction: 'Phoenix' },
  };
  
  const locationCoords: GeographicCoordinate = coordinates[location] || coordinates['New York City']!;
  
  // Generate phases approximately every 3.7 days (lunar cycle is ~29.5 days / 8 phases)
  const current = new Date(startDate);
  let phaseIndex = 0;
  
  while (current <= endDate) {
    const phase = phaseNames[phaseIndex % phaseNames.length]!;
    const illumination = calculateIllumination(phase);
    const phaseAngle = phaseIndex * 45; // 360 degrees / 8 phases
    
    phases.push({
      timestamp: new Date(current),
      phaseName: phase,
      illuminationPercent: illumination + (Math.random() - 0.5) * 10, // Add some variation
      phaseAngle: phaseAngle,
      distanceKm: 384400 + Math.random() * 20000 - 10000, // Moon distance varies
      location: locationCoords,
    });
    
    current.setDate(current.getDate() + 3.7); // Approximate phase duration
    phaseIndex++;
  }
  
  return phases;
}

// Helper function to generate mock crime data
function generateMockCrimeData(startDate: Date, endDate: Date, location: string): CrimeIncident[] {
  const crimes: CrimeIncident[] = [];
  const crimeTypes: CrimeType[] = [
    { category: 'violent', subcategory: 'assault' },
    { category: 'violent', subcategory: 'robbery' },
    { category: 'property', subcategory: 'theft' },
    { category: 'property', subcategory: 'burglary' },
    { category: 'drug', subcategory: 'possession' },
    { category: 'public_order', subcategory: 'disorderly conduct' },
    { category: 'white_collar', subcategory: 'fraud' },
  ];
  
  const severities: CrimeIncident['severity'][] = ['misdemeanor', 'felony', 'violation'];
  
  // Mock coordinates for different locations
  const coordinates: Record<string, GeographicCoordinate> = {
    'New York City': { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' },
    'Los Angeles': { latitude: 34.0522, longitude: -118.2437, jurisdiction: 'LA' },
    'Chicago': { latitude: 41.8781, longitude: -87.6298, jurisdiction: 'Chicago' },
    'Houston': { latitude: 29.7604, longitude: -95.3698, jurisdiction: 'Houston' },
    'Phoenix': { latitude: 33.4484, longitude: -112.0740, jurisdiction: 'Phoenix' },
  };
  
  const baseCoords: GeographicCoordinate = coordinates[location] || coordinates['New York City']!;
  
  // Generate random number of crimes per day (5-50)
  const current = new Date(startDate);
  let crimeId = 1;
  
  while (current <= endDate) {
    const crimesPerDay = Math.floor(Math.random() * 45) + 5;
    
    for (let i = 0; i < crimesPerDay; i++) {
      const crimeType: CrimeType = crimeTypes[Math.floor(Math.random() * crimeTypes.length)]!;
      const severity: CrimeIncident['severity'] = severities[Math.floor(Math.random() * severities.length)]!;
      
      // Random time during the day
      const crimeTime = new Date(current);
      crimeTime.setHours(Math.floor(Math.random() * 24));
      crimeTime.setMinutes(Math.floor(Math.random() * 60));
      
      // Random location within ~10km of city center
      const latOffset = (Math.random() - 0.5) * 0.2; // ~10km
      const lngOffset = (Math.random() - 0.5) * 0.2;
      
      crimes.push({
        id: `crime-${crimeId++}`,
        timestamp: crimeTime,
        location: {
          latitude: baseCoords.latitude + latOffset,
          longitude: baseCoords.longitude + lngOffset,
          jurisdiction: baseCoords.jurisdiction,
        },
        crimeType,
        severity,
        description: `${crimeType.subcategory} incident`,
        caseNumber: `CASE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        resolved: Math.random() > 0.3, // 70% resolution rate
      });
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return crimes;
}

// Helper function to calculate illumination percentage based on phase
function calculateIllumination(phase: MoonPhaseData['phaseName']): number {
  const illuminationMap: Record<MoonPhaseData['phaseName'], number> = {
    'new': 0,
    'waxing_crescent': 25,
    'first_quarter': 50,
    'waxing_gibbous': 75,
    'full': 100,
    'waning_gibbous': 75,
    'last_quarter': 50,
    'waning_crescent': 25,
  };
  
  return illuminationMap[phase];
}

export default router;