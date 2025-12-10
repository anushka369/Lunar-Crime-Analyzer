import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Grid,
  CircularProgress,
  Backdrop
} from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';
import { StatisticalSummary, CorrelationResult } from '../types/data';

interface StatisticsPanelProps {
  statistics: StatisticalSummary;
  loading?: boolean;
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ statistics, loading = false }) => {
  const formatCorrelation = (value: number): string => {
    return value.toFixed(3);
  };

  const formatPValue = (value: number): string => {
    if (value < 0.001) return '< 0.001';
    return value.toFixed(3);
  };

  const formatConfidenceInterval = (interval: [number, number]): string => {
    return `[${interval[0].toFixed(3)}, ${interval[1].toFixed(3)}]`;
  };

  const getCorrelationStrength = (coefficient: number): { label: string; color: 'success' | 'warning' | 'error' | 'default' } => {
    const abs = Math.abs(coefficient);
    if (abs >= 0.7) return { label: 'Strong', color: 'success' };
    if (abs >= 0.3) return { label: 'Moderate', color: 'warning' };
    if (abs >= 0.1) return { label: 'Weak', color: 'default' };
    return { label: 'Negligible', color: 'error' };
  };

  const getCorrelationIcon = (coefficient: number) => {
    if (coefficient > 0.1) return <TrendingUp color="success" />;
    if (coefficient < -0.1) return <TrendingDown color="error" />;
    return <TrendingFlat color="disabled" />;
  };

  const getSignificanceChip = (pValue: number) => {
    if (pValue < 0.001) return <Chip label="***" color="success" size="small" title="p < 0.001" />;
    if (pValue < 0.01) return <Chip label="**" color="success" size="small" title="p < 0.01" />;
    if (pValue < 0.05) return <Chip label="*" color="warning" size="small" title="p < 0.05" />;
    return <Chip label="n.s." color="default" size="small" title="not significant" />;
  };

  return (
    <Card sx={{ position: 'relative' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Statistical Analysis Summary
        </Typography>
        
        {/* Overall Statistics */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary">
                {formatCorrelation(statistics.overallCorrelation)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Overall Correlation
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="secondary">
                {statistics.significantCorrelations.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Significant Results
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4">
                {statistics.totalSampleSize.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total Sample Size
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4">
                {(statistics.confidenceLevel * 100).toFixed(0)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Confidence Level
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Analysis Details */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Location:</strong> {statistics.location}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Date Range:</strong> {statistics.analysisDateRange.start.toLocaleDateString()} - {statistics.analysisDateRange.end.toLocaleDateString()}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Detailed Correlations Table */}
        <Typography variant="subtitle1" gutterBottom>
          Correlation Details by Crime Type and Moon Phase
        </Typography>
        
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Crime Type</TableCell>
                <TableCell>Moon Phase</TableCell>
                <TableCell align="center">Correlation</TableCell>
                <TableCell align="center">Strength</TableCell>
                <TableCell align="center">p-value</TableCell>
                <TableCell align="center">Significance</TableCell>
                <TableCell align="center">95% CI</TableCell>
                <TableCell align="center">Sample Size</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {statistics.significantCorrelations.map((result, index) => {
                const strength = getCorrelationStrength(result.correlationCoefficient);
                return (
                  <TableRow key={index}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getCorrelationIcon(result.correlationCoefficient)}
                        <Box>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {result.crimeType.category}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {result.crimeType.subcategory}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>
                      {result.moonPhase.replace('_', ' ')}
                    </TableCell>
                    <TableCell align="center">
                      <Typography 
                        variant="body2" 
                        color={result.correlationCoefficient > 0 ? 'success.main' : 'error.main'}
                        fontWeight="bold"
                      >
                        {formatCorrelation(result.correlationCoefficient)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={strength.label} 
                        color={strength.color} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {formatPValue(result.pValue)}
                    </TableCell>
                    <TableCell align="center">
                      {getSignificanceChip(result.pValue)}
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {formatConfidenceInterval(result.confidenceInterval)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {result.sampleSize.toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {statistics.significantCorrelations.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No significant correlations found in the current dataset.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Try adjusting your filters or expanding the date range.
            </Typography>
          </Box>
        )}

        {/* Statistical Notes */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Statistical Notes:</strong><br />
            * p &lt; 0.05, ** p &lt; 0.01, *** p &lt; 0.001<br />
            Correlation strength: |r| ≥ 0.7 (Strong), 0.3-0.7 (Moderate), 0.1-0.3 (Weak), &lt;0.1 (Negligible)<br />
            Confidence intervals calculated at {(statistics.confidenceLevel * 100).toFixed(0)}% level
          </Typography>
        </Box>
      </CardContent>
      {loading && (
        <Backdrop
          sx={{
            position: 'absolute',
            color: 'primary.main',
            zIndex: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
          }}
          open={loading}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
      )}
    </Card>
  );
};

export default StatisticsPanel;