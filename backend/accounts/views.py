from django.contrib.auth import get_user_model
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    StudentSignupSerializer, FacultySignupSerializer,
    UserSerializer, CustomTokenObtainPairSerializer,
)
from .permissions import IsAdmin

User = get_user_model()


class StudentSignupView(generics.CreateAPIView):
    """Students sign up directly and can log in immediately."""
    queryset = User.objects.all()
    serializer_class = StudentSignupSerializer
    permission_classes = [permissions.AllowAny]


class FacultySignupView(generics.CreateAPIView):
    """
    Faculty sign up but the account stays inactive/unapproved
    until an admin approves it.
    """
    queryset = User.objects.all()
    serializer_class = FacultySignupSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        response.data = {
            'detail': 'Signup successful. Your account is pending admin approval.',
            'user': response.data,
        }
        return response


class CustomTokenObtainPairView(TokenObtainPairView):
    """Single login endpoint used by admin, faculty and student login pages."""
    serializer_class = CustomTokenObtainPairSerializer


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


# ---------------------------------------------------------------------------
# Admin-only management endpoints
# ---------------------------------------------------------------------------

class PendingFacultyListView(generics.ListAPIView):
    """List faculty accounts awaiting approval."""
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return User.objects.filter(role='faculty', is_approved=False).order_by('-created_at')


class FacultyListView(generics.ListAPIView):
    """List all approved faculty."""
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return User.objects.filter(role='faculty', is_approved=True).order_by('-created_at')


class StudentListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return User.objects.filter(role='student').order_by('-created_at')


class ApproveFacultyView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id, role='faculty')
        except User.DoesNotExist:
            return Response({'detail': 'Faculty not found.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action', 'approve')
        if action == 'approve':
            user.is_approved = True
            user.save()
            return Response({'detail': f'{user.username} approved.'})
        elif action == 'reject':
            user.delete()
            return Response({'detail': 'Faculty request rejected and removed.'})
        return Response({'detail': 'Invalid action.'}, status=status.HTTP_400_BAD_REQUEST)


class DeleteUserView(APIView):
    permission_classes = [IsAdmin]

    def delete(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        if user.role == 'admin':
            return Response({'detail': 'Cannot delete an admin account.'}, status=status.HTTP_400_BAD_REQUEST)
        user.delete()
        return Response({'detail': 'User deleted.'})
