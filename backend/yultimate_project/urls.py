from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def home(request):
    return JsonResponse({
        'message': 'Welcome to Social Sports API',
        'endpoints': {
            'admin': '/admin/',
            'api': '/api/',
            'teams': '/api/teams/',
            'players': '/api/players/',
            'matches': '/api/matches/',
            'attendance': '/api/attendance/',
            'leaderboard': '/api/leaderboard/',
        }
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('', home),
    path("api/ai_an/", include("ai_an.urls")),
]
