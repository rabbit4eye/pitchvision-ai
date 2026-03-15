#!/bin/bash
# PitchVision AI - Download Pre-trained Model Weights

set -e

MODEL_DIR="models"
mkdir -p "$MODEL_DIR"

echo "=========================================="
echo "PitchVision AI - Model Download Script"
echo "=========================================="

# YOLOv8x base model (auto-downloaded by Ultralytics)
echo ""
echo "[1/3] YOLOv8x base model..."
echo "  → Will be auto-downloaded on first run by Ultralytics"
echo "  → Or download manually: https://github.com/ultralytics/assets/releases/download/v8.1.0/yolov8x.pt"

# Football-specific fine-tuned model
echo ""
echo "[2/3] Football fine-tuned model..."
echo "  → Fine-tune YOLOv8x on football dataset (see docs/ARCHITECTURE.md)"
echo "  → Recommended datasets:"
echo "    - Football Player Detection (Kaggle): https://www.kaggle.com/datasets/iasadpanwhar/football-player-detection-yolov8"
echo "    - SoccerNet: https://www.soccer-net.org/"
echo "    - Roboflow Football Dataset: https://universe.roboflow.com/roboflow-jvuqo/football-players-detection-3zvbc"

# SigLIP model for team classification
echo ""
echo "[3/3] SigLIP model for team classification..."
echo "  → Auto-downloaded by HuggingFace Transformers on first run"
echo "  → Model: google/siglip-base-patch16-224"

echo ""
echo "=========================================="
echo "Setup complete!"
echo ""
echo "To fine-tune YOLOv8 on football data:"
echo "  python -c \"from ultralytics import YOLO; model = YOLO('yolov8x.pt'); model.train(data='football.yaml', epochs=50)\""
echo ""
echo "Model files should be placed in: $MODEL_DIR/"
echo "=========================================="
