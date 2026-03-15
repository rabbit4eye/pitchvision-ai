# PitchVision AI — Architecture Document

## Pipeline Overview

The PitchVision AI system processes soccer match footage through a 6-stage ML pipeline to produce structured event data and visual analytics reports.

```
Video Input → Detection → Tracking → Classification → Event Detection → Analytics → Report
```

---

## Stage 1: Object Detection

**Model:** YOLOv8x fine-tuned on football dataset
**Classes:** player, goalkeeper, referee, ball
**Input:** Video frames at native resolution
**Output:** Bounding boxes with class labels and confidence scores

### Process
1. Extract frames from video (configurable FPS, default: 10 fps for detection)
2. Run YOLOv8 inference on each frame
3. Filter detections by confidence threshold (default: 0.5)
4. NMS (Non-Maximum Suppression) to eliminate duplicate detections
5. Output: `[frame_id, class, x1, y1, x2, y2, confidence]`

### Performance Targets
- mAP@0.5: >90% for players/goalkeeper
- mAP@0.5: >70% for ball (smaller object, frequent occlusion)
- Inference speed: >30 FPS on RTX 4070 Ti

---

## Stage 2: Multi-Object Tracking

**Algorithm:** ByteTrack (primary) with DeepSORT fallback
**Purpose:** Maintain consistent identity across frames

### Process
1. Associate detections across frames using IoU + appearance features
2. Handle occlusions with Kalman filter prediction
3. Re-identification for lost tracks using appearance embeddings
4. Output: `[frame_id, track_id, class, x1, y1, x2, y2]`

### Key Parameters
- IoU threshold: 0.3 (association)
- Track buffer: 30 frames (lost track retention)
- Minimum track length: 10 frames (noise filtering)

---

## Stage 3: Player Identification

### 3a. Team Classification
**Method:** SigLIP visual embeddings + UMAP + KMeans(k=2)

1. Crop player bounding boxes from key frames
2. Extract visual features using SigLIP (jersey color/pattern dominant)
3. Reduce dimensionality with UMAP (2D embedding)
4. Cluster with KMeans (k=2 for two teams)
5. Assign goalkeeper separately (already classified by detector)

### 3b. Jersey Number OCR
**Method:** PaddleOCR with attention mechanism

1. Crop torso region from player bounding boxes
2. Enhance contrast and apply super-resolution if needed
3. Run OCR with number-focused recognition
4. Temporal voting: aggregate OCR results across multiple frames per track
5. Match OCR result to provided lineup

### 3c. Player-Lineup Matching
1. Combine team classification + jersey OCR
2. Match detected jersey numbers to provided lineup data
3. Resolve conflicts using temporal consistency
4. Assign player identity to each track

---

## Stage 4: Pitch Mapping & Coordinate Normalization

**Method:** Deep learning keypoint detection → Homography estimation

1. Detect pitch keypoints (corners, penalty spots, center circle, etc.)
2. Estimate homography matrix from detected keypoints to standard pitch template
3. Transform all player/ball positions to normalized coordinate space (0-100 on both axes)
4. Handle camera movement with per-frame or per-segment homography updates

### Coordinate System
- X axis: 0 (left touchline) → 100 (right touchline)
- Y axis: 0 (bottom touchline) → 100 (top touchline)
- Teams assigned attack direction per half

---

## Stage 5: Event Detection

**Method:** Hybrid rule-based + ML classification

### Pass Detection
- **Trigger:** Ball possession transfer between same-team players
- **Rules:** Ball within 3m of passer → ball trajectory → ball within 3m of receiver
- **Sub-classification:** Short (<25m), Long (>25m), Through Ball (into space behind defense), Cross (from wide areas)
- **Direction:** Forward/Backward/Lateral based on start_x vs end_x

### Shot Detection
- **Trigger:** Ball directed toward goal area with velocity threshold
- **Sub-classification:** Inside box, Outside box, Header
- **Result:** Goal, On-target (saved), Off-target, Hit post
- **Special:** Requires goal frame detection

### Tackle Detection
- **Trigger:** Two opposing players within proximity + ball possession change
- **Sub-classification:** Standing tackle, Sliding tackle
- **Result:** Successful (ball won), Unsuccessful (dribbled past/foul)

### Duel Detection
- **Trigger:** Two opposing players contest for ball
- **Sub-classification:** Ground duel, Aerial duel
- **Result:** Won, Lost

### Other Events
- **Interception:** Ball trajectory intercepted by opposing player
- **Clearance:** Ball kicked away from defensive zone
- **Dribble:** Player carries ball past opponent
- **Foul:** Contact + free kick position change
- **Offside:** Player position relative to defensive line at pass moment

---

## Stage 6: Analytics Engine

### Aggregation
1. Group events by match, team, player, time interval
2. Calculate success/attempt ratios for each event type
3. Build time-series data (per 5-min intervals)
4. Construct pass matrices (player-to-player)
5. Calculate derived metrics (possession, PPDA, field tilt, progressive passes)

### KPI Calculations
- **Possession:** Percentage of time each team controls the ball (pass chain duration)
- **PPDA:** Passes Per Defensive Action = opponent passes / (tackles + interceptions in opponent half)
- **Field Tilt:** Percentage of passes in final third vs total final-third passes
- **Progressive Passes:** Passes that move ball >10m toward goal
- **Passing Chain Length:** Average number of consecutive passes before possession loss

---

## Data Output Schema

19 columns per event row. See DATA-SCHEMA.md for complete reference.

### Event Volume
- Typical match: 2,500-4,000 events
- Includes both primary actions (Passing, Shooting, etc.) and corresponding encounter events (X_Passing = pass received, X_Defending = tackle encountered, etc.)

---

## Dashboard Architecture

### Frontend Stack
- **HTML5 + CSS3** — Semantic markup, responsive grid layout
- **Chart.js** — Line charts, bar charts, doughnut charts, radar charts
- **D3.js** — Soccer pitch visualizations (heatmaps, pass maps, shot maps)
- **Papa Parse** — Client-side CSV parsing

### Data Flow
```
CSV File → Papa Parse → JavaScript Data Store → Chart/Viz Renderers → DOM
```

All data processing happens client-side. No server required for the dashboard.
