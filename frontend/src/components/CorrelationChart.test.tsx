import { render, screen } from '@testing-library/react';
import CorrelationChart from './CorrelationChart';
import { CorrelationDataPoint } from '../types/data';

describe('CorrelationChart', () => {
  const mockData: CorrelationDataPoint[] = [
    {
      crimeIncident: {
        id: '1',
        timestamp: new Date('2023-01-15T22:30:00'),
        location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' },
        crimeType: { category: 'violent', subcategory: 'assault' },
        severity: 'felony',
        description: 'Assault incident',
        resolved: false
      },
      moonPhase: {
        timestamp: new Date('2023-01-15'),
        phaseName: 'full',
        illuminationPercent: 98.5,
        phaseAngle: 180,
        distanceKm: 384400,
        location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' }
      }
    }
  ];

  test('renders chart title', () => {
    render(<CorrelationChart data={mockData} />);
    expect(screen.getByText('Crime Incidents vs Moon Phases')).toBeInTheDocument();
  });

  test('renders SVG chart container', () => {
    const { container } = render(<CorrelationChart data={mockData} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '800');
    expect(svg).toHaveAttribute('height', '600');
  });

  test('renders data points for provided data', () => {
    const { container } = render(<CorrelationChart data={mockData} />);
    const dataPoints = container.querySelectorAll('.data-point');
    expect(dataPoints).toHaveLength(mockData.length);
  });

  test('renders axes and labels', () => {
    const { container } = render(<CorrelationChart data={mockData} />);
    
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
    const { container } = render(<CorrelationChart data={mockData} />);
    const legend = container.querySelector('.legend');
    expect(legend).toBeInTheDocument();
  });

  test('handles empty data gracefully', () => {
    const { container } = render(<CorrelationChart data={[]} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    
    const dataPoints = container.querySelectorAll('.data-point');
    expect(dataPoints).toHaveLength(0);
  });

  test('applies correct styling to data points', () => {
    const { container } = render(<CorrelationChart data={mockData} />);
    const dataPoint = container.querySelector('.data-point');
    
    expect(dataPoint).toHaveAttribute('opacity', '0.7');
    expect(dataPoint).toHaveAttribute('r', '8'); // felony severity
  });
});