from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model

from core.models import (
    User,
    Player,
    Coach,
    Manager,
    Admin,
    Sport,
    PlayerSportProfile,
    ManagerSport,
    CricketStats,
    FootballStats,
    BasketballStats,
    RunningStats,
)

User = get_user_model()


class Command(BaseCommand):
    help = "Seed clean demo data: 30 cricket players, coaches for all sports, and linked students for other sports"

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
            ManagerSport.objects.filter(manager__user__username__startswith="demo_").delete()
            PlayerSportProfile.objects.filter(player__user__username__startswith="demo_").delete()
            Player.objects.filter(user__username__startswith="demo_").delete()
            Coach.objects.filter(user__username__startswith="demo_").delete()
            Manager.objects.filter(user__username__startswith="demo_").delete()
            Admin.objects.filter(user__username__startswith="demo_").delete()
            User.objects.filter(username__startswith="demo_").delete()

        with transaction.atomic():
            # 1. Get or Create Sports
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

            # 2. Create Admin (one admin for managing everything)
            admin_user, admin_created = User.objects.get_or_create(
                username="demo_admin",
                defaults={
                    "email": "demo_admin@example.com",
                    "password": "pbkdf2_sha256$600000$dummy$dummy=",
                }
            )
            if admin_created:
                admin_user.set_password("demo123")
                admin_user.role = User.Roles.ADMIN
                admin_user.save()
                # Admin profile is created by signal
                self.stdout.write(self.style.SUCCESS(f"✓ Admin: {admin_user.username}"))
            else:
                # Ensure admin profile exists
                if not hasattr(admin_user, 'admin'):
                    admin_user.role = User.Roles.ADMIN
                    admin_user.save()
                self.stdout.write(self.style.SUCCESS(f"✓ Admin: {admin_user.username} (already exists)"))

            # 3. Create Managers (one per sport, auto-assigned to their sport)
            managers = {}
            for sport_name, sport in sports.items():
                manager_user, manager_created = User.objects.get_or_create(
                    username=f"demo_manager_{sport_name.lower()}",
                    defaults={
                        "email": f"demo_manager_{sport_name.lower()}@example.com",
                        "password": "pbkdf2_sha256$600000$dummy$dummy=",
                    }
                )
                if manager_created:
                    manager_user.set_password("demo123")
                    manager_user.role = User.Roles.MANAGER
                    manager_user.save()
                
                # Ensure manager profile exists (created by signal)
                manager, _ = Manager.objects.get_or_create(user=manager_user)
                
                # Auto-assign manager to this sport (created by signal or manually here)
                ManagerSport.objects.get_or_create(
                    manager=manager,
                    sport=sport,
                    defaults={"assigned_by": admin_user}
                )
                
                managers[sport_name] = manager
                self.stdout.write(self.style.SUCCESS(f"✓ Manager: {manager_user.username} (ID: {manager.manager_id}, Assigned to: {sport.name})"))

            # 4. Create Coaches (one per sport)
            coaches = {}
            for sport_name, sport in sports.items():
                coach_user, created = User.objects.get_or_create(
                    username=f"demo_coach_{sport_name.lower()}",
                    defaults={
                        "email": f"demo_coach_{sport_name.lower()}@example.com",
                        "password": "pbkdf2_sha256$600000$dummy$dummy=",
                    }
                )
                if created:
                    coach_user.set_password("demo123")
                    coach_user.role = User.Roles.COACH
                    coach_user.save()
                
                # Ensure coach profile exists (created by signal)
                coach, _ = Coach.objects.get_or_create(user=coach_user)
                # Set primary sport for the coach
                if coach.primary_sport_id != sport.id:
                    coach.primary_sport = sport
                    coach.save()
                coaches[sport_name] = coach
                self.stdout.write(self.style.SUCCESS(f"✓ Coach: {coach_user.username} (ID: {coach.coach_id}, Sport: {sport.name})"))

            # 5. Create 30 Cricket Players (Auto-link most, leave first one unlinked for demo)
            cricket_players = []
            cricket_sport = sports["Cricket"]
            cricket_coach = coaches["Cricket"]
            
            for i in range(1, 31):
                player_user, created = User.objects.get_or_create(
                    username=f"demo_cricket_player_{i:02d}",
                    defaults={
                        "email": f"demo_cricket_player_{i:02d}@example.com",
                        "password": "pbkdf2_sha256$600000$dummy$dummy=",
                    }
                )
                if created:
                    player_user.set_password("demo123")
                    player_user.role = User.Roles.PLAYER
                    player_user.save()
                
                # Ensure player profile exists (created by signal)
                player, _ = Player.objects.get_or_create(user=player_user)
                
                # Link to coach EXCEPT for player 01 (for demo purposes)
                # Player 01 will be unlinked so you can demonstrate the "Apply for Coach" flow
                should_link = i != 1  # Don't link player 01
                
                # Create sport profile
                profile, _ = PlayerSportProfile.objects.get_or_create(
                    player=player,
                    sport=cricket_sport,
                    defaults={
                        "coach": cricket_coach if should_link else None,  # Link all except player 01
                        "team": None,
                        "is_active": should_link,  # Active only if linked
                        "career_score": 0.0,
                    }
                )
                
                # If profile already exists but needs linking, update it
                if should_link and profile.coach_id != cricket_coach.id:
                    profile.coach = cricket_coach
                    profile.is_active = True
                    profile.save()
                
                # Create empty cricket stats
                CricketStats.objects.get_or_create(
                    profile=profile,
                    defaults={
                        "runs": 0,
                        "matches_played": 0,
                        "strike_rate": 0.0,
                        "average": 0.0,
                        "wickets": 0,
                    }
                )
                
                cricket_players.append(player)
                status_text = "Linked to coach" if should_link else "NOT linked (for demo)"
                self.stdout.write(self.style.SUCCESS(f"✓ Cricket Player {i}: {player_user.username} ({status_text})"))

            # 6. Create players for other sports and link them to coaches as students
            other_sports_config = [
                {"name": "Football", "count": 10},
                {"name": "Basketball", "count": 10},
                {"name": "Running", "count": 5},
            ]
            
            for sport_config in other_sports_config:
                sport_name = sport_config["name"]
                count = sport_config["count"]
                sport = sports[sport_name]
                coach = coaches[sport_name]
                
                for i in range(1, count + 1):
                    player_user, created = User.objects.get_or_create(
                        username=f"demo_{sport_name.lower()}_player_{i:02d}",
                        defaults={
                            "email": f"demo_{sport_name.lower()}_player_{i:02d}@example.com",
                            "password": "pbkdf2_sha256$600000$dummy$dummy=",
                        }
                    )
                    if created:
                        player_user.set_password("demo123")
                        player_user.role = User.Roles.PLAYER
                        player_user.save()
                    
                    # Ensure player profile exists (created by signal)
                    player, _ = Player.objects.get_or_create(user=player_user)
                    
                    # Create sport profile and LINK to coach (auto-linked)
                    profile, _ = PlayerSportProfile.objects.get_or_create(
                        player=player,
                        sport=sport,
                        defaults={
                            "coach": coach,
                            "team": None,
                            "is_active": True,
                            "career_score": 0.0,
                        }
                    )
                    
                    # Create empty sport-specific stats
                    if sport_name == "Football":
                        FootballStats.objects.get_or_create(
                            profile=profile,
                            defaults={
                                "goals": 0,
                                "assists": 0,
                                "tackles": 0,
                                "matches_played": 0,
                            }
                        )
                    elif sport_name == "Basketball":
                        BasketballStats.objects.get_or_create(
                            profile=profile,
                            defaults={
                                "points": 0,
                                "rebounds": 0,
                                "assists": 0,
                                "matches_played": 0,
                            }
                        )
                    elif sport_name == "Running":
                        RunningStats.objects.get_or_create(
                            profile=profile,
                            defaults={
                                "total_distance_km": 0.0,
                                "best_time_seconds": 0,
                                "events_participated": 0,
                                "matches_played": 0,
                            }
                        )
                    
                    self.stdout.write(self.style.SUCCESS(f"✓ {sport_name} Player {i}: {player_user.username} (Linked to coach)"))

        summary = (
            "\n" + "="*60 + "\n"
            + "CLEAN DEMO DATA SEEDED SUCCESSFULLY!\n"
            + "="*60 + "\n"
            + f"Sports: {', '.join(sports.keys())}\n"
            + f"Admin: 1 (demo_admin)\n"
            + f"Managers: {len(managers)} (one per sport, auto-assigned to their sport)\n"
            + f"Coaches: {len(coaches)} (one per sport)\n"
            + f"Cricket Players: 30 (29 auto-linked, 1 unlinked for demo - demo_cricket_player_01)\n"
            + f"Football Players: 10 (Linked to coach as students)\n"
            + f"Basketball Players: 10 (Linked to coach as students)\n"
            + f"Running Players: 5 (Linked to coach as students)\n"
            + "\nCredentials:\n"
            + "Admin: demo_admin / demo123\n"
            + "Managers: demo_manager_cricket, demo_manager_football, demo_manager_basketball, demo_manager_running / demo123\n"
            + "Coaches: demo_coach_cricket, demo_coach_football, demo_coach_basketball, demo_coach_running / demo123\n"
            + "Cricket Players: demo_cricket_player_01 to demo_cricket_player_30 / demo123\n"
            + "Football Players: demo_football_player_01 to demo_football_player_10 / demo123\n"
            + "Basketball Players: demo_basketball_player_01 to demo_basketball_player_10 / demo123\n"
            + "Running Players: demo_running_player_01 to demo_running_player_05 / demo123\n"
            + "\nNotes:\n"
            + "- Admin (demo_admin) can manage everything\n"
            + "- Each manager is auto-assigned to their respective sport\n"
            + "- Cricket player 01 (demo_cricket_player_01) is NOT linked to coach (for demo)\n"
            + "- All other cricket players (02-30) are auto-linked to the cricket coach\n"
            + "- Other sports players are auto-linked to coaches as students\n"
            + "- No sessions, teams, or tournaments created\n"
            + "- All stats start at zero\n"
            + "- No achievements created\n"
            + "="*60 + "\n"
        )
        self.stdout.write(self.style.SUCCESS(summary))
