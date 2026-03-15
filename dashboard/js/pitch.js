/**
 * PitchVision AI - Soccer Pitch Renderer (D3.js)
 * Reusable pitch component with overlays: dots, lines, heatmap
 */

const PitchRenderer = (() => {
  const PITCH_WIDTH = 700;
  const PITCH_HEIGHT = 460;
  const PADDING = 30;
  const FIELD_W = PITCH_WIDTH - 2 * PADDING;
  const FIELD_H = PITCH_HEIGHT - 2 * PADDING;

  // Coordinate scaling: CSV uses 0-100 for both axes
  function scaleX(x) { return PADDING + (x / 100) * FIELD_W; }
  function scaleY(y) { return PADDING + (y / 100) * FIELD_H; }

  function createPitch(containerId, options = {}) {
    const container = d3.select(containerId);
    container.selectAll('svg').remove();

    const svg = container.append('svg')
      .attr('viewBox', `0 0 ${PITCH_WIDTH} ${PITCH_HEIGHT}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', 'auto')
      .style('background', options.bgColor || '#0f1923');

    // Pitch background (dark green or dark navy)
    const pitchColor = options.pitchColor || '#1a3a2a';
    svg.append('rect')
      .attr('x', PADDING)
      .attr('y', PADDING)
      .attr('width', FIELD_W)
      .attr('height', FIELD_H)
      .attr('fill', pitchColor)
      .attr('rx', 2);

    const lineColor = options.lineColor || 'rgba(255,255,255,0.25)';
    const lineWidth = 1.2;

    // Touchlines
    svg.append('rect')
      .attr('x', PADDING)
      .attr('y', PADDING)
      .attr('width', FIELD_W)
      .attr('height', FIELD_H)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);

    // Halfway line
    svg.append('line')
      .attr('x1', PADDING + FIELD_W / 2)
      .attr('y1', PADDING)
      .attr('x2', PADDING + FIELD_W / 2)
      .attr('y2', PADDING + FIELD_H)
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);

    // Center circle
    const centerR = FIELD_H * 0.145;
    svg.append('circle')
      .attr('cx', PADDING + FIELD_W / 2)
      .attr('cy', PADDING + FIELD_H / 2)
      .attr('r', centerR)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);

    // Center spot
    svg.append('circle')
      .attr('cx', PADDING + FIELD_W / 2)
      .attr('cy', PADDING + FIELD_H / 2)
      .attr('r', 3)
      .attr('fill', lineColor);

    // Penalty areas (left)
    const penW = FIELD_W * 0.17;
    const penH = FIELD_H * 0.44;
    const penY = PADDING + (FIELD_H - penH) / 2;
    svg.append('rect')
      .attr('x', PADDING).attr('y', penY)
      .attr('width', penW).attr('height', penH)
      .attr('fill', 'none').attr('stroke', lineColor).attr('stroke-width', lineWidth);

    // Penalty areas (right)
    svg.append('rect')
      .attr('x', PADDING + FIELD_W - penW).attr('y', penY)
      .attr('width', penW).attr('height', penH)
      .attr('fill', 'none').attr('stroke', lineColor).attr('stroke-width', lineWidth);

    // Goal areas (left)
    const goalW = FIELD_W * 0.06;
    const goalH = FIELD_H * 0.2;
    const goalY = PADDING + (FIELD_H - goalH) / 2;
    svg.append('rect')
      .attr('x', PADDING).attr('y', goalY)
      .attr('width', goalW).attr('height', goalH)
      .attr('fill', 'none').attr('stroke', lineColor).attr('stroke-width', lineWidth);

    // Goal areas (right)
    svg.append('rect')
      .attr('x', PADDING + FIELD_W - goalW).attr('y', goalY)
      .attr('width', goalW).attr('height', goalH)
      .attr('fill', 'none').attr('stroke', lineColor).attr('stroke-width', lineWidth);

    // Penalty spots
    svg.append('circle')
      .attr('cx', PADDING + FIELD_W * 0.12)
      .attr('cy', PADDING + FIELD_H / 2)
      .attr('r', 2.5).attr('fill', lineColor);
    svg.append('circle')
      .attr('cx', PADDING + FIELD_W * 0.88)
      .attr('cy', PADDING + FIELD_H / 2)
      .attr('r', 2.5).attr('fill', lineColor);

    // Corner arcs
    const cornerR = 10;
    const corners = [
      [PADDING, PADDING, 0, 90],
      [PADDING + FIELD_W, PADDING, 90, 180],
      [PADDING + FIELD_W, PADDING + FIELD_H, 180, 270],
      [PADDING, PADDING + FIELD_H, 270, 360]
    ];
    corners.forEach(([cx, cy, startAngle, endAngle]) => {
      const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(cornerR)
        .startAngle(startAngle * Math.PI / 180)
        .endAngle(endAngle * Math.PI / 180);
      svg.append('path')
        .attr('d', arc)
        .attr('transform', `translate(${cx},${cy})`)
        .attr('fill', 'none')
        .attr('stroke', lineColor)
        .attr('stroke-width', lineWidth);
    });

    // Goals (nets)
    const netW = 6;
    const netH = FIELD_H * 0.12;
    const netY = PADDING + (FIELD_H - netH) / 2;
    svg.append('rect')
      .attr('x', PADDING - netW).attr('y', netY)
      .attr('width', netW).attr('height', netH)
      .attr('fill', 'none').attr('stroke', lineColor).attr('stroke-width', lineWidth)
      .attr('stroke-dasharray', '2,2');
    svg.append('rect')
      .attr('x', PADDING + FIELD_W).attr('y', netY)
      .attr('width', netW).attr('height', netH)
      .attr('fill', 'none').attr('stroke', lineColor).attr('stroke-width', lineWidth)
      .attr('stroke-dasharray', '2,2');

    // Third lines (subtle)
    [33.33, 66.67].forEach(pct => {
      svg.append('line')
        .attr('x1', PADDING + (pct / 100) * FIELD_W)
        .attr('y1', PADDING)
        .attr('x2', PADDING + (pct / 100) * FIELD_W)
        .attr('y2', PADDING + FIELD_H)
        .attr('stroke', lineColor)
        .attr('stroke-width', 0.5)
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0.4);
    });

    return svg;
  }

  function drawPassLines(svg, passes, options = {}) {
    const group = svg.append('g').attr('class', 'pass-lines');
    const homeColor = options.homeColor || '#4ade80';
    const awayColor = options.failColor || 'rgba(239,68,68,0.4)';

    passes.forEach(p => {
      group.append('line')
        .attr('x1', scaleX(p.x1))
        .attr('y1', scaleY(p.y1))
        .attr('x2', scaleX(p.x2))
        .attr('y2', scaleY(p.y2))
        .attr('stroke', p.successful ? homeColor : awayColor)
        .attr('stroke-width', p.successful ? 1.2 : 0.8)
        .attr('opacity', p.successful ? 0.6 : 0.3)
        .attr('stroke-linecap', 'round');
    });
  }

  function drawDots(svg, dots, options = {}) {
    const group = svg.append('g').attr('class', 'event-dots');
    const colorMap = options.colorMap || {
      'goal': '#4ade80',
      'on-target': '#f59e0b',
      'off-target': '#ef4444',
      'success': '#4ade80',
      'fail': '#ef4444'
    };

    // Add tooltip
    const tooltip = d3.select('body').selectAll('.pitch-tooltip').data([0])
      .join('div')
      .attr('class', 'pitch-tooltip')
      .style('position', 'fixed')
      .style('background', '#243447')
      .style('border', '1px solid #2a3f54')
      .style('border-radius', '6px')
      .style('padding', '6px 10px')
      .style('font-size', '11px')
      .style('color', '#e2e8f0')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 10000)
      .style('font-family', 'Inter, sans-serif');

    dots.forEach(d => {
      const color = colorMap[d.category || d.result] || options.defaultColor || '#3b82f6';
      const r = d.category === 'goal' ? 7 : (options.radius || 5);

      group.append('circle')
        .attr('cx', scaleX(d.x))
        .attr('cy', scaleY(d.y))
        .attr('r', r)
        .attr('fill', color)
        .attr('fill-opacity', 0.7)
        .attr('stroke', color)
        .attr('stroke-width', d.category === 'goal' ? 2 : 1)
        .attr('stroke-opacity', 0.9)
        .style('cursor', 'pointer')
        .on('mouseenter', function(event) {
          d3.select(this).attr('r', r + 2).attr('fill-opacity', 1);
          const label = d.player ? `${d.player}` : '';
          const detail = d.description || d.type || d.action || '';
          tooltip
            .html(`<strong>${label}</strong>${detail ? '<br>' + detail : ''}`)
            .style('left', (event.clientX + 10) + 'px')
            .style('top', (event.clientY - 10) + 'px')
            .style('opacity', 1);
        })
        .on('mouseleave', function() {
          d3.select(this).attr('r', r).attr('fill-opacity', 0.7);
          tooltip.style('opacity', 0);
        });
    });
  }

  function drawHeatmap(svg, positions, options = {}) {
    const gridX = options.gridX || 10;
    const gridY = options.gridY || 8;
    const cellW = FIELD_W / gridX;
    const cellH = FIELD_H / gridY;
    const grid = Array.from({length: gridX}, () => Array(gridY).fill(0));

    positions.forEach(p => {
      const gx = Math.min(Math.floor((p.x / 100) * gridX), gridX - 1);
      const gy = Math.min(Math.floor((p.y / 100) * gridY), gridY - 1);
      grid[gx][gy]++;
    });

    const maxVal = Math.max(...grid.flat(), 1);
    const colorScale = options.colorScale || d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxVal]);

    const group = svg.append('g').attr('class', 'heatmap');
    for (let i = 0; i < gridX; i++) {
      for (let j = 0; j < gridY; j++) {
        if (grid[i][j] === 0) continue;
        group.append('rect')
          .attr('x', PADDING + i * cellW)
          .attr('y', PADDING + j * cellH)
          .attr('width', cellW)
          .attr('height', cellH)
          .attr('fill', colorScale(grid[i][j]))
          .attr('opacity', 0.55)
          .attr('rx', 2);
      }
    }
  }

  return { createPitch, drawPassLines, drawDots, drawHeatmap, scaleX, scaleY };
})();
