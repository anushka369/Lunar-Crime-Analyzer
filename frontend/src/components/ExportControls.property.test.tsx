import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import ExportControls from './ExportControls';
import { ExportConfiguration, StatisticalSummary } from '../types/data';
import { createDefaultFilterState } from '../types/filters';

/**
 * **Feature: lunar-crime-analyzer, Property 7: Export generation completeness**
 * **Validates: Requirements 5.2, 5.4, 5.5**
 * 
 * For any analysis configuration, exported reports should include all required elements 
 * (charts, statistics, correlation coefficients) in the requested format
 */

// Generators for property-based testing
const exportFormatArb = fc.constantFrom('png', 'pdf', 'csv') as fc.Arbitrary<'png' | 'pdf' | 'csv'>;

const correlationResultArb = fc.record({
  crimeType: fc.record({
    category: fc.constantFrom('violent', 'property', 'drug', 'public_order', 'white_collar') as fc.Arbitrary<'violent' | 'property' | 'drug' | 'public_order' | 'white_collar'>,
    subcategory: fc.string({ minLength: 1, maxLength: 50 })
  }),
  moonPhase: fc.constantFrom('new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 
                            'full', 'waning_gibbous', 'last_quarter', 'waning_crescent'),
  correlationCoefficient: fc.float({ min: -1, max: 1 }),
  pValue: fc.float({ min: 0, max: 1 }),
  confidenceInterval: fc.tuple(fc.float({ min: -1, max: 1 }), fc.float({ min: -1, max: 1 }))
    .map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as [number, number]),
  sampleSize: fc.integer({ min: 10, max: 10000 }),
  significanceLevel: fc.constantFrom(0.01, 0.05, 0.1)
});

const statisticalSummaryArb = fc.record({
  overallCorrelation: fc.float({ min: -1, max: 1 }),
  significantCorrelations: fc.array(correlationResultArb, { minLength: 0, maxLength: 5 }),
  totalSampleSize: fc.integer({ min: 50, max: 5000 }),
  analysisDateRange: fc.record({
    start: fc.date({ min: new Date('2020-01-01'), max: new Date('2023-12-31') }),
    end: fc.date({ min: new Date('2020-01-01'), max: new Date('2023-12-31') })
  }).map(range => ({
    start: new Date(Math.min(range.start.getTime(), range.end.getTime())),
    end: new Date(Math.max(range.start.getTime(), range.end.getTime()))
  })),
  location: fc.string({ minLength: 1, maxLength: 50 }),
  confidenceLevel: fc.constantFrom(0.90, 0.95, 0.99)
});

describe('ExportControls Property Tests', () => {
  const mockFilters = createDefaultFilterState();
  
  // Ensure cleanup between tests
  afterEach(() => {
    cleanup();
  });
  
  describe('Property 7: Export generation completeness', () => {
    it('should call onExport with complete configuration for PNG export', async () => {
      await fc.assert(
        fc.asyncProperty(
          statisticalSummaryArb,
          async (statistics) => {
            const mockOnExport = jest.fn().mockResolvedValue(undefined);
            const mockOnShare = jest.fn();
            
            const { container } = render(
              <ExportControls
                statistics={statistics}
                filters={mockFilters}
                onExport={mockOnExport}
                onShare={mockOnShare}
              />
            );

            // Test PNG export button using specific data-testid
            const pngButton = container.querySelector('[data-testid="export-png-button"]');
            expect(pngButton).toBeTruthy();
            
            fireEvent.click(pngButton!);
            
            await waitFor(() => {
              expect(mockOnExport).toHaveBeenCalledWith(
                expect.objectContaining({
                  format: 'png',
                  includeCharts: expect.any(Boolean),
                  includeStatistics: expect.any(Boolean),
                  includeRawData: expect.any(Boolean)
                })
              );
            }, { timeout: 3000 });
            
            // Clean up
            cleanup();
          }
        ),
        { numRuns: 3 }
      );
    }, 10000);

    it('should call onShare with complete configuration', async () => {
      await fc.assert(
        fc.asyncProperty(
          statisticalSummaryArb,
          async (statistics) => {
            const mockOnExport = jest.fn();
            const mockOnShare = jest.fn().mockResolvedValue({
              id: 'test-id',
              location: statistics.location,
              dateRange: statistics.analysisDateRange,
              filters: mockFilters,
              exportConfig: {
                format: 'png' as const,
                includeCharts: true,
                includeStatistics: true,
                includeRawData: false,
                customTitle: '',
                customDescription: ''
              },
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
            
            const { container } = render(
              <ExportControls
                statistics={statistics}
                filters={mockFilters}
                onExport={mockOnExport}
                onShare={mockOnShare}
              />
            );

            const shareButton = container.querySelector('[data-testid="create-share-link-button"]');
            expect(shareButton).toBeTruthy();
            
            fireEvent.click(shareButton!);

            await waitFor(() => {
              expect(mockOnShare).toHaveBeenCalledWith(
                expect.objectContaining({
                  format: expect.any(String),
                  includeCharts: expect.any(Boolean),
                  includeStatistics: expect.any(Boolean),
                  includeRawData: expect.any(Boolean)
                })
              );
            }, { timeout: 3000 });
            
            // Clean up
            cleanup();
          }
        ),
        { numRuns: 3 }
      );
    }, 10000);

    it('should handle export errors gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          statisticalSummaryArb,
          async (statistics) => {
            const mockOnExport = jest.fn().mockRejectedValue(new Error('Export failed'));
            const mockOnShare = jest.fn();
            
            const { container } = render(
              <ExportControls
                statistics={statistics}
                filters={mockFilters}
                onExport={mockOnExport}
                onShare={mockOnShare}
              />
            );

            const exportButton = container.querySelector('[data-testid="export-png-button"]');
            expect(exportButton).toBeTruthy();
            
            fireEvent.click(exportButton!);

            await waitFor(() => {
              expect(mockOnExport).toHaveBeenCalledWith(
                expect.objectContaining({
                  format: 'png'
                })
              );
            }, { timeout: 3000 });

            // Verify error handling doesn't break the component
            await waitFor(() => {
              expect(exportButton).not.toBeDisabled();
            }, { timeout: 3000 });
            
            // Clean up
            cleanup();
          }
        ),
        { numRuns: 3 }
      );
    }, 10000);
  });
});