// Filter-related types for the frontend
export interface CrimeTypeFilter {
  category: 'violent' | 'property' | 'drug' | 'public_order' | 'white_collar';
  subcategory: string;
  selected: boolean;
}

export interface SeverityFilter {
  level: 'misdemeanor' | 'felony' | 'violation';
  selected: boolean;
}

export interface TimeOfDayFilter {
  startHour: number;
  endHour: number;
  enabled: boolean;
}

export interface FilterState {
  crimeTypes: CrimeTypeFilter[];
  severityLevels: SeverityFilter[];
  timeOfDay: TimeOfDayFilter;
}

export interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onResetFilters: () => void;
  disabled?: boolean;
}

// Default filter state
export const createDefaultFilterState = (): FilterState => ({
  crimeTypes: [
    { category: 'violent', subcategory: 'All Violent Crimes', selected: true },
    { category: 'property', subcategory: 'All Property Crimes', selected: true },
    { category: 'drug', subcategory: 'All Drug Crimes', selected: true },
    { category: 'public_order', subcategory: 'All Public Order Crimes', selected: true },
    { category: 'white_collar', subcategory: 'All White Collar Crimes', selected: true },
  ],
  severityLevels: [
    { level: 'misdemeanor', selected: true },
    { level: 'felony', selected: true },
    { level: 'violation', selected: true },
  ],
  timeOfDay: {
    startHour: 0,
    endHour: 23,
    enabled: false,
  },
});