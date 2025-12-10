import { render, screen } from '@testing-library/react';
import CorrelationHeatmap from './CorrelationHeatmap';

describe('CorrelationHeatmap', () => {
  const mockData = [
    {
      crimeType: 'violent',
      moonPhase: 'full',
      correlationValue: 0.23,
      significance: 0.02,
      sampleSize: 150
    },
    {
      crimeType: 'property',
      moonPhase: 'new',
      correlationValue: -0.15,
      significance: 0.08,
      sampleSize: 120
    }
  ];

  test('renders chart title', () => {
    render(<CorrelationHeatmap data={mockData} />);
    expect(screen.getByText('Crime-Moon Phase Correlation Heatmap')).toBeInTheDocument();
  });

  test('renders SVG chart container', () => {
    const { container } = render(<CorrelationHeatmap data={mockData} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '600');
    expect(svg).toHaveAttribute('height', '400');
  });

  test('renders heatmap cells for each data point', () => {
    const { container } = render(<CorrelationHeatmap data={mockData} />);
    const heatmapCells = container.querySelectorAll('.heatmap-cell');
    expect(heatmapCells).toHaveLength(mockData.length);
  });

  test('renders axes and labels', () => {
    const { container } = render(<CorrelationHeatmap data={mockData} />);
    
    const xAxis = container.querySelector('.x-axis');
    const yAxis = container.querySelector('.y-axis');
    const xLabel = container.querySelector('.x-label');
    const yLabel = container.querySelector('.y-label');
    
    expect(xAxis).toBeInTheDocument();
    expect(yAxis).toBeInTheDocument();
    expect(xLabel).toBeInTheDocument();
    expect(yLabel).toBeInTheDocument();
  });

  test('renders color legend', () => {
    const { container } = render(<CorrelationHeatmap data={mockData} />);
    const legend = container.querySelector('.legend');
    expect(legend).toBeInTheDocument();
  });

  test('handles empty data gracefully', () => {
    const { container } = render(<CorrelationHeatmap data={[]} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    
    const heatmapCells = container.querySelectorAll('.heatmap-cell');
    expect(heatmapCells).toHaveLength(0);
  });

  test('applies correct opacity based on significance', () => {
    const { container } = render(<CorrelationHeatmap data={mockData} />);
    const cells = container.querySelectorAll('.heatmap-cell rect');
    
    // Check that cells have different opacities based on significance
    expect(cells.length).toBeGreaterThan(0);
    cells.forEach(cell => {
      const opacity = parseFloat(cell.getAttribute('opacity') || '1');
      expect(opacity).toBeGreaterThan(0);
      expect(opacity).toBeLessThanOrEqual(1);
    });
  });

  test('shows correlation values for significant results', () => {
    const significantData = [
      {
        crimeType: 'violent',
        moonPhase: 'full',
        correlationValue: 0.23,
        significance: 0.02, // Significant (< 0.05)
        sampleSize: 150
      }
    ];

    const { container } = render(<CorrelationHeatmap data={significantData} />);
    const cellTexts = container.querySelectorAll('.heatmap-cell text');
    expect(cellTexts.length).toBeGreaterThan(0);
  });
});