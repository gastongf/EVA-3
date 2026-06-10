from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AppUser, MFAChallenge
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    VerifyMFASerializer,
    RequestCodeSerializer,
    VerifyResetCodeSerializer,
    ChangePasswordSerializer,
)
from .services.mfa_service import create_mfa_challenge, verify_mfa_code, validate_mfa_code_only
from .services.email_service import send_mfa_email


class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response({
            "message": "Usuario creado correctamente",
            "user": {
                "id": user.id,
                "email": user.email,
                "nombres": user.nombres,
                "apellidos": user.apellidos,
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        user.last_login_at = timezone.now()
        user.save(update_fields=["last_login_at"])

        if user.mfa_enabled:
            _, code = create_mfa_challenge(user, purpose="LOGIN")
            send_mfa_email(user, code, purpose="LOGIN")

            return Response({
                "message": "Código MFA enviado al correo",
                "mfa_required": True,
                "email": user.email,
            }, status=status.HTTP_200_OK)

        return Response({
            "message": "Login exitoso",
            "mfa_required": False,
            "user": {
                "id": user.id,
                "email": user.email,
                "nombres": user.nombres,
                "apellidos": user.apellidos,
            }
        }, status=status.HTTP_200_OK)


class VerifyMFAView(APIView):
    def post(self, request):
        serializer = VerifyMFASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        code = serializer.validated_data["code"]

        try:
            user = AppUser.objects.get(email=email)
        except AppUser.DoesNotExist:
            return Response({"detail": "Solicitud inválida"}, status=status.HTTP_400_BAD_REQUEST)

        challenge = MFAChallenge.objects.filter(
            user=user,
            purpose="LOGIN",
            consumed_at__isnull=True,
        ).order_by("-created_at").first()

        if not challenge:
            return Response({"detail": "No existe desafío MFA activo"}, status=status.HTTP_400_BAD_REQUEST)

        valid = verify_mfa_code(challenge, code)

        if not valid:
            return Response({"detail": "Código inválido o expirado"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "message": "MFA validado correctamente",
            "user": {
                "id": user.id,
                "email": user.email,
            }
        }, status=status.HTTP_200_OK)


class VerifyResetCodeView(APIView):
    def post(self, request):
        serializer = VerifyResetCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        code = serializer.validated_data["code"]

        try:
            user = AppUser.objects.get(email=email)
        except AppUser.DoesNotExist:
            return Response({"detail": "Solicitud inválida."}, status=status.HTTP_400_BAD_REQUEST)

        challenge = MFAChallenge.objects.filter(
            user=user,
            purpose="RESET_PASSWORD",
            consumed_at__isnull=True,
        ).order_by("-created_at").first()

        if not challenge:
            return Response({"detail": "No existe un código activo. Solicita uno nuevo."}, status=status.HTTP_400_BAD_REQUEST)

        valid = validate_mfa_code_only(challenge, code)

        if not valid:
            return Response({"detail": "Código inválido o expirado."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "message": "Código validado correctamente.",
        }, status=status.HTTP_200_OK)


class RequestCodeView(APIView):
    def post(self, request):
        serializer = RequestCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        user = AppUser.objects.get(email=email)

        challenge, code = create_mfa_challenge(user, purpose="RESET_PASSWORD")
        send_mfa_email(user, code, purpose="RESET_PASSWORD")

        return Response({
            "message": "Código de recuperación enviado al correo electrónico.",
        }, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        code = serializer.validated_data["code"]
        password = serializer.validated_data["password"]

        try:
            user = AppUser.objects.get(email=email)
        except AppUser.DoesNotExist:
            return Response({"detail": "Solicitud inválida."}, status=status.HTTP_400_BAD_REQUEST)

        challenge = MFAChallenge.objects.filter(
            user=user,
            purpose="RESET_PASSWORD",
            consumed_at__isnull=True,
        ).order_by("-created_at").first()

        if not challenge:
            return Response({"detail": "No existe un código activo. Solicita uno nuevo."}, status=status.HTTP_400_BAD_REQUEST)

        valid = verify_mfa_code(challenge, code)

        if not valid:
            return Response({"detail": "Código inválido o expirado."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save(update_fields=["password"])

        return Response({
            "message": "Contraseña cambiada correctamente.",
        }, status=status.HTTP_200_OK)