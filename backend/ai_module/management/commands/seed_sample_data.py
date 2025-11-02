# ai_module/management/commands/seed_sample_data.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from core.models import Player, Team, Match, Attendance
import random

User = get_user_model()

class Command(BaseCommand):
    help = "Seed sample data for AI model training"

    def handle(self, *args, **kwargs):
        self.stdout.write("🌱 Seeding sample data...")

        # -----------------------------
        # Create Teams
        # -----------------------------
        teams = []
        for i in range(3):
            team, _ = Team.objects.get_or_create(name=f"Team {i+1}")
            teams.append(team)
        self.stdout.write(f"✅ Created {len(teams)} teams")

        # -----------------------------
        # Create Players (linked to Users)
        # -----------------------------
        for i in range(10):
            user, _ = User.objects.get_or_create(
                username=f"player{i+1}",
                defaults={
                    "email": f"player{i+1}@example.com",
                    "is_player": True,
                }
            )
            team = random.choice(teams)
            Player.objects.get_or_create(
                user=user,
                defaults={
                    "team": team,
                    "bio": f"Player {i+1} bio",
                }
            )
        self.stdout.write("✅ Created players")

        # -----------------------------
        # Create Matches
        # -----------------------------
        if len(teams) >= 2:
            for i in range(15):
                team1 = random.choice(teams)
                team2 = random.choice([t for t in teams if t != team1])  # ensure different teams

                match = Match.objects.create(
                    team1=team1,
                    team2=team2,
                    date=timezone.now(),
                    location=f"Stadium {i+1}",
                    score_team1=random.randint(0, 5),
                    score_team2=random.randint(0, 5),
                    is_completed=True,
                )

                # -----------------------------
                # Create Attendance for Players
                # -----------------------------
                for player in random.sample(list(Player.objects.all()), k=5):
                    Attendance.objects.create(
                        player=player,
                        match=match,
                        attended=random.choice([True, False]),
                        notes=random.choice(["Good performance", "Missed due to injury", ""]),
                    )
            self.stdout.write("✅ Created matches and attendance records")
        else:
            self.stdout.write("⚠️ Not enough teams to create matches")

        self.stdout.write(self.style.SUCCESS("🎉 Sample data seeded successfully!"))
