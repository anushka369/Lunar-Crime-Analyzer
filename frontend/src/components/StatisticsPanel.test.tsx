import { render, screen } from '@testing-library/react';
import StatisticsPanel from './StatisticsPanel';
import { StatisticalSummary } from '../types/data';

describe('StatisticsPanel', () => {
  const mockStatistics: StatisticalSummary = {
    overallCorrelation: 0.23,
    significantCorrelations: [
      {
        crimeType: { category: 'violent', subcategory: 'assault' },
        moonPhase: 'full',
        correlationCoefficient: 0.31,
        pValue: 0.002,
        confidenceInterval: [0.15, 0.47],
        sampleSize: 150,
        significanceLevel: 0.05
      },
      {
        crimeType: { category: 'property', subcategory: 'theft' },
        moonPhase: 'new',
        correlationCoefficient: -0.18,
        pValue: 0.045,
        confidenceInterval: [-0.35, -0.01],
        sampleSize: 200,
        significanceLevel: 0.05
      }
    ],
    totalSampleSize: 350,
    analysisDateRange: {
      start: new Date('2023-01-01'),
      end: new Date('2023-01-31')
    },
    location: 'New York City, NY',
    confidenceLevel: 0.95
  };

  it('should display overall correlation coefficient', () => {
    render(<StatisticsPanel statistics={mockStatistics} />);
    
    expect(screen.getByText('0.230')).toBeInTheDocument();
    expect(screen.getByText('Overall Correlation')).toBeInTheDocument();
  });

  it('should display number of significant correlations', () => {
    render(<StatisticsPanel statistics={mockStatistics} />);
    
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Significant Results')).toBeInTheDocument();
  });

  it('should display total sample size', () => {
    render(<StatisticsPanel statistics={mockStatistics} />);
    
    expect(screen.getByText('350')).toBeInTheDocument();
    expect(screen.getByText('Total Sample Size')).toBeInTheDocument();
  });

  it('should display confidence level', () => {
    render(<StatisticsPanel statistics={mockStatistics} />);
    
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('Confidence Level')).toBeInTheDocument();
  });

  it('should display location and date range', () => {
    render(<StatisticsPanel statistics={mockStatistics} />);
    
    expect(screen.getByText(/New York City, NY/)).toBeInTheDocument();
    expect(screen.getByText(/1\/1\/2023 - 1\/31\/2023/)).toBeInTheDocument();
  });

  it('should display correlation details table', () => {
    render(<StatisticsPanel statistics={mockStatistics} />);
    
    // Check table headers
    expect(screen.getByText('Crime Type')).toBeInTheDocument();
    expect(screen.getByText('Moon Phase')).toBeInTheDocument();
    expect(screen.getByText('Correlation')).toBeInTheDocument();
    expect(screen.getByText('p-value')).toBeInTheDocument();
    expect(screen.getByText('95% CI')).toBeInTheDocument();
    expect(screen.getByText('Sample Size')).toBeInTheDocument();
    
    // Check correlation data
    expect(screen.getByText('0.310')).toBeInTheDocument();
    expect(screen.getByText('-0.180')).toBeInTheDocument();
    expect(screen.getByText('0.002')).toBeInTheDocument();
    expect(screen.getByText('0.045')).toBeInTheDocument();
  });

  it('should display significance indicators correctly', () => {
    render(<StatisticsPanel statistics={mockStatistics} />);
    
    // Check for significance chips
    const significantChips = screen.getAllByTitle(/p < 0.01/);
    expect(significantChips).toHaveLength(1);
    
    const moderateChips = screen.getAllByTitle(/p < 0.05/);
    expect(moderateChips).toHaveLength(1);
  });

  it('should display correlation strength labels', () => {
    render(<StatisticsPanel statistics={mockStatistics} />);
    
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('should format confidence intervals correctly', () => {
    render(<StatisticsPanel statistics={mockStatistics} />);
    
    expect(screen.getByText('[0.150, 0.470]')).toBeInTheDocument();
    expect(screen.getByText('[-0.350, -0.010]')).toBeInTheDocument();
  });

  it('should display empty state when no significant correlations', () => {
    const emptyStatistics: StatisticalSummary = {
      ...mockStatistics,
      significantCorrelations: []
    };
    
    render(<StatisticsPanel statistics={emptyStatistics} />);
    
    expect(screen.getByText(/No significant correlations found/)).toBeInTheDocument();
    expect(screen.getByText(/Try adjusting your filters/)).toBeInTheDocument();
  });

  it('should handle very small p-values correctly', () => {
    const statisticsWithSmallPValue: StatisticalSummary = {
      ...mockStatistics,
      significantCorrelations: [
        {
          crimeType: { category: 'violent', subcategory: 'assault' },
          moonPhase: 'full',
          correlationCoefficient: 0.85,
          pValue: 0.0001,
          confidenceInterval: [0.70, 1.00],
          sampleSize: 500,
          significanceLevel: 0.05
        }
      ]
    };
    
    render(<StatisticsPanel statistics={statisticsWithSmallPValue} />);
    
    expect(screen.getByText('< 0.001')).toBeInTheDocument();
  });

  it('should display crime type categories correctly', () => {
    render(<StatisticsPanel statistics={mockStatistics} />);
    
    expect(screen.getByText('Violent')).toBeInTheDocument();
    expect(screen.getByText('assault')).toBeInTheDocument();
    expect(screen.getByText('Property')).toBeInTheDocument();
    expect(screen.getByText('theft')).toBeInTheDocument();
  });

  it('should format moon phases correctly', () => {
    render(<StatisticsPanel statistics={mockStatistics} />);
    
    expect(screen.getByText('full')).toBeInTheDocument();
    expect(screen.getByText('new')).toBeInTheDocument();
  });
});