# Sistema de Recuperación de Contraseña

## Descripción General

Sistema de autenticación con registro, inicio de sesión, recuperación de contraseña mediante código de verificación enviado por correo y cambio de contraseña en dos pasos.

---

## Tecnologías

| Componente | Tecnología |
|---|---|
| Backend | Django 6.0 + Django REST Framework |
| Base de datos | MySQL 8.4 (Docker) |
| Frontend | HTML5, CSS3, JavaScript vanilla |
| Autenticación | Django Auth + MFA Challenge |
| Contenedores | Docker + Docker Compose |
| Correo | SMTP Gmail |

---

## Instalación y Ejecución

### Backend (Docker)

```bash
Buscar la carpeta auth2-main y abrirla con Visual Studio Code
En la terminal colocar 
docker compose up --build (con esto hacemos correr el codigo y levantamos Django)
```

API disponible en `http://localhost:8000/admin/`.

### Frontend - Ejecutar este comando para levantar servicio
cd "/Users/gastongonzalez/Library/CloudStorage/OneDrive-IPCHILE-InstitutoProfesionaldeChile/3° Semestre/2. DESARROLLO BACKEND/EVA/loginBasic-main"
python3 -m http.server 5500

Abrir `http://localhost:5500/index.html` en el navegador o usar Live Server en el puerto 5500.

---

## Endpoints de la API

### POST /api/auth/register/
Registra un nuevo usuario.

```json
// Request
{ "nombres": "Juan", "apellidos": "Pérez", "email": "juan@correo.com", "password": "MiPassword123" }

// Response 201
{ "message": "Usuario creado correctamente", "user": { "id": 1, "email": "juan@correo.com", "nombres": "Juan", "apellidos": "Pérez" } }
```

### POST /api/auth/login/
Inicia sesión. Si el usuario tiene MFA habilitado, envía un código al correo.

```json
// Request
{ "email": "juan@correo.com", "password": "MiPassword123" }
```

### POST /api/auth/request-code/
Solicita un código de recuperación de contraseña. Envía el código al correo del usuario.

```json
// Request
{ "email": "juan@correo.com" }

// Response 200
{ "message": "Código de recuperación enviado al correo electrónico." }
```

### POST /api/auth/verify-reset-code/
Valida el código de recuperación **sin consumirlo** (paso intermedio).

```json
// Request
{ "email": "juan@correo.com", "code": "297447" }

// Response 200
{ "message": "Código validado correctamente." }
```

### POST /api/auth/change-password/
Cambia la contraseña validando el código de recuperación (lo consume).

```json
// Request
{ "email": "juan@correo.com", "code": "297447", "password": "NuevaPass123", "password2": "NuevaPass123" }

// Response 200
{ "message": "Contraseña cambiada correctamente." }
```

---

## Flujo de Recuperación de Contraseña

### Paso 1: Solicitar código
1. Usuario ingresa su email en `request-code.html`
2. El JS guarda el email en `localStorage`
3. Se envía POST a `/api/auth/request-code/`
4. Backend genera código de 6 dígitos, lo hashea y lo guarda en `MFAChallenge` (expira en 5 min, máx 5 intentos)
5. Se envía el código al correo del usuario
6. Redirige a `change-password.html?email=...`

### Paso 2: Validar código
1. La página `change-password.html` lee el email desde la URL o `localStorage`
2. Usuario ingresa el código de 6 dígitos y presiona "Validar código"
3. Se envía POST a `/api/auth/verify-reset-code/`
4. Backend valida el código **sin consumirlo** (función `validate_mfa_code_only`)
5. Si es válido, se oculta el paso 1 y se muestra el paso 2

### Paso 3: Cambiar contraseña
1. Usuario ingresa nueva contraseña + confirmación
2. Se envía POST a `/api/auth/change-password/`
3. Backend valida el código nuevamente y **lo consume** (función `verify_mfa_code`)
4. Actualiza la contraseña del usuario con `set_password()`
5. Limpia `localStorage` y redirige al login

---

## Estructura del Backend

