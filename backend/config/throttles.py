from rest_framework.throttling import AnonRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """Stricter throttle applied to authentication endpoints (login/register)."""
    scope = "auth"
