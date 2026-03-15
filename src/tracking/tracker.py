"""
PitchVision AI - Multi-Object Tracking Module
Uses ByteTrack for consistent player identity across video frames.
"""

import numpy as np
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from loguru import logger

try:
    import supervision as sv
except ImportError:
    logger.warning("Supervision not installed. Run: pip install supervision")


@dataclass
class Track:
    """Represents a tracked object across frames."""
    track_id: int
    class_name: str
    frames: List[int] = field(default_factory=list)
    positions: List[Tuple[float, float]] = field(default_factory=list)
    bboxes: List[Tuple[float, float, float, float]] = field(default_factory=list)
    confidences: List[float] = field(default_factory=list)
    team_id: Optional[int] = None
    jersey_number: Optional[int] = None
    player_name: Optional[str] = None

    @property
    def last_position(self) -> Optional[Tuple[float, float]]:
        return self.positions[-1] if self.positions else None

    @property
    def last_bbox(self) -> Optional[Tuple[float, float, float, float]]:
        return self.bboxes[-1] if self.bboxes else None

    @property
    def track_length(self) -> int:
        return len(self.frames)

    @property
    def avg_confidence(self) -> float:
        return np.mean(self.confidences) if self.confidences else 0.0


class MultiObjectTracker:
    """
    ByteTrack-based multi-object tracker for soccer players.

    Maintains consistent track IDs across frames, handles occlusions
    and re-identification.
    """

    def __init__(
        self,
        track_activation_threshold: float = 0.25,
        lost_track_buffer: int = 30,
        minimum_matching_threshold: float = 0.8,
        frame_rate: int = 10,
        minimum_track_length: int = 10,
    ):
        """
        Initialize the tracker.

        Args:
            track_activation_threshold: Min confidence to start new track
            lost_track_buffer: Frames to keep lost track before deletion
            minimum_matching_threshold: IoU threshold for track association
            frame_rate: Expected frame rate of detections
            minimum_track_length: Min frames for valid track
        """
        self.track_activation_threshold = track_activation_threshold
        self.lost_track_buffer = lost_track_buffer
        self.minimum_matching_threshold = minimum_matching_threshold
        self.frame_rate = frame_rate
        self.minimum_track_length = minimum_track_length

        self.byte_tracker = None
        self.tracks: Dict[int, Track] = {}

        logger.info("MultiObjectTracker initialized")

    def _init_byte_tracker(self):
        """Initialize the ByteTrack tracker from supervision."""
        self.byte_tracker = sv.ByteTrack(
            track_activation_threshold=self.track_activation_threshold,
            lost_track_buffer=self.lost_track_buffer,
            minimum_matching_threshold=self.minimum_matching_threshold,
            frame_rate=self.frame_rate,
        )

    def update(
        self,
        frame_id: int,
        detections: List,  # List[Detection] from detector
    ) -> Dict[int, Track]:
        """
        Update tracks with new detections.

        Args:
            frame_id: Current frame identifier
            detections: List of Detection objects from detector

        Returns:
            Dict of active tracks
        """
        if self.byte_tracker is None:
            self._init_byte_tracker()

        if not detections:
            return self.tracks

        # Convert detections to supervision format
        bboxes = np.array([d.bbox for d in detections])
        confidences = np.array([d.confidence for d in detections])
        class_ids = np.array([d.class_id for d in detections])

        sv_detections = sv.Detections(
            xyxy=bboxes,
            confidence=confidences,
            class_id=class_ids,
        )

        # Run ByteTrack
        tracked = self.byte_tracker.update_with_detections(sv_detections)

        # Update track objects
        if tracked.tracker_id is not None:
            for i, track_id in enumerate(tracked.tracker_id):
                track_id = int(track_id)
                bbox = tuple(tracked.xyxy[i].tolist())
                center = (
                    (bbox[0] + bbox[2]) / 2,
                    (bbox[1] + bbox[3]) / 2,
                )
                confidence = float(tracked.confidence[i])
                class_id = int(tracked.class_id[i])
                class_names = {0: "player", 1: "goalkeeper", 2: "referee", 3: "ball"}

                if track_id not in self.tracks:
                    self.tracks[track_id] = Track(
                        track_id=track_id,
                        class_name=class_names.get(class_id, "unknown"),
                    )

                track = self.tracks[track_id]
                track.frames.append(frame_id)
                track.positions.append(center)
                track.bboxes.append(bbox)
                track.confidences.append(confidence)

        return self.tracks

    def get_active_tracks(self, frame_id: int, window: int = 5) -> List[Track]:
        """Get tracks active within the last N frames."""
        return [
            t for t in self.tracks.values()
            if t.frames and frame_id - t.frames[-1] <= window
        ]

    def get_player_tracks(self) -> List[Track]:
        """Get all tracks classified as players or goalkeepers."""
        return [
            t for t in self.tracks.values()
            if t.class_name in ("player", "goalkeeper")
            and t.track_length >= self.minimum_track_length
        ]

    def get_ball_track(self) -> Optional[Track]:
        """Get the ball track (longest if multiple)."""
        ball_tracks = [t for t in self.tracks.values() if t.class_name == "ball"]
        if not ball_tracks:
            return None
        return max(ball_tracks, key=lambda t: t.track_length)

    def get_track_positions_at_frame(self, frame_id: int) -> Dict[int, Tuple[float, float]]:
        """Get all track positions at a specific frame."""
        positions = {}
        for track_id, track in self.tracks.items():
            if frame_id in track.frames:
                idx = track.frames.index(frame_id)
                positions[track_id] = track.positions[idx]
        return positions

    def reset(self):
        """Reset tracker state."""
        self.byte_tracker = None
        self.tracks = {}
        logger.info("Tracker reset")
