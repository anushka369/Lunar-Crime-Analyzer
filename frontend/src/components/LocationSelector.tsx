import React, { useState, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { LocationOn, Warning } from '@mui/icons-material';
import { useLocationSearch, useDataAvailability } from '../hooks/useApi';
import { LocationInfo } from '../types/data';

interface LocationSelectorProps {
  value: string | null;
  onChange: (location: string | null) => void;
  onLocationInfo?: (info: LocationInfo | null) => void;
  disabled?: boolean;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  value,
  onChange,
  onLocationInfo,
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search for locations
  const {
    data: locations = [],
    isLoading: isSearching,
    error: searchError,
  } = useLocationSearch(
    { query: debouncedQuery },
    debouncedQuery.length >= 2
  );

  // Check data availability for selected location
  const {
    data: dataAvailability,
    isLoading: isCheckingAvailability,
    error: availabilityError,
  } = useDataAvailability(selectedLocationId || '', !!selectedLocationId);

  const handleLocationSelect = (location: LocationInfo | null) => {
    if (location) {
      setSelectedLocationId(location.id);
      onChange(location.name);
      onLocationInfo?.(location);
    } else {
      setSelectedLocationId(null);
      onChange(null);
      onLocationInfo?.(null);
    }
  };

  const getLocationOption = (option: LocationInfo) => {
    return {
      label: `${option.name}, ${option.state || option.country}`,
      value: option,
    };
  };

  const renderLocationOption = (props: any, option: LocationInfo) => (
    <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <LocationOn color="action" />
      <Box>
        <Typography variant="body2">
          {option.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {option.state && `${option.state}, `}{option.country}
          {option.population && ` • Pop: ${option.population.toLocaleString()}`}
        </Typography>
      </Box>
    </Box>
  );

  const renderDataAvailabilityStatus = () => {
    if (!selectedLocationId || isCheckingAvailability) {
      return null;
    }

    if (availabilityError) {
      return (
        <Alert severity="error" sx={{ mt: 1 }}>
          Unable to check data availability for this location.
        </Alert>
      );
    }

    if (!dataAvailability) {
      return null;
    }

    const { crimeDataAvailable, moonDataAvailable, dateRange, limitations } = dataAvailability;

    if (!crimeDataAvailable || !moonDataAvailable) {
      return (
        <Alert severity="warning" sx={{ mt: 1 }} icon={<Warning />}>
          <Typography variant="body2" gutterBottom>
            Limited data available for this location:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            <Chip
              label="Crime Data"
              color={crimeDataAvailable ? 'success' : 'error'}
              size="small"
            />
            <Chip
              label="Moon Data"
              color={moonDataAvailable ? 'success' : 'error'}
              size="small"
            />
          </Box>
          {limitations && limitations.length > 0 && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Limitations: {limitations.join(', ')}
            </Typography>
          )}
        </Alert>
      );
    }

    return (
      <Alert severity="success" sx={{ mt: 1 }}>
        <Typography variant="body2" gutterBottom>
          Data available for analysis
        </Typography>
        {dateRange && (
          <Typography variant="caption" display="block">
            Available period: {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
          <Chip label="Crime Data" color="success" size="small" />
          <Chip label="Moon Data" color="success" size="small" />
        </Box>
      </Alert>
    );
  };

  return (
    <Box>
      <Autocomplete
        options={locations}
        getOptionLabel={(option) => getLocationOption(option).label}
        renderOption={renderLocationOption}
        loading={isSearching}
        disabled={disabled}
        value={locations.find(loc => loc.name === value) || null}
        onChange={(_, newValue) => handleLocationSelect(newValue)}
        inputValue={searchQuery}
        onInputChange={(_, newInputValue) => setSearchQuery(newInputValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Select Location"
            placeholder="Search for a city, county, or region..."
            variant="outlined"
            fullWidth
            InputProps={{
              ...params.InputProps,
              startAdornment: <LocationOn color="action" sx={{ mr: 1 }} />,
              endAdornment: (
                <>
                  {isSearching && <CircularProgress color="inherit" size={20} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            helperText={
              searchError
                ? 'Error searching locations. Please try again.'
                : 'Type at least 2 characters to search for locations'
            }
            error={!!searchError}
          />
        )}
        noOptionsText={
          debouncedQuery.length < 2
            ? 'Type at least 2 characters to search'
            : searchError
            ? 'Error loading locations'
            : 'No locations found'
        }
        filterOptions={(x) => x} // Disable client-side filtering since we're using server-side search
      />

      {isCheckingAvailability && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="caption" color="text.secondary">
            Checking data availability...
          </Typography>
        </Box>
      )}

      {renderDataAvailabilityStatus()}
    </Box>
  );
};

export default LocationSelector;