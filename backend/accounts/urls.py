from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Auth
    path('login/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', views.MeView.as_view(), name='me'),

    # Signup
    path('signup/student/', views.StudentSignupView.as_view(), name='student_signup'),
    path('signup/faculty/', views.FacultySignupView.as_view(), name='faculty_signup'),

    # Admin management
    path('admin/faculty/pending/', views.PendingFacultyListView.as_view(), name='pending_faculty'),
    path('admin/faculty/', views.FacultyListView.as_view(), name='faculty_list'),
    path('admin/students/', views.StudentListView.as_view(), name='student_list'),
    path('admin/faculty/<int:user_id>/approve/', views.ApproveFacultyView.as_view(), name='approve_faculty'),
    path('admin/users/<int:user_id>/delete/', views.DeleteUserView.as_view(), name='delete_user'),
]
