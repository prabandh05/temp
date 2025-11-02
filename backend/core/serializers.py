from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Team, Player, Match, Attendance, Leaderboard,Coach

User = get_user_model()

class UserPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email'] 
        
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role']

class TeamCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "logo", "coach"]

class TeamSerializer(serializers.ModelSerializer):
    coach = UserPublicSerializer(read_only=True)
    class Meta:
        model = Team
        fields = "__all__"

class PlayerSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    team = TeamSerializer(read_only=True)

    class Meta:
        model = Player
        fields = ['id', 'user', 'bio', 'team', 'joined_at']

class MatchCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Match
        fields = ["id", "team1", "team2", "date", "location", "score_team1", "score_team2", "is_completed"]

class MatchSerializer(serializers.ModelSerializer):
    team1 = TeamSerializer(read_only=True)
    team2 = TeamSerializer(read_only=True)
    class Meta:
        model = Match
        fields = "__all__"

class AttendanceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ["id", "player", "match", "attended", "goals", "assists", "minutes_played"]

class AttendanceSerializer(serializers.ModelSerializer):
    player = serializers.StringRelatedField()
    match = serializers.StringRelatedField()
    class Meta:
        model = Attendance
        fields = "__all__"

class LeaderboardSerializer(serializers.ModelSerializer):
    player = serializers.StringRelatedField()
    class Meta:
        model = Leaderboard
        fields = "__all__"
        
class CoachSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)

    class Meta:
        model = Coach
        fields = ['id', 'user', 'experience', 'specialization']