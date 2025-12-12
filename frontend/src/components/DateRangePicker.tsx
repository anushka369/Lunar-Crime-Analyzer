import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  ButtonGroup,
  Alert,
  FormControl,
  InputLabel,
  TextField,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { CalendarToday } from '@mui/icons-material';
import { subDays, subMonths, subYears, startOfDay, endOfDay } from 'date-fns';

export interface DateRange {
  start: Date;
  end: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  minDate,
  maxDate = new Date(),
  disabled = false,
}) => {
  const [customMode, setCustomMode] = useState(false);

  const presetRanges = [
    {
      label: 'Last 30 Days',
      getValue: () => ({
        start: startOfDay(subDays(new Date(), 30)),
        end: endOfDay(new Date()),
      }),
    },
    {
      label: 'Last 3 Months',
      getValue: () => ({
        start: startOfDay(subMonths(new Date(), 3)),
        end: endOfDay(new Date()),
      }),
    },
    {
      label: 'Last 6 Months',
      getValue: () => ({
        start: startOfDay(subMonths(new Date(), 6)),
        end: endOfDay(new Date()),
      }),
    },
    {
      label: 'Last Year',
      getValue: () => ({
        start: startOfDay(subYears(new Date(), 1)),
        end: endOfDay(new Date()),
      }),
    },
  ];

  const handlePresetSelect = (preset: typeof presetRanges[0]) => {
    const range = preset.getValue();
    onChange(range);
    setCustomMode(false);
  };

  const handleCustomRange = () => {
    setCustomMode(true);
  };

  const handleStartDateChange = (date: unknown) => {
    if (date && date instanceof Date) {
      const newStart = startOfDay(date);
      // Ensure start date is not after end date
      const newEnd = newStart > value.end ? endOfDay(date) : value.end;
      onChange({ start: newStart, end: newEnd });
    }
  };

  const handleEndDateChange = (date: unknown) => {
    if (date && date instanceof Date) {
      const newEnd = endOfDay(date);
      // Ensure end date is not before start date
      const newStart = newEnd < value.start ? startOfDay(date) : value.start;
      onChange({ start: newStart, end: newEnd });
    }
  };

  const validateDateRange = () => {
    const daysDiff = Math.ceil((value.end.getTime() - value.start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 1) {
      return 'End date must be after start date';
    }
    
    if (daysDiff > 365 * 2) {
      return 'Date range cannot exceed 2 years for performance reasons';
    }
    
    if (minDate && value.start < minDate) {
      return `Start date cannot be before ${minDate.toLocaleDateString()}`;
    }
    
    if (maxDate && value.end > maxDate) {
      return `End date cannot be after ${maxDate.toLocaleDateString()}`;
    }
    
    return null;
  };

  const validationError = validateDateRange();

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarToday />
          Analysis Period
        </Typography>

        {!customMode ? (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Quick Select:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
              {presetRanges.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outlined"
                  size="small"
                  onClick={() => handlePresetSelect(preset)}
                  disabled={disabled}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  {preset.label}
                </Button>
              ))}
            </Box>
            
            <Button
              variant="text"
              size="small"
              onClick={handleCustomRange}
              disabled={disabled}
            >
              Custom Date Range
            </Button>
          </Box>
        ) : (
          <Box>
            <ButtonGroup size="small" sx={{ mb: 2 }}>
              <Button
                variant="text"
                onClick={() => setCustomMode(false)}
                disabled={disabled}
              >
                ← Back to Presets
              </Button>
            </ButtonGroup>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth>
                <DatePicker
                  label="Start Date"
                  value={value.start}
                  onChange={handleStartDateChange}
                  disabled={disabled}
                  minDate={minDate}
                  maxDate={value.end}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      size="small"
                      fullWidth
                    />
                  )}
                />
              </FormControl>

              <FormControl fullWidth>
                <DatePicker
                  label="End Date"
                  value={value.end}
                  onChange={handleEndDateChange}
                  disabled={disabled}
                  minDate={value.start}
                  maxDate={maxDate}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      size="small"
                      fullWidth
                    />
                  )}
                />
              </FormControl>
            </Box>
          </Box>
        )}

        {/* Current selection display */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Selected Period:
          </Typography>
          <Typography variant="body2">
            {value.start.toLocaleDateString()} - {value.end.toLocaleDateString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ({Math.ceil((value.end.getTime() - value.start.getTime()) / (1000 * 60 * 60 * 24))} days)
          </Typography>
        </Box>

        {/* Validation errors */}
        {validationError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {validationError}
          </Alert>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default DateRangePicker;