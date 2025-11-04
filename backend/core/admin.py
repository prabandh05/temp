from django.contrib import admin
from .models import (
    Player, Coach, Team, Match, Attendance, Leaderboard, User,
    Manager, Admin, ManagerSport, TeamProposal, TeamAssignmentRequest,
    Tournament, TournamentTeam, TournamentMatch, Sport, PromotionRequest,
    CoachPlayerLinkRequest, Notification
)
from django.contrib.auth.admin import UserAdmin

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


@admin.register(Manager)
class ManagerAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'manager_id', 'created_at')
    search_fields = ('user__username', 'manager_id')


@admin.register(Admin)
class AdminProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'admin_id', 'created_at')
    search_fields = ('user__username', 'admin_id')


@admin.register(ManagerSport)
class ManagerSportAdmin(admin.ModelAdmin):
    list_display = ('id', 'manager', 'sport', 'assigned_by', 'assigned_at')
    list_filter = ('sport', 'assigned_at')


@admin.register(TeamProposal)
class TeamProposalAdmin(admin.ModelAdmin):
    list_display = ('id', 'team_name', 'coach', 'manager', 'sport', 'status', 'created_at')
    list_filter = ('status', 'sport', 'created_at')
    search_fields = ('team_name', 'coach__user__username', 'manager__username')


@admin.register(TeamAssignmentRequest)
class TeamAssignmentRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'team', 'coach', 'manager', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('team__name', 'coach__user__username', 'manager__username')


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'sport', 'manager', 'status', 'start_date', 'end_date')
    list_filter = ('status', 'sport', 'start_date')
    search_fields = ('name', 'manager__username')


@admin.register(TournamentTeam)
class TournamentTeamAdmin(admin.ModelAdmin):
    list_display = ('id', 'tournament', 'team', 'registered_at')
    list_filter = ('tournament', 'registered_at')


@admin.register(TournamentMatch)
class TournamentMatchAdmin(admin.ModelAdmin):
    list_display = ('id', 'tournament', 'team1', 'team2', 'match_number', 'date', 'is_completed')
    list_filter = ('tournament', 'is_completed', 'date')
    search_fields = ('tournament__name', 'team1__name', 'team2__name')


@admin.register(Sport)
class SportAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'sport_type', 'description')
    list_filter = ('sport_type',)
    search_fields = ('name',)


@admin.register(PromotionRequest)
class PromotionRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'sport', 'status', 'requested_at', 'decided_by')
    list_filter = ('status', 'sport', 'requested_at')
    search_fields = ('user__username',)


@admin.register(CoachPlayerLinkRequest)
class CoachPlayerLinkRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'coach', 'player', 'sport', 'direction', 'status', 'created_at')
    list_filter = ('status', 'direction', 'sport', 'created_at')
    search_fields = ('coach__user__username', 'player__user__username')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'type', 'title', 'created_at', 'read_at')
    list_filter = ('type', 'created_at', 'read_at')
    search_fields = ('user__username', 'title', 'message')
