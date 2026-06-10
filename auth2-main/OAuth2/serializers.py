from rest_framework import serializers
from django.contrib.auth import authenticate

from .models import AppUser


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    email = serializers.EmailField()

    class Meta:
        model = AppUser
        fields = ["nombres", "apellidos", "email", "password"]

    def validate_email(self, value):
        if AppUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este mail ya existe")
        return value

    def create(self, validated_data):
        return AppUser.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        try:
            user = AppUser.objects.get(email=email)
        except AppUser.DoesNotExist:
            raise serializers.ValidationError("Credenciales inválidas")

        if not user.check_password(password):
            raise serializers.ValidationError("Credenciales inválidas")

        if not user.is_active:
            raise serializers.ValidationError("Usuario inactivo")

        attrs["user"] = user
        return attrs


class VerifyMFASerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(min_length=6, max_length=6)


class VerifyResetCodeSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(min_length=6, max_length=6)


class RequestCodeSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        try:
            AppUser.objects.get(email=value)
        except AppUser.DoesNotExist:
            raise serializers.ValidationError("No existe un usuario con este correo electrónico.")
        return value


class ChangePasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(min_length=6, max_length=6)
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError("Las contraseñas no coinciden.")
        return attrs