const changeForm = document.getElementById("changePasswordForm");
const codeInput = document.getElementById("code");
const passwordInput = document.getElementById("password");
const password2Input = document.getElementById("password2");
const codeError = document.getElementById("codeError");
const passwordError = document.getElementById("passwordError");
const password2Error = document.getElementById("password2Error");
const formMessage = document.getElementById("formMessage");
const codeMessage = document.getElementById("codeMessage");
const submitBtn = document.getElementById("submitBtn");
const validateCodeBtn = document.getElementById("validateCodeBtn");
const togglePasswordBtn = document.getElementById("togglePassword");
const stepCode = document.getElementById("stepCode");
const stepPassword = document.getElementById("stepPassword");

const VERIFY_RESET_CODE_URL = "http://localhost:8000/api/auth/verify-reset-code/";
const CHANGE_PASSWORD_URL = "http://localhost:8000/api/auth/change-password/";

let validatedEmail = "";

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

function setFormMessage(element, message, type = "") {
  element.textContent = message;
  element.classList.remove("success", "error");
  if (type) element.classList.add(type);
}

function validateCodeForm() {
  let isValid = true;
  codeMessage.textContent = "";
  codeMessage.classList.remove("success", "error");

  const codeValue = codeInput.value.trim();
  clearError(codeInput, codeError);

  if (!codeValue) {
    setError(codeInput, codeError, "El código es obligatorio.");
    isValid = false;
  } else if (codeValue.length !== 6) {
    setError(codeInput, codeError, "El código debe tener 6 dígitos.");
    isValid = false;
  }

  return isValid;
}

function validatePasswordForm() {
  let isValid = true;
  resetFormMessages();

  const passwordValue = passwordInput.value.trim();
  const password2Value = password2Input.value.trim();

  clearError(passwordInput, passwordError);
  clearError(password2Input, password2Error);

  if (!passwordValue) {
    setError(passwordInput, passwordError, "La nueva contraseña es obligatoria.");
    isValid = false;
  } else if (passwordValue.length < 8) {
    setError(passwordInput, passwordError, "La contraseña debe tener al menos 8 caracteres.");
    isValid = false;
  }

  if (!password2Value) {
    setError(password2Input, password2Error, "Debes confirmar la nueva contraseña.");
    isValid = false;
  } else if (passwordValue !== password2Value) {
    setError(password2Input, password2Error, "Las contraseñas no coinciden.");
    isValid = false;
  }

  return isValid;
}

function extractBackendError(data) {
  if (!data) return "No fue posible procesar la solicitud.";

  if (typeof data.non_field_errors === "object" && data.non_field_errors.length > 0) return data.non_field_errors[0];
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.message === "string") return data.message;
  if (typeof data.code === "object" && data.code.length > 0) return data.code[0];
  if (typeof data.password === "object" && data.password.length > 0) return data.password[0];

  for (const key in data) {
    if (Array.isArray(data[key]) && data[key].length > 0) return data[key][0];
  }

  return "No fue posible procesar la solicitud.";
}

// --- Initialization ---
(function init() {
  stepPassword.classList.add("hidden");

  const urlParams = new URLSearchParams(window.location.search);
  const emailFromUrl = urlParams.get("email");

  if (emailFromUrl) {
    localStorage.setItem("recoveryEmail", emailFromUrl);
  }

  const savedEmail = localStorage.getItem("recoveryEmail");

  if (!savedEmail) {
    setFormMessage(codeMessage, "No hay un correo registrado. Redirigiendo para solicitar un código...", "error");
    validateCodeBtn.disabled = true;
    setTimeout(() => {
      window.location.href = "request-code.html";
    }, 2000);
  }
})();

// --- Event listeners ---
codeInput.addEventListener("input", () => {
  codeInput.value = codeInput.value.replace(/\D/g, "");
  if (codeInput.value.trim()) clearError(codeInput, codeError);
});

passwordInput.addEventListener("input", () => {
  if (passwordInput.value.trim().length >= 8) clearError(passwordInput, passwordError);
});

password2Input.addEventListener("input", () => {
  if (password2Input.value.trim() && password2Input.value === passwordInput.value) clearError(password2Input, password2Error);
});

togglePasswordBtn.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  togglePasswordBtn.textContent = isPassword ? "Ocultar" : "Mostrar";
  togglePasswordBtn.setAttribute("aria-pressed", String(isPassword));
  togglePasswordBtn.setAttribute("aria-label", isPassword ? "Ocultar contraseña" : "Mostrar contraseña");
});

// --- Validate code step ---
validateCodeBtn.addEventListener("click", async () => {
  if (!validateCodeForm()) {
    setFormMessage(codeMessage, "Revisa los campos marcados antes de continuar.", "error");
    return;
  }

  const savedEmail = localStorage.getItem("recoveryEmail");
  if (!savedEmail) {
    setFormMessage(codeMessage, "No hay un correo registrado. Solicita un código primero.", "error");
    return;
  }

  validateCodeBtn.disabled = true;
  validateCodeBtn.querySelector(".btn-text").textContent = "Validando...";
  setFormMessage(codeMessage, "Validando código...");

  const payload = {
    email: savedEmail,
    code: codeInput.value.trim(),
  };

  try {
    const response = await fetch(VERIFY_RESET_CODE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = extractBackendError(data);
      setFormMessage(codeMessage, errorMessage, "error");
      return;
    }

    validatedEmail = savedEmail;
    setFormMessage(codeMessage, "Código validado correctamente.", "success");

    setTimeout(() => {
      stepCode.classList.add("hidden");
      stepPassword.classList.remove("hidden");
      passwordInput.focus();
    }, 800);
  } catch (error) {
    console.error("Error al validar código:", error);
    setFormMessage(codeMessage, "No se pudo conectar con el servidor. Verifica que la API esté activa.", "error");
  } finally {
    validateCodeBtn.disabled = false;
    validateCodeBtn.querySelector(".btn-text").textContent = "Validar código";
  }
});

// --- Change password step ---
changeForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validatePasswordForm()) {
    setFormMessage(formMessage, "Revisa los campos marcados antes de continuar.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.querySelector(".btn-text").textContent = "Cambiando...";
  setFormMessage(formMessage, "Procesando cambio de contraseña...");

  const payload = {
    email: validatedEmail,
    code: codeInput.value.trim(),
    password: passwordInput.value.trim(),
    password2: password2Input.value.trim(),
  };

  try {
    const response = await fetch(CHANGE_PASSWORD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = extractBackendError(data);
      setFormMessage(formMessage, errorMessage, "error");
      return;
    }

    localStorage.removeItem("recoveryEmail");

    setFormMessage(formMessage, "Contraseña cambiada correctamente. Redirigiendo al inicio de sesión...", "success");

    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    setFormMessage(formMessage, "No se pudo conectar con el servidor. Verifica que la API esté activa.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector(".btn-text").textContent = "Cambiar contraseña";
  }
});
