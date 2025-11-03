from rest_framework.permissions import BasePermission


class IsAuthenticatedAndPlayer(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and getattr(request.user, "role", None) == "player")


class IsAuthenticatedAndManagerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role = getattr(request.user, "role", None)
        return role in {"manager", "admin"}


class IsAuthenticatedAndCoach(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and getattr(request.user, "role", None) == "coach")


