(function startDashboard() {
  const store = window.ReAttemptStore;
  const profile = store.getCurrentProfile();
  if (!profile) {
    window.location.replace("login.html");
    return;
  }

  let student = profile;
  let subjects = store.getList("backlogs").filter((item) => item && typeof item.id === "string" && typeof item.name === "string");
  let tasks = store.getList("tasks").filter((item) => item && typeof item.id === "string" && typeof item.title === "string");
  let materials = store.getList("materials").filter((item) => item && typeof item.id === "string" && typeof item.title === "string");
  let preferences = store.getPreferences();
  let materialType = "all";
  let toastTimer;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  const subjectById = (id) => subjects.find((subject) => subject.id === id);
  const pad = (value) => String(value).padStart(2, "0");
  const dateStamp = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const dayStamp = (offset = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return dateStamp(date);
  };
  const dateLabel = (stamp, options = { month: "short", day: "numeric" }) => {
    if (!stamp) return "—";
    const date = new Date(`${stamp}T00:00:00`);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, options);
  };
  const timeLabel = (time) => {
    if (!time || !/^\d{2}:\d{2}$/.test(time)) return "—";
    const [hour, minute] = time.split(":").map(Number);
    return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };
  const taskMinutes = (task) => {
    const start = String(task.start || "").split(":").map(Number);
    const end = String(task.end || "").split(":").map(Number);
    if (start.length !== 2 || end.length !== 2 || start.some(Number.isNaN) || end.some(Number.isNaN)) return 0;
    return Math.max(0, end[0] * 60 + end[1] - start[0] * 60 - start[1]);
  };
  const durationLabel = (task) => {
    const minutes = taskMinutes(task);
    return `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ""}`.trim();
  };
  const statusClass = (status) => ({
    "Planned": "status-planned",
    "In progress": "status-in-progress",
    "Completed": "status-completed",
    "Not started": "status-not-started"
  })[status] || "status-not-started";
  const safeHttpUrl = (value) => {
    try {
      const url = new URL(String(value || ""));
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };
  const initials = (name) => String(name || "Student").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
  const firstName = () => String(student.fullName || "Student").trim().split(/\s+/)[0];

  function showToast(message) {
    const toast = $("#dashboard-toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
  }

  function persistList(key, value) {
    if (!store.saveList(key, value)) {
      showToast("Could not save your changes. Check browser storage and try again.");
      return false;
    }
    return true;
  }

  function averageProgress() {
    return subjects.length
      ? Math.round(subjects.reduce((sum, subject) => sum + Math.min(100, Math.max(0, Number(subject.progress) || 0)), 0) / subjects.length)
      : 0;
  }

  function completedHours(list = tasks) {
    return list.filter((task) => task.status === "Completed").reduce((sum, task) => sum + taskMinutes(task), 0) / 60;
  }

  function weekDates() {
    const today = new Date();
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return dateStamp(date);
    });
  }

  function updateStats() {
    const completedSubjects = subjects.filter((subject) => subject.status === "Completed" || Number(subject.progress) >= 100).length;
    const percent = averageProgress();
    const totalHours = completedHours();
    const currentWeek = weekDates();
    const weeklyHours = completedHours(tasks.filter((task) => currentWeek.includes(task.date)));
    const stats = {
      subjects: subjects.length,
      completed: completedSubjects,
      remaining: subjects.length - completedSubjects,
      "completed-tasks": tasks.filter((task) => task.status === "Completed").length,
      hours: totalHours.toFixed(1),
      "weekly-hours": weeklyHours.toFixed(1)
    };
    $$("[data-stat]").forEach((element) => {
      const value = stats[element.dataset.stat];
      if (value !== undefined) element.textContent = value;
    });
    $$("[data-overall-percent]").forEach((element) => { element.textContent = `${percent}%`; });
    $$("[data-overall-bar]").forEach((element) => { element.style.width = `${percent}%`; });
    const ring = $("#progress-ring");
    if (ring) ring.style.background = `conic-gradient(var(--dash-red) 0 ${percent}%, #f2e8e7 ${percent}% 100%)`;
    $$("[data-progress]").forEach((element) => { element.textContent = `${percent}%`; });
  }

  function renderProfile() {
    const name = student.fullName || "Student";
    $$("[data-student-initials]").forEach((element) => { element.textContent = initials(name); });
    const firstNameElement = $("[data-student-first-name]");
    if (firstNameElement) firstNameElement.textContent = firstName();
    const profileFields = {
      "#profile-name": name,
      "#profile-email": student.email || "",
      "#profile-college": student.college || "Not specified",
      "#profile-course": student.course || "Not specified",
      "#profile-department": student.department || "Not specified",
      "#profile-year": student.year || "Not specified",
      "#profile-semester": student.semester || "Not specified",
      "#settings-account-name": name,
      "#settings-account-email": student.email || ""
    };
    Object.entries(profileFields).forEach(([selector, value]) => {
      const element = $(selector);
      if (element) element.textContent = value;
    });
  }

  function renderBacklogs() {
    const query = $("#backlog-search").value.trim().toLowerCase();
    const semester = $("#backlog-semester-filter").value;
    const status = $("#backlog-status-filter").value;
    const filtered = subjects.filter((subject) => {
      const matchText = `${subject.name} ${subject.code} ${subject.semester}`.toLowerCase().includes(query);
      return matchText && (semester === "all" || subject.semester === semester) && (status === "all" || subject.status === status);
    });
    $("#backlog-rows").innerHTML = filtered.length ? filtered.map((subject) => `
      <tr>
        <td><div class="subject-cell"><span class="subject-avatar">${escapeHTML(String(subject.code || subject.name).slice(0, 2))}</span><span><strong>${escapeHTML(subject.name)}${subject.sample ? ' <small class="sample-label">SAMPLE</small>' : ""}</strong><small>${escapeHTML(subject.code || "")}</small></span></div></td>
        <td>${escapeHTML(subject.semester || "—")}</td>
        <td>${escapeHTML(subject.attempts ?? 1)}</td>
        <td><span class="status-pill ${statusClass(subject.status)}">${escapeHTML(subject.status || "Not started")}</span></td>
        <td><div class="table-progress"><span>${Math.round(Number(subject.progress) || 0)}% <span>${Number(subject.progress) >= 100 ? "Done" : "Complete"}</span></span><div class="progress-track"><i style="width:${Math.min(100, Math.max(0, Number(subject.progress) || 0))}%"></i></div></div></td>
        <td>${escapeHTML(dateLabel(subject.examDate))}</td>
        <td><div class="row-actions"><button class="row-action" type="button" data-edit-subject="${escapeHTML(subject.id)}" aria-label="Edit ${escapeHTML(subject.name)}">✎</button><button class="row-action delete" type="button" data-delete-subject="${escapeHTML(subject.id)}" aria-label="Delete ${escapeHTML(subject.name)}">×</button></div></td>
      </tr>`).join("") : `<tr><td class="empty-row" colspan="7">${subjects.length ? "No subjects match those filters." : "No backlog subjects yet. Add a subject to start your plan."}</td></tr>`;
    $$("[data-edit-subject]", $("#backlog-rows")).forEach((button) => button.addEventListener("click", () => openSubjectDialog(button.dataset.editSubject)));
    $$("[data-delete-subject]", $("#backlog-rows")).forEach((button) => button.addEventListener("click", () => deleteSubject(button.dataset.deleteSubject)));
  }

  function renderSubjectOptions(selectedTaskSubject, selectedMaterialSubject) {
    const taskSelect = $("#task-subject-select");
    const materialSelect = $("#material-subject-select");
    const taskValue = selectedTaskSubject || taskSelect.value;
    const materialValue = selectedMaterialSubject || materialSelect.value;
    const options = subjects.map((subject) => `<option value="${escapeHTML(subject.id)}">${escapeHTML(subject.name)}</option>`).join("");
    taskSelect.innerHTML = options;
    materialSelect.innerHTML = options;
    if (subjects.some((subject) => subject.id === taskValue)) taskSelect.value = taskValue;
    if (subjects.some((subject) => subject.id === materialValue)) materialSelect.value = materialValue;

    const taskFilter = $("#task-subject-filter");
    const taskFilterValue = taskFilter.value;
    taskFilter.innerHTML = '<option value="all">All subjects</option>' + options;
    taskFilter.value = taskFilterValue === "all" || subjects.some((subject) => subject.id === taskFilterValue) ? taskFilterValue : "all";
    const materialFilter = $("#material-filter");
    const filterValue = materialFilter.value;
    materialFilter.innerHTML = '<option value="all">All subjects</option>' + options;
    materialFilter.value = filterValue === "all" || subjects.some((subject) => subject.id === filterValue) ? filterValue : "all";
  }

  function renderUpcoming() {
    const upcoming = tasks.filter((task) => task.status !== "Completed" && task.date >= dayStamp()).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)).slice(0, 3);
    $("#overview-upcoming-list").innerHTML = upcoming.length ? upcoming.map((task) => {
      const subject = subjectById(task.subjectId);
      const today = task.date === dayStamp();
      const day = today ? "TODAY" : dateLabel(task.date, { weekday: "short" }).toUpperCase();
      return `<div class="upcoming-item"><div class="upcoming-date"><strong>${today ? "•" : escapeHTML(new Date(`${task.date}T00:00:00`).getDate())}</strong><span>${escapeHTML(day)}</span></div><div class="upcoming-detail"><strong>${escapeHTML(task.title)}</strong><span>${escapeHTML(subject ? subject.name : "Study session")} · ${escapeHTML(dateLabel(task.date))}</span></div><span class="upcoming-time">${escapeHTML(timeLabel(task.start))}</span></div>`;
    }).join("") : '<p class="topic-empty">No upcoming tasks yet. Add a study task to get started.</p>';
    const todayCount = tasks.filter((task) => task.date === dayStamp() && task.status !== "Completed").length;
    $("#planner-today-label").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    $("#planner-today-summary").textContent = todayCount ? `${todayCount} study session${todayCount === 1 ? "" : "s"} planned today.` : "No sessions planned today yet. You can start with one small block.";
  }

  function renderActivities() {
    const recent = [...tasks].sort((a, b) => `${b.date}${b.start}`.localeCompare(`${a.date}${a.start}`)).slice(0, 3);
    $("#recent-activity-list").innerHTML = recent.length ? recent.map((task) => {
      const subject = subjectById(task.subjectId);
      const activity = task.status === "Completed" ? "Completed a study session" : "Planned a study session";
      return `<div class="activity-item"><span class="activity-marker">${task.status === "Completed" ? "✓" : "◷"}</span><div><p><strong>${escapeHTML(activity)}</strong> for ${escapeHTML(subject ? subject.name : task.title)}</p><small>${escapeHTML(dateLabel(task.date, { month: "short", day: "numeric" }))} · ${escapeHTML(task.status)}</small></div></div>`;
    }).join("") : '<p class="topic-empty">Your recent study activity will appear here.</p>';
  }

  function renderTimetable() {
    const days = weekDates();
    $("#week-range").textContent = `${dateLabel(days[0])} – ${dateLabel(days[6])}`;
    $("#weekly-timetable").innerHTML = days.map((stamp) => {
      const date = new Date(`${stamp}T00:00:00`);
      const events = tasks.filter((task) => task.date === stamp).sort((a, b) => a.start.localeCompare(b.start));
      const isToday = stamp === dayStamp();
      return `<div class="timetable-day${isToday ? " is-today" : ""}"><strong>${date.toLocaleDateString(undefined, { weekday: "short" })}</strong><span class="timetable-date">${date.getDate()}</span>${events.map((task) => `<span class="timetable-event" title="${escapeHTML(task.title)}">${escapeHTML(task.title)}<span>${escapeHTML(timeLabel(task.start))}${task.status === "Completed" ? " · done" : ""}</span></span>`).join("")}</div>`;
    }).join("");
  }

  function renderTaskRows() {
    const status = $("#task-status-filter").value;
    const subjectId = $("#task-subject-filter").value;
    const date = $("#task-date-filter").value;
    const filtered = [...tasks].filter((task) =>
      (status === "all" || task.status === status)
      && (subjectId === "all" || task.subjectId === subjectId)
      && (!date || task.date === date)
    ).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
    $("#task-rows").innerHTML = filtered.length ? filtered.map((task) => {
      const subject = subjectById(task.subjectId);
      const toggleLabel = task.status === "Completed" ? "Mark as not completed" : "Mark task completed";
      return `<tr><td><div class="task-title"><strong>${escapeHTML(task.title)}${task.sample ? ' <small class="sample-label">SAMPLE</small>' : ""}</strong><small>${escapeHTML(subject ? subject.name : "Subject removed")}</small></div></td><td>${escapeHTML(dateLabel(task.date, { month: "short", day: "numeric", year: "numeric" }))}</td><td>${escapeHTML(timeLabel(task.start))} – ${escapeHTML(timeLabel(task.end))}</td><td>${escapeHTML(durationLabel(task))}</td><td><span class="status-pill ${statusClass(task.status)}">${escapeHTML(task.status)}</span></td><td><div class="row-actions"><button class="row-action complete" type="button" data-toggle-task="${escapeHTML(task.id)}" aria-label="${toggleLabel}" title="${toggleLabel}">${task.status === "Completed" ? "↶" : "✓"}</button><button class="row-action" type="button" data-edit-task="${escapeHTML(task.id)}" aria-label="Edit ${escapeHTML(task.title)}">✎</button><button class="row-action delete" type="button" data-delete-task="${escapeHTML(task.id)}" aria-label="Delete ${escapeHTML(task.title)}">×</button></div></td></tr>`;
    }).join("") : `<tr><td class="empty-row" colspan="6">${tasks.length ? "No study tasks match those filters." : "No study tasks yet. Add a session to shape your routine."}</td></tr>`;
    $$("[data-toggle-task]", $("#task-rows")).forEach((button) => button.addEventListener("click", () => toggleTask(button.dataset.toggleTask)));
    $$("[data-edit-task]", $("#task-rows")).forEach((button) => button.addEventListener("click", () => openTaskDialog(button.dataset.editTask)));
    $$("[data-delete-task]", $("#task-rows")).forEach((button) => button.addEventListener("click", () => deleteTask(button.dataset.deleteTask)));
  }

  function materialImage(material) {
    if (material.image && /^assets\/images\/[a-z0-9._-]+$/i.test(material.image)) return material.image;
    const imageByType = {
      "Notes": "assets/images/study-laptop.jpg",
      "Question paper": "assets/images/campus-students.jpg",
      "Important topics": "assets/images/student-study-group.jpg",
      "Reference": "assets/images/study-laptop.jpg"
    };
    return imageByType[material.type] || imageByType.Notes;
  }

  function renderMaterials() {
    const query = $("#material-search").value.trim().toLowerCase();
    const selectedSubject = $("#material-filter").value;
    const filtered = materials.filter((material) => {
      const subject = subjectById(material.subjectId);
      const text = `${material.title} ${material.description || ""} ${subject ? subject.name : ""}`.toLowerCase();
      return text.includes(query)
        && (selectedSubject === "all" || material.subjectId === selectedSubject)
        && (materialType === "all" || material.type === materialType);
    });
    $("#materials-grid").innerHTML = filtered.length ? filtered.map((material) => {
      const subject = subjectById(material.subjectId);
      const safeUrl = safeHttpUrl(material.url);
      const actions = material.sample
        ? '<button class="material-open" type="button" data-material-info>Sample description only · no file attached</button>'
        : `<div class="material-actions">${safeUrl ? `<a class="material-open" href="${escapeHTML(safeUrl)}" target="_blank" rel="noopener noreferrer">Open resource ↗</a>` : '<span class="material-open invalid-resource">Invalid resource URL</span>'}<button class="row-action" type="button" data-edit-material="${escapeHTML(material.id)}" aria-label="Edit ${escapeHTML(material.title)}">✎</button><button class="row-action delete" type="button" data-delete-material="${escapeHTML(material.id)}" aria-label="Delete ${escapeHTML(material.title)}">×</button></div>`;
      return `<article class="material-card"><div class="material-card-image"><img src="${escapeHTML(materialImage(material))}" alt="" loading="lazy"><span class="material-icon">${material.sample ? "▱" : "↗"}</span><span class="material-type">${escapeHTML(material.type || "Resource")}${material.sample ? " · SAMPLE" : ""}</span></div><h2>${escapeHTML(material.title)}</h2><p>${escapeHTML(material.description || (material.sample ? "Sample content only; no file is attached." : "User-added resource."))}</p><div class="material-meta"><span>${escapeHTML(subject ? subject.name : "Subject removed")}</span><span>${material.sample ? "Sample" : "Your resource"}</span></div>${actions}</article>`;
    }).join("") : `<div class="no-materials">${materials.length ? "No resources match those filters." : "No resources yet. Add a trusted link or review the sample materials."}</div>`;
    $$("[data-material-info]").forEach((button) => button.addEventListener("click", () => showToast("Sample description only; no downloadable file is attached.")));
    $$("[data-edit-material]").forEach((button) => button.addEventListener("click", () => openMaterialDialog(button.dataset.editMaterial)));
    $$("[data-delete-material]").forEach((button) => button.addEventListener("click", () => deleteMaterial(button.dataset.deleteMaterial)));
  }

  function renderProgress() {
    $("#subject-progress-list").innerHTML = subjects.length ? subjects.map((subject) => {
      const percent = Math.min(100, Math.max(0, Number(subject.progress) || 0));
      return `<div class="subject-progress-row"><span class="subject-progress-name">${escapeHTML(subject.name)}</span><div class="progress-track"><i style="width:${percent}%"></i></div><strong>${percent}%</strong></div>`;
    }).join("") : '<p class="topic-empty">Add a backlog subject to see preparation progress.</p>';
    const completed = subjects.flatMap((subject) => (Array.isArray(subject.topicsDone) ? subject.topicsDone : []).map((topic) => ({ topic, subject: subject.name })));
    const pending = subjects.flatMap((subject) => (Array.isArray(subject.topicsPending) ? subject.topicsPending : []).map((topic) => ({ topic, subject: subject.name, subjectId: subject.id })));
    $("#completed-topic-count").textContent = completed.length;
    $("#pending-topic-count").textContent = pending.length;
    $("#completed-topics").innerHTML = completed.length
      ? completed.map((item) => `<li>${escapeHTML(item.topic)} <span>· ${escapeHTML(item.subject)}</span></li>`).join("")
      : '<li class="topic-empty">Your first completed topic will show up here.</li>';
    const pendingList = $("#pending-topics");
    pendingList.classList.add("pending-topics");
    pendingList.innerHTML = pending.length
      ? pending.slice(0, 12).map((item) => `<li><button type="button" class="topic-complete" data-complete-topic="${escapeHTML(item.subjectId)}" data-topic-name="${escapeHTML(item.topic)}" aria-label="Mark ${escapeHTML(item.topic)} completed">○</button>${escapeHTML(item.topic)} <span>· ${escapeHTML(item.subject)}</span></li>`).join("")
      : '<li class="topic-empty">No pending topics right now.</li>';
    $$("[data-complete-topic]", pendingList).forEach((button) => button.addEventListener("click", () => completeTopic(button.dataset.completeTopic, button.dataset.topicName)));
  }

  function renderWeeklyCharts() {
    const dates = weekDates();
    const hoursByDate = dates.map((stamp) => completedHours(tasks.filter((task) => task.date === stamp)));
    const max = Math.max(1, ...hoursByDate);
    const today = dayStamp();
    const markup = dates.map((stamp, index) => {
      const date = new Date(`${stamp}T00:00:00`);
      const height = Math.round((hoursByDate[index] / max) * 100);
      return `<div class="chart-day${stamp === today ? " is-today" : ""}" title="${hoursByDate[index].toFixed(1)} completed hours"><div class="chart-bar-track"><i class="chart-bar" style="height:${height}%"></i></div><span>${date.toLocaleDateString(undefined, { weekday: "short" })}</span></div>`;
    }).join("");
    $("#overview-week-chart").innerHTML = markup;
    $("#progress-week-chart").innerHTML = markup;
    const weekHours = tasks.filter((task) => dates.includes(task.date));
    const total = completedHours(weekHours);
    const summary = $(".weekly-card .chart-summary strong");
    if (summary) summary.textContent = `${total.toFixed(1)} hrs completed this week`;
  }

  function renderAll() {
    renderProfile();
    renderSubjectOptions();
    renderBacklogs();
    renderTaskRows();
    renderUpcoming();
    renderActivities();
    renderTimetable();
    renderMaterials();
    renderProgress();
    renderWeeklyCharts();
    updateStats();
    $("#topbar-date").textContent = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }

  function openSubjectDialog(subjectId) {
    const form = $("#subject-form");
    form.reset();
    form.elements.id.value = "";
    const subject = subjects.find((item) => item.id === subjectId);
    $("#subject-dialog-title").textContent = subject ? "Edit subject" : "Add a subject";
    if (subject) Object.entries(subject).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value ?? ""; });
    form.querySelector("output").value = `${form.elements.progress.value}%`;
    $("#subject-dialog").showModal();
  }

  function deleteSubject(id) {
    const subject = subjectById(id);
    if (!subject || !window.confirm(`Delete "${subject.name}" and its linked tasks and resources?`)) return;
    const nextSubjects = subjects.filter((item) => item.id !== id);
    const nextTasks = tasks.filter((item) => item.subjectId !== id);
    const nextMaterials = materials.filter((item) => item.subjectId !== id);
    if (!persistList("backlogs", nextSubjects) || !persistList("tasks", nextTasks) || !persistList("materials", nextMaterials)) return;
    subjects = nextSubjects;
    tasks = nextTasks;
    materials = nextMaterials;
    renderAll();
    showToast(`${subject.name} and its linked demo items were deleted.`);
  }

  function openTaskDialog(taskId) {
    if (!subjects.length) {
      showToast("Add a backlog subject before creating a study task.");
      openView("backlogs");
      return;
    }
    const form = $("#task-form");
    form.reset();
    form.elements.id.value = "";
    renderSubjectOptions();
    const task = tasks.find((item) => item.id === taskId);
    $("#task-dialog-title").textContent = task ? "Edit study task" : "Add a study task";
    if (task) {
      Object.entries(task).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value ?? ""; });
      form.elements.subject.value = task.subjectId;
    } else {
      form.elements.date.value = dayStamp();
      form.elements.start.value = "09:00";
      form.elements.end.value = "10:00";
    }
    $("#task-time-error").textContent = "";
    $("#task-dialog").showModal();
  }

  function deleteTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task || !window.confirm(`Delete the study task "${task.title}"?`)) return;
    const next = tasks.filter((item) => item.id !== id);
    if (!persistList("tasks", next)) return;
    tasks = next;
    renderAll();
    showToast("Study task deleted.");
  }

  function toggleTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const next = tasks.map((item) => item.id === id
      ? { ...item, status: item.status === "Completed" ? "Planned" : "Completed" }
      : item);
    if (!persistList("tasks", next)) return;
    tasks = next;
    renderAll();
    showToast(task.status === "Completed" ? "Study task marked as planned." : "Nice work — study task completed.");
  }

  function completeTopic(subjectId, topicName) {
    const subject = subjectById(subjectId);
    if (!subject || !Array.isArray(subject.topicsPending) || !subject.topicsPending.includes(topicName)) return;
    const topicCount = Math.max(1, subject.topicsPending.length + (Array.isArray(subject.topicsDone) ? subject.topicsDone.length : 0));
    const progress = Math.min(100, Math.round((Number(subject.progress) || 0) + 100 / topicCount));
    const nextSubjects = subjects.map((item) => item.id === subjectId ? {
      ...item,
      topicsPending: item.topicsPending.filter((topic) => topic !== topicName),
      topicsDone: [...(Array.isArray(item.topicsDone) ? item.topicsDone : []), topicName],
      progress,
      status: progress >= 100 ? "Completed" : "In progress"
    } : item);
    if (!persistList("backlogs", nextSubjects)) return;
    subjects = nextSubjects;
    renderAll();
    showToast(`"${topicName}" marked complete.`);
  }

  function openMaterialDialog(materialId) {
    if (!subjects.length) {
      showToast("Add a backlog subject before adding a study resource.");
      openView("backlogs");
      return;
    }
    const form = $("#material-form");
    form.reset();
    form.elements.id.value = "";
    renderSubjectOptions();
    const material = materials.find((item) => item.id === materialId);
    $("#material-dialog-title").textContent = material ? "Edit resource" : "Add a resource";
    $("#material-url-error").textContent = "";
    if (material) {
      form.elements.id.value = material.id;
      form.elements.title.value = material.title;
      form.elements.subjectId.value = material.subjectId;
      form.elements.type.value = material.type;
      form.elements.url.value = material.url || "";
      form.elements.description.value = material.description || "";
    }
    $("#material-dialog").showModal();
  }

  function deleteMaterial(id) {
    const material = materials.find((item) => item.id === id);
    if (!material || !window.confirm(`Delete the resource "${material.title}"?`)) return;
    const next = materials.filter((item) => item.id !== id);
    if (!persistList("materials", next)) return;
    materials = next;
    renderMaterials();
    showToast("Resource deleted.");
  }

  function openView(viewName) {
    const view = $(`[data-view="${viewName}"]`);
    const link = $(`[data-view-target="${viewName}"]`);
    if (!view) return;
    $$(".view-panel").forEach((panel) => {
      const selected = panel === view;
      panel.hidden = !selected;
      panel.classList.toggle("is-visible", selected);
    });
    $$(".sidebar-link[data-view-target]").forEach((item) => {
      const selected = item.dataset.viewTarget === viewName;
      item.classList.toggle("is-active", selected);
      if (selected) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
    $("#active-view-title").textContent = link ? link.dataset.title : viewName;
    closeSidebar();
    if (viewName === "progress") renderProgress();
  }

  function openProfileDialog() {
    const form = $("#profile-form");
    Object.entries(student).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value ?? ""; });
    $("#profile-dialog").showModal();
  }

  function applyTheme() {
    document.body.dataset.theme = preferences.theme === "dark" ? "dark" : "light";
    const darkToggle = $('[name="darkTheme"]');
    if (darkToggle) darkToggle.checked = preferences.theme === "dark";
  }

  function applyPreferences() {
    $('[name="studyReminders"]').checked = Boolean(preferences.studyReminders);
    $('[name="weeklyRecap"]').checked = Boolean(preferences.weeklyRecap);
    applyTheme();
  }

  function closeSidebar() {
    $("#app-sidebar").classList.remove("is-open");
    $("#sidebar-backdrop").classList.remove("is-visible");
    $("#mobile-menu-toggle").setAttribute("aria-expanded", "false");
  }

  function logout() {
    store.logout();
    window.location.href = "login.html?loggedout=1";
  }

  function bindEvents() {
    $$("[data-view-target]").forEach((button) => button.addEventListener("click", () => openView(button.dataset.viewTarget)));
    $$("[data-open-view]").forEach((button) => button.addEventListener("click", () => openView(button.dataset.openView)));
    $$("[data-logout]").forEach((button) => button.addEventListener("click", logout));
    $("#mobile-menu-toggle").addEventListener("click", () => {
      const sidebar = $("#app-sidebar");
      const isOpen = sidebar.classList.toggle("is-open");
      $("#sidebar-backdrop").classList.toggle("is-visible", isOpen);
      $("#mobile-menu-toggle").setAttribute("aria-expanded", String(isOpen));
    });
    $("#sidebar-backdrop").addEventListener("click", closeSidebar);
    $("#add-subject-button").addEventListener("click", () => openSubjectDialog());
    $("#add-task-button").addEventListener("click", () => openTaskDialog());
    $("#add-material-button").addEventListener("click", () => openMaterialDialog());
    $("#backlog-search").addEventListener("input", renderBacklogs);
    $("#backlog-semester-filter").addEventListener("change", renderBacklogs);
    $("#backlog-status-filter").addEventListener("change", renderBacklogs);
    $("#task-status-filter").addEventListener("change", renderTaskRows);
    $("#task-subject-filter").addEventListener("change", renderTaskRows);
    $("#task-date-filter").addEventListener("change", renderTaskRows);
    $("#material-search").addEventListener("input", renderMaterials);
    $("#material-filter").addEventListener("change", renderMaterials);
    $$("[data-material-type]").forEach((button) => button.addEventListener("click", () => {
      materialType = button.dataset.materialType;
      $$("[data-material-type]").forEach((item) => item.classList.toggle("is-selected", item === button));
      renderMaterials();
    }));
    $("#focus-today-button").addEventListener("click", () => {
      $("#task-date-filter").value = dayStamp();
      $("#task-status-filter").value = "all";
      $("#task-subject-filter").value = "all";
      renderTaskRows();
      openView("planner");
    });
    $("#edit-profile-button").addEventListener("click", openProfileDialog);
    $("#subject-form").elements.progress.addEventListener("input", (event) => {
      event.currentTarget.parentElement.querySelector("output").value = `${event.currentTarget.value}%`;
    });

    $("#subject-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const id = String(data.get("id") || "");
      const code = String(data.get("code")).trim();
      const duplicate = subjects.some((subject) => subject.id !== id && String(subject.code || "").toLowerCase() === code.toLowerCase());
      if (duplicate) {
        showToast("A subject with that code is already on your list.");
        return;
      }
      let progress = Number(data.get("progress"));
      let status = String(data.get("status"));
      if (status === "Completed") progress = 100;
      if (progress === 100) status = "Completed";
      const subject = {
        id: id || store.makeId("subject"),
        name: String(data.get("name")).trim(),
        code,
        semester: String(data.get("semester")),
        attempts: Number(data.get("attempts")),
        status,
        progress,
        examDate: String(data.get("examDate") || ""),
        topicsDone: id ? (subjectById(id).topicsDone || []) : [],
        topicsPending: id ? (subjectById(id).topicsPending || []) : [],
        sample: false
      };
      const next = id ? subjects.map((item) => item.id === id ? subject : item) : [...subjects, subject];
      if (!persistList("backlogs", next)) return;
      subjects = next;
      $("#subject-dialog").close();
      renderAll();
      showToast(id ? "Subject details saved." : "Subject added to your backlogs.");
    });

    $("#task-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const id = String(data.get("id") || "");
      const start = String(data.get("start"));
      const end = String(data.get("end"));
      if (end <= start) {
        $("#task-time-error").textContent = "End time must be later than start time.";
        return;
      }
      const title = String(data.get("title")).trim();
      const subjectId = String(data.get("subject"));
      const date = String(data.get("date"));
      const duplicate = tasks.some((task) => task.id !== id && task.subjectId === subjectId && task.date === date && task.start === start && task.title.toLowerCase() === title.toLowerCase());
      if (duplicate) {
        $("#task-time-error").textContent = "That study task is already on your planner.";
        return;
      }
      const task = { id: id || store.makeId("task"), title, subjectId, date, start, end, status: String(data.get("status")), sample: false };
      const next = id ? tasks.map((item) => item.id === id ? task : item) : [...tasks, task];
      if (!persistList("tasks", next)) return;
      tasks = next;
      $("#task-dialog").close();
      renderAll();
      showToast(id ? "Study task updated." : "Study task added.");
    });

    $("#material-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const urlText = String(data.get("url")).trim();
      let url;
      try {
        url = new URL(urlText);
      } catch {
        $("#material-url-error").textContent = "Enter a valid http or https web address.";
        return;
      }
      if (!["http:", "https:"].includes(url.protocol)) {
        $("#material-url-error").textContent = "Only http and https resource links are allowed.";
        return;
      }
      const id = String(data.get("id") || "");
      const duplicate = materials.some((material) => material.id !== id && material.url && material.url.toLowerCase() === url.href.toLowerCase());
      if (duplicate) {
        $("#material-url-error").textContent = "That resource link is already saved.";
        return;
      }
      const material = {
        id: id || store.makeId("material"),
        title: String(data.get("title")).trim(),
        subjectId: String(data.get("subjectId")),
        type: String(data.get("type")),
        url: url.href,
        description: String(data.get("description") || "").trim(),
        sample: false
      };
      const next = id ? materials.map((item) => item.id === id ? material : item) : [...materials, material];
      if (!persistList("materials", next)) return;
      materials = next;
      $("#material-dialog").close();
      renderMaterials();
      showToast(id ? "Resource updated." : "Resource saved.");
    });

    $("#profile-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const updated = { ...student };
      ["fullName", "email", "college", "course", "department", "year", "semester"].forEach((key) => {
        updated[key] = String(data.get(key)).trim();
      });
      updated.email = updated.email.toLowerCase();
      const credentials = store.getCredentials();
      const currentEmail = student.email.toLowerCase();
      if (updated.email !== currentEmail && store.getProfile() && store.getProfile().email.toLowerCase() !== currentEmail) {
        showToast("Could not verify the saved account profile. Reload and try again.");
        return;
      }
      const emailChanged = credentials && updated.email !== credentials.email;
      if (emailChanged) {
        credentials.email = updated.email;
        if (!store.saveCredentials(credentials)) {
          showToast("Could not update the saved demo email address.");
          return;
        }
      }
      if (!store.saveProfile(updated)) {
        if (emailChanged) store.saveCredentials({ ...credentials, email: currentEmail });
        showToast("Could not save your profile in browser storage.");
        return;
      }
      student = updated;
      $("#profile-dialog").close();
      renderProfile();
      showToast("Profile details updated.");
    });

    $("#change-password-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      if (form.elements.newPassword.value !== form.elements.confirmPassword.value) {
        form.elements.confirmPassword.setCustomValidity("Passwords do not match.");
        form.reportValidity();
        form.elements.confirmPassword.setCustomValidity("");
        return;
      }
      const credentials = store.getCredentials();
      if (!credentials) {
        showToast("No saved demo credential was found. Sign out and create an account again.");
        return;
      }
      try {
        const salt = store.createSalt();
        const passwordHash = await store.hashPassword(form.elements.newPassword.value, salt);
        if (!store.saveCredentials({ ...credentials, salt, passwordHash, iterations: 120000, algorithm: "PBKDF2-SHA-256" })) {
          showToast("Could not save the updated demo credential.");
          return;
        }
        form.reset();
        showToast("Demo password updated. No plaintext password was saved.");
      } catch (error) {
        showToast(error.message || "Could not update the demo password.");
      }
    });

    $$("[name='studyReminders'], [name='weeklyRecap'], [name='darkTheme']").forEach((input) => input.addEventListener("change", () => {
      const next = {
        ...preferences,
        studyReminders: $('[name="studyReminders"]').checked,
        weeklyRecap: $('[name="weeklyRecap"]').checked,
        theme: $('[name="darkTheme"]').checked ? "dark" : "light"
      };
      if (!store.savePreferences(next)) {
        applyPreferences();
        showToast("Could not save this preference.");
        return;
      }
      preferences = next;
      applyTheme();
      showToast("Preference saved in this browser.");
    }));

    $("#clear-demo-data-button").addEventListener("click", () => {
      if (!window.confirm("Clear all ReAttempt demo data from this browser? This removes the profile, login session, subjects, tasks, resources, and preferences.")) return;
      if (!store.clearDemoData()) {
        showToast("Could not clear the demo data. Check browser storage settings.");
        return;
      }
      window.location.href = "login.html?cleared=1";
    });

    $$("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
    $$("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    }));
  }

  function refreshFromStorage(event) {
    if (event && event.key && !event.key.startsWith("reattempt_")) return;
    const currentProfile = store.getCurrentProfile();
    if (!currentProfile) {
      window.location.replace("login.html");
      return;
    }
    student = currentProfile;
    subjects = store.getList("backlogs").filter((item) => item && typeof item.id === "string" && typeof item.name === "string");
    tasks = store.getList("tasks").filter((item) => item && typeof item.id === "string" && typeof item.title === "string");
    materials = store.getList("materials").filter((item) => item && typeof item.id === "string" && typeof item.title === "string");
    preferences = store.getPreferences();
    applyPreferences();
    renderAll();
  }

  $$("[data-current-year]").forEach((element) => { element.textContent = new Date().getFullYear(); });
  applyPreferences();
  bindEvents();
  renderAll();
  window.addEventListener("storage", refreshFromStorage);
})();
