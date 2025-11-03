from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import AbstractUser
import datetime
# -----------------------------

# Generate player id
def generate_player_id():
    """Generate unique player ID like P25xxxxx"""
    current_year = str(datetime.date.today().year)[-2:]  # e.g. '25'
    count = Player.objects.count() + 1
    return f"P{current_year}{count:05d}"  # -> P2500001


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

    def __str__(self):
        return f"{self.player_id} - {self.user.username}"

#Sport Model
class PlayerSport(models.Model):
    SPORT_CHOICES = [
        ("cricket", "Cricket"),
        ("football", "Football"),
        ("basketball", "Basketball"),
    ]
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="sports")
    sport = models.CharField(max_length=50, choices=SPORT_CHOICES)
    role_in_sport = models.CharField(max_length=50, blank=True, null=True)  # batsman, bowler, etc.
    started_on = models.DateField(default=timezone.now)

    class Meta:
        unique_together = ('player', 'sport')

    def __str__(self):
        return f"{self.player.player_id} - {self.sport}"


#_____________Cricket Specific Stats Model_____________
class CricketStats(models.Model):
    player_sport = models.OneToOneField(PlayerSport, on_delete=models.CASCADE, related_name='cricket_stats')
    matches = models.PositiveIntegerField(default=0)
    runs = models.PositiveIntegerField(default=0)
    balls_faced = models.PositiveIntegerField(default=0)
    wickets = models.PositiveIntegerField(default=0)
    overs_bowled = models.FloatField(default=0)
    highest_score = models.PositiveIntegerField(default=0)
    average = models.FloatField(default=0)
    strike_rate = models.FloatField(default=0)
    catches = models.PositiveIntegerField(default=0)
    stumpings = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.player_sport.player.user.username} ({self.player_sport.sport})"

#_____________________Football Specific Stats Model_____________

#later add more sports similarly




#achievements model
class Achievement(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="achievements")
    match = models.ForeignKey('Match', on_delete=models.SET_NULL, null=True, blank=True)
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
    experience = models.PositiveIntegerField(default=0)
    specialization = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return getattr(self.user, "username", str(self.user))
    
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
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name

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
