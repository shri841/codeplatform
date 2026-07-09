from rest_framework import viewsets, generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from accounts.permissions import IsApprovedFaculty, IsStudent
from .models import Question, QuestionAttempt
from .serializers import QuestionSerializer, QuestionForStudentSerializer


class FacultyQuestionViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for faculty to add/edit/delete their own coding questions
    (with test cases) that will appear on the student dashboard.
    """
    serializer_class = QuestionSerializer
    permission_classes = [IsApprovedFaculty]

    def get_queryset(self):
        return Question.objects.filter(created_by=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.created_by != self.request.user:
            raise PermissionDenied("You can only edit your own questions.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.created_by != self.request.user:
            raise PermissionDenied("You can only delete your own questions.")
        instance.delete()


class StudentQuestionListView(generics.ListAPIView):
    """All questions available for students to solve."""
    serializer_class = QuestionForStudentSerializer
    permission_classes = [IsStudent]
    queryset = Question.objects.filter(is_active=True).order_by('-created_at')

    def get_serializer_context(self):
        from submissions.models import Submission
        context = super().get_serializer_context()
        context['solved_ids'] = set(
            Submission.objects.filter(student=self.request.user, status='Accepted')
            .values_list('question_id', flat=True)
        )
        # Read-only lookup - does NOT create QuestionAttempt rows, so browsing
        # the list doesn't prematurely start the clock on questions a student
        # hasn't opened yet.
        context['locked_ids'] = set(
            QuestionAttempt.objects.filter(student=self.request.user, locked=True)
            .values_list('question_id', flat=True)
        )
        return context


class StudentQuestionDetailView(generics.RetrieveAPIView):
    serializer_class = QuestionForStudentSerializer
    permission_classes = [IsStudent]
    queryset = Question.objects.filter(is_active=True)

    def retrieve(self, request, *args, **kwargs):
        question = self.get_object()
        attempt, _ = QuestionAttempt.objects.get_or_create(student=request.user, question=question)
        question.started_at = attempt.started_at
        question.locked = attempt.locked
        serializer = self.get_serializer(question)
        return Response(serializer.data)
