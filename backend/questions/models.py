from django.conf import settings
from django.db import models


class Question(models.Model):
    DIFFICULTY_CHOICES = (
        ('Easy', 'Easy'),
        ('Medium', 'Medium'),
        ('Hard', 'Hard'),
    )

    title = models.CharField(max_length=200)
    description = models.TextField()
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='Easy')
    sample_input = models.TextField(blank=True, default='')
    sample_output = models.TextField(blank=True, default='')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='questions')
    created_at = models.DateTimeField(auto_now_add=True)

    # Per-question execution timeout for each test case run (seconds).
    time_limit_seconds = models.PositiveIntegerField(default=5)
    # Minutes a student has to submit once they open the question. 0 = no limit.
    duration_minutes = models.PositiveIntegerField(default=0)
    # Faculty can disable a question to hide it from students without deleting it.
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title


class QuestionAttempt(models.Model):
    """Records when a student first opened a question, to enforce duration_minutes."""
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='question_attempts')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='attempts')
    started_at = models.DateTimeField(auto_now_add=True)
    # Set True after a tab-switch/fullscreen-exit auto-submits the student's
    # code. Once locked, the student cannot Run or Submit for this question again.
    locked = models.BooleanField(default=False)

    class Meta:
        unique_together = ('student', 'question')

    def __str__(self):
        return f"{self.student.username} started {self.question.title} at {self.started_at}"


class TestCase(models.Model):
    question = models.ForeignKey(Question, related_name='test_cases', on_delete=models.CASCADE)
    input_data = models.TextField(blank=True, default='')
    expected_output = models.TextField()
    is_hidden = models.BooleanField(default=False)

    def __str__(self):
        return f"TestCase for {self.question.title}"
