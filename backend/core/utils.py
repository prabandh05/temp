# core/utils.py
from .models import Player, Leaderboard, Match, Attendance
from django.db.models import Sum

def recalc_leaderboard():
    """
    Simple example: compute leaderboard by summing goals from Attendance or Match results.
    Adjust scoring logic as needed (wins = 3 points etc).
    """
    # Example using Attendance goals field (if present)
    player_goals = {}
    for att in Attendance.objects.all():
        pid = att.player.id
        player_goals[pid] = player_goals.get(pid, 0) + (getattr(att, "goals", 0) or 0)

    # Also you may add match-based points; omitted for brevity
    # Update Leaderboard table
    Leaderboard.objects.all().delete()
    for pid, score in player_goals.items():
        Leaderboard.objects.create(player_id=pid, score=score)
