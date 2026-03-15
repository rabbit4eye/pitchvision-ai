/**
 * PitchVision AI - Data Processor
 * Parses CSV and computes all match analytics
 */

const DataProcessor = (() => {
  let allEvents = [];
  let teamAName = '';
  let teamBName = '';

  function parseTimestamp(ts) {
    if (!ts) return 0;
    const parts = ts.split(':');
    if (parts.length === 3) {
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
    return 0;
  }

  function getMinute(seconds) {
    return Math.floor(seconds / 60);
  }

  async function loadCSV(url) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          allEvents = results.data.map(row => ({
            ...row,
            _seconds: parseTimestamp(row.timestamp),
            _minute: getMinute(parseTimestamp(row.timestamp))
          }));
          // Determine team names
          const teams = [...new Set(allEvents.map(e => e.team_name).filter(Boolean))];
          teamAName = teams[0] || 'TeamA';
          teamBName = teams[1] || 'TeamB';
          resolve(allEvents);
        },
        error: reject
      });
    });
  }

  function getAllEvents() { return allEvents; }
  function getTeamNames() { return { home: teamAName, away: teamBName }; }

  function getTeamEvents(teamName) {
    return allEvents.filter(e => e.team_name === teamName);
  }

  function getPlayerEvents(playerName) {
    return allEvents.filter(e => e.player_name === playerName);
  }

  function getEventsByAttribute(attribute, teamName) {
    let evts = allEvents.filter(e => e.attribute === attribute);
    if (teamName) evts = evts.filter(e => e.team_name === teamName);
    return evts;
  }

  function getEventsBySubAttribute(subAttr, teamName) {
    let evts = allEvents.filter(e => e.sub_attribute === subAttr);
    if (teamName) evts = evts.filter(e => e.team_name === teamName);
    return evts;
  }

  function getTimeIntervals(events, intervalMinutes) {
    const intervals = {};
    events.forEach(e => {
      const bucket = Math.floor(e._minute / intervalMinutes) * intervalMinutes;
      if (!intervals[bucket]) intervals[bucket] = [];
      intervals[bucket].push(e);
    });
    return intervals;
  }

  function getMaxMinute() {
    return Math.max(...allEvents.map(e => e._minute), 0);
  }

  // ===== KPI CALCULATIONS =====

  function countGoals(teamName) {
    return getEventsByAttribute('Shooting', teamName).filter(e => e.action === 'Goal').length;
  }

  function countAssists(teamName) {
    return getEventsByAttribute('Passing', teamName).filter(e => e.action === 'Assist' || e.action === 'Key Pass').filter(e => e.action === 'Assist').length;
  }

  function countTotalShots(teamName) {
    return getEventsByAttribute('Shooting', teamName).length;
  }

  function countShotsOnTarget(teamName) {
    const shots = getEventsByAttribute('Shooting', teamName);
    return shots.filter(e => e.action === 'Goal' || e.action === 'Simple Shot Saved' || e.action === 'Key Shot Saved' || e.action === 'Hit Goal Post').length;
  }

  function shotConversionRate(teamName) {
    const total = countTotalShots(teamName);
    if (total === 0) return 0;
    return ((countGoals(teamName) / total) * 100).toFixed(1);
  }

  function countChancesCreated(teamName) {
    const passes = getEventsByAttribute('Passing', teamName);
    return passes.filter(e => e.action === 'Assist' || e.action === 'Key Pass').length;
  }

  function countPassesCompleted(teamName) {
    const passes = getEventsByAttribute('Passing', teamName);
    return passes.filter(e => e.action === 'Simple Pass' || e.action === 'Assist' || e.action === 'Key Pass' || e.action === 'Assist Throw' || e.action === 'Simple Throw').length;
  }

  function countPassesAttempted(teamName) {
    return getEventsByAttribute('Passing', teamName).length;
  }

  function calculatePossession() {
    const homePassCount = getEventsByAttribute('Passing', teamAName).length +
                          getEventsByAttribute('Dribbling', teamAName).length +
                          getEventsByAttribute('Pace', teamAName).length;
    const awayPassCount = getEventsByAttribute('Passing', teamBName).length +
                          getEventsByAttribute('Dribbling', teamBName).length +
                          getEventsByAttribute('Pace', teamBName).length;
    const total = homePassCount + awayPassCount;
    if (total === 0) return { home: 50, away: 50 };
    return {
      home: ((homePassCount / total) * 100).toFixed(1),
      away: ((awayPassCount / total) * 100).toFixed(1)
    };
  }

  function countSuccessfulTackles(teamName) {
    const tackles = getEventsByAttribute('Defending', teamName)
      .filter(e => e.sub_attribute === 'Standing Tackle' || e.sub_attribute === 'Sliding Tackle');
    return tackles.filter(e => e.action === 'Successful' || e.action === 'Crucial').length;
  }

  function countSuccessfulInterceptions(teamName) {
    const interceptions = getEventsByAttribute('Defending', teamName)
      .filter(e => e.sub_attribute === 'Interception');
    return interceptions.filter(e => e.action === 'Successful' || e.action === 'Crucial').length;
  }

  function countDuelsWon(teamName) {
    const physical = getEventsByAttribute('Physical', teamName);
    return physical.filter(e => e.action === 'Duel Won').length;
  }

  function countTotalSaves(teamName) {
    return getEventsByAttribute('Goalkeeping', teamName)
      .filter(e => e.sub_attribute === 'Saves').length;
  }

  function countFouls(teamName) {
    // Fouls are from Special_Actions or fouls drawn
    const specials = getEventsByAttribute('Special_Actions', teamName);
    return specials.filter(e => e.description && e.description.toLowerCase().includes('foul')).length;
  }

  function calculatePPDA(teamName) {
    // PPDA = passes allowed / defensive actions in attacking third (opponent passes in their def third / our defensive actions in their def third)
    const opponentName = teamName === teamAName ? teamBName : teamAName;
    const opponentPasses = getEventsByAttribute('Passing', opponentName);
    const defActions = getEventsByAttribute('Defending', teamName);
    const pressures = getEventsBySubAttribute('Pressure', teamName);
    const totalDefActions = defActions.length + pressures.length;
    if (totalDefActions === 0) return 0;
    return (opponentPasses.length / totalDefActions).toFixed(1);
  }

  function countProgressivePasses(teamName) {
    const passes = getEventsByAttribute('Passing', teamName);
    return passes.filter(e => {
      if (e.start_x == null || e.end_x == null) return false;
      // For home team, attacking direction is toward higher x; for away toward lower x
      // But since coordinates are normalized per team perspective, we consider forward as end_x > start_x
      const dx = e.end_x - e.start_x;
      // Progressive pass: moves ball significantly toward opponent goal
      return dx > 10; // 10% of pitch forward
    }).length;
  }

  function calculateFieldTilt() {
    // Field tilt: % of passes in final third
    const homePassesFinalThird = getEventsByAttribute('Passing', teamAName)
      .filter(e => e.start_x > 66.67).length;
    const awayPassesFinalThird = getEventsByAttribute('Passing', teamBName)
      .filter(e => e.start_x > 66.67).length;
    const total = homePassesFinalThird + awayPassesFinalThird;
    if (total === 0) return { home: 50, away: 50 };
    return {
      home: ((homePassesFinalThird / total) * 100).toFixed(1),
      away: ((awayPassesFinalThird / total) * 100).toFixed(1)
    };
  }

  function avgPassingChainLength(teamName) {
    // Estimate: count consecutive pass events for the team and average chain length
    const events = allEvents.filter(e => e.team_name === teamName);
    let chains = [];
    let currentChain = 0;
    for (const e of events) {
      if (e.attribute === 'Passing' || e.attribute === 'X_Passing') {
        currentChain++;
      } else {
        if (currentChain > 0) {
          chains.push(Math.ceil(currentChain / 2)); // divide by 2 because pass+receive = 1 pass
          currentChain = 0;
        }
      }
    }
    if (currentChain > 0) chains.push(Math.ceil(currentChain / 2));
    if (chains.length === 0) return 0;
    return (chains.reduce((a, b) => a + b, 0) / chains.length).toFixed(1);
  }

  function getOverviewKPIs() {
    const possession = calculatePossession();
    const fieldTilt = calculateFieldTilt();
    return [
      { label: 'Goals', home: countGoals(teamAName), away: countGoals(teamBName) },
      { label: 'Assists', home: countAssists(teamAName), away: countAssists(teamBName) },
      { label: 'Total Shots', home: countTotalShots(teamAName), away: countTotalShots(teamBName) },
      { label: 'Shots on Target', home: countShotsOnTarget(teamAName), away: countShotsOnTarget(teamBName) },
      { label: 'Shot Conv. Rate', home: shotConversionRate(teamAName) + '%', away: shotConversionRate(teamBName) + '%' },
      { label: 'Chances Created', home: countChancesCreated(teamAName), away: countChancesCreated(teamBName) },
      { label: 'Passes Completed', home: countPassesCompleted(teamAName), away: countPassesCompleted(teamBName) },
      { label: 'Possession %', home: possession.home + '%', away: possession.away + '%' },
      { label: 'Tackles Won', home: countSuccessfulTackles(teamAName), away: countSuccessfulTackles(teamBName) },
      { label: 'Interceptions', home: countSuccessfulInterceptions(teamAName), away: countSuccessfulInterceptions(teamBName) },
      { label: 'Duels Won', home: countDuelsWon(teamAName), away: countDuelsWon(teamBName) },
      { label: 'Total Saves', home: countTotalSaves(teamAName), away: countTotalSaves(teamBName) },
      { label: 'Fouls', home: countFouls(teamAName), away: countFouls(teamBName) },
      { label: 'PPDA', home: calculatePPDA(teamAName), away: calculatePPDA(teamBName) },
      { label: 'Prog. Passes', home: countProgressivePasses(teamAName), away: countProgressivePasses(teamBName) },
      { label: 'Field Tilt %', home: fieldTilt.home + '%', away: fieldTilt.away + '%' },
      { label: 'Avg Chain Len.', home: avgPassingChainLength(teamAName), away: avgPassingChainLength(teamBName) },
    ];
  }

  // ===== PASSING ANALYSIS =====

  function getPassingStats(teamName) {
    const passes = getEventsByAttribute('Passing', teamName);
    const successful = passes.filter(e =>
      e.action === 'Simple Pass' || e.action === 'Assist' || e.action === 'Key Pass' ||
      e.action === 'Assist Throw' || e.action === 'Simple Throw'
    ).length;
    const unsuccessful = passes.filter(e =>
      e.action === 'Unsuccessful'
    ).length;
    return { total: passes.length, successful, unsuccessful: passes.length - successful };
  }

  function getPassTypeBreakdown(teamName) {
    const passes = getEventsByAttribute('Passing', teamName);
    const types = ['Short Pass', 'Long Pass', 'Through Ball', 'Crossing'];
    return types.map(type => {
      const ofType = passes.filter(e => e.sub_attribute === type);
      const success = ofType.filter(e =>
        e.action === 'Simple Pass' || e.action === 'Assist' || e.action === 'Key Pass' ||
        e.action === 'Assist Throw' || e.action === 'Simple Throw'
      ).length;
      return {
        type,
        total: ofType.length,
        success,
        fail: ofType.length - success
      };
    });
  }

  function getPassTimeSeries(teamName, intervalMin) {
    const passes = getEventsByAttribute('Passing', teamName)
      .filter(e => e.sub_attribute === 'Short Pass' || e.sub_attribute === 'Long Pass');
    const intervals = getTimeIntervals(passes, intervalMin);
    const maxMin = getMaxMinute();
    const result = [];
    for (let m = 0; m <= maxMin; m += intervalMin) {
      const bucket = intervals[m] || [];
      const total = bucket.length;
      const successful = bucket.filter(e =>
        e.action === 'Simple Pass' || e.action === 'Assist' || e.action === 'Key Pass'
      ).length;
      result.push({
        minute: m,
        total,
        successful,
        accuracy: total > 0 ? ((successful / total) * 100).toFixed(1) : 0
      });
    }
    return result;
  }

  function getPassDirections(teamName) {
    const passes = getEventsByAttribute('Passing', teamName);
    let forward = 0, backward = 0, lateral = 0;
    passes.forEach(e => {
      if (e.start_x == null || e.end_x == null || e.start_y == null || e.end_y == null) return;
      const dx = e.end_x - e.start_x;
      const dy = Math.abs(e.end_y - e.start_y);
      if (dx > 5) forward++;
      else if (dx < -5) backward++;
      else lateral++;
    });
    return { forward, backward, lateral };
  }

  function calculatePassMatrix(teamName) {
    // Build player-to-player pass connections from consecutive Passing + X_Passing events
    const teamEvents = allEvents.filter(e => e.team_name === teamName);
    const players = [...new Set(teamEvents.map(e => e.player_name))].sort();
    const matrix = {};
    players.forEach(p => {
      matrix[p] = {};
      players.forEach(q => { matrix[p][q] = 0; });
    });

    // Look through all events for Passing followed by X_Passing
    for (let i = 0; i < allEvents.length - 1; i++) {
      const curr = allEvents[i];
      const next = allEvents[i + 1];
      if (curr.team_name === teamName && next.team_name === teamName &&
          curr.attribute === 'Passing' && next.attribute === 'X_Passing' &&
          curr.player_name && next.player_name &&
          matrix[curr.player_name] && matrix[curr.player_name][next.player_name] !== undefined) {
        matrix[curr.player_name][next.player_name]++;
      }
    }
    return { players, matrix };
  }

  function getPassLines(teamName) {
    const passes = getEventsByAttribute('Passing', teamName);
    return passes.filter(e =>
      e.start_x != null && e.start_y != null && e.end_x != null && e.end_y != null
    ).map(e => ({
      x1: e.start_x, y1: e.start_y,
      x2: e.end_x, y2: e.end_y,
      successful: e.action !== 'Unsuccessful',
      type: e.sub_attribute
    }));
  }

  // ===== SHOOTING ANALYSIS =====

  function getShootingStats(teamName) {
    const shots = getEventsByAttribute('Shooting', teamName);
    const goals = shots.filter(e => e.action === 'Goal').length;
    const onTarget = shots.filter(e =>
      e.action === 'Simple Shot Saved' || e.action === 'Key Shot Saved' || e.action === 'Goal' || e.action === 'Hit Goal Post'
    ).length;
    const offTarget = shots.filter(e => e.action === 'Off Target').length;
    
    const insideBox = shots.filter(e => e.sub_attribute === 'Close Shot').length;
    const outsideBox = shots.filter(e => e.sub_attribute === 'Long Shot').length;
    const headers = shots.filter(e => e.sub_attribute === 'Heading').length;
    
    return { total: shots.length, goals, onTarget, offTarget, insideBox, outsideBox, headers };
  }

  function getShotPositions(teamName) {
    return getEventsByAttribute('Shooting', teamName).filter(e =>
      e.start_x != null && e.start_y != null
    ).map(e => ({
      x: e.start_x,
      y: e.start_y,
      result: e.action === 'Goal' ? 'goal' :
              (e.action === 'Simple Shot Saved' || e.action === 'Key Shot Saved' || e.action === 'Hit Goal Post') ? 'on-target' : 'off-target',
      player: e.player_name,
      type: e.sub_attribute,
      description: e.description
    }));
  }

  function getShootingTimeSeries(teamName, intervalMin) {
    const shots = getEventsByAttribute('Shooting', teamName);
    const intervals = getTimeIntervals(shots, intervalMin);
    const maxMin = getMaxMinute();
    const result = [];
    for (let m = 0; m <= maxMin; m += intervalMin) {
      result.push({
        minute: m,
        count: (intervals[m] || []).length
      });
    }
    return result;
  }

  // ===== DEFENDING ANALYSIS =====

  function getDefendingStats(teamName) {
    const defending = getEventsByAttribute('Defending', teamName);
    const standingTackles = defending.filter(e => e.sub_attribute === 'Standing Tackle');
    const slidingTackles = defending.filter(e => e.sub_attribute === 'Sliding Tackle');
    const interceptions = defending.filter(e => e.sub_attribute === 'Interception');
    const clearances = defending.filter(e => e.sub_attribute === 'Clearance');

    return {
      standingTackles: {
        total: standingTackles.length,
        successful: standingTackles.filter(e => e.action === 'Successful' || e.action === 'Crucial').length
      },
      slidingTackles: {
        total: slidingTackles.length,
        successful: slidingTackles.filter(e => e.action === 'Successful' || e.action === 'Crucial').length
      },
      interceptions: {
        total: interceptions.length,
        successful: interceptions.filter(e => e.action === 'Successful' || e.action === 'Crucial').length
      },
      clearances: {
        total: clearances.length,
        successful: clearances.filter(e => e.action === 'Successful' || e.action === 'Crucial').length
      }
    };
  }

  function getDefendingTimeSeries(teamName, intervalMin) {
    const defending = getEventsByAttribute('Defending', teamName);
    const maxMin = getMaxMinute();
    const result = [];
    for (let m = 0; m <= maxMin; m += intervalMin) {
      const bucket = defending.filter(e => {
        const bucketStart = m;
        const bucketEnd = m + intervalMin;
        return e._minute >= bucketStart && e._minute < bucketEnd;
      });
      const tackles = bucket.filter(e => e.sub_attribute === 'Standing Tackle' || e.sub_attribute === 'Sliding Tackle');
      const interceptions = bucket.filter(e => e.sub_attribute === 'Interception');
      const clearances = bucket.filter(e => e.sub_attribute === 'Clearance');
      const tackleSuccess = tackles.filter(e => e.action === 'Successful' || e.action === 'Crucial').length;
      result.push({
        minute: m,
        tackles: tackles.length,
        interceptions: interceptions.length,
        clearances: clearances.length,
        tackleAccuracy: tackles.length > 0 ? ((tackleSuccess / tackles.length) * 100).toFixed(1) : 0
      });
    }
    return result;
  }

  function getDefensivePositions(teamName) {
    return getEventsByAttribute('Defending', teamName).filter(e =>
      e.start_x != null && e.start_y != null
    ).map(e => ({
      x: e.start_x,
      y: e.start_y,
      type: e.sub_attribute,
      success: e.action === 'Successful' || e.action === 'Crucial',
      player: e.player_name
    }));
  }

  function getThirdDistribution(events) {
    let def = 0, mid = 0, att = 0;
    events.forEach(e => {
      if (e.start_x == null) return;
      if (e.start_x <= 33.33) def++;
      else if (e.start_x <= 66.67) mid++;
      else att++;
    });
    const total = def + mid + att;
    if (total === 0) return { def: 0, mid: 0, att: 0 };
    return {
      def: ((def / total) * 100).toFixed(1),
      mid: ((mid / total) * 100).toFixed(1),
      att: ((att / total) * 100).toFixed(1)
    };
  }

  // ===== PHYSICAL ANALYSIS =====

  function getPhysicalStats(teamName) {
    const physical = getEventsByAttribute('Physical', teamName);
    const groundDuels = physical.filter(e => e.sub_attribute === 'Ground Duels');
    const aerialDuels = physical.filter(e => e.sub_attribute === 'Aerial Duels');
    return {
      groundDuels: {
        total: groundDuels.length,
        won: groundDuels.filter(e => e.action === 'Duel Won').length,
        lost: groundDuels.filter(e => e.action === 'Duel Lost').length
      },
      aerialDuels: {
        total: aerialDuels.length,
        won: aerialDuels.filter(e => e.action === 'Duel Won').length,
        lost: aerialDuels.filter(e => e.action === 'Duel Lost').length
      }
    };
  }

  function getPhysicalTimeSeries(teamName, intervalMin) {
    const physical = getEventsByAttribute('Physical', teamName);
    const maxMin = getMaxMinute();
    const result = [];
    for (let m = 0; m <= maxMin; m += intervalMin) {
      const bucket = physical.filter(e => e._minute >= m && e._minute < m + intervalMin);
      result.push({
        minute: m,
        total: bucket.length,
        won: bucket.filter(e => e.action === 'Duel Won').length,
        lost: bucket.filter(e => e.action === 'Duel Lost').length
      });
    }
    return result;
  }

  function getPhysicalPositions(teamName) {
    return getEventsByAttribute('Physical', teamName).filter(e =>
      e.start_x != null && e.start_y != null
    ).map(e => ({
      x: e.start_x,
      y: e.start_y,
      type: e.sub_attribute,
      won: e.action === 'Duel Won',
      player: e.player_name
    }));
  }

  // ===== GOALKEEPING ANALYSIS =====

  function getGoalkeepingStats(teamName) {
    const gk = getEventsByAttribute('Goalkeeping', teamName);
    const saves = gk.filter(e => e.sub_attribute === 'Saves');
    const handling = gk.filter(e => e.sub_attribute === 'Handling');
    const throws = gk.filter(e => e.sub_attribute === 'Goalkeeper Throw');
    return {
      saves: {
        total: saves.length,
        simple: saves.filter(e => e.action === 'Simple Shot Saved').length,
        key: saves.filter(e => e.action === 'Key Shot Saved').length
      },
      handling: {
        total: handling.length,
        key: handling.filter(e => e.action === 'Key Ball Handled').length,
        loose: handling.filter(e => e.action === 'Loose Ball Handled').length
      },
      throws: {
        total: throws.length,
        successful: throws.filter(e => e.action === 'Simple Throw' || e.action === 'Assist Throw').length,
        unsuccessful: throws.filter(e => e.action === 'Unsuccessful').length
      }
    };
  }

  function getGKThrowTimeSeries(teamName, intervalMin) {
    const throws = getEventsByAttribute('Goalkeeping', teamName)
      .filter(e => e.sub_attribute === 'Goalkeeper Throw');
    const maxMin = getMaxMinute();
    const result = [];
    for (let m = 0; m <= maxMin; m += intervalMin) {
      const bucket = throws.filter(e => e._minute >= m && e._minute < m + intervalMin);
      const succ = bucket.filter(e => e.action === 'Simple Throw' || e.action === 'Assist Throw').length;
      result.push({
        minute: m,
        total: bucket.length,
        successful: succ,
        accuracy: bucket.length > 0 ? ((succ / bucket.length) * 100).toFixed(1) : null
      });
    }
    return result;
  }

  function getSavePositions(teamName) {
    return getEventsByAttribute('Goalkeeping', teamName)
      .filter(e => e.sub_attribute === 'Saves' && e.start_x != null && e.start_y != null)
      .map(e => ({
        x: e.start_x, y: e.start_y,
        type: e.action,
        player: e.player_name
      }));
  }

  // ===== PLAYER ANALYSIS =====

  function getTeamPlayers(teamName) {
    const teamEvts = getTeamEvents(teamName);
    const playerMap = {};
    teamEvts.forEach(e => {
      if (!playerMap[e.player_name]) {
        playerMap[e.player_name] = {
          name: e.player_name,
          jersey: e.jersey_number,
          events: 0
        };
      }
      playerMap[e.player_name].events++;
    });
    return Object.values(playerMap).sort((a, b) => a.jersey - b.jersey);
  }

  function getPlayerStats(playerName) {
    const events = getPlayerEvents(playerName);
    
    const passing = events.filter(e => e.attribute === 'Passing');
    const passSuccess = passing.filter(e =>
      e.action === 'Simple Pass' || e.action === 'Assist' || e.action === 'Key Pass' ||
      e.action === 'Assist Throw' || e.action === 'Simple Throw'
    ).length;
    
    const shooting = events.filter(e => e.attribute === 'Shooting');
    const goals = shooting.filter(e => e.action === 'Goal').length;
    const shotsOnTarget = shooting.filter(e =>
      e.action === 'Goal' || e.action === 'Simple Shot Saved' || e.action === 'Key Shot Saved'
    ).length;
    
    const defending = events.filter(e => e.attribute === 'Defending');
    const defSuccess = defending.filter(e => e.action === 'Successful' || e.action === 'Crucial').length;
    
    const physical = events.filter(e => e.attribute === 'Physical');
    const duelsWon = physical.filter(e => e.action === 'Duel Won').length;
    
    const dribbling = events.filter(e => e.attribute === 'Dribbling');
    const dribbleSuccess = dribbling.filter(e => e.action === 'Successful').length;

    return {
      passing: { total: passing.length, successful: passSuccess, accuracy: passing.length > 0 ? ((passSuccess / passing.length) * 100).toFixed(1) : 0 },
      shooting: { total: shooting.length, goals, onTarget: shotsOnTarget },
      defending: { total: defending.length, successful: defSuccess, accuracy: defending.length > 0 ? ((defSuccess / defending.length) * 100).toFixed(1) : 0 },
      physical: { total: physical.length, won: duelsWon, accuracy: physical.length > 0 ? ((duelsWon / physical.length) * 100).toFixed(1) : 0 },
      dribbling: { total: dribbling.length, successful: dribbleSuccess, accuracy: dribbling.length > 0 ? ((dribbleSuccess / dribbling.length) * 100).toFixed(1) : 0 }
    };
  }

  function getPlayerRadarData(playerName) {
    const stats = getPlayerStats(playerName);
    return {
      labels: ['Passing', 'Shooting', 'Defending', 'Physical', 'Dribbling'],
      values: [
        parseFloat(stats.passing.accuracy) || 0,
        stats.shooting.total > 0 ? Math.min((stats.shooting.goals / stats.shooting.total) * 100 + 40, 100) : 0,
        parseFloat(stats.defending.accuracy) || 0,
        parseFloat(stats.physical.accuracy) || 0,
        parseFloat(stats.dribbling.accuracy) || 0
      ]
    };
  }

  function getPlayerTimeline(playerName) {
    return getPlayerEvents(playerName)
      .filter(e => !e.attribute.startsWith('X_') && e.attribute !== 'Pace')
      .map(e => ({
        minute: e._minute,
        timestamp: e.timestamp,
        attribute: e.attribute,
        subAttribute: e.sub_attribute,
        action: e.action,
        description: e.description
      }));
  }

  function getAllPlayerSummary(teamName) {
    const players = getTeamPlayers(teamName);
    return players.map(p => {
      const stats = getPlayerStats(p.name);
      return {
        name: p.name,
        jersey: p.jersey,
        passes: stats.passing.total,
        passAcc: stats.passing.accuracy,
        shots: stats.shooting.total,
        goals: stats.shooting.goals,
        tackles: stats.defending.total,
        tackleAcc: stats.defending.accuracy,
        duels: stats.physical.total,
        duelWin: stats.physical.accuracy,
        dribbles: stats.dribbling.total,
        dribbleAcc: stats.dribbling.accuracy
      };
    });
  }

  // Public API
  return {
    loadCSV,
    getAllEvents,
    getTeamNames,
    getTeamEvents,
    getPlayerEvents,
    getEventsByAttribute,
    getEventsBySubAttribute,
    getTimeIntervals,
    getMaxMinute,
    getOverviewKPIs,
    getPassingStats,
    getPassTypeBreakdown,
    getPassTimeSeries,
    getPassDirections,
    calculatePassMatrix,
    getPassLines,
    getShootingStats,
    getShotPositions,
    getShootingTimeSeries,
    getDefendingStats,
    getDefendingTimeSeries,
    getDefensivePositions,
    getThirdDistribution,
    getPhysicalStats,
    getPhysicalTimeSeries,
    getPhysicalPositions,
    getGoalkeepingStats,
    getGKThrowTimeSeries,
    getSavePositions,
    getTeamPlayers,
    getPlayerStats,
    getPlayerRadarData,
    getPlayerTimeline,
    getAllPlayerSummary,
    countGoals,
    calculatePossession,
    shotConversionRate
  };
})();
