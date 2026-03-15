# ⚽ PitchVision AI

**AI-Powered Soccer Match Analysis System — From Single-Camera Footage to Professional Analytics**

[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![YOLOv8](https://img.shields.io/badge/YOLO-v8-orange.svg)](https://github.com/ultralytics/ultralytics)

PitchVision AI transforms single-camera soccer match footage into comprehensive analytics — detecting players by jersey number, tracking movements, classifying events, and generating professional-grade match reports with 90%+ accuracy.

---

## 🎯 What It Does

```
📹 Match Video  →  🤖 AI Pipeline  →  📊 Raw Data (CSV/JSON)  →  📈 Visual Reports
   (Single Camera)    (Detection +      (3000+ events           (Interactive
    + Lineups)         Tracking +        per match)              Dashboard)
                       Classification)
```

### Input Requirements
- **Single camera** match footage (MP4/MOV, 1080p minimum)
- **Jersey numbers** clearly visible on players
- **Team lineups** with corresponding jersey numbers

### Output
- **Structured CSV/JSON** with 19 data fields per event (3000+ events per match)
- **Interactive Dashboard** with 7 analysis sections
- **PDF Match Report** with charts, heatmaps, and comparisons

---

## 📊 Analysis Capabilities

| Category | Metrics |
|----------|---------|
| **Passing** | Pass completion rate, short/long/through ball/cross accuracy, pass matrices (player-to-player), progressive passes, passing direction, field maps, time-series trends |
| **Shooting** | Shot conversion rate, inside/outside box, headers, shot maps, xG-like positioning |
| **Defending** | Tackle success rate, interceptions, clearances, sliding/standing tackles, third distribution |
| **Physical** | Ground/aerial duels won/lost, duel accuracy, spatial distribution |
| **Goalkeeping** | Saves, handling, distribution accuracy, save position maps |
| **Team** | Possession %, field tilt, PPDA, passing chain length, chances created |
| **Individual** | Per-player radar charts, action timelines, comparison stats |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PitchVision AI Pipeline                   │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┤
│ Stage 1  │ Stage 2  │ Stage 3  │ Stage 4  │ Stage 5  │ Stage 6  │
│Detection │Tracking  │ Player   │  Pitch   │  Event   │Analytics │
│          │          │  ID      │ Mapping  │Detection │ Engine   │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ YOLOv8   │ByteTrack │SigLIP +  │Homography│Rule-based│Aggregat- │
│ (player, │(temporal │ UMAP +   │estimation│+ ML      │ion,      │
│  ball,   │ identity │ KMeans   │→ 0-100   │(pass,    │matrices, │
│  referee)│ assoc.)  │+ OCR     │normalize │ shot,    │time-     │
│          │          │(jersey#) │          │ tackle…) │series    │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
                              ↓
                 ┌───────────────────────────┐
                 │   Structured Output       │
                 │  CSV: 19 columns/event    │
                 │  14 attributes            │
                 │  36 sub-attributes        │
                 │  41 action types          │
                 │  80+ descriptions         │
                 └───────────────────────────┘
                              ↓
                 ┌───────────────────────────┐
                 │   Visual Report Dashboard │
                 │  7 analysis tabs          │
                 │  Interactive charts       │
                 │  Field visualizations     │
                 │  Player comparisons       │
                 └───────────────────────────┘
```

---

## 📂 Project Structure

```
pitchvision-ai/
├── README.md                    # This file
├── LICENSE                      # MIT License
├── requirements.txt             # Python dependencies
├── setup.py                     # Package setup
├── Dockerfile                   # Docker container
├── docker-compose.yml           # Full stack deployment
│
├── docs/                        # Documentation
│   ├── PRD-PitchVision-AI.pdf   # Product Requirements Document
│   ├── Hardware-Requirements-PitchVision-AI.pdf
│   ├── ARCHITECTURE.md          # Detailed architecture docs
│   ├── DATA-SCHEMA.md           # CSV/JSON schema reference
│   └── API.md                   # API documentation
│
├── src/                         # Core ML pipeline
│   ├── detection/               # YOLOv8 player/ball detection
│   │   ├── __init__.py
│   │   ├── detector.py          # Main detection class
│   │   └── model_config.py      # Model configurations
│   ├── tracking/                # Multi-object tracking
│   │   ├── __init__.py
│   │   ├── tracker.py           # ByteTrack implementation
│   │   └── reid.py              # Re-identification module
│   ├── classification/          # Team & player classification
│   │   ├── __init__.py
│   │   ├── team_classifier.py   # SigLIP + KMeans team ID
│   │   ├── jersey_ocr.py        # PaddleOCR jersey reader
│   │   └── player_matcher.py    # Lineup matching
│   ├── event_detection/         # Event classification
│   │   ├── __init__.py
│   │   ├── pass_detector.py     # Pass event detection
│   │   ├── shot_detector.py     # Shot event detection
│   │   ├── tackle_detector.py   # Tackle/duel detection
│   │   └── event_classifier.py  # Main event classifier
│   ├── analytics/               # Data aggregation
│   │   ├── __init__.py
│   │   ├── aggregator.py        # Stats aggregation
│   │   ├── pass_matrix.py       # Pass network analysis
│   │   └── kpi_calculator.py    # KPI computation
│   └── report_generator/        # Report output
│       ├── __init__.py
│       ├── csv_exporter.py      # CSV/JSON export
│       └── pdf_generator.py     # PDF report generation
│
├── dashboard/                   # Interactive web dashboard
│   ├── index.html               # Main page
│   ├── css/style.css            # Dark navy theme
│   ├── js/
│   │   ├── app.js               # Tab navigation & rendering
│   │   ├── data-processor.js    # CSV parsing & data processing
│   │   ├── charts.js            # Chart.js visualizations
│   │   ├── pitch.js             # D3.js soccer field renderer
│   │   └── players.js           # Player analysis module
│   └── data/match.csv           # Sample match data
│
├── configs/                     # Configuration files
│   ├── detection.yaml           # Detection model config
│   ├── tracking.yaml            # Tracking parameters
│   └── pipeline.yaml            # Full pipeline config
│
├── models/                      # Pre-trained model weights
│   └── .gitkeep                 # (download via setup script)
│
├── scripts/                     # Utility scripts
│   ├── download_models.sh       # Download pre-trained weights
│   ├── process_match.py         # Full pipeline runner
│   └── generate_report.py       # Report generation script
│
├── tests/                       # Test suite
│   ├── test_detection.py
│   ├── test_tracking.py
│   ├── test_events.py
│   └── test_analytics.py
│
└── data/                        # Data directory
    └── sample/                  # Sample match data
        └── anonymized_match.csv # Example output CSV
```

---

## 🚀 Quick Start

### Option 1: Dashboard Only (View Reports)

```bash
# Clone the repository
git clone https://github.com/your-username/pitchvision-ai.git
cd pitchvision-ai

# Open the dashboard (no installation needed)
cd dashboard
# Open index.html in your browser, or:
python -m http.server 8080
# Visit http://localhost:8080
```

### Option 2: Full Pipeline (Process Videos)

```bash
# Clone the repository
git clone https://github.com/your-username/pitchvision-ai.git
cd pitchvision-ai

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Download pre-trained models
bash scripts/download_models.sh

# Process a match video
python scripts/process_match.py \
  --video path/to/match.mp4 \
  --home-team "Team A" \
  --away-team "Team B" \
  --home-lineup "1,2,3,4,5,6,7,8,9,10,11" \
  --away-lineup "1,2,3,4,5,6,7,8,9,10,11" \
  --output data/output/
```

### Option 3: Docker

```bash
docker-compose up -d
# API available at http://localhost:8000
# Dashboard at http://localhost:8080
```

---

## 📋 Data Schema

The system outputs structured event data with 19 fields per event:

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Unique event identifier |
| `match_id` | int | Match identifier |
| `team_id` | int | Team identifier (1 or 2) |
| `team_name` | string | Team name |
| `player_id` | int | Player identifier |
| `player_name` | string | Player name |
| `jersey_number` | int | Jersey number |
| `attribute` | string | Primary category (14 types: Passing, Defending, Shooting, etc.) |
| `sub_attribute` | string | Sub-category (36 types: Short Pass, Standing Tackle, etc.) |
| `action` | string | Specific action (41 types: Goal, Assist, Simple Pass, etc.) |
| `description` | string | Detailed description (80+ variations) |
| `special_action` | string | Context (Corner, Free Kick, Goal Kick, Foul, or None) |
| `body_part` | string | Left Foot, Right Foot, or No Body Part |
| `start_x` | float | Starting X coordinate (0-100 normalized) |
| `start_y` | float | Starting Y coordinate (0-100 normalized) |
| `end_x` | float | Ending X coordinate (0-100 normalized) |
| `end_y` | float | Ending Y coordinate (0-100 normalized) |
| `timestamp` | time | Game timestamp (H:MM:SS) |
| `period` | string | First Half or Second Half |

---

## 🖥️ Hardware Requirements

| Tier | GPU | Processing Time (90min) | Cost |
|------|-----|------------------------|------|
| **Cloud** (Colab Pro) | T4 16GB | ~4-5 hours | $0.50-1.00/match |
| **Cloud** (AWS g5) | A10G 24GB | ~2-3 hours | $2-4/match |
| **Local** (Recommended) | RTX 4070 Ti 12GB | ~1.5-2 hours | Hardware cost only |
| **Local** (High-Perf) | RTX 4090 24GB | ~45-60 min | Hardware cost only |

> See `docs/Hardware-Requirements-PitchVision-AI.pdf` for detailed specifications including camera requirements, software stack, and deployment architecture.

---

## 🔧 Technology Stack

| Layer | Technology |
|-------|-----------|
| Object Detection | YOLOv8x (Ultralytics) |
| Object Tracking | ByteTrack / DeepSORT |
| Team Classification | SigLIP + UMAP + KMeans |
| Jersey OCR | PaddleOCR |
| Video Processing | OpenCV, FFmpeg |
| ML Framework | PyTorch 2.1+ |
| CV Utilities | Roboflow Supervision |
| Backend API | Python FastAPI |
| Job Queue | Celery + Redis |
| Database | PostgreSQL |
| Dashboard | Vanilla JS + Chart.js + D3.js |
| Containerization | Docker + Docker Compose |

---

## 📖 Documentation

- **[Product Requirements Document](docs/PRD-PitchVision-AI.pdf)** — Full PRD with methodology, user stories, requirements, architecture
- **[Hardware Requirements](docs/Hardware-Requirements-PitchVision-AI.pdf)** — Camera specs, processing tiers, cost estimation
- **[Architecture Guide](docs/ARCHITECTURE.md)** — Detailed pipeline documentation
- **[Data Schema Reference](docs/DATA-SCHEMA.md)** — Complete field definitions and value enumerations

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics) — State-of-the-art object detection
- [StepOut](https://www.stepoutplay.com) — Inspiration for match analysis report format
- [Roboflow Supervision](https://github.com/roboflow/supervision) — Computer vision utilities
- [ByteTrack](https://github.com/ifzhang/ByteTrack) — Multi-object tracking
- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) — OCR for jersey numbers

---

<p align="center">Built with ⚽ by PitchVision AI Team</p>
