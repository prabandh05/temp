from django.contrib import admin
from .models import Player, Coach, Team, Match, Attendance, Leaderboard

@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'team', 'joined_at')
    search_fields = ('user__username',)

@admin.register(Coach)
class CoachAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'experience', 'specialization')
    search_fields = ('user__username',)

@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'coach', 'created_at')
    search_fields = ('name', 'coach__user__username')

@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ('id', 'team1', 'team2', 'date', 'is_completed')
    search_fields = ('team1__name', 'team2__name')
    list_filter = ('is_completed', 'date')

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('id', 'player', 'match', 'attended')
    search_fields = ('player__user__username',)
    list_filter = ('attended',)

@admin.register(Leaderboard)
class LeaderboardAdmin(admin.ModelAdmin):
    list_display = ('id', 'player', 'score')
    search_fields = ('player__user__username',)
    ordering = ('-score',)
