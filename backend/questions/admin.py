from django.contrib import admin
from .models import Question, TestCase


class TestCaseInline(admin.TabularInline):
    model = TestCase
    extra = 1


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('title', 'difficulty', 'created_by', 'created_at')
    inlines = [TestCaseInline]
