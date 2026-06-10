const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const formMessage = document.getElementById("formMessage");
const submitBtn = document.getElementById("submitBtn");
const togglePasswordBtn = document.getElementById("togglePassword");

const LOGIN_URL = "http://localhost:8000/api/auth/login/";

function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

function setError(input, errorElement, message) {
  input.classList.add("input-error");
  errorElement.textContent = message;
}

function clearError(input, errorElement) {
  input.classList.remove("input-error");
  errorElement.textContent = "";
}

function resetFormMessages() {
  formMessage.textContent = "";
  formMessage.classList.remove("success", "error");
}

function setFormMessage(message, type = "") {
  formMessage.textContent = message;
  formMessage.classList.remove("success", "error");

  if (type) {
    formMessage.classList.add(type);
  }
}

function validateForm() {
  let isValid = true;
  resetFormMessages();

  const emailValue = emailInput.value.trim();
  const passwordValue = passwordInput.value.trim();

  clearError(emailInput, emailError);
  clearError(passwordInput, passwordError);

  if (!emailValue) {
    setError(emailInput, emailError, "El correo electrónico es obligatorio.");
    isValid = false;
  } else if (!validateEmail(emailValue)) {
    setError(emailInput, emailError, "Ingresa un correo electrónico válido.");
    isValid = false;
  }

  if (!passwordValue) {
    setError(passwordInput, passwordError, "La contraseña es obligatoria.");
    isValid = false;
  } else if (passwordValue.length < 8) {
    setError(passwordInput, passwordError, "La contraseña debe tener al menos 8 caracteres.");
    isValid = false;
  }

  return isValid;
}

function setLoadingState(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.querySelector(".btn-text").textContent = isLoading
    ? "Validando..."
    : "Iniciar sesión";
}

function extractBackendError(data) {
  if (!data) return "No fue posible iniciar sesión.";

  if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
    return data.non_field_errors[0];
  }

  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  return "No fue posible iniciar sesión.";
}

togglePasswordBtn.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  togglePasswordBtn.textContent = isPassword ? "Ocultar" : "Mostrar";
  togglePasswordBtn.setAttribute("aria-pressed", String(isPassword));
  togglePasswordBtn.setAttribute(
    "aria-label",
    isPassword ? "Ocultar contraseña" : "Mostrar contraseña"
  );
});

emailInput.addEventListener("input", () => {
  if (emailInput.value.trim() && validateEmail(emailInput.value.trim())) {
    clearError(emailInput, emailError);
  }
});

passwordInput.addEventListener("input", () => {
  if (passwordInput.value.trim().length >= 8) {
    clearError(passwordInput, passwordError);
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const isValid = validateForm();

  if (!isValid) {
    setFormMessage("Revisa los campos marcados antes de continuar.", "error");
    return;
  }

  setLoadingState(true);
  setFormMessage("Procesando inicio de sesión...");

  const credentials = {
    email: emailInput.value.trim(),
    password: passwordInput.value.trim(),
  };

  try {
    const response = await fetch(LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = extractBackendError(data);
      setFormMessage(errorMessage, "error");
      return;
    }

    // Guardar datos básicos del usuario para la vista home
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("user", JSON.stringify(data.user));

    setFormMessage(data.message || "Inicio de sesión exitoso.", "success");

    // Redirigir al home
    window.location.href = "pages/home.html";
  } catch (error) {
    console.error("Error en login:", error);
    setFormMessage(
      "No se pudo conectar con el servidor. Verifica que la API esté activa.",
      "error"
    );
  } finally {
    setLoadingState(false);
  }
});