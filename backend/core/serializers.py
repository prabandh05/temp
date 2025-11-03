from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction

from .models import (
    PromotionRequest, Player, Sport, CoachingSession, CoachPlayerLinkRequest, Coach, Leaderboard, Notification,
    Team, Match, Attendance, PlayerSportProfile,
    Manager, ManagerSport, TeamProposal, TeamAssignmentRequest, Tournament, TournamentTeam, TournamentMatch
)
import datetime

User = get_user_model()


class PromotionRequestCreateSerializer(serializers.Serializer):
    sport_id = serializers.IntegerField()
    player_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    remarks = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        user = self.context["request"].user
        if hasattr(user, "coach"):
            raise serializers.ValidationError("User is already a coach")
        # ensure sport exists
        try:
            sport = Sport.objects.get(id=attrs["sport_id"]) 
        except Sport.DoesNotExist:
            raise serializers.ValidationError({"sport_id": "Invalid sport"})

        player_obj = None
        player_id = attrs.get("player_id")
        if player_id:
            try:
                player_obj = Player.objects.get(player_id=player_id)
            except Player.DoesNotExist:
                raise serializers.ValidationError({"player_id": "Player not found"})
            if player_obj.user != user:
                # Player can request only for themselves; managers will use approval endpoint
                raise serializers.ValidationError({"player_id": "You can only request your own promotion"})

        attrs["sport"] = sport
        attrs["player_obj"] = player_obj
        return attrs


class PromotionRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromotionRequest
        fields = [
            "id",
            "user",
            "player",
            "sport",
            "status",
            "requested_at",
            "decided_at",
            "decided_by",
            "remarks",
        ]
        read_only_fields = ["status", "requested_at", "decided_at", "decided_by"]


class CoachingSessionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoachingSession
        fields = ["id", "team", "sport", "session_date", "title", "notes"]

    def validate(self, attrs):
        request = self.context["request"]
        coach = getattr(request.user, "coach", None)
        if coach is None:
            raise serializers.ValidationError("Only coaches can create sessions")
        sport = attrs.get("sport")
        if sport is None:
            raise serializers.ValidationError({"sport": "Required"})
        if coach.primary_sport_id != sport.id:
            raise serializers.ValidationError({"sport": "Must match coach primary sport"})
        team = attrs.get("team")
        if team and team.sport_id and team.sport_id != sport.id:
            raise serializers.ValidationError({"team": "Team sport must match session sport"})
        return attrs


class CoachInviteSerializer(serializers.Serializer):
    player_id = serializers.CharField()
    sport_id = serializers.IntegerField()

    def validate(self, attrs):
        request = self.context["request"]
        coach: Coach = getattr(request.user, "coach", None)
        if coach is None:
            raise serializers.ValidationError("Only coaches can invite players")
        try:
            sport = Sport.objects.get(id=attrs["sport_id"]) 
        except Sport.DoesNotExist:
            raise serializers.ValidationError({"sport_id": "Invalid sport"})
        if coach.primary_sport_id != sport.id:
            raise serializers.ValidationError({"sport_id": "Must match coach primary sport"})
        try:
            player = Player.objects.get(player_id=attrs["player_id"])
        except Player.DoesNotExist:
            raise serializers.ValidationError({"player_id": "Player not found"})
        attrs["coach"] = coach
        attrs["player"] = player
        attrs["sport"] = sport
        return attrs


class PlayerRequestCoachSerializer(serializers.Serializer):
    coach_id = serializers.CharField()
    sport_id = serializers.IntegerField()

    def validate(self, attrs):
        request = self.context["request"]
        player = getattr(request.user, "player", None)
        if player is None:
            raise serializers.ValidationError("Only players can request a coach")
        try:
            sport = Sport.objects.get(id=attrs["sport_id"]) 
        except Sport.DoesNotExist:
            raise serializers.ValidationError({"sport_id": "Invalid sport"})
        try:
            coach = Coach.objects.get(coach_id=attrs["coach_id"])
        except Coach.DoesNotExist:
            raise serializers.ValidationError({"coach_id": "Coach not found"})
        if coach.primary_sport_id != sport.id:
            raise serializers.ValidationError({"sport_id": "Must match coach primary sport"})
        attrs["player"] = player
        attrs["coach"] = coach
        attrs["sport"] = sport
        return attrs


class CoachPlayerLinkRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoachPlayerLinkRequest
        fields = ["id", "coach", "player", "sport", "direction", "status", "created_at", "decided_at"]


class LeaderboardSerializer(serializers.ModelSerializer):
    player_id = serializers.CharField(source="player.player_id", read_only=True)
    username = serializers.CharField(source="player.user.username", read_only=True)

    class Meta:
        model = Leaderboard
        fields = ["player_id", "username", "score"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "type", "title", "message", "created_at", "read_at"]


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


# -----------------------------
# New Serializers for Manager, TeamProposal, Tournament, etc.
# -----------------------------
class ManagerSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    manager_id = serializers.CharField(read_only=True)

    class Meta:
        model = Manager
        fields = ['id', 'user', 'manager_id', 'created_at']


class ManagerSportSerializer(serializers.ModelSerializer):
    manager = ManagerSerializer(read_only=True)
    sport = serializers.StringRelatedField()

    class Meta:
        model = ManagerSport
        fields = ['id', 'manager', 'sport', 'assigned_by', 'assigned_at']


class SportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sport
        fields = ['id', 'name', 'sport_type', 'description']


class TeamProposalCreateSerializer(serializers.Serializer):
    manager_id = serializers.IntegerField()
    sport_id = serializers.IntegerField()
    team_name = serializers.CharField(max_length=100)
    player_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1)

    def validate(self, attrs):
        request = self.context["request"]
        coach = getattr(request.user, "coach", None)
        if coach is None:
            raise serializers.ValidationError("Only coaches can create team proposals")
        
        try:
            sport = Sport.objects.get(id=attrs["sport_id"])
        except Sport.DoesNotExist:
            raise serializers.ValidationError({"sport_id": "Invalid sport"})
        
        if coach.primary_sport_id != sport.id:
            raise serializers.ValidationError({"sport_id": "Must match coach primary sport"})
        
        try:
            manager = User.objects.get(id=attrs["manager_id"], role=User.Roles.MANAGER)
        except User.DoesNotExist:
            raise serializers.ValidationError({"manager_id": "Manager not found"})
        
        # Check manager is assigned to this sport
        if not ManagerSport.objects.filter(manager__user=manager, sport=sport).exists():
            raise serializers.ValidationError({"manager_id": "Manager is not assigned to this sport"})
        
        # Validate players are coach's students and not in any team for this sport
        players = Player.objects.filter(id__in=attrs["player_ids"])
        if players.count() != len(attrs["player_ids"]):
            raise serializers.ValidationError({"player_ids": "Some players not found"})
        
        for player in players:
            profile = PlayerSportProfile.objects.filter(player=player, sport=sport, coach=coach, is_active=True).first()
            if not profile:
                raise serializers.ValidationError({"player_ids": f"Player {player.player_id} is not your student for {sport.name}"})
            # Check if player is already in a team for this sport
            if profile.team_id is not None:
                raise serializers.ValidationError({"player_ids": f"Player {player.player_id} is already in a team for {sport.name}"})
        
        attrs["coach"] = coach
        attrs["manager"] = manager
        attrs["sport"] = sport
        attrs["players"] = list(players)
        return attrs


class TeamProposalSerializer(serializers.ModelSerializer):
    coach = CoachSerializer(read_only=True)
    manager = UserPublicSerializer(read_only=True)
    sport = SportSerializer(read_only=True)
    proposed_players = PlayerSerializer(many=True, read_only=True)

    class Meta:
        model = TeamProposal
        fields = [
            "id", "coach", "manager", "sport", "team_name", "proposed_players",
            "status", "created_at", "decided_at", "remarks", "created_team"
        ]
        read_only_fields = ["status", "created_at", "decided_at", "created_team"]


