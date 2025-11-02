from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet,
    TeamViewSet,
    PlayerViewSet,
    MatchViewSet,
    AttendanceViewSet,
    LeaderboardViewSet,
)

# Create a router and register all the viewsets
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'teams', TeamViewSet, basename='team')
router.register(r'players', PlayerViewSet, basename='player')
router.register(r'matches', MatchViewSet, basename='match')
router.register(r'attendance', AttendanceViewSet, basename='attendance')
router.register(r'leaderboard', LeaderboardViewSet, basename='leaderboard')

# Define URL patterns
urlpatterns = [
    path('', include(router.urls)),
]
