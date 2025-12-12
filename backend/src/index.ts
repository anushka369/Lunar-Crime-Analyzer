import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Import route handlers
import locationsRouter from './routes/locations';
import dataRouter from './routes/data';
import analysisRouter from './routes/analysis';
import exportRouter from './routes/export';
import WebSocketServer from './websocket/server';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server
const httpServer = createServer(app);

// Initialize WebSocket server
const wsServer = new WebSocketServer(httpServer);

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make WebSocket server available to routes
app.locals.wsServer = wsServer;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    websocket: {
      connected: wsServer.getConnectedClients(),
      subscriptions: Object.fromEntries(wsServer.getLocationSubscriptions()),
    },
  });
});

// API routes
app.get('/api', (req, res) => {
  res.json({ message: 'Lunar Crime Analyzer API' });
});

// Mount route handlers
app.use('/api/locations', locationsRouter);
app.use('/api', dataRouter);
app.use('/api', analysisRouter);
app.use('/api', exportRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Only start server if this file is run directly (not imported for testing)
if (require.main === module) {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`WebSocket server initialized`);
  });
}

export default app;