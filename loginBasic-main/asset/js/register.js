const registerForm = document.getElementById("registerForm");
const nombresInput = document.getElementById("nombres");
const apellidosInput = document.getElementById("apellidos");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const nombresError = document.getElementById("nombresError");
const apellidosError = document.getElementById("apellidosError");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const formMessage = document.getElementById("formMessage");
const submitBtn = document.getElementById("submitBtn");
const togglePasswordBtn = document.getElementById("togglePassword");

const REGISTER_URL = "http://localhost:8000/api/auth/register/";

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
  if (type) formMessage.classList.add(type);
}

function validateForm() {
  let isValid = true;
  resetFormMessages();

  const nombresValue = nombresInput.value.trim();
  const apellidosValue = apellidosInput.value.trim();
  const emailValue = emailInput.value.trim();
  const passwordValue = passwordInput.value.trim();

  clearError(nombresInput, nombresError);
  clearError(apellidosInput, apellidosError);
  clearError(emailInput, emailError);
  clearError(passwordInput, passwordError);

  if (!nombresValue) {
    setError(nombresInput, nombresError, "El nombre es obligatorio.");
    isValid = false;
  }

  if (!apellidosValue) {
    setError(apellidosInput, apellidosError, "Los apellidos son obligatorios.");
    isValid = false;
  }

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
  submitBtn.querySelector(".btn-text").textContent = isLoading ? "Registrando..." : "Crear cuenta";
}

function extractBackendError(data) {
  if (!data) return "No fue posible registrarse.";

  if (typeof data.email === "object" && data.email.length > 0) return data.email[0];
  if (typeof data.password === "object" && data.password.length > 0) return data.password[0];
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.message === "string") return data.message;

  for (const key in data) {
    if (Array.isArray(data[key]) && data[key].length > 0) return data[key][0];
  }

  return "No fue posible registrarse.";
}

togglePasswordBtn.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  togglePasswordBtn.textContent = isPassword ? "Ocultar" : "Mostrar";
  togglePasswordBtn.setAttribute("aria-pressed", String(isPassword));
  togglePasswordBtn.setAttribute("aria-label", isPassword ? "Ocultar contraseña" : "Mostrar contraseña");
});

[nombresInput, apellidosInput, emailInput, passwordInput].forEach((input, i) => {
  input.addEventListener("input", () => {
    const errors = [nombresError, apellidosError, emailError, passwordError];
    if (input.value.trim()) clearError(input, errors[i]);
  });
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validateForm()) {
    setFormMessage("Revisa los campos marcados antes de continuar.", "error");
    return;
  }

  setLoadingState(true);
  setFormMessage("Procesando registro...");

  const payload = {
    nombres: nombresInput.value.trim(),
    apellidos: apellidosInput.value.trim(),
    email: emailInput.value.trim(),
    password: passwordInput.value.trim(),
  };

  try {
    const response = await fetch(REGISTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = extractBackendError(data);
      setFormMessage(errorMessage, "error");
      return;
    }

    setFormMessage("Cuenta creada correctamente. Redirigiendo al inicio de sesión...", "success");

    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
  } catch (error) {
    console.error("Error en registro:", error);
    setFormMessage("No se pudo conectar con el servidor. Verifica que la API esté activa.", "error");
  } finally {
    setLoadingState(false);
  }
});