class TeamAssignmentRequestCreateSerializer(serializers.Serializer):
    coach_id = serializers.CharField()
    team_id = serializers.IntegerField()

    def validate(self, attrs):
        request = self.context["request"]
        if not (request.user.role == User.Roles.MANAGER or request.user.role == User.Roles.ADMIN):
            raise serializers.ValidationError("Only managers/admins can create team assignments")
        
        try:
            coach = Coach.objects.get(coach_id=attrs["coach_id"])
        except Coach.DoesNotExist:
            raise serializers.ValidationError({"coach_id": "Coach not found"})
        
        try:
            team = Team.objects.get(id=attrs["team_id"])
        except Team.DoesNotExist:
            raise serializers.ValidationError({"team_id": "Team not found"})
        
        # Verify manager owns this team
        if request.user.role == User.Roles.MANAGER and team.manager_id != request.user.id:
            raise serializers.ValidationError({"team_id": "You don't own this team"})
        
        # Verify coach primary sport matches team sport
        if team.sport and coach.primary_sport_id != team.sport_id:
            raise serializers.ValidationError({"coach_id": "Coach primary sport must match team sport"})
        
        attrs["manager"] = request.user
        attrs["coach"] = coach
        attrs["team"] = team
        return attrs


class TeamAssignmentRequestSerializer(serializers.ModelSerializer):
    manager = UserPublicSerializer(read_only=True)
    coach = CoachSerializer(read_only=True)
    team = TeamSerializer(read_only=True)

    class Meta:
        model = TeamAssignmentRequest
        fields = ["id", "manager", "coach", "team", "status", "created_at", "decided_at", "remarks"]
        read_only_fields = ["status", "created_at", "decided_at"]


class TournamentCreateSerializer(serializers.ModelSerializer):
    manager_id = serializers.IntegerField(required=False, help_text="Required if created by admin")

    class Meta:
        model = Tournament
        fields = ["name", "sport", "manager_id", "start_date", "end_date", "location", "description"]

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        
        if user.role == User.Roles.ADMIN:
            manager_id = attrs.get("manager_id")
            if not manager_id:
                raise serializers.ValidationError({"manager_id": "Required when created by admin"})
            try:
                manager = User.objects.get(id=manager_id, role=User.Roles.MANAGER)
            except User.DoesNotExist:
                raise serializers.ValidationError({"manager_id": "Manager not found"})
            sport = attrs["sport"]
            if not ManagerSport.objects.filter(manager__user=manager, sport=sport).exists():
                raise serializers.ValidationError({"manager_id": "Manager is not assigned to this sport"})
            attrs["manager"] = manager
        elif user.role == User.Roles.MANAGER:
            if not hasattr(user, "manager"):
                raise serializers.ValidationError("Manager profile not found")
            sport = attrs["sport"]
            if not ManagerSport.objects.filter(manager__user=user, sport=sport).exists():
                raise serializers.ValidationError({"sport": "You are not assigned to this sport"})
            attrs["manager"] = user
        else:
            raise serializers.ValidationError("Only managers/admins can create tournaments")
        
        attrs["created_by"] = user
        return attrs


class TournamentSerializer(serializers.ModelSerializer):
    sport = SportSerializer(read_only=True)
    manager = UserPublicSerializer(read_only=True)
    created_by = UserPublicSerializer(read_only=True)

    class Meta:
        model = Tournament
        fields = [
            "id", "name", "sport", "manager", "created_by", "status",
            "start_date", "end_date", "location", "description", "created_at"
        ]


class TournamentTeamSerializer(serializers.ModelSerializer):
    tournament = TournamentSerializer(read_only=True)
    team = TeamSerializer(read_only=True)

    class Meta:
        model = TournamentTeam
        fields = ["id", "tournament", "team", "registered_at"]


class TournamentMatchSerializer(serializers.ModelSerializer):
    tournament = TournamentSerializer(read_only=True)
    team1 = TeamSerializer(read_only=True)
    team2 = TeamSerializer(read_only=True)
    man_of_the_match = PlayerSerializer(read_only=True)

    class Meta:
        model = TournamentMatch
        fields = [
            "id", "tournament", "team1", "team2", "match_number", "date",
            "score_team1", "score_team2", "location", "is_completed",
            "man_of_the_match", "notes"
        ]
