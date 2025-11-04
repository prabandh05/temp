from django.db import transaction
from django.utils import timezone
from typing import Optional

from .models import (
    User,
    Player,
    Coach,
    Sport,
    PlayerSportProfile,
    RoleHistory,
    PromotionRequest,
    CoachPlayerLinkRequest,
    TeamProposal,
    TeamAssignmentRequest,
    Team,
    Tournament,
    TournamentTeam,
    TournamentMatch,
    Achievement,
    ManagerSport,
)
from .utils import generate_coach_id


class PromotionError(Exception):
    pass


def _notify(user: User, title: str, message: str, ntype: str) -> None:
    try:
        from .models import Notification
        Notification.objects.create(user=user, title=title, message=message, type=ntype)
    except Exception:
        pass


@transaction.atomic
def request_promotion(user: User, sport: Sport, player: Optional[Player] = None, remarks: Optional[str] = None) -> PromotionRequest:
    if hasattr(user, "coach"):
        raise PromotionError("User is already a coach")
    pr = PromotionRequest.objects.create(
        user=user,
        player=player,
        sport=sport,
        remarks=remarks or "",
    )
    _notify(user, "Promotion request submitted", f"Requested coach role for {sport.name}", ntype="promotion")
    
    # Notify managers assigned to this sport
    manager_sports = ManagerSport.objects.filter(sport=sport).select_related("manager__user")
    for ms in manager_sports:
        _notify(ms.manager.user, "Promotion Request", f"Player {player.user.username if player else user.username} requested promotion to coach for {sport.name}", ntype="promotion")
    
    return pr


@transaction.atomic
def approve_promotion(promotion: PromotionRequest, decided_by: User) -> Coach:
    if promotion.status != PromotionRequest.Status.PENDING:
        raise PromotionError("Promotion request is not pending")
    user = promotion.user
    if hasattr(user, "coach"):
        raise PromotionError("User already has a coach profile")

    coach_id = generate_coach_id()

    from_player = promotion.player if promotion.player else None
    coach = Coach.objects.create(
        user=user,
        coach_id=coach_id,
        primary_sport=promotion.sport,
        from_player=from_player,
    )

    if from_player is not None:
        from_player.is_active = False
        from_player.team = None
        from_player.coach = coach
        from_player.save(update_fields=["is_active", "team", "coach"])

        PlayerSportProfile.objects.filter(player=from_player, is_active=True).update(is_active=False)

    previous_role = user.role
    user.role = User.Roles.COACH
    user.save(update_fields=["role"])

    RoleHistory.objects.create(
        user=user,
        previous_role=previous_role,
        new_role=User.Roles.COACH,
        changed_by=decided_by,
        changed_on=timezone.now(),
    )

    promotion.status = PromotionRequest.Status.APPROVED
    promotion.decided_by = decided_by
    promotion.decided_at = timezone.now()
    promotion.save(update_fields=["status", "decided_by", "decided_at"])
    _notify(user, "Promotion approved", f"Coach ID: {coach.coach_id}", ntype="promotion")
    return coach


@transaction.atomic
def reject_promotion(promotion: PromotionRequest, decided_by: User, remarks: Optional[str] = None) -> PromotionRequest:
    if promotion.status != PromotionRequest.Status.PENDING:
        raise PromotionError("Promotion request is not pending")
    promotion.status = PromotionRequest.Status.REJECTED
    promotion.decided_by = decided_by
    promotion.decided_at = timezone.now()
    if remarks:
        promotion.remarks = remarks
    promotion.save(update_fields=["status", "decided_by", "decided_at", "remarks"])
    _notify(promotion.user, "Promotion rejected", remarks or "", ntype="promotion")
    return promotion


class LinkError(Exception):
    pass


@transaction.atomic
def coach_invite_player(coach: Coach, player: Player, sport: Sport) -> CoachPlayerLinkRequest:
    if coach.primary_sport_id != sport.id:
        raise LinkError("Coach primary sport mismatch")
    PlayerSportProfile.objects.get_or_create(player=player, sport=sport)
    existing = CoachPlayerLinkRequest.objects.filter(coach=coach, player=player, sport=sport, status=CoachPlayerLinkRequest.Status.PENDING)
    if existing.exists():
        return existing.first()
    link = CoachPlayerLinkRequest.objects.create(coach=coach, player=player, sport=sport, direction=CoachPlayerLinkRequest.Direction.COACH_TO_PLAYER)
    _notify(player.user, "Coach invitation", f"Coach {coach.user.username} invited you for {sport.name}", ntype="link")
    return link


