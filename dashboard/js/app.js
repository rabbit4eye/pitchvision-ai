/**
 * PitchVision AI - Main App Logic
 */

const App = (() => {
  let initialized = false;

  async function init() {
    // Show loading
    const loadingScreen = document.getElementById('loading-screen');
    
    try {
      await DataProcessor.loadCSV('data/match.csv');
      const teams = DataProcessor.getTeamNames();

      // Update header
      document.getElementById('home-team-name').textContent = teams.home;
      document.getElementById('away-team-name').textContent = teams.away;
      const homeGoals = DataProcessor.countGoals(teams.home);
      const awayGoals = DataProcessor.countGoals(teams.away);
      document.getElementById('match-score-text').textContent = `${homeGoals} - ${awayGoals} · Full Time`;

      // Setup tabs
      setupTabs();

      // Render default tab
      renderOverview();

      // Hide loading
      if (loadingScreen) loadingScreen.classList.add('hidden');
      initialized = true;
    } catch (err) {
      console.error('Failed to load data:', err);
      if (loadingScreen) {
        loadingScreen.innerHTML = `
          <div style="color: var(--danger); text-align:center;">
            <p style="font-size:1.125rem; font-weight:600;">Failed to load match data</p>
            <p style="color: var(--text-muted); margin-top:8px; font-size:0.875rem;">${err.message}</p>
          </div>`;
      }
    }
  }

  function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        const panel = document.getElementById(`tab-${target}`);
        if (panel) panel.classList.add('active');
        renderTab(target);
      });
    });
  }

  function renderTab(tabName) {
    switch(tabName) {
      case 'overview': renderOverview(); break;
      case 'passing': renderPassing(); break;
      case 'shooting': renderShooting(); break;
      case 'defending': renderDefending(); break;
      case 'physical': renderPhysical(); break;
      case 'goalkeeping': renderGoalkeeping(); break;
      case 'players': PlayersModule.init(); break;
    }
  }

  // ===== OVERVIEW TAB =====
  function renderOverview() {
    const teams = DataProcessor.getTeamNames();
    const homeGoals = DataProcessor.countGoals(teams.home);
    const awayGoals = DataProcessor.countGoals(teams.away);

    // Score banner
    document.getElementById('score-home-name').textContent = teams.home;
    document.getElementById('score-away-name').textContent = teams.away;
    document.getElementById('score-home-num').textContent = homeGoals;
    document.getElementById('score-away-num').textContent = awayGoals;

    // KPI grid
    const kpis = DataProcessor.getOverviewKPIs();
    const kpiGrid = document.getElementById('kpi-grid');
    kpiGrid.innerHTML = kpis.map(kpi => {
      const hv = parseFloat(kpi.home) || 0;
      const av = parseFloat(kpi.away) || 0;
      const total = hv + av;
      const hPct = total > 0 ? (hv / total) * 100 : 0;
      const aPct = total > 0 ? (av / total) * 100 : 0;
      return `
        <div class="kpi-row">
          <div class="kpi-value home">${kpi.home}</div>
          <div class="kpi-bar-home-wrap"><div class="kpi-bar-single"><div class="kpi-bar-home" style="width:${hPct}%;margin-left:auto;"></div></div></div>
          <div class="kpi-label">${kpi.label}</div>
          <div class="kpi-bar-away-wrap"><div class="kpi-bar-single"><div class="kpi-bar-away" style="width:${aPct}%"></div></div></div>
          <div class="kpi-value away">${kpi.away}</div>
        </div>
      `;
    }).join('');
  }

  // ===== PASSING TAB =====
  function renderPassing() {
    const teams = DataProcessor.getTeamNames();

    // Overall passing donut charts
    const homePass = DataProcessor.getPassingStats(teams.home);
    const awayPass = DataProcessor.getPassingStats(teams.away);

    Charts.createDonut('pass-donut-home', {
      labels: ['Completed', 'Unsuccessful'],
      values: [homePass.successful, homePass.unsuccessful],
      colors: ['#4ade80', 'rgba(239,68,68,0.6)']
    });
    Charts.createDonut('pass-donut-away', {
      labels: ['Completed', 'Unsuccessful'],
      values: [awayPass.successful, awayPass.unsuccessful],
      colors: ['#f59e0b', 'rgba(239,68,68,0.6)']
    });

    // Update donut center text
    updateDonutCenter('pass-home-total', homePass.total, homePass.successful);
    updateDonutCenter('pass-away-total', awayPass.total, awayPass.successful);

    // Pass type breakdown
    renderPassTypeBreakdown(teams);

    // Pass frequency line charts
    const homeTimeSeries = DataProcessor.getPassTimeSeries(teams.home, 5);
    const awayTimeSeries = DataProcessor.getPassTimeSeries(teams.away, 5);
    const labels = homeTimeSeries.map(d => d.minute + "'");

    Charts.createLineChart('pass-frequency-chart', {
      labels,
      datasets: [
        { label: teams.home, data: homeTimeSeries.map(d => d.total), color: '#4ade80', bgColor: 'rgba(74,222,128,0.1)', fill: true },
        { label: teams.away, data: awayTimeSeries.map(d => d.total), color: '#f59e0b', bgColor: 'rgba(245,158,11,0.1)', fill: true }
      ]
    }, { xTitle: 'Minute', yTitle: 'Pass Count' });

    // Pass accuracy
    Charts.createLineChart('pass-accuracy-chart', {
      labels,
      datasets: [
        { label: teams.home, data: homeTimeSeries.map(d => parseFloat(d.accuracy)), color: '#4ade80' },
        { label: teams.away, data: awayTimeSeries.map(d => parseFloat(d.accuracy)), color: '#f59e0b' }
      ]
    }, { xTitle: 'Minute', yTitle: 'Accuracy %' });

    // Pass direction
    const homeDir = DataProcessor.getPassDirections(teams.home);
    const awayDir = DataProcessor.getPassDirections(teams.away);
    Charts.createBarChart('pass-direction-chart', {
      labels: ['Forward', 'Backward', 'Lateral'],
      datasets: [
        { label: teams.home, data: [homeDir.forward, homeDir.backward, homeDir.lateral], colors: '#4ade80' },
        { label: teams.away, data: [awayDir.forward, awayDir.backward, awayDir.lateral], colors: '#f59e0b' }
      ]
    });

    // Pass matrix
    renderPassMatrix(teams.home, 'pass-matrix-home');
    renderPassMatrix(teams.away, 'pass-matrix-away');

    // Pass field map
    renderPassMap(teams);
  }

  function updateDonutCenter(elemId, total, successful) {
    const el = document.getElementById(elemId);
    if (el) {
      const pct = total > 0 ? ((successful / total) * 100).toFixed(1) : 0;
      el.innerHTML = `<div style="font-size:1.25rem;font-weight:800;color:var(--text-bright);">${pct}%</div><div style="font-size:0.6875rem;color:var(--text-muted);">${successful}/${total}</div>`;
    }
  }

  function renderPassTypeBreakdown(teams) {
    const container = document.getElementById('pass-type-breakdown');
    if (!container) return;
    const homeTypes = DataProcessor.getPassTypeBreakdown(teams.home);
    const awayTypes = DataProcessor.getPassTypeBreakdown(teams.away);

    container.innerHTML = `
      <div class="grid-2">
        <div>
          <div class="card-subtitle" style="text-align:center;color:var(--accent-home);font-weight:600;margin-bottom:8px;">${teams.home}</div>
          ${homeTypes.map(t => createPassTypeBar(t, '#4ade80')).join('')}
        </div>
        <div>
          <div class="card-subtitle" style="text-align:center;color:var(--accent-away);font-weight:600;margin-bottom:8px;">${teams.away}</div>
          ${awayTypes.map(t => createPassTypeBar(t, '#f59e0b')).join('')}
        </div>
      </div>
    `;
  }

  function createPassTypeBar(t, color) {
    const successPct = t.total > 0 ? ((t.success / t.total) * 100).toFixed(0) : 0;
    const failPct = 100 - successPct;
    return `
      <div class="pass-type-row">
        <div class="pass-type-label">${t.type}</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="pass-type-bar" style="flex:1;">
            <div class="pass-type-segment" style="width:${successPct}%;background:${color};">${t.success}</div>
            <div class="pass-type-segment" style="width:${failPct}%;background:rgba(239,68,68,0.5);">${t.fail}</div>
          </div>
          <span style="font-size:0.6875rem;color:var(--text-muted);min-width:35px;">${successPct}%</span>
        </div>
      </div>
    `;
  }

  function renderPassMatrix(teamName, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const { players, matrix } = DataProcessor.calculatePassMatrix(teamName);

    // Filter players with actual pass connections
    const activePlayers = players.filter(p => {
      return players.some(q => matrix[p][q] > 0 || matrix[q][p] > 0);
    });

    if (activePlayers.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:16px;">No pass data available</p>';
      return;
    }

    const maxVal = Math.max(...activePlayers.flatMap(p => activePlayers.map(q => matrix[p][q])), 1);
    const isHome = teamName === DataProcessor.getTeamNames().home;
    const baseColor = isHome ? [74, 222, 128] : [245, 158, 11];

    let html = '<div class="matrix-container"><table class="pass-matrix"><thead><tr><th></th>';
    activePlayers.forEach(p => {
      const shortName = p.replace(/^Team[AB]_/, '');
      html += `<th>${shortName}</th>`;
    });
    html += '</tr></thead><tbody>';

    activePlayers.forEach(passer => {
      const shortName = passer.replace(/^Team[AB]_/, '');
      html += `<tr><td>${shortName}</td>`;
      activePlayers.forEach(receiver => {
        const val = matrix[passer][receiver];
        const intensity = val > 0 ? Math.max(0.15, val / maxVal) : 0;
        const bg = val > 0 ? `rgba(${baseColor.join(',')},${intensity.toFixed(2)})` : 'transparent';
        const textColor = intensity > 0.5 ? 'var(--bg-primary)' : 'var(--text-secondary)';
        html += `<td style="background:${bg};color:${textColor};font-weight:${val > 0 ? '600' : '400'};">${val || ''}</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
  }

  function renderPassMap(teams) {
    const container = document.getElementById('pass-field-map');
    if (!container) return;

    // Add team toggle
    let activeTeam = teams.home;
    
    container.innerHTML = `
      <div class="pitch-controls">
        <button class="pitch-btn active" data-pass-team="home">${teams.home}</button>
        <button class="pitch-btn" data-pass-team="away">${teams.away}</button>
      </div>
      <div id="pass-pitch-svg"></div>
    `;

    function drawPassPitch(teamName) {
      const isHome = teamName === teams.home;
      const svg = PitchRenderer.createPitch('#pass-pitch-svg', { pitchColor: '#162b20' });
      const passes = DataProcessor.getPassLines(teamName);
      PitchRenderer.drawPassLines(svg, passes, {
        homeColor: isHome ? '#4ade80' : '#f59e0b',
        failColor: 'rgba(239,68,68,0.3)'
      });
    }

    drawPassPitch(activeTeam);

    container.querySelectorAll('.pitch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.pitch-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTeam = btn.dataset.passTeam === 'home' ? teams.home : teams.away;
        drawPassPitch(activeTeam);
      });
    });
  }

  // ===== SHOOTING TAB =====
  function renderShooting() {
    const teams = DataProcessor.getTeamNames();
    const homeShooting = DataProcessor.getShootingStats(teams.home);
    const awayShooting = DataProcessor.getShootingStats(teams.away);

    // Donuts
    Charts.createDonut('shot-donut-home', {
      labels: ['On Target', 'Off Target'],
      values: [homeShooting.onTarget, homeShooting.offTarget],
      colors: ['#4ade80', 'rgba(239,68,68,0.6)']
    });
    Charts.createDonut('shot-donut-away', {
      labels: ['On Target', 'Off Target'],
      values: [awayShooting.onTarget, awayShooting.offTarget],
      colors: ['#f59e0b', 'rgba(239,68,68,0.6)']
    });

    // Shot types comparison
    Charts.createBarChart('shot-types-chart', {
      labels: ['Inside Box', 'Outside Box', 'Headers'],
      datasets: [
        { label: teams.home, data: [homeShooting.insideBox, homeShooting.outsideBox, homeShooting.headers], colors: '#4ade80' },
        { label: teams.away, data: [awayShooting.insideBox, awayShooting.outsideBox, awayShooting.headers], colors: '#f59e0b' }
      ]
    });

    // Conversion rates
    Charts.createBarChart('shot-conversion-chart', {
      labels: [teams.home, teams.away],
      datasets: [{
        label: 'Conversion Rate %',
        data: [parseFloat(DataProcessor.shotConversionRate(teams.home)), parseFloat(DataProcessor.shotConversionRate(teams.away))],
        colors: ['#4ade80', '#f59e0b']
      }]
    });

    // Shot map
    renderShotMap(teams);

    // Shooting timeline
    const homeTimeline = DataProcessor.getShootingTimeSeries(teams.home, 15);
    const awayTimeline = DataProcessor.getShootingTimeSeries(teams.away, 15);
    const labels = homeTimeline.map(d => d.minute + "'");
    Charts.createLineChart('shot-timeline-chart', {
      labels,
      datasets: [
        { label: teams.home, data: homeTimeline.map(d => d.count), color: '#4ade80' },
        { label: teams.away, data: awayTimeline.map(d => d.count), color: '#f59e0b' }
      ]
    }, { xTitle: 'Minute', yTitle: 'Shots' });
  }

  function renderShotMap(teams) {
    const container = document.getElementById('shot-field-map');
    if (!container) return;

    container.innerHTML = `
      <div class="pitch-controls">
        <button class="pitch-btn active" data-shot-team="home">${teams.home}</button>
        <button class="pitch-btn" data-shot-team="away">${teams.away}</button>
        <button class="pitch-btn" data-shot-team="both">Both</button>
      </div>
      <div id="shot-pitch-svg"></div>
      <div class="chart-legend" style="margin-top:8px;">
        <div class="legend-item"><div class="legend-dot" style="background:#4ade80;"></div>Goal</div>
        <div class="legend-item"><div class="legend-dot" style="background:#f59e0b;"></div>On Target</div>
        <div class="legend-item"><div class="legend-dot" style="background:#ef4444;"></div>Off Target</div>
      </div>
    `;

    function drawShotPitch(teamFilter) {
      const svg = PitchRenderer.createPitch('#shot-pitch-svg', { pitchColor: '#162b20' });
      let shots = [];
      if (teamFilter === 'both') {
        shots = [...DataProcessor.getShotPositions(teams.home), ...DataProcessor.getShotPositions(teams.away)];
      } else {
        shots = DataProcessor.getShotPositions(teamFilter === 'home' ? teams.home : teams.away);
      }
      const dots = shots.map(s => ({
        x: s.x, y: s.y,
        category: s.result,
        player: s.player,
        description: s.description,
        type: s.type
      }));
      PitchRenderer.drawDots(svg, dots, {
        colorMap: { 'goal': '#4ade80', 'on-target': '#f59e0b', 'off-target': '#ef4444' }
      });
    }

    drawShotPitch('home');

    container.querySelectorAll('.pitch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.pitch-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const t = btn.dataset.shotTeam;
        if (t === 'both') drawShotPitch('both');
        else if (t === 'away') drawShotPitch('away');
        else drawShotPitch('home');
      });
    });
  }

  // ===== DEFENDING TAB =====
  function renderDefending() {
    const teams = DataProcessor.getTeamNames();
    const homeDef = DataProcessor.getDefendingStats(teams.home);
    const awayDef = DataProcessor.getDefendingStats(teams.away);

    // Overall donuts
    Charts.createDonut('def-donut-home', {
      labels: ['Tackles Succ.', 'Interceptions', 'Clearances', 'Tackles Failed'],
      values: [
        homeDef.standingTackles.successful + homeDef.slidingTackles.successful,
        homeDef.interceptions.successful,
        homeDef.clearances.total,
        (homeDef.standingTackles.total - homeDef.standingTackles.successful) + (homeDef.slidingTackles.total - homeDef.slidingTackles.successful)
      ],
      colors: ['#4ade80', '#3b82f6', '#a855f7', 'rgba(239,68,68,0.5)']
    });
    Charts.createDonut('def-donut-away', {
      labels: ['Tackles Succ.', 'Interceptions', 'Clearances', 'Tackles Failed'],
      values: [
        awayDef.standingTackles.successful + awayDef.slidingTackles.successful,
        awayDef.interceptions.successful,
        awayDef.clearances.total,
        (awayDef.standingTackles.total - awayDef.standingTackles.successful) + (awayDef.slidingTackles.total - awayDef.slidingTackles.successful)
      ],
      colors: ['#f59e0b', '#3b82f6', '#a855f7', 'rgba(239,68,68,0.5)']
    });

    // Defending time series
    const homeTS = DataProcessor.getDefendingTimeSeries(teams.home, 5);
    const awayTS = DataProcessor.getDefendingTimeSeries(teams.away, 5);
    const labels = homeTS.map(d => d.minute + "'");

    Charts.createLineChart('def-tackles-chart', {
      labels,
      datasets: [
        { label: `${teams.home} Tackles`, data: homeTS.map(d => d.tackles), color: '#4ade80' },
        { label: `${teams.away} Tackles`, data: awayTS.map(d => d.tackles), color: '#f59e0b' }
      ]
    }, { xTitle: 'Minute', yTitle: 'Count' });

    Charts.createLineChart('def-interceptions-chart', {
      labels,
      datasets: [
        { label: `${teams.home} Int.`, data: homeTS.map(d => d.interceptions), color: '#4ade80' },
        { label: `${teams.away} Int.`, data: awayTS.map(d => d.interceptions), color: '#f59e0b' }
      ]
    }, { xTitle: 'Minute', yTitle: 'Count' });

    Charts.createLineChart('def-accuracy-chart', {
      labels,
      datasets: [
        { label: `${teams.home} Accuracy`, data: homeTS.map(d => parseFloat(d.tackleAccuracy)), color: '#4ade80' },
        { label: `${teams.away} Accuracy`, data: awayTS.map(d => parseFloat(d.tackleAccuracy)), color: '#f59e0b' }
      ]
    }, { xTitle: 'Minute', yTitle: 'Accuracy %' });

    // Defensive field map
    renderDefensiveMap(teams);

    // Third distribution
    renderDefThirdDistribution(teams);
  }

  function renderDefensiveMap(teams) {
    const container = document.getElementById('def-field-map');
    if (!container) return;

    container.innerHTML = `
      <div class="pitch-controls">
        <button class="pitch-btn active" data-def-team="home">${teams.home}</button>
        <button class="pitch-btn" data-def-team="away">${teams.away}</button>
      </div>
      <div id="def-pitch-svg"></div>
      <div class="chart-legend" style="margin-top:8px;">
        <div class="legend-item"><div class="legend-dot" style="background:#4ade80;"></div>Successful</div>
        <div class="legend-item"><div class="legend-dot" style="background:#ef4444;"></div>Unsuccessful</div>
      </div>
    `;

    function drawDefPitch(teamName) {
      const svg = PitchRenderer.createPitch('#def-pitch-svg', { pitchColor: '#162b20' });
      const positions = DataProcessor.getDefensivePositions(teamName);
      const dots = positions.map(p => ({
        x: p.x, y: p.y,
        category: p.success ? 'success' : 'fail',
        player: p.player,
        type: p.type
      }));
      PitchRenderer.drawDots(svg, dots, {
        colorMap: { 'success': '#4ade80', 'fail': '#ef4444' },
        radius: 4
      });
    }

    drawDefPitch(teams.home);

    container.querySelectorAll('.pitch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.pitch-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const teamName = btn.dataset.defTeam === 'home' ? teams.home : teams.away;
        drawDefPitch(teamName);
      });
    });
  }

  function renderDefThirdDistribution(teams) {
    const container = document.getElementById('def-thirds');
    if (!container) return;
    
    const types = ['Standing Tackle', 'Sliding Tackle', 'Interception', 'Clearance'];
    let html = '<div class="grid-2">';

    [teams.home, teams.away].forEach((team, idx) => {
      const isHome = idx === 0;
      const color = isHome ? '#4ade80' : '#f59e0b';
      html += `<div><div class="card-subtitle" style="text-align:center;color:${color};font-weight:600;margin-bottom:8px;">${team}</div>`;
      
      types.forEach(type => {
        const events = DataProcessor.getEventsByAttribute('Defending', team)
          .filter(e => e.sub_attribute === type);
        const thirds = DataProcessor.getThirdDistribution(events);
        html += `
          <div style="margin-bottom:8px;">
            <div style="font-size:0.6875rem;color:var(--text-muted);margin-bottom:2px;">${type}</div>
            <div class="third-bar">
              <div class="third-segment" style="width:${thirds.def}%;background:#3b82f6;">${thirds.def}%</div>
              <div class="third-segment" style="width:${thirds.mid}%;background:#a855f7;">${thirds.mid}%</div>
              <div class="third-segment" style="width:${thirds.att}%;background:${color};">${thirds.att}%</div>
            </div>
          </div>
        `;
      });
      html += '</div>';
    });

    html += '</div>';
    html += '<div class="chart-legend"><div class="legend-item"><div class="legend-dot" style="background:#3b82f6;"></div>Defensive Third</div><div class="legend-item"><div class="legend-dot" style="background:#a855f7;"></div>Middle Third</div><div class="legend-item"><div class="legend-dot" style="background:#4ade80;"></div>Attacking Third</div></div>';
    container.innerHTML = html;
  }

  // ===== PHYSICAL TAB =====
  function renderPhysical() {
    const teams = DataProcessor.getTeamNames();
    const homePhys = DataProcessor.getPhysicalStats(teams.home);
    const awayPhys = DataProcessor.getPhysicalStats(teams.away);

    // Ground duels donuts
    Charts.createDonut('phys-ground-home', {
      labels: ['Won', 'Lost'],
      values: [homePhys.groundDuels.won, homePhys.groundDuels.lost],
      colors: ['#4ade80', 'rgba(239,68,68,0.5)']
    });
    Charts.createDonut('phys-ground-away', {
      labels: ['Won', 'Lost'],
      values: [awayPhys.groundDuels.won, awayPhys.groundDuels.lost],
      colors: ['#f59e0b', 'rgba(239,68,68,0.5)']
    });

    // Aerial duels donuts
    Charts.createDonut('phys-aerial-home', {
      labels: ['Won', 'Lost'],
      values: [homePhys.aerialDuels.won, homePhys.aerialDuels.lost],
      colors: ['#4ade80', 'rgba(239,68,68,0.5)']
    });
    Charts.createDonut('phys-aerial-away', {
      labels: ['Won', 'Lost'],
      values: [awayPhys.aerialDuels.won, awayPhys.aerialDuels.lost],
      colors: ['#f59e0b', 'rgba(239,68,68,0.5)']
    });

    // Duel timeline
    const homeTS = DataProcessor.getPhysicalTimeSeries(teams.home, 5);
    const awayTS = DataProcessor.getPhysicalTimeSeries(teams.away, 5);
    const labels = homeTS.map(d => d.minute + "'");

    Charts.createLineChart('phys-timeline-chart', {
      labels,
      datasets: [
        { label: `${teams.home} Duels`, data: homeTS.map(d => d.total), color: '#4ade80' },
        { label: `${teams.away} Duels`, data: awayTS.map(d => d.total), color: '#f59e0b' }
      ]
    }, { xTitle: 'Minute', yTitle: 'Duels' });

    // Duel accuracy comparison
    const homeGW = homePhys.groundDuels.total > 0 ? ((homePhys.groundDuels.won / homePhys.groundDuels.total) * 100).toFixed(1) : 0;
    const homeAW = homePhys.aerialDuels.total > 0 ? ((homePhys.aerialDuels.won / homePhys.aerialDuels.total) * 100).toFixed(1) : 0;
    const awayGW = awayPhys.groundDuels.total > 0 ? ((awayPhys.groundDuels.won / awayPhys.groundDuels.total) * 100).toFixed(1) : 0;
    const awayAW = awayPhys.aerialDuels.total > 0 ? ((awayPhys.aerialDuels.won / awayPhys.aerialDuels.total) * 100).toFixed(1) : 0;

    Charts.createBarChart('phys-accuracy-chart', {
      labels: ['Ground Duels', 'Aerial Duels'],
      datasets: [
        { label: teams.home, data: [parseFloat(homeGW), parseFloat(homeAW)], colors: '#4ade80' },
        { label: teams.away, data: [parseFloat(awayGW), parseFloat(awayAW)], colors: '#f59e0b' }
      ]
    });

    // Physical heatmap
    renderPhysicalMap(teams);
  }

  function renderPhysicalMap(teams) {
    const container = document.getElementById('phys-field-map');
    if (!container) return;

    container.innerHTML = `
      <div class="pitch-controls">
        <button class="pitch-btn active" data-phys-team="home">${teams.home}</button>
        <button class="pitch-btn" data-phys-team="away">${teams.away}</button>
      </div>
      <div id="phys-pitch-svg"></div>
    `;

    function drawPhysPitch(teamName) {
      const svg = PitchRenderer.createPitch('#phys-pitch-svg', { pitchColor: '#162b20' });
      const positions = DataProcessor.getPhysicalPositions(teamName);
      PitchRenderer.drawHeatmap(svg, positions);
      const dots = positions.map(p => ({
        x: p.x, y: p.y,
        category: p.won ? 'success' : 'fail',
        player: p.player,
        type: p.type
      }));
      PitchRenderer.drawDots(svg, dots, {
        colorMap: { 'success': '#4ade80', 'fail': '#ef4444' },
        radius: 4
      });
    }

    drawPhysPitch(teams.home);

    container.querySelectorAll('.pitch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.pitch-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        drawPhysPitch(btn.dataset.physTeam === 'home' ? teams.home : teams.away);
      });
    });
  }

  // ===== GOALKEEPING TAB =====
  function renderGoalkeeping() {
    const teams = DataProcessor.getTeamNames();
    const homeGK = DataProcessor.getGoalkeepingStats(teams.home);
    const awayGK = DataProcessor.getGoalkeepingStats(teams.away);

    // Stats cards
    const gkStatsEl = document.getElementById('gk-stats');
    if (gkStatsEl) {
      gkStatsEl.innerHTML = `
        <div class="grid-2">
          <div class="card">
            <div class="card-title" style="color:var(--accent-home);margin-bottom:12px;">${teams.home} Goalkeeper</div>
            <div class="grid-3">
              <div class="mini-stat"><div class="mini-stat-value">${homeGK.saves.total}</div><div class="mini-stat-label">Saves</div></div>
              <div class="mini-stat"><div class="mini-stat-value">${homeGK.handling.total}</div><div class="mini-stat-label">Handling</div></div>
              <div class="mini-stat"><div class="mini-stat-value">${homeGK.throws.total}</div><div class="mini-stat-label">GK Throws</div></div>
            </div>
            <div style="margin-top:8px;" class="grid-3">
              <div class="mini-stat"><div class="mini-stat-value">${homeGK.saves.key}</div><div class="mini-stat-label">Key Saves</div></div>
              <div class="mini-stat"><div class="mini-stat-value">${homeGK.throws.successful}</div><div class="mini-stat-label">Throws Succ.</div></div>
              <div class="mini-stat"><div class="mini-stat-value">${homeGK.throws.unsuccessful}</div><div class="mini-stat-label">Throws Fail</div></div>
            </div>
          </div>
          <div class="card">
            <div class="card-title" style="color:var(--accent-away);margin-bottom:12px;">${teams.away} Goalkeeper</div>
            <div class="grid-3">
              <div class="mini-stat"><div class="mini-stat-value">${awayGK.saves.total}</div><div class="mini-stat-label">Saves</div></div>
              <div class="mini-stat"><div class="mini-stat-value">${awayGK.handling.total}</div><div class="mini-stat-label">Handling</div></div>
              <div class="mini-stat"><div class="mini-stat-value">${awayGK.throws.total}</div><div class="mini-stat-label">GK Throws</div></div>
            </div>
            <div style="margin-top:8px;" class="grid-3">
              <div class="mini-stat"><div class="mini-stat-value">${awayGK.saves.key}</div><div class="mini-stat-label">Key Saves</div></div>
              <div class="mini-stat"><div class="mini-stat-value">${awayGK.throws.successful}</div><div class="mini-stat-label">Throws Succ.</div></div>
              <div class="mini-stat"><div class="mini-stat-value">${awayGK.throws.unsuccessful}</div><div class="mini-stat-label">Throws Fail</div></div>
            </div>
          </div>
        </div>
      `;
    }

    // GK Throw accuracy timeline
    const homeThrowTS = DataProcessor.getGKThrowTimeSeries(teams.home, 10);
    const awayThrowTS = DataProcessor.getGKThrowTimeSeries(teams.away, 10);
    const labels = homeThrowTS.map(d => d.minute + "'");

    Charts.createLineChart('gk-throw-chart', {
      labels,
      datasets: [
        { label: `${teams.home} Throws`, data: homeThrowTS.map(d => d.total), color: '#4ade80' },
        { label: `${teams.away} Throws`, data: awayThrowTS.map(d => d.total), color: '#f59e0b' }
      ]
    }, { xTitle: 'Minute', yTitle: 'Count' });

    // Save position map
    renderSaveMap(teams);
  }

  function renderSaveMap(teams) {
    const container = document.getElementById('gk-save-map');
    if (!container) return;

    container.innerHTML = `
      <div class="pitch-controls">
        <button class="pitch-btn active" data-gk-team="home">${teams.home}</button>
        <button class="pitch-btn" data-gk-team="away">${teams.away}</button>
      </div>
      <div id="gk-pitch-svg"></div>
    `;

    function drawGKPitch(teamName) {
      const svg = PitchRenderer.createPitch('#gk-pitch-svg', { pitchColor: '#162b20' });
      const saves = DataProcessor.getSavePositions(teamName);
      const dots = saves.map(s => ({
        x: s.x, y: s.y,
        category: s.type === 'Key Shot Saved' ? 'goal' : 'on-target',
        player: s.player,
        type: s.type
      }));
      PitchRenderer.drawDots(svg, dots, {
        colorMap: { 'goal': '#ec4899', 'on-target': '#3b82f6' },
        radius: 6
      });
    }

    drawGKPitch(teams.home);

    container.querySelectorAll('.pitch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.pitch-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        drawGKPitch(btn.dataset.gkTeam === 'home' ? teams.home : teams.away);
      });
    });
  }

  return { init };
})();

// Bootstrap
document.addEventListener('DOMContentLoaded', App.init);
