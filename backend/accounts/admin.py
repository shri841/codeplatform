from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'is_approved', 'is_staff')
    fieldsets = UserAdmin.fieldsets + (
        ('Platform Info', {'fields': ('role', 'is_approved', 'department', 'roll_number')}),
    )


admin.site.register(User, CustomUserAdmin)
