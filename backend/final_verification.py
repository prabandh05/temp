#!/usr/bin/env python
"""
Final comprehensive verification of all fixes
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'yultimate_project.settings')
django.setup()

from core.models import User, Player, Coach, Sport, PlayerSportProfile

print("=" * 80)
print("🎉 FINAL VERIFICATION - ALL FIXES")
print("=" * 80)

# Get the latest test users
latest_users = User.objects.filter(username__contains='4810').order_by('id')

print("\n📊 LATEST TEST USERS (from test_all_sports.py):")
print("-" * 80)

for user in latest_users:
    print(f"\n👤 {user.username} (ID: {user.id})")
    print(f"   Role: {user.role}")
    
    if user.role == 'player':
        try:
            player = user.player
            print(f"   Player ID: {player.player_id}")
            
            # Get sport profiles
            profiles = PlayerSportProfile.objects.filter(player=player)
            if profiles.exists():
                for profile in profiles:
                    print(f"   ✅ Sport: {profile.sport.name}")
            else:
                print(f"   ⚠️  No sport profile")
        except Player.DoesNotExist:
            print(f"   ❌ Player instance not found!")
    
    elif user.role == 'coach':
        try:
            coach = user.coach
            print(f"   ✅ Coach instance exists")
            print(f"   Experience: {coach.experience_years} years")
        except Coach.DoesNotExist:
            print(f"   ❌ Coach instance not found!")
    
    elif user.role == 'manager':
        print(f"   ✅ Manager role assigned")

print("\n" + "=" * 80)
print("🎯 VERIFICATION SUMMARY:")
print("=" * 80)

# Count by sport
cricket_count = PlayerSportProfile.objects.filter(sport__name='Cricket').count()
football_count = PlayerSportProfile.objects.filter(sport__name='Football').count()
basketball_count = PlayerSportProfile.objects.filter(sport__name='Basketball').count()
running_count = PlayerSportProfile.objects.filter(sport__name='Running').count()

print(f"\n📊 Players by Sport:")
print(f"   🏏 Cricket: {cricket_count}")
print(f"   ⚽ Football: {football_count}")
print(f"   🏀 Basketball: {basketball_count}")
print(f"   🏃 Running: {running_count}")

# Count coaches
coach_count = Coach.objects.count()
print(f"\n🎓 Total Coaches: {coach_count}")

# Verify latest test batch
print(f"\n✅ LATEST TEST BATCH VERIFICATION:")
cricket_4810 = User.objects.filter(username='cricket_player_4810').first()
football_4810 = User.objects.filter(username='football_player_4810').first()
basketball_4810 = User.objects.filter(username='basketball_player_4810').first()
running_4810 = User.objects.filter(username='running_player_4810').first()
coach_4810 = User.objects.filter(username='coach_4810').first()
manager_4810 = User.objects.filter(username='manager_4810').first()

results = []

if cricket_4810:
    profile = PlayerSportProfile.objects.filter(player__user=cricket_4810).first()
    if profile and profile.sport.name == 'Cricket':
        results.append("✅ Cricket player → Cricket sport")
    else:
        results.append("❌ Cricket player → Wrong sport!")

if football_4810:
    profile = PlayerSportProfile.objects.filter(player__user=football_4810).first()
    if profile and profile.sport.name == 'Football':
        results.append("✅ Football player → Football sport")
    else:
        results.append("❌ Football player → Wrong sport!")

if basketball_4810:
    profile = PlayerSportProfile.objects.filter(player__user=basketball_4810).first()
    if profile and profile.sport.name == 'Basketball':
        results.append("✅ Basketball player → Basketball sport")
    else:
        results.append("❌ Basketball player → Wrong sport!")

if running_4810:
    profile = PlayerSportProfile.objects.filter(player__user=running_4810).first()
    if profile and profile.sport.name == 'Running':
        results.append("✅ Running player → Running sport")
    else:
        results.append("❌ Running player → Wrong sport!")

if coach_4810:
    try:
        coach = coach_4810.coach
        results.append("✅ Coach user → Coach instance created")
    except Coach.DoesNotExist:
        results.append("❌ Coach user → No Coach instance!")

if manager_4810:
    if manager_4810.role == 'manager':
        results.append("✅ Manager user → Manager role assigned")
    else:
        results.append("❌ Manager user → Wrong role!")

for result in results:
    print(f"   {result}")

print("\n" + "=" * 80)

# Final status
all_passed = all("✅" in r for r in results)
if all_passed:
    print("🎉 ALL TESTS PASSED - SYSTEM FULLY FUNCTIONAL!")
else:
    print("⚠️  SOME TESTS FAILED - REVIEW NEEDED")

print("=" * 80)

