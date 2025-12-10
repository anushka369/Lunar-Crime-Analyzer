import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Box, Paper, Typography, Tooltip as MuiTooltip, CircularProgress, Backdrop } from '@mui/material';
import { CorrelationDataPoint, ChartDimensions, TooltipData } from '../types/data';

interface CorrelationChartProps {
  data: CorrelationDataPoint[];
  width?: number;
  height?: number;
  onPointSelect?: (point: CorrelationDataPoint) => void;
  loading?: boolean;
}

const CorrelationChart: React.FC<CorrelationChartProps> = ({
  data,
  width = 800,
  height = 600,
  onPointSelect,
  loading = false,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
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
    const xScale = d3.scaleLinear()
      .domain([0, 100]) // Moon illumination percentage
      .range([0, innerWidth]);

    const yScale = d3.scaleTime()
      .domain(d3.extent(data, d => d.crimeIncident.timestamp) as [Date, Date])
      .range([innerHeight, 0]);

    // Color scale for crime types
    const colorScale = d3.scaleOrdinal<string>()
      .domain(['violent', 'property', 'drug', 'public_order', 'white_collar'])
      .range(['#d32f2f', '#f57c00', '#7b1fa2', '#1976d2', '#388e3c']);

    // Size scale for severity
    const sizeScale = d3.scaleOrdinal<string, number>()
      .domain(['violation', 'misdemeanor', 'felony'])
      .range([4, 6, 8]);

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .on('zoom', (event) => {
        const { transform } = event;
        g.attr('transform', `translate(${margin.left + transform.x},${margin.top + transform.y}) scale(${transform.k})`);
      });

    svg.call(zoom);

    // Add axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d => `${d}%`);
    
    const yAxis = d3.axisLeft(yScale)
      .tickFormat((domainValue) => d3.timeFormat('%m/%d/%Y')(domainValue as Date));

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
      .text('Moon Illumination Percentage');

    g.append('text')
      .attr('class', 'y-label')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -50)
      .style('font-size', '12px')
      .text('Crime Incident Date');

    // Add data points
    const circles = g.selectAll('.data-point')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', d => xScale(d.moonPhase.illuminationPercent))
      .attr('cy', d => yScale(d.crimeIncident.timestamp))
      .attr('r', d => sizeScale(d.crimeIncident.severity))
      .attr('fill', d => colorScale(d.crimeIncident.crimeType.category))
      .attr('stroke', '#333')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.7)
      .style('cursor', 'pointer');

    // Add interactivity
    circles
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('stroke-width', 2)
          .attr('opacity', 1);

        const [mouseX, mouseY] = d3.pointer(event, svg.node());
        setTooltip({
          crimeIncident: d.crimeIncident,
          moonPhase: d.moonPhase,
          x: mouseX,
          y: mouseY
        });
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke-width', 0.5)
          .attr('opacity', 0.7);
        
        setTooltip(null);
      })
      .on('click', function(_event, d) {
        if (onPointSelect) {
          onPointSelect(d);
        }
      });

    // Add legend
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${chartWidth - 150}, 20)`);

    const crimeTypes = ['violent', 'property', 'drug', 'public_order', 'white_collar'];
    const legendItems = legend.selectAll('.legend-item')
      .data(crimeTypes)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (_d, i) => `translate(0, ${i * 20})`);

    legendItems.append('circle')
      .attr('cx', 6)
      .attr('cy', 6)
      .attr('r', 6)
      .attr('fill', d => colorScale(d));

    legendItems.append('text')
      .attr('x', 18)
      .attr('y', 6)
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .text(d => d.replace('_', ' '));

  }, [data, dimensions, onPointSelect]);

  const formatTooltipContent = (tooltipData: TooltipData) => {
    const { crimeIncident, moonPhase } = tooltipData;
    return (
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
          Crime Details
        </Typography>
        <Typography variant="body2">
          Type: {crimeIncident.crimeType.category} - {crimeIncident.crimeType.subcategory}
        </Typography>
        <Typography variant="body2">
          Severity: {crimeIncident.severity}
        </Typography>
        <Typography variant="body2">
          Date: {crimeIncident.timestamp.toLocaleDateString()}
        </Typography>
        <Typography variant="body2">
          Time: {crimeIncident.timestamp.toLocaleTimeString()}
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 1 }}>
          Moon Phase
        </Typography>
        <Typography variant="body2">
          Phase: {moonPhase.phaseName.replace('_', ' ')}
        </Typography>
        <Typography variant="body2">
          Illumination: {moonPhase.illuminationPercent.toFixed(1)}%
        </Typography>
      </Box>
    );
  };

  return (
    <Paper elevation={2} sx={{ p: 2, position: 'relative' }}>
      <Typography variant="h6" gutterBottom>
        Crime Incidents vs Moon Phases
      </Typography>
      <Box sx={{ position: 'relative' }}>
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          style={{ border: '1px solid #e0e0e0' }}
        />
        {tooltip && (
          <MuiTooltip
            title={formatTooltipContent(tooltip)}
            open={true}
            placement="top"
            arrow
          >
            <Box
              sx={{
                position: 'absolute',
                left: tooltip.x,
                top: tooltip.y,
                width: 1,
                height: 1,
                pointerEvents: 'none'
              }}
            />
          </MuiTooltip>
        )}
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

export default CorrelationChart;