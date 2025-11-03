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
