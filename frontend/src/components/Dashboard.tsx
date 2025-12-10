import React, { useState } from 'react';
import { Container, Typography, Box, Grid, Alert, CircularProgress, Backdrop } from '@mui/material';
import FilterPanel from './FilterPanel';
import CorrelationChart from './CorrelationChart';
import LunarCycleChart from './LunarCycleChart';
import CorrelationHeatmap from './CorrelationHeatmap';
import TrendAnalysisChart from './TrendAnalysisChart';
import StatisticsPanel from './StatisticsPanel';
import ExportControls from './ExportControls';
import LocationSelector from './LocationSelector';
import DateRangePicker, { DateRange } from './DateRangePicker';
import RealTimeStatus from './RealTimeStatus';
import { useRealTimeData } from './RealTimeDataProvider';
import { FilterState, createDefaultFilterState } from '../types/filters';
import { 
  CorrelationDataPoint, 
  MoonPhaseData, 
  StatisticalSummary, 
  ExportConfiguration,
  ShareableAnalysis,
  LocationInfo
} from '../types/data';
import { 
  useMoonPhases, 
  useCrimeData, 
  useCorrelationAnalysis, 
  useStatistics,
  useExportAnalysis,
  useShareAnalysis
} from '../hooks/useApi';
import { subMonths, startOfDay, endOfDay } from 'date-fns';

