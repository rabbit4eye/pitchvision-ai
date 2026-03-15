# PitchVision AI — Data Schema Reference

## CSV Output Format

Each row represents a single match event. A typical 90-minute match generates 2,500-4,000 events.

### Column Definitions

| # | Column | Type | Description | Example |
|---|--------|------|-------------|---------|
| 1 | `id` | integer | Unique auto-increment event ID | 1, 2, 3... |
| 2 | `match_id` | integer | Match identifier | 1 |
| 3 | `team_id` | integer | Team identifier (1=home, 2=away) | 1 |
| 4 | `team_name` | string | Team name | "TeamA" |
| 5 | `player_id` | integer | Player identifier within team | 7 |
| 6 | `player_name` | string | Player display name | "TeamA_P7" |
| 7 | `jersey_number` | integer | Jersey number | 43 |
| 8 | `attribute` | string | Primary event category | "Passing" |
| 9 | `sub_attribute` | string | Event sub-category | "Short Pass" |
| 10 | `action` | string | Specific action type | "Simple Pass" |
| 11 | `description` | string | Detailed action description | "Simple Short Pass" |
| 12 | `special_action` | string | Set-piece or special context | "No Special Action" |
| 13 | `body_part` | string | Body part used | "Right Foot" |
| 14 | `start_x` | float | Starting X position (0-100) | 45.07 |
| 15 | `start_y` | float | Starting Y position (0-100) | 43.15 |
| 16 | `end_x` | float | Ending X position (0-100) | 54.93 |
| 17 | `end_y` | float | Ending Y position (0-100) | 56.85 |
| 18 | `timestamp` | time | Match timestamp (H:MM:SS) | "0:15:23" |
| 19 | `period` | string | Match period | "First Half" |

---

## Enumerated Values

### Attributes (14 types)

| Attribute | Description | Paired With |
|-----------|-------------|-------------|
| `Passing` | Pass initiated by player | `X_Passing` (receive) |
| `X_Passing` | Pass received by player | `Passing` |
| `Defending` | Defensive action by player | `X_Defending` (encountered) |
| `X_Defending` | Defensive action encountered | `Defending` |
| `Shooting` | Shot at goal | — |
| `Dribbling` | Dribble attempt | `X_Dribbling` |
| `X_Dribbling` | Dribble encountered | `Dribbling` |
| `Physical` | Physical contest (duel) | `X_Physical` |
| `X_Physical` | Physical contest encountered | `Physical` |
| `Goalkeeping` | Goalkeeper action | `X_Goalkeeping` |
| `X_Goalkeeping` | GK action encountered | `Goalkeeping` |
| `Special_Actions` | Set pieces, fouls | `X_Special_Actions` |
| `X_Special_Actions` | Set pieces encountered | `Special_Actions` |
| `Pace` | Ball carry/movement | — |

### Sub-Attributes (36 types)

**Passing:** Short Pass, Long Pass, Through Ball, Crossing, Short Pass Recieve, Long Pass Recieve, Through Ball Recieve, Cross Recieve

**Defending:** Standing Tackle, Sliding Tackle, Interception, Clearance, Standing Tackle Encountered, Sliding Tackle Encountered, Interception Encountered

**Shooting:** Close Shot, Long Shot, Heading

**Physical:** Ground Duels, Aerial Duels, Ground Duel Encountered, Aerial Duel Encountered

**Dribbling:** Dribbling, Dribbling Encountered

**Goalkeeping:** Saves, Handling, Goalkeeper Throw, Goalkeeper Throw Received

**Other:** Pace, Pressure, Pressure Encountered, Offside, Handball, Throw In, Throw In Received, Difficult Receives

### Actions (41 types)

**Positive Actions:** Goal, Assist, Assist Throw, Key Pass, Key Shot Saved, Key Ball Handled, Simple Pass, Simple Throw, Simple Shot, Simple Header, Successful, Duel Won, Intercepted Crucial, Intercepted Simple, Tackled Crucial, Tackled Simple, Dribble Resisted, Pressed Evaded, Pressed Simple

**Negative Actions:** Unsuccessful, Off Target, Hit Goal Post, Goal Conceded, Duel Lost, Dribbled Past Crucial, Dribbled Past Simple, Tackle Evaded

**Receive Actions:** Received Simple Pass, Received Key Pass, Received Assist, Received Assist Throw, Received Unsuccessful

**Other:** Ball Carry Short, Ball Carry Medium, Ball Carry Long, Handball, Offside, Crucial, Simple Shot Saved, Loose Ball Handled

### Special Actions (5 types)

| Value | Description |
|-------|-------------|
| `No Special Action` | Open play event |
| `Corner` | Corner kick context |
| `Free Kick` | Free kick context |
| `Goal Kick` | Goal kick context |
| `Simple Foul` | Foul committed |

### Body Parts (3 types)

| Value | Description |
|-------|-------------|
| `Right Foot` | Action with right foot |
| `Left Foot` | Action with left foot |
| `No Body Part` | Receive events, aerial duels, etc. |

### Periods (2 types)

| Value | Description |
|-------|-------------|
| `First Half` | First half of match |
| `Second Half` | Second half of match |

---

## Coordinate System

```
100 ┌─────────────────────────────────┐
    │                                 │
    │          TEAM B GOAL            │
    │   ┌─────────────────────┐       │
    │   │    PENALTY AREA     │       │
    │   └─────────────────────┘       │
    │                                 │
 50 │ ─ ─ ─ ─ HALFWAY LINE ─ ─ ─ ─ ─ │
    │                                 │
    │   ┌─────────────────────┐       │
    │   │    PENALTY AREA     │       │
    │   └─────────────────────┘       │
    │          TEAM A GOAL            │
    │                                 │
  0 └─────────────────────────────────┘
    0                                100
```

- **X axis (0→100):** Left touchline to right touchline
- **Y axis (0→100):** Bottom touchline to top touchline (Team A attacks upward in first half)
- All coordinates normalized regardless of actual pitch dimensions

---

## Event Pairing

Primary events are paired with corresponding "encounter" events (prefixed with `X_`). Both events share the same `timestamp` and complementary `start_x/start_y` coordinates.

**Example: A short pass from Player A to Player B**
```
Row 1: attribute=Passing, sub_attribute=Short Pass, player=TeamA_P7, action=Simple Pass
Row 2: attribute=X_Passing, sub_attribute=Short Pass Recieve, player=TeamA_P14, action=Received Simple Pass
```

Both rows have the same timestamp. Row 1's end_x/end_y matches Row 2's start_x/start_y.
