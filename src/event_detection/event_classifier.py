"""
PitchVision AI - Event Classification Module
Detects match events (passes, shots, tackles, etc.) from tracking data.
"""

import numpy as np
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from loguru import logger


class EventType(Enum):
    PASS_SHORT = "Short Pass"
    PASS_LONG = "Long Pass"
    PASS_THROUGH = "Through Ball"
    CROSS = "Crossing"
    SHOT_CLOSE = "Close Shot"
    SHOT_LONG = "Long Shot"
    HEADER = "Heading"
    STANDING_TACKLE = "Standing Tackle"
    SLIDING_TACKLE = "Sliding Tackle"
    INTERCEPTION = "Interception"
    CLEARANCE = "Clearance"
    GROUND_DUEL = "Ground Duels"
    AERIAL_DUEL = "Aerial Duels"
    DRIBBLE = "Dribbling"
    SAVE = "Saves"
    HANDLING = "Handling"
    GK_THROW = "Goalkeeper Throw"
    BALL_CARRY = "Pace"
    FOUL = "Simple Foul"
    OFFSIDE = "Offside"


@dataclass
class MatchEvent:
    """A single detected match event."""
    event_id: int
    match_id: int
    team_id: int
    team_name: str
    player_id: int
    player_name: str
    jersey_number: int
    attribute: str
    sub_attribute: str
    action: str
    description: str
    special_action: str = "No Special Action"
    body_part: str = "Right Foot"
    start_x: float = 0.0
    start_y: float = 0.0
    end_x: float = 0.0
    end_y: float = 0.0
    timestamp: str = "0:00:00"
    period: str = "First Half"

    def to_dict(self) -> Dict:
        return {
            "id": self.event_id,
            "match_id": self.match_id,
            "team_id": self.team_id,
            "team_name": self.team_name,
            "player_id": self.player_id,
            "player_name": self.player_name,
            "jersey_number": self.jersey_number,
            "attribute": self.attribute,
            "sub_attribute": self.sub_attribute,
            "action": self.action,
            "description": self.description,
            "special_action": self.special_action,
            "body_part": self.body_part,
            "start_x": round(self.start_x, 2),
            "start_y": round(self.start_y, 2),
            "end_x": round(self.end_x, 2),
            "end_y": round(self.end_y, 2),
            "timestamp": self.timestamp,
            "period": self.period,
        }


