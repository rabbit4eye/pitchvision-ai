"""
PitchVision AI - Stats Aggregator
Aggregates raw events into match statistics for reporting.
"""

import pandas as pd
import numpy as np
from typing import Dict, List
from loguru import logger


class StatsAggregator:
    """Aggregates event data into reportable statistics."""

    def __init__(self, events_df: pd.DataFrame):
        self.df = events_df
        logger.info(f"StatsAggregator initialized with {len(self.df)} events")

    def aggregate_by_team(self) -> Dict[str, Dict]:
        """Aggregate all stats by team."""
        result = {}
        for team in self.df["team_name"].unique():
            team_df = self.df[self.df["team_name"] == team]
            result[team] = {
                "total_events": len(team_df),
                "passing": self._passing_stats(team_df),
                "shooting": self._shooting_stats(team_df),
                "defending": self._defending_stats(team_df),
                "physical": self._physical_stats(team_df),
                "goalkeeping": self._gk_stats(team_df),
            }
        return result

    def _passing_stats(self, df: pd.DataFrame) -> Dict:
        p = df[df["attribute"] == "Passing"]
        return {
            "total_attempted": len(p),
            "total_completed": len(p[p["action"].str.contains("Simple|Key|Assist", na=False)]),
            "short_passes": len(p[p["sub_attribute"] == "Short Pass"]),
            "long_passes": len(p[p["sub_attribute"] == "Long Pass"]),
            "through_balls": len(p[p["sub_attribute"] == "Through Ball"]),
            "crosses": len(p[p["sub_attribute"] == "Crossing"]),
        }

    def _shooting_stats(self, df: pd.DataFrame) -> Dict:
        s = df[df["attribute"] == "Shooting"]
        return {
            "total_shots": len(s),
            "on_target": len(s[s["action"].isin(["Goal", "Simple Shot Saved", "Key Shot Saved"])]),
            "off_target": len(s[s["action"] == "Off Target"]),
            "goals": len(s[s["action"] == "Goal"]),
        }

    def _defending_stats(self, df: pd.DataFrame) -> Dict:
        d = df[df["attribute"] == "Defending"]
        return {
            "standing_tackles": len(d[d["sub_attribute"] == "Standing Tackle"]),
            "sliding_tackles": len(d[d["sub_attribute"] == "Sliding Tackle"]),
            "interceptions": len(d[d["sub_attribute"] == "Interception"]),
            "clearances": len(d[d["sub_attribute"] == "Clearance"]),
        }

    def _physical_stats(self, df: pd.DataFrame) -> Dict:
        ph = df[df["attribute"] == "Physical"]
        return {
            "ground_duels": len(ph[ph["sub_attribute"] == "Ground Duels"]),
            "aerial_duels": len(ph[ph["sub_attribute"] == "Aerial Duels"]),
            "duels_won": len(ph[ph["action"] == "Duel Won"]),
            "duels_lost": len(ph[ph["action"] == "Duel Lost"]),
        }

    def _gk_stats(self, df: pd.DataFrame) -> Dict:
        gk = df[df["attribute"] == "Goalkeeping"]
        return {
            "saves": len(gk[gk["sub_attribute"] == "Saves"]),
            "handling": len(gk[gk["sub_attribute"] == "Handling"]),
            "throws": len(gk[gk["sub_attribute"] == "Goalkeeper Throw"]),
        }
