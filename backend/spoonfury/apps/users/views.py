from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .serializers import PublicProfileSerializer, SpoonfuryUserSerializer

User = get_user_model()

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Publicly accessible user profiles.
    """
    queryset = User.objects.all()
    serializer_class = PublicProfileSerializer
    lookup_field = "username"

    @action(detail=False, methods=["get", "patch"], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """
        Get or update current user's full profile.
        """
        if request.method == "PATCH":
            serializer = SpoonfuryUserSerializer(request.user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = SpoonfuryUserSerializer(request.user)
        return Response(serializer.data)
