from django.urls import path, include
from rest_framework import routers
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    TeamViewSet, PlayerViewSet, MatchViewSet,
    AttendanceViewSet, LeaderboardViewSet,
    predict_player_start, player_insight, register_user
)
from .views import CustomObtainAuthToken

router = routers.DefaultRouter()
router.register(r'teams', TeamViewSet)
router.register(r'players', PlayerViewSet)
router.register(r'matches', MatchViewSet)
router.register(r'attendance', AttendanceViewSet)
router.register(r'leaderboard', LeaderboardViewSet)

urlpatterns = [
    
    path('', include(router.urls)),
    path('predict-player/', predict_player_start, name='predict_player_start'),
    path('player-insight/', player_insight, name='player_insight'),
    path('register/', register_user, name='register_user'),
    path('auth/login/', CustomObtainAuthToken.as_view(), name='api-login'),
    
    # ✅ Add JWT authentication endpoints
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
