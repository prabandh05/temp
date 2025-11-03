from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import AbstractUser
import datetime
# -----------------------------

# Generate player id - REMOVED from here, will be generated in serializer for robustness.
# def generate_player_id():
#     """Generate unique player ID like P25xxxxx"""
#     current_year = str(datetime.date.today().year)[-2:]  # e.g. '25'
#     count = Player.objects.count() + 1
#     return f"P{current_year}{count:05d}"  # -> P2500001


class User(AbstractUser):
    class Roles(models.TextChoices):
        PLAYER = "player", _("Player")
        COACH = "coach", _("Coach")
        MANAGER = "manager", _("Manager")
        ADMIN = "admin", _("Admin")  # can keep for clarity, or you can use is_staff/is_superuser

    role = models.CharField(
        max_length=20,
        choices=Roles.choices,
        default=Roles.PLAYER,
    )

    # remove is_player/is_coach/is_admin fields afterwards
    def is_player(self):
        return self.role == self.Roles.PLAYER

    def is_coach(self):
        return self.role == self.Roles.COACH

    def is_manager(self):
        return self.role == self.Roles.MANAGER

    def is_admin_role(self):
        return self.role == self.Roles.ADMIN


    def __str__(self):
        return self.username
# -----------------------------
# Player Model
# -----------------------------
class Player(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="player")
    player_id = models.CharField(max_length=10, unique=True)

    bio = models.TextField(blank=True, null=True)
    team = models.ForeignKey('Team', on_delete=models.SET_NULL, null=True, blank=True)
    joined_at = models.DateTimeField(default=timezone.now)
    college = models.CharField(max_length=100, blank=True, null=True)
    coach = models.ForeignKey('Coach', on_delete=models.SET_NULL, null=True, blank=True)
    is_public = models.BooleanField(default=True)  # privacy toggle
    is_active = models.BooleanField(default=True, help_text="If false, player is excluded from current competitions and assignments")

    def __str__(self):
        return f"{self.player_id} - {self.user.username}"


class PlayerQuerySet(models.QuerySet):
    def active(self):
        return self.filter(is_active=True)


class PlayerManager(models.Manager.from_queryset(PlayerQuerySet)):
    pass


# -----------------------------
# Sport Model (Master)
# -----------------------------
class Sport(models.Model):
    SPORT_TYPES = [
        ("team", "Team Sport"),
        ("individual", "Individual Sport"),
    ]

    name = models.CharField(max_length=50, unique=True)
    sport_type = models.CharField(max_length=20, choices=SPORT_TYPES, default="team")
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name
# -----------------------------

#Sport Profile Model
class PlayerSportProfile(models.Model):
    player = models.ForeignKey("Player", on_delete=models.CASCADE, related_name="sport_profiles")
    sport = models.ForeignKey("Sport", on_delete=models.CASCADE, related_name="profiles", null=True, blank=True)
    team = models.ForeignKey("Team", on_delete=models.SET_NULL, null=True, blank=True, related_name="players")
    coach = models.ForeignKey("Coach", on_delete=models.SET_NULL, null=True, blank=True, related_name="players")
    joined_date = models.DateField(default=timezone.now)
    is_active = models.BooleanField(default=True)
    career_score = models.FloatField(default=0.0)

    class Meta:
        unique_together = ("player", "sport")

    def __str__(self):
        return f"{self.player.user.username} - {self.sport.name if self.sport else 'Unknown'}"


# -----------------------------

#Base Stats Model
# -----------------------------
# Base Stats Model
# -----------------------------
class SportStatsBase(models.Model):
    matches_played = models.PositiveIntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True




#ALL Sport Stats Models

#cricket stats model
class CricketStats(SportStatsBase):
    profile = models.ForeignKey(PlayerSportProfile, on_delete=models.CASCADE, related_name="cricket_stats")
    runs = models.PositiveIntegerField(default=0)
    wickets = models.PositiveIntegerField(default=0)
    balls_faced = models.PositiveIntegerField(default=0)
    balls_bowled = models.PositiveIntegerField(default=0)
    average = models.FloatField(default=0.0)
    strike_rate = models.FloatField(default=0.0)

    def save(self, *args, **kwargs):
        if self.balls_faced > 0:
            self.strike_rate = (self.runs / self.balls_faced) * 100
        if self.matches_played > 0:
            self.average = self.runs / self.matches_played
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.profile.player.user.username} - Cricket Stats"