```
auth2-main/
├── OAuth2/
│   ├── models.py              # AppUser + MFAChallenge
│   ├── views.py               # RegisterView, LoginView, RequestCodeView,
│   │                          # VerifyResetCodeView, ChangePasswordView
│   ├── serializers.py         # Validación de datos de entrada
│   ├── urls.py                # Rutas de la API
│   ├── services/
│   │   ├── mfa_service.py     # Generar, validar y consumir códigos
│   │   └── email_service.py   # Envío de correos con plantilla HTML
│   └── templates/emails/
│       └── mfa_code.html      # Plantilla corporativa del correo
└── oauth2_project/
    ├── settings.py            # Configuración general
    └── urls.py                # Ruta raíz (/admin/, /api/auth/)
```

### Modelos

**AppUser** — Usuario personalizado:
- `email` (username field), `nombres`, `apellidos`
- `is_active`, `is_staff`, `is_superuser`
- `mfa_enabled` — controla si requiere MFA al login
- `last_login_at`, `created_at`, `updated_at`

**MFAChallenge** — Desafío de código:
- `user` (FK), `code_hash` (almacenado con `make_password`)
- `purpose`: LOGIN, REGISTER, RESET_PASSWORD, VERIFY_EMAIL
- `expires_at` (5 min), `max_attempts` (5), `attempts`
- `consumed_at` — marca si ya fue usado

### Servicios

**mfa_service.py:**
- `generate_6_digit_code()` — genera código aleatorio de 6 dígitos
- `create_mfa_challenge(user, purpose)` — invalida challenges anteriores y crea uno nuevo
- `verify_mfa_code(challenge, code)` — valida y **consume** el código
- `validate_mfa_code_only(challenge, code)` — valida **sin consumir** (para el paso 2)

**email_service.py:**
- `send_mfa_email(user, code, purpose)` — envía correo con plantilla HTML corporativa
- Asunto dinámico según el propósito ("Tu código de verificación" / "Recuperación de contraseña")

---

## Estructura del Frontend

```
loginBasic-main/
├── index.html                  # Login
├── register.html               # Registro
├── request-code.html           # Solicitar código de recuperación
├── change-password.html        # Validar código + cambiar contraseña
├── pages/
│   └── home.html               # Dashboard post-login
└── asset/
    ├── css/styles.css           # Estilos globales (tema azul corporativo)
    └── js/
        ├── login.js
        ├── register.js
        ├── request-code.js      # Guarda email en localStorage + redirige
        └── change-password.js   # Flujo en 2 pasos (validar código → cambiar pass)
```

### Flujo Frontend

**request-code.js:**
1. Valida email
2. Guarda email en `localStorage`
3. POST a `/api/auth/request-code/`
4. En éxito, redirige a `change-password.html?email=...`

**change-password.js:**
1. Al cargar, lee email de la URL (`?email=`) o `localStorage`
2. Paso 1: Usuario ingresa código → POST a `/api/auth/verify-reset-code/`
3. Si código válido, oculta paso 1, muestra paso 2
4. Paso 2: Usuario ingresa nueva contraseña → POST a `/api/auth/change-password/`
5. En éxito, limpia `localStorage` y redirige al login

---

## Admin Django

```
URL: http://localhost:8000/admin/
Email: gaston@regno.cl
Pass:  8692
```

Para crear un superusuario manualmente:
```bash
docker exec -it oauth2-api-container python manage.py createsuperuser
```

---

## Notas Técnicas

- **Seguridad:** Los códigos se almacenan hasheados (bcrypt/PBKDF2), expiran en 5 minutos y tienen máximo 5 intentos.
- **Caché:** El email se pasa entre páginas mediante `localStorage` y parámetro en URL (`?email=...`).
- **Correo:** Usa SMTP de Gmail. Configurar en `.env` las variables `EMAIL_HOST_USER` y `EMAIL_HOST_PASSWORD`.
- **CORS:** Configurado para `localhost:5500` y `127.0.0.1:5500` (Live Server).


## Autor

- **Nombre:** Gaston Gonzalez
- **Asignatura:** Desarrollo Backend
- **Fecha:** Junio 2026