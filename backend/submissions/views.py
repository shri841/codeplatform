from django.utils import timezone
from datetime import timedelta
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import BasePermission

from accounts.permissions import IsStudent
from questions.models import Question, QuestionAttempt
from .models import Submission
from .serializers import SubmissionCreateSerializer, SubmissionResultSerializer
from .code_runner import run_against_test_cases, DEFAULT_TIME_LIMIT_SECONDS


def _get_or_create_attempt(student, question):
    attempt, _ = QuestionAttempt.objects.get_or_create(student=student, question=question)
    return attempt


def _deadline_expired(attempt, question):
    if not question.duration_minutes:
        return False
    deadline = attempt.started_at + timedelta(minutes=question.duration_minutes)
    return timezone.now() > deadline


def _full_test_cases(question):
    test_cases = list(question.test_cases.all())
    if not test_cases:
        # Fall back to the sample input/output if faculty didn't add test cases
        test_cases = [{
            'input_data': question.sample_input,
            'expected_output': question.sample_output,
        }] if question.sample_output else []
    return test_cases


class SubmitCodeView(APIView):
    """
    Student submits code (written directly in the browser's code editor -
    no file upload/download involved). The code is run against the
    question's test cases and the verdict is returned immediately.
    """
    permission_classes = [IsStudent]

    def post(self, request):
        serializer = SubmissionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        question = Question.objects.get(id=serializer.validated_data['question'].id)
        code = serializer.validated_data['code']
        language = serializer.validated_data['language']
        tab_switch_count = serializer.validated_data.get('tab_switch_count', 0)

        if not question.is_active:
            return Response({'detail': 'This question has been disabled by faculty.'}, status=status.HTTP_403_FORBIDDEN)

        attempt = _get_or_create_attempt(request.user, question)
        if attempt.locked:
            return Response(
                {'detail': 'This question is locked after a tab-switch violation. You cannot submit again.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if _deadline_expired(attempt, question):
            return Response(
                {'detail': 'Time limit for this question has expired. Submission rejected.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        test_cases = _full_test_cases(question)
        time_limit = question.time_limit_seconds or DEFAULT_TIME_LIMIT_SECONDS
        verdict, detail, passed, total = run_against_test_cases(code, language, test_cases, time_limit)

        submission = Submission.objects.create(
            student=request.user,
            question=question,
            code=code,
            language=language,
            status=verdict,
            result_detail=detail,
            passed_count=passed,
            total_count=total,
            tab_switch_count=tab_switch_count,
        )
        return Response(SubmissionResultSerializer(submission).data, status=status.HTTP_201_CREATED)


class RunCodeView(APIView):
    """
    Lets a student test their code against the question's sample input/output
    (or a non-hidden test case, if no sample is set) before submitting for
    real. Nothing is saved and it does not affect submission history or the
    leaderboard - it's a quick "does this even work" check.
    """
    permission_classes = [IsStudent]

    def post(self, request):
        serializer = SubmissionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        question = Question.objects.get(id=serializer.validated_data['question'].id)
        code = serializer.validated_data['code']
        language = serializer.validated_data['language']

        if not question.is_active:
            return Response({'detail': 'This question has been disabled by faculty.'}, status=status.HTTP_403_FORBIDDEN)

        attempt = _get_or_create_attempt(request.user, question)
        if attempt.locked:
            return Response(
                {'detail': 'This question is locked after a tab-switch violation.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if _deadline_expired(attempt, question):
            return Response(
                {'detail': 'Time limit for this question has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if question.sample_output:
            test_cases = [{'input_data': question.sample_input, 'expected_output': question.sample_output}]
        else:
            visible = list(question.test_cases.filter(is_hidden=False)[:1])
            test_cases = [{'input_data': tc.input_data, 'expected_output': tc.expected_output} for tc in visible]

        if not test_cases:
            return Response({
                'status': 'Error',
                'result_detail': 'No sample test case available to run against.',
                'passed_count': 0, 'total_count': 0,
            })

        time_limit = question.time_limit_seconds or DEFAULT_TIME_LIMIT_SECONDS
        verdict, detail, passed, total = run_against_test_cases(code, language, test_cases, time_limit)
        return Response({'status': verdict, 'result_detail': detail, 'passed_count': passed, 'total_count': total})


class AutoSubmitView(APIView):
    """
    Called by the frontend the instant it detects a tab-switch, window-blur,
    or fullscreen-exit while a student is solving. Grades whatever code the
    student currently has as a real submission, then permanently locks the
    question for that student - no further Run/Submit calls will succeed.
    """
    permission_classes = [IsStudent]

    def post(self, request):
        serializer = SubmissionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        question = Question.objects.get(id=serializer.validated_data['question'].id)
        code = serializer.validated_data['code']
        language = serializer.validated_data['language']
        reason = request.data.get('reason', 'tab_switch')[:50]

        attempt = _get_or_create_attempt(request.user, question)
        if attempt.locked:
            # Already locked by an earlier violation - just report that state back.
            return Response({'detail': 'Question already locked.', 'locked': True}, status=status.HTTP_200_OK)

        test_cases = _full_test_cases(question)
        time_limit = question.time_limit_seconds or DEFAULT_TIME_LIMIT_SECONDS
        verdict, detail, passed, total = run_against_test_cases(code, language, test_cases, time_limit)

        submission = Submission.objects.create(
            student=request.user,
            question=question,
            code=code,
            language=language,
            status=verdict,
            result_detail=detail,
            passed_count=passed,
            total_count=total,
            auto_submitted=True,
            violation_reason=reason,
        )

        attempt.locked = True
        attempt.save(update_fields=['locked'])

        data = SubmissionResultSerializer(submission).data
        data['locked'] = True
        return Response(data, status=status.HTTP_201_CREATED)


class MySubmissionsView(generics.ListAPIView):
    """A student's submission history."""
    serializer_class = SubmissionResultSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        qs = Submission.objects.filter(student=self.request.user)
        question_id = self.request.query_params.get('question')
        if question_id:
            qs = qs.filter(question_id=question_id)
        return qs


class IsFacultyOrAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.role == 'admin':
            return True
        return user.role == 'faculty' and user.is_approved


class ViolationsListView(APIView):
    """
    Faculty-facing malpractice log: every submission that was auto-submitted
    due to a tab-switch/blur/fullscreen-exit, or that racked up blocked
    copy/paste attempts. Scoped to the faculty's own questions (admin sees all).
    """
    permission_classes = [IsFacultyOrAdmin]

    def get(self, request):
        from django.db.models import Q
        qs = (
            Submission.objects.filter(Q(auto_submitted=True) | Q(tab_switch_count__gt=0))
            .select_related('student', 'question')
            .order_by('-submitted_at')
        )
        if request.user.role == 'faculty':
            qs = qs.filter(question__created_by=request.user)

        rows = []
        attempt_cache = {}
        for s in qs:
            key = (s.student_id, s.question_id)
            if key not in attempt_cache:
                attempt = QuestionAttempt.objects.filter(student_id=s.student_id, question_id=s.question_id).first()
                attempt_cache[key] = bool(attempt and attempt.locked)

            rows.append({
                'submission_id': s.id,
                'student': s.student.username,
                'roll_number': s.student.roll_number,
                'student_id': s.student_id,
                'question': s.question.title,
                'question_id': s.question_id,
                'violation_type': s.violation_reason if s.auto_submitted else 'copy_paste_attempts',
                'tab_switch_count': s.tab_switch_count,
                'auto_submitted': s.auto_submitted,
                'submitted_at': s.submitted_at,
                'locked': attempt_cache[key],
            })

        return Response(rows)


class UnlockAttemptView(APIView):
    """Lets faculty allow one specific student to reattempt one specific question."""
    permission_classes = [IsFacultyOrAdmin]

    def post(self, request):
        student_id = request.data.get('student')
        question_id = request.data.get('question')

        question_qs = Question.objects.all()
        if request.user.role == 'faculty':
            question_qs = question_qs.filter(created_by=request.user)
        if not question_qs.filter(id=question_id).exists():
            return Response({'detail': 'Question not found.'}, status=status.HTTP_404_NOT_FOUND)

        attempt = QuestionAttempt.objects.filter(student_id=student_id, question_id=question_id).first()
        if not attempt:
            return Response({'detail': 'No attempt found for this student/question.'}, status=status.HTTP_404_NOT_FOUND)

        attempt.locked = False
        attempt.started_at = timezone.now()
        attempt.save(update_fields=['locked', 'started_at'])
        return Response({'detail': 'Student can now reattempt this question.'})


class LeaderboardView(APIView):
    """
    Two scopes, selected via ?question=<id>:
      - overall (no question param): ranks students by number of distinct
        questions Accepted, tie-broken by who reached that solve count
        earliest.
      - per-question (question=<id>): ranks students by who solved that
        specific question first.
    """
    permission_classes = [IsFacultyOrAdmin]

    def get(self, request):
        question_id = request.query_params.get('question')

        if question_id:
            return self._question_leaderboard(question_id)
        return self._overall_leaderboard()

    def _question_leaderboard(self, question_id):
        accepted = (
            Submission.objects.filter(status='Accepted', question_id=question_id)
            .select_related('student')
            .order_by('submitted_at')
        )

        first_solve = {}  # student_id -> {'username', 'roll_number', 'solved_at'}
        for s in accepted:
            if s.student_id not in first_solve:
                first_solve[s.student_id] = {
                    'username': s.student.username,
                    'roll_number': s.student.roll_number,
                    'solved_at': s.submitted_at,
                }

        rows = [
            {'student': v['username'], 'roll_number': v['roll_number'], 'solved_at': v['solved_at']}
            for v in first_solve.values()
        ]
        rows.sort(key=lambda r: r['solved_at'])
        for i, row in enumerate(rows, start=1):
            row['rank'] = i

        return Response({'scope': 'question', 'question_id': int(question_id), 'rows': rows})

    def _overall_leaderboard(self):
        accepted = (
            Submission.objects.filter(status='Accepted')
            .select_related('student')
            .order_by('submitted_at')
        )

        first_solve_time = {}  # (student_id, question_id) -> earliest accepted submitted_at
        student_info = {}
        for s in accepted:
            key = (s.student_id, s.question_id)
            if key not in first_solve_time:
                first_solve_time[key] = s.submitted_at
            student_info[s.student_id] = (s.student.username, s.student.roll_number)

        per_student = {}
        for (student_id, _question_id), solved_at in first_solve_time.items():
            entry = per_student.setdefault(student_id, {'solved_count': 0, 'last_solved_at': solved_at})
            entry['solved_count'] += 1
            if solved_at > entry['last_solved_at']:
                entry['last_solved_at'] = solved_at

        rows = [
            {
                'student': student_info[student_id][0],
                'roll_number': student_info[student_id][1],
                'solved_count': data['solved_count'],
                'last_solved_at': data['last_solved_at'],
            }
            for student_id, data in per_student.items()
        ]
        rows.sort(key=lambda r: (-r['solved_count'], r['last_solved_at']))
        for i, row in enumerate(rows, start=1):
            row['rank'] = i

        return Response({'scope': 'overall', 'rows': rows})
