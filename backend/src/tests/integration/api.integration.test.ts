import request from 'supertest';
import app from '../../index';

describe('API Integration Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('websocket');
    });
  });

  describe('Location API', () => {
    describe('GET /api/locations', () => {
      it('should return locations when searching', async () => {
        const response = await request(app)
          .get('/api/locations')
          .query({ query: 'New York' })
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        
        const location = response.body[0];
        expect(location).toHaveProperty('id');
        expect(location).toHaveProperty('name');
        expect(location).toHaveProperty('latitude');
        expect(location).toHaveProperty('longitude');
        expect(location).toHaveProperty('country');
      });

      it('should return empty array for non-existent locations', async () => {
        const response = await request(app)
          .get('/api/locations')
          .query({ query: 'NonExistentCity12345' })
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0);
      });

      it('should return all locations when no query provided', async () => {
        const response = await request(app)
          .get('/api/locations')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });
    });

    describe('GET /api/locations/:id/availability', () => {
      it('should return data availability for valid location', async () => {
        const response = await request(app)
          .get('/api/locations/nyc-1/availability')
          .expect(200);

        expect(response.body).toHaveProperty('crimeDataAvailable');
        expect(response.body).toHaveProperty('moonDataAvailable');
        expect(response.body).toHaveProperty('dateRange');
        expect(response.body).toHaveProperty('limitations');
        expect(response.body).toHaveProperty('dataQuality');
      });

      it('should return 404 for invalid location', async () => {
        const response = await request(app)
          .get('/api/locations/invalid-id/availability')
          .expect(404);

        expect(response.body).toHaveProperty('error', 'Location not found');
      });
    });
  });

  describe('Data API', () => {
    describe('GET /api/moon-phases', () => {
      it('should return moon phase data with valid parameters', async () => {
        const response = await request(app)
          .get('/api/moon-phases')
          .query({
            location: 'New York City',
            startDate: '2023-01-01',
            endDate: '2023-01-31',
          })
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        
        const moonPhase = response.body[0];
        expect(moonPhase).toHaveProperty('timestamp');
        expect(moonPhase).toHaveProperty('phaseName');
        expect(moonPhase).toHaveProperty('illuminationPercent');
        expect(moonPhase).toHaveProperty('phaseAngle');
        expect(moonPhase).toHaveProperty('distanceKm');
        expect(moonPhase).toHaveProperty('location');
      });

      it('should return 400 for missing parameters', async () => {
        const response = await request(app)
          .get('/api/moon-phases')
          .query({
            location: 'New York City',
            // Missing startDate and endDate
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Missing required parameters');
      });
    });

    describe('GET /api/crime-data', () => {
      it('should return crime data with valid parameters', async () => {
        const response = await request(app)
          .get('/api/crime-data')
          .query({
            location: 'New York City',
            startDate: '2023-01-01',
            endDate: '2023-01-31',
          })
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        
        const crimeIncident = response.body[0];
        expect(crimeIncident).toHaveProperty('id');
        expect(crimeIncident).toHaveProperty('timestamp');
        expect(crimeIncident).toHaveProperty('location');
        expect(crimeIncident).toHaveProperty('crimeType');
        expect(crimeIncident).toHaveProperty('severity');
        expect(crimeIncident).toHaveProperty('description');
        expect(crimeIncident).toHaveProperty('resolved');
      });

      it('should return 400 for missing parameters', async () => {
        const response = await request(app)
          .get('/api/crime-data')
          .query({
            location: 'New York City',
            // Missing startDate and endDate
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Missing required parameters');
      });
    });
  });

  describe('Analysis API', () => {
    describe('POST /api/correlations', () => {
      it('should return correlation analysis with valid parameters', async () => {
        const response = await request(app)
          .post('/api/correlations')
          .send({
            location: 'New York City',
            startDate: '2023-01-01',
            endDate: '2023-01-31',
            filters: {},
          })
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        
        const correlationPoint = response.body[0];
        expect(correlationPoint).toHaveProperty('crimeIncident');
        expect(correlationPoint).toHaveProperty('moonPhase');
        expect(correlationPoint).toHaveProperty('correlationValue');
      });

      it('should return 400 for missing parameters', async () => {
        const response = await request(app)
          .post('/api/correlations')
          .send({
            location: 'New York City',
            // Missing startDate and endDate
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Missing required parameters');
      });
    });

    describe('GET /api/statistics', () => {
      it('should return statistical summary with valid parameters', async () => {
        const response = await request(app)
          .get('/api/statistics')
          .query({
            location: 'New York City',
            startDate: '2023-01-01',
            endDate: '2023-01-31',
          })
          .expect(200);

        expect(response.body).toHaveProperty('overallCorrelation');
        expect(response.body).toHaveProperty('significantCorrelations');
        expect(response.body).toHaveProperty('totalSampleSize');
        expect(response.body).toHaveProperty('analysisDateRange');
        expect(response.body).toHaveProperty('location');
        expect(response.body).toHaveProperty('confidenceLevel');
        
        expect(Array.isArray(response.body.significantCorrelations)).toBe(true);
      });

      it('should return 400 for missing parameters', async () => {
        const response = await request(app)
          .get('/api/statistics')
          .query({
            location: 'New York City',
            // Missing startDate and endDate
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Missing required parameters');
      });
    });
  });

  describe('Export API', () => {
    describe('POST /api/export', () => {
      it('should export CSV data', async () => {
        const response = await request(app)
          .post('/api/export')
          .send({
            format: 'csv',
            includeCharts: false,
            includeStatistics: true,
            includeRawData: true,
          })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.text).toContain('Date,Moon Phase,Crime Type');
      });

      it('should export PDF data', async () => {
        const response = await request(app)
          .post('/api/export')
          .send({
            format: 'pdf',
            includeCharts: true,
            includeStatistics: true,
            includeRawData: false,
          })
          .expect(200);

        expect(response.headers['content-type']).toContain('application/pdf');
        expect(response.headers['content-disposition']).toContain('attachment');
      });

      it('should export PNG data', async () => {
        const response = await request(app)
          .post('/api/export')
          .send({
            format: 'png',
            includeCharts: true,
            includeStatistics: false,
            includeRawData: false,
          })
          .expect(200);

        expect(response.headers['content-type']).toContain('image/png');
        expect(response.headers['content-disposition']).toContain('attachment');
      });

      it('should return 400 for missing format', async () => {
        const response = await request(app)
          .post('/api/export')
          .send({
            includeCharts: true,
            includeStatistics: true,
            includeRawData: false,
          })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Export format is required');
      });

      it('should return 400 for unsupported format', async () => {
        const response = await request(app)
          .post('/api/export')
          .send({
            format: 'unsupported',
            includeCharts: true,
            includeStatistics: true,
            includeRawData: false,
          })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Unsupported export format');
      });
    });

    describe('POST /api/shared', () => {
      it('should create shareable analysis', async () => {
        const response = await request(app)
          .post('/api/shared')
          .send({
            format: 'png',
            includeCharts: true,
            includeStatistics: true,
            includeRawData: false,
          })
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('location');
        expect(response.body).toHaveProperty('dateRange');
        expect(response.body).toHaveProperty('filters');
        expect(response.body).toHaveProperty('exportConfig');
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('expiresAt');
      });
    });

    describe('GET /api/shared/:id', () => {
      it('should retrieve shared analysis', async () => {
        const response = await request(app)
          .get('/api/shared/test-id')
          .expect(200);

        expect(response.body).toHaveProperty('id', 'test-id');
        expect(response.body).toHaveProperty('location');
        expect(response.body).toHaveProperty('dateRange');
        expect(response.body).toHaveProperty('filters');
        expect(response.body).toHaveProperty('exportConfig');
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('expiresAt');
      });
    });
  });

  describe('End-to-End Data Pipeline', () => {
    it('should complete full data pipeline from location to analysis', async () => {
      // Step 1: Search for locations
      const locationsResponse = await request(app)
        .get('/api/locations')
        .query({ query: 'New York' })
        .expect(200);

      expect(locationsResponse.body.length).toBeGreaterThan(0);
      const location = locationsResponse.body[0];

      // Step 2: Check data availability
      const availabilityResponse = await request(app)
        .get(`/api/locations/${location.id}/availability`)
        .expect(200);

      expect(availabilityResponse.body.crimeDataAvailable).toBe(true);
      expect(availabilityResponse.body.moonDataAvailable).toBe(true);

      // Step 3: Fetch moon phase data
      const moonPhasesResponse = await request(app)
        .get('/api/moon-phases')
        .query({
          location: location.name,
          startDate: '2023-01-01',
          endDate: '2023-01-31',
        })
        .expect(200);

      expect(moonPhasesResponse.body.length).toBeGreaterThan(0);

      // Step 4: Fetch crime data
      const crimeDataResponse = await request(app)
        .get('/api/crime-data')
        .query({
          location: location.name,
          startDate: '2023-01-01',
          endDate: '2023-01-31',
        })
        .expect(200);

      expect(crimeDataResponse.body.length).toBeGreaterThan(0);

      // Step 5: Perform correlation analysis
      const correlationResponse = await request(app)
        .post('/api/correlations')
        .send({
          location: location.name,
          startDate: '2023-01-01',
          endDate: '2023-01-31',
          filters: {},
        })
        .expect(200);

      expect(correlationResponse.body.length).toBeGreaterThan(0);

      // Step 6: Get statistical summary
      const statisticsResponse = await request(app)
        .get('/api/statistics')
        .query({
          location: location.name,
          startDate: '2023-01-01',
          endDate: '2023-01-31',
        })
        .expect(200);

      expect(statisticsResponse.body).toHaveProperty('overallCorrelation');
      expect(statisticsResponse.body).toHaveProperty('significantCorrelations');

      // Step 7: Export results
      const exportResponse = await request(app)
        .post('/api/export')
        .send({
          format: 'csv',
          includeCharts: false,
          includeStatistics: true,
          includeRawData: true,
        })
        .expect(200);

      expect(exportResponse.headers['content-type']).toContain('text/csv');

      // Step 8: Create shareable link
      const shareResponse = await request(app)
        .post('/api/shared')
        .send({
          format: 'png',
          includeCharts: true,
          includeStatistics: true,
          includeRawData: false,
        })
        .expect(200);

      expect(shareResponse.body).toHaveProperty('id');

      // Step 9: Retrieve shared analysis
      const sharedResponse = await request(app)
        .get(`/api/shared/${shareResponse.body.id}`)
        .expect(200);

      expect(sharedResponse.body.id).toBe(shareResponse.body.id);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed request bodies gracefully', async () => {
      const response = await request(app)
        .post('/api/correlations')
        .send('invalid json')
        .expect(400);

      // Express should handle malformed JSON and return 400
    });

    it('should handle very large date ranges', async () => {
      const response = await request(app)
        .get('/api/moon-phases')
        .query({
          location: 'New York City',
          startDate: '1900-01-01',
          endDate: '2100-12-31',
        })
        .expect(200);

      // Should still return data, but may be limited for performance
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/locations')
          .query({ query: 'New York' })
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });
    });
  });
});