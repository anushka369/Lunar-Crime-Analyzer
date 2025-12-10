import { io, Socket } from 'socket.io-client';
import { MoonPhaseData, CrimeIncident } from '../types/data';

export interface WebSocketEvents {
  // Server to client events
  'data-update': (data: { type: 'moon-phase' | 'crime-incident'; payload: MoonPhaseData | CrimeIncident }) => void;
  'bulk-data-update': (data: { moonPhases: MoonPhaseData[]; crimeIncidents: CrimeIncident[] }) => void;
  'connection-status': (status: 'connected' | 'disconnected' | 'error') => void;
  'data-refresh-complete': () => void;
  'error': (error: { message: string; code?: string }) => void;
}

export interface WebSocketCallbacks {
  onDataUpdate?: (data: { type: 'moon-phase' | 'crime-incident'; payload: MoonPhaseData | CrimeIncident }) => void;
  onBulkDataUpdate?: (data: { moonPhases: MoonPhaseData[]; crimeIncidents: CrimeIncident[] }) => void;
  onConnectionStatusChange?: (status: 'connected' | 'disconnected' | 'error') => void;
  onDataRefreshComplete?: () => void;
  onError?: (error: { message: string; code?: string }) => void;
}

export class WebSocketClient {
  private socket: Socket | null = null;
  private callbacks: WebSocketCallbacks = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscribedLocations = new Set<string>();

  constructor(private serverUrl: string = process.env.VITE_API_BASE_URL || 'http://localhost:3001') {}

  connect(callbacks: WebSocketCallbacks = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.callbacks = callbacks;

      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.callbacks.onConnectionStatusChange?.('connected');
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.callbacks.onConnectionStatusChange?.('disconnected');
        
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, don't reconnect automatically
          return;
        }
        
        this.handleReconnection();
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.callbacks.onConnectionStatusChange?.('error');
        this.callbacks.onError?.({ message: 'Connection failed', code: 'CONNECTION_ERROR' });
        
        if (this.reconnectAttempts === 0) {
          reject(error);
        }
        
        this.handleReconnection();
      });

      this.socket.on('connection-status', (status) => {
        this.callbacks.onConnectionStatusChange?.(status);
      });

      this.socket.on('data-update', (data) => {
        // Convert timestamp strings back to Date objects
        if (data.payload.timestamp) {
          data.payload.timestamp = new Date(data.payload.timestamp);
        }
        this.callbacks.onDataUpdate?.(data);
      });

      this.socket.on('bulk-data-update', (data) => {
        // Convert timestamp strings back to Date objects
        data.moonPhases?.forEach(phase => {
          if (phase.timestamp) phase.timestamp = new Date(phase.timestamp);
        });
        data.crimeIncidents?.forEach(incident => {
          if (incident.timestamp) incident.timestamp = new Date(incident.timestamp);
        });
        this.callbacks.onBulkDataUpdate?.(data);
      });

      this.socket.on('data-refresh-complete', () => {
        this.callbacks.onDataRefreshComplete?.();
      });

      this.socket.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.callbacks.onError?.(error);
      });
    });
  }

  private handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.callbacks.onError?.({ 
        message: 'Failed to reconnect after multiple attempts', 
        code: 'MAX_RECONNECT_ATTEMPTS' 
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.socket?.connected) {
        this.socket?.connect();
      }
    }, delay);
  }

  subscribeToLocation(locationId: string): void {
    if (!this.socket?.connected) {
      console.warn('Cannot subscribe to location: WebSocket not connected');
      return;
    }

    this.socket.emit('subscribe-location', locationId);
    this.subscribedLocations.add(locationId);
  }

  unsubscribeFromLocation(locationId: string): void {
    if (!this.socket?.connected) {
      console.warn('Cannot unsubscribe from location: WebSocket not connected');
      return;
    }

    this.socket.emit('unsubscribe-location', locationId);
    this.subscribedLocations.delete(locationId);
  }

  requestDataRefresh(params: { location: string; startDate: Date; endDate: Date }): void {
    if (!this.socket?.connected) {
      console.warn('Cannot request data refresh: WebSocket not connected');
      return;
    }

    this.socket.emit('request-data-refresh', {
      location: params.location,
      startDate: params.startDate.toISOString(),
      endDate: params.endDate.toISOString(),
    });
  }

  disconnect(): void {
    if (this.socket) {
      // Unsubscribe from all locations
      this.subscribedLocations.forEach(locationId => {
        this.socket?.emit('unsubscribe-location', locationId);
      });
      this.subscribedLocations.clear();

      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSubscribedLocations(): Set<string> {
    return new Set(this.subscribedLocations);
  }

  updateCallbacks(callbacks: WebSocketCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
}

// Singleton instance for global use
let wsClientInstance: WebSocketClient | null = null;

export const getWebSocketClient = (): WebSocketClient => {
  if (!wsClientInstance) {
    wsClientInstance = new WebSocketClient();
  }
  return wsClientInstance;
};

export default WebSocketClient;