from dj_rest_auth.serializers import UserDetailsSerializer


class SpoonfuryUserSerializer(UserDetailsSerializer):
    """Extends the default dj-rest-auth user serializer to expose is_staff."""

    class Meta(UserDetailsSerializer.Meta):
        existing_fields = getattr(UserDetailsSerializer.Meta, "fields", ("pk", "username", "email", "first_name", "last_name"))
        existing_readonly = getattr(UserDetailsSerializer.Meta, "read_only_fields", ("pk",))
        fields = tuple(existing_fields) + ("is_staff",)
        read_only_fields = tuple(existing_readonly) + ("is_staff",)
