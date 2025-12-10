import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Box, Paper, Typography, CircularProgress, Backdrop } from '@mui/material';
import { ChartDimensions } from '../types/data';

interface TrendDataPoint {
  date: Date;
  moonPhase: string;
  crimeCount: number;
  significance: number;
  confidenceInterval: [number, number];
}

interface TrendAnalysisChartProps {
  data: TrendDataPoint[];
  width?: number;
  height?: number;
  onPointSelect?: (point: TrendDataPoint) => void;
  loading?: boolean;
}

const TrendAnalysisChart: React.FC<TrendAnalysisChartProps> = ({
  data,
  width = 800,
  height = 400,
  onPointSelect,
  loading = false,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions] = useState<ChartDimensions>({
    width,
    height,
    margin: { top: 20, right: 120, bottom: 60, left: 80 }
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
      .domain(d3.extent(data, d => d.date) as [Date, Date])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.crimeCount) as [number, number])
      .nice()
      .range([innerHeight, 0]);

    // Group data by moon phase
    const dataByPhase = d3.group(data, d => d.moonPhase);
    
    // Color scale for moon phases
    const colorScale = d3.scaleOrdinal<string>()
      .domain(['new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 
               'full', 'waning_gibbous', 'last_quarter', 'waning_crescent'])
      .range(['#2c3e50', '#34495e', '#7f8c8d', '#95a5a6', 
              '#f39c12', '#e67e22', '#d35400', '#8e44ad']);

    // Add axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat((domainValue) => d3.timeFormat('%m/%d')(domainValue as Date));
    
    const yAxis = d3.axisLeft(yScale);

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
      .text('Crime Frequency');

    // Create line generator
    const line = d3.line<TrendDataPoint>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.crimeCount))
      .curve(d3.curveMonotoneX);

    // Create area generator for confidence intervals
    const area = d3.area<TrendDataPoint>()
      .x(d => xScale(d.date))
      .y0(d => yScale(d.confidenceInterval[0]))
      .y1(d => yScale(d.confidenceInterval[1]))
      .curve(d3.curveMonotoneX);

    // Draw lines and confidence intervals for each moon phase
    dataByPhase.forEach((phaseData, phase) => {
      const sortedData = phaseData.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // Add confidence interval area
      g.append('path')
        .datum(sortedData)
        .attr('class', `confidence-area-${phase}`)
        .attr('fill', colorScale(phase))
        .attr('fill-opacity', 0.2)
        .attr('d', area);

      // Add trend line
      g.append('path')
        .datum(sortedData)
        .attr('class', `trend-line-${phase}`)
        .attr('fill', 'none')
        .attr('stroke', colorScale(phase))
        .attr('stroke-width', 2)
        .attr('d', line);

      // Add data points
      g.selectAll(`.data-point-${phase}`)
        .data(sortedData)
        .enter()
        .append('circle')
        .attr('class', `data-point-${phase}`)
        .attr('cx', d => xScale(d.date))
        .attr('cy', d => yScale(d.crimeCount))
        .attr('r', d => d.significance < 0.05 ? 5 : 3) // Larger points for significant results
        .attr('fill', colorScale(phase))
        .attr('stroke', '#fff')
        .attr('stroke-width', d => d.significance < 0.05 ? 2 : 1)
        .style('cursor', 'pointer')
        .on('mouseover', function(_event, d) {
          d3.select(this)
            .attr('r', d.significance < 0.05 ? 7 : 5)
            .attr('stroke-width', 3);

          // Show tooltip
          const tooltip = g.append('g')
            .attr('class', 'tooltip')
            .attr('transform', `translate(${xScale(d.date)}, ${yScale(d.crimeCount) - 20})`);

          tooltip.append('rect')
            .attr('x', -80)
            .attr('y', -50)
            .attr('width', 160)
            .attr('height', 70)
            .attr('fill', 'rgba(0,0,0,0.9)')
            .attr('rx', 4)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1);

          tooltip.append('text')
            .attr('text-anchor', 'middle')
            .attr('y', -35)
            .attr('fill', 'white')
            .style('font-size', '11px')
            .style('font-weight', 'bold')
            .text(`${d.moonPhase.replace('_', ' ')}`);

          tooltip.append('text')
            .attr('text-anchor', 'middle')
            .attr('y', -20)
            .attr('fill', 'white')
            .style('font-size', '10px')
            .text(`Date: ${d3.timeFormat('%m/%d/%Y')(d.date)}`);

          tooltip.append('text')
            .attr('text-anchor', 'middle')
            .attr('y', -5)
            .attr('fill', 'white')
            .style('font-size', '10px')
            .text(`Crime Count: ${d.crimeCount}`);

          tooltip.append('text')
            .attr('text-anchor', 'middle')
            .attr('y', 10)
            .attr('fill', d.significance < 0.05 ? '#90EE90' : '#FFB6C1')
            .style('font-size', '10px')
            .text(`p-value: ${d.significance.toFixed(3)}`);
        })
        .on('mouseout', function(_event, d) {
          d3.select(this)
            .attr('r', d.significance < 0.05 ? 5 : 3)
            .attr('stroke-width', d.significance < 0.05 ? 2 : 1);

          g.select('.tooltip').remove();
        })
        .on('click', function(_event, d) {
          if (onPointSelect) {
            onPointSelect(d);
          }
        });
    });

    // Add significance threshold line
    const significanceThreshold = 0.05;
    const significantPoints = data.filter(d => d.significance < significanceThreshold);
    
    if (significantPoints.length > 0) {
      // Add background highlight for significant periods
      significantPoints.forEach(point => {
        g.append('rect')
          .attr('class', 'significance-highlight')
          .attr('x', xScale(point.date) - 5)
          .attr('y', 0)
          .attr('width', 10)
          .attr('height', innerHeight)
          .attr('fill', 'rgba(255, 215, 0, 0.3)')
          .attr('opacity', 0.5);
      });
    }

    // Add legend
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${chartWidth - 100}, 30)`);

    const phases = Array.from(dataByPhase.keys()).slice(0, 4); // Show main phases
    const legendItems = legend.selectAll('.legend-item')
      .data(phases)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (_d, i) => `translate(0, ${i * 20})`);

    legendItems.append('line')
      .attr('x1', 0)
      .attr('x2', 15)
      .attr('y1', 6)
      .attr('y2', 6)
      .attr('stroke', d => colorScale(d))
      .attr('stroke-width', 2);

    legendItems.append('text')
      .attr('x', 20)
      .attr('y', 6)
      .attr('dy', '0.35em')
      .style('font-size', '10px')
      .text(d => d.replace('_', ' '));

    // Add significance legend
    const sigLegend = svg.append('g')
      .attr('class', 'significance-legend')
      .attr('transform', `translate(${margin.left}, ${chartHeight - 40})`);

    sigLegend.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 5)
      .attr('fill', '#666')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    sigLegend.append('text')
      .attr('x', 10)
      .attr('y', 0)
      .attr('dy', '0.35em')
      .style('font-size', '9px')
      .text('Statistically significant (p < 0.05)');

    sigLegend.append('circle')
      .attr('cx', 200)
      .attr('cy', 0)
      .attr('r', 3)
      .attr('fill', '#666')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);

    sigLegend.append('text')
      .attr('x', 210)
      .attr('y', 0)
      .attr('dy', '0.35em')
      .style('font-size', '9px')
      .text('Not significant');

  }, [data, dimensions, onPointSelect]);

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Crime Frequency Trends by Moon Phase
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

export default TrendAnalysisChart;