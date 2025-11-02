from django.urls import path
from .views import predict_player_start, player_insight

urlpatterns = [
    path("predict/player-start/", predict_player_start, name="ai_predict_player_start"),
    path("insights/player/", player_insight, name="ai_player_insight"),
]
