from django.core.management.base import BaseCommand
from ai_module.services.trainer import train_player_model

class Command(BaseCommand):
    help = "Train AI models for Social Sports"

    def handle(self, *args, **options):
        self.stdout.write("Starting training...")
        try:
            path = train_player_model()
            self.stdout.write(self.style.SUCCESS(f"Trained and saved model to {path}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(str(e)))
