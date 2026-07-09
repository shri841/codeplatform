from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('faculty', 'Faculty'),
        ('student', 'Student'),
    )

    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='student')

    # Faculty accounts require admin approval before they can log in.
    # Students and admins are approved automatically.
    is_approved = models.BooleanField(default=True)

    department = models.CharField(max_length=100, blank=True, null=True)
    roll_number = models.CharField(max_length=50, blank=True, null=True, unique=True)  # unique per student
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Any Django superuser (created via `createsuperuser`) is automatically
        # treated as an Admin on this platform.
        if self.is_superuser:
            self.role = 'admin'
            self.is_approved = True
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.role})"
