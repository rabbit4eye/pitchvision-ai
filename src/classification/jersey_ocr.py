"""
PitchVision AI - Jersey Number OCR Module
Uses PaddleOCR for reading jersey numbers from player crops.
"""

import numpy as np
from typing import List, Dict, Optional, Tuple
from collections import Counter
from loguru import logger

try:
    import cv2
except ImportError:
    pass


class JerseyOCR:
    """
    Reads jersey numbers from player bounding box crops using OCR.

    Uses temporal voting across multiple frames to improve accuracy:
    each track accumulates OCR readings, and the most frequent valid
    number is assigned.
    """

    def __init__(
        self,
        min_crop_height: int = 40,
        max_jersey_number: int = 99,
        min_votes: int = 3,
        confidence_threshold: float = 0.6,
    ):
        self.min_crop_height = min_crop_height
        self.max_jersey_number = max_jersey_number
        self.min_votes = min_votes
        self.confidence_threshold = confidence_threshold
        self.ocr_engine = None

        logger.info("JerseyOCR initialized")

    def _init_ocr(self):
        """Initialize PaddleOCR engine."""
        try:
            from paddleocr import PaddleOCR
            self.ocr_engine = PaddleOCR(
                use_angle_cls=True,
                lang="en",
                show_log=False,
                use_gpu=True,
            )
            logger.info("PaddleOCR initialized")
        except Exception as e:
            logger.error(f"Failed to initialize PaddleOCR: {e}")
            raise

    def _preprocess_crop(self, crop: np.ndarray) -> np.ndarray:
        """Preprocess jersey crop for better OCR accuracy."""
        if crop.size == 0:
            return crop

        # Resize to standard height
        h, w = crop.shape[:2]
        if h < self.min_crop_height:
            scale = self.min_crop_height / h
            crop = cv2.resize(crop, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

        # Convert to grayscale
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

        # Enhance contrast with CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        # Threshold for cleaner text
        _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Convert back to 3-channel for PaddleOCR
        return cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)

    def _extract_number(self, ocr_result) -> Optional[int]:
        """Extract jersey number from OCR result."""
        if not ocr_result or not ocr_result[0]:
            return None

        for line in ocr_result[0]:
            text = line[1][0].strip()
            confidence = line[1][1]

            if confidence < self.confidence_threshold:
                continue

            # Extract digits only
            digits = "".join(c for c in text if c.isdigit())
            if digits:
                number = int(digits)
                if 1 <= number <= self.max_jersey_number:
                    return number

        return None

    def read_jersey_number(self, crop: np.ndarray) -> Optional[int]:
        """
        Read jersey number from a single crop image.

        Args:
            crop: BGR image of player's jersey area

        Returns:
            Detected jersey number or None
        """
        if self.ocr_engine is None:
            self._init_ocr()

        if crop.size == 0 or crop.shape[0] < 10 or crop.shape[1] < 10:
            return None

        processed = self._preprocess_crop(crop)
        result = self.ocr_engine.ocr(processed, cls=True)
        return self._extract_number(result)

    def read_jersey_for_track(
        self,
        track,  # Track object
        frames: Dict[int, np.ndarray],
        n_samples: int = 15,
    ) -> Optional[int]:
        """
        Read jersey number for a track using temporal voting.

        Samples multiple frames, runs OCR on each, and returns
        the most frequent valid number.

        Args:
            track: Track object with frames and bboxes
            frames: Dict of frame_id -> frame images
            n_samples: Number of frames to sample

        Returns:
            Most likely jersey number or None
        """
        if not track.frames:
            return None

        # Sample frames evenly
        sample_indices = np.linspace(
            0, len(track.frames) - 1, min(n_samples, len(track.frames)), dtype=int
        )

        votes = []
        for idx in sample_indices:
            frame_id = track.frames[idx]
            if frame_id not in frames:
                continue

            frame = frames[frame_id]
            bbox = track.bboxes[idx]
            x1, y1, x2, y2 = [int(v) for v in bbox]

            # Extract jersey region (upper body)
            h = y2 - y1
            jersey_y1 = y1 + int(h * 0.15)
            jersey_y2 = y1 + int(h * 0.55)
            crop = frame[jersey_y1:jersey_y2, x1:x2]

            number = self.read_jersey_number(crop)
            if number is not None:
                votes.append(number)

        if not votes or len(votes) < self.min_votes:
            return None

        # Temporal voting: most common number
        counter = Counter(votes)
        most_common, count = counter.most_common(1)[0]

        # Require majority
        if count >= len(votes) * 0.3:
            logger.debug(f"Track {track.track_id}: Jersey #{most_common} ({count}/{len(votes)} votes)")
            return most_common

        return None
