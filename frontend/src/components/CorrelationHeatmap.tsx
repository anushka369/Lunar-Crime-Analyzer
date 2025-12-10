import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Box, Paper, Typography, CircularProgress, Backdrop } from '@mui/material';
import { ChartDimensions } from '../types/data';

interface CorrelationData {
  crimeType: string;
  moonPhase: string;
  correlationValue: number;
  significance: number;
  sampleSize: number;
}

interface CorrelationHeatmapProps {
  data: CorrelationData[];
  width?: number;
  height?: number;
  onCellSelect?: (data: CorrelationData) => void;
  loading?: boolean;
}

const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({
  data,
  width = 600,
  height = 400,
  onCellSelect,
  loading = false,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions] = useState<ChartDimensions>({
    width,
    height,
    margin: { top: 60, right: 100, bottom: 80, left: 120 }
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

    // Get unique crime types and moon phases
    const crimeTypes = Array.from(new Set(data.map(d => d.crimeType)));
    const moonPhases = Array.from(new Set(data.map(d => d.moonPhase)));

    // Set up scales
    const xScale = d3.scaleBand()
      .domain(moonPhases)
      .range([0, innerWidth])
      .padding(0.1);

    const yScale = d3.scaleBand()
      .domain(crimeTypes)
      .range([0, innerHeight])
      .padding(0.1);

    // Color scale for correlation values (-1 to 1)
    const colorScale = d3.scaleSequential(d3.interpolateRdBu)
      .domain([1, -1]); // Reversed so positive correlations are red, negative are blue

    // Size scale for significance (larger = more significant)
    const sizeScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.significance) as [number, number])
      .range([0.3, 1.0]);

    // Add axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)')
      .style('font-size', '10px');

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .style('font-size', '10px');

    // Add axis labels
    g.append('text')
      .attr('class', 'x-label')
      .attr('text-anchor', 'middle')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 60)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('Moon Phase');

    g.append('text')
      .attr('class', 'y-label')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -80)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('Crime Type');

    // Create heatmap cells
    const cells = g.selectAll('.heatmap-cell')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'heatmap-cell')
      .attr('transform', d => `translate(${xScale(d.moonPhase)}, ${yScale(d.crimeType)})`);

    // Add rectangles for each cell
    cells
      .append('rect')
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(d.correlationValue))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .attr('opacity', d => sizeScale(d.significance))
      .style('cursor', 'pointer')
      .on('mouseover', function(_event, d) {
        d3.select(this)
          .attr('stroke-width', 3)
          .attr('stroke', '#333');

        // Show tooltip
        const tooltip = g.append('g')
          .attr('class', 'tooltip')
          .attr('transform', `translate(${(xScale(d.moonPhase) || 0) + xScale.bandwidth() / 2}, ${(yScale(d.crimeType) || 0) - 10})`);

        tooltip.append('rect')
          .attr('x', -80)
          .attr('y', -60)
          .attr('width', 160)
          .attr('height', 80)
          .attr('fill', 'rgba(0,0,0,0.9)')
          .attr('rx', 4)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);

        tooltip.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', -40)
          .attr('fill', 'white')
          .style('font-size', '11px')
          .style('font-weight', 'bold')
          .text(`${d.crimeType} - ${d.moonPhase}`);

        tooltip.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', -25)
          .attr('fill', 'white')
          .style('font-size', '10px')
          .text(`Correlation: ${d.correlationValue.toFixed(3)}`);

        tooltip.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', -10)
          .attr('fill', 'white')
          .style('font-size', '10px')
          .text(`Significance: ${d.significance.toFixed(3)}`);

        tooltip.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', 5)
          .attr('fill', 'white')
          .style('font-size', '10px')
          .text(`Sample Size: ${d.sampleSize}`);
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke-width', 1)
          .attr('stroke', '#fff');

        g.select('.tooltip').remove();
      })
      .on('click', function(_event, d) {
        if (onCellSelect) {
          onCellSelect(d);
        }
      });

    // Add correlation values as text in cells (for significant correlations)
    cells
      .filter(d => d.significance < 0.05) // Only show text for significant correlations
      .append('text')
      .attr('x', xScale.bandwidth() / 2)
      .attr('y', yScale.bandwidth() / 2)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '9px')
      .style('font-weight', 'bold')
      .style('fill', d => Math.abs(d.correlationValue) > 0.5 ? 'white' : 'black')
      .text(d => d.correlationValue.toFixed(2));

    // Add color legend
    const legendWidth = 200;
    const legendHeight = 20;
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${chartWidth - legendWidth - 20}, ${margin.top - 40})`);

    // Create gradient for legend
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'correlation-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', d3.interpolateRdBu(1));

    gradient.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', d3.interpolateRdBu(0.5));

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', d3.interpolateRdBu(0));

    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#correlation-gradient)')
      .attr('stroke', '#333')
      .attr('stroke-width', 1);

    // Add legend labels
    legend.append('text')
      .attr('x', 0)
      .attr('y', legendHeight + 15)
      .style('font-size', '10px')
      .text('-1.0');

    legend.append('text')
      .attr('x', legendWidth / 2)
      .attr('y', legendHeight + 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .text('0.0');

    legend.append('text')
      .attr('x', legendWidth)
      .attr('y', legendHeight + 15)
      .attr('text-anchor', 'end')
      .style('font-size', '10px')
      .text('1.0');

    legend.append('text')
      .attr('x', legendWidth / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .text('Correlation Strength');

    // Add significance note
    svg.append('text')
      .attr('x', margin.left)
      .attr('y', chartHeight - 10)
      .style('font-size', '9px')
      .style('fill', '#666')
      .text('* Numbers shown for statistically significant correlations (p < 0.05)');

  }, [data, dimensions, onCellSelect]);

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Crime-Moon Phase Correlation Heatmap
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

export default CorrelationHeatmap;