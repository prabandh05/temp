from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta
import random

from core.models import (
    User,
    Player,
    Coach,
    Manager,
    Admin,
    Sport,
    Team,
    PlayerSportProfile,
    CoachingSession,
    SessionAttendance,
    Tournament,
    TournamentTeam,
    TournamentMatch,
    ManagerSport,
    CoachPlayerLinkRequest,
    CricketStats,
    FootballStats,
    BasketballStats,
    RunningStats,
)
from core.utils import generate_coach_id

User = get_user_model()


class Command(BaseCommand):
    help = "Seed comprehensive demo data: multiple sports, coaches, players, teams, sessions, tournaments with full relationships"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing demo data before seeding",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write(self.style.WARNING("Clearing existing demo data..."))
            # Clear all demo-related data
            TournamentMatch.objects.filter(tournament__name__icontains="Demo").delete()
            TournamentTeam.objects.filter(tournament__name__icontains="Demo").delete()
            Tournament.objects.filter(name__icontains="Demo").delete()
            SessionAttendance.objects.filter(session__title__icontains="Demo").delete()
            CoachingSession.objects.filter(title__icontains="Demo").delete()
            CoachPlayerLinkRequest.objects.filter(coach__user__username__startswith="demo_").delete()
            Team.objects.filter(name__icontains="Demo").delete()
            # Delete stats first (they reference PlayerSportProfile)
            CricketStats.objects.filter(profile__player__user__username__startswith="demo_player").delete()
            FootballStats.objects.filter(profile__player__user__username__startswith="demo_player").delete()
            BasketballStats.objects.filter(profile__player__user__username__startswith="demo_player").delete()
            RunningStats.objects.filter(profile__player__user__username__startswith="demo_player").delete()
            PlayerSportProfile.objects.filter(player__user__username__startswith="demo_player").delete()
            Player.objects.filter(user__username__startswith="demo_player").delete()
            Coach.objects.filter(user__username__startswith="demo_coach").delete()
            Manager.objects.filter(user__username__startswith="demo_manager").delete()
            Admin.objects.filter(user__username__startswith="demo_admin").delete()
            User.objects.filter(username__startswith="demo_").delete()

        with transaction.atomic():
            # 1. Create Sports
            sports_data = [
                {"name": "Cricket", "sport_type": "team", "description": "Cricket sport"},
                {"name": "Football", "sport_type": "team", "description": "Football sport"},
                {"name": "Basketball", "sport_type": "team", "description": "Basketball sport"},
                {"name": "Running", "sport_type": "individual", "description": "Running sport"},
            ]
            sports = {}
            for sport_data in sports_data:
                sport, _ = Sport.objects.get_or_create(
                    name=sport_data["name"],
                    defaults=sport_data
                )
                sports[sport.name] = sport
                self.stdout.write(self.style.SUCCESS(f"✓ Sport: {sport.name}"))

            # 2. Create Coaches (one per sport)
            coaches = {}
            cricket = sports["Cricket"]
            football = sports["Football"]
            basketball = sports["Basketball"]
            running = sports["Running"]

            for idx, (sport_name, sport) in enumerate(sports.items(), 1):
                coach_user, created = User.objects.get_or_create(
                    username=f"demo_coach_{sport_name.lower()}",
                    defaults={
                        "email": f"demo_coach_{sport_name.lower()}@example.com",
                        "password": "pbkdf2_sha256$600000$dummy$dummy=",
                    }
                )
                if created:
                    coach_user.set_password("demo123")
                    coach_user.save()

                coach = Coach.objects.filter(user=coach_user).first()
                if not coach:
                    coach_id = generate_coach_id()
                    coach = Coach.objects.create(
                        user=coach_user,
                        primary_sport=sport,
                        coach_id=coach_id,
                    )
                else:
                    if not coach.primary_sport or coach.primary_sport_id != sport.id:
                        coach.primary_sport = sport
                        coach.save()

                if coach_user.role != User.Roles.COACH:
                    coach_user.role = User.Roles.COACH
                    coach_user.save()

                coaches[sport_name] = coach
                self.stdout.write(self.style.SUCCESS(f"✓ Coach: {coach_user.username} (ID: {coach.coach_id}) for {sport_name}"))

            # 3. Create Managers (one per sport)
            managers = {}
            for sport_name, sport in sports.items():
                manager_user, created = User.objects.get_or_create(
                    username=f"demo_manager_{sport_name.lower()}",
                    defaults={
                        "email": f"demo_manager_{sport_name.lower()}@example.com",
                        "password": "pbkdf2_sha256$600000$dummy$dummy=",
                        "role": User.Roles.MANAGER,
                    }
                )
                if created:
                    manager_user.set_password("demo123")
                    manager_user.save()

                manager, _ = Manager.objects.get_or_create(user=manager_user)
                ManagerSport.objects.get_or_create(
                    manager=manager,
                    sport=sport,
                    defaults={"assigned_by": manager_user}
                )
                managers[sport_name] = manager_user
                self.stdout.write(self.style.SUCCESS(f"✓ Manager: {manager_user.username} (ID: {manager.manager_id}) for {sport_name}"))

            # 4. Create Players (20 players total)
            all_players = []
            for i in range(1, 21):
                player_user, created = User.objects.get_or_create(
                    username=f"demo_player{i:02d}",
                    defaults={
                        "email": f"demo_player{i:02d}@example.com",
                        "password": "pbkdf2_sha256$600000$dummy$dummy=",
                        "role": User.Roles.PLAYER,
                    }
                )
                if created:
                    player_user.set_password("demo123")
                    player_user.save()

                player, _ = Player.objects.get_or_create(
                    user=player_user,
                    defaults={
                        "player_id": f"P25{i:05d}",
                        "is_active": True,
                    }
                )
                all_players.append(player)
                self.stdout.write(self.style.SUCCESS(f"✓ Player {i}: {player_user.username} (ID: {player.player_id})"))

            # 5. Create Teams (2 teams per sport)
            teams = {}
            for sport_name, sport in sports.items():
                manager = managers[sport_name]
                coach = coaches[sport_name]
                
                # Team 1
                team1, _ = Team.objects.get_or_create(
                    name=f"Demo {sport_name} Team 1",
                    defaults={
                        "sport": sport,
                        "manager": manager,
                        "coach": coach,
                    }
                )
                teams[f"{sport_name}_1"] = team1
                
                # Team 2 (for team sports only)
                if sport.sport_type == "team":
                    team2, _ = Team.objects.get_or_create(
                        name=f"Demo {sport_name} Team 2",
                        defaults={
                            "sport": sport,
                            "manager": manager,
                            "coach": coach,
                        }
                    )
                    teams[f"{sport_name}_2"] = team2
                    self.stdout.write(self.style.SUCCESS(f"✓ Teams: {team1.name}, {team2.name}"))
                else:
                    self.stdout.write(self.style.SUCCESS(f"✓ Team: {team1.name}"))

            # 6. Link Players to Sports, Coaches, and Teams
            # Distribute players across sports and teams
            players_per_sport = len(all_players) // len(sports)
            for idx, sport_name in enumerate(sports.keys()):
                sport = sports[sport_name]
                coach = coaches[sport_name]
                start_idx = idx * players_per_sport
                end_idx = start_idx + players_per_sport if idx < len(sports) - 1 else len(all_players)
                sport_players = all_players[start_idx:end_idx]
                
                # Split players into teams
                if sport.sport_type == "team":
                    team1 = teams[f"{sport_name}_1"]
                    team2 = teams[f"{sport_name}_2"]
                    mid = len(sport_players) // 2
                    team1_players = sport_players[:mid]
                    team2_players = sport_players[mid:]
                else:
                    team1 = teams.get(f"{sport_name}_1")
                    team1_players = sport_players
                    team2_players = []

                # Link players to team 1
                for player in team1_players:
                    profile, created = PlayerSportProfile.objects.get_or_create(
                        player=player,
                        sport=sport,
                        defaults={
                            "coach": coach,
                            "team": team1,
                            "is_active": True,
                            "career_score": round(random.uniform(40, 90), 2),
                            "joined_date": timezone.now().date() - timedelta(days=random.randint(30, 365)),
                        }
                    )
                    if not created:
                        profile.coach = coach
                        profile.team = team1
                        profile.is_active = True
                        profile.save()
                    
                    # Create sport-specific stats
                    if sport_name == "Cricket":
                        CricketStats.objects.get_or_create(
                            profile=profile,
                            defaults={
                                "runs": random.randint(100, 500),
                                "matches_played": random.randint(5, 20),
                                "strike_rate": round(random.uniform(120, 180), 2),
                                "average": round(random.uniform(25, 50), 2),
                                "wickets": random.randint(0, 30),
                            }
                        )
                    elif sport_name == "Football":
                        FootballStats.objects.get_or_create(
                            profile=profile,
                            defaults={
                                "goals": random.randint(5, 30),
                                "assists": random.randint(3, 20),
                                "tackles": random.randint(10, 50),
                                "matches_played": random.randint(5, 25),
                            }
                        )
                    elif sport_name == "Basketball":
                        BasketballStats.objects.get_or_create(
                            profile=profile,
                            defaults={
                                "points": random.randint(50, 200),
                                "rebounds": random.randint(20, 100),
                                "assists": random.randint(10, 50),
                                "matches_played": random.randint(5, 20),
                            }
                        )
                    elif sport_name == "Running":
                        RunningStats.objects.get_or_create(
                            profile=profile,
                            defaults={
                                "total_distance_km": round(random.uniform(50, 500), 2),
                                "best_time_seconds": random.randint(2400, 3600),
                                "events_participated": random.randint(3, 15),
                                "matches_played": random.randint(5, 20),
                            }
                        )

                # Link players to team 2
                for player in team2_players:
                    profile, created = PlayerSportProfile.objects.get_or_create(
                        player=player,
                        sport=sport,
                        defaults={
                            "coach": coach,
                            "team": team2,
                            "is_active": True,
                            "career_score": round(random.uniform(40, 90), 2),
                            "joined_date": timezone.now().date() - timedelta(days=random.randint(30, 365)),
                        }
                    )
                    if not created:
                        profile.coach = coach
                        profile.team = team2
                        profile.is_active = True
                        profile.save()
                    
                    # Create sport-specific stats
                    if sport_name == "Cricket":
                        CricketStats.objects.get_or_create(
                            profile=profile,
                            defaults={
                                "runs": random.randint(100, 500),
                                "matches_played": random.randint(5, 20),
                                "strike_rate": round(random.uniform(120, 180), 2),
                                "average": round(random.uniform(25, 50), 2),
                                "wickets": random.randint(0, 30),
                            }
                        )
                    elif sport_name == "Football":
                        FootballStats.objects.get_or_create(
                            profile=profile,
                            defaults={
                                "goals": random.randint(5, 30),
                                "assists": random.randint(3, 20),
                                "tackles": random.randint(10, 50),
                                "matches_played": random.randint(5, 25),
                            }
                        )
                    elif sport_name == "Basketball":
                        BasketballStats.objects.get_or_create(
                            profile=profile,
                            defaults={
                                "points": random.randint(50, 200),
                                "rebounds": random.randint(20, 100),
                                "assists": random.randint(10, 50),
                                "matches_played": random.randint(5, 20),
                            }
                        )
                    elif sport_name == "Running":
                        RunningStats.objects.get_or_create(
                            profile=profile,
                            defaults={
                                "total_distance_km": round(random.uniform(50, 500), 2),
                                "best_time_seconds": random.randint(2400, 3600),
                                "events_participated": random.randint(3, 15),
                                "matches_played": random.randint(5, 20),
                            }
                        )

                # Create coach-player links (students - not in teams)
                # Some players are students only (not in teams)
                student_players = all_players[:5]  # First 5 players as students
                for player in student_players:
                    # Check if already has profile
                    profile, _ = PlayerSportProfile.objects.get_or_create(
                        player=player,
                        sport=sport,
                        defaults={
                            "coach": coach,
                            "team": None,
                            "is_active": True,
                            "career_score": round(random.uniform(30, 70), 2),
                            "joined_date": timezone.now().date() - timedelta(days=random.randint(10, 180)),
                        }
                    )
                    if not profile.coach:
                        profile.coach = coach
                        profile.is_active = True
                        profile.save()
                    
                    # Create accepted link request
                    CoachPlayerLinkRequest.objects.get_or_create(
                        coach=coach,
                        player=player,
                        sport=sport,
                        defaults={
                            "direction": "coach_to_player",
                            "status": "accepted",
                            "decided_at": timezone.now(),
                        }
                    )

            self.stdout.write(self.style.SUCCESS(f"✓ Linked all players to sports, coaches, and teams"))

            # 7. Create Coaching Sessions (10 sessions per sport)
            for sport_name, sport in sports.items():
                coach = coaches[sport_name]
                team1 = teams.get(f"{sport_name}_1")
                
                for i in range(1, 11):
                    session = CoachingSession.objects.create(
                        coach=coach,
                        team=team1,
                        sport=sport,
                        session_date=timezone.now() - timedelta(days=10-i),
                        title=f"Demo {sport_name} Session {i}",
                        notes=f"Practice session {i} - Focus on skills and techniques",
                    )
                    
                    # Get players for this sport
                    profiles = PlayerSportProfile.objects.filter(
                        sport=sport,
                        coach=coach,
                        is_active=True
                    ).select_related("player")
                    
                    # Add attendance for players
                    for profile in profiles[:8]:  # Limit to 8 players per session
                        SessionAttendance.objects.create(
                            session=session,
                            player=profile.player,
                            attended=random.choice([True, True, True, False]),  # 75% attendance
                            rating=random.randint(5, 10),
                        )

            self.stdout.write(self.style.SUCCESS(f"✓ Created 10 sessions per sport"))

            # 8. Create Tournaments (1 per sport)
            tournaments = {}
            for sport_name, sport in sports.items():
                manager = managers[sport_name]
                tournament = Tournament.objects.create(
                    name=f"Demo {sport_name} Championship",
                    sport=sport,
                    manager=manager,
                    location=f"Demo {sport_name} Stadium",
                    start_date=timezone.now() - timedelta(days=5),
                    end_date=timezone.now() + timedelta(days=10),
                    created_by=manager,
                )
                tournaments[sport_name] = tournament
                self.stdout.write(self.style.SUCCESS(f"✓ Tournament: {tournament.name}"))

                # Add teams to tournament
                team1 = teams.get(f"{sport_name}_1")
                if team1:
                    TournamentTeam.objects.get_or_create(
                        tournament=tournament,
                        team=team1,
                    )
                
                team2 = teams.get(f"{sport_name}_2")
                if team2:
                    TournamentTeam.objects.get_or_create(
                        tournament=tournament,
                        team=team2,
                    )

            self.stdout.write(self.style.SUCCESS(f"✓ Added teams to tournaments"))

            # 9. Create Tournament Matches
            for sport_name, tournament in tournaments.items():
                team1 = teams.get(f"{sport_name}_1")
                team2 = teams.get(f"{sport_name}_2")
                
                if team1 and team2:
                    # Create 3 matches
                    for match_num in range(1, 4):
                        # Get random players from teams
                        team1_profiles = PlayerSportProfile.objects.filter(team=team1, sport=sport).select_related("player")
                        team1_players = [p.player for p in team1_profiles]
                        
                        match = TournamentMatch.objects.create(
                            tournament=tournament,
                            team1=team1,
                            team2=team2,
                            match_number=match_num,
                            date=timezone.now() - timedelta(days=4-match_num),
                            score_team1=random.randint(100, 200) if sport_name != "Running" else random.randint(80, 120),
                            score_team2=random.randint(100, 200) if sport_name != "Running" else random.randint(80, 120),
                            location=tournament.location,
                            is_completed=True,
                            man_of_the_match=team1_players[0] if team1_players else None,
                            notes=f"Demo match {match_num} - {sport_name}",
                        )
                        self.stdout.write(self.style.SUCCESS(f"✓ Match {match_num}: {team1.name} vs {team2.name}"))

            # 10. Create Admin
            admin_user, created = User.objects.get_or_create(
                username="demo_admin",
                defaults={
                    "email": "demo_admin@example.com",
                    "password": "pbkdf2_sha256$600000$dummy$dummy=",
                }
            )
            if created:
                admin_user.set_password("demo123")
                admin_user.save()
            if admin_user.role != User.Roles.ADMIN:
                admin_user.role = User.Roles.ADMIN
                admin_user.save()
            admin_profile = Admin.objects.filter(user=admin_user).first()
            admin_id = admin_profile.admin_id if admin_profile else "N/A"
            self.stdout.write(self.style.SUCCESS(f"✓ Admin: {admin_user.username} (ID: {admin_id})"))

        summary = (
            "\n" + "="*60 + "\n"
            + "COMPREHENSIVE DEMO DATA SEEDED SUCCESSFULLY!\n"
            + "="*60 + "\n"
            + f"Sports: {', '.join(sports.keys())}\n"
            + f"Coaches: {len(coaches)} (one per sport)\n"
            + f"Managers: {len(managers)} (one per sport)\n"
            + f"Players: 20 total\n"
            + f"Teams: {len(teams)} total\n"
            + f"Sessions: 10 per sport ({len(sports) * 10} total)\n"
            + f"Tournaments: {len(tournaments)} (one per sport)\n"
            + f"Matches: 3 per tournament ({len(tournaments) * 3} total)\n"
            + "\nCredentials:\n"
            + "Admin: demo_admin / demo123\n"
            + "Coaches: demo_coach_cricket, demo_coach_football, demo_coach_basketball, demo_coach_running / demo123\n"
            + "Managers: demo_manager_cricket, demo_manager_football, demo_manager_basketball, demo_manager_running / demo123\n"
            + "Players: demo_player01 to demo_player20 / demo123\n"
            + "\nAll relationships are properly connected:\n"
            + "- Players linked to coaches (as students)\n"
            + "- Players assigned to teams\n"
            + "- Sessions with attendance records\n"
            + "- Tournaments with teams and matches\n"
            + "- Sport-specific statistics (Cricket, Football, Basketball, Running)\n"
            + "="*60 + "\n"
        )
        self.stdout.write(self.style.SUCCESS(summary))
