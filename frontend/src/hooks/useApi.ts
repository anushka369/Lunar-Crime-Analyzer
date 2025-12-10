import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  locationApi, 
  dataApi, 
  analysisApi, 
  exportApi,
  LocationSearchParams,
  DataFetchParams,
  CorrelationAnalysisParams
} from '../services/api';
import { ExportConfiguration } from '../types/data';

// Query keys for consistent caching
export const queryKeys = {
  locations: (params: LocationSearchParams) => ['locations', params],
  dataAvailability: (locationId: string) => ['dataAvailability', locationId],
  moonPhases: (params: DataFetchParams) => ['moonPhases', params],
  crimeData: (params: DataFetchParams) => ['crimeData', params],
  correlationAnalysis: (params: CorrelationAnalysisParams) => ['correlationAnalysis', params],
  statistics: (params: DataFetchParams) => ['statistics', params],
  sharedAnalysis: (shareId: string) => ['sharedAnalysis', shareId],
};

// Location hooks
export const useLocationSearch = (params: LocationSearchParams, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.locations(params),
    queryFn: () => locationApi.searchLocations(params),
    enabled: enabled && (!!params.query || (!!params.latitude && !!params.longitude)),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useDataAvailability = (locationId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.dataAvailability(locationId),
    queryFn: () => locationApi.getDataAvailability(locationId),
    enabled: enabled && !!locationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Data fetching hooks
export const useMoonPhases = (params: DataFetchParams, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.moonPhases(params),
    queryFn: () => dataApi.getMoonPhases(params),
    enabled: enabled && !!params.location && !!params.startDate && !!params.endDate,
    staleTime: 60 * 60 * 1000, // 1 hour (moon phases don't change frequently)
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
  });
};

export const useCrimeData = (params: DataFetchParams, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.crimeData(params),
    queryFn: () => dataApi.getCrimeData(params),
    enabled: enabled && !!params.location && !!params.startDate && !!params.endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
  });
};

// Analysis hooks
export const useCorrelationAnalysis = (params: CorrelationAnalysisParams, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.correlationAnalysis(params),
    queryFn: () => analysisApi.getCorrelationAnalysis(params),
    enabled: enabled && !!params.location && !!params.startDate && !!params.endDate,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useStatistics = (params: DataFetchParams, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.statistics(params),
    queryFn: () => analysisApi.getStatistics(params),
    enabled: enabled && !!params.location && !!params.startDate && !!params.endDate,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Export and sharing hooks
export const useExportAnalysis = () => {
  return useMutation({
    mutationFn: (config: ExportConfiguration) => exportApi.exportAnalysis(config),
    onSuccess: (blob, config) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Determine filename based on format
      const timestamp = new Date().toISOString().split('T')[0];
      const extension = config.format === 'csv' ? 'csv' : 
                      config.format === 'pdf' ? 'pdf' : 'png';
      link.download = `lunar-crime-analysis-${timestamp}.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
};

export const useShareAnalysis = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (config: ExportConfiguration) => exportApi.shareAnalysis(config),
    onSuccess: (result) => {
      // Cache the shared analysis for future retrieval
      queryClient.setQueryData(queryKeys.sharedAnalysis(result.id), result);
    },
  });
};

export const useSharedAnalysis = (shareId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.sharedAnalysis(shareId),
    queryFn: () => exportApi.getSharedAnalysis(shareId),
    enabled: enabled && !!shareId,
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
  });
};

// Utility hook for invalidating related queries
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateLocationData: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['dataAvailability'] });
    },
    invalidateAnalysisData: () => {
      queryClient.invalidateQueries({ queryKey: ['correlationAnalysis'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    },
    invalidateAllData: () => {
      queryClient.invalidateQueries();
    },
  };
};

// Hook for prefetching related data
export const usePrefetchData = () => {
  const queryClient = useQueryClient();
  
  return {
    prefetchMoonPhases: (params: DataFetchParams) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.moonPhases(params),
        queryFn: () => dataApi.getMoonPhases(params),
        staleTime: 60 * 60 * 1000,
      });
    },
    prefetchCrimeData: (params: DataFetchParams) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.crimeData(params),
        queryFn: () => dataApi.getCrimeData(params),
        staleTime: 5 * 60 * 1000,
      });
    },
  };
};