# -----------------------------
# Football Stats
# -----------------------------
class FootballStats(SportStatsBase):
    profile = models.ForeignKey(PlayerSportProfile, on_delete=models.CASCADE, related_name="football_stats")
    goals = models.PositiveIntegerField(default=0)
    assists = models.PositiveIntegerField(default=0)
    tackles = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.profile.player.user.username} - Football Stats"



# -----------------------------
# Basketball Stats
# -----------------------------
class BasketballStats(SportStatsBase):
    profile = models.ForeignKey(PlayerSportProfile, on_delete=models.CASCADE, related_name="basketball_stats")
    points = models.PositiveIntegerField(default=0)
    rebounds = models.PositiveIntegerField(default=0)
    assists = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.profile.player.user.username} - Basketball Stats"


# -----------------------------
# Running Stats
# -----------------------------
class RunningStats(SportStatsBase):
    profile = models.ForeignKey(PlayerSportProfile, on_delete=models.CASCADE, related_name="running_stats")
    total_distance_km = models.FloatField(default=0.0)
    best_time_seconds = models.FloatField(default=0.0)
    events_participated = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.profile.player.user.username} - Running Stats"

# -----------------------------



#achievements model
class Achievement(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="achievements")
    match = models.ForeignKey('Match', on_delete=models.SET_NULL, null=True, blank=True)
    sport = models.ForeignKey('Sport', on_delete=models.SET_NULL, null=True, blank=True)
    tournament_name = models.CharField(max_length=100, blank=True, null=True)
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    date_awarded = models.DateField(default=timezone.now)

    def __str__(self):
        return f"{self.title} - {self.player.user.username}"

# -----------------------------
# Coach Model
# -----------------------------
class Coach(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="coach")
    coach_id = models.CharField(max_length=8, unique=True, help_text="Immutable external ID: CYYNNNNN", null=True, blank=True)
    primary_sport = models.ForeignKey('Sport', on_delete=models.PROTECT, related_name='primary_coaches', null=True, blank=True)
    from_player = models.OneToOneField('Player', on_delete=models.SET_NULL, null=True, blank=True, related_name='promoted_to_coach')
    experience = models.PositiveIntegerField(default=0)
    specialization = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return getattr(self.user, "username", str(self.user))

    def save(self, *args, **kwargs):
        if self.pk is not None:
            original = Coach.objects.get(pk=self.pk)
            if original.coach_id != self.coach_id:
                raise ValueError("coach_id is immutable and cannot be changed")
        if not self.coach_id or len(self.coach_id) != 8:
            raise ValueError("coach_id must be exactly 8 characters: CYYNNNNN")
        super().save(*args, **kwargs)
    
#role history model
class RoleHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='role_history')
    previous_role = models.CharField(max_length=20)
    new_role = models.CharField(max_length=20)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='role_changes_made')
    changed_on = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.user.username}: {self.previous_role} → {self.new_role}"


# -----------------------------
# Team Model
# -----------------------------
class Team(models.Model):
    name = models.CharField(max_length=100)
    logo = models.ImageField(upload_to='team_logos/', blank=True, null=True)
    coach = models.ForeignKey(Coach, on_delete=models.SET_NULL, null=True, blank=True)
    manager = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_teams')
    sport = models.ForeignKey(Sport, on_delete=models.PROTECT, null=True, blank=True, related_name='teams')
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name

    def clean(self):
        # Ensure team sport matches coach primary sport when both provided
        if self.coach and self.sport and self.coach.primary_sport_id != self.sport_id:
            from django.core.exceptions import ValidationError
            raise ValidationError({"coach": "Coach primary sport must match team sport"})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

# -----------------------------
# Match Model
# -----------------------------
class Match(models.Model):
    team1 = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='matches_as_team1')
    team2 = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='matches_as_team2')
    date = models.DateTimeField(default=timezone.now)
    score_team1 = models.IntegerField(default=0)
    score_team2 = models.IntegerField(default=0)
    location = models.CharField(max_length=200, blank=True, null=True)
    is_completed = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.team1} vs {self.team2} on {self.date.strftime('%Y-%m-%d')}"

