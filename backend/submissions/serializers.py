from rest_framework import serializers
from .models import Submission


class SubmissionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Submission
        fields = ['id', 'question', 'code', 'language', 'tab_switch_count']
        extra_kwargs = {'tab_switch_count': {'required': False}}


class SubmissionResultSerializer(serializers.ModelSerializer):
    question_title = serializers.CharField(source='question.title', read_only=True)

    class Meta:
        model = Submission
        fields = ['id', 'question', 'question_title', 'code', 'language', 'status',
                  'result_detail', 'passed_count', 'total_count', 'submitted_at',
                  'tab_switch_count', 'auto_submitted', 'violation_reason']
