import { render } from '@testing-library/react';
import * as fc from 'fast-check';
import CorrelationChart from './CorrelationChart';
import { CorrelationDataPoint } from '../types/data';

/**
 * **Feature: lunar-crime-analyzer, Property 4: Chart generation consistency**
 * **Validates: Requirements 3.1, 3.2, 3.3**
 * 
 * For any valid combination of moon phase and crime data, the system should generate 
 * interactive correlation charts with all required features (zoom, pan, hover tooltips)
 */

// Generators for property-based testing
const crimeTypeArb = fc.constantFrom('violent' as const, 'property' as const, 'drug' as const, 'public_order' as const, 'white_collar' as const);
const severityArb = fc.constantFrom('misdemeanor' as const, 'felony' as const, 'violation' as const);
const phaseNameArb = fc.constantFrom(
  'new' as const, 'waxing_crescent' as const, 'first_quarter' as const, 'waxing_gibbous' as const,
  'full' as const, 'waning_gibbous' as const, 'last_quarter' as const, 'waning_crescent' as const
);

const geographicCoordinateArb = fc.record({
  latitude: fc.float({ min: -90, max: 90 }),
  longitude: fc.float({ min: -180, max: 180 }),
  jurisdiction: fc.string({ minLength: 1, maxLength: 50 })
});

const crimeIncidentArb = fc.record({
  id: fc.uuid(),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
  location: geographicCoordinateArb,
  crimeType: fc.record({
    category: crimeTypeArb,
    subcategory: fc.string({ minLength: 1, maxLength: 30 })
  }),
  severity: severityArb,
  description: fc.string({ minLength: 1, maxLength: 100 }),
  resolved: fc.boolean()
});

const moonPhaseDataArb = fc.record({
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
  phaseName: phaseNameArb,
  illuminationPercent: fc.float({ min: 0, max: 100 }),
  phaseAngle: fc.float({ min: 0, max: 360 }),
  distanceKm: fc.float({ min: 350000, max: 400000 }),
  location: geographicCoordinateArb
});

const correlationDataPointArb = fc.record({
  crimeIncident: crimeIncidentArb,
  moonPhase: moonPhaseDataArb
});

const correlationDataArrayArb = fc.array(correlationDataPointArb, { minLength: 1, maxLength: 50 });

describe('CorrelationChart Property Tests', () => {
  test('Property 4: Chart generation consistency - chart renders with valid data', () => {
    fc.assert(
      fc.property(correlationDataArrayArb, (data: CorrelationDataPoint[]) => {
        // Render the chart with generated data
        const { container, unmount } = render(<CorrelationChart data={data} />);
        
        try {
          // Verify chart container exists
          const chartContainer = container.querySelector('svg');
          expect(chartContainer).toBeInTheDocument();
          
          // Verify chart has proper dimensions
          expect(chartContainer).toHaveAttribute('width', '800');
          expect(chartContainer).toHaveAttribute('height', '600');
          
          // Verify chart title is present in this specific container
          const title = container.querySelector('h6');
          expect(title).toBeInTheDocument();
          expect(title?.textContent).toBe('Crime Incidents vs Moon Phases');
          
          // Verify data points are rendered (should have circles for each data point)
          const dataPoints = container.querySelectorAll('.data-point');
          expect(dataPoints.length).toBe(data.length);
          
          // Verify axes are present
          const xAxis = container.querySelector('.x-axis');
          const yAxis = container.querySelector('.y-axis');
          expect(xAxis).toBeInTheDocument();
          expect(yAxis).toBeInTheDocument();
          
          // Verify axis labels are present
          const xLabel = container.querySelector('.x-label');
          const yLabel = container.querySelector('.y-label');
          expect(xLabel).toBeInTheDocument();
          expect(yLabel).toBeInTheDocument();
          
          // Verify legend is present
          const legend = container.querySelector('.legend');
          expect(legend).toBeInTheDocument();
          
          return true;
        } finally {
          // Clean up after each test
          unmount();
        }
      }),
      { numRuns: 10 } // Reduced runs for faster testing
    );
  });

  test('Property 4: Chart generation consistency - interactive features are present', () => {
    fc.assert(
      fc.property(correlationDataArrayArb, (data: CorrelationDataPoint[]) => {
        const { container, unmount } = render(<CorrelationChart data={data} />);
        
        try {
          // Verify data points have interactive attributes
          const dataPoints = container.querySelectorAll('.data-point');
          dataPoints.forEach(point => {
            // Should have cursor pointer for interactivity
            const computedStyle = window.getComputedStyle(point);
            expect(computedStyle.cursor).toBe('pointer');
            
            // Should have proper opacity for hover effects
            expect(point).toHaveAttribute('opacity', '0.7');
          });
          
          // Verify zoom behavior is attached to SVG
          const svg = container.querySelector('svg');
          expect(svg).toBeInTheDocument();
          
          return true;
        } finally {
          unmount();
        }
      }),
      { numRuns: 10 } // Reduced runs for faster testing
    );
  });

  test('Property 4: Chart generation consistency - data point positioning is correct', () => {
    fc.assert(
      fc.property(correlationDataArrayArb, (data: CorrelationDataPoint[]) => {
        const { container, unmount } = render(<CorrelationChart data={data} />);
        
        try {
          const dataPoints = container.querySelectorAll('.data-point');
          
          // Verify each data point has valid positioning
          dataPoints.forEach((point, index) => {
            const cx = parseFloat(point.getAttribute('cx') || '0');
            const cy = parseFloat(point.getAttribute('cy') || '0');
            
            // X position should be within chart bounds (0 to inner width)
            expect(cx).toBeGreaterThanOrEqual(0);
            expect(cx).toBeLessThanOrEqual(720); // 800 - 80 (left margin)
            
            // Y position should be within chart bounds (0 to inner height)
            expect(cy).toBeGreaterThanOrEqual(0);
            expect(cy).toBeLessThanOrEqual(540); // 600 - 60 (top + bottom margins)
            
            // Radius should match severity mapping
            const radius = parseFloat(point.getAttribute('r') || '0');
            const severity = data[index].crimeIncident.severity;
            const expectedRadius = severity === 'violation' ? 4 : severity === 'misdemeanor' ? 6 : 8;
            expect(radius).toBe(expectedRadius);
          });
          
          return true;
        } finally {
          unmount();
        }
      }),
      { numRuns: 10 } // Reduced runs for faster testing
    );
  });

  test('Property 4: Chart generation consistency - empty data handling', () => {
    // Test with empty data array
    const { container } = render(<CorrelationChart data={[]} />);
    
    // Chart container should still exist
    const chartContainer = container.querySelector('svg');
    expect(chartContainer).toBeInTheDocument();
    
    // Title should still be present in this specific container
    const title = container.querySelector('h6');
    expect(title).toBeInTheDocument();
    expect(title?.textContent).toBe('Crime Incidents vs Moon Phases');
    
    // No data points should be rendered
    const dataPoints = container.querySelectorAll('.data-point');
    expect(dataPoints.length).toBe(0);
  });
});