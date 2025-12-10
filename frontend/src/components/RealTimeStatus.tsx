import React, { useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  Tooltip,
  Button,
  Divider,
} from '@mui/material';
import {
  Wifi,
  WifiOff,
  Error as ErrorIcon,
  Refresh,
  Notifications,
  LocationOn,
  Schedule,
  Security,
} from '@mui/icons-material';
import { useRealTimeData } from './RealTimeDataProvider';
import { formatDistanceToNow } from 'date-fns';

interface RealTimeStatusProps {
  currentLocation?: string;
  onRefreshRequest?: () => void;
}

const RealTimeStatus: React.FC<RealTimeStatusProps> = ({
  currentLocation,
  onRefreshRequest,
}) => {
  const {
    isConnected,
    connectionStatus,
    subscribedLocations,
    error,
    recentUpdates,
    requestDataRefresh,
  } = useRealTimeData();

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleRefresh = () => {
    if (currentLocation && isConnected) {
      requestDataRefresh({
        location: currentLocation,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: new Date(),
      });
    }
    onRefreshRequest?.();
  };

  const open = Boolean(anchorEl);
  const id = open ? 'realtime-status-popover' : undefined;

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi color="success" />;
      case 'connecting':
        return <Wifi color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'disconnected':
      default:
        return <WifiOff color="disabled" />;
    }
  };

  const getStatusColor = (): 'success' | 'warning' | 'error' | 'default' => {
    switch (connectionStatus) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'error':
        return 'error';
      case 'disconnected':
      default:
        return 'default';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Live';
      case 'connecting':
        return 'Connecting';
      case 'error':
        return 'Error';
      case 'disconnected':
      default:
        return 'Offline';
    }
  };

  const recentUpdateCount = recentUpdates.length;
  const hasRecentUpdates = recentUpdateCount > 0;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Connection Status Chip */}
      <Tooltip title={error || `Real-time data ${getStatusText().toLowerCase()}`}>
        <Chip
          icon={getStatusIcon()}
          label={getStatusText()}
          color={getStatusColor()}
          size="small"
          variant={isConnected ? 'filled' : 'outlined'}
        />
      </Tooltip>

      {/* Recent Updates Indicator */}
      <Tooltip title="View recent updates">
        <IconButton
          size="small"
          onClick={handleClick}
          disabled={!hasRecentUpdates}
        >
          <Badge badgeContent={recentUpdateCount} color="primary" max={99}>
            <Notifications color={hasRecentUpdates ? 'primary' : 'disabled'} />
          </Badge>
        </IconButton>
      </Tooltip>

      {/* Refresh Button */}
      <Tooltip title="Refresh data">
        <IconButton
          size="small"
          onClick={handleRefresh}
          disabled={!isConnected || !currentLocation}
        >
          <Refresh />
        </IconButton>
      </Tooltip>

      {/* Recent Updates Popover */}
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { width: 350, maxHeight: 400 },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Real-time Updates
          </Typography>
          
          {/* Connection Info */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Status: {getStatusText()}
            </Typography>
            {subscribedLocations.size > 0 && (
              <Typography variant="body2" color="text.secondary">
                Subscribed to: {Array.from(subscribedLocations).join(', ')}
              </Typography>
            )}
            {error && (
              <Typography variant="body2" color="error">
                Error: {error}
              </Typography>
            )}
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Recent Updates List */}
          {hasRecentUpdates ? (
            <List dense sx={{ maxHeight: 250, overflow: 'auto' }}>
              {recentUpdates.slice(0, 10).map((update) => (
                <ListItem key={update.id} sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {update.type === 'moon-phase' ? (
                      <Schedule color="primary" />
                    ) : (
                      <Security color="secondary" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      update.type === 'moon-phase'
                        ? `Moon phase: ${(update.data as any).phaseName?.replace('_', ' ')}`
                        : `Crime: ${(update.data as any).crimeType?.subcategory}`
                    }
                    secondary={formatDistanceToNow(update.timestamp, { addSuffix: true })}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" textAlign="center">
              No recent updates
            </Typography>
          )}

          {/* Actions */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              size="small"
              onClick={handleRefresh}
              disabled={!isConnected || !currentLocation}
              startIcon={<Refresh />}
            >
              Refresh
            </Button>
            <Button size="small" onClick={handleClose}>
              Close
            </Button>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
};

export default RealTimeStatus;