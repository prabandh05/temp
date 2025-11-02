# ai_module/services/gemini_client.py
import os
import requests
from django.conf import settings

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or getattr(settings, "GEMINI_API_KEY", None)

def gemini_summarize_player(prompt: str) -> str:
    """
    Simple wrapper for Gemini text generation.
    Replace with your actual Gemini API call format.
    """
    if not GEMINI_API_KEY:
        # graceful fallback
        return "Gemini key not set. Install it in .env as GEMINI_API_KEY."
    # Example pseudo-call — replace with correct Gemini endpoint and parameters:
    url = "https://api.generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generate"
    headers = {"Authorization": f"Bearer {GEMINI_API_KEY}"}
    payload = {
        "prompt": prompt,
        "maxOutputTokens": 250,
        "temperature": 0.2,
    }
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=15)
        r.raise_for_status()
        data = r.json()
        # adjust parsing to actual response structure
        return data.get("candidates", [{}])[0].get("content", "No content")
    except Exception as e:
        return f"Gemini call failed: {e}"
