import React from 'react';
import {
  Box,
  Paper,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  Switch,
  Button,
  Divider,
  Chip,

  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Clear, AccessTime, Close } from '@mui/icons-material';
import { FilterPanelProps } from '../types/filters';

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  onResetFilters,
  disabled = false,
}) => {
  const [confirmResetOpen, setConfirmResetOpen] = React.useState(false);
  const handleCrimeTypeChange = (category: string, checked: boolean) => {
    const updatedFilters = {
      ...filters,
      crimeTypes: filters.crimeTypes.map((crimeType) =>
        crimeType.category === category
          ? { ...crimeType, selected: checked }
          : crimeType
      ),
    };
    onFiltersChange(updatedFilters);
  };

  const handleSeverityChange = (level: string, checked: boolean) => {
    const updatedFilters = {
      ...filters,
      severityLevels: filters.severityLevels.map((severity) =>
        severity.level === level
          ? { ...severity, selected: checked }
          : severity
      ),
    };
    onFiltersChange(updatedFilters);
  };

  const handleTimeOfDayToggle = (enabled: boolean) => {
    const updatedFilters = {
      ...filters,
      timeOfDay: {
        ...filters.timeOfDay,
        enabled,
      },
    };
    onFiltersChange(updatedFilters);
  };

  const handleTimeRangeChange = (newValue: number | number[]) => {
    if (Array.isArray(newValue) && newValue.length === 2) {
      const updatedFilters = {
        ...filters,
        timeOfDay: {
          ...filters.timeOfDay,
          startHour: newValue[0],
          endHour: newValue[1],
        },
      };
      onFiltersChange(updatedFilters);
    }
  };

  const handleResetConfirmation = () => {
    setConfirmResetOpen(true);
  };

  const handleResetConfirmed = () => {
    onResetFilters();
    setConfirmResetOpen(false);
  };

  const handleResetCancelled = () => {
    setConfirmResetOpen(false);
  };

  const handleRemoveIndividualFilter = (filterType: 'crimeType' | 'severity' | 'timeOfDay', value?: string) => {
    if (filterType === 'crimeType' && value) {
      handleCrimeTypeChange(value, false);
    } else if (filterType === 'severity' && value) {
      handleSeverityChange(value, false);
    } else if (filterType === 'timeOfDay') {
      handleTimeOfDayToggle(false);
    }
  };

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12:00 AM';
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return '12:00 PM';
    return `${hour - 12}:00 PM`;
  };

  const getActiveFiltersCount = (): number => {
    let count = 0;
    
    // Count selected crime types (if not all are selected)
    const selectedCrimeTypes = filters.crimeTypes.filter(ct => ct.selected).length;
    if (selectedCrimeTypes < filters.crimeTypes.length) {
      count += selectedCrimeTypes;
    }
    
    // Count selected severity levels (if not all are selected)
    const selectedSeverities = filters.severityLevels.filter(sl => sl.selected).length;
    if (selectedSeverities < filters.severityLevels.length) {
      count += selectedSeverities;
    }
    
    // Count time filter if enabled
    if (filters.timeOfDay.enabled) {
      count += 1;
    }
    
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" component="h2">
          Filters
          {activeFiltersCount > 0 && (
            <Chip
              label={`${activeFiltersCount} active`}
              size="small"
              color="primary"
              sx={{ ml: 1 }}
            />
          )}
        </Typography>
        <Button
          startIcon={<Clear />}
          onClick={handleResetConfirmation}
          variant="outlined"
          size="small"
          disabled={disabled || activeFiltersCount === 0}
        >
          Clear All
        </Button>
      </Box>

      {/* Crime Type Filters */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom>
          Crime Types
        </Typography>
        <FormGroup>
          {filters.crimeTypes.map((crimeType) => (
            <FormControlLabel
              key={crimeType.category}
              control={
                <Checkbox
                  checked={crimeType.selected}
                  onChange={(e) =>
                    handleCrimeTypeChange(crimeType.category, e.target.checked)
                  }
                  disabled={disabled}
                />
              }
              label={crimeType.subcategory}
            />
          ))}
        </FormGroup>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Severity Level Filters */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom>
          Severity Levels
        </Typography>
        <FormGroup>
          {filters.severityLevels.map((severity) => (
            <FormControlLabel
              key={severity.level}
              control={
                <Checkbox
                  checked={severity.selected}
                  onChange={(e) =>
                    handleSeverityChange(severity.level, e.target.checked)
                  }
                  disabled={disabled}
                />
              }
              label={severity.level.charAt(0).toUpperCase() + severity.level.slice(1)}
            />
          ))}
        </FormGroup>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Time of Day Filter */}
      <Box mb={2}>
        <Box display="flex" alignItems="center" mb={2}>
          <AccessTime sx={{ mr: 1 }} />
          <Typography variant="subtitle1">
            Time of Day Filter
          </Typography>
          <Switch
            checked={filters.timeOfDay.enabled}
            onChange={(e) => handleTimeOfDayToggle(e.target.checked)}
            disabled={disabled}
            sx={{ ml: 'auto' }}
          />
        </Box>
        
        {filters.timeOfDay.enabled && (
          <Box px={2}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Hour Range: {formatHour(filters.timeOfDay.startHour)} - {formatHour(filters.timeOfDay.endHour)}
            </Typography>
            <Slider
              value={[filters.timeOfDay.startHour, filters.timeOfDay.endHour]}
              onChange={(_, newValue) => handleTimeRangeChange(newValue)}
              valueLabelDisplay="auto"
              valueLabelFormat={formatHour}
              min={0}
              max={23}
              step={1}
              disabled={disabled}
              marks={[
                { value: 0, label: '12 AM' },
                { value: 6, label: '6 AM' },
                { value: 12, label: '12 PM' },
                { value: 18, label: '6 PM' },
                { value: 23, label: '11 PM' },
              ]}
            />
          </Box>
        )}
      </Box>

      {/* Active Filters Summary */}
      {activeFiltersCount > 0 && (
        <Box mt={2}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Active filters will be applied to all visualizations and analysis
          </Typography>
          
          {/* Individual Filter Chips */}
          <Box mt={1} display="flex" flexWrap="wrap" gap={1}>
            {/* Crime Type Filter Chips */}
            {filters.crimeTypes
              .filter(ct => !ct.selected)
              .map(ct => (
                <Chip
                  key={`excluded-${ct.category}`}
                  label={`Excluded: ${ct.subcategory}`}
                  size="small"
                  variant="outlined"
                  color="secondary"
                  onDelete={() => handleRemoveIndividualFilter('crimeType', ct.category)}
                  deleteIcon={<Close />}
                />
              ))}
            
            {/* Severity Filter Chips */}
            {filters.severityLevels
              .filter(sl => !sl.selected)
              .map(sl => (
                <Chip
                  key={`excluded-${sl.level}`}
                  label={`Excluded: ${sl.level.charAt(0).toUpperCase() + sl.level.slice(1)}`}
                  size="small"
                  variant="outlined"
                  color="secondary"
                  onDelete={() => handleRemoveIndividualFilter('severity', sl.level)}
                  deleteIcon={<Close />}
                />
              ))}
            
            {/* Time of Day Filter Chip */}
            {filters.timeOfDay.enabled && (
              <Chip
                label={`Time: ${formatHour(filters.timeOfDay.startHour)} - ${formatHour(filters.timeOfDay.endHour)}`}
                size="small"
                variant="outlined"
                color="primary"
                onDelete={() => handleRemoveIndividualFilter('timeOfDay')}
                deleteIcon={<Close />}
              />
            )}
          </Box>
        </Box>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmResetOpen}
        onClose={handleResetCancelled}
        aria-labelledby="reset-dialog-title"
        aria-describedby="reset-dialog-description"
      >
        <DialogTitle id="reset-dialog-title">
          Clear All Filters
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="reset-dialog-description">
            Are you sure you want to clear all active filters? This will restore the complete dataset for the selected location and time period.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetCancelled} color="primary">
            Cancel
          </Button>
          <Button onClick={handleResetConfirmed} color="primary" variant="contained" autoFocus>
            Clear All Filters
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default FilterPanel;