const Dashboard: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>(createDefaultFilterState());
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [, setLocationInfo] = useState<LocationInfo | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfDay(subMonths(new Date(), 3)),
    end: endOfDay(new Date()),
  });

  // API data fetching
  const dataFetchParams = {
    location: selectedLocation || '',
    startDate: dateRange.start,
    endDate: dateRange.end,
    filters,
  };

  const {
    data: moonPhases = [],
    isLoading: isLoadingMoonPhases,
    error: moonPhasesError,
  } = useMoonPhases(dataFetchParams, !!selectedLocation);

  const {
    data: = [],
    isLoading: isLoadingCrimeData,
    error: crimeDataError,
  } = useCrimeData(dataFetchParams, !!selectedLocation);

  const {
    data: correlationData = [],
    isLoading: isLoadingCorrelation,
    error: correlationError,
  } = useCorrelationAnalysis(dataFetchParams, !!selectedLocation);

  const {
    data: statisticalSummary,
    isLoading: isLoadingStatistics,
    error: statisticsError,
  } = useStatistics(dataFetchParams, !!selectedLocation);

  // Export and share mutations
  const exportMutation = useExportAnalysis();
  const shareMutation = useShareAnalysis();

  // Real-time data integration
  const { subscribeToLocation, unsubscribeFromLocation, isConnected } = useRealTimeData();

  // Loading states
  const isLoading = isLoadingMoonPhases || isLoadingCrimeData || isLoadingCorrelation || isLoadingStatistics;
  const hasError = moonPhasesError || crimeDataError || correlationError || statisticsError;

  // Mock fallback data for when no real data is available
  const [fallbackCorrelationData] = useState<CorrelationDataPoint[]>([
    {
      crimeIncident: {
        id: '1',
        timestamp: new Date('2023-01-15T22:30:00'),
        location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' },
        crimeType: { category: 'violent', subcategory: 'assault' },
        severity: 'felony',
        description: 'Assault incident',
        resolved: false
      },
      moonPhase: {
        timestamp: new Date('2023-01-15'),
        phaseName: 'full',
        illuminationPercent: 98.5,
        phaseAngle: 180,
        distanceKm: 384400,
        location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' }
      }
    },
    {
      crimeIncident: {
        id: '2',
        timestamp: new Date('2023-01-20T14:15:00'),
        location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' },
        crimeType: { category: 'property', subcategory: 'theft' },
        severity: 'misdemeanor',
        description: 'Property theft',
        resolved: true
      },
      moonPhase: {
        timestamp: new Date('2023-01-20'),
        phaseName: 'waning_gibbous',
        illuminationPercent: 75.2,
        phaseAngle: 220,
        distanceKm: 384400,
        location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' }
      }
    }
  ]);

  // Mock fallback lunar cycle data
  const [fallbackLunarData] = useState<MoonPhaseData[]>([
    {
      timestamp: new Date('2023-01-01'),
      phaseName: 'new',
      illuminationPercent: 2.1,
      phaseAngle: 0,
      distanceKm: 384400,
      location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' }
    },
    {
      timestamp: new Date('2023-01-08'),
      phaseName: 'first_quarter',
      illuminationPercent: 50.0,
      phaseAngle: 90,
      distanceKm: 384400,
      location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' }
    },
    {
      timestamp: new Date('2023-01-15'),
      phaseName: 'full',
      illuminationPercent: 98.5,
      phaseAngle: 180,
      distanceKm: 384400,
      location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' }
    },
    {
      timestamp: new Date('2023-01-20'),
      phaseName: 'waning_gibbous',
      illuminationPercent: 75.2,
      phaseAngle: 220,
      distanceKm: 384400,
      location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' }
    },
    {
      timestamp: new Date('2023-01-23'),
      phaseName: 'last_quarter',
      illuminationPercent: 50.0,
      phaseAngle: 270,
      distanceKm: 384400,
      location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' }
    },
    {
      timestamp: new Date('2023-01-30'),
      phaseName: 'waning_crescent',
      illuminationPercent: 15.3,
      phaseAngle: 320,
      distanceKm: 384400,
      location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' }
    }
  ]);

  // Mock fallback heatmap data
  const [fallbackHeatmapData] = useState([
    {
      crimeType: 'violent',
      moonPhase: 'full',
      correlationValue: 0.23,
      significance: 0.02,
      sampleSize: 150
    },
    {
      crimeType: 'violent',
      moonPhase: 'new',
      correlationValue: -0.15,
      significance: 0.08,
      sampleSize: 120
    },
    {
      crimeType: 'property',
      moonPhase: 'full',
      correlationValue: 0.08,
      significance: 0.45,
      sampleSize: 200
    },
    {
      crimeType: 'property',
      moonPhase: 'new',
      correlationValue: -0.05,
      significance: 0.67,
      sampleSize: 180
    },
    {
      crimeType: 'drug',
      moonPhase: 'full',
      correlationValue: 0.31,
      significance: 0.01,
      sampleSize: 95
    },
    {
      crimeType: 'drug',
      moonPhase: 'new',
      correlationValue: -0.18,
      significance: 0.12,
      sampleSize: 85
    }
  ]);

  // Mock fallback trend analysis data
  const [fallbackTrendData] = useState([
    {
      date: new Date('2023-01-01'),
      moonPhase: 'new',
      crimeCount: 15,
      significance: 0.03,
      confidenceInterval: [12, 18] as [number, number]
    },
    {
      date: new Date('2023-01-08'),
      moonPhase: 'first_quarter',
      crimeCount: 22,
      significance: 0.12,
      confidenceInterval: [18, 26] as [number, number]
    },
    {
      date: new Date('2023-01-15'),
      moonPhase: 'full',
      crimeCount: 35,
      significance: 0.001,
      confidenceInterval: [30, 40] as [number, number]
    },
    {
      date: new Date('2023-01-23'),
      moonPhase: 'last_quarter',
      crimeCount: 18,
      significance: 0.08,
      confidenceInterval: [15, 21] as [number, number]
    },
    {
      date: new Date('2023-01-30'),
      moonPhase: 'new',
      crimeCount: 14,
      significance: 0.04,
      confidenceInterval: [11, 17] as [number, number]
    }
  ]);

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters(createDefaultFilterState());
  };

  const handleLocationChange = (location: string | null) => {
    // Unsubscribe from previous location
    if (selectedLocation && isConnected) {
      unsubscribeFromLocation(selectedLocation);
    }
    
    setSelectedLocation(location);
    
    // Subscribe to new location
    if (location && isConnected) {
      subscribeToLocation(location);
    }
  };

  const handleRefreshRequest = () => {
    // Trigger manual data refresh
    if (selectedLocation) {
      // This will be handled by the real-time data provider
      console.log('Manual refresh requested for location:', selectedLocation);
    }
  };

  const handlePointSelect = (point: CorrelationDataPoint) => {
    console.log('Selected point:', point);
  };

  const handlePhaseSelect = (phase: MoonPhaseData) => {
    console.log('Selected phase:', phase);
  };

  const handleHeatmapCellSelect = (data: any) => {
    console.log('Selected heatmap cell:', data);
  };

  const handleTrendPointSelect = (point: any) => {
    console.log('Selected trend point:', point);
  };

  // Mock fallback statistical summary data
  const [fallbackStatisticalSummary] = useState<StatisticalSummary>({
    overallCorrelation: 0.23,
    significantCorrelations: [
      {
        crimeType: { category: 'violent', subcategory: 'assault' },
        moonPhase: 'full',
        correlationCoefficient: 0.31,
        pValue: 0.002,
        confidenceInterval: [0.15, 0.47],
        sampleSize: 150,
        significanceLevel: 0.05
      },
      {
        crimeType: { category: 'property', subcategory: 'theft' },
        moonPhase: 'new',
        correlationCoefficient: -0.18,
        pValue: 0.045,
        confidenceInterval: [-0.35, -0.01],
        sampleSize: 200,
        significanceLevel: 0.05
      },
      {
        crimeType: { category: 'drug', subcategory: 'possession' },
        moonPhase: 'full',
        correlationCoefficient: 0.42,
        pValue: 0.001,
        confidenceInterval: [0.28, 0.56],
        sampleSize: 95,
        significanceLevel: 0.05
      }
    ],
    totalSampleSize: 445,
    analysisDateRange: {
      start: new Date('2023-01-01'),
      end: new Date('2023-01-31')
    },
    location: 'New York City, NY',
    confidenceLevel: 0.95
  });

  const handleExport = async (config: ExportConfiguration): Promise<void> => {
    try {
      await exportMutation.mutateAsync(config);
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  };

  const handleShare = async (config: ExportConfiguration): Promise<ShareableAnalysis> => {
    try {
      return await shareMutation.mutateAsync(config);
    } catch (error) {
      console.error('Share failed:', error);
      throw error;
    }
  };

  // Use real data if available, otherwise fall back to mock data
  const displayCorrelationData = correlationData.length > 0 ? correlationData : fallbackCorrelationData;
  const displayLunarData = moonPhases.length > 0 ? moonPhases : fallbackLunarData;
  const displayStatistics = statisticalSummary || fallbackStatisticalSummary;
  const displayHeatmapData = fallbackHeatmapData; // TODO: Generate from real correlation data
  const displayTrendData = fallbackTrendData; // TODO: Generate from real correlation data

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h3" component="h1" gutterBottom>
              Lunar Crime Analyzer
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Correlating moon phases with crime statistics
            </Typography>
          </Box>
          <RealTimeStatus 
            currentLocation={selectedLocation || undefined}
            onRefreshRequest={handleRefreshRequest}
          />
        </Box>
        
        
        {/* Location and Date Selection */}
        <Grid container spacing={3} sx={{ mt: 2, mb: 3 }}>
          <Grid item xs={12} md={6}>
            <LocationSelector
              value={selectedLocation}
              onChange={handleLocationChange}
              onLocationInfo={setLocationInfo}
              disabled={isLoading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              disabled={isLoading || !selectedLocation}
            />
          </Grid>
        </Grid>

        {/* Error Display */}
        {hasError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              Error loading data:
            </Typography>
            {moonPhasesError && <Typography variant="caption" display="block">Moon phases: {(moonPhasesError as Error).message}</Typography>}
            {crimeDataError && <Typography variant="caption" display="block">Crime data: {(crimeDataError as Error).message}</Typography>}
            {correlationError && <Typography variant="caption" display="block">Correlation analysis: {(correlationError as Error).message}</Typography>}
            {statisticsError && <Typography variant="caption" display="block">Statistics: {(statisticsError as Error).message}</Typography>}
          </Alert>
        )}

        {/* No Location Selected */}
        {!selectedLocation && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Please select a location to begin analysis. The dashboard will show sample data until a location is selected.
          </Alert>
        )}
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FilterPanel
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onResetFilters={handleResetFilters}
                disabled={isLoading}
              />
              <ExportControls
                statistics={displayStatistics}
                filters={filters}
                onExport={handleExport}
                onShare={handleShare}
                disabled={isLoading || !selectedLocation}
                isExporting={exportMutation.isLoading}
                isSharing={shareMutation.isLoading}
              />
            </Box>
          </Grid>
          <Grid item xs={12} md={9}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <LunarCycleChart
                data={displayLunarData}
                onPhaseSelect={handlePhaseSelect}
                loading={isLoadingMoonPhases}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <CorrelationChart
                    data={displayCorrelationData}
                    onPointSelect={handlePointSelect}
                    loading={isLoadingCorrelation}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <CorrelationHeatmap
                    data={displayHeatmapData}
                    onCellSelect={handleHeatmapCellSelect}
                    loading={isLoadingCorrelation}
                  />
                </Box>
              </Box>
              <TrendAnalysisChart
                data={displayTrendData}
                onPointSelect={handleTrendPointSelect}
                loading={isLoadingCorrelation}
              />
              <StatisticsPanel 
                statistics={displayStatistics} 
                loading={isLoadingStatistics}
              />
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Loading Backdrop */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={isLoading && !!selectedLocation}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress color="inherit" />
          <Typography variant="body2">
            Loading analysis data...
          </Typography>
        </Box>
      </Backdrop>
    </Container>
  );
};

export default Dashboard;