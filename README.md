# Lunar Crime Analyzer

A web application that correlates moon phase data with crime statistics to explore potential relationships between lunar cycles and criminal activity patterns.

## Project Structure

```
lunar-crime-analyzer/
├── frontend/          # React TypeScript frontend with Vite
├── backend/           # Node.js Express backend with TypeScript
├── database/          # PostgreSQL with TimescaleDB initialization
├── docker-compose.yml # Docker configuration for development
└── package.json       # Root package.json with workspace configuration
```

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- npm or yarn

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   npm run setup
   ```

2. **Start the development environment:**
   ```bash
   npm run docker:up
   npm run dev
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

## Development Commands

### Root Level
- `npm run setup` - Install all dependencies
- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both frontend and backend
- `npm run test` - Run all tests
- `npm run docker:up` - Start Docker services (PostgreSQL, Redis)
- `npm run docker:down` - Stop Docker services

### Frontend (React + TypeScript + Vite)
- `cd frontend && npm run dev` - Start development server
- `cd frontend && npm run build` - Build for production
- `cd frontend && npm run test` - Run Jest tests
- `cd frontend && npm run lint` - Run ESLint

### Backend (Node.js + Express + TypeScript)
- `cd backend && npm run dev` - Start development server with nodemon
- `cd backend && npm run build` - Compile TypeScript
- `cd backend && npm run start` - Start production server
- `cd backend && npm run test` - Run Jest tests
- `cd backend && npm run lint` - Run ESLint

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Material-UI** for component library
- **D3.js** for custom visualizations
- **React Query** for data fetching and caching
- **Jest** and **fast-check** for testing

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **PostgreSQL** with TimescaleDB for time-series data
- **Redis** for caching
- **Jest** and **fast-check** for testing

### Database
- **PostgreSQL 15** with TimescaleDB extension
- Optimized for time-series data with hypertables
- Indexes for efficient geographic and temporal queries

## Environment Configuration

Copy the example environment file and configure:

```bash
cp backend/.env.example backend/.env
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NASA_API_KEY` - NASA API key for astronomical data
- `CRIME_API_KEY` - Crime statistics API key

## Testing

The project uses both unit tests and property-based tests:

- **Unit tests** verify specific examples and edge cases
- **Property-based tests** verify universal properties across all inputs using fast-check
- Both approaches provide comprehensive coverage

Run tests:
```bash
npm run test                    # All tests
cd frontend && npm run test     # Frontend tests only
cd backend && npm run test      # Backend tests only
```

## Docker Development

The project includes Docker configuration for easy development setup:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services:
- **postgres**: TimescaleDB database on port 5432
- **redis**: Redis cache on port 6379
- **backend**: API server on port 3001
- **frontend**: React app on port 3000

## API Endpoints

The backend provides RESTful API endpoints:

- `GET /health` - Health check
- `GET /api` - API information
- `GET /api/locations` - Available locations
- `GET /api/moon-phases` - Moon phase data
- `GET /api/crime-data` - Crime statistics
- `POST /api/correlations` - Statistical analysis

## Contributing

1. Follow TypeScript best practices
2. Write tests for new functionality
3. Use ESLint for code formatting
4. Follow the existing project structure
5. Update documentation as needed

## License

MIT License