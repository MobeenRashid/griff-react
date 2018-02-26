import React, { Component } from 'react';
import * as d3 from 'd3';
import Axis from '../Axis';
import Line from '../Line';
import simplify from '../../utils/simplify-points';

export default class ContextChart extends Component {
  componentDidMount() {
    const { width, height, heightPct } = this.props;
    this.brush = d3
      .brushX()
      .extent([[0, 0], [width, height * heightPct]])
      .on('brush end', this.didBrush);
    this.selection = d3.select(this.brushNode);
    this.selection.call(this.brush);
    this.selection.call(this.brush.move, [0, width]);
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.subDomain[0] !== this.props.subDomain[0] ||
      prevProps.subDomain[1] !== this.props.subDomain[1]
    ) {
      const { subDomain, height, heightPct } = this.props;
      const scale = this.props.xScale;
      const range = subDomain.map(scale);
      this.brush.extent([[0, 0], [this.props.width, height * heightPct]]);
      this.selection.call(this.brush.move, range);
      this.selection.call(this.brush);
    }

    const prevRange = prevProps.xScale.range();
    const curRange = this.props.xScale.range();
    if (prevProps.width !== this.props.width) {
      const range = d3.brushSelection(this.brushNode);
      const xScale = prevProps.xScale;
      const oldSelection = range
        .map(xScale.invert, xScale)
        .map(p => p.getTime());
      const newRange = oldSelection.map(this.props.xScale);
      const { height, heightPct, width } = this.props;
      this.brush.extent([[0, 0], [width, height * heightPct]]);
      this.selection.call(this.brush.move, newRange);
      this.selection.call(this.brush);
    }
  }

  didBrush = () => {
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'zoom') {
      return;
    }
    const s = d3.event.selection || this.props.xScale.range();
    const scale = this.props.xScale;
    const domain = s.map(scale.invert, scale).map(p => p.getTime());
    const oldDomain = scale.domain().map(p => p.getTime());
    if (domain[0] !== oldDomain[0] || domain[1] !== oldDomain[1]) {
      this.props.subDomainChanged(domain);
    }
    if (d3.event.type === 'end') {
      this.props.updateTransformation(s);
    }
  };

  render() {
    const {
      yAxis,
      xAxis,
      contextSeries: series,
      height,
      heightPct,
      offsetY,
      xScale,
      colors,
      hiddenSeries,
    } = this.props;
    const effectiveHeight = height * heightPct;
    return (
      <g className="context-chart" transform={`translate(0, ${offsetY})`}>
        <Axis
          key="axis--x"
          scale={xScale}
          mode="x"
          offsety={effectiveHeight}
          offsetx={0}
        />
        {Object.keys(series).map(key => {
          const serie = series[key];
          const yDomain = yAxis.calculateDomain
            ? yAxis.calculateDomain(serie.data)
            : d3.extent(serie.data, serie.yAccessor || yAxis.accessor);
          const yScale = d3
            .scaleLinear()
            .domain(yDomain)
            .range([effectiveHeight, 0]);
          return (
            <Line
              key={`line--${key}`}
              data={serie.data}
              hidden={hiddenSeries[key]}
              xScale={xScale}
              yScale={yScale}
              xAccessor={serie.xAccessor || xAxis.accessor}
              yAccessor={serie.yAccessor || yAxis.accessor}
              color={colors[key]}
              step={serie.step}
            />
          );
        })}
        <g
          className="context-brush"
          ref={ref => {
            this.brushNode = ref;
          }}
        />
      </g>
    );
  }
}
