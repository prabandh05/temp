#!/usr/bin/env python
"""
Initialize sports data in the database
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'yultimate_project.settings')
django.setup()

from core.models import Sport

def init_sports():
    """Initialize the four sports in the database"""
    sports_data = [
        ("Cricket", "team"),
        ("Football", "team"),
        ("Basketball", "team"),
        ("Running", "individual"),
    ]
    
    created_count = 0
    for name, sport_type in sports_data:
        sport, created = Sport.objects.get_or_create(
            name=name,
            defaults={'sport_type': sport_type}
        )
        if created:
            print(f"✅ Created sport: {name} ({sport_type})")
            created_count += 1
        else:
            print(f"ℹ️  Sport already exists: {name}")
    
    print(f"\n🎉 Initialization complete! {created_count} new sports added.")
    print(f"📊 Total sports in database: {Sport.objects.count()}")

if __name__ == '__main__':
    init_sports()

