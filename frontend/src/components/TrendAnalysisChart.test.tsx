import { render, screen } from '@testing-library/react';
import TrendAnalysisChart from './TrendAnalysisChart';

describe('TrendAnalysisChart', () => {
  const mockData = [
    {
      date: new Date('2023-01-01'),
      moonPhase: 'new',
      crimeCount: 15,
      significance: 0.03,
      confidenceInterval: [12, 18] as [number, number]
    },
    {
      date: new Date('2023-01-15'),
      moonPhase: 'full',
      crimeCount: 35,
      significance: 0.001,
      confidenceInterval: [30, 40] as [number, number]
    }
  ];

  test('renders chart title', () => {
    render(<TrendAnalysisChart data={mockData} />);
    expect(screen.getByText('Crime Frequency Trends by Moon Phase')).toBeInTheDocument();
  });

  test('renders SVG chart container', () => {
    const { container } = render(<TrendAnalysisChart data={mockData} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '800');
    expect(svg).toHaveAttribute('height', '400');
  });

  test('renders trend lines for moon phases', () => {
    const { container } = render(<TrendAnalysisChart data={mockData} />);
    const trendLines = container.querySelectorAll('[class*="trend-line-"]');
    expect(trendLines.length).toBeGreaterThan(0);
  });

  test('renders confidence interval areas', () => {
    const { container } = render(<TrendAnalysisChart data={mockData} />);
    const confidenceAreas = container.querySelectorAll('[class*="confidence-area-"]');
    expect(confidenceAreas.length).toBeGreaterThan(0);
  });

  test('renders data points', () => {
    const { container } = render(<TrendAnalysisChart data={mockData} />);
    const dataPoints = container.querySelectorAll('[class*="data-point-"]');
    expect(dataPoints.length).toBeGreaterThan(0);
  });

  test('renders axes and labels', () => {
    const { container } = render(<TrendAnalysisChart data={mockData} />);
    
    const xAxis = container.querySelector('.x-axis');
    const yAxis = container.querySelector('.y-axis');
    const xLabel = container.querySelector('.x-label');
    const yLabel = container.querySelector('.y-label');
    
    expect(xAxis).toBeInTheDocument();
    expect(yAxis).toBeInTheDocument();
    expect(xLabel).toBeInTheDocument();
    expect(yLabel).toBeInTheDocument();
  });

  test('renders legend', () => {
    const { container } = render(<TrendAnalysisChart data={mockData} />);
    const legend = container.querySelector('.legend');
    expect(legend).toBeInTheDocument();
  });

  test('renders significance legend', () => {
    const { container } = render(<TrendAnalysisChart data={mockData} />);
    const sigLegend = container.querySelector('.significance-legend');
    expect(sigLegend).toBeInTheDocument();
  });

  test('handles empty data gracefully', () => {
    const { container } = render(<TrendAnalysisChart data={[]} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    
    const dataPoints = container.querySelectorAll('[class*="data-point-"]');
    expect(dataPoints).toHaveLength(0);
  });

  test('highlights significant data points', () => {
    const { container } = render(<TrendAnalysisChart data={mockData} />);
    const significanceHighlights = container.querySelectorAll('.significance-highlight');
    
    // Should have highlights for significant points (p < 0.05)
    const significantPoints = mockData.filter(d => d.significance < 0.05);
    expect(significanceHighlights).toHaveLength(significantPoints.length);
  });

  test('applies different sizes for significant vs non-significant points', () => {
    const mixedData = [
      {
        date: new Date('2023-01-01'),
        moonPhase: 'new',
        crimeCount: 15,
        significance: 0.03, // Significant
        confidenceInterval: [12, 18] as [number, number]
      },
      {
        date: new Date('2023-01-08'),
        moonPhase: 'new',
        crimeCount: 20,
        significance: 0.12, // Not significant
        confidenceInterval: [17, 23] as [number, number]
      }
    ];

    const { container } = render(<TrendAnalysisChart data={mixedData} />);
    const dataPoints = container.querySelectorAll('[class*="data-point-new"]');
    
    expect(dataPoints.length).toBe(2);
    
    // Check that points have different radii based on significance
    const radii = Array.from(dataPoints).map(point => 
      parseFloat(point.getAttribute('r') || '0')
    );
    
    expect(radii).toContain(5); // Significant point
    expect(radii).toContain(3); // Non-significant point
  });
});