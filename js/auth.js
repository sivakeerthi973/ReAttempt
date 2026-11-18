const authTabs = [...document.querySelectorAll("[data-auth-tab]")];
const loginForm = document.querySelector("#login-panel");
const registerForm = document.querySelector("#register-panel");
const forgotForm = document.querySelector("#forgot-panel");
const authTitle = document.querySelector("#auth-title");
const authSubtitle = document.querySelector(".auth-heading > p");
const authNotice = document.querySelector(".auth-notice");
const store = window.ReAttemptStore;
const storageStatus = store.getStorageStatus();

document.querySelector("[data-current-year]").textContent = new Date().getFullYear();

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
  authTitle.textContent = isForgot ? "Let's get you back on track." : mode === "register" ? "Make this your fresh start." : "Your comeback starts here.";
  authSubtitle.textContent = isForgot ? "We’ll guide you through the next step." : mode === "register" ? "A plan starts with getting set up." : "Sign in to pick up where you left off.";
  authTabs.forEach((tab) => {
    const selected = tab.dataset.authTab === mode;
    tab.classList.toggle("is-selected", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
}

function getDefaultDemoData() {
  const today = new Date();
  const dateAt = (offset) => {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const backlogs = [
    { id: store.makeId("subject"), name: "Mathematics II", code: "MATH202", semester: "Semester 2", attempts: 2, status: "In progress", progress: 65, examDate: "", topicsDone: ["Matrices and rank", "Eigenvalues"], topicsPending: ["Differential equations", "Laplace transforms"], sample: true },
    { id: store.makeId("subject"), name: "Data Structures", code: "CSE203", semester: "Semester 3", attempts: 1, status: "In progress", progress: 42, examDate: "", topicsDone: ["Arrays and linked lists"], topicsPending: ["Trees and traversals", "Graph algorithms"], sample: true },
    { id: store.makeId("subject"), name: "Database Management Systems", code: "CSE301", semester: "Semester 4", attempts: 2, status: "Completed", progress: 100, examDate: "", topicsDone: ["Relational model", "SQL and normalization"], topicsPending: [], sample: true },
    { id: store.makeId("subject"), name: "Operating Systems", code: "CSE302", semester: "Semester 4", attempts: 1, status: "In progress", progress: 25, examDate: "", topicsDone: ["Process states"], topicsPending: ["Scheduling", "Memory management"], sample: true },
    { id: store.makeId("subject"), name: "Computer Networks", code: "CSE401", semester: "Semester 5", attempts: 1, status: "Not started", progress: 0, examDate: "", topicsDone: [], topicsPending: ["Network layers", "Routing basics"], sample: true }
  ];
  const tasks = [
    { id: store.makeId("task"), title: "Completed: database normalization review", subjectId: backlogs[2].id, date: dateAt(-1), start: "09:00", end: "10:00", status: "Completed", sample: true },
    { id: store.makeId("task"), title: "Completed: matrix practice", subjectId: backlogs[0].id, date: dateAt(-2), start: "15:00", end: "16:30", status: "Completed", sample: true },
    { id: store.makeId("task"), title: "Completed: linked-list revision", subjectId: backlogs[1].id, date: dateAt(-4), start: "10:00", end: "11:00", status: "Completed", sample: true },
    { id: store.makeId("task"), title: "Review process scheduling", subjectId: backlogs[3].id, date: dateAt(0), start: "10:00", end: "11:30", status: "In progress", sample: true },
    { id: store.makeId("task"), title: "Practice tree traversals", subjectId: backlogs[1].id, date: dateAt(1), start: "16:00", end: "17:00", status: "Planned", sample: true },
    { id: store.makeId("task"), title: "Revise matrix operations", subjectId: backlogs[0].id, date: dateAt(3), start: "09:00", end: "10:15", status: "Planned", sample: true }
  ];
  const materials = [
    { id: store.makeId("material"), subjectId: backlogs[0].id, title: "Matrices & Eigenvalues — revision notes", type: "Notes", description: "Sample outline of matrix operations, rank, eigenvalues, and key definitions.", updated: "Sample content", sample: true },
    { id: store.makeId("material"), subjectId: backlogs[0].id, title: "Differential Equations — important topics", type: "Important topics", description: "Sample topic checklist for your next revision session.", updated: "Sample content", sample: true },
    { id: store.makeId("material"), subjectId: backlogs[1].id, title: "Data Structures — practice paper", type: "Question paper", description: "Sample paper card. No question paper file is attached.", updated: "Sample only", sample: true },
    { id: store.makeId("material"), subjectId: backlogs[1].id, title: "Trees & Graphs — concept notes", type: "Notes", description: "Sample prompts for traversals, tree properties, and graph basics.", updated: "Sample content", sample: true },
    { id: store.makeId("material"), subjectId: backlogs[2].id, title: "Database Systems — important topics", type: "Important topics", description: "Sample checklist for normalization, transactions, and SQL.", updated: "Sample content", sample: true },
    { id: store.makeId("material"), subjectId: backlogs[2].id, title: "Database Systems — reference guide", type: "Reference", description: "Sample description only; no downloadable reference is provided.", updated: "Sample only", sample: true },
    { id: store.makeId("material"), subjectId: backlogs[3].id, title: "Operating Systems — quick notes", type: "Notes", description: "Sample revision prompts for processes, scheduling, and memory concepts.", updated: "Sample content", sample: true },
    { id: store.makeId("material"), subjectId: backlogs[3].id, title: "Operating Systems — previous paper", type: "Question paper", description: "Sample previous-paper resource; no file is included.", updated: "Sample only", sample: true },
    { id: store.makeId("material"), subjectId: backlogs[4].id, title: "Computer Networks — reference topics", type: "Reference", description: "Sample guide outline for network layers and routing fundamentals.", updated: "Sample content", sample: true }
  ];
  return { backlogs, tasks, materials };
}

function initializeDemoData() {
  const sampleData = getDefaultDemoData();
  return store.saveList("backlogs", sampleData.backlogs)
    && store.saveList("tasks", sampleData.tasks)
    && store.saveList("materials", sampleData.materials);
}

function moveToDashboard(profile) {
  if (!store.saveSession(profile.id)) {
    showNotice("Could not save your demo session. Check browser storage settings and try again.", true);
    return;
  }
  window.location.href = "dashboard.html";
}

authTabs.forEach((tab) => tab.addEventListener("click", () => showAuthMode(tab.dataset.authTab)));
document.querySelector("[data-show-register]").addEventListener("click", () => showAuthMode("register"));
document.querySelectorAll("[data-show-login]").forEach((button) => button.addEventListener("click", () => showAuthMode("login")));
document.querySelector("[data-show-forgot]").addEventListener("click", () => showAuthMode("forgot"));

document.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const input = toggle.closest(".password-control").querySelector("input");
    const showPassword = input.type === "password";
    input.type = showPassword ? "text" : "password";
    toggle.textContent = showPassword ? "Hide" : "Show";
    toggle.setAttribute("aria-label", showPassword ? "Hide password" : "Show password");
  });
});

