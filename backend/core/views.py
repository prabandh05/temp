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






from .models import (
    Team, Player, Match, Attendance, Leaderboard, Sport, 
    PlayerSportProfile, PerformanceScore, CoachingSession, SessionAttendance
)
from .serializers import (
    TeamCreateSerializer, TeamSerializer,
    MatchCreateSerializer, MatchSerializer,
    AttendanceCreateSerializer, AttendanceSerializer,
    LeaderboardSerializer, UserPublicSerializer,
    PlayerSerializer, UserRegistrationSerializer
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
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
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
    # Enable filtering and ordering
    filterset_fields = ["team__id", "coach__id"]
    ordering_fields = ["joined_at"]


# ------------------ MATCH ------------------
class MatchViewSet(viewsets.ModelViewSet):
    queryset = Match.objects.all().order_by("-date")
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return MatchCreateSerializer
        return MatchSerializer

    # Enable filtering and ordering
    filterset_fields = ["team1__id", "team2__id", "is_completed", "date"]
    ordering_fields = ["date"]

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
    Handles user registration using the UserRegistrationSerializer.
    """
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid(raise_exception=True):
        user = serializer.save()
        return Response({
            "message": "User registered successfully",
            "user_id": user.id,
            "username": user.username,
            "role": user.role
        }, status=status.HTTP_201_CREATED)


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


# ------------------ DASHBOARDS ------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def player_dashboard(request):
    user = request.user
    if user.role != user.Roles.PLAYER:
        return Response({"detail": "Players only"}, status=status.HTTP_403_FORBIDDEN)

    try:
        player = user.player
    except Player.DoesNotExist:
        return Response({"detail": "Player profile not found"}, status=status.HTTP_404_NOT_FOUND)

    profiles = PlayerSportProfile.objects.filter(player=player).select_related("sport", "team", "coach")

    from .models import Achievement  # local import to avoid circulars
    achievements = Achievement.objects.filter(player=player).order_by("-date_awarded")[:10]

    # Build per-sport stats and ranks
    def get_stats_and_rank(profile):
        sport_name = (profile.sport.name if profile.sport else "").lower()
        payload = {
            "sport": profile.sport.name if profile.sport else None,
            "sport_type": getattr(profile.sport, "sport_type", None) if profile.sport else None,
            "team": profile.team.name if profile.team else None,
            "coach": getattr(profile.coach.user, "username", None) if profile.coach else None,
            "career_score": profile.career_score,
            "joined_date": profile.joined_date,
            "is_active": profile.is_active,
            "stats": {},
            "ranks": {},
            "achievements": [],
            "performance": {"series": []},
            "attendance": {"total_sessions": 0, "attended": 0},
        }
        # Collect stats and compute ranks
        if sport_name == "cricket":
            st = getattr(profile, "cricket_stats", None)
            st = st.first() if hasattr(st, "first") else None
            if st:
                payload["stats"] = {
                    "runs": st.runs,
                    "wickets": st.wickets,
                    "average": st.average,
                    "strike_rate": st.strike_rate,
                    "matches_played": st.matches_played,
                }
                # Ranks (higher better)
                all_stats = []
                for p in PlayerSportProfile.objects.filter(sport__name__iexact="Cricket"):
                    s = getattr(p, "cricket_stats", None)
                    s = s.first() if hasattr(s, "first") else None
                    if s:
                        all_stats.append({"profile_id": p.id, "runs": s.runs, "wickets": s.wickets, "average": s.average, "strike_rate": s.strike_rate})
                def rank(metric, reverse=True):
                    arr = sorted(all_stats, key=lambda x: x.get(metric) or 0, reverse=reverse)
                    positions = {x["profile_id"]: i+1 for i, x in enumerate(arr)}
                    return positions.get(profile.id)
                payload["ranks"] = {
                    "runs": rank("runs", True),
                    "wickets": rank("wickets", True),
                    "average": rank("average", True),
                    "strike_rate": rank("strike_rate", True),
                    "total_players": len(all_stats),
                }
        elif sport_name == "football":
            st = getattr(profile, "football_stats", None)
            st = st.first() if hasattr(st, "first") else None
            if st:
                payload["stats"] = {
                    "goals": st.goals,
                    "assists": st.assists,
                    "tackles": st.tackles,
                    "matches_played": st.matches_played,
                }
                all_stats = []
                for p in PlayerSportProfile.objects.filter(sport__name__iexact="Football"):
                    s = getattr(p, "football_stats", None)
                    s = s.first() if hasattr(s, "first") else None
                    if s:
                        all_stats.append({"profile_id": p.id, "goals": s.goals, "assists": s.assists, "tackles": s.tackles})
                def rank(metric, reverse=True):
                    arr = sorted(all_stats, key=lambda x: x.get(metric) or 0, reverse=reverse)
                    positions = {x["profile_id"]: i+1 for i, x in enumerate(arr)}
                    return positions.get(profile.id)
                payload["ranks"] = {
                    "goals": rank("goals", True),
                    "assists": rank("assists", True),
                    "tackles": rank("tackles", True),
                    "total_players": len(all_stats),
                }
        elif sport_name == "basketball":
            st = getattr(profile, "basketball_stats", None)
            st = st.first() if hasattr(st, "first") else None
            if st:
                payload["stats"] = {
                    "points": st.points,
                    "rebounds": st.rebounds,
                    "assists": st.assists,
                    "matches_played": st.matches_played,
                }
                all_stats = []
                for p in PlayerSportProfile.objects.filter(sport__name__iexact="Basketball"):
                    s = getattr(p, "basketball_stats", None)
                    s = s.first() if hasattr(s, "first") else None
                    if s:
                        all_stats.append({"profile_id": p.id, "points": s.points, "rebounds": s.rebounds, "assists": s.assists})
                def rank(metric, reverse=True):
                    arr = sorted(all_stats, key=lambda x: x.get(metric) or 0, reverse=reverse)
                    positions = {x["profile_id"]: i+1 for i, x in enumerate(arr)}
                    return positions.get(profile.id)
                payload["ranks"] = {
                    "points": rank("points", True),
                    "rebounds": rank("rebounds", True),
                    "assists": rank("assists", True),
                    "total_players": len(all_stats),
                }
        elif sport_name == "running":
            st = getattr(profile, "running_stats", None)
            st = st.first() if hasattr(st, "first") else None
            if st:
                payload["stats"] = {
                    "total_distance_km": st.total_distance_km,
                    "best_time_seconds": st.best_time_seconds,
                    "events_participated": st.events_participated,
                    "matches_played": st.matches_played,
                }
                all_stats = []
                for p in PlayerSportProfile.objects.filter(sport__name__iexact="Running"):
                    s = getattr(p, "running_stats", None)
                    s = s.first() if hasattr(s, "first") else None
                    if s:
                        all_stats.append({"profile_id": p.id, "total_distance_km": s.total_distance_km, "best_time_seconds": s.best_time_seconds})
                def rank(metric, reverse=True):
                    arr = sorted(all_stats, key=lambda x: x.get(metric) or 0, reverse=reverse)
                    positions = {x["profile_id"]: i+1 for i, x in enumerate(arr)}
                    return positions.get(profile.id)
                payload["ranks"] = {
                    "total_distance_km": rank("total_distance_km", True),
                    "best_time_seconds": rank("best_time_seconds", False),
                    "total_players": len(all_stats),
                }
        # Achievements filtered by sport
        from .models import Achievement as Ach
        sport_obj = profile.sport
        ach_qs = Ach.objects.filter(player=player)
        if sport_obj:
            ach_qs = ach_qs.filter(sport=sport_obj)
        payload["achievements"] = [
            {"title": a.title, "tournament": a.tournament_name, "date": a.date_awarded}
            for a in ach_qs.order_by("-date_awarded")[:10]
        ]

        # Performance series from session ratings for this sport
        ratings_qs = SessionAttendance.objects.filter(player=player)
        if sport_obj:
            ratings_qs = ratings_qs.filter(session__sport=sport_obj)
        ratings_qs = ratings_qs.select_related("session").order_by("session__session_date", "id")
        total_r = 0.0
        count_r = 0
        series = []
        for sa in ratings_qs:
            r = sa.rating or 0
            if r < 0:
                r = 0
            if r > 10:
                r = 10
            count_r += 1
            total_r += float(r)
            avg = total_r / count_r
            series.append({"index": count_r, "average": round(avg, 2)})
        payload["performance"] = {"series": series}

        # Attendance summary for this sport
        total_sessions = ratings_qs.count()
        attended_sessions = ratings_qs.filter(attended=True).count()
        payload["attendance"] = {"total_sessions": total_sessions, "attended": attended_sessions}

        return payload

    profile_blocks = [get_stats_and_rank(p) for p in profiles]

    # Available sports and inferred primary sport
    all_sports = list(Sport.objects.values("name", "sport_type"))
    primary_profile = profiles.order_by("joined_date").first() if hasattr(profiles, "order_by") else (profiles[0] if profiles else None)
    primary_sport = primary_profile.sport.name if primary_profile and primary_profile.sport else None

    # Include player_id explicitly for UI
    player_payload = PlayerSerializer(player).data
    player_payload["player_id"] = player.player_id

    return Response({
        "player": player_payload,
        "profiles": profile_blocks,
        "available_sports": all_sports,
        "primary_sport": primary_sport,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def coach_dashboard(request):
    user = request.user
    if user.role != user.Roles.COACH:
        return Response({"detail": "Coaches only"}, status=status.HTTP_403_FORBIDDEN)

    try:
        coach = user.coach
    except Coach.DoesNotExist:
        return Response({"detail": "Coach profile not found"}, status=status.HTTP_404_NOT_FOUND)

    teams = Team.objects.filter(coach=coach)
    players = Player.objects.filter(coach=coach).select_related("user", "team")

    return Response({
        "teams": [{"id": t.id, "name": t.name} for t in teams],
        "players": [
            {
                "id": p.id,
                "username": p.user.username,
                "team": p.team.name if p.team else None,
            } for p in players
        ],
    })
