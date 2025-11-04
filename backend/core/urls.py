from django.urls import path, include
from rest_framework import routers
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    TeamViewSet, PlayerViewSet, MatchViewSet,
    AttendanceViewSet, LeaderboardViewSet,
    predict_player_start, player_insight, register_user,
    player_dashboard, coach_dashboard,
    CustomObtainAuthToken, RoleAwareProfileView, player_profile, coach_profile,
    PromotionRequestViewSet, CoachingSessionViewSet, CoachPlayerLinkViewSet, NotificationViewSet,
    SportViewSet, TeamProposalViewSet, TeamAssignmentRequestViewSet, TournamentViewSet,
    TournamentMatchViewSet, ManagerSportAssignmentViewSet, PlayerSportProfileViewSet,
    CoachViewSet,
)


router = routers.DefaultRouter()
router.register(r'teams', TeamViewSet)
router.register(r'players', PlayerViewSet)
router.register(r'matches', MatchViewSet)
router.register(r'attendance', AttendanceViewSet)
router.register(r'leaderboard', LeaderboardViewSet)
router.register(r"promotion", PromotionRequestViewSet, basename="promotion")
router.register(r"sessions", CoachingSessionViewSet, basename="sessions")
router.register(r"coach-player-links", CoachPlayerLinkViewSet, basename="coach-player-links")
router.register(r"notifications", NotificationViewSet, basename="notifications")
router.register(r"sports", SportViewSet, basename="sports")
router.register(r"team-proposals", TeamProposalViewSet, basename="team-proposals")
router.register(r"team-assignments", TeamAssignmentRequestViewSet, basename="team-assignments")
router.register(r"tournaments", TournamentViewSet, basename="tournaments")
router.register(r"tournament-matches", TournamentMatchViewSet, basename="tournament-matches")
router.register(r"manager-sport-assignments", ManagerSportAssignmentViewSet, basename="manager-sport-assignments")
router.register(r"player-sport-profiles", PlayerSportProfileViewSet, basename="player-sport-profiles")
router.register(r"coaches", CoachViewSet, basename="coaches")

urlpatterns = [
    
    path('', include(router.urls)),
    path('predict-player/', predict_player_start, name='predict_player_start'),
    path('player-insight/', player_insight, name='player_insight'),
    path('auth/signup/', register_user, name='register_user'),
    path('auth/login/', CustomObtainAuthToken.as_view(), name='api-login'),
    path('profile/', RoleAwareProfileView.as_view(), name='api-profile'),
    path('player/profile/', player_profile, name='player-profile'),   # optional
    path('coach/profile/', coach_profile, name='coach-profile'),
    path('dashboard/player/', player_dashboard, name='player-dashboard'),
    path('dashboard/coach/', coach_dashboard, name='coach-dashboard'),
    
    # ✅ Add JWT authentication endpoints
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