if (!storageStatus.available) {
  showNotice("Browser storage is unavailable. Open this demo in a modern browser with storage enabled.", true);
}
if (store.getCurrentProfile()) {
  window.location.replace("dashboard.html");
}
if (new URLSearchParams(window.location.search).has("loggedout")) {
  showNotice("You’ve signed out of the local demonstration session.", false);
}
if (new URLSearchParams(window.location.search).has("cleared")) {
  showNotice("All local ReAttempt demo data was cleared from this browser.", false);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearNotice();
  if (!loginForm.reportValidity()) return;
  const data = new FormData(loginForm);
  const email = String(data.get("email")).trim().toLowerCase();
  const password = String(data.get("password"));
  const profile = store.getProfile();
  const credentials = store.getCredentials();
  if (!profile || !credentials || credentials.email !== email || profile.email.toLowerCase() !== email) {
    showNotice("No local demo account matches that email. Create an account first.", true);
    return;
  }
  try {
    const candidateHash = await store.hashPassword(password, credentials.salt);
    if (candidateHash !== credentials.passwordHash) {
      showNotice("Email or password is incorrect.", true);
      return;
    }
    moveToDashboard(profile);
  } catch (error) {
    showNotice(error.message || "Could not verify this demo password.", true);
  }
});

const registerPassword = registerForm.elements.password;
const confirmPassword = registerForm.elements.confirmPassword;
function validatePasswordMatch() {
  confirmPassword.setCustomValidity(confirmPassword.value && confirmPassword.value !== registerPassword.value ? "Passwords do not match." : "");
}
registerPassword.addEventListener("input", validatePasswordMatch);
confirmPassword.addEventListener("input", validatePasswordMatch);

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearNotice();
  validatePasswordMatch();
  if (!registerForm.reportValidity()) return;
  if (!storageStatus.available) {
    showNotice("Browser storage is unavailable, so your demo profile cannot be saved.", true);
    return;
  }
  const data = new FormData(registerForm);
  const email = String(data.get("email")).trim().toLowerCase();
  const existingProfile = store.getProfile();
  if (existingProfile && existingProfile.email.toLowerCase() === email) {
    showNotice("A local demo account already uses that email. Use Login instead.", true);
    return;
  }
  if (existingProfile) {
    showNotice("This frontend demo supports one local student account per browser. Clear the demo data in Settings to register another.", true);
    return;
  }
  try {
    const salt = store.createSalt();
    const passwordHash = await store.hashPassword(String(data.get("password")), salt);
    const profile = {
      id: store.makeId("student"),
      fullName: String(data.get("fullName")).trim(),
      email,
      college: String(data.get("college")).trim(),
      course: String(data.get("course")).trim(),
      department: String(data.get("department")),
      year: String(data.get("year")),
      semester: String(data.get("semester")),
      createdAt: new Date().toISOString()
    };
    if (!store.saveProfile(profile)) {
      showNotice("Could not save your profile in browser storage.", true);
      return;
    }
    if (!store.saveCredentials({ email, salt, passwordHash, algorithm: "PBKDF2-SHA-256", iterations: 120000 })) {
      showNotice("Could not save demo credentials. Clear the local demo profile and try again.", true);
      return;
    }
    if (!initializeDemoData()) {
      showNotice("Your profile was created, but sample data could not be saved. You can continue and add your own data.", true);
    }
    const preferencesSaved = store.savePreferences({ theme: "light", studyReminders: true, weeklyRecap: true });
    if (!preferencesSaved) {
      showNotice("Your account is ready, but preferences could not be saved.", true);
    }
    moveToDashboard(profile);
  } catch (error) {
    showNotice(error.message || "Could not create the local demo account.", true);
  }
});

forgotForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!forgotForm.reportValidity()) return;
  showNotice("Password recovery is not available in this frontend demo. No email was sent or password changed.", false);
});
