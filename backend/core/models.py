from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import AbstractUser

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
    bio = models.TextField(blank=True, null=True)
    team = models.ForeignKey('Team', on_delete=models.SET_NULL, null=True, blank=True)
    joined_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return getattr(self.user, "username", str(self.user))

# -----------------------------
# Coach Model
# -----------------------------
class Coach(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="coach")
    experience = models.PositiveIntegerField(default=0)
    specialization = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return getattr(self.user, "username", str(self.user))

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
