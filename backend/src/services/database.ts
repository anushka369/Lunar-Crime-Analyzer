import pool from '../config/database';
import { 
  MoonPhaseData, 
  CrimeIncident, 
  GeographicCoordinate,
  CrimeType 
} from '../types';

export class DatabaseService {
  /**
   * Insert moon phase data
   */
  async insertMoonPhase(moonPhase: MoonPhaseData): Promise<void> {
    const query = `
      INSERT INTO moon_phases (
        timestamp, phase_name, illumination_percent, phase_angle, 
        distance_km, latitude, longitude, address, jurisdiction
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    
    const values = [
      moonPhase.timestamp,
      moonPhase.phaseName,
      moonPhase.illuminationPercent,
      moonPhase.phaseAngle,
      moonPhase.distanceKm,
      moonPhase.location.latitude,
      moonPhase.location.longitude,
      moonPhase.location.address,
      moonPhase.location.jurisdiction
    ];
    
    await pool.query(query, values);
  }

  /**
   * Insert crime incident
   */
  async insertCrimeIncident(incident: CrimeIncident): Promise<void> {
    const query = `
      INSERT INTO crime_incidents (
        id, timestamp, latitude, longitude, crime_category, 
        crime_subcategory, ucr_code, severity, description, 
        case_number, jurisdiction, resolved, address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `;
    
    const values = [
      incident.id,
      incident.timestamp,
      incident.location.latitude,
      incident.location.longitude,
      incident.crimeType.category,
      incident.crimeType.subcategory,
      incident.crimeType.ucr_code,
      incident.severity,
      incident.description,
      incident.caseNumber,
      incident.location.jurisdiction,
      incident.resolved,
      incident.location.address
    ];
    
    await pool.query(query, values);
  }
}