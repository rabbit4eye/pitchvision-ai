"""
PitchVision AI - KPI Calculator
Computes match-level and player-level Key Performance Indicators.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from loguru import logger


class KPICalculator:
    """
    Calculates key performance indicators from structured event data.

    Supports both team-level and player-level KPIs matching the
    StepOut report format.
    """

    def __init__(self, events_df: pd.DataFrame):
        """
        Initialize with events DataFrame.

        Args:
            events_df: DataFrame with match events (19 columns)
        """
        self.df = events_df
        self.teams = self.df["team_name"].unique().tolist()
        logger.info(f"KPICalculator initialized with {len(self.df)} events, {len(self.teams)} teams")

    def team_summary(self, team_name: str) -> Dict:
        """Calculate summary KPIs for a team."""
        team_df = self.df[self.df["team_name"] == team_name]

        # Goals
        goals = len(team_df[(team_df["action"] == "Goal")])

        # Assists
        assists = len(team_df[(team_df["action"] == "Assist")])

        # Shots
        shooting_df = team_df[team_df["attribute"] == "Shooting"]
        total_shots = len(shooting_df)
        shots_on_target = len(shooting_df[shooting_df["action"].isin([
            "Goal", "Simple Shot Saved", "Key Shot Saved"
        ])])
        shot_conversion = round(goals / max(total_shots, 1) * 100, 1)

        # Passes
        passing_df = team_df[team_df["attribute"] == "Passing"]
        passes_attempted = len(passing_df)
        passes_completed = len(passing_df[passing_df["action"].isin([
            "Simple Pass", "Key Pass", "Assist", "Assist Throw", "Simple Throw"
        ])])

        # Chances Created
        chances = len(team_df[team_df["action"].isin(["Key Pass", "Assist"])])

        # Tackles
        tackle_df = team_df[team_df["attribute"] == "Defending"]
        tackles_successful = len(tackle_df[tackle_df["action"].isin([
            "Tackled Simple", "Tackled Crucial", "Successful"
        ])])

        # Interceptions
        intercept_df = team_df[
            (team_df["sub_attribute"] == "Interception") &
            (team_df["attribute"] == "Defending")
        ]
        interceptions = len(intercept_df[intercept_df["action"].isin([
            "Intercepted Simple", "Intercepted Crucial"
        ])])

        # Duels
        physical_df = team_df[team_df["attribute"] == "Physical"]
        duels_won = len(physical_df[physical_df["action"] == "Duel Won"])
        duels_total = len(physical_df)

        # Saves (GK)
        gk_df = team_df[team_df["attribute"] == "Goalkeeping"]
        saves = len(gk_df[gk_df["sub_attribute"] == "Saves"])

        # Fouls
        fouls = len(team_df[team_df["special_action"] == "Simple Foul"])

        # Progressive passes (move ball >10 units toward goal)
        prog_passes = len(passing_df[
            (passing_df["end_x"] - passing_df["start_x"]).abs() > 10
        ])

        return {
            "team_name": team_name,
            "goals": goals,
            "assists": assists,
            "total_shots": total_shots,
            "shots_on_target": shots_on_target,
            "shot_conversion_rate": shot_conversion,
            "chances_created": chances,
            "passes_completed": passes_completed,
            "passes_attempted": passes_attempted,
            "pass_accuracy": round(passes_completed / max(passes_attempted, 1) * 100, 1),
            "tackles_successful": tackles_successful,
            "interceptions": interceptions,
            "duels_won": duels_won,
            "duels_total": duels_total,
            "saves": saves,
            "fouls": fouls,
            "progressive_passes": prog_passes,
        }

    def match_summary(self) -> Dict:
        """Calculate summary KPIs for the full match."""
        summaries = {}
        for team in self.teams:
            summaries[team] = self.team_summary(team)
        return summaries

    def player_summary(self, player_name: str) -> Dict:
        """Calculate KPIs for an individual player."""
        pdf = self.df[self.df["player_name"] == player_name]

        passing = pdf[pdf["attribute"] == "Passing"]
        defending = pdf[pdf["attribute"] == "Defending"]
        shooting = pdf[pdf["attribute"] == "Shooting"]
        physical = pdf[pdf["attribute"] == "Physical"]
        dribbling = pdf[pdf["attribute"] == "Dribbling"]

        return {
            "player_name": player_name,
            "team_name": pdf["team_name"].iloc[0] if len(pdf) > 0 else "",
            "jersey_number": pdf["jersey_number"].iloc[0] if len(pdf) > 0 else 0,
            "total_events": len(pdf),
            "passes_attempted": len(passing),
            "passes_completed": len(passing[passing["action"].isin(["Simple Pass", "Key Pass", "Assist"])]),
            "shots": len(shooting),
            "goals": len(pdf[pdf["action"] == "Goal"]),
            "assists": len(pdf[pdf["action"] == "Assist"]),
            "tackles": len(defending[defending["sub_attribute"].isin(["Standing Tackle", "Sliding Tackle"])]),
            "interceptions": len(defending[defending["sub_attribute"] == "Interception"]),
            "duels_won": len(physical[physical["action"] == "Duel Won"]),
            "dribbles": len(dribbling),
        }

    def pass_matrix(self, team_name: str) -> pd.DataFrame:
        """Build player-to-player pass matrix for a team."""
        team_passes = self.df[
            (self.df["team_name"] == team_name) &
            (self.df["attribute"] == "Passing")
        ]

        # Match passes with receives using timestamp
        team_receives = self.df[
            (self.df["team_name"] == team_name) &
            (self.df["attribute"] == "X_Passing")
        ]

        matrix_data = {}
        for _, pass_row in team_passes.iterrows():
            # Find corresponding receive at same timestamp
            receives = team_receives[team_receives["timestamp"] == pass_row["timestamp"]]
            if len(receives) > 0:
                receiver = receives.iloc[0]["player_name"]
                passer = pass_row["player_name"]

                if passer not in matrix_data:
                    matrix_data[passer] = {}
                matrix_data[passer][receiver] = matrix_data[passer].get(receiver, 0) + 1

        players = sorted(set(
            list(matrix_data.keys()) +
            [r for receivers in matrix_data.values() for r in receivers]
        ))

        matrix = pd.DataFrame(0, index=players, columns=players)
        for passer, receivers in matrix_data.items():
            for receiver, count in receivers.items():
                if passer in matrix.index and receiver in matrix.columns:
                    matrix.loc[passer, receiver] = count

        return matrix

    def time_series(
        self,
        team_name: str,
        attribute: str,
        interval_minutes: int = 5,
    ) -> List[Dict]:
        """Generate time-series data for a specific attribute."""
        team_df = self.df[
            (self.df["team_name"] == team_name) &
            (self.df["attribute"] == attribute)
        ]

        # Parse timestamps to minutes
        intervals = []
        for t in range(0, 90, interval_minutes):
            t_start = f"0:{t//60:02d}:{t%60:02d}" if t < 60 else f"1:{(t-60)//60:02d}:{(t-60)%60:02d}"
            count = len(team_df[
                (team_df["timestamp"] >= f"0:{t:02d}:00") &
                (team_df["timestamp"] < f"0:{t+interval_minutes:02d}:00")
            ])
            intervals.append({"minute": t, "count": count})

        return intervals
