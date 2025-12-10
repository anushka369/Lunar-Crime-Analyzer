import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Dashboard from '../../components/Dashboard';
import RealTimeDataProvider from '../../components/RealTimeDataProvider';
import * as apiService from '../../services/api';

// Mock the API service
jest.mock('../../services/api');
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

// Mock WebSocket
jest.mock('../../services/websocket', () => ({
  getWebSocketClient: () => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    subscribeToLocation: jest.fn(),
    unsubscribeFromLocation: jest.fn(),
    requestDataRefresh: jest.fn(),
    isConnected: jest.fn().mockReturnValue(true),
    getSubscribedLocations: jest.fn().mockReturnValue(new Set()),
    updateCallbacks: jest.fn(),
  }),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  formatDistanceToNow: jest.fn().mockReturnValue('2 minutes ago'),
}));

const theme = createTheme();

const renderDashboard = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <RealTimeDataProvider>
          <Dashboard />
        </RealTimeDataProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default API mocks
    mockedApiService.locationApi.searchLocations.mockResolvedValue([
      {
        id: 'nyc-1',
        name: 'New York City',
        state: 'New York',
        country: 'United States',
        latitude: 40.7128,
        longitude: -74.0060,
        population: 8336817,
      },
    ]);

    mockedApiService.locationApi.getDataAvailability.mockResolvedValue({
      crimeDataAvailable: true,
      moonDataAvailable: true,
      dateRange: {
        start: new Date('2020-01-01'),
        end: new Date(),
      },
      limitations: [],
      dataQuality: 'high',
    });

    mockedApiService.dataApi.getMoonPhases.mockResolvedValue([
      {
        timestamp: new Date('2023-01-15'),
        phaseName: 'full',
        illuminationPercent: 98.5,
        phaseAngle: 180,
        distanceKm: 384400,
        location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' },
      },
    ]);

    mockedApiService.dataApi.getCrimeData.mockResolvedValue([
      {
        id: '1',
        timestamp: new Date('2023-01-15T22:30:00'),
        location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' },
        crimeType: { category: 'violent', subcategory: 'assault' },
        severity: 'felony',
        description: 'Assault incident',
        resolved: false,
      },
    ]);

    mockedApiService.analysisApi.getCorrelationAnalysis.mockResolvedValue([
      {
        crimeIncident: {
          id: '1',
          timestamp: new Date('2023-01-15T22:30:00'),
          location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' },
          crimeType: { category: 'violent', subcategory: 'assault' },
          severity: 'felony',
          description: 'Assault incident',
          resolved: false,
        },
        moonPhase: {
          timestamp: new Date('2023-01-15'),
          phaseName: 'full',
          illuminationPercent: 98.5,
          phaseAngle: 180,
          distanceKm: 384400,
          location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' },
        },
      },
    ]);

    mockedApiService.analysisApi.getStatistics.mockResolvedValue({
      overallCorrelation: 0.23,
      significantCorrelations: [
        {
          crimeType: { category: 'violent', subcategory: 'assault' },
          moonPhase: 'full',
          correlationCoefficient: 0.31,
          pValue: 0.002,
          confidenceInterval: [0.15, 0.47],
          sampleSize: 150,
          significanceLevel: 0.05,
        },
      ],
      totalSampleSize: 445,
      analysisDateRange: {
        start: new Date('2023-01-01'),
        end: new Date('2023-01-31'),
      },
      location: 'New York City, NY',
      confidenceLevel: 0.95,
    });
  });

  describe('Complete User Journey: Location Selection to Analysis', () => {
    it('should complete full workflow from location selection to viewing analysis results', async () => {
      const user = userEvent.setup();
      renderDashboard();

      // Step 1: Verify initial state
      expect(screen.getByText('Lunar Crime Analyzer')).toBeInTheDocument();
      expect(screen.getByText('Please select a location to begin analysis')).toBeInTheDocument();

      // Step 2: Search and select a location
      const locationInput = screen.getByLabelText(/select location/i);
      await user.type(locationInput, 'New York');

      await waitFor(() => {
        expect(mockedApiService.locationApi.searchLocations).toHaveBeenCalledWith({
          query: 'New York',
        });
      });

      // Select the location from dropdown
      await waitFor(() => {
        const locationOption = screen.getByText(/New York City, New York/);
        expect(locationOption).toBeInTheDocument();
      });

      const locationOption = screen.getByText(/New York City, New York/);
      await user.click(locationOption);

      // Step 3: Verify data availability check
      await waitFor(() => {
        expect(mockedApiService.locationApi.getDataAvailability).toHaveBeenCalledWith('nyc-1');
      });

      await waitFor(() => {
        expect(screen.getByText('Data available for analysis')).toBeInTheDocument();
      });

      // Step 4: Verify date range picker is enabled
      const dateRangePicker = screen.getByText('Analysis Period');
      expect(dateRangePicker).toBeInTheDocument();

      // Step 5: Wait for data to load and verify API calls
      await waitFor(() => {
        expect(mockedApiService.dataApi.getMoonPhases).toHaveBeenCalled();
        expect(mockedApiService.dataApi.getCrimeData).toHaveBeenCalled();
        expect(mockedApiService.analysisApi.getCorrelationAnalysis).toHaveBeenCalled();
        expect(mockedApiService.analysisApi.getStatistics).toHaveBeenCalled();
      });

      // Step 6: Verify charts and analysis components are rendered
      await waitFor(() => {
        expect(screen.getByText('Lunar Cycle Timeline')).toBeInTheDocument();
        expect(screen.getByText('Crime Incidents vs Moon Phases')).toBeInTheDocument();
        expect(screen.getByText('Crime-Moon Phase Correlation Heatmap')).toBeInTheDocument();
        expect(screen.getByText('Crime Frequency Trends by Moon Phase')).toBeInTheDocument();
        expect(screen.getByText('Statistical Analysis Summary')).toBeInTheDocument();
      });

      // Step 7: Verify statistical results are displayed
      await waitFor(() => {
        expect(screen.getByText('0.230')).toBeInTheDocument(); // Overall correlation
        expect(screen.getByText('445')).toBeInTheDocument(); // Total sample size
      });
    });

    it('should handle location with limited data availability', async () => {
      const user = userEvent.setup();
      
      // Mock limited data availability
      mockedApiService.locationApi.getDataAvailability.mockResolvedValue({
        crimeDataAvailable: true,
        moonDataAvailable: false,
        limitations: ['Moon data not available for this location'],
        dataQuality: 'medium',
      });

      renderDashboard();

      // Select location
      const locationInput = screen.getByLabelText(/select location/i);
      await user.type(locationInput, 'New York');

      await waitFor(() => {
        const locationOption = screen.getByText(/New York City, New York/);
        expect(locationOption).toBeInTheDocument();
      });

      const locationOption = screen.getByText(/New York City, New York/);
      await user.click(locationOption);

      // Verify warning message is shown
      await waitFor(() => {
        expect(screen.getByText('Limited data available for this location:')).toBeInTheDocument();
        expect(screen.getByText('Moon data not available for this location')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Application Workflow', () => {
    it('should apply filters and update visualizations', async () => {
      const user = userEvent.setup();
      renderDashboard();

      // First select a location
      const locationInput = screen.getByLabelText(/select location/i);
      await user.type(locationInput, 'New York');

      await waitFor(() => {
        const locationOption = screen.getByText(/New York City, New York/);
        fireEvent.click(locationOption);
      });

      // Wait for initial data load
      await waitFor(() => {
        expect(mockedApiService.analysisApi.getCorrelationAnalysis).toHaveBeenCalled();
      });

      // Apply crime type filter
      const violentCrimeCheckbox = screen.getByRole('checkbox', { name: /all violent crimes/i });
      await user.click(violentCrimeCheckbox);

      // Verify filter is applied (checkbox should be unchecked)
      expect(violentCrimeCheckbox).not.toBeChecked();

      // Apply time of day filter
      const timeFilterSwitch = screen.getByRole('checkbox', { name: /time of day filter/i });
      await user.click(timeFilterSwitch);

      // Verify time filter is enabled
      expect(timeFilterSwitch).toBeChecked();

      // Reset all filters
      const clearAllButton = screen.getByRole('button', { name: /clear all/i });
      await user.click(clearAllButton);

      // Confirm reset in dialog
      const confirmButton = screen.getByRole('button', { name: /clear all filters/i });
      await user.click(confirmButton);

      // Verify filters are reset
      await waitFor(() => {
        expect(violentCrimeCheckbox).toBeChecked();
        expect(timeFilterSwitch).not.toBeChecked();
      });
    });
  });

  describe('Export and Share Workflow', () => {
    it('should export analysis in different formats', async () => {
      const user = userEvent.setup();
      
      // Mock export functionality
      mockedApiService.exportApi.exportAnalysis.mockResolvedValue(new Blob(['mock data'], { type: 'text/csv' }));

      renderDashboard();

      // Select location first
      const locationInput = screen.getByLabelText(/select location/i);
      await user.type(locationInput, 'New York');

      await waitFor(() => {
        const locationOption = screen.getByText(/New York City, New York/);
        fireEvent.click(locationOption);
      });

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Statistical Analysis Summary')).toBeInTheDocument();
      });

      // Test PNG export
      const pngExportButton = screen.getByRole('button', { name: /png image/i });
      await user.click(pngExportButton);

      await waitFor(() => {
        expect(mockedApiService.exportApi.exportAnalysis).toHaveBeenCalledWith(
          expect.objectContaining({ format: 'png' })
        );
      });

      // Test CSV export
      const csvExportButton = screen.getByRole('button', { name: /csv data/i });
      await user.click(csvExportButton);

      await waitFor(() => {
        expect(mockedApiService.exportApi.exportAnalysis).toHaveBeenCalledWith(
          expect.objectContaining({ format: 'csv' })
        );
      });
    });

    it('should create shareable analysis link', async () => {
      const user = userEvent.setup();
      
      // Mock share functionality
      mockedApiService.exportApi.shareAnalysis.mockResolvedValue({
        id: 'share-123',
        location: 'New York City, NY',
        dateRange: {
          start: new Date('2023-01-01'),
          end: new Date('2023-01-31'),
        },
        filters: {},
        exportConfig: { format: 'png', includeCharts: true, includeStatistics: true, includeRawData: false },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      renderDashboard();

      // Select location first
      const locationInput = screen.getByLabelText(/select location/i);
      await user.type(locationInput, 'New York');

      await waitFor(() => {
        const locationOption = screen.getByText(/New York City, New York/);
        fireEvent.click(locationOption);
      });

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Statistical Analysis Summary')).toBeInTheDocument();
      });

      // Create shareable link
      const shareButton = screen.getByRole('button', { name: /create shareable link/i });
      await user.click(shareButton);

      await waitFor(() => {
        expect(mockedApiService.exportApi.shareAnalysis).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling Workflow', () => {
    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock API error
      mockedApiService.dataApi.getMoonPhases.mockRejectedValue(new Error('API Error'));
      mockedApiService.dataApi.getCrimeData.mockRejectedValue(new Error('API Error'));

      renderDashboard();

      // Select location
      const locationInput = screen.getByLabelText(/select location/i);
      await user.type(locationInput, 'New York');

      await waitFor(() => {
        const locationOption = screen.getByText(/New York City, New York/);
        fireEvent.click(locationOption);
      });

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText('Error loading data:')).toBeInTheDocument();
      });
    });

    it('should handle location search errors', async () => {
      const user = userEvent.setup();
      
      // Mock search error
      mockedApiService.locationApi.searchLocations.mockRejectedValue(new Error('Search failed'));

      renderDashboard();

      // Try to search for location
      const locationInput = screen.getByLabelText(/select location/i);
      await user.type(locationInput, 'Invalid Location');

      // Verify error handling in location selector
      await waitFor(() => {
        expect(screen.getByText('Error searching locations. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Data Integration', () => {
    it('should display real-time connection status', async () => {
      renderDashboard();

      // Verify real-time status is displayed
      expect(screen.getByText('Live')).toBeInTheDocument();
      
      // Verify refresh button is present
      const refreshButton = screen.getByLabelText(/refresh data/i);
      expect(refreshButton).toBeInTheDocument();
    });
  });
});