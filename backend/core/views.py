from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import csv
from io import StringIO

from .models import (
    PromotionRequest, Player, Sport, CoachingSession, PlayerSportProfile, SessionAttendance,
    CoachPlayerLinkRequest, Leaderboard, Notification, Manager, ManagerSport, TeamProposal,
    TeamAssignmentRequest, Tournament, TournamentTeam, TournamentMatch, Team
)
from django.utils import timezone
from .serializers import (
    PromotionRequestCreateSerializer, PromotionRequestSerializer,
    CoachingSessionCreateSerializer, CoachInviteSerializer, PlayerRequestCoachSerializer,
    CoachPlayerLinkRequestSerializer, LeaderboardSerializer, NotificationSerializer,
    SportSerializer, TeamProposalCreateSerializer, TeamProposalSerializer,
    TeamAssignmentRequestCreateSerializer, TeamAssignmentRequestSerializer,
    TournamentCreateSerializer, TournamentSerializer, TournamentTeamSerializer, 
    TournamentMatchCreateSerializer, TournamentMatchSerializer,
    ManagerSportSerializer, PlayerSportProfileSerializer, PlayerSportProfileUpdateSerializer,
)
from .permissions import IsAuthenticatedAndPlayer, IsAuthenticatedAndManagerOrAdmin, IsAuthenticatedAndCoach
from .promotion_services import (
    request_promotion, approve_promotion, reject_promotion, PromotionError,
    coach_invite_player, player_request_coach, accept_link_request, reject_link_request, LinkError,
    create_team_proposal, approve_team_proposal, reject_team_proposal, TeamProposalError,
    create_team_assignment, accept_team_assignment, reject_team_assignment, TeamAssignmentError,
)