# -----------------------------
# Attendance Model
# -----------------------------
class Attendance(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    match = models.ForeignKey(Match, on_delete=models.CASCADE)
    attended = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        unique_together = ['player', 'match']
    
    def __str__(self):
        status = "Present" if self.attended else "Absent"
        return f"{self.player} - {self.match} ({status})"

# -----------------------------
# Leaderboard Model
# -----------------------------
class Leaderboard(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    score = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.player.user.username} - {self.score}"

    class Meta:
        indexes = [
            models.Index(fields=["-score"]),
        ]

# -----------------------------
# Performance score over time (weekly)
# -----------------------------
class PerformanceScore(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="performance_scores")
    week_start = models.DateField(help_text="Start of ISO week (Monday)")
    score = models.FloatField(default=0.0)

    class Meta:
        unique_together = ("player", "week_start")
        ordering = ["-week_start"]

    def __str__(self):
        return f"{self.player.user.username} @ {self.week_start}: {self.score}"


# -----------------------------
# Coaching sessions and attendance
# -----------------------------
class CoachingSession(models.Model):
    coach = models.ForeignKey(Coach, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True)
    sport = models.ForeignKey(Sport, on_delete=models.SET_NULL, null=True, blank=True)
    session_date = models.DateTimeField(default=timezone.now)
    title = models.CharField(max_length=120, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{getattr(self.coach.user, 'username', 'Coach')} session on {self.session_date.date()}"


class SessionAttendance(models.Model):
    session = models.ForeignKey(CoachingSession, on_delete=models.CASCADE, related_name="attendances")
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="session_attendances")
    attended = models.BooleanField(default=True)
    rating = models.PositiveIntegerField(default=0, help_text="Optional per-session rating by coach")

    class Meta:
        unique_together = ("session", "player")

    def __str__(self):
        return f"{self.player} - {self.session} ({'Present' if self.attended else 'Absent'})"


# -----------------------------
# Promotion request & daily performance
# -----------------------------
class PromotionRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="promotion_requests")
    player = models.ForeignKey(Player, on_delete=models.SET_NULL, null=True, blank=True, related_name="promotion_requests")
    sport = models.ForeignKey(Sport, on_delete=models.PROTECT, related_name="promotion_requests")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    requested_at = models.DateTimeField(default=timezone.now)
    decided_at = models.DateTimeField(null=True, blank=True)
    decided_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="promotion_decisions")
    remarks = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Promotion[{self.get_status_display()}] {getattr(self.user, 'username', 'user')} → coach"


class DailyPerformanceScore(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="daily_performance_scores")
    date = models.DateField(help_text="Calendar day")
    score = models.FloatField(default=0.0)

    class Meta:
        unique_together = ("player", "date")
        ordering = ["-date"]

    def __str__(self):
        return f"{self.player.user.username} @ {self.date}: {self.score}"


# -----------------------------
# Coach ↔ Player link requests (per sport)
# -----------------------------
class CoachPlayerLinkRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"

    class Direction(models.TextChoices):
        COACH_TO_PLAYER = "coach_to_player", "Coach Invited Player"
        PLAYER_TO_COACH = "player_to_coach", "Player Requested Coach"

    coach = models.ForeignKey(Coach, on_delete=models.CASCADE, related_name="link_requests")
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="coach_link_requests")
    sport = models.ForeignKey(Sport, on_delete=models.PROTECT, related_name="coach_player_links")
    direction = models.CharField(max_length=32, choices=Direction.choices)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(default=timezone.now)
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("coach", "player", "sport", "status")

    def __str__(self):
        return f"{self.get_direction_display()}: {getattr(self.coach.user, 'username', 'coach')} ↔ {getattr(self.player.user, 'username', 'player')} [{self.get_status_display()}]"


# -----------------------------
# Manager Model
# -----------------------------
class Manager(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="manager")
    manager_id = models.CharField(max_length=10, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{getattr(self.user, 'username', 'Manager')}"

    def save(self, *args, **kwargs):
        if not self.manager_id:
            # Generate manager ID: MYYNNNNN
            current_year = str(datetime.date.today().year)[-2:]
            count = Manager.objects.count() + 1
            self.manager_id = f"M{current_year}{count:05d}"
        super().save(*args, **kwargs)


# -----------------------------
# Manager-Sport relationship (one manager per sport)
# -----------------------------
class ManagerSport(models.Model):
    manager = models.ForeignKey(Manager, on_delete=models.CASCADE, related_name="sports")
    sport = models.ForeignKey(Sport, on_delete=models.CASCADE, related_name="managers")
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="manager_assignments")
    assigned_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ("manager", "sport")

    def __str__(self):
        return f"{self.manager.user.username} - {self.sport.name}"


