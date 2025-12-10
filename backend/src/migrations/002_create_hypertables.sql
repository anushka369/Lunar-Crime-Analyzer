-- Migration: 002_create_hypertables
-- Description: Convert tables to TimescaleDB hypertables and create indexes
-- Created: 2024-12-10

-- Create hypertables for time-series optimization
-- Only create if not already a hypertable
DO $$
BEGIN
    -- Check if moon_phases is already a hypertable
    IF NOT EXISTS (
        SELECT 1 FROM timescaledb_information.hypertables 
        WHERE hypertable_name = 'moon_phases'
    ) THEN
        PERFORM create_hypertable('moon_phases', 'timestamp');
    END IF;
    
    -- Check if crime_incidents is already a hypertable
    IF NOT EXISTS (
        SELECT 1 FROM timescaledb_information.hypertables 
        WHERE hypertable_name = 'crime_incidents'
    ) THEN
        PERFORM create_hypertable('crime_incidents', 'timestamp');
    END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_moon_phases_location ON moon_phases (latitude, longitude, timestamp);
CREATE INDEX IF NOT EXISTS idx_moon_phases_phase ON moon_phases (phase_name, timestamp);
CREATE INDEX IF NOT EXISTS idx_moon_phases_jurisdiction ON moon_phases (jurisdiction, timestamp);

CREATE INDEX IF NOT EXISTS idx_crime_incidents_location ON crime_incidents (latitude, longitude, timestamp);
CREATE INDEX IF NOT EXISTS idx_crime_incidents_type ON crime_incidents (crime_category, timestamp);
CREATE INDEX IF NOT EXISTS idx_crime_incidents_severity ON crime_incidents (severity, timestamp);
CREATE INDEX IF NOT EXISTS idx_crime_incidents_jurisdiction ON crime_incidents (jurisdiction, timestamp);
CREATE INDEX IF NOT EXISTS idx_crime_incidents_resolved ON crime_incidents (resolved, timestamp);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_moon_phases_location_phase ON moon_phases (latitude, longitude, phase_name, timestamp);
CREATE INDEX IF NOT EXISTS idx_crime_incidents_location_type ON crime_incidents (latitude, longitude, crime_category, timestamp);

-- Record this migration
INSERT INTO schema_migrations (version, description) 
VALUES ('002_create_hypertables', 'Convert tables to TimescaleDB hypertables and create indexes')
ON CONFLICT (version) DO NOTHING;