@transaction.atomic
def player_request_coach(player: Player, coach: Coach, sport: Sport) -> CoachPlayerLinkRequest:
    if coach.primary_sport_id != sport.id:
        raise LinkError("Coach primary sport mismatch")
    PlayerSportProfile.objects.get_or_create(player=player, sport=sport)
    existing = CoachPlayerLinkRequest.objects.filter(coach=coach, player=player, sport=sport, status=CoachPlayerLinkRequest.Status.PENDING)
    if existing.exists():
        return existing.first()
    link = CoachPlayerLinkRequest.objects.create(coach=coach, player=player, sport=sport, direction=CoachPlayerLinkRequest.Direction.PLAYER_TO_COACH)
    _notify(coach.user, "Player request", f"Player {player.user.username} requested coaching for {sport.name}", ntype="link")
    return link


@transaction.atomic
def accept_link_request(link: CoachPlayerLinkRequest, acting_user: User) -> PlayerSportProfile:
    """Accept link request. Admin can bypass acceptance check."""
    if link.status != CoachPlayerLinkRequest.Status.PENDING:
        raise LinkError("Link request is not pending")
    
    # Admin can bypass acceptance check
    if acting_user.role != User.Roles.ADMIN:
        if link.direction == CoachPlayerLinkRequest.Direction.COACH_TO_PLAYER:
            if not hasattr(acting_user, "player") or acting_user.player_id != link.player_id:
                raise LinkError("Only the invited player can accept")
        else:
            if not hasattr(acting_user, "coach") or acting_user.coach_id != link.coach_id:
                raise LinkError("Only the invited coach can accept")

    psp, _ = PlayerSportProfile.objects.get_or_create(player=link.player, sport=link.sport)
    psp.coach = link.coach
    psp.is_active = True
    psp.save(update_fields=["coach", "is_active"])

    link.status = CoachPlayerLinkRequest.Status.ACCEPTED
    link.decided_at = timezone.now()
    link.save(update_fields=["status", "decided_at"])
    
    if acting_user.role == User.Roles.ADMIN:
        _notify(link.coach.user, "Link accepted (Admin)", f"Admin {acting_user.username} accepted link for {link.player.user.username} - {link.sport.name}", ntype="link")
        _notify(link.player.user, "Link accepted (Admin)", f"Admin {acting_user.username} accepted link with {link.coach.user.username} for {link.sport.name}", ntype="link")
    else:
        _notify(link.coach.user, "Link accepted", f"Player {link.player.user.username} linked for {link.sport.name}", ntype="link")
        _notify(link.player.user, "Link accepted", f"Coach {link.coach.user.username} linked for {link.sport.name}", ntype="link")
    return psp


@transaction.atomic
def reject_link_request(link: CoachPlayerLinkRequest, acting_user: User) -> CoachPlayerLinkRequest:
    if link.status != CoachPlayerLinkRequest.Status.PENDING:
        raise LinkError("Link request is not pending")
    if link.direction == CoachPlayerLinkRequest.Direction.COACH_TO_PLAYER:
        if not hasattr(acting_user, "player") or acting_user.player_id != link.player_id:
            raise LinkError("Only the invited player can reject")
    else:
        if not hasattr(acting_user, "coach") or acting_user.coach_id != link.coach_id:
            raise LinkError("Only the invited coach can reject")
    link.status = CoachPlayerLinkRequest.Status.REJECTED
    link.decided_at = timezone.now()
    link.save(update_fields=["status", "decided_at"])
    _notify(link.coach.user, "Link rejected", f"Player {link.player.user.username} rejected for {link.sport.name}", ntype="link")
    _notify(link.player.user, "Link rejected", f"Coach {link.coach.user.username} rejected for {link.sport.name}", ntype="link")
    return link


# -----------------------------
# Team Proposal Services
# -----------------------------
class TeamProposalError(Exception):
    pass


