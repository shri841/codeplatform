from django.urls import path
from .views import (
    SubmitCodeView, MySubmissionsView, LeaderboardView, RunCodeView, AutoSubmitView,
    ViolationsListView, UnlockAttemptView,
)

urlpatterns = [
    path('submit/', SubmitCodeView.as_view(), name='submit_code'),
    path('run/', RunCodeView.as_view(), name='run_code'),
    path('auto-submit/', AutoSubmitView.as_view(), name='auto_submit_code'),
    path('mine/', MySubmissionsView.as_view(), name='my_submissions'),
    path('leaderboard/', LeaderboardView.as_view(), name='leaderboard'),
    path('violations/', ViolationsListView.as_view(), name='violations'),
    path('violations/unlock/', UnlockAttemptView.as_view(), name='unlock_attempt'),
]
