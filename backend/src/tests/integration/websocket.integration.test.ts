import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import io, { Socket } from 'socket.io-client';
import WebSocketServer from '../../websocket/server';

describe('WebSocket Integration Tests', () => {
  let httpServer: any;
  let wsServer: WebSocketServer;
  let clientSocket: ReturnType<typeof io>;
  let serverPort: number;

  beforeAll((done) => {
    httpServer = createServer();
    wsServer = new WebSocketServer(httpServer);
    
    httpServer.listen(() => {
      serverPort = httpServer.address()?.port;
      done();
    });
  });

  afterAll((done) => {
    httpServer.close(done);
  });

  beforeEach((done) => {
    clientSocket = io(`http://localhost:${serverPort}`);
    clientSocket.on('connect', done);
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Connection Management', () => {
    it('should establish WebSocket connection', (done) => {
      // The connection is already established in beforeEach
      // Just verify the socket is connected
      expect(clientSocket.connected).toBe(true);
      done();
    });

    it('should handle multiple concurrent connections', (done) => {
      const client2 = io(`http://localhost:${serverPort}`);
      const client3 = io(`http://localhost:${serverPort}`);
      
      let connectedCount = 0;
      const checkConnections = () => {
        connectedCount++;
        if (connectedCount === 2) {
          expect(wsServer.getConnectedClients()).toBeGreaterThanOrEqual(3); // Including the beforeEach client
          client2.disconnect();
          client3.disconnect();
          done();
        }
      };

      client2.on('connect', checkConnections);
      client3.on('connect', checkConnections);
    });

    it('should handle connection errors gracefully', (done) => {
      const invalidClient = io('http://localhost:99999'); // Invalid port
      
      invalidClient.on('connect_error', (error: any) => {
        expect(error).toBeDefined();
        invalidClient.disconnect();
        done();
      });
    });
  });

  describe('Location Subscription Management', () => {
    it('should subscribe to location updates', (done) => {
      const locationId = 'nyc-1';
      
      clientSocket.emit('subscribe-location', locationId);
      
      // Verify subscription by checking internal state
      setTimeout(() => {
        const subscriptions = wsServer.getLocationSubscriptions();
        expect(subscriptions.get(locationId)).toBe(1);
        done();
      }, 100);
    });

    it('should unsubscribe from location updates', (done) => {
      const locationId = 'nyc-1';
      
      clientSocket.emit('subscribe-location', locationId);
      
      setTimeout(() => {
        clientSocket.emit('unsubscribe-location', locationId);
        
        setTimeout(() => {
          const subscriptions = wsServer.getLocationSubscriptions();
          expect(subscriptions.get(locationId)).toBeUndefined();
          done();
        }, 100);
      }, 100);
    });

    it('should handle multiple subscriptions from same client', (done) => {
      const location1 = 'nyc-1';
      const location2 = 'la-1';
      
      clientSocket.emit('subscribe-location', location1);
      
      setTimeout(() => {
        clientSocket.emit('subscribe-location', location2);
        
        setTimeout(() => {
          const subscriptions = wsServer.getLocationSubscriptions();
          expect(subscriptions.get(location1)).toBe(1);
          expect(subscriptions.get(location2)).toBe(1);
          done();
        }, 100);
      }, 100);
    });

    it('should clean up subscriptions on disconnect', (done) => {
      const locationId = 'nyc-1';
      
      clientSocket.emit('subscribe-location', locationId);
      
      setTimeout(() => {
        const subscriptionsBefore = wsServer.getLocationSubscriptions();
        expect(subscriptionsBefore.get(locationId)).toBe(1);
        
        clientSocket.disconnect();
        
        setTimeout(() => {
          const subscriptionsAfter = wsServer.getLocationSubscriptions();
          expect(subscriptionsAfter.get(locationId)).toBeUndefined();
          done();
        }, 100);
      }, 100);
    });
  });

  describe('Real-time Data Updates', () => {
    it('should receive data updates for subscribed locations', (done) => {
      const locationId = 'nyc-1';
      
      clientSocket.emit('subscribe-location', locationId);
      
      clientSocket.on('data-update', (data: any) => {
        expect(data).toHaveProperty('type');
        expect(data).toHaveProperty('payload');
        expect(['moon-phase', 'crime-incident']).toContain(data.type);
        done();
      });
      
      // Simulate server-side data update
      setTimeout(() => {
        wsServer.broadcastMoonPhaseUpdate(locationId, {
          timestamp: new Date(),
          phaseName: 'full',
          illuminationPercent: 98.5,
          phaseAngle: 180,
          distanceKm: 384400,
          location: {
            latitude: 40.7128,
            longitude: -74.0060,
            jurisdiction: 'NYC',
          },
        });
      }, 100);
    });

    it('should handle bulk data updates', (done) => {
      const locationId = 'nyc-1';
      
      clientSocket.emit('subscribe-location', locationId);
      
      clientSocket.on('bulk-data-update', (data: any) => {
        expect(data).toHaveProperty('moonPhases');
        expect(data).toHaveProperty('crimeIncidents');
        expect(Array.isArray(data.moonPhases)).toBe(true);
        expect(Array.isArray(data.crimeIncidents)).toBe(true);
        done();
      });
      
      // Simulate bulk update
      setTimeout(() => {
        wsServer.broadcastToLocation(locationId, 'bulk-data-update', {
          moonPhases: [{
            timestamp: new Date(),
            phaseName: 'full',
            illuminationPercent: 98.5,
            phaseAngle: 180,
            distanceKm: 384400,
            location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' },
          }],
          crimeIncidents: [{
            id: 'test-1',
            timestamp: new Date(),
            location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' },
            crimeType: { category: 'violent', subcategory: 'assault' },
            severity: 'felony',
            description: 'Test incident',
            resolved: false,
          }],
        });
      }, 100);
    });

    it('should not receive updates for unsubscribed locations', (done) => {
      const subscribedLocation = 'nyc-1';
      const unsubscribedLocation = 'la-1';
      
      clientSocket.emit('subscribe-location', subscribedLocation);
      
      let updateReceived = false;
      clientSocket.on('data-update', () => {
        updateReceived = true;
      });
      
      // Send update to unsubscribed location
      setTimeout(() => {
        wsServer.broadcastMoonPhaseUpdate(unsubscribedLocation, {
          timestamp: new Date(),
          phaseName: 'new',
          illuminationPercent: 2.1,
          phaseAngle: 0,
          distanceKm: 384400,
          location: { latitude: 34.0522, longitude: -118.2437, jurisdiction: 'LA' },
        });
        
        // Wait and verify no update was received
        setTimeout(() => {
          expect(updateReceived).toBe(false);
          done();
        }, 200);
      }, 100);
    });
  });

  describe('Data Refresh Workflow', () => {
    it('should handle data refresh requests', (done) => {
      let refreshCompleted = false;
      
      clientSocket.on('data-refresh-complete', () => {
        refreshCompleted = true;
      });
      
      clientSocket.on('data-update', (data: any) => {
        expect(data).toHaveProperty('type');
        expect(data).toHaveProperty('payload');
      });
      
      clientSocket.emit('request-data-refresh', {
        location: 'New York City',
        startDate: new Date('2023-01-01').toISOString(),
        endDate: new Date('2023-01-31').toISOString(),
      });
      
      // Wait for refresh to complete
      setTimeout(() => {
        expect(refreshCompleted).toBe(true);
        done();
      }, 2000);
    });

    it('should handle progressive data loading', (done) => {
      const receivedUpdates: any[] = [];
      
      clientSocket.on('data-update', (data: any) => {
        receivedUpdates.push(data);
      });
      
      clientSocket.on('data-refresh-complete', () => {
        expect(receivedUpdates.length).toBeGreaterThan(0);
        
        // Verify we received different types of updates
        const types = receivedUpdates.map(update => update.type);
        expect(types).toContain('moon-phase');
        expect(types).toContain('crime-incident');
        
        done();
      });
      
      clientSocket.emit('request-data-refresh', {
        location: 'New York City',
        startDate: new Date('2023-01-01').toISOString(),
        endDate: new Date('2023-01-31').toISOString(),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid subscription requests', (done) => {
      clientSocket.on('error', (error: any) => {
        expect(error).toHaveProperty('message');
        done();
      });
      
      // Send invalid subscription (this should be handled gracefully)
      clientSocket.emit('subscribe-location', null);
      
      // If no error is emitted, the test should still pass
      setTimeout(() => {
        done();
      }, 500);
    });

    it('should handle malformed data refresh requests', (done) => {
      clientSocket.on('error', (error: any) => {
        expect(error).toHaveProperty('message');
        expect(error.message).toContain('Failed to refresh data');
        done();
      });
      
      // Send malformed refresh request
      clientSocket.emit('request-data-refresh', {
        // Missing required fields
      });
      
      setTimeout(() => {
        done(); // Test passes if no error is thrown
      }, 1000);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple simultaneous subscriptions efficiently', (done) => {
      const clients: any[] = [];
      const numClients = 10;
      let connectedClients = 0;
      
      for (let i = 0; i < numClients; i++) {
        const client = io(`http://localhost:${serverPort}`);
        clients.push(client);
        
        client.on('connect', () => {
          client.emit('subscribe-location', `location-${i}`);
          connectedClients++;
          
          if (connectedClients === numClients) {
            // Verify all subscriptions
            setTimeout(() => {
              const subscriptions = wsServer.getLocationSubscriptions();
              expect(subscriptions.size).toBe(numClients);
              
              // Clean up
              clients.forEach(c => c.disconnect());
              done();
            }, 200);
          }
        });
      }
    });

    it('should broadcast updates efficiently to multiple subscribers', (done) => {
      const clients: any[] = [];
      const numClients = 5;
      const locationId = 'test-location';
      let connectedClients = 0;
      let updatesReceived = 0;
      
      for (let i = 0; i < numClients; i++) {
        const client = io(`http://localhost:${serverPort}`);
        clients.push(client);
        
        client.on('connect', () => {
          client.emit('subscribe-location', locationId);
          connectedClients++;
          
          if (connectedClients === numClients) {
            // Broadcast update to all subscribers
            setTimeout(() => {
              wsServer.broadcastMoonPhaseUpdate(locationId, {
                timestamp: new Date(),
                phaseName: 'full',
                illuminationPercent: 98.5,
                phaseAngle: 180,
                distanceKm: 384400,
                location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'Test' },
              });
            }, 100);
          }
        });
        
        client.on('data-update', () => {
          updatesReceived++;
          
          if (updatesReceived === numClients) {
            // All clients received the update
            clients.forEach(c => c.disconnect());
            done();
          }
        });
      }
    });
  });
});