@transaction.atomic
def create_team_proposal(coach: Coach, manager: User, sport: Sport, team_name: str, players: list) -> TeamProposal:
    """Coach creates a team proposal from their students."""
    if coach.primary_sport_id != sport.id:
        raise TeamProposalError("Coach primary sport must match proposal sport")
    
    # Check manager is assigned to this sport
    if not ManagerSport.objects.filter(manager__user=manager, sport=sport).exists():
        raise TeamProposalError("Manager is not assigned to this sport")
    
    # Validate all players are coach's students and not in any team
    for player in players:
        profile = PlayerSportProfile.objects.filter(player=player, sport=sport, coach=coach, is_active=True).first()
        if not profile:
            raise TeamProposalError(f"Player {player.player_id} is not your student for {sport.name}")
        if profile.team_id is not None:
            raise TeamProposalError(f"Player {player.player_id} is already in a team for {sport.name}")
    
    proposal = TeamProposal.objects.create(
        coach=coach,
        manager=manager,
        sport=sport,
        team_name=team_name,
    )
    proposal.proposed_players.set(players)
    
    _notify(manager, "Team Proposal", f"Coach {coach.user.username} proposed team '{team_name}' for {sport.name}", ntype="team_proposal")
    return proposal


@transaction.atomic
def approve_team_proposal(proposal: TeamProposal, decided_by: User) -> Team:
    """Manager approves team proposal, creating the team. Admin can bypass."""
    if proposal.status != TeamProposal.Status.PENDING:
        raise TeamProposalError("Proposal is not pending")
    
    # Admin can bypass manager check
    if decided_by.role != User.Roles.ADMIN:
        if proposal.manager_id != decided_by.id:
            raise TeamProposalError("Only the assigned manager can approve")
    
    # Create team
    team = Team.objects.create(
        name=proposal.team_name,
        sport=proposal.sport,
        manager=proposal.manager,
        coach=proposal.coach,
    )
    
    # Assign players to team via PlayerSportProfile
    # Re-validate that players are not already in a team (in case assigned between proposal and approval)
    for player in proposal.proposed_players.all():
        profile = PlayerSportProfile.objects.get(player=player, sport=proposal.sport, coach=proposal.coach)
        
        # Double-check: player should not be in another team for this sport
        if profile.team_id is not None and profile.team_id != team.id:
            raise TeamProposalError(f"Player {player.player_id} is already in team '{profile.team.name}' for {proposal.sport.name}")
        
        # Also check for any other active profile for this player-sport with a team
        other_profile = PlayerSportProfile.objects.filter(
            player=player,
            sport=proposal.sport,
            team__isnull=False,
            is_active=True
        ).exclude(id=profile.id).first()
        
        if other_profile:
            raise TeamProposalError(f"Player {player.player_id} is already in team '{other_profile.team.name}' for {proposal.sport.name}")
        
        profile.team = team
        profile.save(update_fields=["team"])
    
    proposal.status = TeamProposal.Status.APPROVED
    proposal.decided_at = timezone.now()
    proposal.created_team = team
    proposal.save(update_fields=["status", "decided_at", "created_team"])
    
    if decided_by.role == User.Roles.ADMIN:
        _notify(proposal.coach.user, "Team Proposal Approved (Admin)", f"Admin {decided_by.username} approved your team proposal '{proposal.team_name}' - Team '{team.name}' created", ntype="team_proposal")
        _notify(proposal.manager, "Team Proposal Approved (Admin)", f"Admin {decided_by.username} approved team proposal '{proposal.team_name}' by {proposal.coach.user.username}", ntype="team_proposal")
    else:
        _notify(proposal.coach.user, "Team Proposal Approved", f"Your team proposal '{proposal.team_name}' was approved - Team '{team.name}' created", ntype="team_proposal")
    return team


@transaction.atomic
def reject_team_proposal(proposal: TeamProposal, decided_by: User, remarks: str = None) -> TeamProposal:
    """Manager rejects team proposal. Admin can bypass."""
    if proposal.status != TeamProposal.Status.PENDING:
        raise TeamProposalError("Proposal is not pending")
    
    # Admin can bypass manager check
    if decided_by.role != User.Roles.ADMIN:
        if proposal.manager_id != decided_by.id:
            raise TeamProposalError("Only the assigned manager can reject")
    
    proposal.status = TeamProposal.Status.REJECTED
    proposal.decided_at = timezone.now()
    if remarks:
        proposal.remarks = remarks
    proposal.save(update_fields=["status", "decided_at", "remarks"])
    
    if decided_by.role == User.Roles.ADMIN:
        _notify(proposal.coach.user, "Team Proposal Rejected (Admin)", remarks or f"Admin {decided_by.username} rejected your team proposal '{proposal.team_name}'", ntype="team_proposal")
    else:
        _notify(proposal.coach.user, "Team Proposal Rejected", remarks or f"Your team proposal '{proposal.team_name}' was rejected by {decided_by.username}", ntype="team_proposal")
    return proposal


# -----------------------------
# Team Assignment Services
# -----------------------------
class TeamAssignmentError(Exception):
    pass


