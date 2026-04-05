from rest_framework import serializers
from django.contrib.auth import get_user_model
from dj_rest_auth.serializers import UserDetailsSerializer

User = get_user_model()

class SpoonfuryUserSerializer(UserDetailsSerializer):
    """Extends the default dj-rest-auth user serializer for authentication details."""

    class Meta(UserDetailsSerializer.Meta):
        fields = ("pk", "username", "email", "first_name", "last_name", "display_name", "bio", "avatar", "is_staff")
        read_only_fields = ("pk", "username", "is_staff")

class PublicProfileSerializer(serializers.ModelSerializer):
    """Publicly visible user profile information."""
    class Meta:
        model = User
        fields = ("username", "display_name", "bio", "avatar", "date_joined")
        read_only_fields = fields
