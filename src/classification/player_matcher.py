"""
PitchVision AI - Player-Lineup Matcher
Matches detected jersey numbers + team assignments to provided lineup data.
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from loguru import logger


@dataclass
class PlayerIdentity:
    """Resolved player identity."""
    track_id: int
    team_id: int
    team_name: str
    player_id: int
    player_name: str
    jersey_number: int
    confidence: float


class PlayerMatcher:
    """
    Matches tracked players to their lineup identities using
    team classification + jersey OCR results.
    """

    def __init__(self):
        self.home_lineup: Dict[int, str] = {}  # jersey_number -> player_name
        self.away_lineup: Dict[int, str] = {}
        self.home_team_name: str = "Home"
        self.away_team_name: str = "Away"

        logger.info("PlayerMatcher initialized")

    def set_lineups(
        self,
        home_team: str,
        away_team: str,
        home_players: Dict[int, str],
        away_players: Dict[int, str],
    ):
        """
        Set team lineups.

        Args:
            home_team: Home team name
            away_team: Away team name
            home_players: Dict of jersey_number -> player_name for home team
            away_players: Dict of jersey_number -> player_name for away team
        """
        self.home_team_name = home_team
        self.away_team_name = away_team
        self.home_lineup = home_players
        self.away_lineup = away_players

        logger.info(
            f"Lineups set: {home_team} ({len(home_players)} players) "
            f"vs {away_team} ({len(away_players)} players)"
        )

    def match_players(
        self,
        team_assignments: Dict[int, object],  # track_id -> TeamAssignment
        jersey_numbers: Dict[int, Optional[int]],  # track_id -> jersey_number
        team_id_mapping: Dict[int, str] = None,  # cluster_id -> "home"/"away"
    ) -> Dict[int, PlayerIdentity]:
        """
        Match tracks to player identities.

        Args:
            team_assignments: Team classification results
            jersey_numbers: OCR jersey number results
            team_id_mapping: Optional mapping of cluster IDs to home/away

        Returns:
            Dict mapping track_id to PlayerIdentity
        """
        identities = {}

        # Auto-detect team mapping if not provided
        if team_id_mapping is None:
            team_id_mapping = self._infer_team_mapping(team_assignments, jersey_numbers)

        player_counter = {"home": 0, "away": 0}

        for track_id, assignment in team_assignments.items():
            team_type = team_id_mapping.get(assignment.team_id, "home")
            is_home = team_type == "home"

            team_name = self.home_team_name if is_home else self.away_team_name
            lineup = self.home_lineup if is_home else self.away_lineup

            jersey = jersey_numbers.get(track_id)
            player_name = None
            player_id = 0

            if jersey and jersey in lineup:
                player_name = lineup[jersey]
                player_id = list(lineup.keys()).index(jersey) + 1
            else:
                player_counter[team_type] += 1
                player_id = player_counter[team_type]
                player_name = f"{team_name}_P{player_id}"
                if jersey:
                    player_name += f"_#{jersey}"

            identities[track_id] = PlayerIdentity(
                track_id=track_id,
                team_id=1 if is_home else 2,
                team_name=team_name,
                player_id=player_id,
                player_name=player_name,
                jersey_number=jersey or 0,
                confidence=assignment.confidence,
            )

        matched = sum(1 for p in identities.values() if p.jersey_number > 0)
        logger.info(
            f"Player matching complete: {len(identities)} tracks, "
            f"{matched} with jersey numbers"
        )
        return identities

    def _infer_team_mapping(
        self,
        team_assignments: Dict,
        jersey_numbers: Dict,
    ) -> Dict[int, str]:
        """
        Infer which cluster ID corresponds to home/away team
        based on jersey number matches.
        """
        cluster_matches = {0: {"home": 0, "away": 0}, 1: {"home": 0, "away": 0}}

        for track_id, assignment in team_assignments.items():
            jersey = jersey_numbers.get(track_id)
            if jersey is None:
                continue

            cluster_id = assignment.team_id
            if jersey in self.home_lineup:
                cluster_matches[cluster_id]["home"] += 1
            if jersey in self.away_lineup:
                cluster_matches[cluster_id]["away"] += 1

        # Assign based on majority
        if cluster_matches[0]["home"] >= cluster_matches[0]["away"]:
            return {0: "home", 1: "away"}
        else:
            return {0: "away", 1: "home"}
