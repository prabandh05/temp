from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Team, Player, Match, Attendance, Leaderboard, Coach, Sport, PlayerSportProfile
import datetime

User = get_user_model()

class UserPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email'] 
        
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role']

class UserRegistrationSerializer(serializers.ModelSerializer):
    sport_name = serializers.CharField(write_only=True, required=False, allow_blank=True, help_text="Required if role is 'player'")
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'role', 'sport_name')

    def validate(self, attrs):
        if attrs.get('role') == 'player' and not attrs.get('sport_name'):
            raise serializers.ValidationError({"sport_name": "This field is required for players."})
        return attrs

    def create(self, validated_data):
        sport_name = validated_data.pop('sport_name', None)
        role = validated_data.pop('role', 'player')

        with transaction.atomic():
            # Create user first, then set custom fields
            user = User.objects.create_user(
                username=validated_data['username'],
                email=validated_data['email'],
                password=validated_data['password']
            )
            user.role = role
            user.save()  # This triggers the signal that creates Player/Coach

            # After save, the signal has created the Player (if role is player)
            if user.role == 'player' and sport_name:
                # Get the player that was created by the signal
                player = user.player

                try:
                    # Use filter with iexact for case-insensitive lookup
                    sport = Sport.objects.get(name__iexact=sport_name)
                    PlayerSportProfile.objects.create(player=player, sport=sport)
                except Sport.DoesNotExist:
                    raise serializers.ValidationError({
                        "sport_name": f"Sport '{sport_name}' not found. Available sports: Cricket, Football, Basketball, Running"
                    })

        return user

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
        fields = ["id", "player", "match", "attended", "notes"]

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
