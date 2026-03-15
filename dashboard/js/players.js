/**
 * PitchVision AI - Player Analysis Module
 */

const PlayersModule = (() => {
  let currentTeam = '';
  let currentPlayer = '';

  function init() {
    const teams = DataProcessor.getTeamNames();
    currentTeam = teams.home;
    populateTeamSelect();
    populatePlayerSelect();
    renderPlayerView();
  }

  function populateTeamSelect() {
    const sel = document.getElementById('player-team-select');
    if (!sel) return;
    const teams = DataProcessor.getTeamNames();
    sel.innerHTML = `
      <option value="${teams.home}">${teams.home}</option>
      <option value="${teams.away}">${teams.away}</option>
    `;
    sel.value = currentTeam;
    sel.addEventListener('change', () => {
      currentTeam = sel.value;
      populatePlayerSelect();
      renderPlayerView();
    });
  }

  function populatePlayerSelect() {
    const sel = document.getElementById('player-select');
    if (!sel) return;
    const players = DataProcessor.getTeamPlayers(currentTeam);
    sel.innerHTML = players.map(p =>
      `<option value="${p.name}">#${p.jersey} ${p.name}</option>`
    ).join('');
    currentPlayer = players[0]?.name || '';
    sel.value = currentPlayer;
    sel.removeEventListener('change', onPlayerChange);
    sel.addEventListener('change', onPlayerChange);
  }

  function onPlayerChange(e) {
    currentPlayer = e.target.value;
    renderPlayerRadar();
    renderPlayerTimeline();
  }

  function renderPlayerView() {
    renderPlayerRadar();
    renderPlayerTimeline();
    renderPlayerSummaryTable();
  }

  function renderPlayerRadar() {
    if (!currentPlayer) return;
    const radarData = DataProcessor.getPlayerRadarData(currentPlayer);
    const isHome = currentTeam === DataProcessor.getTeamNames().home;

    Charts.createRadar('player-radar-chart', {
      labels: radarData.labels,
      datasets: [{
        label: currentPlayer,
        data: radarData.values,
        color: isHome ? Charts.HOME_COLOR : Charts.AWAY_COLOR,
        bgColor: isHome ? Charts.HOME_BG : Charts.AWAY_BG
      }]
    });

    // Update stat numbers
    const stats = DataProcessor.getPlayerStats(currentPlayer);
    const container = document.getElementById('player-stats-detail');
    if (container) {
      container.innerHTML = `
        <div class="mini-stat">
          <div class="mini-stat-value">${stats.passing.total}</div>
          <div class="mini-stat-label">Passes (${stats.passing.accuracy}%)</div>
        </div>
        <div class="mini-stat">
          <div class="mini-stat-value">${stats.shooting.goals}</div>
          <div class="mini-stat-label">Goals (${stats.shooting.total} shots)</div>
        </div>
        <div class="mini-stat">
          <div class="mini-stat-value">${stats.defending.total}</div>
          <div class="mini-stat-label">Def. Actions (${stats.defending.accuracy}%)</div>
        </div>
        <div class="mini-stat">
          <div class="mini-stat-value">${stats.physical.won}</div>
          <div class="mini-stat-label">Duels Won (${stats.physical.accuracy}%)</div>
        </div>
        <div class="mini-stat">
          <div class="mini-stat-value">${stats.dribbling.successful}</div>
          <div class="mini-stat-label">Dribbles (${stats.dribbling.accuracy}%)</div>
        </div>
      `;
    }
  }

  function renderPlayerTimeline() {
    if (!currentPlayer) return;
    const container = document.getElementById('player-timeline');
    if (!container) return;
    
    const timeline = DataProcessor.getPlayerTimeline(currentPlayer);
    if (timeline.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No events recorded.</p>';
      return;
    }

    const attrColors = {
      'Passing': '#4ade80',
      'Shooting': '#f59e0b',
      'Defending': '#3b82f6',
      'Physical': '#a855f7',
      'Dribbling': '#06b6d4',
      'Goalkeeping': '#ec4899',
      'Special_Actions': '#ef4444'
    };

    container.innerHTML = `
      <div style="max-height: 300px; overflow-y: auto;">
        <table class="stats-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Category</th>
              <th>Action</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            ${timeline.slice(0, 100).map(e => `
              <tr>
                <td style="font-weight:600;">${e.timestamp}</td>
                <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${attrColors[e.attribute]||'#64748b'};margin-right:6px;vertical-align:middle;"></span>${e.attribute}</td>
                <td>${e.action}</td>
                <td style="color:var(--text-secondary);font-size:0.75rem;">${e.description || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderPlayerSummaryTable() {
    const container = document.getElementById('player-summary-table');
    if (!container) return;

    const summary = DataProcessor.getAllPlayerSummary(currentTeam);
    const isHome = currentTeam === DataProcessor.getTeamNames().home;
    const accentColor = isHome ? 'var(--accent-home)' : 'var(--accent-away)';

    container.innerHTML = `
      <div style="overflow-x: auto;">
        <table class="stats-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Passes</th>
              <th>Pass%</th>
              <th>Shots</th>
              <th>Goals</th>
              <th>Tackles</th>
              <th>Tack%</th>
              <th>Duels</th>
              <th>Duel%</th>
              <th>Drib.</th>
              <th>Drib%</th>
            </tr>
          </thead>
          <tbody>
            ${summary.map(p => `
              <tr style="cursor:pointer;" onclick="document.getElementById('player-select').value='${p.name}';document.getElementById('player-select').dispatchEvent(new Event('change'));">
                <td style="color:${accentColor};font-weight:700;">${p.jersey}</td>
                <td style="font-weight:600;">${p.name}</td>
                <td class="numeric">${p.passes}</td>
                <td class="numeric">${p.passAcc}%</td>
                <td class="numeric">${p.shots}</td>
                <td class="numeric highlight">${p.goals}</td>
                <td class="numeric">${p.tackles}</td>
                <td class="numeric">${p.tackleAcc}%</td>
                <td class="numeric">${p.duels}</td>
                <td class="numeric">${p.duelWin}%</td>
                <td class="numeric">${p.dribbles}</td>
                <td class="numeric">${p.dribbleAcc}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  return { init };
})();
