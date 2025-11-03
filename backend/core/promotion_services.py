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
    if link.status != CoachPlayerLinkRequest.Status.PENDING:
        raise LinkError("Link request is not pending")
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


