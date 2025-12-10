import { render, screen } from '@testing-library/react';
import LunarCycleChart from './LunarCycleChart';
import { MoonPhaseData } from '../types/data';

describe('LunarCycleChart', () => {
  const mockData: MoonPhaseData[] = [
    {
      timestamp: new Date('2023-01-01'),
      phaseName: 'new',
      illuminationPercent: 2.1,
      phaseAngle: 0,
      distanceKm: 384400,
      location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' }
    },
    {
      timestamp: new Date('2023-01-15'),
      phaseName: 'full',
      illuminationPercent: 98.5,
      phaseAngle: 180,
      distanceKm: 384400,
      location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' }
    }
  ];

  test('renders chart title', () => {
    render(<LunarCycleChart data={mockData} />);
    expect(screen.getByText('Lunar Cycle Timeline')).toBeInTheDocument();
  });

  test('renders SVG chart container', () => {
    const { container } = render(<LunarCycleChart data={mockData} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '800');
    expect(svg).toHaveAttribute('height', '200');
  });

  test('renders illumination line', () => {
    const { container } = render(<LunarCycleChart data={mockData} />);
    const illuminationLine = container.querySelector('.illumination-line');
    expect(illuminationLine).toBeInTheDocument();
  });

  test('renders phase markers for each data point', () => {
    const { container } = render(<LunarCycleChart data={mockData} />);
    const phaseMarkers = container.querySelectorAll('.phase-marker');
    expect(phaseMarkers).toHaveLength(mockData.length);
  });

  test('renders axes and labels', () => {
    const { container } = render(<LunarCycleChart data={mockData} />);
    
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
    const { container } = render(<LunarCycleChart data={mockData} />);
    const legend = container.querySelector('.legend');
    expect(legend).toBeInTheDocument();
  });

  test('handles empty data gracefully', () => {
    const { container } = render(<LunarCycleChart data={[]} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    
    const phaseMarkers = container.querySelectorAll('.phase-marker');
    expect(phaseMarkers).toHaveLength(0);
  });

  test('renders phase labels for major phases', () => {
    const majorPhaseData: MoonPhaseData[] = [
      {
        timestamp: new Date('2023-01-01'),
        phaseName: 'new',
        illuminationPercent: 2.1,
        phaseAngle: 0,
        distanceKm: 384400,
        location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' }
      },
      {
        timestamp: new Date('2023-01-15'),
        phaseName: 'full',
        illuminationPercent: 98.5,
        phaseAngle: 180,
        distanceKm: 384400,
        location: { latitude: 40.7128, longitude: -74.0060, jurisdiction: 'NYC' }
      }
    ];

    const { container } = render(<LunarCycleChart data={majorPhaseData} />);
    const phaseLabels = container.querySelectorAll('.phase-label');
    expect(phaseLabels.length).toBeGreaterThan(0);
  });
});