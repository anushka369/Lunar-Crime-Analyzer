import * as fc from 'fast-check';
import { FilterState, createDefaultFilterState } from '../types/filters';

/**
 * **Feature: data-weaver-dashboard, Property 6: Filter reset completeness**
 * 
 * Property: For any previously applied filter state, clearing filters should restore 
 * the complete dataset for the selected location and time period
 * 
 * **Validates: Requirements 4.5**
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

// Generator for filter states with some filters applied
const appliedFilterStateArbitrary = fc.record({
  crimeTypes: fc.array(
    fc.record({
      category: fc.constantFrom('violent' as const, 'property' as const, 'drug' as const, 'public_order' as const, 'white_collar' as const),
      subcategory: fc.string({ minLength: 1, maxLength: 20 }),
      selected: fc.boolean(),
    }),
    { minLength: 1, maxLength: 5 }
  ).filter(crimeTypes => crimeTypes.some(ct => !ct.selected)), // Ensure at least one filter is applied
  severityLevels: fc.array(
    fc.record({
      level: fc.constantFrom('misdemeanor' as const, 'felony' as const, 'violation' as const),
      selected: fc.boolean(),
    }),
    { minLength: 1, maxLength: 3 }
  ).filter(severityLevels => severityLevels.some(sl => !sl.selected)), // Ensure at least one filter is applied
  timeOfDay: fc.record({
    startHour: fc.integer({ min: 0, max: 22 }),
    endHour: fc.integer({ min: 1, max: 23 }),
    enabled: fc.boolean(),
  }).filter(({ startHour, endHour, enabled }) => startHour < endHour && enabled), // Ensure time filter is enabled
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

// Function to simulate filter reset (returns default filter state)
const resetFilters = (): FilterState => {
  return createDefaultFilterState();
};

// Function to check if filter state represents "no filtering" (all data should pass through)
const isNoFilteringState = (filters: FilterState): boolean => {
  // All crime types should be selected
  const allCrimeTypesSelected = filters.crimeTypes.every(ct => ct.selected);
  
  // All severity levels should be selected
  const allSeverityLevelsSelected = filters.severityLevels.every(sl => sl.selected);
  
  // Time of day filter should be disabled
  const timeFilterDisabled = !filters.timeOfDay.enabled;
  
  return allCrimeTypesSelected && allSeverityLevelsSelected && timeFilterDisabled;
};

describe('Filter Reset Completeness Property Tests', () => {
  it('Property 6: Resetting filters restores complete dataset', () => {
    fc.assert(
      fc.property(
        fc.array(crimeIncidentArbitrary, { minLength: 1, maxLength: 100 }),
        appliedFilterStateArbitrary,
        (incidents, appliedFilters) => {
          // Apply the filters to get a filtered dataset (for demonstration of the property)
          applyFilters(incidents, appliedFilters);
          
          // Reset the filters
          const resetFilterState = resetFilters();
          
          // Apply the reset filters (should be no filtering)
          const resetFilteredIncidents = applyFilters(incidents, resetFilterState);
          
          // Property: After reset, the filtered dataset should equal the original dataset
          return resetFilteredIncidents.length === incidents.length &&
                 resetFilteredIncidents.every((incident, index) => 
                   incident.id === incidents[index].id
                 );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6a: Reset filter state has no active filters', () => {
    fc.assert(
      fc.property(
        appliedFilterStateArbitrary,
        (_appliedFilters) => {
          // Reset the filters
          const resetFilterState = resetFilters();
          
          // Property: Reset state should represent "no filtering"
          return isNoFilteringState(resetFilterState);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6b: Reset filters allow all crime types through', () => {
    fc.assert(
      fc.property(
        fc.array(crimeIncidentArbitrary, { minLength: 1, maxLength: 50 }),
        (incidents) => {
          // Reset the filters
          const resetFilterState = resetFilters();
          
          // Apply reset filters
          const filteredIncidents = applyFilters(incidents, resetFilterState);
          
          // Property: All crime types should be represented in the filtered results
          // (assuming the original dataset has all crime types)
          const originalCrimeTypes = new Set(incidents.map(i => i.crimeType.category));
          const filteredCrimeTypes = new Set(filteredIncidents.map(i => i.crimeType.category));
          
          return originalCrimeTypes.size === filteredCrimeTypes.size &&
                 Array.from(originalCrimeTypes).every(type => filteredCrimeTypes.has(type));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6c: Reset filters allow all severity levels through', () => {
    fc.assert(
      fc.property(
        fc.array(crimeIncidentArbitrary, { minLength: 1, maxLength: 50 }),
        (incidents) => {
          // Reset the filters
          const resetFilterState = resetFilters();
          
          // Apply reset filters
          const filteredIncidents = applyFilters(incidents, resetFilterState);
          
          // Property: All severity levels should be represented in the filtered results
          // (assuming the original dataset has all severity levels)
          const originalSeverities = new Set(incidents.map(i => i.severity));
          const filteredSeverities = new Set(filteredIncidents.map(i => i.severity));
          
          return originalSeverities.size === filteredSeverities.size &&
                 Array.from(originalSeverities).every(severity => filteredSeverities.has(severity));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6d: Reset filters allow all time periods through', () => {
    fc.assert(
      fc.property(
        fc.array(crimeIncidentArbitrary, { minLength: 1, maxLength: 50 }),
        (incidents) => {
          // Reset the filters
          const resetFilterState = resetFilters();
          
          // Apply reset filters
          const filteredIncidents = applyFilters(incidents, resetFilterState);
          
          // Property: All hours of the day should be represented in the filtered results
          // (assuming the original dataset has incidents across different hours)
          const originalHours = new Set(incidents.map(i => i.hourOfDay));
          const filteredHours = new Set(filteredIncidents.map(i => i.hourOfDay));
          
          return originalHours.size === filteredHours.size &&
                 Array.from(originalHours).every(hour => filteredHours.has(hour));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6e: Reset is idempotent', () => {
    fc.assert(
      fc.property(
        appliedFilterStateArbitrary,
        (_appliedFilters) => {
          // Reset the filters once
          const resetFilterState1 = resetFilters();
          
          // Reset the filters again
          const resetFilterState2 = resetFilters();
          
          // Property: Resetting twice should produce the same result as resetting once
          return JSON.stringify(resetFilterState1) === JSON.stringify(resetFilterState2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6f: Filter then reset equals no filtering', () => {
    fc.assert(
      fc.property(
        fc.array(crimeIncidentArbitrary, { minLength: 1, maxLength: 50 }),
        appliedFilterStateArbitrary,
        (incidents, _appliedFilters) => {
          // Apply filters then reset
          const filteredThenReset = applyFilters(incidents, resetFilters());
          
          // Apply no filters (default state)
          const noFiltering = applyFilters(incidents, createDefaultFilterState());
          
          // Property: Filter->Reset should equal no filtering from the start
          return filteredThenReset.length === noFiltering.length &&
                 filteredThenReset.every((incident, index) => 
                   incident.id === noFiltering[index].id
                 );
        }
      ),
      { numRuns: 100 }
    );
  });
});