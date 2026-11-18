(function () {
  const api = window.ReAttemptApi;
  const authTabs = [...document.querySelectorAll("[data-auth-tab]")];
  const loginForm = document.querySelector("#login-panel");
  const registerForm = document.querySelector("#register-panel");
  const forgotForm = document.querySelector("#forgot-panel");
  const authTitle = document.querySelector("#auth-title");
  const authSubtitle = document.querySelector(".auth-heading > p");
  const authNotice = document.querySelector(".auth-notice");

  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = new Date().getFullYear();
  });

  function showNotice(message, isError) {
    authNotice.textContent = message;
    authNotice.classList.add("is-visible");
    authNotice.classList.toggle("is-error", Boolean(isError));
  }

  function clearNotice() {
    authNotice.textContent = "";
    authNotice.classList.remove("is-visible", "is-error");
  }

  function showAuthMode(mode) {
    clearNotice();
    const isForgot = mode === "forgot";
    loginForm.hidden = mode !== "login";
    registerForm.hidden = mode !== "register";
    forgotForm.hidden = !isForgot;
    document.querySelector(".auth-tabs").hidden = isForgot;
    authTitle.textContent = isForgot
      ? "Let's get you back on track."
      : mode === "register" ? "Make this your fresh start." : "Your comeback starts here.";
    authSubtitle.textContent = isForgot
      ? "We’ll guide you through the next step."
      : mode === "register" ? "A plan starts with getting set up." : "Sign in to pick up where you left off.";
    authTabs.forEach((tab) => {
      const selected = tab.dataset.authTab === mode;
      tab.classList.toggle("is-selected", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
  }

  async function submitForm(form, path, payload, successMessage) {
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      await api.request(path, { method: "POST", body: JSON.stringify(payload) });
      showNotice(successMessage, false);
      window.location.assign("/dashboard.html");
    } catch (error) {
      showNotice(error.message || "The request could not be completed.", true);
    } finally {
      button.disabled = false;
    }
  }

  authTabs.forEach((tab) => tab.addEventListener("click", () => showAuthMode(tab.dataset.authTab)));
  document.querySelector("[data-show-register]").addEventListener("click", () => showAuthMode("register"));
  document.querySelectorAll("[data-show-login]").forEach((button) => button.addEventListener("click", () => showAuthMode("login")));
  document.querySelector("[data-show-forgot]").addEventListener("click", () => showAuthMode("forgot"));

  document.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const input = toggle.closest(".password-control").querySelector("input");
      const visible = input.type === "password";
      input.type = visible ? "text" : "password";
      toggle.textContent = visible ? "Hide" : "Show";
      toggle.setAttribute("aria-label", visible ? "Hide password" : "Show password");
    });
  });

  const registerPassword = registerForm.elements.password;
  const confirmPassword = registerForm.elements.confirmPassword;
  function validatePasswordMatch() {
    confirmPassword.setCustomValidity(
      confirmPassword.value && confirmPassword.value !== registerPassword.value
        ? "Passwords do not match."
        : ""
    );
  }
  registerPassword.addEventListener("input", validatePasswordMatch);
  confirmPassword.addEventListener("input", validatePasswordMatch);

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    clearNotice();
    if (!loginForm.reportValidity()) return;
    const data = new FormData(loginForm);
    submitForm(loginForm, "/api/auth/login", {
      email: String(data.get("email")).trim().toLowerCase(),
      password: String(data.get("password")),
      remember: data.get("remember") === "on"
    }, "Signed in. Opening your dashboard…");
  });

  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    clearNotice();
    validatePasswordMatch();
    if (!registerForm.reportValidity()) return;
    const data = new FormData(registerForm);
    submitForm(registerForm, "/api/auth/register", {
      fullName: String(data.get("fullName")).trim(),
      email: String(data.get("email")).trim().toLowerCase(),
      password: String(data.get("password")),
      confirmPassword: String(data.get("confirmPassword")),
      college: String(data.get("college")).trim(),
      course: String(data.get("course")).trim(),
      department: String(data.get("department")),
      year: String(data.get("year")),
      semester: String(data.get("semester")),
      remember: true
    }, "Your account is ready. Opening your dashboard…");
  });

  forgotForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!forgotForm.reportValidity()) return;
    showNotice("Password recovery is not available yet. No email was sent and no password was changed.", false);
  });

  const query = new URLSearchParams(window.location.search);
  if (query.has("loggedout")) showNotice("You’ve signed out.", false);
  else if (query.has("expired")) showNotice("Your session ended. Please sign in again.", true);

})();
