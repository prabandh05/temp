from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
import random

from core.models import (
    Player,
    Sport,
    PlayerSportProfile,
    CricketStats,
    FootballStats,
    BasketballStats,
    RunningStats,
    Achievement,
    PerformanceScore,
    CoachingSession,
    SessionAttendance,
    Coach,
    Team,
)
from core.utils import recalc_leaderboard


class Command(BaseCommand):
    help = "Seed random sports profiles and stats for all existing players"

    def add_arguments(self, parser):
        parser.add_argument(
            "--per-player-min",
            type=int,
            default=1,
            help="Minimum number of sports to assign per player",
        )
        parser.add_argument(
            "--per-player-max",
            type=int,
            default=2,
            help="Maximum number of sports to assign per player",
        )
        parser.add_argument(
            "--weeks",
            type=int,
            default=12,
            help="Number of weeks of performance scores to generate",
        )

    def handle(self, *args, **options):
        per_player_min = options["per_player_min"]
        per_player_max = options["per_player_max"]
        weeks = options["weeks"]

        sports = list(Sport.objects.all())
        if not sports:
            self.stdout.write(self.style.ERROR("No sports found. Please seed Sport records first."))
            return

        players = list(Player.objects.select_related("user").all())
        if not players:
            self.stdout.write("No players found. Nothing to seed.")
            return

        created_profiles = 0
        created_stats = 0
        created_achievements = 0
        created_perf = 0
        created_sessions = 0
        created_session_att = 0

        # Ensure at least one coach and one team exist for sessions
        coach = Coach.objects.first()
        if not coach:
            # create a dummy coach if none
            from django.contrib.auth import get_user_model
            U = get_user_model()
            u = U.objects.create_user(username="seed_coach", email="seed_coach@example.com", password="password")
            u.role = getattr(U, 'Roles', None).COACH if hasattr(U, 'Roles') else 'coach'
            u.save()
            coach = Coach.objects.create(user=u)
        team = Team.objects.first() or Team.objects.create(name="Seed Team")

        for player in players:
            # Choose 1..2 sports per player
            num_sports = random.randint(per_player_min, per_player_max)
            chosen_sports = random.sample(sports, k=min(num_sports, len(sports)))

            for sport in chosen_sports:
                with transaction.atomic():
                    profile, was_created = PlayerSportProfile.objects.get_or_create(
                        player=player,
                        sport=sport,
                        defaults={
                            "career_score": round(random.uniform(10, 200), 2),
                            "joined_date": timezone.now().date(),
                            "is_active": True,
                            "team": team,
                            "coach": coach,
                        },
                    )
                    if was_created:
                        created_profiles += 1
                    else:
                        profile.career_score = round(random.uniform(10, 200), 2)
                        profile.is_active = True
                        profile.team = profile.team or team
                        profile.coach = profile.coach or coach
                        profile.save()

                    # Create sport-specific stats if not existing
                    if sport.name.lower() == "cricket":
                        stats, made = CricketStats.objects.get_or_create(
                            profile=profile,
                            defaults={
                                "matches_played": random.randint(1, 30),
                                "runs": random.randint(0, 1200),
                                "wickets": random.randint(0, 100),
                                "balls_faced": random.randint(10, 2000),
                                "balls_bowled": random.randint(0, 2000),
                            },
                        )
                        if made:
                            created_stats += 1
                        else:
                            stats.matches_played = random.randint(1, 30)
                            stats.runs = random.randint(0, 1200)
                            stats.wickets = random.randint(0, 100)
                            stats.balls_faced = random.randint(10, 2000)
                            stats.balls_bowled = random.randint(0, 2000)
                            stats.save()

                    elif sport.name.lower() == "football":
                        stats, made = FootballStats.objects.get_or_create(
                            profile=profile,
                            defaults={
                                "matches_played": random.randint(1, 30),
                                "goals": random.randint(0, 40),
                                "assists": random.randint(0, 40),
                                "tackles": random.randint(0, 200),
                            },
                        )
                        if made:
                            created_stats += 1
                        else:
                            stats.matches_played = random.randint(1, 30)
                            stats.goals = random.randint(0, 40)
                            stats.assists = random.randint(0, 40)
                            stats.tackles = random.randint(0, 200)
                            stats.save()

                    elif sport.name.lower() == "basketball":
                        stats, made = BasketballStats.objects.get_or_create(
                            profile=profile,
                            defaults={
                                "matches_played": random.randint(1, 30),
                                "points": random.randint(0, 800),
                                "rebounds": random.randint(0, 300),
                                "assists": random.randint(0, 300),
                            },
                        )
                        if made:
                            created_stats += 1
                        else:
                            stats.matches_played = random.randint(1, 30)
                            stats.points = random.randint(0, 800)
                            stats.rebounds = random.randint(0, 300)
                            stats.assists = random.randint(0, 300)
                            stats.save()

                    elif sport.name.lower() == "running":
                        stats, made = RunningStats.objects.get_or_create(
                            profile=profile,
                            defaults={
                                "matches_played": random.randint(1, 30),
                                "total_distance_km": round(random.uniform(10, 500), 2),
                                "best_time_seconds": round(random.uniform(10.0, 600.0), 2),
                                "events_participated": random.randint(0, 25),
                            },
                        )
                        if made:
                            created_stats += 1
                        else:
                            stats.matches_played = random.randint(1, 30)
                            stats.total_distance_km = round(random.uniform(10, 500), 2)
                            stats.best_time_seconds = round(random.uniform(10.0, 600.0), 2)
                            stats.events_participated = random.randint(0, 25)
                            stats.save()

                    # Add a small chance of an achievement
                    if random.random() < 0.4:
                        Achievement.objects.create(
                            player=player,
                            sport=sport,
                            title=random.choice([
                                "Player of the Match",
                                "Top Scorer",
                                "Best Defender",
                                "Fastest Lap",
                            ]),
                            tournament_name=random.choice([
                                "City League",
                                "Open Cup",
                                "Intercollege",
                                "District Meet",
                            ]),
                            description=random.choice([
                                "Outstanding performance throughout the game.",
                                "Consistent contribution to the team.",
                                "Exceptional display of skills.",
                                "Remarkable endurance and pace.",
                            ]),
                            date_awarded=timezone.now().date(),
                        )
                        created_achievements += 1

            # Performance scores (weekly)
            today = timezone.now().date()
            # approximate to last Monday
            monday = today - timezone.timedelta(days=today.weekday())
            base = random.uniform(40, 70)
            for i in range(weeks):
                wk = monday - timezone.timedelta(weeks=weeks - i - 1)
                # small random walk
                base = max(0.0, min(100.0, base + random.uniform(-5, 6)))
                ps, made = PerformanceScore.objects.get_or_create(
                    player=player,
                    week_start=wk,
                    defaults={"score": round(base, 2)},
                )
                if not made:
                    ps.score = round(base, 2)
                    ps.save()
                created_perf += 1

            # Create a few coaching sessions and attendance records
            for _ in range(random.randint(2, 5)):
                sess = CoachingSession.objects.create(
                    coach=coach,
                    team=team,
                    sport=random.choice(sports),
                    session_date=timezone.now() - timezone.timedelta(days=random.randint(1, 30)),
                    title=random.choice(["Drills", "Strategy", "Fitness", "Scrimmage"]),
                    notes=random.choice(["Focus on defense", "High intensity", "Recovery session", "Tactical review"]),
                )
                created_sessions += 1
                SessionAttendance.objects.get_or_create(
                    session=sess,
                    player=player,
                    defaults={"attended": random.choice([True, True, True, False]), "rating": random.randint(0, 10)},
                )
                created_session_att += 1

        # Recalculate leaderboard at the end
        recalc_leaderboard()

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded profiles: {created_profiles}, stats: {created_stats}, achievements: {created_achievements}, perf: {created_perf}, sessions: {created_sessions}, attendance: {created_session_att}. Leaderboard rebuilt."
            )
        )


