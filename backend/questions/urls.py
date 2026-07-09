from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import FacultyQuestionViewSet, StudentQuestionListView, StudentQuestionDetailView

router = DefaultRouter()
router.register('faculty', FacultyQuestionViewSet, basename='faculty-questions')

urlpatterns = [
    path('student/', StudentQuestionListView.as_view(), name='student_questions'),
    path('student/<int:pk>/', StudentQuestionDetailView.as_view(), name='student_question_detail'),
] + router.urls
