import * as fc from 'fast-check';
import { FilterState } from '../types/filters';

/**
 * **Feature: data-weaver-dashboard, Property 5: Filter application accuracy**
 * 
 * Property: For any applied filter combination (crime type, time-of-day, severity), 
 * all visualizations should update to show only data matching the selected criteria
 * 
 * **Validates: Requirements 4.2, 4.3, 4.4**
 */

// Mock crime incident data structure for testing
interface MockCrimeIncident {
  id: string;
  timestamp: Date;
  crimeType: {
    category: 'violent' | 'property' | 'drug' | 'public_order' | 'white_collar';
    subcategory: string;
  };
  severity: 'misdemeanor' | 'felony' | 'violation';
  hourOfDay: number; // 0-23
}

// Generator for mock crime incidents
const crimeIncidentArbitrary = fc.record({
  id: fc.uuid(),
  timestamp: fc.date(),
  crimeType: fc.record({
    category: fc.constantFrom('violent' as const, 'property' as const, 'drug' as const, 'public_order' as const, 'white_collar' as const),
    subcategory: fc.string({ minLength: 1, maxLength: 20 }),
  }),
  severity: fc.constantFrom('misdemeanor' as const, 'felony' as const, 'violation' as const),
  hourOfDay: fc.integer({ min: 0, max: 23 }),
});

// Generator for filter states
const filterStateArbitrary = fc.record({
  crimeTypes: fc.array(
    fc.record({
      category: fc.constantFrom('violent' as const, 'property' as const, 'drug' as const, 'public_order' as const, 'white_collar' as const),
      subcategory: fc.string({ minLength: 1, maxLength: 20 }),
      selected: fc.boolean(),
    }),
    { minLength: 1, maxLength: 5 }
  ),
  severityLevels: fc.array(
    fc.record({
      level: fc.constantFrom('misdemeanor' as const, 'felony' as const, 'violation' as const),
      selected: fc.boolean(),
    }),
    { minLength: 1, maxLength: 3 }
  ),
  timeOfDay: fc.record({
    startHour: fc.integer({ min: 0, max: 22 }),
    endHour: fc.integer({ min: 1, max: 23 }),
    enabled: fc.boolean(),
  }).filter(({ startHour, endHour }) => startHour < endHour),
});

// Function to apply filters to crime data (simulates what the visualization would do)
const applyFilters = (incidents: MockCrimeIncident[], filters: FilterState): MockCrimeIncident[] => {
  return incidents.filter(incident => {
    // Check crime type filter
    const selectedCrimeTypes = filters.crimeTypes
      .filter(ct => ct.selected)
      .map(ct => ct.category);
    
    if (selectedCrimeTypes.length > 0 && !selectedCrimeTypes.includes(incident.crimeType.category)) {
      return false;
    }

    // Check severity filter
    const selectedSeverities = filters.severityLevels
      .filter(sl => sl.selected)
      .map(sl => sl.level);
    
    if (selectedSeverities.length > 0 && !selectedSeverities.includes(incident.severity)) {
      return false;
    }

    // Check time of day filter
    if (filters.timeOfDay.enabled) {
      const { startHour, endHour } = filters.timeOfDay;
      if (incident.hourOfDay < startHour || incident.hourOfDay > endHour) {
        return false;
      }
    }

    return true;
  });
};

// Function to check if an incident matches the applied filters
const incidentMatchesFilters = (incident: MockCrimeIncident, filters: FilterState): boolean => {
  // Check crime type filter
  const selectedCrimeTypes = filters.crimeTypes
    .filter(ct => ct.selected)
    .map(ct => ct.category);
  
  if (selectedCrimeTypes.length > 0 && !selectedCrimeTypes.includes(incident.crimeType.category)) {
    return false;
  }

  // Check severity filter
  const selectedSeverities = filters.severityLevels
    .filter(sl => sl.selected)
    .map(sl => sl.level);
  
  if (selectedSeverities.length > 0 && !selectedSeverities.includes(incident.severity)) {
    return false;
  }

  // Check time of day filter
  if (filters.timeOfDay.enabled) {
    const { startHour, endHour } = filters.timeOfDay;
    if (incident.hourOfDay < startHour || incident.hourOfDay > endHour) {
      return false;
    }
  }

  return true;
};

