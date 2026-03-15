"""
PitchVision AI - Object Detection Module
Uses YOLOv8 to detect players, ball, goalkeepers, and referees in match footage.
"""

import numpy as np
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from loguru import logger

try:
    from ultralytics import YOLO
    import cv2
    import supervision as sv
except ImportError:
    logger.warning("Detection dependencies not installed. Run: pip install -r requirements.txt")


@dataclass
class Detection:
    """Single object detection result."""
    frame_id: int
    class_id: int
    class_name: str
    bbox: Tuple[float, float, float, float]  # x1, y1, x2, y2
    confidence: float
    center: Tuple[float, float] = None

    def __post_init__(self):
        if self.center is None:
            x1, y1, x2, y2 = self.bbox
            self.center = ((x1 + x2) / 2, (y1 + y2) / 2)


class PlayerDetector:
    """
    YOLOv8-based detector for soccer match elements.

    Classes:
        0: player
        1: goalkeeper
        2: referee
        3: ball
    """

    CLASS_NAMES = {0: "player", 1: "goalkeeper", 2: "referee", 3: "ball"}
    DEFAULT_CONFIDENCE = 0.5
    DEFAULT_IOU = 0.45

    def __init__(
        self,
        model_path: str = "models/yolov8x-football.pt",
        confidence: float = DEFAULT_CONFIDENCE,
        iou_threshold: float = DEFAULT_IOU,
        device: str = "auto",
    ):
        """
        Initialize the player detector.

        Args:
            model_path: Path to fine-tuned YOLOv8 weights
            confidence: Minimum detection confidence threshold
            iou_threshold: IoU threshold for NMS
            device: Device for inference ('auto', 'cuda', 'cpu')
        """
        self.model_path = Path(model_path)
        self.confidence = confidence
        self.iou_threshold = iou_threshold
        self.device = device
        self.model = None

        logger.info(f"Initializing PlayerDetector with model: {model_path}")

    def load_model(self) -> None:
        """Load the YOLOv8 model."""
        if not self.model_path.exists():
            logger.warning(f"Model not found at {self.model_path}. Using default YOLOv8x.")
            self.model = YOLO("yolov8x.pt")
        else:
            self.model = YOLO(str(self.model_path))

        if self.device != "auto":
            self.model.to(self.device)

        logger.info("Model loaded successfully")

    def detect_frame(self, frame: np.ndarray, frame_id: int = 0) -> List[Detection]:
        """
        Run detection on a single frame.

        Args:
            frame: BGR image as numpy array
            frame_id: Frame identifier

        Returns:
            List of Detection objects
        """
        if self.model is None:
            self.load_model()

        results = self.model(
            frame,
            conf=self.confidence,
            iou=self.iou_threshold,
            verbose=False,
        )[0]

        detections = []
        for box in results.boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])
            bbox = tuple(box.xyxy[0].cpu().numpy().tolist())

            detections.append(Detection(
                frame_id=frame_id,
                class_id=class_id,
                class_name=self.CLASS_NAMES.get(class_id, "unknown"),
                bbox=bbox,
                confidence=confidence,
            ))

        return detections

    def detect_video(
        self,
        video_path: str,
        sample_fps: int = 10,
        max_frames: Optional[int] = None,
        callback=None,
    ) -> Dict[int, List[Detection]]:
        """
        Run detection on a video file.

        Args:
            video_path: Path to video file
            sample_fps: Frames per second to sample (lower = faster)
            max_frames: Maximum frames to process (None = all)
            callback: Optional callback function(frame_id, detections)

        Returns:
            Dict mapping frame_id to list of detections
        """
        cap = cv2.VideoCapture(video_path)
        video_fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frame_skip = max(1, int(video_fps / sample_fps))

        logger.info(
            f"Processing video: {video_path} "
            f"({total_frames} frames @ {video_fps:.1f} fps, "
            f"sampling every {frame_skip} frames)"
        )

        all_detections = {}
        frame_count = 0
        processed_count = 0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_count % frame_skip == 0:
                detections = self.detect_frame(frame, frame_id=frame_count)
                all_detections[frame_count] = detections
                processed_count += 1

                if callback:
                    callback(frame_count, detections)

                if processed_count % 100 == 0:
                    logger.info(
                        f"Processed {processed_count} frames "
                        f"({frame_count}/{total_frames})"
                    )

            frame_count += 1
            if max_frames and processed_count >= max_frames:
                break

        cap.release()
        logger.info(f"Detection complete: {processed_count} frames processed")
        return all_detections

    def get_player_detections(
        self, detections: List[Detection]
    ) -> List[Detection]:
        """Filter detections to only players and goalkeepers."""
        return [d for d in detections if d.class_name in ("player", "goalkeeper")]

    def get_ball_detection(
        self, detections: List[Detection]
    ) -> Optional[Detection]:
        """Get the ball detection (highest confidence if multiple)."""
        ball_dets = [d for d in detections if d.class_name == "ball"]
        if not ball_dets:
            return None
        return max(ball_dets, key=lambda d: d.confidence)
