from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction

from .models import (
    PromotionRequest, Player, Sport, CoachingSession, CoachPlayerLinkRequest, Coach, Leaderboard, Notification,
    Team, Match, Attendance, PlayerSportProfile,
    Manager, ManagerSport, TeamProposal, TeamAssignmentRequest, Tournament, TournamentTeam, TournamentMatch,
    CricketMatchState, MatchPlayerStats, TournamentPoints
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


class SportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sport
        fields = ['id', 'name', 'sport_type', 'description']


class CoachingSessionCreateSerializer(serializers.ModelSerializer):
    sport = SportSerializer(read_only=True)
    team = serializers.SerializerMethodField()
    
    class Meta:
        model = CoachingSession
        fields = ["id", "team", "sport", "session_date", "title", "notes", "is_active"]
        read_only_fields = ["is_active"]
    
    def get_team(self, obj):
        if obj.team:
            return {"id": obj.team.id, "name": obj.team.name}
        return None

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
    sport_id = serializers.IntegerField(required=False, allow_null=True)
    coach_id = serializers.CharField(required=False, allow_null=True)
    
    class Meta:
        model = Team
        fields = ["id", "name", "logo", "sport_id", "coach_id"]
    
    def validate(self, attrs):
        request = self.context.get("request")
        if not request:
            return attrs
        
        user = request.user
        # Manager/admin can create teams
        if user.role in [User.Roles.MANAGER, User.Roles.ADMIN]:
            if user.role == User.Roles.MANAGER:
                attrs["manager"] = user
                sport_id = attrs.get("sport_id")
                if sport_id:
                    # Verify manager is assigned to this sport
                    if not ManagerSport.objects.filter(manager__user=user, sport_id=sport_id).exists():
                        raise serializers.ValidationError({"sport_id": "You are not assigned to this sport"})
        
        # Handle coach assignment
        coach_id = attrs.pop("coach_id", None)
        if coach_id:
            try:
                coach = Coach.objects.get(coach_id=coach_id)
                attrs["coach"] = coach
                # Ensure coach sport matches team sport
                if attrs.get("sport_id") and coach.primary_sport_id != attrs["sport_id"]:
                    raise serializers.ValidationError({"coach_id": "Coach primary sport must match team sport"})
            except Coach.DoesNotExist:
                raise serializers.ValidationError({"coach_id": "Coach not found"})
        
        # Handle sport assignment
        sport_id = attrs.pop("sport_id", None)
        if sport_id:
            try:
                sport = Sport.objects.get(id=sport_id)
                attrs["sport"] = sport
            except Sport.DoesNotExist:
                raise serializers.ValidationError({"sport_id": "Sport not found"})
        
        return attrs


class TeamSerializer(serializers.ModelSerializer):
    coach = serializers.SerializerMethodField()
    manager = UserPublicSerializer(read_only=True)
    sport = SportSerializer(read_only=True)
    
    class Meta:
        model = Team
        fields = "__all__"
    
    def get_coach(self, obj):
        if obj.coach:
            return UserPublicSerializer(obj.coach.user).data
        return None

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


class TeamProposalCreateSerializer(serializers.Serializer):
    manager_id = serializers.IntegerField(required=False, allow_null=True)
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
        
        # Auto-find manager if not provided
        manager_id = attrs.get("manager_id")
        if manager_id:
            try:
                manager = User.objects.get(id=manager_id, role=User.Roles.MANAGER)
            except User.DoesNotExist:
                raise serializers.ValidationError({"manager_id": "Manager not found"})
            # Check manager is assigned to this sport
            if not ManagerSport.objects.filter(manager__user=manager, sport=sport).exists():
                raise serializers.ValidationError({"manager_id": "Manager is not assigned to this sport"})
        else:
            # Find first manager assigned to this sport
            manager_sport = ManagerSport.objects.filter(sport=sport).first()
            if not manager_sport:
                raise serializers.ValidationError({"sport_id": "No manager assigned to this sport"})
            manager = manager_sport.manager.user
        
        attrs["manager"] = manager
        
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
    overs_per_match = serializers.IntegerField(default=20, help_text="Overs per match (5, 10, 20, 30, or 50)")

    class Meta:
        model = Tournament
        fields = ["name", "sport", "manager_id", "overs_per_match", "start_date", "end_date", "location", "description"]
    
    def validate_overs_per_match(self, value):
        valid_overs = [5, 10, 20, 30, 50]
        if value not in valid_overs:
            raise serializers.ValidationError(f"Overs per match must be one of: {valid_overs}")
        return value

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
    teams_count = serializers.SerializerMethodField()
    matches_count = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = [
            "id", "name", "sport", "manager", "created_by", "status",
            "overs_per_match", "start_date", "end_date", "location", "description", "created_at",
            "teams_count", "matches_count"
        ]
        read_only_fields = ["teams_count", "matches_count"]

    def get_teams_count(self, obj):
        return obj.teams.count()
    
    def get_matches_count(self, obj):
        return obj.matches.count()


class TournamentTeamSerializer(serializers.ModelSerializer):
    tournament = TournamentSerializer(read_only=True)
    team = TeamSerializer(read_only=True)

    class Meta:
        model = TournamentTeam
        fields = ["id", "tournament", "team", "registered_at"]


class TournamentMatchCreateSerializer(serializers.ModelSerializer):
    tournament_id = serializers.IntegerField()
    team1_id = serializers.IntegerField()
    team2_id = serializers.IntegerField()
    man_of_the_match_player_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    
    class Meta:
        model = TournamentMatch
        fields = [
            "tournament_id", "team1_id", "team2_id", "match_number", "date",
            "score_team1", "score_team2", "location", "is_completed",
            "man_of_the_match_player_id", "notes"
        ]
    
    def validate(self, attrs):
        try:
            tournament = Tournament.objects.get(id=attrs["tournament_id"])
        except Tournament.DoesNotExist:
            raise serializers.ValidationError({"tournament_id": "Tournament not found"})
        
        try:
            team1 = Team.objects.get(id=attrs["team1_id"])
            team2 = Team.objects.get(id=attrs["team2_id"])
        except Team.DoesNotExist:
            raise serializers.ValidationError({"team_id": "Team not found"})
        
        if team1.id == team2.id:
            raise serializers.ValidationError({"team2_id": "Teams must be different"})
        
        # Verify teams are in tournament
        if not TournamentTeam.objects.filter(tournament=tournament, team=team1).exists():
            raise serializers.ValidationError({"team1_id": "Team 1 not in tournament"})
        if not TournamentTeam.objects.filter(tournament=tournament, team=team2).exists():
            raise serializers.ValidationError({"team2_id": "Team 2 not in tournament"})
        
        # Verify teams sport matches tournament sport
        if team1.sport_id != tournament.sport_id or team2.sport_id != tournament.sport_id:
            raise serializers.ValidationError({"team_id": "Team sport must match tournament sport"})
        
        attrs["tournament"] = tournament
        attrs["team1"] = team1
        attrs["team2"] = team2
        
        # Handle man of the match by player_id (string like "P2500001")
        man_of_the_match_player_id = attrs.pop("man_of_the_match_player_id", None)
        if man_of_the_match_player_id:
            try:
                player = Player.objects.get(player_id=man_of_the_match_player_id)
                # Verify player is in one of the teams
                if not PlayerSportProfile.objects.filter(
                    player=player,
                    team__in=[team1, team2],
                    sport=tournament.sport,
                    is_active=True
                ).exists():
                    raise serializers.ValidationError({"man_of_the_match_player_id": "Player must be in one of the teams"})
                attrs["man_of_the_match"] = player
            except Player.DoesNotExist:
                raise serializers.ValidationError({"man_of_the_match_player_id": f"Player with ID {man_of_the_match_player_id} not found"})
        
        return attrs


class TournamentMatchSerializer(serializers.ModelSerializer):
    tournament = TournamentSerializer(read_only=True)
    team1 = TeamSerializer(read_only=True)
    team2 = TeamSerializer(read_only=True)
    man_of_the_match = PlayerSerializer(read_only=True)
    cricket_state = serializers.SerializerMethodField()

    class Meta:
        model = TournamentMatch
        fields = [
            "id", "tournament", "team1", "team2", "match_number", "date",
            "score_team1", "score_team2", "wickets_team1", "wickets_team2",
            "location", "status", "is_completed", "man_of_the_match", "notes",
            "created_at", "cricket_state"
        ]
        read_only_fields = ["cricket_state"]

    def get_cricket_state(self, obj):
        try:
            state = obj.cricket_state
            return CricketMatchStateSerializer(state).data
        except CricketMatchState.DoesNotExist:
            return None


class PlayerSportProfileSerializer(serializers.ModelSerializer):
    player = PlayerSerializer(read_only=True)
    sport = SportSerializer(read_only=True)
    team = TeamSerializer(read_only=True)
    coach = CoachSerializer(read_only=True)

    class Meta:
        model = PlayerSportProfile
        fields = ["id", "player", "sport", "team", "coach", "joined_date", "is_active", "career_score"]
        read_only_fields = ["player", "sport", "joined_date", "career_score"]


class PlayerSportProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating PlayerSportProfile (team assignment)"""
    class Meta:
        model = PlayerSportProfile
        fields = ["team", "coach", "is_active", "session_count"]
    
    def validate(self, attrs):
        """Prevent multiple team membership per sport."""
        instance = self.instance
        new_team = attrs.get("team")
        
        # If trying to assign to a team
        if new_team is not None:
            # Get current team (from instance or attrs)
            current_team = instance.team if hasattr(instance, 'team') else None
            
            # If already in a different team, prevent change (must remove first)
            if current_team and current_team.id != new_team.id:
                raise serializers.ValidationError({
                    "team": f"Player {instance.player.player_id} is already in team '{current_team.name}' for {instance.sport.name}. Set team to null first to remove from current team."
                })
            
            # Verify team sport matches profile sport
            if new_team.sport_id != instance.sport_id:
                raise serializers.ValidationError({
                    "team": f"Team sport '{new_team.sport.name}' does not match profile sport '{instance.sport.name}'"
                })
            
            # Double-check: ensure no other active profile for this player-sport has a team
            # (This is a safety check, though there should only be one profile per player-sport)
            other_profiles = PlayerSportProfile.objects.filter(
                player=instance.player,
                sport=instance.sport,
                team__isnull=False,
                is_active=True
            ).exclude(id=instance.id)
            
            if other_profiles.exists():
                other_team = other_profiles.first().team
                if other_team.id != new_team.id:
                    raise serializers.ValidationError({
                        "team": f"Player {instance.player.player_id} is already in team '{other_team.name}' for {instance.sport.name}."
                    })
        
        return attrs


# -----------------------------
# Cricket Match Serializers
# -----------------------------
class CricketMatchStateSerializer(serializers.ModelSerializer):
    toss_won_by = TeamSerializer(read_only=True)
    batting_first = TeamSerializer(read_only=True)
    current_batting_team = TeamSerializer(read_only=True)
    current_bowling_team = TeamSerializer(read_only=True)
    batsman1 = serializers.SerializerMethodField()
    batsman2 = serializers.SerializerMethodField()
    current_striker = serializers.SerializerMethodField()
    current_bowler = serializers.SerializerMethodField()

    class Meta:
        model = CricketMatchState
        fields = [
            "id", "toss_won_by", "batting_first", "current_batting_team", "current_bowling_team",
            "batsman1", "batsman2", "current_striker", "current_bowler",
            "current_over", "current_ball", "total_balls_bowled",
            "team1_runs", "team1_wickets", "team2_runs", "team2_wickets", "updated_at"
        ]

    def get_batsman1(self, obj):
        if obj.batsman1:
            return {"id": obj.batsman1.id, "player_id": obj.batsman1.player_id, "username": obj.batsman1.user.username}
        return None
    
    def get_batsman2(self, obj):
        if obj.batsman2:
            return {"id": obj.batsman2.id, "player_id": obj.batsman2.player_id, "username": obj.batsman2.user.username}
        return None
    
    def get_current_striker(self, obj):
        if obj.current_striker:
            return {"id": obj.current_striker.id, "player_id": obj.current_striker.player_id, "username": obj.current_striker.user.username}
        return None
    
    def get_current_bowler(self, obj):
        if obj.current_bowler:
            return {"id": obj.current_bowler.id, "player_id": obj.current_bowler.player_id, "username": obj.current_bowler.user.username}
        return None


class MatchPlayerStatsSerializer(serializers.ModelSerializer):
    player = PlayerSerializer(read_only=True)
    team = TeamSerializer(read_only=True)
    match = TournamentMatchSerializer(read_only=True)

    class Meta:
        model = MatchPlayerStats
        fields = [
            "id", "match", "player", "team",
            "runs_scored", "balls_faced", "fours", "sixes", "is_out", "dismissal_type",
            "overs_bowled", "runs_conceded", "wickets_taken", "maidens", "wides", "no_balls",
            "catches", "stumpings", "run_outs",
            "created_at", "updated_at"
        ]


class TournamentPointsSerializer(serializers.ModelSerializer):
    tournament = TournamentSerializer(read_only=True)
    team = TeamSerializer(read_only=True)

    class Meta:
        model = TournamentPoints
        fields = [
            "id", "tournament", "team",
            "matches_played", "matches_won", "matches_lost", "matches_tied", "matches_no_result",
            "points", "net_run_rate", "updated_at"
        ]