class EventClassifier:
    """
    Rule-based + ML hybrid event classifier for soccer matches.

    Uses spatial-temporal features from tracking data to detect
    and classify match events like passes, shots, tackles, and duels.
    """

    # Distance thresholds (in normalized 0-100 coordinates)
    PASS_DISTANCE_THRESHOLD = 5.0       # Ball must be within 5 units of player
    SHORT_PASS_MAX_DISTANCE = 25.0      # Short pass < 25 units
    LONG_PASS_MIN_DISTANCE = 25.0       # Long pass >= 25 units
    SHOT_ZONE_X = (80, 100)             # Final 20% of pitch
    PENALTY_BOX = {"x": (83, 100), "y": (21, 79)}  # Approximate penalty box
    TACKLE_PROXIMITY = 3.0              # Players within 3 units
    DUEL_PROXIMITY = 2.5               # Duel detection radius

    def __init__(
        self,
        match_id: int = 1,
        half_duration_minutes: int = 45,
        fps: int = 10,
    ):
        self.match_id = match_id
        self.half_duration = half_duration_minutes
        self.fps = fps
        self.event_counter = 0
        self.events: List[MatchEvent] = []

        logger.info("EventClassifier initialized")

    def _get_distance(self, p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
        """Calculate Euclidean distance between two points."""
        return np.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)

    def _get_direction(self, start_x: float, end_x: float) -> str:
        """Determine pass direction based on x-coordinate change."""
        diff = end_x - start_x
        if diff > 3:
            return "Forward"
        elif diff < -3:
            return "Backward"
        return "Lateral"

    def _frame_to_timestamp(self, frame_id: int) -> Tuple[str, str]:
        """Convert frame ID to timestamp and period."""
        seconds = frame_id / self.fps
        half_seconds = self.half_duration * 60

        if seconds < half_seconds:
            period = "First Half"
            match_seconds = seconds
        else:
            period = "Second Half"
            match_seconds = seconds - half_seconds

        minutes = int(match_seconds // 60)
        secs = int(match_seconds % 60)
        timestamp = f"0:{minutes:02d}:{secs:02d}"

        return timestamp, period

    def _create_event(self, **kwargs) -> MatchEvent:
        """Create a new event with auto-incrementing ID."""
        self.event_counter += 1
        event = MatchEvent(event_id=self.event_counter, match_id=self.match_id, **kwargs)
        self.events.append(event)
        return event

    def detect_pass(
        self,
        frame_id: int,
        passer_identity,  # PlayerIdentity
        receiver_identity,  # PlayerIdentity
        start_pos: Tuple[float, float],
        end_pos: Tuple[float, float],
        successful: bool = True,
    ) -> MatchEvent:
        """Detect and classify a pass event."""
        distance = self._get_distance(start_pos, end_pos)
        timestamp, period = self._frame_to_timestamp(frame_id)
        direction = self._get_direction(start_pos[0], end_pos[0])

        # Classify pass type
        if distance < self.SHORT_PASS_MAX_DISTANCE:
            sub_attr = "Short Pass"
        else:
            sub_attr = "Long Pass"

        # Check for through ball (passes into space behind defense)
        # Simplified: forward pass into final third
        if direction == "Forward" and end_pos[0] > 66:
            sub_attr = "Through Ball"

        # Check for cross (from wide areas)
        if abs(start_pos[1] - 50) > 30 and end_pos[0] > 75:
            sub_attr = "Crossing"

        action = "Simple Pass" if successful else "Unsuccessful"
        description = f"Simple {sub_attr}" if successful else f"Unsuccessful {sub_attr}"

        # Create passer event
        pass_event = self._create_event(
            team_id=passer_identity.team_id,
            team_name=passer_identity.team_name,
            player_id=passer_identity.player_id,
            player_name=passer_identity.player_name,
            jersey_number=passer_identity.jersey_number,
            attribute="Passing",
            sub_attribute=sub_attr,
            action=action,
            description=description,
            start_x=start_pos[0],
            start_y=start_pos[1],
            end_x=end_pos[0],
            end_y=end_pos[1],
            timestamp=timestamp,
            period=period,
        )

        # Create receiver event (X_Passing)
        if successful and receiver_identity:
            recv_action = "Received Simple Pass"
            self._create_event(
                team_id=receiver_identity.team_id,
                team_name=receiver_identity.team_name,
                player_id=receiver_identity.player_id,
                player_name=receiver_identity.player_name,
                jersey_number=receiver_identity.jersey_number,
                attribute="X_Passing",
                sub_attribute=f"{sub_attr} Recieve",
                action=recv_action,
                description=f"Received {description}",
                start_x=end_pos[0],
                start_y=end_pos[1],
                end_x=end_pos[0],
                end_y=end_pos[1],
                timestamp=timestamp,
                period=period,
            )

        return pass_event

    def detect_shot(
        self,
        frame_id: int,
        shooter_identity,
        start_pos: Tuple[float, float],
        end_pos: Tuple[float, float],
        result: str = "on_target",  # "goal", "on_target", "off_target", "hit_post"
    ) -> MatchEvent:
        """Detect and classify a shot event."""
        timestamp, period = self._frame_to_timestamp(frame_id)

        # Classify shot type
        in_box = (
            self.PENALTY_BOX["x"][0] <= start_pos[0] <= self.PENALTY_BOX["x"][1]
            and self.PENALTY_BOX["y"][0] <= start_pos[1] <= self.PENALTY_BOX["y"][1]
        )
        sub_attr = "Close Shot" if in_box else "Long Shot"

        action_map = {
            "goal": "Goal",
            "on_target": "Simple Shot Saved",
            "off_target": "Off Target",
            "hit_post": "Hit Goal Post",
        }
        desc_map = {
            "goal": f"{sub_attr} Goal",
            "on_target": f"On-Target {sub_attr}",
            "off_target": f"Off-Target {sub_attr}",
            "hit_post": f"{sub_attr} Hit Post",
        }

        return self._create_event(
            team_id=shooter_identity.team_id,
            team_name=shooter_identity.team_name,
            player_id=shooter_identity.player_id,
            player_name=shooter_identity.player_name,
            jersey_number=shooter_identity.jersey_number,
            attribute="Shooting",
            sub_attribute=sub_attr,
            action=action_map.get(result, "Simple Shot"),
            description=desc_map.get(result, f"Simple {sub_attr}"),
            start_x=start_pos[0],
            start_y=start_pos[1],
            end_x=end_pos[0],
            end_y=end_pos[1],
            timestamp=timestamp,
            period=period,
        )

    def detect_tackle(
        self,
        frame_id: int,
        tackler_identity,
        tackled_identity,
        position: Tuple[float, float],
        successful: bool = True,
        sliding: bool = False,
    ) -> MatchEvent:
        """Detect and classify a tackle event."""
        timestamp, period = self._frame_to_timestamp(frame_id)
        sub_attr = "Sliding Tackle" if sliding else "Standing Tackle"

        action = "Successful" if successful else "Unsuccessful"
        if successful:
            description = f"Easy {sub_attr}" if not sliding else f"Crucial {sub_attr}"
        else:
            description = f"Unsuccessful {sub_attr}"

        # Tackler event
        tackle_event = self._create_event(
            team_id=tackler_identity.team_id,
            team_name=tackler_identity.team_name,
            player_id=tackler_identity.player_id,
            player_name=tackler_identity.player_name,
            jersey_number=tackler_identity.jersey_number,
            attribute="Defending",
            sub_attribute=sub_attr,
            action="Tackled Simple" if successful else "Unsuccessful",
            description=description,
            start_x=position[0],
            start_y=position[1],
            end_x=position[0],
            end_y=position[1],
            timestamp=timestamp,
            period=period,
        )

        # Tackled player event (X_Defending)
        self._create_event(
            team_id=tackled_identity.team_id,
            team_name=tackled_identity.team_name,
            player_id=tackled_identity.player_id,
            player_name=tackled_identity.player_name,
            jersey_number=tackled_identity.jersey_number,
            attribute="X_Defending",
            sub_attribute=f"{sub_attr} Encountered",
            action="Tackled Simple" if successful else "Tackle Evaded",
            description=f"Successfully {sub_attr}d By Opponent" if successful else f"{sub_attr} Evaded/Foul Drawn",
            start_x=position[0],
            start_y=position[1],
            end_x=position[0],
            end_y=position[1],
            timestamp=timestamp,
            period=period,
        )

        return tackle_event

    def get_all_events(self) -> List[Dict]:
        """Return all detected events as list of dicts."""
        return [e.to_dict() for e in self.events]

    def export_csv(self, filepath: str) -> None:
        """Export events to CSV file."""
        import csv

        events = self.get_all_events()
        if not events:
            logger.warning("No events to export")
            return

        fieldnames = list(events[0].keys())
        with open(filepath, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(events)

        logger.info(f"Exported {len(events)} events to {filepath}")
