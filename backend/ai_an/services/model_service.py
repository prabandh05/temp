# ai_an/services/model_service.py
import os
import joblib
from django.conf import settings
from threading import Lock

MODEL_DIR = os.path.join(settings.BASE_DIR, "ai_module", "models")
MODEL_NAME = "player_start_model.joblib"   # change if different
_MODEL = None
_LOCK = Lock()

def load_model():
    global _MODEL
    if _MODEL is None:
        with _LOCK:
            if _MODEL is None:
                path = os.path.join(MODEL_DIR, MODEL_NAME)
                if not os.path.exists(path):
                    raise FileNotFoundError(f"Model artifact not found: {path}")
                _MODEL = joblib.load(path)
    return _MODEL

def predict_player_start_from_features(features: dict):
    model = load_model()
    import pandas as pd
    X = pd.DataFrame([features])
    # adapt if your model expects specific columns/order
    proba = None
    if hasattr(model, "predict_proba"):
        proba = float(model.predict_proba(X)[:, 1][0])
    else:
        # fallback to predict (0/1)
        pred = model.predict(X)[0]
        proba = float(pred)
    return proba
