import { useEffect, useRef, useState, useCallback } from 'react';
import { getWebSocketClient, WebSocketCallbacks } from '../services/websocket';
import { MoonPhaseData, CrimeIncident } from '../types/data';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  onDataUpdate?: (data: { type: 'moon-phase' | 'crime-incident'; payload: MoonPhaseData | CrimeIncident }) => void;
  onBulkDataUpdate?: (data: { moonPhases: MoonPhaseData[]; crimeIncidents: CrimeIncident[] }) => void;
  onError?: (error: { message: string; code?: string }) => void;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'connecting';
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribeToLocation: (locationId: string) => void;
  unsubscribeFromLocation: (locationId: string) => void;
  requestDataRefresh: (params: { location: string; startDate: Date; endDate: Date }) => void;
  subscribedLocations: Set<string>;
  error: string | null;
}

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const {
    autoConnect = true,
    onDataUpdate,
    onBulkDataUpdate,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error' | 'connecting'>('disconnected');
  const [subscribedLocations, setSubscribedLocations] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  
  const wsClient = useRef(getWebSocketClient());
  const isConnecting = useRef(false);

  const handleConnectionStatusChange = useCallback((status: 'connected' | 'disconnected' | 'error') => {
    setConnectionStatus(status);
    setIsConnected(status === 'connected');
    
    if (status === 'connected') {
      setError(null);
      isConnecting.current = false;
    } else if (status === 'error') {
      isConnecting.current = false;
    }
  }, []);

  const handleError = useCallback((errorData: { message: string; code?: string }) => {
    setError(errorData.message);
    onError?.(errorData);
  }, [onError]);

  const handleDataRefreshComplete = useCallback(() => {
    // Data refresh completed, could trigger UI updates or notifications
    console.log('Data refresh completed');
  }, []);

  const connect = useCallback(async () => {
    if (isConnected || isConnecting.current) {
      return;
    }

    isConnecting.current = true;
    setConnectionStatus('connecting');
    setError(null);

    try {
      const callbacks: WebSocketCallbacks = {
        onConnectionStatusChange: handleConnectionStatusChange,
        onDataUpdate,
        onBulkDataUpdate,
        onError: handleError,
        onDataRefreshComplete: handleDataRefreshComplete,
      };

      await wsClient.current.connect(callbacks);
    } catch (err) {
      isConnecting.current = false;
      setConnectionStatus('error');
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to WebSocket';
      setError(errorMessage);
      handleError({ message: errorMessage, code: 'CONNECTION_FAILED' });
    }
  }, [isConnected, handleConnectionStatusChange, onDataUpdate, onBulkDataUpdate, handleError, handleDataRefreshComplete]);

  const disconnect = useCallback(() => {
    wsClient.current.disconnect();
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setSubscribedLocations(new Set());
    setError(null);
    isConnecting.current = false;
  }, []);

  const subscribeToLocation = useCallback((locationId: string) => {
    if (!isConnected) {
      console.warn('Cannot subscribe to location: WebSocket not connected');
      return;
    }

    wsClient.current.subscribeToLocation(locationId);
    setSubscribedLocations(prev => new Set([...prev, locationId]));
  }, [isConnected]);

  const unsubscribeFromLocation = useCallback((locationId: string) => {
    if (!isConnected) {
      console.warn('Cannot unsubscribe from location: WebSocket not connected');
      return;
    }

    wsClient.current.unsubscribeFromLocation(locationId);
    setSubscribedLocations(prev => {
      const newSet = new Set(prev);
      newSet.delete(locationId);
      return newSet;
    });
  }, [isConnected]);

  const requestDataRefresh = useCallback((params: { location: string; startDate: Date; endDate: Date }) => {
    if (!isConnected) {
      console.warn('Cannot request data refresh: WebSocket not connected');
      return;
    }

    wsClient.current.requestDataRefresh(params);
  }, [isConnected]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && !isConnected && !isConnecting.current) {
      connect();
    }
  }, [autoConnect, isConnected, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, []);

  // Update callbacks when they change
  useEffect(() => {
    if (isConnected) {
      wsClient.current.updateCallbacks({
        onConnectionStatusChange: handleConnectionStatusChange,
        onDataUpdate,
        onBulkDataUpdate,
        onError: handleError,
        onDataRefreshComplete: handleDataRefreshComplete,
      });
    }
  }, [isConnected, handleConnectionStatusChange, onDataUpdate, onBulkDataUpdate, handleError, handleDataRefreshComplete]);

  return {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    subscribeToLocation,
    unsubscribeFromLocation,
    requestDataRefresh,
    subscribedLocations,
    error,
  };
};

export default useWebSocket;