class PromotionRequestViewSet(viewsets.GenericViewSet):
    queryset = PromotionRequest.objects.select_related("user", "player", "sport", "decided_by")
    serializer_class = PromotionRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in {"create"}:
            return [IsAuthenticatedAndPlayer()]
        if self.action in {"approve", "reject", "list"}:
            return [IsAuthenticatedAndManagerOrAdmin()]
        return super().get_permissions()

    def list(self, request):
        qs = self.get_queryset().order_by("-requested_at")
        serializer = PromotionRequestSerializer(qs, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = PromotionRequestCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        sport = serializer.validated_data["sport"]
        player_obj = serializer.validated_data["player_obj"]
        remarks = serializer.validated_data.get("remarks", "")
        pr = request_promotion(user=request.user, sport=sport, player=player_obj, remarks=remarks)
        return Response(PromotionRequestSerializer(pr).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        try:
            pr = self.get_queryset().get(pk=pk)
            coach = approve_promotion(pr, decided_by=request.user)
        except PromotionRequest.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        except PromotionError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Approved", "coach_id": coach.coach_id})

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        remarks = request.data.get("remarks")
        try:
            pr = self.get_queryset().get(pk=pk)
            reject_promotion(pr, decided_by=request.user, remarks=remarks)
        except PromotionRequest.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        except PromotionError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Rejected"})


class CoachingSessionViewSet(viewsets.GenericViewSet):
    queryset = CoachingSession.objects.select_related("coach", "team", "sport")
    serializer_class = CoachingSessionCreateSerializer
    permission_classes = [IsAuthenticatedAndCoach]

    def list(self, request):
        """List sessions for the current coach."""
        qs = self.get_queryset().filter(coach=request.user.coach).order_by("-session_date")
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = CoachingSessionCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        coach = request.user.coach
        session = CoachingSession.objects.create(coach=coach, **serializer.validated_data)
        return Response({"id": session.id}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="csv-template")
    def csv_template(self, request, pk=None):
        try:
            session = self.get_queryset().get(pk=pk)
        except CoachingSession.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        if session.coach_id != request.user.coach.id:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        # Players under this coach for this sport and currently active
        profiles = PlayerSportProfile.objects.select_related("player").filter(
            coach=request.user.coach,
            sport=session.sport,
            is_active=True,
            player__is_active=True,
        )

        output = StringIO()
        writer = csv.writer(output, lineterminator='\n')  # Use Unix line endings for consistency
        writer.writerow(["player_id", "attended", "score"])  # attended: 0/1, score: 1-10
        for p in profiles:
            writer.writerow([p.player.player_id, 0, 0])
        data = output.getvalue()
        # Ensure proper CSV format with UTF-8 BOM for Excel compatibility
        response = Response(data, headers={
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": f'attachment; filename="session_{pk}_template.csv"'
        })
        return response

    @action(detail=True, methods=["post"], url_path="upload-csv")
    def upload_csv(self, request, pk=None):
        try:
            session = self.get_queryset().get(pk=pk)
        except CoachingSession.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        if session.coach_id != request.user.coach.id:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "CSV file required (field name: file)"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            content = file.read().decode("utf-8")
        except Exception:
            return Response({"detail": "Invalid file encoding"}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(StringIO(content))
        required_cols = {"player_id", "attended", "score"}
        if set(reader.fieldnames or []) != required_cols:
            return Response({"detail": f"CSV must have columns: {', '.join(sorted(required_cols))}"}, status=status.HTTP_400_BAD_REQUEST)

        # Allowed players: under this coach for this sport and active
        allowed_player_ids = set(
            PlayerSportProfile.objects.select_related("player").filter(
                coach=request.user.coach,
                sport=session.sport,
                is_active=True,
                player__is_active=True,
            ).values_list("player__player_id", flat=True)
        )

        updated = 0
        errors = []
        for idx, row in enumerate(reader, start=2):  # header is line 1
            pid = (row.get("player_id") or "").strip()
            attended_val = (row.get("attended") or "").strip()
            score_val = (row.get("score") or "").strip()

            if pid not in allowed_player_ids:
                errors.append({"row": idx, "player_id": pid, "error": "Player not under this coach/sport or inactive"})
                continue
            try:
                attended = int(attended_val)
                score = int(score_val)
            except ValueError:
                errors.append({"row": idx, "player_id": pid, "error": "attended and score must be integers"})
                continue
            if attended not in (0, 1) or not (1 <= score <= 10):
                errors.append({"row": idx, "player_id": pid, "error": "attended must be 0/1; score 1-10"})
                continue

            try:
                player = Player.objects.get(player_id=pid)
            except Player.DoesNotExist:
                errors.append({"row": idx, "player_id": pid, "error": "Player not found"})
                continue

            sa, _ = SessionAttendance.objects.get_or_create(session=session, player=player)
            sa.attended = bool(attended)
            sa.rating = score if sa.attended else 0
            sa.save()
            updated += 1

            # Update DailyPerformanceScore for the calendar day
            from .models import DailyPerformanceScore
            day = session.session_date.date()
            dps, _ = DailyPerformanceScore.objects.get_or_create(player=player, date=day)
            # recompute as average of all ratings for this player on this day (across sessions)
            from django.db.models import Avg
            avg_score = (
                SessionAttendance.objects.filter(
                    player=player,
                    session__session_date__date=day,
                    attended=True,
                ).aggregate(Avg("rating"))["rating__avg"] or 0.0
            )
            dps.score = float(avg_score)
            dps.save(update_fields=["score"])

        status_code = status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS
        return Response({"updated": updated, "errors": errors}, status=status_code)


class CoachPlayerLinkViewSet(viewsets.GenericViewSet):
    queryset = CoachPlayerLinkRequest.objects.select_related("coach__user", "player__user", "sport")
    permission_classes = [IsAuthenticated]
    serializer_class = CoachPlayerLinkRequestSerializer

    def get_permissions(self):
        if self.action in {"invite"}:
            return [IsAuthenticatedAndCoach()]
        if self.action in {"request_coach"}:
            return [IsAuthenticatedAndPlayer()]
        return super().get_permissions()

    def list(self, request):
        """List link requests for current user."""
        qs = self.get_queryset()
        if request.user.role == User.Roles.PLAYER:
            qs = qs.filter(player__user=request.user, status="pending")
        elif request.user.role == User.Roles.COACH:
            qs = qs.filter(coach__user=request.user, status="pending")
        elif request.user.role == User.Roles.ADMIN:
            qs = qs.filter(status="pending")
        else:
            qs = qs.none()
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="invite")
    def invite(self, request):
        serializer = CoachInviteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        link = coach_invite_player(coach=serializer.validated_data["coach"], player=serializer.validated_data["player"], sport=serializer.validated_data["sport"])
        return Response(CoachPlayerLinkRequestSerializer(link).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="request")
    def request_coach(self, request):
        serializer = PlayerRequestCoachSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        link = player_request_coach(player=serializer.validated_data["player"], coach=serializer.validated_data["coach"], sport=serializer.validated_data["sport"])
        return Response(CoachPlayerLinkRequestSerializer(link).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="accept")
    def accept(self, request, pk=None):
        """Accept link request. Admin can bypass."""
        try:
            link = self.get_queryset().get(pk=pk)
            # Allow admin or the appropriate party
            if request.user.role != User.Roles.ADMIN:
                if link.direction == CoachPlayerLinkRequest.Direction.COACH_TO_PLAYER:
                    if not hasattr(request.user, "player") or request.user.player.id != link.player.id:
                        return Response({"detail": "Only the invited player or admin can accept"}, status=status.HTTP_403_FORBIDDEN)
                else:
                    if not hasattr(request.user, "coach") or request.user.coach.id != link.coach.id:
                        return Response({"detail": "Only the invited coach or admin can accept"}, status=status.HTTP_403_FORBIDDEN)
            psp = accept_link_request(link, acting_user=request.user)
        except CoachPlayerLinkRequest.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        except LinkError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Accepted", "player_id": psp.player.player_id})

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        try:
            link = self.get_queryset().get(pk=pk)
            reject_link_request(link, acting_user=request.user)
        except CoachPlayerLinkRequest.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        except LinkError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Rejected"})


class LeaderboardViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        # filter to active players only
        qs = Leaderboard.objects.select_related("player__user").filter(player__is_active=True).order_by("-score")
        return Response(LeaderboardSerializer(qs, many=True).data)


class NotificationViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        qs = Notification.objects.filter(user=request.user).order_by("-created_at")
        return Response(NotificationSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        try:
            n = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        if n.read_at is None:
            from django.utils import timezone as _tz
            n.read_at = _tz.now()
            n.save(update_fields=["read_at"])
        return Response({"detail": "OK"})

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
    queryset = Team.objects.select_related("coach__user", "manager", "sport")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return TeamCreateSerializer
        return TeamSerializer
    
    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticatedAndManagerOrAdmin()]
        return super().get_permissions()
    
    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == User.Roles.MANAGER:
            qs = qs.filter(manager=user)
        elif user.role == User.Roles.COACH:
            qs = qs.filter(coach__user=user)
        return qs

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

    # Get teams assigned to this coach
    teams = Team.objects.filter(coach=coach).select_related("sport", "manager")
    
    # Get students (players linked via PlayerSportProfile)
    student_profiles = PlayerSportProfile.objects.filter(
        coach=coach,
        is_active=True
    ).select_related("player__user", "sport", "team").prefetch_related("player__achievements")
    
    # Group players by player (since a player can have multiple profiles for different sports)
    players_dict = {}
    for profile in student_profiles:
        player = profile.player
        if player.id not in players_dict:
            players_dict[player.id] = {
                "id": player.id,
                "user_id": player.user.id,
                "player_id": player.player_id,
                "user": {
                    "id": player.user.id,
                    "username": player.user.username,
                    "email": player.user.email,
                },
                "profiles": []
            }
        
        # Add profile data
        profile_data = {
            "id": profile.id,
            "sport": {
                "id": profile.sport.id if profile.sport else None,
                "name": profile.sport.name if profile.sport else None,
                "sport_type": profile.sport.sport_type if profile.sport else None,
            },
            "team": {
                "id": profile.team.id if profile.team else None,
                "name": profile.team.name if profile.team else None,
            } if profile.team else None,
            "is_active": profile.is_active,
            "joined_date": profile.joined_date,
            "career_score": profile.career_score,
        }
        
        # Add sport-specific stats if available
        if profile.sport:
            sport_name = profile.sport.name.lower()
            if sport_name == "cricket":
                cricket_stats = profile.cricket_stats.first()
                if cricket_stats:
                    profile_data["stats"] = {
                        "runs": cricket_stats.runs,
                        "wickets": cricket_stats.wickets,
                        "matches_played": cricket_stats.matches_played,
                        "strike_rate": cricket_stats.strike_rate,
                        "average": cricket_stats.average,
                    }
            elif sport_name == "football":
                football_stats = profile.football_stats.first()
                if football_stats:
                    profile_data["stats"] = {
                        "goals": football_stats.goals,
                        "assists": football_stats.assists,
                        "tackles": football_stats.tackles,
                        "matches_played": football_stats.matches_played,
                    }
            elif sport_name == "basketball":
                basketball_stats = profile.basketball_stats.first()
                if basketball_stats:
                    profile_data["stats"] = {
                        "points": basketball_stats.points,
                        "rebounds": basketball_stats.rebounds,
                        "assists": basketball_stats.assists,
                        "matches_played": basketball_stats.matches_played,
                    }
            elif sport_name == "running":
                running_stats = profile.running_stats.first()
                if running_stats:
                    profile_data["stats"] = {
                        "total_distance_km": running_stats.total_distance_km,
                        "best_time_seconds": running_stats.best_time_seconds,
                        "events_participated": running_stats.events_participated,
                        "matches_played": running_stats.matches_played,
                    }
        
        players_dict[player.id]["profiles"].append(profile_data)
    
    players_list = list(players_dict.values())

    return Response({
        "teams": [{"id": t.id, "name": t.name, "sport": {"id": t.sport.id, "name": t.sport.name} if t.sport else None} for t in teams],
        "players": players_list,
        "total_students": len(players_list),
        "total_teams": teams.count(),
    })


# -----------------------------
# Sport CRUD ViewSet
# -----------------------------
class SportViewSet(viewsets.GenericViewSet):
    queryset = Sport.objects.all()
    serializer_class = SportSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in {"create"}:
            # Only admin/manager can create sports
            return [IsAuthenticatedAndManagerOrAdmin()]
        return super().get_permissions()

    def list(self, request):
        """List all sports (public)."""
        qs = self.get_queryset().order_by("name")
        return Response(SportSerializer(qs, many=True).data)

    def create(self, request):
        """Create a new sport (admin/manager only)."""
        serializer = SportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sport = serializer.save()
        return Response(SportSerializer(sport).data, status=status.HTTP_201_CREATED)


# -----------------------------
# Team Proposal ViewSet
# -----------------------------
class TeamProposalViewSet(viewsets.GenericViewSet):
    queryset = TeamProposal.objects.select_related("coach__user", "manager", "sport", "created_team")
    serializer_class = TeamProposalSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in {"create"}:
            return [IsAuthenticatedAndCoach()]
        if self.action in {"approve", "reject", "list"}:
            return [IsAuthenticatedAndManagerOrAdmin()]
        return super().get_permissions()

    def create(self, request):
        """Coach creates a team proposal."""
        serializer = TeamProposalCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        try:
            proposal = create_team_proposal(
                coach=serializer.validated_data["coach"],
                manager=serializer.validated_data["manager"],
                sport=serializer.validated_data["sport"],
                team_name=serializer.validated_data["team_name"],
                players=serializer.validated_data["players"],
            )
            return Response(TeamProposalSerializer(proposal).data, status=status.HTTP_201_CREATED)
        except TeamProposalError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def list(self, request):
        """List team proposals (coach sees their own, manager sees their own, admin sees all)."""
        qs = self.get_queryset().order_by("-created_at")
        if request.user.role == User.Roles.COACH:
            qs = qs.filter(coach__user=request.user)
        elif request.user.role == User.Roles.MANAGER:
            qs = qs.filter(manager=request.user)
        elif request.user.role != User.Roles.ADMIN:
            qs = qs.none()
        return Response(TeamProposalSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        """Manager approves team proposal. Admin can bypass."""
        try:
            proposal = self.get_queryset().get(pk=pk)
            # Allow admin or assigned manager
            if request.user.role != User.Roles.ADMIN:
                if proposal.manager_id != request.user.id:
                    return Response({"detail": "Only the assigned manager or admin can approve"}, status=status.HTTP_403_FORBIDDEN)
            team = approve_team_proposal(proposal, decided_by=request.user)
        except TeamProposal.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        except TeamProposalError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Approved", "team_id": team.id})

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        """Manager rejects team proposal. Admin can bypass."""
        remarks = request.data.get("remarks")
        try:
            proposal = self.get_queryset().get(pk=pk)
            # Allow admin or assigned manager
            if request.user.role != User.Roles.ADMIN:
                if proposal.manager_id != request.user.id:
                    return Response({"detail": "Only the assigned manager or admin can reject"}, status=status.HTTP_403_FORBIDDEN)
            reject_team_proposal(proposal, decided_by=request.user, remarks=remarks)
        except TeamProposal.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        except TeamProposalError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Rejected"})


# -----------------------------
# Team Assignment Request ViewSet
# -----------------------------
class TeamAssignmentRequestViewSet(viewsets.GenericViewSet):
    queryset = TeamAssignmentRequest.objects.select_related("manager", "coach__user", "team")
    serializer_class = TeamAssignmentRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in {"create"}:
            return [IsAuthenticatedAndManagerOrAdmin()]
        if self.action in {"accept", "reject", "list"}:
            # Admin can bypass - allow both coach and admin
            return [IsAuthenticated()]
        return super().get_permissions()

    def list(self, request):
        """List team assignment requests."""
        qs = self.get_queryset().order_by("-created_at")
        if request.user.role == User.Roles.COACH:
            qs = qs.filter(coach__user=request.user)
        elif request.user.role == User.Roles.MANAGER:
            qs = qs.filter(manager=request.user)
        elif request.user.role != User.Roles.ADMIN:
            qs = qs.none()
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def create(self, request):
        """Manager creates team assignment request."""
        serializer = TeamAssignmentRequestCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        try:
            assignment = create_team_assignment(
                manager=serializer.validated_data["manager"],
                coach=serializer.validated_data["coach"],
                team=serializer.validated_data["team"],
            )
            return Response(TeamAssignmentRequestSerializer(assignment).data, status=status.HTTP_201_CREATED)
        except TeamAssignmentError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="accept")
    def accept(self, request, pk=None):
        """Coach accepts team assignment. Admin can bypass."""
        try:
            assignment = self.get_queryset().get(pk=pk)
            # Allow admin or assigned coach
            if request.user.role != User.Roles.ADMIN:
                if not hasattr(request.user, "coach") or request.user.coach_id != assignment.coach_id:
                    return Response({"detail": "Only the assigned coach or admin can accept"}, status=status.HTTP_403_FORBIDDEN)
            team = accept_team_assignment(assignment, decided_by=request.user)
        except TeamAssignmentRequest.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        except TeamAssignmentError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Accepted", "team_id": team.id})

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        """Coach rejects team assignment. Admin can bypass."""
        remarks = request.data.get("remarks")
        try:
            assignment = self.get_queryset().get(pk=pk)
            # Allow admin or assigned coach
            if request.user.role != User.Roles.ADMIN:
                if not hasattr(request.user, "coach") or request.user.coach.id != assignment.coach.id:
                    return Response({"detail": "Only the assigned coach or admin can reject"}, status=status.HTTP_403_FORBIDDEN)
            reject_team_assignment(assignment, decided_by=request.user, remarks=remarks)
        except TeamAssignmentRequest.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        except TeamAssignmentError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Rejected"})


# -----------------------------
# Tournament ViewSet
# -----------------------------
class TournamentViewSet(viewsets.GenericViewSet):
    queryset = Tournament.objects.select_related("sport", "manager", "created_by")
    serializer_class = TournamentSerializer
    permission_classes = [IsAuthenticatedAndManagerOrAdmin]

    def create(self, request):
        """Create tournament (manager/admin only)."""
        serializer = TournamentCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        tournament = serializer.save()
        return Response(TournamentSerializer(tournament).data, status=status.HTTP_201_CREATED)

    def list(self, request):
        """List tournaments (manager sees their own, admin sees all)."""
        qs = self.get_queryset().order_by("-created_at")
        if request.user.role == User.Roles.MANAGER:
            qs = qs.filter(manager=request.user)
        return Response(TournamentSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"], url_path="add-team")
    def add_team(self, request, pk=None):
        """Add team to tournament."""
        try:
            tournament = self.get_queryset().get(pk=pk)
            team_id = request.data.get("team_id")
            if not team_id:
                return Response({"detail": "team_id required"}, status=status.HTTP_400_BAD_REQUEST)
            team = Team.objects.get(id=team_id)
            if team.sport_id != tournament.sport_id:
                return Response({"detail": "Team sport must match tournament sport"}, status=status.HTTP_400_BAD_REQUEST)
            tt, created = TournamentTeam.objects.get_or_create(tournament=tournament, team=team)
            if not created:
                return Response({"detail": "Team already in tournament"}, status=status.HTTP_400_BAD_REQUEST)
            return Response(TournamentTeamSerializer(tt).data, status=status.HTTP_201_CREATED)
        except Tournament.DoesNotExist:
            return Response({"detail": "Tournament not found"}, status=status.HTTP_404_NOT_FOUND)
        except Team.DoesNotExist:
            return Response({"detail": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=["get"], url_path="matches")
    def list_matches(self, request, pk=None):
        """List matches for a tournament."""
        try:
            tournament = self.get_queryset().get(pk=pk)
            matches = TournamentMatch.objects.filter(tournament=tournament).order_by("match_number")
            return Response(TournamentMatchSerializer(matches, many=True).data)
        except Tournament.DoesNotExist:
            return Response({"detail": "Tournament not found"}, status=status.HTTP_404_NOT_FOUND)


# -----------------------------
# Tournament Match ViewSet
# -----------------------------
class TournamentMatchViewSet(viewsets.ModelViewSet):
    queryset = TournamentMatch.objects.select_related("tournament", "team1", "team2", "man_of_the_match__user")
    permission_classes = [IsAuthenticatedAndManagerOrAdmin]
    
    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return TournamentMatchCreateSerializer
        return TournamentMatchSerializer
    
    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == User.Roles.MANAGER:
            # Manager sees matches for their tournaments
            qs = qs.filter(tournament__manager=user)
        return qs.order_by("tournament", "match_number")
    
    def perform_create(self, serializer):
        """Create match and optionally create achievements on completion."""
        match = serializer.save()
        # If match is completed, could trigger achievement creation here
        # For now, we'll handle it in the update action
        return match
    
    def perform_update(self, serializer):
        """Update match and create achievements if completed."""
        match = serializer.save()
        if match.is_completed and match.man_of_the_match:
            # Create achievement for Man of the Match
            from .models import Achievement
            Achievement.objects.get_or_create(
                player=match.man_of_the_match,
                title=f"Man of the Match - {match.tournament.name}",
                description=f"Man of the Match in {match.team1.name} vs {match.team2.name}",
                date_awarded=match.date.date() if match.date else timezone.now().date(),
                defaults={"sport": match.tournament.sport}
            )


# -----------------------------
# Admin Manager-Sport Assignment ViewSet
# -----------------------------
class ManagerSportAssignmentViewSet(viewsets.GenericViewSet):
    queryset = ManagerSport.objects.select_related("manager__user", "sport", "assigned_by")
    serializer_class = ManagerSportSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # Only admin can assign managers to sports
        if self.request.user.role != User.Roles.ADMIN:
            return [IsAuthenticated()]
        return super().get_permissions()

    def create(self, request):
        """Admin assigns manager to sport."""
        if request.user.role != User.Roles.ADMIN:
            return Response({"detail": "Admin only"}, status=status.HTTP_403_FORBIDDEN)
        manager_id = request.data.get("manager_id")
        sport_id = request.data.get("sport_id")
        if not manager_id or not sport_id:
            return Response({"detail": "manager_id and sport_id required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            manager = Manager.objects.get(id=manager_id)
            sport = Sport.objects.get(id=sport_id)
        except (Manager.DoesNotExist, Sport.DoesNotExist):
            return Response({"detail": "Manager or sport not found"}, status=status.HTTP_404_NOT_FOUND)
        # Check if already assigned
        if ManagerSport.objects.filter(manager=manager, sport=sport).exists():
            return Response({"detail": "Manager already assigned to this sport"}, status=status.HTTP_400_BAD_REQUEST)
        ms = ManagerSport.objects.create(manager=manager, sport=sport, assigned_by=request.user)
        return Response(ManagerSportSerializer(ms).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"])
    def remove(self, request, pk=None):
        """Admin removes manager from sport."""
        if request.user.role != User.Roles.ADMIN:
            return Response({"detail": "Admin only"}, status=status.HTTP_403_FORBIDDEN)
        try:
            ms = self.get_queryset().get(pk=pk)
            ms.delete()
            return Response({"detail": "Removed"}, status=status.HTTP_200_OK)
        except ManagerSport.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)


# -----------------------------
# PlayerSportProfile ViewSet
# -----------------------------
class PlayerSportProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing PlayerSportProfile - allows managers/coaches to assign players to teams.
    """
    queryset = PlayerSportProfile.objects.select_related("player__user", "sport", "team", "coach__user")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ("update", "partial_update"):
            return PlayerSportProfileUpdateSerializer
        return PlayerSportProfileSerializer

    def get_queryset(self):
        """Filter based on user role"""
        user = self.request.user
        qs = super().get_queryset()

        # Managers can see profiles for their sports
        if user.role == user.Roles.MANAGER:
            if hasattr(user, 'manager'):
                managed_sports = ManagerSport.objects.filter(manager=user.manager).values_list('sport_id', flat=True)
                qs = qs.filter(sport_id__in=managed_sports)

        # Coaches can see their own players
        elif user.role == user.Roles.COACH:
            if hasattr(user, 'coach'):
                qs = qs.filter(coach=user.coach)

        # Players can see their own profiles
        elif user.role == user.Roles.PLAYER:
            if hasattr(user, 'player'):
                qs = qs.filter(player=user.player)

        return qs

    def update(self, request, *args, **kwargs):
        """Allow managers/coaches to update team assignment"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        # Check permissions
        user = request.user
        if user.role == user.Roles.MANAGER:
            # Manager can update if they manage the sport
            if hasattr(user, 'manager'):
                if not ManagerSport.objects.filter(manager=user.manager, sport=instance.sport).exists():
                    return Response({"detail": "You don't manage this sport"}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == user.Roles.COACH:
            # Coach can update if it's their player
            if not hasattr(user, 'coach') or instance.coach_id != user.coach.id:
                return Response({"detail": "Not your player"}, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({"detail": "Only managers and coaches can update profiles"}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(PlayerSportProfileSerializer(instance).data)
