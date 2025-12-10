import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Box, Paper, Typography, CircularProgress, Backdrop } from '@mui/material';
import { MoonPhaseData, ChartDimensions } from '../types/data';

interface LunarCycleChartProps {
  data: MoonPhaseData[];
  width?: number;
  height?: number;
  onPhaseSelect?: (phase: MoonPhaseData) => void;
  selectedTimeRange?: [Date, Date];
  loading?: boolean;
}

const LunarCycleChart: React.FC<LunarCycleChartProps> = ({
  data,
  width = 800,
  height = 200,
  onPhaseSelect,
  selectedTimeRange,
  loading = false,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions] = useState<ChartDimensions>({
    width,
    height,
    margin: { top: 20, right: 30, bottom: 60, left: 80 }
  });

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const { width: chartWidth, height: chartHeight, margin } = dimensions;
    const innerWidth = chartWidth - margin.left - margin.right;
    const innerHeight = chartHeight - margin.top - margin.bottom;

    // Create main group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Set up scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => d.timestamp) as [Date, Date])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, 100]) // Illumination percentage
      .range([innerHeight, 0]);

    // Color scale for moon phases
    const phaseColorScale = d3.scaleOrdinal<string>()
      .domain(['new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 
               'full', 'waning_gibbous', 'last_quarter', 'waning_crescent'])
      .range(['#2c3e50', '#34495e', '#7f8c8d', '#95a5a6', 
              '#f39c12', '#e67e22', '#d35400', '#8e44ad']);

    // Add axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat((domainValue) => d3.timeFormat('%m/%d')(domainValue as Date));
    
    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d => `${d}%`);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis);

    // Add axis labels
    g.append('text')
      .attr('class', 'x-label')
      .attr('text-anchor', 'middle')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .style('font-size', '12px')
      .text('Date');

    g.append('text')
      .attr('class', 'y-label')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -50)
      .style('font-size', '12px')
      .text('Moon Illumination %');

    // Create line generator for illumination curve
    const line = d3.line<MoonPhaseData>()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.illuminationPercent))
      .curve(d3.curveMonotoneX);

    // Add illumination line
    g.append('path')
      .datum(data)
      .attr('class', 'illumination-line')
      .attr('fill', 'none')
      .attr('stroke', '#3498db')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Add phase markers
    const phaseMarkers = g.selectAll('.phase-marker')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'phase-marker')
      .attr('transform', d => `translate(${xScale(d.timestamp)}, ${yScale(d.illuminationPercent)})`);

    // Add phase circles
    phaseMarkers
      .append('circle')
      .attr('r', 6)
      .attr('fill', d => phaseColorScale(d.phaseName))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(_event, d) {
        d3.select(this)
          .attr('r', 8)
          .attr('stroke-width', 3);

        // Show tooltip
        const tooltip = g.append('g')
          .attr('class', 'tooltip')
          .attr('transform', `translate(${xScale(d.timestamp)}, ${yScale(d.illuminationPercent) - 20})`);

        tooltip.append('rect')
          .attr('x', -60)
          .attr('y', -30)
          .attr('width', 120)
          .attr('height', 50)
          .attr('fill', 'rgba(0,0,0,0.8)')
          .attr('rx', 4);

        tooltip.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', -15)
          .attr('fill', 'white')
          .style('font-size', '12px')
          .text(d.phaseName.replace('_', ' '));

        tooltip.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', 0)
          .attr('fill', 'white')
          .style('font-size', '10px')
          .text(`${d.illuminationPercent.toFixed(1)}%`);

        tooltip.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', 15)
          .attr('fill', 'white')
          .style('font-size', '10px')
          .text(d3.timeFormat('%m/%d/%Y')(d.timestamp));
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('r', 6)
          .attr('stroke-width', 2);

        g.select('.tooltip').remove();
      })
      .on('click', function(_event, d) {
        if (onPhaseSelect) {
          onPhaseSelect(d);
        }
      });

    // Add phase labels for major phases
    const majorPhases = data.filter(d => 
      ['new', 'first_quarter', 'full', 'last_quarter'].includes(d.phaseName)
    );

    majorPhases.forEach(phase => {
      g.append('text')
        .attr('class', 'phase-label')
        .attr('x', xScale(phase.timestamp))
        .attr('y', yScale(phase.illuminationPercent) - 15)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('font-weight', 'bold')
        .style('fill', '#2c3e50')
        .text(phase.phaseName.replace('_', ' '));
    });

    // Highlight selected time range if provided
    if (selectedTimeRange) {
      const [startDate, endDate] = selectedTimeRange;
      const startX = xScale(startDate);
      const endX = xScale(endDate);

      g.append('rect')
        .attr('class', 'selection-highlight')
        .attr('x', startX)
        .attr('y', 0)
        .attr('width', endX - startX)
        .attr('height', innerHeight)
        .attr('fill', 'rgba(52, 152, 219, 0.2)')
        .attr('stroke', '#3498db')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '5,5');
    }

    // Add legend for moon phases
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${chartWidth - 200}, 20)`);

    const phaseNames = ['new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 
                       'full', 'waning_gibbous', 'last_quarter', 'waning_crescent'];
    
    const legendItems = legend.selectAll('.legend-item')
      .data(phaseNames.slice(0, 4)) // Show only major phases in legend
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (_d, i) => `translate(0, ${i * 20})`);

    legendItems.append('circle')
      .attr('cx', 6)
      .attr('cy', 6)
      .attr('r', 4)
      .attr('fill', d => phaseColorScale(d));

    legendItems.append('text')
      .attr('x', 18)
      .attr('y', 6)
      .attr('dy', '0.35em')
      .style('font-size', '10px')
      .text(d => d.replace('_', ' '));

  }, [data, dimensions, onPhaseSelect, selectedTimeRange]);

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Lunar Cycle Timeline
      </Typography>
      <Box sx={{ position: 'relative' }}>
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          style={{ border: '1px solid #e0e0e0' }}
        />
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
      </Box>
    </Paper>
  );
};

export default LunarCycleChart;