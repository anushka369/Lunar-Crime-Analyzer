import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { MoonPhaseData, CrimeIncident } from '../types';

export interface WebSocketEvents {
  // Client to server events
  'subscribe-location': (locationId: string) => void;
  'unsubscribe-location': (locationId: string) => void;
  'request-data-refresh': (params: { location: string; startDate: string; endDate: string }) => void;
  
  // Server to client events
  'data-update': (data: { type: 'moon-phase' | 'crime-incident'; payload: MoonPhaseData | CrimeIncident }) => void;
  'bulk-data-update': (data: { moonPhases: MoonPhaseData[]; crimeIncidents: CrimeIncident[] }) => void;
  'connection-status': (status: 'connected' | 'disconnected' | 'error') => void;
  'data-refresh-complete': () => void;
  'error': (error: { message: string; code?: string }) => void;
}

export class WebSocketServer {
  private io: SocketIOServer;
  private locationSubscriptions: Map<string, Set<string>> = new Map(); // locationId -> Set of socketIds
  private socketLocations: Map<string, Set<string>> = new Map(); // socketId -> Set of locationIds

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`WebSocket client connected: ${socket.id}`);
      
      // Send connection confirmation
      socket.emit('connection-status', 'connected');

      // Handle location subscription
      socket.on('subscribe-location', (locationId: string) => {
        this.subscribeToLocation(socket.id, locationId);
        console.log(`Socket ${socket.id} subscribed to location ${locationId}`);
      });

      // Handle location unsubscription
      socket.on('unsubscribe-location', (locationId: string) => {
        this.unsubscribeFromLocation(socket.id, locationId);
        console.log(`Socket ${socket.id} unsubscribed from location ${locationId}`);
      });

      // Handle data refresh requests
      socket.on('request-data-refresh', async (params) => {
        try {
          await this.handleDataRefresh(socket.id, params);
        } catch (error) {
          socket.emit('error', { 
            message: 'Failed to refresh data', 
            code: 'DATA_REFRESH_ERROR' 
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket.id);
        console.log(`WebSocket client disconnected: ${socket.id}`);
      });

      // Handle connection errors
      socket.on('error', (error) => {
        console.error(`WebSocket error for client ${socket.id}:`, error);
        socket.emit('connection-status', 'error');
      });
    });
  }

  private subscribeToLocation(socketId: string, locationId: string) {
    // Add socket to location subscription
    if (!this.locationSubscriptions.has(locationId)) {
      this.locationSubscriptions.set(locationId, new Set());
    }
    this.locationSubscriptions.get(locationId)!.add(socketId);

    // Add location to socket subscriptions
    if (!this.socketLocations.has(socketId)) {
      this.socketLocations.set(socketId, new Set());
    }
    this.socketLocations.get(socketId)!.add(locationId);
  }

  private unsubscribeFromLocation(socketId: string, locationId: string) {
    // Remove socket from location subscription
    const locationSockets = this.locationSubscriptions.get(locationId);
    if (locationSockets) {
      locationSockets.delete(socketId);
      if (locationSockets.size === 0) {
        this.locationSubscriptions.delete(locationId);
      }
    }

    // Remove location from socket subscriptions
    const socketLocations = this.socketLocations.get(socketId);
    if (socketLocations) {
      socketLocations.delete(locationId);
      if (socketLocations.size === 0) {
        this.socketLocations.delete(socketId);
      }
    }
  }

  private handleDisconnection(socketId: string) {
    // Clean up all subscriptions for this socket
    const locations = this.socketLocations.get(socketId);
    if (locations) {
      locations.forEach(locationId => {
        this.unsubscribeFromLocation(socketId, locationId);
      });
    }
    this.socketLocations.delete(socketId);
  }

  private async handleDataRefresh(socketId: string, params: { location: string; startDate: string; endDate: string }) {
    // Simulate data refresh - in real implementation, this would trigger actual data fetching
    const socket = this.io.sockets.sockets.get(socketId);
    if (!socket) return;

    // Simulate progressive loading
    setTimeout(() => {
      // Mock moon phase update
      const mockMoonPhase: MoonPhaseData = {
        timestamp: new Date(),
        phaseName: 'full',
        illuminationPercent: 98.5,
        phaseAngle: 180,
        distanceKm: 384400,
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          jurisdiction: params.location,
        },
      };

      socket.emit('data-update', {
        type: 'moon-phase',
        payload: mockMoonPhase,
      });
    }, 500);

    setTimeout(() => {
      // Mock crime incident update
      const mockCrimeIncident: CrimeIncident = {
        id: `realtime-${Date.now()}`,
        timestamp: new Date(),
        location: {
          latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
          longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
          jurisdiction: params.location,
        },
        crimeType: {
          category: 'violent',
          subcategory: 'assault',
        },
        severity: 'felony',
        description: 'Real-time crime incident update',
        resolved: false,
      };

      socket.emit('data-update', {
        type: 'crime-incident',
        payload: mockCrimeIncident,
      });
    }, 1000);

    setTimeout(() => {
      socket.emit('data-refresh-complete');
    }, 1500);
  }

  // Public methods for broadcasting updates
  public broadcastToLocation(locationId: string, event: string, data: any) {
    const sockets = this.locationSubscriptions.get(locationId);
    if (sockets) {
      sockets.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit(event, data);
        }
      });
    }
  }

  public broadcastMoonPhaseUpdate(locationId: string, moonPhase: MoonPhaseData) {
    this.broadcastToLocation(locationId, 'data-update', {
      type: 'moon-phase',
      payload: moonPhase,
    });
  }

  public broadcastCrimeIncidentUpdate(locationId: string, crimeIncident: CrimeIncident) {
    this.broadcastToLocation(locationId, 'data-update', {
      type: 'crime-incident',
      payload: crimeIncident,
    });
  }

  public getConnectedClients(): number {
    return this.io.sockets.sockets.size;
  }

  public getLocationSubscriptions(): Map<string, number> {
    const subscriptionCounts = new Map<string, number>();
    this.locationSubscriptions.forEach((sockets, locationId) => {
      subscriptionCounts.set(locationId, sockets.size);
    });
    return subscriptionCounts;
  }
}

export default WebSocketServer;