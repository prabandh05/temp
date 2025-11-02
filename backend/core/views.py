from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import (
    IsAuthenticatedOrReadOnly,
    IsAuthenticated,
    AllowAny
)
from rest_framework.decorators import action, api_view, permission_classes
from django.db.models import F
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token


from rest_framework.permissions import IsAuthenticated
from functools import wraps
from django.contrib.auth.models import User






from .models import Team, Player, Match, Attendance, Leaderboard
from .serializers import (
    TeamCreateSerializer, TeamSerializer,
    MatchCreateSerializer, MatchSerializer,
    AttendanceCreateSerializer, AttendanceSerializer,
    LeaderboardSerializer, UserPublicSerializer,
    PlayerSerializer
)
from rest_framework.views import APIView
from .serializers import UserProfileSerializer, PlayerSerializer, CoachSerializer
from .models import  Coach


from .services.model_service import predict_player_start_from_features
from ai_an.services.gemini_client import gemini_summarize_player


#------------------Authentication View------------------
class CustomObtainAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        token = Token.objects.get(key=response.data['token'])
        user = token.user
        return Response({
            'token': token.key,
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,   # from our new column
        })
        
#-------------------Role Based Access Control Decorator------------------
class RoleAwareProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        user_data = UserProfileSerializer(user).data
        profile_data = {}

        # Player
        if user.role == user.Roles.PLAYER:
            try:
                player = user.player  # related_name "player" on OneToOneField
                profile_data = PlayerSerializer(player).data
            except Player.DoesNotExist:
                profile_data = {}

        # Coach
        elif user.role == user.Roles.COACH:
            try:
                coach = user.coach
                profile_data = CoachSerializer(coach).data
            except Coach.DoesNotExist:
                profile_data = {}

        # Manager (if you create a Manager model later, plug it here)
        elif user.role == user.Roles.MANAGER:
            # for now, return a minimal manager placeholder
            profile_data = {'message': 'Manager profile — implement fields as required.'}

        # Admin: let frontend use Django admin; but you can still return a minimal admin payload
        elif user.role == user.Roles.ADMIN:
            profile_data = {'message': 'Admin user — use admin panel or build custom UI.'}

        return Response({
            'user': user_data,
            'profile': profile_data
        })

#------------------- USER Role ------------------
def role_required(allowed_roles):
    if isinstance(allowed_roles, str):
        allowed = [allowed_roles]
    else:
        allowed = list(allowed_roles)

    def decorator(view_func):
        @wraps(view_func)
        def _wrapped(request, *args, **kwargs):
            user = request.user
            # If anonymous or no role -> forbidden
            if not user or not getattr(user, "role", None):
                return Response({'detail': 'Authentication credentials were not provided or role missing.'},
                                status=status.HTTP_403_FORBIDDEN)
            if user.role not in allowed:
                return Response({'detail': 'You do not have permission to access this resource.'},
                                status=status.HTTP_403_FORBIDDEN)
            return view_func(request, *args, **kwargs)
        return _wrapped
    return decorator



# ------------------ TEAM ------------------
class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return TeamCreateSerializer
        return TeamSerializer

# ------------------ PLAYER ------------------
class PlayerViewSet(viewsets.ModelViewSet):
    """
    Manage players — CRUD endpoints for player data.
    """
    queryset = Player.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_class = PlayerSerializer


# ------------------ MATCH ------------------
class MatchViewSet(viewsets.ModelViewSet):
    queryset = Match.objects.all().order_by("-date")
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return MatchCreateSerializer
        return MatchSerializer

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def finalize(self, request, pk=None):
        """
        Finalize match (set is_completed=True and update scores).
        Also updates the leaderboard.
        """
        match = self.get_object()
        score1 = request.data.get("score_team1")
        score2 = request.data.get("score_team2")

        if score1 is None or score2 is None:
            return Response({"error": "Both scores are required."},
                            status=status.HTTP_400_BAD_REQUEST)

        match.score_team1 = int(score1)
        match.score_team2 = int(score2)
        match.is_completed = True
        match.save()

        # Update leaderboard
        from .utils import recalc_leaderboard
        recalc_leaderboard()

        return Response(MatchSerializer(match).data)


