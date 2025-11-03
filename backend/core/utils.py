import datetime
from typing import Optional


def generate_coach_id(latest_existing_id: Optional[str] = None) -> str:
    """Generate unique coach ID like C25xxxxx (8 chars total).

    If latest_existing_id is provided (last coach for the year), continue from it; else start at 00001.
    The caller must ensure uniqueness via DB constraints/transactions.
    """
    from .models import Coach  # local import to avoid circulars during migrations

    current_year_two_digits = str(datetime.date.today().year % 100).zfill(2)
    prefix = f"C{current_year_two_digits}"

    if latest_existing_id and latest_existing_id.startswith(prefix):
        next_seq = int(latest_existing_id[-5:]) + 1
    else:
        # Query last existing coach for this year prefix
        last = (
            Coach.objects.filter(coach_id__startswith=prefix)
            .order_by("-coach_id")
            .only("coach_id")
            .first()
        )
        next_seq = int(last.coach_id[-5:]) + 1 if last else 1

    if next_seq > 99999:
        raise ValueError("Coach ID sequence exhausted for the year")

    return f"{prefix}{next_seq:05d}"

# core/utils.py
from .models import Player, Leaderboard, PlayerSportProfile

def recalc_leaderboard():
    """
    Recalculate leaderboard by aggregating PlayerSportProfile.career_score
    across all sports for each player.
    """
    # Sum career_score per player
    totals_by_player = {}
    for profile in PlayerSportProfile.objects.select_related("player").all():
        pid = profile.player_id
        totals_by_player[pid] = totals_by_player.get(pid, 0) + float(profile.career_score or 0)

    # Rewrite Leaderboard with the totals
    Leaderboard.objects.all().delete()
    for pid, score in totals_by_player.items():
        Leaderboard.objects.create(player_id=pid, score=int(score))