# -----------------------------
# Team Proposal (coach proposes team from students)
# -----------------------------
class TeamProposal(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    coach = models.ForeignKey(Coach, on_delete=models.CASCADE, related_name="team_proposals")
    manager = models.ForeignKey(User, on_delete=models.CASCADE, related_name="team_proposals", help_text="Manager who will review")
    sport = models.ForeignKey(Sport, on_delete=models.PROTECT, related_name="team_proposals")
    team_name = models.CharField(max_length=100)
    proposed_players = models.ManyToManyField(Player, related_name="team_proposals")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(default=timezone.now)
    decided_at = models.DateTimeField(null=True, blank=True)
    remarks = models.TextField(blank=True, null=True)
    created_team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True, related_name="from_proposal")

    def __str__(self):
        return f"Team Proposal: {self.team_name} by {getattr(self.coach.user, 'username', 'Coach')} [{self.get_status_display()}]"


# -----------------------------
# Team Assignment Request (manager assigns coach to team)
# -----------------------------
class TeamAssignmentRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"

    manager = models.ForeignKey(User, on_delete=models.CASCADE, related_name="team_assignments")
    coach = models.ForeignKey(Coach, on_delete=models.CASCADE, related_name="team_assignments")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="assignment_requests")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(default=timezone.now)
    decided_at = models.DateTimeField(null=True, blank=True)
    remarks = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ("coach", "team", "status")

    def __str__(self):
        return f"Assignment: {self.team.name} → {getattr(self.coach.user, 'username', 'Coach')} [{self.get_status_display()}]"


# -----------------------------
# Tournament Models (base + flexible)
# -----------------------------
class Tournament(models.Model):
    class Status(models.TextChoices):
        UPCOMING = "upcoming", "Upcoming"
        ONGOING = "ongoing", "Ongoing"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    name = models.CharField(max_length=200)
    sport = models.ForeignKey(Sport, on_delete=models.PROTECT, related_name="tournaments")
    manager = models.ForeignKey(User, on_delete=models.PROTECT, related_name="managed_tournaments", help_text="Manager who owns/manages this tournament")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_tournaments")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UPCOMING)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    location = models.CharField(max_length=200, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.name} ({self.sport.name})"


class TournamentTeam(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="teams")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="tournament_participations")
    registered_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ("tournament", "team")

    def __str__(self):
        return f"{self.team.name} in {self.tournament.name}"


class TournamentMatch(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="matches")
    team1 = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="tournament_matches_as_team1")
    team2 = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="tournament_matches_as_team2")
    match_number = models.PositiveIntegerField(default=1, help_text="Match number in tournament")
    date = models.DateTimeField(default=timezone.now)
    score_team1 = models.IntegerField(default=0)
    score_team2 = models.IntegerField(default=0)
    location = models.CharField(max_length=200, blank=True, null=True)
    is_completed = models.BooleanField(default=False)
    man_of_the_match = models.ForeignKey(Player, on_delete=models.SET_NULL, null=True, blank=True, related_name="mom_awards")
    notes = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ("tournament", "match_number")

    def __str__(self):
        return f"{self.tournament.name}: {self.team1} vs {self.team2} (#{self.match_number})"


# -----------------------------
# Notifications
# -----------------------------
class Notification(models.Model):
    class Type(models.TextChoices):
        PROMOTION = "promotion", "Promotion"
        LINK = "link", "Coach/Player Link"
        TEAM_PROPOSAL = "team_proposal", "Team Proposal"
        TEAM_ASSIGNMENT = "team_assignment", "Team Assignment"
        TOURNAMENT = "tournament", "Tournament"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=20, choices=Type.choices)
    title = models.CharField(max_length=120)
    message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    read_at = models.DateTimeField(null=True, blank=True)
    # Optional: link to related object
    related_object_id = models.IntegerField(null=True, blank=True)
    related_object_type = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username}: {self.title}"