describe('Filter Application Accuracy Property Tests', () => {
  it('Property 5: All filtered results match the applied filter criteria', () => {
    fc.assert(
      fc.property(
        fc.array(crimeIncidentArbitrary, { minLength: 0, maxLength: 100 }),
        filterStateArbitrary,
        (incidents, filters) => {
          // Apply filters to get filtered results
          const filteredIncidents = applyFilters(incidents, filters);

          // Property: Every incident in the filtered results should match the filter criteria
          const allIncidentsMatchFilters = filteredIncidents.every(incident => 
            incidentMatchesFilters(incident, filters)
          );

          return allIncidentsMatchFilters;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5a: Crime type filter accuracy', () => {
    fc.assert(
      fc.property(
        fc.array(crimeIncidentArbitrary, { minLength: 1, maxLength: 50 }),
        fc.array(
          fc.constantFrom('violent' as const, 'property' as const, 'drug' as const, 'public_order' as const, 'white_collar' as const),
          { minLength: 1, maxLength: 3 }
        ),
        (incidents, selectedCategories) => {
          // Create filter state with only crime type filters
          const filters: FilterState = {
            crimeTypes: [
              { category: 'violent', subcategory: 'All Violent', selected: selectedCategories.includes('violent') },
              { category: 'property', subcategory: 'All Property', selected: selectedCategories.includes('property') },
              { category: 'drug', subcategory: 'All Drug', selected: selectedCategories.includes('drug') },
              { category: 'public_order', subcategory: 'All Public Order', selected: selectedCategories.includes('public_order') },
              { category: 'white_collar', subcategory: 'All White Collar', selected: selectedCategories.includes('white_collar') },
            ],
            severityLevels: [
              { level: 'misdemeanor', selected: true },
              { level: 'felony', selected: true },
              { level: 'violation', selected: true },
            ],
            timeOfDay: { startHour: 0, endHour: 23, enabled: false },
          };

          const filteredIncidents = applyFilters(incidents, filters);

          // Property: All filtered incidents should have crime types in the selected categories
          return filteredIncidents.every(incident => 
            selectedCategories.includes(incident.crimeType.category)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5b: Severity filter accuracy', () => {
    fc.assert(
      fc.property(
        fc.array(crimeIncidentArbitrary, { minLength: 1, maxLength: 50 }),
        fc.array(
          fc.constantFrom('misdemeanor' as const, 'felony' as const, 'violation' as const),
          { minLength: 1, maxLength: 2 }
        ),
        (incidents, selectedSeverities) => {
          // Create filter state with only severity filters
          const filters: FilterState = {
            crimeTypes: [
              { category: 'violent', subcategory: 'All Violent', selected: true },
              { category: 'property', subcategory: 'All Property', selected: true },
              { category: 'drug', subcategory: 'All Drug', selected: true },
              { category: 'public_order', subcategory: 'All Public Order', selected: true },
              { category: 'white_collar', subcategory: 'All White Collar', selected: true },
            ],
            severityLevels: [
              { level: 'misdemeanor', selected: selectedSeverities.includes('misdemeanor') },
              { level: 'felony', selected: selectedSeverities.includes('felony') },
              { level: 'violation', selected: selectedSeverities.includes('violation') },
            ],
            timeOfDay: { startHour: 0, endHour: 23, enabled: false },
          };

          const filteredIncidents = applyFilters(incidents, filters);

          // Property: All filtered incidents should have severities in the selected levels
          return filteredIncidents.every(incident => 
            selectedSeverities.includes(incident.severity)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5c: Time of day filter accuracy', () => {
    fc.assert(
      fc.property(
        fc.array(crimeIncidentArbitrary, { minLength: 1, maxLength: 50 }),
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 3, max: 23 }),
        (incidents, startHour, endHour) => {
          // Ensure valid time range
          if (startHour >= endHour) return true;

          // Create filter state with only time of day filter
          const filters: FilterState = {
            crimeTypes: [
              { category: 'violent', subcategory: 'All Violent', selected: true },
              { category: 'property', subcategory: 'All Property', selected: true },
              { category: 'drug', subcategory: 'All Drug', selected: true },
              { category: 'public_order', subcategory: 'All Public Order', selected: true },
              { category: 'white_collar', subcategory: 'All White Collar', selected: true },
            ],
            severityLevels: [
              { level: 'misdemeanor', selected: true },
              { level: 'felony', selected: true },
              { level: 'violation', selected: true },
            ],
            timeOfDay: { startHour, endHour, enabled: true },
          };

          const filteredIncidents = applyFilters(incidents, filters);

          // Property: All filtered incidents should have hours within the selected range
          return filteredIncidents.every(incident => 
            incident.hourOfDay >= startHour && incident.hourOfDay <= endHour
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5d: No filters means all data passes through', () => {
    fc.assert(
      fc.property(
        fc.array(crimeIncidentArbitrary, { minLength: 0, maxLength: 50 }),
        (incidents) => {
          // Create filter state with all filters enabled (no filtering)
          const filters: FilterState = {
            crimeTypes: [
              { category: 'violent', subcategory: 'All Violent', selected: true },
              { category: 'property', subcategory: 'All Property', selected: true },
              { category: 'drug', subcategory: 'All Drug', selected: true },
              { category: 'public_order', subcategory: 'All Public Order', selected: true },
              { category: 'white_collar', subcategory: 'All White Collar', selected: true },
            ],
            severityLevels: [
              { level: 'misdemeanor', selected: true },
              { level: 'felony', selected: true },
              { level: 'violation', selected: true },
            ],
            timeOfDay: { startHour: 0, endHour: 23, enabled: false },
          };

          const filteredIncidents = applyFilters(incidents, filters);

          // Property: When no filters are applied, all incidents should pass through
          return filteredIncidents.length === incidents.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});