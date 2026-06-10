from django.urls import path
from .views import RegisterView, LoginView, VerifyMFAView, RequestCodeView, VerifyResetCodeView, ChangePasswordView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("verify-mfa/", VerifyMFAView.as_view(), name="verify-mfa"),
    path("request-code/", RequestCodeView.as_view(), name="request-code"),
    path("verify-reset-code/", VerifyResetCodeView.as_view(), name="verify-reset-code"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
]