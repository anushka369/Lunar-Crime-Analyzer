import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { MoonPhaseData, CrimeIncident } from '../types/data';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../hooks/useApi';

interface RealTimeDataContextType {
  isConnected: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'connecting';
  subscribeToLocation: (locationId: string) => void;
  unsubscribeFromLocation: (locationId: string) => void;
  requestDataRefresh: (params: { location: string; startDate: Date; endDate: Date }) => void;
  subscribedLocations: Set<string>;
  error: string | null;
  recentUpdates: Array<{
    id: string;
    type: 'moon-phase' | 'crime-incident';
    timestamp: Date;
    data: MoonPhaseData | CrimeIncident;
  }>;
}

const RealTimeDataContext = createContext<RealTimeDataContextType | null>(null);

interface RealTimeDataProviderProps {
  children: React.ReactNode;
  maxRecentUpdates?: number;
}

export const RealTimeDataProvider: React.FC<RealTimeDataProviderProps> = ({
  children,
  maxRecentUpdates = 50,
}) => {
  const queryClient = useQueryClient();
  const [recentUpdates, setRecentUpdates] = useState<Array<{
    id: string;
    type: 'moon-phase' | 'crime-incident';
    timestamp: Date;
    data: MoonPhaseData | CrimeIncident;
  }>>([]);

  const handleDataUpdate = useCallback((update: { 
    type: 'moon-phase' | 'crime-incident'; 
    payload: MoonPhaseData | CrimeIncident 
  }) => {
    console.log('Real-time data update received:', update);

    // Add to recent updates
    const newUpdate = {
      id: `${update.type}-${Date.now()}-${Math.random()}`,
      type: update.type,
      timestamp: new Date(),
      data: update.payload,
    };

    setRecentUpdates(prev => {
      const updated = [newUpdate, ...prev];
      return updated.slice(0, maxRecentUpdates);
    });

    // Update React Query cache with new data
    if (update.type === 'moon-phase') {
      // Invalidate moon phase queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['moonPhases'] });
    } else if (update.type === 'crime-incident') {
      // Invalidate crime data queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['crimeData'] });
      queryClient.invalidateQueries({ queryKey: ['correlationAnalysis'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    }
  }, [queryClient, maxRecentUpdates]);

  const handleBulkDataUpdate = useCallback((data: { 
    moonPhases: MoonPhaseData[]; 
    crimeIncidents: CrimeIncident[] 
  }) => {
    console.log('Bulk data update received:', data);

    // Process bulk updates
    data.moonPhases?.forEach(moonPhase => {
      const update = {
        id: `moon-phase-${moonPhase.timestamp.getTime()}-${Math.random()}`,
        type: 'moon-phase' as const,
        timestamp: new Date(),
        data: moonPhase,
      };
      
      setRecentUpdates(prev => {
        const updated = [update, ...prev];
        return updated.slice(0, maxRecentUpdates);
      });
    });

    data.crimeIncidents?.forEach(crimeIncident => {
      const update = {
        id: `crime-incident-${crimeIncident.id}-${Math.random()}`,
        type: 'crime-incident' as const,
        timestamp: new Date(),
        data: crimeIncident,
      };
      
      setRecentUpdates(prev => {
        const updated = [update, ...prev];
        return updated.slice(0, maxRecentUpdates);
      });
    });

    // Invalidate all relevant queries
    queryClient.invalidateQueries({ queryKey: ['moonPhases'] });
    queryClient.invalidateQueries({ queryKey: ['crimeData'] });
    queryClient.invalidateQueries({ queryKey: ['correlationAnalysis'] });
    queryClient.invalidateQueries({ queryKey: ['statistics'] });
  }, [queryClient, maxRecentUpdates]);

  const handleError = useCallback((error: { message: string; code?: string }) => {
    console.error('WebSocket error:', error);
    // Could show a toast notification or update UI state
  }, []);

  const {
    isConnected,
    connectionStatus,
    subscribeToLocation,
    unsubscribeFromLocation,
    requestDataRefresh,
    subscribedLocations,
    error,
  } = useWebSocket({
    autoConnect: true,
    onDataUpdate: handleDataUpdate,
    onBulkDataUpdate: handleBulkDataUpdate,
    onError: handleError,
  });

  const contextValue: RealTimeDataContextType = {
    isConnected,
    connectionStatus,
    subscribeToLocation,
    unsubscribeFromLocation,
    requestDataRefresh,
    subscribedLocations,
    error,
    recentUpdates,
  };

  return (
    <RealTimeDataContext.Provider value={contextValue}>
      {children}
    </RealTimeDataContext.Provider>
  );
};

export const useRealTimeData = (): RealTimeDataContextType => {
  const context = useContext(RealTimeDataContext);
  if (!context) {
    throw new Error('useRealTimeData must be used within a RealTimeDataProvider');
  }
  return context;
};

export default RealTimeDataProvider;