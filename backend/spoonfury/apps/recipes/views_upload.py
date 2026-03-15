import uuid
from pathlib import Path
from django.conf import settings
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status


@api_view(["POST"])
@parser_classes([MultiPartParser])
@permission_classes([IsAuthenticated])
def upload_recipe_image(request):
    file = request.FILES.get("image")
    if not file:
        return Response({"error": "No image provided."}, status=status.HTTP_400_BAD_REQUEST)

    ext = Path(file.name).suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        return Response({"error": "Unsupported file type."}, status=status.HTTP_400_BAD_REQUEST)

    filename = f"recipes/{uuid.uuid4().hex}{ext}"
    dest = settings.MEDIA_ROOT / filename
    dest.parent.mkdir(parents=True, exist_ok=True)

    with open(dest, "wb") as f:
        for chunk in file.chunks():
            f.write(chunk)

    url = request.build_absolute_uri(f"{settings.MEDIA_URL}{filename}")
    return Response({"url": url})
