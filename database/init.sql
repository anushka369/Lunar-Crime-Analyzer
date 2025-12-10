-- Initialize TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create tables for moon phases and crime incidents
CREATE TABLE moon_phases (
  timestamp TIMESTAMPTZ NOT NULL,
  phase_name VARCHAR(20) NOT NULL,
  illumination_percent DECIMAL(5,2) NOT NULL,
  phase_angle DECIMAL(6,2) NOT NULL,
  distance_km INTEGER NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL
);

CREATE TABLE crime_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  crime_category VARCHAR(50) NOT NULL,
  crime_subcategory VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  description TEXT,
  case_number VARCHAR(50),
  jurisdiction VARCHAR(100) NOT NULL,
  resolved BOOLEAN DEFAULT FALSE
);

-- Create hypertables for time-series optimization
SELECT create_hypertable('moon_phases', 'timestamp');
SELECT create_hypertable('crime_incidents', 'timestamp');

-- Create indexes for efficient querying
CREATE INDEX idx_moon_phases_location ON moon_phases (latitude, longitude, timestamp);
CREATE INDEX idx_crime_incidents_location ON crime_incidents (latitude, longitude, timestamp);
CREATE INDEX idx_crime_incidents_type ON crime_incidents (crime_category, timestamp);
CREATE INDEX idx_crime_incidents_severity ON crime_incidents (severity, timestamp);
CREATE INDEX idx_moon_phases_phase ON moon_phases (phase_name, timestamp);