# ------------------ ATTENDANCE ------------------
class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return AttendanceCreateSerializer
        return AttendanceSerializer


# ------------------ LEADERBOARD ------------------
class LeaderboardViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Leaderboard.objects.all().order_by("-score")
    serializer_class = LeaderboardSerializer
    permission_classes = [AllowAny]


# ------------------ AI ENDPOINTS ------------------
@api_view(["POST"])
@permission_classes([IsAuthenticatedOrReadOnly])
def predict_player_start(request):
    """
    Predict whether a player will start the next match
    using ML model from model_service.py.
    """
    try:
        proba = predict_player_start_from_features(request.data)
        return Response({"probability_of_start": proba})
    except FileNotFoundError:
        return Response({"error": "Model not trained"},
                        status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)},
                        status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAuthenticatedOrReadOnly])
def player_insight(request):
    """
    Generate AI-based player performance insights using Gemini API.
    """
    player_id = request.data.get("player_id")
    context = request.data.get("context", "")

    if not player_id:
        return Response({"error": "player_id required"},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        player = Player.objects.get(pk=player_id)
    except Player.DoesNotExist:
        return Response({"error": "Player not found"},
                        status=status.HTTP_404_NOT_FOUND)

    matches = player.match_set.order_by("-date")[:10] if hasattr(player, "match_set") else []
    total_goals = sum(getattr(m, "goals", 0) for m in matches)
    total_assists = sum(getattr(m, "assists", 0) for m in matches)
    minutes = sum(getattr(m, "minutes_played", 0) for m in matches)

    prompt = f"""
    Provide a concise AI-generated insight for player {player} (id {player.id}).
    Goals (last up to 10 matches): {total_goals}
    Assists: {total_assists}
    Minutes: {minutes}
    Player rating: {getattr(player, 'rating', 'N/A')}
    Team: {getattr(player.team, 'name', 'N/A')}
    Additional Context: {context}
    """

    answer = gemini_summarize_player(prompt)
    return Response({"insight": answer})


# ------------------ USER MANAGEMENT ------------------
User = get_user_model()

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Provides a read-only view for users.
    Example endpoints:
      - GET /api/users/  -> list all users
      - GET /api/users/<id>/ -> get user details
    """
    queryset = User.objects.all()
    serializer_class = UserPublicSerializer
    permission_classes = [IsAuthenticated]

@api_view(["POST"])
@permission_classes([AllowAny])
def register_user(request):
    """
    Register a new user (player, coach, or admin).
    Example JSON:
    {
        "username": "john_doe",
        "email": "john@example.com",
        "password": "secret123",
        "is_player": true,
        "is_coach": false
    }
    """
    data = request.data
    try:
        if User.objects.filter(username=data.get("username")).exists():
            return Response({"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create(
            username=data.get("username"),
            email=data.get("email"),
            password=make_password(data.get("password")),
            role=data.get("role", "player")
        )

        return Response(
            {"message": "User registered successfully", "user_id": user.id},
            status=status.HTTP_201_CREATED
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ------------------ PROFILE VIEWS ------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def player_profile(request):
    """
    Get player profile for the authenticated player user.
    """
    user = request.user
    if user.role != user.Roles.PLAYER:
        return Response({"error": "This endpoint is for players only"}, 
                        status=status.HTTP_403_FORBIDDEN)
    
    try:
        player = user.player
        return Response(PlayerSerializer(player).data)
    except Player.DoesNotExist:
        return Response({"error": "Player profile not found"}, 
                        status=status.HTTP_404_NOT_FOUND)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def coach_profile(request):
    """
    Get coach profile for the authenticated coach user.
    """
    user = request.user
    if user.role != user.Roles.COACH:
        return Response({"error": "This endpoint is for coaches only"}, 
                        status=status.HTTP_403_FORBIDDEN)
    
    try:
        coach = user.coach
        return Response(CoachSerializer(coach).data)
    except Coach.DoesNotExist:
        return Response({"error": "Coach profile not found"}, 
                        status=status.HTTP_404_NOT_FOUND)