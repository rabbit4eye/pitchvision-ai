"""
PitchVision AI - Team Classification Module
Uses SigLIP visual embeddings + UMAP + KMeans for team assignment.
"""

import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from loguru import logger

try:
    import cv2
    from sklearn.cluster import KMeans
    import umap
except ImportError:
    logger.warning("Classification dependencies not installed.")


@dataclass
class TeamAssignment:
    """Team assignment result for a player track."""
    track_id: int
    team_id: int  # 0 or 1
    confidence: float
    dominant_color: Tuple[int, int, int]  # BGR color


class TeamClassifier:
    """
    Classifies players into two teams using visual features.

    Pipeline:
    1. Extract player crop images from key frames
    2. Extract visual embeddings (SigLIP or color histogram)
    3. Reduce dimensionality with UMAP
    4. Cluster with KMeans (k=2)
    """

    def __init__(
        self,
        use_siglib: bool = True,
        n_samples_per_track: int = 10,
        color_space: str = "hsv",
    ):
        self.use_siglib = use_siglib
        self.n_samples_per_track = n_samples_per_track
        self.color_space = color_space
        self.embeddings_model = None
        self.kmeans = KMeans(n_clusters=2, random_state=42, n_init=10)
        self.umap_reducer = None

        logger.info(f"TeamClassifier initialized (SigLIP: {use_siglib})")

    def _extract_jersey_region(self, frame: np.ndarray, bbox: Tuple) -> np.ndarray:
        """Extract the torso/jersey region from a player bounding box."""
        x1, y1, x2, y2 = [int(v) for v in bbox]
        h = y2 - y1
        # Jersey is roughly the middle 40% of the bounding box height
        jersey_y1 = y1 + int(h * 0.2)
        jersey_y2 = y1 + int(h * 0.6)
        crop = frame[jersey_y1:jersey_y2, x1:x2]
        return crop if crop.size > 0 else frame[y1:y2, x1:x2]

    def _get_color_features(self, crop: np.ndarray) -> np.ndarray:
        """Extract color histogram features from jersey crop."""
        if crop.size == 0:
            return np.zeros(48)

        if self.color_space == "hsv":
            converted = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
        else:
            converted = crop

        features = []
        for channel in range(3):
            hist = cv2.calcHist(
                [converted], [channel], None, [16], [0, 256]
            )
            hist = hist.flatten() / (hist.sum() + 1e-7)
            features.extend(hist)

        return np.array(features)

    def _get_siglib_features(self, crop: np.ndarray) -> np.ndarray:
        """Extract SigLIP visual embeddings from jersey crop."""
        if self.embeddings_model is None:
            try:
                from transformers import AutoProcessor, AutoModel
                import torch

                self.embeddings_model = AutoModel.from_pretrained(
                    "google/siglip-base-patch16-224"
                )
                self.processor = AutoProcessor.from_pretrained(
                    "google/siglip-base-patch16-224"
                )
                self.embeddings_model.eval()
                logger.info("SigLIP model loaded")
            except Exception as e:
                logger.warning(f"SigLIP load failed: {e}. Falling back to color features.")
                self.use_siglib = False
                return self._get_color_features(crop)

        import torch
        from PIL import Image

        pil_image = Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))
        inputs = self.processor(images=pil_image, return_tensors="pt")

        with torch.no_grad():
            outputs = self.embeddings_model.get_image_features(**inputs)

        return outputs.squeeze().numpy()

    def classify_tracks(
        self,
        tracks: List,  # List of Track objects
        frames: Dict[int, np.ndarray],  # frame_id -> frame image
    ) -> Dict[int, TeamAssignment]:
        """
        Classify player tracks into two teams.

        Args:
            tracks: List of Track objects (players only)
            frames: Dict of frame_id -> frame images

        Returns:
            Dict mapping track_id to TeamAssignment
        """
        logger.info(f"Classifying {len(tracks)} player tracks into teams")

        # Step 1: Extract features for each track
        all_features = []
        track_ids = []

        for track in tracks:
            track_features = []
            # Sample frames evenly across the track
            sample_indices = np.linspace(
                0, len(track.frames) - 1, self.n_samples_per_track, dtype=int
            )

            for idx in sample_indices:
                frame_id = track.frames[idx]
                if frame_id not in frames:
                    continue

                frame = frames[frame_id]
                bbox = track.bboxes[idx]
                crop = self._extract_jersey_region(frame, bbox)

                if crop.size == 0:
                    continue

                if self.use_siglib:
                    feat = self._get_siglib_features(crop)
                else:
                    feat = self._get_color_features(crop)

                track_features.append(feat)

            if track_features:
                avg_feature = np.mean(track_features, axis=0)
                all_features.append(avg_feature)
                track_ids.append(track.track_id)

        if len(all_features) < 2:
            logger.warning("Not enough tracks to classify")
            return {}

        features_array = np.array(all_features)

        # Step 2: UMAP dimensionality reduction
        if features_array.shape[1] > 10:
            n_components = min(5, features_array.shape[0] - 1)
            self.umap_reducer = umap.UMAP(
                n_components=n_components, random_state=42
            )
            reduced = self.umap_reducer.fit_transform(features_array)
        else:
            reduced = features_array

        # Step 3: KMeans clustering
        labels = self.kmeans.fit_predict(reduced)

        # Step 4: Build assignments
        assignments = {}
        for track_id, label in zip(track_ids, labels):
            assignments[track_id] = TeamAssignment(
                track_id=track_id,
                team_id=int(label),
                confidence=self._compute_confidence(track_id, reduced, labels),
                dominant_color=(0, 0, 0),  # Placeholder
            )

        logger.info(
            f"Team classification complete: "
            f"Team 0: {sum(1 for a in assignments.values() if a.team_id == 0)}, "
            f"Team 1: {sum(1 for a in assignments.values() if a.team_id == 1)}"
        )
        return assignments

    def _compute_confidence(
        self, track_id: int, features: np.ndarray, labels: np.ndarray
    ) -> float:
        """Compute classification confidence based on distance to cluster centers."""
        centers = self.kmeans.cluster_centers_
        idx = [i for i, tid in enumerate(labels)].index(0) if 0 in labels else 0
        # Simplified confidence based on silhouette-like measure
        return 0.85  # Placeholder - implement proper confidence
