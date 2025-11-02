# ai_an/services/gemini_client.py
import google.generativeai as genai
from decouple import config

# Lazy initialization - don't raise error at import time
_gemini_configured = False

def _configure_gemini():
    """Configure Gemini API if not already configured."""
    global _gemini_configured
    if _gemini_configured:
        return
    
    GEMINI_API_KEY = config("GEMINI_API_KEY", default=None)
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not set in environment")
    genai.configure(api_key=GEMINI_API_KEY)
    _gemini_configured = True

def gemini_summarize_player(prompt_text: str, model_name: str = "gemini-1.5-flash", max_output_tokens: int = 512):
    """Generate AI summary using Gemini API."""
    _configure_gemini()  # Configure on first use, not at import
    model = genai.GenerativeModel(model_name)
    resp = model.generate_content(prompt_text, max_output_tokens=max_output_tokens)
    # response form may vary; adapt if needed
    return getattr(resp, "text", str(resp))
