import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExportControls from './ExportControls';
import { StatisticalSummary, ExportConfiguration, ShareableAnalysis } from '../types/data';
import { createDefaultFilterState } from '../types/filters';

describe('ExportControls', () => {
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
      }
    ],
    totalSampleSize: 150,
    analysisDateRange: {
      start: new Date('2023-01-01'),
      end: new Date('2023-01-31')
    },
    location: 'New York City, NY',
    confidenceLevel: 0.95
  };

  const mockFilters = createDefaultFilterState();
  const mockOnExport = jest.fn();
  const mockOnShare = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render export buttons', () => {
    render(
      <ExportControls
        statistics={mockStatistics}
        filters={mockFilters}
        onExport={mockOnExport}
        onShare={mockOnShare}
      />
    );

    expect(screen.getByRole('button', { name: /png image/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pdf report/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /csv data/i })).toBeInTheDocument();
  });

  it('should render share button', () => {
    render(
      <ExportControls
        statistics={mockStatistics}
        filters={mockFilters}
        onExport={mockOnExport}
        onShare={mockOnShare}
      />
    );

    expect(screen.getByRole('button', { name: /create shareable link/i })).toBeInTheDocument();
  });

  it('should call onExport with PNG format when PNG button is clicked', async () => {
    mockOnExport.mockResolvedValue(undefined);
    
    render(
      <ExportControls
        statistics={mockStatistics}
        filters={mockFilters}
        onExport={mockOnExport}
        onShare={mockOnShare}
      />
    );

    const pngButton = screen.getByRole('button', { name: /png image/i });
    fireEvent.click(pngButton);

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'png',
          includeCharts: true,
          includeStatistics: true,
          includeRawData: false
        })
      );
    });
  });

  it('should call onExport with PDF format when PDF button is clicked', async () => {
    mockOnExport.mockResolvedValue(undefined);
    
    render(
      <ExportControls
        statistics={mockStatistics}
        filters={mockFilters}
        onExport={mockOnExport}
        onShare={mockOnShare}
      />
    );

    const pdfButton = screen.getByRole('button', { name: /pdf report/i });
    fireEvent.click(pdfButton);

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'pdf',
          includeCharts: true,
          includeStatistics: true,
          includeRawData: false
        })
      );
    });
  });

  it('should call onExport with CSV format when CSV button is clicked', async () => {
    mockOnExport.mockResolvedValue(undefined);
    
    render(
      <ExportControls
        statistics={mockStatistics}
        filters={mockFilters}
        onExport={mockOnExport}
        onShare={mockOnShare}
      />
    );

    const csvButton = screen.getByRole('button', { name: /csv data/i });
    fireEvent.click(csvButton);

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'csv',
          includeCharts: true,
          includeStatistics: true,
          includeRawData: false
        })
      );
    });
  });

  it('should open customization dialog when customize button is clicked', async () => {
    render(
      <ExportControls
        statistics={mockStatistics}
        filters={mockFilters}
        onExport={mockOnExport}
        onShare={mockOnShare}
      />
    );

    const customizeButton = screen.getByRole('button', { name: /customize export/i });
    fireEvent.click(customizeButton);

    await waitFor(() => {
      expect(screen.getByText('Customize Export Settings')).toBeInTheDocument();
    });
  });

  it('should update export configuration in customization dialog', async () => {
    mockOnExport.mockResolvedValue(undefined);
    
    render(
      <ExportControls
        statistics={mockStatistics}
        filters={mockFilters}
        onExport={mockOnExport}
        onShare={mockOnShare}
      />
    );

    // Open customization dialog
    const customizeButton = screen.getByRole('button', { name: /customize export/i });
    fireEvent.click(customizeButton);

    // Toggle raw data checkbox
    const rawDataCheckbox = screen.getByRole('checkbox', { name: /raw data/i });
    fireEvent.click(rawDataCheckbox);

    // Add custom title
    const titleInput = screen.getByLabelText(/custom title/i);
    await userEvent.type(titleInput, 'Custom Analysis Title');

    // Apply settings
    const applyButton = screen.getByRole('button', { name: /apply settings/i });
    fireEvent.click(applyButton);

    // Wait for dialog to close
    await waitFor(() => {
      expect(screen.queryByText('Customize Export Settings')).not.toBeInTheDocument();
    });

    // Export with new settings
    const pngButton = screen.getByRole('button', { name: /png image/i });
    fireEvent.click(pngButton);

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'png',
          includeRawData: true,
          customTitle: 'Custom Analysis Title'
        })
      );
    });
  });

  it('should call onShare when share button is clicked', async () => {
    const mockShareResult: ShareableAnalysis = {
      id: 'test-share-id',
      location: mockStatistics.location,
      dateRange: mockStatistics.analysisDateRange,
      filters: mockFilters,
      exportConfig: {
        format: 'png',
        includeCharts: true,
        includeStatistics: true,
        includeRawData: false,
        customTitle: '',
        customDescription: ''
      },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };

    mockOnShare.mockResolvedValue(mockShareResult);
    
    render(
      <ExportControls
        statistics={mockStatistics}
        filters={mockFilters}
        onExport={mockOnExport}
        onShare={mockOnShare}
      />
    );

    const shareButton = screen.getByRole('button', { name: /create shareable link/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(mockOnShare).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'png',
          includeCharts: true,
          includeStatistics: true,
          includeRawData: false
        })
      );
    });
  });

  it('should display share dialog after successful share', async () => {
    const mockShareResult: ShareableAnalysis = {
      id: 'test-share-id',
      location: mockStatistics.location,
      dateRange: mockStatistics.analysisDateRange,
      filters: mockFilters,
      exportConfig: {
        format: 'png',
        includeCharts: true,
        includeStatistics: true,
        includeRawData: false,
        customTitle: '',
        customDescription: ''
      },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };

    mockOnShare.mockResolvedValue(mockShareResult);
    
    render(
      <ExportControls
        statistics={mockStatistics}
        filters={mockFilters}
        onExport={mockOnExport}
        onShare={mockOnShare}
      />
    );

    const shareButton = screen.getByRole('button', { name: /create shareable link/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(screen.getByText('Analysis Shared Successfully')).toBeInTheDocument();
      expect(screen.getByText(/test-share-id/)).toBeInTheDocument();
    });
  });

  it('should display error message when export fails', async () => {
    mockOnExport.mockRejectedValue(new Error('Export service unavailable'));
    
    render(
      <ExportControls
        statistics={mockStatistics}
        filters={mockFilters}
        onExport={mockOnExport}
        onShare={mockOnShare}
      />
    );

    const pngButton = screen.getByRole('button', { name: /png image/i });
    fireEvent.click(pngButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to export/)).toBeInTheDocument();
    });
  });

  it('should display error message when share fails', async () => {
    mockOnShare.mockRejectedValue(new Error('Share service unavailable'));
    
    render(
      <ExportControls
        statistics={mockStatistics}
        filters={mockFilters}
        onExport={mockOnExport}
        onShare={mockOnShare}
      />
    );

    const shareButton = screen.getByRole('button', { name: /create shareable link/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to create shareable link/)).toBeInTheDocument();
    });
  });

  it('should display export size estimate', () => {
    render(
      <ExportControls
        statistics={mockStatistics}
        filters={mockFilters}
        onExport={mockOnExport}
        onShare={mockOnShare}
      />
    );

    expect(screen.getByText(/Est\. size:/)).toBeInTheDocument();
  });

  it('should display current configuration summary', () => {
    render(
      <ExportControls
        statistics={mockStatistics}
        filters={mockFilters}
        onExport={mockOnExport}
        onShare={mockOnShare}
      />
    );

    expect(screen.getByText('Current Export Configuration:')).toBeInTheDocument();
    expect(screen.getByText('Charts')).toBeInTheDocument();
    expect(screen.getByText('Statistics')).toBeInTheDocument();
  });

  it('should disable buttons during export', async () => {
    // Mock a slow export
    mockOnExport.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(
      <ExportControls
        statistics={mockStatistics}
        filters={mockFilters}
        onExport={mockOnExport}
        onShare={mockOnShare}
      />
    );

    const pngButton = screen.getByRole('button', { name: /png image/i });
    fireEvent.click(pngButton);

    // Button should be disabled during export
    expect(pngButton).toBeDisabled();

    // Wait for export to complete
    await waitFor(() => {
      expect(pngButton).not.toBeDisabled();
    });
  });

  it('should show loading state during share', async () => {
    // Mock a slow share
    mockOnShare.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(
      <ExportControls
        statistics={mockStatistics}
        filters={mockFilters}
        onExport={mockOnExport}
        onShare={mockOnShare}
      />
    );

    const shareButton = screen.getByRole('button', { name: /create shareable link/i });
    fireEvent.click(shareButton);

    // Button should show loading state
    await waitFor(() => {
      expect(screen.getByText('Creating Share Link...')).toBeInTheDocument();
    });
    expect(shareButton).toBeDisabled();
  }, 10000);
});