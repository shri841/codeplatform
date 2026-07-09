from django.contrib import admin
from .models import Submission

@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ('student', 'question', 'language', 'status', 'passed_count', 'total_count', 'submitted_at')
    list_filter = ('status', 'language')
