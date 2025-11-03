from django.contrib import admin
from .models import Player, Coach, Team, Match, Attendance, Leaderboard
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ('id', 'username', 'email', 'role', 'is_staff', 'is_superuser', 'is_active')
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active')
    search_fields = ('username', 'email')
    ordering = ('id',)

    fieldsets = (
        (None, {'fields': ('username', 'email', 'password')}),
        ('Permissions', {'fields': ('is_staff', 'is_active', 'is_superuser', 'groups', 'user_permissions')}),
        ('Role Info', {'fields': ('role',)}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role', 'is_staff', 'is_active')}
        ),
    )


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
