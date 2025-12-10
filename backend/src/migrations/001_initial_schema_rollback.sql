-- Rollback Migration: 001_initial_schema
-- Description: Drop initial database schema

-- Drop tables (this will also drop hypertables if they exist)
DROP TABLE IF EXISTS crime_incidents CASCADE;
DROP TABLE IF EXISTS moon_phases CASCADE;

-- Note: We don't drop the schema_migrations table as it's needed for migration tracking
-- Note: We don't drop the timescaledb extension as it might be used by other applications