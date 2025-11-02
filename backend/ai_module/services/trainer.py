# ai_module/services/trainer.py
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from django.conf import settings
from core.models import Player, Match, Attendance  # adjust import paths

MODEL_DIR = os.path.join(settings.BASE_DIR, "ai_module", "models")
os.makedirs(MODEL_DIR, exist_ok=True)

def build_feature_dataframe():
    """
    Query existing tables and return a pandas DataFrame suitable for training.
    This version creates synthetic 'target' labels so the model can train.
    """
    players = Player.objects.all().select_related('team')
    records = []
    for p in players:
        recent_matches = getattr(p, 'match_set', []).order_by('-date')[:10] if hasattr(p, 'match_set') else []
        goals = sum(getattr(m, 'goals', 0) for m in recent_matches)
        assists = sum(getattr(m, 'assists', 0) for m in recent_matches)
        minutes = sum(getattr(m, 'minutes_played', 0) for m in recent_matches)
        rating = getattr(p, 'rating', None) or 0
        records.append({
            'player_id': p.id,
            'team_id': p.team.id if getattr(p, 'team', None) else None,
            'goals_last_10': goals,
            'assists_last_10': assists,
            'minutes_last_10': minutes,
            'rating': rating,
        })

    df = pd.DataFrame(records)

    # ✅ Ensure we have synthetic target labels
    if not df.empty:
        import numpy as np
        df['target'] = np.random.randint(0, 2, size=len(df))
    else:
        print("⚠️ No players found — please add sample Player records in admin panel.")

    return df



def train_player_model(save_name="player_start_model.joblib"):
    df = build_feature_dataframe()
    # You'll need a target column; this example assumes 'target' exists
    if 'target' not in df.columns or df.shape[0] < 10:
        raise ValueError("Not enough labeled data or 'target' column missing.")
    X = df.drop(columns=['player_id', 'target'])
    y = df['target']
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)
    path = os.path.join(MODEL_DIR, save_name)
    joblib.dump(model, path)
    return path

def predict_player_start(features_dict, model_name="player_start_model.joblib"):
    path = os.path.join(MODEL_DIR, model_name)
    if not os.path.exists(path):
        raise FileNotFoundError("Model not found. Train the model first.")
    model = joblib.load(path)
    # features_dict must align with X columns when training
    X = pd.DataFrame([features_dict])
    preds = model.predict_proba(X)[:, 1]  # probability of class 1
    return float(preds[0])
