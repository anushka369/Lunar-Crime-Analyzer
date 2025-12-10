-- Rollback Migration: 002_create_hypertables
-- Description: Drop indexes and convert hypertables back to regular tables

-- Drop indexes
DROP INDEX IF EXISTS idx_moon_phases_location_phase;
DROP INDEX IF EXISTS idx_crime_incidents_location_type;
DROP INDEX IF EXISTS idx_crime_incidents_resolved;
DROP INDEX IF EXISTS idx_crime_incidents_jurisdiction;
DROP INDEX IF EXISTS idx_crime_incidents_severity;
DROP INDEX IF EXISTS idx_crime_incidents_type;
DROP INDEX IF EXISTS idx_crime_incidents_location;
DROP INDEX IF EXISTS idx_moon_phases_jurisdiction;
DROP INDEX IF EXISTS idx_moon_phases_phase;
DROP INDEX IF EXISTS idx_moon_phases_location;

-- Note: Converting hypertables back to regular tables is complex and potentially destructive
-- This would require recreating tables and copying data, which is not recommended in production
-- For development purposes, you might want to drop and recreate the entire database