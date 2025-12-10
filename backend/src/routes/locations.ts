import express from 'express';
import { LocationInfo, DataAvailability } from '../types';

const router = express.Router();

// Mock location data for demonstration
const mockLocations: LocationInfo[] = [
  {
    id: 'nyc-1',
    name: 'New York City',
    state: 'New York',
    country: 'United States',
    latitude: 40.7128,
    longitude: -74.0060,
    population: 8336817,
    timezone: 'America/New_York',
    coordinates: {
      latitude: 40.7128,
      longitude: -74.0060,
      jurisdiction: 'New York City Police Department'
    },
    jurisdiction: 'New York City Police Department',
    dataAvailability: {
      locationId: 'nyc-1',
      jurisdiction: 'New York City Police Department',
      crimeDataAvailable: true,
      moonDataAvailable: true,
      supportedCrimeTypes: []
    }
  },
  {
    id: 'la-1',
    name: 'Los Angeles',
    state: 'California',
    country: 'United States',
    latitude: 34.0522,
    longitude: -118.2437,
    population: 3898747,
    timezone: 'America/Los_Angeles',
    coordinates: {
      latitude: 34.0522,
      longitude: -118.2437,
      jurisdiction: 'Los Angeles Police Department'
    },
    jurisdiction: 'Los Angeles Police Department',
    dataAvailability: {
      locationId: 'la-1',
      jurisdiction: 'Los Angeles Police Department',
      crimeDataAvailable: true,
      moonDataAvailable: true,
      supportedCrimeTypes: []
    }
  },
  {
    id: 'chicago-1',
    name: 'Chicago',
    state: 'Illinois',
    country: 'United States',
    latitude: 41.8781,
    longitude: -87.6298,
    population: 2693976,
    timezone: 'America/Chicago',
    coordinates: {
      latitude: 41.8781,
      longitude: -87.6298,
      jurisdiction: 'Chicago Police Department'
    },
    jurisdiction: 'Chicago Police Department',
    dataAvailability: {
      locationId: 'chicago-1',
      jurisdiction: 'Chicago Police Department',
      crimeDataAvailable: true,
      moonDataAvailable: true,
      supportedCrimeTypes: []
    }
  },
  {
    id: 'houston-1',
    name: 'Houston',
    state: 'Texas',
    country: 'United States',
    latitude: 29.7604,
    longitude: -95.3698,
    population: 2320268,
    timezone: 'America/Chicago',
    coordinates: {
      latitude: 29.7604,
      longitude: -95.3698,
      jurisdiction: 'Houston Police Department'
    },
    jurisdiction: 'Houston Police Department',
    dataAvailability: {
      locationId: 'houston-1',
      jurisdiction: 'Houston Police Department',
      crimeDataAvailable: true,
      moonDataAvailable: true,
      supportedCrimeTypes: []
    }
  },
  {
    id: 'phoenix-1',
    name: 'Phoenix',
    state: 'Arizona',
    country: 'United States',
    latitude: 33.4484,
    longitude: -112.0740,
    population: 1608139,
    timezone: 'America/Phoenix',
    coordinates: {
      latitude: 33.4484,
      longitude: -112.0740,
      jurisdiction: 'Phoenix Police Department'
    },
    jurisdiction: 'Phoenix Police Department',
    dataAvailability: {
      locationId: 'phoenix-1',
      jurisdiction: 'Phoenix Police Department',
      crimeDataAvailable: true,
      moonDataAvailable: true,
      supportedCrimeTypes: []
    }
  },
];

// GET /api/locations - Search for locations
router.get('/', (req, res) => {
  try {
    const { query, latitude, longitude, radius } = req.query;
    
    let filteredLocations = mockLocations;
    
    if (query && typeof query === 'string') {
      const searchTerm = query.toLowerCase();
      filteredLocations = mockLocations.filter(location =>
        location.name.toLowerCase().includes(searchTerm) ||
        (location.state && location.state.toLowerCase().includes(searchTerm))
      );
    }
    
    if (latitude && longitude && radius) {
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const rad = parseFloat(radius as string);
      
      filteredLocations = filteredLocations.filter(location => {
        const distance = calculateDistance(lat, lng, location.latitude, location.longitude);
        return distance <= rad;
      });
    }
    
    res.json(filteredLocations);
  } catch (error) {
    console.error('Error searching locations:', error);
    res.status(500).json({ error: 'Failed to search locations' });
  }
});

// GET /api/locations/:id/availability - Check data availability for location
router.get('/:id/availability', (req, res) => {
  try {
    const { id } = req.params;
    
    const location = mockLocations.find(loc => loc.id === id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    // Mock data availability - in real implementation, this would check actual data sources
    const availability: DataAvailability = {
      locationId: id,
      jurisdiction: location.jurisdiction,
      crimeDataAvailable: true,
      moonDataAvailable: true,
      dateRange: {
        start: new Date('2020-01-01'),
        end: new Date(),
      },
      limitations: [],
      dataQuality: 'high',
      supportedCrimeTypes: []
    };
    
    // Simulate some locations having limited data
    if (location.population && location.population < 1000000) {
      availability.limitations = ['Limited historical data', 'Crime data may be incomplete'];
      availability.dataQuality = 'medium';
    }
    
    return res.json(availability);
  } catch (error) {
    console.error('Error checking data availability:', error);
    return res.status(500).json({ error: 'Failed to check data availability' });
  }
});

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default router;