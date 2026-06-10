const requestForm = document.getElementById("requestCodeForm");
const emailInput = document.getElementById("email");
const emailError = document.getElementById("emailError");
const formMessage = document.getElementById("formMessage");
const submitBtn = document.getElementById("submitBtn");

const REQUEST_CODE_URL = "http://localhost:8000/api/auth/request-code/";

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

  const emailValue = emailInput.value.trim();
  clearError(emailInput, emailError);

  if (!emailValue) {
    setError(emailInput, emailError, "El correo electrónico es obligatorio.");
    isValid = false;
  } else if (!validateEmail(emailValue)) {
    setError(emailInput, emailError, "Ingresa un correo electrónico válido.");
    isValid = false;
  }

  return isValid;
}

function setLoadingState(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.querySelector(".btn-text").textContent = isLoading ? "Enviando..." : "Enviar código";
}

function extractBackendError(data) {
  if (!data) return "No fue posible procesar la solicitud.";

  if (typeof data.email === "object" && data.email.length > 0) return data.email[0];
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.message === "string") return data.message;

  for (const key in data) {
    if (Array.isArray(data[key]) && data[key].length > 0) return data[key][0];
  }

  return "No fue posible procesar la solicitud.";
}

emailInput.addEventListener("input", () => {
  if (emailInput.value.trim() && validateEmail(emailInput.value.trim())) {
    clearError(emailInput, emailError);
  }
});

requestForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validateForm()) {
    setFormMessage("Revisa los campos marcados antes de continuar.", "error");
    return;
  }

  const emailValue = emailInput.value.trim();
  localStorage.setItem("recoveryEmail", emailValue);

  setLoadingState(true);
  setFormMessage("Enviando solicitud...");

  const payload = {
    email: emailValue,
  };

  try {
    const response = await fetch(REQUEST_CODE_URL, {
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

    setFormMessage("Código enviado correctamente. Revisa tu correo electrónico.", "success");

    setTimeout(() => {
      window.location.href = "change-password.html?email=" + encodeURIComponent(emailValue);
    }, 2000);
  } catch (error) {
    console.error("Error al solicitar código:", error);
    setFormMessage("No se pudo conectar con el servidor. Verifica que la API esté activa.", "error");
  } finally {
    setLoadingState(false);
  }
});
