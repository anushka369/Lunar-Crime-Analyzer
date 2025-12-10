
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FilterPanel from './FilterPanel';
import { createDefaultFilterState } from '../types/filters';

describe('FilterPanel', () => {
  const mockOnFiltersChange = jest.fn();
  const mockOnResetFilters = jest.fn();
  const defaultFilters = createDefaultFilterState();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders filter panel with all sections', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onResetFilters={mockOnResetFilters}
      />
    );

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Crime Types')).toBeInTheDocument();
    expect(screen.getByText('Severity Levels')).toBeInTheDocument();
    expect(screen.getByText('Time of Day Filter')).toBeInTheDocument();
    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  it('displays all crime type checkboxes', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onResetFilters={mockOnResetFilters}
      />
    );

    expect(screen.getByLabelText('All Violent Crimes')).toBeInTheDocument();
    expect(screen.getByLabelText('All Property Crimes')).toBeInTheDocument();
    expect(screen.getByLabelText('All Drug Crimes')).toBeInTheDocument();
    expect(screen.getByLabelText('All Public Order Crimes')).toBeInTheDocument();
    expect(screen.getByLabelText('All White Collar Crimes')).toBeInTheDocument();
  });

  it('displays all severity level checkboxes', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onResetFilters={mockOnResetFilters}
      />
    );

    expect(screen.getByLabelText('Misdemeanor')).toBeInTheDocument();
    expect(screen.getByLabelText('Felony')).toBeInTheDocument();
    expect(screen.getByLabelText('Violation')).toBeInTheDocument();
  });

  it('calls onFiltersChange when crime type checkbox is toggled', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onResetFilters={mockOnResetFilters}
      />
    );

    const violentCrimeCheckbox = screen.getByLabelText('All Violent Crimes');
    fireEvent.click(violentCrimeCheckbox);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      crimeTypes: defaultFilters.crimeTypes.map((ct) =>
        ct.category === 'violent' ? { ...ct, selected: false } : ct
      ),
    });
  });

  it('calls onFiltersChange when severity level checkbox is toggled', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onResetFilters={mockOnResetFilters}
      />
    );

    const felonyCheckbox = screen.getByLabelText('Felony');
    fireEvent.click(felonyCheckbox);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      severityLevels: defaultFilters.severityLevels.map((sl) =>
        sl.level === 'felony' ? { ...sl, selected: false } : sl
      ),
    });
  });

  it('shows confirmation dialog when Clear All button is clicked', () => {
    // Create filters with some active filters so the button is enabled
    const filtersWithActive = {
      ...defaultFilters,
      crimeTypes: defaultFilters.crimeTypes.map((ct, index) =>
        index === 0 ? { ...ct, selected: false } : ct
      ),
    };

    render(
      <FilterPanel
        filters={filtersWithActive}
        onFiltersChange={mockOnFiltersChange}
        onResetFilters={mockOnResetFilters}
      />
    );

    const clearAllButton = screen.getByText('Clear All');
    fireEvent.click(clearAllButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('enables time of day filter when switch is toggled', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onResetFilters={mockOnResetFilters}
      />
    );

    // Find the switch by its role and position (it's the last checkbox in the list)
    const switches = screen.getAllByRole('checkbox');
    const timeSwitch = switches[switches.length - 1]; // The time switch is the last checkbox
    fireEvent.click(timeSwitch);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      timeOfDay: {
        ...defaultFilters.timeOfDay,
        enabled: true,
      },
    });
  });

  it('shows active filters count when filters are applied', () => {
    const filtersWithSomeDisabled = {
      ...defaultFilters,
      crimeTypes: defaultFilters.crimeTypes.map((ct, index) =>
        index === 0 ? { ...ct, selected: false } : ct
      ),
      timeOfDay: {
        ...defaultFilters.timeOfDay,
        enabled: true,
      },
    };

    render(
      <FilterPanel
        filters={filtersWithSomeDisabled}
        onFiltersChange={mockOnFiltersChange}
        onResetFilters={mockOnResetFilters}
      />
    );

    expect(screen.getByText('5 active')).toBeInTheDocument();
  });

  it('shows confirmation dialog content correctly', () => {
    const filtersWithActive = {
      ...defaultFilters,
      crimeTypes: defaultFilters.crimeTypes.map((ct, index) =>
        index === 0 ? { ...ct, selected: false } : ct
      ),
    };

    render(
      <FilterPanel
        filters={filtersWithActive}
        onFiltersChange={mockOnFiltersChange}
        onResetFilters={mockOnResetFilters}
      />
    );

    const clearAllButton = screen.getByText('Clear All');
    fireEvent.click(clearAllButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to clear all active filters/)).toBeInTheDocument();
  });

  it('calls onResetFilters when confirmation is accepted', () => {
    const filtersWithActive = {
      ...defaultFilters,
      crimeTypes: defaultFilters.crimeTypes.map((ct, index) =>
        index === 0 ? { ...ct, selected: false } : ct
      ),
    };

    render(
      <FilterPanel
        filters={filtersWithActive}
        onFiltersChange={mockOnFiltersChange}
        onResetFilters={mockOnResetFilters}
      />
    );

    const clearAllButton = screen.getByText('Clear All');
    fireEvent.click(clearAllButton);

    // Find the confirm button in the dialog
    const confirmButton = screen.getByRole('button', { name: /clear all filters/i });
    fireEvent.click(confirmButton);

    expect(mockOnResetFilters).toHaveBeenCalled();
  });

  it('displays individual filter chips for excluded filters', () => {
    const filtersWithExclusions = {
      ...defaultFilters,
      crimeTypes: defaultFilters.crimeTypes.map((ct, index) =>
        index === 0 ? { ...ct, selected: false } : ct
      ),
      severityLevels: defaultFilters.severityLevels.map((sl, index) =>
        index === 0 ? { ...sl, selected: false } : sl
      ),
      timeOfDay: {
        startHour: 8,
        endHour: 17,
        enabled: true,
      },
    };

    render(
      <FilterPanel
        filters={filtersWithExclusions}
        onFiltersChange={mockOnFiltersChange}
        onResetFilters={mockOnResetFilters}
      />
    );

    expect(screen.getByText('Excluded: All Violent Crimes')).toBeInTheDocument();
    expect(screen.getByText('Excluded: Misdemeanor')).toBeInTheDocument();
    expect(screen.getByText('Time: 8:00 AM - 5:00 PM')).toBeInTheDocument();
  });
});