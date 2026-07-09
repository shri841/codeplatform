from django.conf import settings
from django.db import models
from questions.models import Question


class Submission(models.Model):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Accepted', 'Accepted'),
        ('Wrong Answer', 'Wrong Answer'),
        ('Error', 'Error'),
    )
    LANGUAGE_CHOICES = (
        ('python', 'Python 3'),
        ('cpp', 'C++'),
    )

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='submissions')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='submissions')
    code = models.TextField()
    language = models.CharField(max_length=20, choices=LANGUAGE_CHOICES, default='python')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    result_detail = models.TextField(blank=True, default='')
    passed_count = models.IntegerField(default=0)
    total_count = models.IntegerField(default=0)
    submitted_at = models.DateTimeField(auto_now_add=True)
    # Count of tab-switch/window-blur events the frontend detected while the
    # student was solving this question, reported alongside the submission.
    tab_switch_count = models.PositiveIntegerField(default=0)
    # True if this submission was created automatically because the student
    # switched tabs / left fullscreen, rather than clicking Submit themselves.
    auto_submitted = models.BooleanField(default=False)
    violation_reason = models.CharField(max_length=50, blank=True, default='')

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f"{self.student.username} - {self.question.title} - {self.status}"
