from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings


def send_mfa_email(user, code, purpose="acceso"):
    if purpose == "RESET_PASSWORD":
        subject = "Recuperación de contraseña"
        purpose_text = "para recuperar tu contraseña"
    else:
        subject = "Tu código de verificación"
        purpose_text = "para acceder a tu cuenta"

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@oauth2.local")
    to = [user.email]

    try:
        html_content = render_to_string("emails/mfa_code.html", {
            "user": user,
            "code": code,
            "purpose_text": purpose_text,
        })
    except Exception:
        html_content = f"""
        <html>
            <body style="margin:0;padding:0;background:#e3f2fd;font-family:Inter,sans-serif;">
                <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#e3f2fd;">
                    <tr><td align="center">
                        <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(21,101,192,0.10);">
                            <tr><td style="background:linear-gradient(135deg,#1565C0,#1976D2);padding:32px 24px 20px;text-align:center;">
                                <h1 style="margin:0;color:#fff;font-size:22px;">Código de verificación</h1>
                            </td></tr>
                            <tr><td style="padding:32px 24px;">
                                <p style="margin:0 0 6px;color:#1c1b1f;font-size:16px;font-weight:600;">Hola {user.nombres},</p>
                                <p style="margin:0 0 20px;color:#49454f;font-size:15px;line-height:1.5;">
                                    Has solicitado un código {purpose_text}. Úsalo dentro de los próximos <strong>5 minutos</strong>.
                                </p>
                                <div style="background:#e3f2fd;border:2px dashed #90caf9;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
                                    <p style="margin:0 0 6px;color:#49454f;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Tu código</p>
                                    <p style="margin:0;font-size:36px;font-weight:800;color:#1565C0;letter-spacing:8px;font-family:monospace;">{code}</p>
                                </div>
                                <p style="margin:0;color:#8a8591;font-size:13px;">Si no solicitaste este código, ignora este mensaje. No lo compartas con nadie.</p>
                            </td></tr>
                            <tr><td style="background:#e8eaf6;padding:16px 24px;text-align:center;border-top:1px solid #c5cae9;">
                                <p style="margin:0;color:#8a8591;font-size:12px;">&copy; 2026 EVA Authentication &mdash; Todos los derechos reservados.</p>
                            </td></tr>
                        </table>
                    </td></tr>
                </table>
            </body>
        </html>
        """

    text_content = f"Hola {user.nombres}, tu código de verificacion es: {code}. Expiracion: 5 minutos."

    msg = EmailMultiAlternatives(subject, text_content, from_email, to)
    msg.attach_alternative(html_content, "text/html")
    msg.send()