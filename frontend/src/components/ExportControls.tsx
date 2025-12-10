import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  ButtonGroup,
  FormControlLabel,
  Checkbox,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  CircularProgress,
  Snackbar,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Download,
  Share,
  PictureAsPdf,
  Image,
  TableChart,
  ContentCopy,
  Settings
} from '@mui/icons-material';
import { ExportConfiguration, ShareableAnalysis, StatisticalSummary } from '../types/data';
import { FilterState } from '../types/filters';

interface ExportControlsProps {
  statistics: StatisticalSummary;
  filters: FilterState;
  onExport: (config: ExportConfiguration) => Promise<void>;
  onShare: (config: ExportConfiguration) => Promise<ShareableAnalysis>;
  disabled?: boolean;
  isExporting?: boolean;
  isSharing?: boolean;
}

const ExportControls: React.FC<ExportControlsProps> = ({
  statistics,
  filters,
  onExport,
  onShare,
  disabled = false,
  isExporting: externalIsExporting = false,
  isSharing: externalIsSharing = false,
}) => {
  const [exportConfig, setExportConfig] = useState<ExportConfiguration>({
    format: 'png',
    includeCharts: true,
    includeStatistics: true,
    includeRawData: false,
    customTitle: '',
    customDescription: ''
  });

  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  // Use external loading states if provided
  const actualIsExporting = externalIsExporting || isExporting;
  const actualIsSharing = externalIsSharing || isSharing;
  const [shareResult, setShareResult] = useState<ShareableAnalysis | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleExport = async (format: 'png' | 'pdf' | 'csv') => {
    setIsExporting(true);
    try {
      const config = { ...exportConfig, format };
      await onExport(config);
      setSnackbar({
        open: true,
        message: `Successfully exported as ${format.toUpperCase()}`,
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to export: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const result = await onShare(exportConfig);
      setShareResult(result);
      setShowShareDialog(true);
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to create shareable link: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyShareLink = () => {
    if (shareResult) {
      const shareUrl = `${window.location.origin}/shared/${shareResult.id}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        setSnackbar({
          open: true,
          message: 'Share link copied to clipboard',
          severity: 'success'
        });
      });
    }
  };

  const getExportSizeEstimate = (): string => {
    let size = 0;
    if (exportConfig.includeCharts) size += 2; // ~2MB for charts
    if (exportConfig.includeStatistics) size += 0.1; // ~100KB for statistics
    if (exportConfig.includeRawData) size += statistics.totalSampleSize * 0.001; // ~1KB per record
    
    if (size < 1) return `~${Math.round(size * 1000)}KB`;
    return `~${size.toFixed(1)}MB`;
  };

  const formatExportTitle = (): string => {
    if (exportConfig.customTitle) return exportConfig.customTitle;
    return `Lunar Crime Analysis - ${statistics.location}`;
  };

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Export & Share Analysis
          </Typography>
          
          {/* Quick Export Buttons */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Quick Export
            </Typography>
            <ButtonGroup variant="outlined" sx={{ mb: 1 }}>
              <Button
                startIcon={<Image />}
                onClick={() => handleExport('png')}
                disabled={isExporting}
              >
                PNG Image
              </Button>
              <Button
                startIcon={<PictureAsPdf />}
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
              >
                PDF Report
              </Button>
              <Button
                startIcon={<TableChart />}
                onClick={() => handleExport('csv')}
                disabled={isExporting}
              >
                CSV Data
              </Button>
            </ButtonGroup>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Settings />}
                onClick={() => setShowCustomizeDialog(true)}
                size="small"
              >
                Customize Export
              </Button>
              <Chip 
                label={`Est. size: ${getExportSizeEstimate()}`} 
                size="small" 
                variant="outlined" 
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Share Analysis */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Share Analysis
            </Typography>
            <Button
              variant="contained"
              startIcon={isSharing ? <CircularProgress size={16} /> : <Share />}
              onClick={handleShare}
              disabled={isSharing}
              fullWidth
            >
              {isSharing ? 'Creating Share Link...' : 'Create Shareable Link'}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Generate a link to share this analysis configuration with others
            </Typography>
          </Box>

          {/* Current Configuration Summary */}
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              <strong>Current Export Configuration:</strong>
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {exportConfig.includeCharts && <Chip label="Charts" size="small" />}
              {exportConfig.includeStatistics && <Chip label="Statistics" size="small" />}
              {exportConfig.includeRawData && <Chip label="Raw Data" size="small" />}
              {exportConfig.customTitle && <Chip label="Custom Title" size="small" />}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Customize Export Dialog */}
      <Dialog 
        open={showCustomizeDialog} 
        onClose={() => setShowCustomizeDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Customize Export Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="subtitle2">Include in Export:</Typography>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={exportConfig.includeCharts}
                  onChange={(e) => setExportConfig(prev => ({ 
                    ...prev, 
                    includeCharts: e.target.checked 
                  }))}
                />
              }
              label="Visualization Charts"
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={exportConfig.includeStatistics}
                  onChange={(e) => setExportConfig(prev => ({ 
                    ...prev, 
                    includeStatistics: e.target.checked 
                  }))}
                />
              }
              label="Statistical Summary"
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={exportConfig.includeRawData}
                  onChange={(e) => setExportConfig(prev => ({ 
                    ...prev, 
                    includeRawData: e.target.checked 
                  }))}
                />
              }
              label="Raw Data (CSV format)"
            />

            <TextField
              label="Custom Title"
              value={exportConfig.customTitle}
              onChange={(e) => setExportConfig(prev => ({ 
                ...prev, 
                customTitle: e.target.value 
              }))}
              placeholder={formatExportTitle()}
              fullWidth
              size="small"
            />

            <TextField
              label="Custom Description"
              value={exportConfig.customDescription}
              onChange={(e) => setExportConfig(prev => ({ 
                ...prev, 
                customDescription: e.target.value 
              }))}
              multiline
              rows={3}
              fullWidth
              size="small"
              placeholder="Add a description for this analysis..."
            />

            <Alert severity="info" sx={{ mt: 1 }}>
              Estimated export size: {getExportSizeEstimate()}
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCustomizeDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => setShowCustomizeDialog(false)} 
            variant="contained"
          >
            Apply Settings
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Result Dialog */}
      <Dialog 
        open={showShareDialog} 
        onClose={() => setShowShareDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Analysis Shared Successfully</DialogTitle>
        <DialogContent>
          {shareResult && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="success">
                Your analysis has been saved and is ready to share!
              </Alert>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Share Link:
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  p: 1,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'grey.300'
                }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      flex: 1, 
                      fontFamily: 'monospace',
                      wordBreak: 'break-all'
                    }}
                  >
                    {`${window.location.origin}/shared/${shareResult.id}`}
                  </Typography>
                  <Tooltip title="Copy to clipboard">
                    <IconButton 
                      size="small" 
                      onClick={handleCopyShareLink}
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  <strong>Analysis Details:</strong><br />
                  Location: {shareResult.location}<br />
                  Date Range: {shareResult.dateRange.start.toLocaleDateString()} - {shareResult.dateRange.end.toLocaleDateString()}<br />
                  Created: {shareResult.createdAt.toLocaleString()}
                  {shareResult.expiresAt && (
                    <>
                      <br />
                      Expires: {shareResult.expiresAt.toLocaleString()}
                    </>
                  )}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCopyShareLink} startIcon={<ContentCopy />}>
            Copy Link
          </Button>
          <Button 
            onClick={() => setShowShareDialog(false)} 
            variant="contained"
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ExportControls;