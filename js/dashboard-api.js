(function () {
  const api = window.ReAttemptApi;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
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

  let student;
  let subjects = [];
  let tasks = [];
  let materials = [];
  let preferences = { theme: "light", studyReminders: true, weeklyRecap: true };
  let progress = { stats: {}, weekly: [], subjects: [] };
  let materialType = "all";
  let toastTimer;

  function showToast(message) {
    const toast = $("#dashboard-toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }

  function subjectById(id) {
    return subjects.find((subject) => String(subject.id) === String(id));
  }

  function initials(name) {
    return String(name || "Student").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
  }

  function firstName() {
    return String(student.fullName || "Student").trim().split(/\s+/)[0];
  }

  function updateStats() {
    const stats = progress.stats || {};
    const values = {
      subjects: stats.totalSubjects || 0,
      completed: stats.completedSubjects || 0,
      remaining: stats.pendingSubjects || 0,
      "completed-tasks": stats.completedTasks || 0,
      hours: Number(stats.totalStudyHours || 0).toFixed(1),
      "weekly-hours": Number(stats.weeklyStudyHours || 0).toFixed(1)
    };
    $$("[data-stat]").forEach((element) => {
      const value = values[element.dataset.stat];
      if (value !== undefined) element.textContent = value;
    });
    const percent = Number(stats.overallPreparation || 0);
    $$("[data-overall-percent]").forEach((element) => { element.textContent = `${percent}%`; });
    $$("[data-overall-bar]").forEach((element) => { element.style.width = `${percent}%`; });
    const ring = $("#progress-ring");
    if (ring) ring.style.background = `conic-gradient(var(--dash-red) 0 ${percent}%, #f2e8e7 ${percent}% 100%)`;
    $$("[data-progress]").forEach((element) => { element.textContent = `${percent}%`; });
  }

  function renderProfile() {
    const name = student.fullName || "Student";
    $$("[data-student-initials]").forEach((element) => { element.textContent = initials(name); });
    const greeting = $("[data-student-first-name]");
    if (greeting) greeting.textContent = firstName();
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
        <td><div class="row-actions"><button class="row-action" type="button" data-edit-subject="${subject.id}" aria-label="Edit ${escapeHTML(subject.name)}">✎</button><button class="row-action delete" type="button" data-delete-subject="${subject.id}" aria-label="Delete ${escapeHTML(subject.name)}">×</button></div></td>
      </tr>`).join("") : `<tr><td class="empty-row" colspan="7">${subjects.length ? "No subjects match those filters." : "No backlog subjects yet. Add a subject to start your plan."}</td></tr>`;
    $$("[data-edit-subject]", $("#backlog-rows")).forEach((button) => button.addEventListener("click", () => openSubjectDialog(button.dataset.editSubject)));
    $$("[data-delete-subject]", $("#backlog-rows")).forEach((button) => button.addEventListener("click", () => deleteSubject(button.dataset.deleteSubject)));
  }

  function renderSubjectOptions() {
    const selects = ["#task-subject-select", "#material-subject-select"];
    const options = subjects.map((subject) => `<option value="${subject.id}">${escapeHTML(subject.name)}</option>`).join("");
    selects.forEach((selector) => {
      const select = $(selector);
      const value = select.value;
      select.innerHTML = options;
      if (subjects.some((subject) => String(subject.id) === value)) select.value = value;
    });
    ["#task-subject-filter", "#material-filter"].forEach((selector) => {
      const filter = $(selector);
      const value = filter.value;
      filter.innerHTML = '<option value="all">All subjects</option>' + options;
      filter.value = value === "all" || subjects.some((subject) => String(subject.id) === value) ? value : "all";
    });
  }

  function renderUpcoming() {
    const upcoming = tasks.filter((task) => task.status !== "Completed" && task.date >= dayStamp())
      .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)).slice(0, 3);
    $("#overview-upcoming-list").innerHTML = upcoming.length ? upcoming.map((task) => {
      const subject = subjectById(task.subjectId);
      const today = task.date === dayStamp();
      const day = today ? "TODAY" : dateLabel(task.date, { weekday: "short" }).toUpperCase();
      return `<div class="upcoming-item"><div class="upcoming-date"><strong>${today ? "•" : escapeHTML(new Date(`${task.date}T00:00:00`).getDate())}</strong><span>${escapeHTML(day)}</span></div><div class="upcoming-detail"><strong>${escapeHTML(task.title)}</strong><span>${escapeHTML(subject ? subject.name : task.subject || "Study session")} · ${escapeHTML(dateLabel(task.date))}</span></div><span class="upcoming-time">${escapeHTML(timeLabel(task.start))}</span></div>`;
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
      return `<div class="activity-item"><span class="activity-marker">${task.status === "Completed" ? "✓" : "◷"}</span><div><p><strong>${escapeHTML(activity)}</strong> for ${escapeHTML(subject ? subject.name : task.subject || task.title)}</p><small>${escapeHTML(dateLabel(task.date, { month: "short", day: "numeric" }))} · ${escapeHTML(task.status)}</small></div></div>`;
    }).join("") : '<p class="topic-empty">Your recent study activity will appear here.</p>';
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

  function renderTimetable() {
    const days = weekDates();
    $("#week-range").textContent = `${dateLabel(days[0])} – ${dateLabel(days[6])}`;
    $("#weekly-timetable").innerHTML = days.map((stamp) => {
      const date = new Date(`${stamp}T00:00:00`);
      const events = tasks.filter((task) => task.date === stamp).sort((a, b) => a.start.localeCompare(b.start));
      return `<div class="timetable-day${stamp === dayStamp() ? " is-today" : ""}"><strong>${date.toLocaleDateString(undefined, { weekday: "short" })}</strong><span class="timetable-date">${date.getDate()}</span>${events.map((task) => `<span class="timetable-event" title="${escapeHTML(task.title)}">${escapeHTML(task.title)}<span>${escapeHTML(timeLabel(task.start))}${task.status === "Completed" ? " · done" : ""}</span></span>`).join("")}</div>`;
    }).join("");
  }

  function renderTaskRows() {
    const status = $("#task-status-filter").value;
    const subjectId = $("#task-subject-filter").value;
    const date = $("#task-date-filter").value;
    const filtered = [...tasks].filter((task) =>
      (status === "all" || task.status === status)
      && (subjectId === "all" || String(task.subjectId) === subjectId)
      && (!date || task.date === date)
    ).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
    $("#task-rows").innerHTML = filtered.length ? filtered.map((task) => {
      const subject = subjectById(task.subjectId);
      const toggleLabel = task.status === "Completed" ? "Mark as not completed" : "Mark task completed";
      const duration = Number(task.durationMinutes) || 0;
      return `<tr><td><div class="task-title"><strong>${escapeHTML(task.title)}${task.sample ? ' <small class="sample-label">SAMPLE</small>' : ""}</strong><small>${escapeHTML(subject ? subject.name : task.subject || "Subject removed")}</small></div></td><td>${escapeHTML(dateLabel(task.date, { month: "short", day: "numeric", year: "numeric" }))}</td><td>${escapeHTML(timeLabel(task.start))} – ${escapeHTML(timeLabel(task.end))}</td><td>${Math.floor(duration / 60)}h ${duration % 60 ? `${duration % 60}m` : ""}</td><td><span class="status-pill ${statusClass(task.status)}">${escapeHTML(task.status)}</span></td><td><div class="row-actions"><button class="row-action complete" type="button" data-toggle-task="${task.id}" aria-label="${toggleLabel}" title="${toggleLabel}">${task.status === "Completed" ? "↶" : "✓"}</button><button class="row-action" type="button" data-edit-task="${task.id}" aria-label="Edit ${escapeHTML(task.title)}">✎</button><button class="row-action delete" type="button" data-delete-task="${task.id}" aria-label="Delete ${escapeHTML(task.title)}">×</button></div></td></tr>`;
    }).join("") : `<tr><td class="empty-row" colspan="6">${tasks.length ? "No study tasks match those filters." : "No study tasks yet. Add a session to shape your routine."}</td></tr>`;
    $$("[data-toggle-task]", $("#task-rows")).forEach((button) => button.addEventListener("click", () => toggleTask(button.dataset.toggleTask)));
    $$("[data-edit-task]", $("#task-rows")).forEach((button) => button.addEventListener("click", () => openTaskDialog(button.dataset.editTask)));
    $$("[data-delete-task]", $("#task-rows")).forEach((button) => button.addEventListener("click", () => deleteTask(button.dataset.deleteTask)));
  }

  function materialImage(material) {
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
      const subjectName = subject ? subject.name : material.subject || "";
      const text = `${material.title} ${material.description || ""} ${subjectName}`.toLowerCase();
      return text.includes(query)
        && (selectedSubject === "all" || String(material.subjectId) === selectedSubject)
        && (materialType === "all" || material.type === materialType);
    });
    $("#materials-grid").innerHTML = filtered.length ? filtered.map((material) => {
      const subject = subjectById(material.subjectId);
      const safeUrl = safeHttpUrl(material.url);
      const actions = material.sample
        ? '<button class="material-open" type="button" data-material-info>Sample description only · no file attached</button>'
        : `<div class="material-actions">${safeUrl ? `<a class="material-open" href="${escapeHTML(safeUrl)}" target="_blank" rel="noopener noreferrer">Open resource ↗</a>` : '<span class="material-open invalid-resource">Invalid resource URL</span>'}<button class="row-action" type="button" data-edit-material="${material.id}" aria-label="Edit ${escapeHTML(material.title)}">✎</button><button class="row-action delete" type="button" data-delete-material="${material.id}" aria-label="Delete ${escapeHTML(material.title)}">×</button></div>`;
      return `<article class="material-card"><div class="material-card-image"><img src="${materialImage(material)}" alt="" loading="lazy"><span class="material-icon">${material.sample ? "▱" : "↗"}</span><span class="material-type">${escapeHTML(material.type || "Resource")}${material.sample ? " · SAMPLE" : ""}</span></div><h2>${escapeHTML(material.title)}</h2><p>${escapeHTML(material.description || (material.sample ? "Sample content only; no file is attached." : "User-added resource."))}</p><div class="material-meta"><span>${escapeHTML(subject ? subject.name : material.subject || "Subject removed")}</span><span>${material.sample ? "Sample" : "Your resource"}</span></div>${actions}</article>`;
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
      ? pending.slice(0, 12).map((item) => `<li><button type="button" class="topic-complete" data-complete-topic="${item.subjectId}" data-topic-name="${escapeHTML(item.topic)}" aria-label="Mark ${escapeHTML(item.topic)} completed">○</button>${escapeHTML(item.topic)} <span>· ${escapeHTML(item.subject)}</span></li>`).join("")
      : '<li class="topic-empty">No pending topics right now.</li>';
    $$("[data-complete-topic]", pendingList).forEach((button) => button.addEventListener("click", () => completeTopic(button.dataset.completeTopic, button.dataset.topicName)));
  }

  function renderWeeklyCharts() {
    const days = progress.weekly || [];
    const max = Math.max(1, ...days.map((item) => item.minutes || 0));
    const today = dayStamp();
    const markup = days.map((item) => {
      const height = Math.round(((item.minutes || 0) / max) * 100);
      return `<div class="chart-day${item.date === today ? " is-today" : ""}" title="${(item.hours || 0).toFixed(1)} completed hours"><div class="chart-bar-track"><i class="chart-bar" style="height:${height}%"></i></div><span>${escapeHTML(item.day)}</span></div>`;
    }).join("");
    $("#overview-week-chart").innerHTML = markup;
    $("#progress-week-chart").innerHTML = markup;
    const total = Number(progress.stats?.weeklyStudyHours || 0).toFixed(1);
    const summary = $(".weekly-card .chart-summary strong");
    if (summary) summary.textContent = `${total} hrs completed this week`;
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

  async function loadData() {
    const [me, backlogResult, taskResult, materialResult, preferencesResult, progressResult] = await Promise.all([
      api.request("/api/auth/me"),
      api.request("/api/backlogs"),
      api.request("/api/tasks"),
      api.request("/api/materials"),
      api.request("/api/preferences"),
      api.request("/api/progress")
    ]);
    student = me.user;
    subjects = backlogResult.items;
    tasks = taskResult.items;
    materials = materialResult.items;
    preferences = preferencesResult.preferences;
    progress = progressResult;
    applyPreferences();
    renderAll();
  }

  async function refreshData(message) {
    try {
      await loadData();
      if (message) showToast(message);
    } catch (error) {
      showToast(error.message || "Could not load your saved information.");
    }
  }

  function openSubjectDialog(subjectId) {
    const form = $("#subject-form");
    form.reset();
    form.elements.id.value = "";
    const subject = subjects.find((item) => String(item.id) === String(subjectId));
    $("#subject-dialog-title").textContent = subject ? "Edit subject" : "Add a subject";
    if (subject) {
      ["name", "code", "semester", "attempts", "status", "progress", "examDate"].forEach((key) => {
        form.elements[key].value = subject[key] ?? "";
      });
    }
    form.elements.id.value = subject ? subject.id : "";
    form.querySelector("output").value = `${form.elements.progress.value}%`;
    $("#subject-dialog").showModal();
  }

  async function deleteSubject(id) {
    const subject = subjectById(id);
    if (!subject || !window.confirm(`Delete "${subject.name}" and its linked study tasks?`)) return;
    try {
      await api.request(`/api/backlogs/${id}`, { method: "DELETE" });
      await loadData();
      showToast(`${subject.name} was deleted.`);
    } catch (error) {
      showToast(error.message || "Could not delete the subject.");
    }
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
    const task = tasks.find((item) => String(item.id) === String(taskId));
    $("#task-dialog-title").textContent = task ? "Edit study task" : "Add a study task";
    if (task) {
      ["title", "date", "start", "end", "status"].forEach((key) => { form.elements[key].value = task[key] ?? ""; });
      form.elements.subject.value = task.subjectId;
    } else {
      form.elements.date.value = dayStamp();
      form.elements.start.value = "09:00";
      form.elements.end.value = "10:00";
    }
    $("#task-time-error").textContent = "";
    $("#task-dialog").showModal();
  }

  async function deleteTask(id) {
    const task = tasks.find((item) => String(item.id) === String(id));
    if (!task || !window.confirm(`Delete the study task "${task.title}"?`)) return;
    try {
      await api.request(`/api/tasks/${id}`, { method: "DELETE" });
      await loadData();
      showToast("Study task deleted.");
    } catch (error) {
      showToast(error.message || "Could not delete the task.");
    }
  }

  async function toggleTask(id) {
    const task = tasks.find((item) => String(item.id) === String(id));
    if (!task) return;
    try {
      if (task.status !== "Completed") {
        await api.request(`/api/tasks/${id}/complete`, { method: "PATCH", body: "{}" });
      } else {
        await api.request(`/api/tasks/${id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: task.title,
            subjectId: task.subjectId,
            date: task.date,
            start: task.start,
            end: task.end,
            status: "Planned"
          })
        });
      }
      await loadData();
      showToast(task.status === "Completed" ? "Study task marked as planned." : "Nice work — study task completed.");
    } catch (error) {
      showToast(error.message || "Could not update the task.");
    }
  }

  async function completeTopic(subjectId, topicName) {
    const subject = subjectById(subjectId);
    if (!subject || !Array.isArray(subject.topicsPending) || !subject.topicsPending.includes(topicName)) return;
    const totalTopics = Math.max(1, subject.topicsPending.length + (subject.topicsDone || []).length);
    const progressValue = Math.min(100, Math.round((Number(subject.progress) || 0) + 100 / totalTopics));
    try {
      await api.request(`/api/backlogs/${subject.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...subject,
          progress: progressValue,
          status: progressValue >= 100 ? "Completed" : "In progress",
          topicsPending: subject.topicsPending.filter((topic) => topic !== topicName),
          topicsDone: [...(subject.topicsDone || []), topicName]
        })
      });
      await loadData();
      showToast(`"${topicName}" marked complete.`);
    } catch (error) {
      showToast(error.message || "Could not update topic progress.");
    }
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
    const material = materials.find((item) => String(item.id) === String(materialId));
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

  async function deleteMaterial(id) {
    const material = materials.find((item) => String(item.id) === String(id));
    if (!material || !window.confirm(`Delete the resource "${material.title}"?`)) return;
    try {
      await api.request(`/api/materials/${id}`, { method: "DELETE" });
      await loadData();
      showToast("Resource deleted.");
    } catch (error) {
      showToast(error.message || "Could not delete the resource.");
    }
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
  }

  function openProfileDialog() {
    const form = $("#profile-form");
    ["fullName", "email", "college", "course", "department", "year", "semester"].forEach((key) => {
      form.elements[key].value = student[key] || "";
    });
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

  async function logout() {
    try {
      await api.request("/api/auth/logout", { method: "POST", body: "{}" });
    } catch (error) {
      showToast(error.message || "Could not sign out. Please try again.");
      return;
    }
    window.location.assign("/login.html?loggedout=1");
  }

  function bindEvents() {
    $$("[data-view-target]").forEach((button) => button.addEventListener("click", () => openView(button.dataset.viewTarget)));
    $$("[data-open-view]").forEach((button) => button.addEventListener("click", () => openView(button.dataset.openView)));
    $$("[data-logout]").forEach((button) => button.addEventListener("click", logout));
    $("#mobile-menu-toggle").addEventListener("click", () => {
      const isOpen = $("#app-sidebar").classList.toggle("is-open");
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

    $("#subject-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const id = String(data.get("id") || "");
      const previous = subjects.find((subject) => String(subject.id) === id);
      const progressValue = Number(data.get("progress"));
      const status = String(data.get("status"));
      const payload = {
        name: String(data.get("name")).trim(),
        code: String(data.get("code")).trim(),
        semester: String(data.get("semester")),
        attempts: Number(data.get("attempts")),
        status: status === "Completed" || progressValue === 100 ? "Completed" : status,
        progress: status === "Completed" ? 100 : progressValue,
        examDate: String(data.get("examDate") || ""),
        topicsDone: previous ? previous.topicsDone : [],
        topicsPending: previous ? previous.topicsPending : []
      };
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        await api.request(id ? `/api/backlogs/${id}` : "/api/backlogs", {
          method: id ? "PUT" : "POST",
          body: JSON.stringify(payload)
        });
        $("#subject-dialog").close();
        await loadData();
        showToast(id ? "Subject details saved." : "Subject added to your backlogs.");
      } catch (error) {
        showToast(error.message || "Could not save this subject.");
      } finally {
        button.disabled = false;
      }
    });

    $("#task-form").addEventListener("submit", async (event) => {
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
      $("#task-time-error").textContent = "";
      const payload = {
        title: String(data.get("title")).trim(),
        subjectId: Number(data.get("subject")),
        date: String(data.get("date")),
        start,
        end,
        status: String(data.get("status"))
      };
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        await api.request(id ? `/api/tasks/${id}` : "/api/tasks", {
          method: id ? "PUT" : "POST",
          body: JSON.stringify(payload)
        });
        $("#task-dialog").close();
        await loadData();
        showToast(id ? "Study task updated." : "Study task added.");
      } catch (error) {
        $("#task-time-error").textContent = error.message || "Could not save the study task.";
      } finally {
        button.disabled = false;
      }
    });

    $("#material-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const id = String(data.get("id") || "");
      const payload = {
        title: String(data.get("title")).trim(),
        subjectId: Number(data.get("subjectId")),
        type: String(data.get("type")),
        url: String(data.get("url")).trim(),
        description: String(data.get("description") || "").trim()
      };
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        await api.request(id ? `/api/materials/${id}` : "/api/materials", {
          method: id ? "PUT" : "POST",
          body: JSON.stringify(payload)
        });
        $("#material-dialog").close();
        await loadData();
        showToast(id ? "Resource updated." : "Resource saved.");
      } catch (error) {
        $("#material-url-error").textContent = error.message || "Could not save this resource.";
      } finally {
        button.disabled = false;
      }
    });

    $("#profile-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const payload = {};
      ["fullName", "email", "college", "course", "department", "year", "semester"].forEach((key) => {
        payload[key] = String(data.get(key)).trim();
      });
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        const result = await api.request("/api/profile", { method: "PUT", body: JSON.stringify(payload) });
        student = result.profile;
        $("#profile-dialog").close();
        renderProfile();
        showToast("Profile details updated.");
      } catch (error) {
        showToast(error.message || "Could not update your profile.");
      } finally {
        button.disabled = false;
      }
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
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        await api.request("/api/profile/password", {
          method: "POST",
          body: JSON.stringify({
            currentPassword: form.elements.currentPassword.value,
            newPassword: form.elements.newPassword.value,
            confirmPassword: form.elements.confirmPassword.value
          })
        });
        form.reset();
        showToast("Password updated.");
      } catch (error) {
        showToast(error.message || "Could not update your password.");
      } finally {
        button.disabled = false;
      }
    });

    $$("[name='studyReminders'], [name='weeklyRecap'], [name='darkTheme']").forEach((input) => input.addEventListener("change", async () => {
      const previous = { ...preferences };
      const next = {
        studyReminders: $('[name="studyReminders"]').checked,
        weeklyRecap: $('[name="weeklyRecap"]').checked,
        theme: $('[name="darkTheme"]').checked ? "dark" : "light"
      };
      input.disabled = true;
      try {
        const result = await api.request("/api/preferences", { method: "PUT", body: JSON.stringify(next) });
        preferences = result.preferences;
        applyPreferences();
        showToast("Preference saved.");
      } catch (error) {
        preferences = previous;
        applyPreferences();
        showToast(error.message || "Could not save this preference.");
      } finally {
        input.disabled = false;
      }
    }));

    $("#clear-demo-data-button").addEventListener("click", async () => {
      if (!window.confirm("Clear all saved subjects, tasks, and custom resources for this account? This cannot be undone.")) return;
      try {
        await api.request("/api/account/data", { method: "DELETE" });
        await api.request("/api/auth/logout", { method: "POST", body: "{}" });
        window.location.assign("/login.html?loggedout=1");
      } catch (error) {
        showToast(error.message || "Could not clear the account data.");
      }
    });

    $$("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
    $$("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    }));
  }

  async function start() {
    $$("[data-current-year]").forEach((element) => { element.textContent = new Date().getFullYear(); });
    bindEvents();
    try {
      await loadData();
    } catch (error) {
      if (!(error instanceof api.ApiError) || error.status !== 401) {
        showToast(error.message || "Could not load your dashboard.");
      }
    } finally {
      $("#dashboard-loading").classList.add("is-hidden");
    }
  }

  start();
})();