@transaction.atomic
def create_team_assignment(manager: User, coach: Coach, team: Team, auto_accept=False) -> TeamAssignmentRequest:
    """Manager assigns coach to team (via request). Admin can auto-accept."""
    if team.manager_id != manager.id and manager.role != User.Roles.ADMIN:
        raise TeamAssignmentError("You don't own this team")
    
    if team.sport and coach.primary_sport_id != team.sport_id:
        raise TeamAssignmentError("Coach primary sport must match team sport")
    
    # If admin auto-accepts, directly assign
    if auto_accept and manager.role == User.Roles.ADMIN:
        team.coach = coach
        team.save(update_fields=["coach"])
        _notify(coach.user, "Team Assignment (Admin)", f"Admin {manager.username} assigned you to team '{team.name}'", ntype="team_assignment")
        # Create accepted request for record-keeping
        request = TeamAssignmentRequest.objects.create(
            manager=manager,
            coach=coach,
            team=team,
            status=TeamAssignmentRequest.Status.ACCEPTED,
            decided_at=timezone.now(),
        )
        return request
    
    # Check if already pending
    existing = TeamAssignmentRequest.objects.filter(coach=coach, team=team, status=TeamAssignmentRequest.Status.PENDING)
    if existing.exists():
        return existing.first()
    
    request = TeamAssignmentRequest.objects.create(
        manager=manager,
        coach=coach,
        team=team,
    )
    
    _notify(coach.user, "Team Assignment", f"You have been assigned to team '{team.name}' by {manager.username}", ntype="team_assignment")
    return request


@transaction.atomic
def accept_team_assignment(request: TeamAssignmentRequest, decided_by: User) -> Team:
    """Coach accepts team assignment. Admin can bypass."""
    if request.status != TeamAssignmentRequest.Status.PENDING:
        raise TeamAssignmentError("Assignment is not pending")
    
    # Admin can bypass acceptance check
    if decided_by.role != User.Roles.ADMIN:
        if not hasattr(decided_by, "coach") or decided_by.coach_id != request.coach_id:
            raise TeamAssignmentError("Only the assigned coach can accept")
    
    # Assign coach to team
    request.team.coach = request.coach
    request.team.save(update_fields=["coach"])
    
    request.status = TeamAssignmentRequest.Status.ACCEPTED
    request.decided_at = timezone.now()
    request.save(update_fields=["status", "decided_at"])
    
    if decided_by.role == User.Roles.ADMIN:
        _notify(request.manager, "Team Assignment Accepted (Admin)", f"Admin {decided_by.username} accepted assignment of {request.coach.user.username} to '{request.team.name}'", ntype="team_assignment")
        _notify(request.coach.user, "Team Assignment Accepted (Admin)", f"Admin {decided_by.username} accepted your assignment to '{request.team.name}'", ntype="team_assignment")
    else:
        _notify(request.manager, "Team Assignment Accepted", f"Coach {request.coach.user.username} accepted assignment to '{request.team.name}'", ntype="team_assignment")
    return request.team


@transaction.atomic
def reject_team_assignment(request: TeamAssignmentRequest, decided_by: User, remarks: str = None) -> TeamAssignmentRequest:
    """Coach rejects team assignment. Admin can bypass."""
    if request.status != TeamAssignmentRequest.Status.PENDING:
        raise TeamAssignmentError("Assignment is not pending")
    
    # Admin can bypass rejection check
    if decided_by.role != User.Roles.ADMIN:
        if not hasattr(decided_by, "coach") or decided_by.coach.id != request.coach.id:
            raise TeamAssignmentError("Only the assigned coach can reject")
    
    request.status = TeamAssignmentRequest.Status.REJECTED
    request.decided_at = timezone.now()
    if remarks:
        request.remarks = remarks
    request.save(update_fields=["status", "decided_at", "remarks"])
    
    if decided_by.role == User.Roles.ADMIN:
        _notify(request.manager, "Team Assignment Rejected (Admin)", f"Admin {decided_by.username} rejected assignment of {request.coach.user.username} to '{request.team.name}'", ntype="team_assignment")
        _notify(request.coach.user, "Team Assignment Rejected (Admin)", f"Admin {decided_by.username} rejected your assignment to '{request.team.name}'", ntype="team_assignment")
    else:
        _notify(request.manager, "Team Assignment Rejected", remarks or f"Coach {request.coach.user.username} rejected the assignment to '{request.team.name}'", ntype="team_assignment")
    return request


