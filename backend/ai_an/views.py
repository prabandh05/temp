from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework import status
from .services.model_service import predict_player_start_from_features
from .services.gemini_client import gemini_summarize_player
from core.models import Player

@api_view(["POST"])
@permission_classes([IsAuthenticatedOrReadOnly])
def predict_player_start(request):
    """
    POST JSON body: features dict (must match training features).
    Example:
    {
      "goals_last_10": 2,
      "assists_last_10": 1,
      "minutes_last_10": 600,
      "rating": 7.2
    }
    """
    features = request.data
    try:
        proba = predict_player_start_from_features(features)
        return Response({"probability_of_start": proba})
    except FileNotFoundError as e:
        return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAuthenticatedOrReadOnly])
def player_insight(request):
    """
    POST body: { "player_id": <id>, "context": "optional extra instructions" }
    Returns a Gemini-generated insight summary for the player.
    """
    player_id = request.data.get("player_id")
    context = request.data.get("context", "")
    if not player_id:
        return Response({"error": "player_id required"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        player = Player.objects.get(pk=player_id)
    except Player.DoesNotExist:
        return Response({"error": "Player not found"}, status=status.HTTP_404_NOT_FOUND)

    # Build a prompt from player's recent stats (adjust to your model fields)
    recent = []
    # Example: gather last 10 matches if relations exist
    try:
        matches = player.match_set.order_by("-date")[:10]
    except Exception:
        matches = []

    total_goals = sum(getattr(m, "goals", 0) for m in matches)
    total_assists = sum(getattr(m, "assists", 0) for m in matches)
    minutes = sum(getattr(m, "minutes_played", 0) for m in matches)

    prompt = f"""
    You are an expert sports analyst. Provide a concise insight for player {player} (id {player.id}).
    Recent stats:
    - Goals (last up to 10 matches): {total_goals}
    - Assists: {total_assists}
    - Minutes: {minutes}
    Player meta: rating={getattr(player, 'rating', 'N/A')}, team={getattr(player.team, 'name', 'N/A')}
    {context}
    Provide: short summary, 3 training recommendations, and one short prediction for next match.
    """

    answer = gemini_summarize_player(prompt)
    return Response({"insight": answer})
