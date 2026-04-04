from dj_rest_auth.serializers import UserDetailsSerializer


class SpoonfuryUserSerializer(UserDetailsSerializer):
    """Extends the default dj-rest-auth user serializer to expose is_staff."""

    class Meta(UserDetailsSerializer.Meta):
        fields = UserDetailsSerializer.Meta.fields + ("is_staff",)
        read_only_fields = UserDetailsSerializer.Meta.read_only_fields + ("is_staff",)
