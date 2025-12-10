-- Migration: 001_initial_schema
-- Description: Create initial database schema with TimescaleDB hypertables
-- Created: 2024-12-10

-- Initialize TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create tables for moon phases and crime incidents
CREATE TABLE IF NOT EXISTS moon_phases (
  timestamp TIMESTAMPTZ NOT NULL,
  phase_name VARCHAR(20) NOT NULL CHECK (phase_name IN ('new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 'full', 'waning_gibbous', 'last_quarter', 'waning_crescent')),
  illumination_percent DECIMAL(5,2) NOT NULL CHECK (illumination_percent >= 0 AND illumination_percent <= 100),
  phase_angle DECIMAL(6,2) NOT NULL CHECK (phase_angle >= 0 AND phase_angle <= 360),
  distance_km INTEGER NOT NULL CHECK (distance_km > 0),
  latitude DECIMAL(10,8) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude DECIMAL(11,8) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  address TEXT,
  jurisdiction VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS crime_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL,
  latitude DECIMAL(10,8) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude DECIMAL(11,8) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  crime_category VARCHAR(50) NOT NULL CHECK (crime_category IN ('violent', 'property', 'drug', 'public_order', 'white_collar')),
  crime_subcategory VARCHAR(100) NOT NULL,
  ucr_code VARCHAR(20),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('misdemeanor', 'felony', 'violation')),
  description TEXT NOT NULL,
  case_number VARCHAR(50),
  jurisdiction VARCHAR(100) NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  address TEXT
);

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT
);

-- Record this migration
INSERT INTO schema_migrations (version, description) 
VALUES ('001_initial_schema', 'Create initial database schema with TimescaleDB hypertables')
ON CONFLICT (version) DO NOTHING;