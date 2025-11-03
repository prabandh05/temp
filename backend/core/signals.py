# core/signals.py
from django.db.models.signals import post_save, pre_save   # ✅ include pre_save here
from django.dispatch import receiver
from django.db import transaction
from django.db.models import Max
import datetime

from .models import User, Player ,PlayerSportProfile, CricketStats


def _next_player_id():
    """Generate next player id like P25xxxxx."""
    yy = str(datetime.date.today().year)[-2:]
    prefix = f"P{yy}"
    result = Player.objects.filter(player_id__startswith=prefix).aggregate(max_id=Max("player_id"))
    max_id = result.get("max_id")

    if max_id:
        try:
            last_num = int(max_id[-5:])
        except Exception:
            last_num = Player.objects.filter(player_id__startswith=prefix).count()
    else:
        last_num = 0

    next_num = last_num + 1
    return f"{prefix}{next_num:05d}"



@receiver(post_save, sender=User)
def create_or_update_player(sender, instance, created, **kwargs):
    if instance.role != User.Roles.PLAYER:
        return

    # If newly created or role changed to player
    role_changed = hasattr(instance, "_old_role") and instance._old_role != User.Roles.PLAYER

    if created or role_changed:
        with transaction.atomic():
            # Create only if not already existing
            if not hasattr(instance, "player"):
                pid = _next_player_id()
                Player.objects.create(user=instance, player_id=pid)
                print(f"✅ Auto-created player for {instance.username} with ID {pid}")
            elif not instance.player.player_id:
                instance.player.player_id = _next_player_id()
                instance.player.save()
                print(f"🛠️ Added missing player_id for {instance.username}")
                
                
                
@receiver(pre_save, sender=User)
def store_old_role(sender, instance, **kwargs):
    if not instance.pk:
        instance._old_role = None
    else:
        try:
            instance._old_role = User.objects.get(pk=instance.pk).role
        except User.DoesNotExist:
            instance._old_role = None


#-----------------------------
# Sport Profile Signals
#-----------------------------

#cricket profile creation
@receiver(post_save, sender=Player)
def create_default_sport_profile(sender, instance, created, **kwargs):
    """
    Automatically create a default 'Cricket' sport profile and its stats
    whenever a new Player is created.
    """
    if not created:
        return

    with transaction.atomic():
        # Check if player already has a cricket profile
        if not PlayerSportProfile.objects.filter(player=instance, sport_name="Cricket").exists():
            profile = PlayerSportProfile.objects.create(
                player=instance,
                sport_name="Cricket",
                is_active=True,
                career_score=0.0,
            )

            # Initialize empty cricket stats for this profile
            CricketStats.objects.create(profile=profile)
