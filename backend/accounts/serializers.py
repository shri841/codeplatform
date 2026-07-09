from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import AuthenticationFailed

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'role', 'is_approved', 'department', 'roll_number', 'created_at']


class StudentSignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'roll_number']
        extra_kwargs = {'roll_number': {'required': True, 'allow_blank': False}}

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(role='student', is_approved=True, **validated_data)
        user.set_password(password)
        user.save()
        return user


class FacultySignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'department']

    def create(self, validated_data):
        password = validated_data.pop('password')
        # Faculty accounts are inactive (unapproved) until an admin approves them.
        user = User(role='faculty', is_approved=False, **validated_data)
        user.set_password(password)
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default JWT login to:
      - reject faculty accounts that have not yet been approved by an admin
      - include role/approval info in the returned token payload/response
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['username'] = user.username
        token['is_approved'] = user.is_approved
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user

        if user.role == 'faculty' and not user.is_approved:
            raise AuthenticationFailed(
                'Your faculty account is pending admin approval. Please try again later.'
            )

        data['role'] = user.role
        data['username'] = user.username
        data['is_approved'] = user.is_approved
        data['user_id'] = user.id
        return data
