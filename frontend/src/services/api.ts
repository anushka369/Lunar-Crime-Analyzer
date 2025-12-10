import axios from 'axios';
import { 
  MoonPhaseData, 
  CrimeIncident, 
  CorrelationDataPoint, 
  StatisticalSummary,
  ExportConfiguration,
  ShareableAnalysis,
  LocationInfo,
  DataAvailability
} from '../types/data';
import { FilterState } from '../types/filters';

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    
    // Handle specific error cases
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please check your connection.');
    }
    
    throw error;
  }
);

export interface LocationSearchParams {
  query?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export interface DataFetchParams {
  location: string;
  startDate: Date;
  endDate: Date;
  filters?: FilterState;
}

export interface CorrelationAnalysisParams extends DataFetchParams {
  crimeTypes?: string[];
  moonPhases?: string[];
}

// Location and data availability endpoints
export const locationApi = {
  searchLocations: async (params: LocationSearchParams): Promise<LocationInfo[]> => {
    const response = await apiClient.get('/api/locations', { params });
    return response.data;
  },

  getDataAvailability: async (locationId: string): Promise<DataAvailability> => {
    const response = await apiClient.get(`/api/locations/${locationId}/availability`);
    return response.data;
  },
};

// Data fetching endpoints
export const dataApi = {
  getMoonPhases: async (params: DataFetchParams): Promise<MoonPhaseData[]> => {
    const response = await apiClient.get('/api/moon-phases', {
      params: {
        location: params.location,
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
      },
    });
    return response.data.map((phase: any) => ({
      ...phase,
      timestamp: new Date(phase.timestamp),
    }));
  },

  getCrimeData: async (params: DataFetchParams): Promise<CrimeIncident[]> => {
    const response = await apiClient.get('/api/crime-data', {
      params: {
        location: params.location,
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
        ...params.filters,
      },
    });
    return response.data.map((incident: any) => ({
      ...incident,
      timestamp: new Date(incident.timestamp),
    }));
  },
};

// Analysis endpoints
export const analysisApi = {
  getCorrelationAnalysis: async (params: CorrelationAnalysisParams): Promise<CorrelationDataPoint[]> => {
    const response = await apiClient.post('/api/correlations', {
      location: params.location,
      startDate: params.startDate.toISOString(),
      endDate: params.endDate.toISOString(),
      filters: params.filters,
      crimeTypes: params.crimeTypes,
      moonPhases: params.moonPhases,
    });
    return response.data.map((point: any) => ({
      ...point,
      crimeIncident: {
        ...point.crimeIncident,
        timestamp: new Date(point.crimeIncident.timestamp),
      },
      moonPhase: {
        ...point.moonPhase,
        timestamp: new Date(point.moonPhase.timestamp),
      },
    }));
  },

  getStatistics: async (params: DataFetchParams): Promise<StatisticalSummary> => {
    const response = await apiClient.get('/api/statistics', {
      params: {
        location: params.location,
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
        ...params.filters,
      },
    });
    return {
      ...response.data,
      analysisDateRange: {
        start: new Date(response.data.analysisDateRange.start),
        end: new Date(response.data.analysisDateRange.end),
      },
    };
  },
};

// Export and sharing endpoints
export const exportApi = {
  exportAnalysis: async (config: ExportConfiguration): Promise<Blob> => {
    const response = await apiClient.post('/api/export', config, {
      responseType: 'blob',
    });
    return response.data;
  },

  shareAnalysis: async (config: ExportConfiguration): Promise<ShareableAnalysis> => {
    const response = await apiClient.post('/api/shared', config);
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      expiresAt: new Date(response.data.expiresAt),
      dateRange: {
        start: new Date(response.data.dateRange.start),
        end: new Date(response.data.dateRange.end),
      },
    };
  },

  getSharedAnalysis: async (shareId: string): Promise<ShareableAnalysis> => {
    const response = await apiClient.get(`/api/shared/${shareId}`);
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      expiresAt: new Date(response.data.expiresAt),
      dateRange: {
        start: new Date(response.data.dateRange.start),
        end: new Date(response.data.dateRange.end),
      },
    };
  },
};

export default apiClient;