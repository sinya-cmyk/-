const authPanel = document.getElementById("authPanel");
const appContent = document.getElementById("appContent");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const registerUsername = document.getElementById("registerUsername");
const registerPassword = document.getElementById("registerPassword");
const registerConfirmPassword = document.getElementById("registerConfirmPassword");
const loginButton = document.getElementById("loginButton");
const registerButton = document.getElementById("registerButton");
const showRegisterButton = document.getElementById("showRegisterButton");
const showLoginButton = document.getElementById("showLoginButton");
const authMessage = document.getElementById("authMessage");
const userState = document.getElementById("userState");
const currentUserName = document.getElementById("currentUserName");
const logoutButton = document.getElementById("logoutButton");
const modePanel = document.getElementById("modePanel");
const privateModeButton = document.getElementById("privateModeButton");
const businessModeButton = document.getElementById("businessModeButton");
const monthLabel = document.getElementById("monthLabel");
const yearLabel = document.getElementById("yearLabel");
const calendarGrid = document.getElementById("calendarGrid");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const taskDateInput = document.getElementById("taskDateInput");
const taskStartInput = document.getElementById("taskStartInput");
const taskEndInput = document.getElementById("taskEndInput");
const taskProjectSelect = document.getElementById("taskProjectSelect");
const taskPrioritySelect = document.getElementById("taskPrioritySelect");
const taskTitleInput = document.getElementById("taskTitleInput");
const startVoiceInputButton = document.getElementById("startVoiceInputButton");
const voiceInputStatus = document.getElementById("voiceInputStatus");
const startVoiceDateInputButton = document.getElementById("startVoiceDateInputButton");
const voiceDateInputStatus = document.getElementById("voiceDateInputStatus");
const startVoiceStartTimeInputButton = document.getElementById("startVoiceStartTimeInputButton");
const voiceStartTimeInputStatus = document.getElementById("voiceStartTimeInputStatus");
const startVoiceEndTimeInputButton = document.getElementById("startVoiceEndTimeInputButton");
const voiceEndTimeInputStatus = document.getElementById("voiceEndTimeInputStatus");
const taskDetailInput = document.getElementById("taskDetailInput");
const taskAttachmentInput = document.getElementById("taskAttachmentInput");
const taskAttachmentList = document.getElementById("taskAttachmentList");
const addTaskButton = document.getElementById("addTaskButton");
const cancelTaskButton = document.getElementById("cancelTaskButton");
const taskEntryPanel = document.getElementById("taskEntryPanel");
const showTaskRegisterButton = document.getElementById("showTaskRegisterButton");
const showAttachmentsPageButton = document.getElementById("showAttachmentsPageButton");
const backToAppButton = document.getElementById("backToAppButton");
const taskList = document.getElementById("taskList");
const projectList = document.getElementById("projectList");
const newProjectName = document.getElementById("newProjectName");
const createProjectButton = document.getElementById("createProjectButton");
const showCalendarViewButton = document.getElementById("showCalendarViewButton");
const showTodoListViewButton = document.getElementById("showTodoListViewButton");
const showGmailViewButton = document.getElementById("showGmailViewButton");
const gmailPanel = document.getElementById("gmailPanel");
const gmailStatus = document.getElementById("gmailStatus");
const gmailList = document.getElementById("gmailList");
const gmailAuthorizeButton = document.getElementById("gmailAuthorizeButton");
const gmailRefreshButton = document.getElementById("gmailRefreshButton");
const gmailSearchInput = document.getElementById("gmailSearchInput");
const gmailSearchButton = document.getElementById("gmailSearchButton");
const gmailDetailPanel = document.getElementById("gmailDetailPanel");
const gmailDetailSubject = document.getElementById("gmailDetailSubject");
const gmailDetailFrom = document.getElementById("gmailDetailFrom");
const gmailDetailDate = document.getElementById("gmailDetailDate");
const gmailDetailHeaders = document.getElementById("gmailDetailHeaders");
const gmailDetailBody = document.getElementById("gmailDetailBody");
const gmailCreateTaskButton = document.getElementById("gmailCreateTaskButton");
const gmailDetailCloseButton = document.getElementById("gmailDetailCloseButton");
const backToTasksButton = document.getElementById("backToTasksButton");
const backToModeButton = document.getElementById("backToModeButton");

const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
const GMAIL_CLIENT_ID = "1050642169375-e8c5q5iiie1i3epu7qfb2f4v3ane2vtl.apps.googleusercontent.com";
const GMAIL_SCOPES = "https://www.googleapis.com/auth/gmail.readonly";
let gapiInitialized = false;
let gmailAccessToken = null;
let gmailTokenClient = null;
let currentDate = new Date();
let selectedDate = new Date();
let currentUser = null;
let currentMode = null;
let isEditingTask = false;
let editingTaskIndex = null;
let editingTaskDateKey = null;
let currentTaskAttachments = [];
let gmailMessageCache = {};
let reminderCheckTimer = null;

const REMINDER_CHECK_INTERVAL_MS = 60000;
const USERS_KEY = "calendarTaskManager.users";
const SESSION_KEY = "calendarTaskManager.session";
const MODE_KEY = "calendarTaskManager.mode";
const TASKS_KEY = "calendarTaskManager.tasks";
const PROJECTS_KEY = "calendarTaskManager.projects";
const LOGS_KEY = "calendarTaskManager.logs";

function getUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : {};
}

function getMode() {
  return localStorage.getItem(MODE_KEY);
}

function saveMode(mode) {
  localStorage.setItem(MODE_KEY, mode);
}

function clearMode() {
  localStorage.removeItem(MODE_KEY);
}

function getCurrentPage() {
  const path = window.location.pathname;
  const fileName = path.substring(path.lastIndexOf("/") + 1);
  return fileName || "index.html";
}

async function fetchJson(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

function saveUsersLocal(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function saveUsers(users) {
  saveUsersLocal(users);
  try {
    await fetchJson('/api/users', { method: 'POST', body: JSON.stringify({ users }) });
  } catch (error) {
    console.warn('ユーザー情報のDB保存に失敗しました', error);
  }
}

async function fetchUserFromServer(username) {
  try {
    const result = await fetchJson(`/api/users?username=${encodeURIComponent(username)}`);
    if (result.user) {
      const users = getUsers();
      users[username] = result.user;
      saveUsersLocal(users);
      return result.user;
    }
  } catch (error) {
    console.warn('ユーザー取得に失敗しました', error);
  }
  return null;
}

async function loadUsersFromServer() {
  try {
    const result = await fetchJson('/api/users');
    if (result.users) {
      saveUsersLocal(result.users);
      return result.users;
    }
  } catch (error) {
    console.warn('ユーザー同期に失敗しました', error);
  }
  return getUsers();
}

function getSession() {
  return localStorage.getItem(SESSION_KEY);
}

function saveSession(username) {
  localStorage.setItem(SESSION_KEY, username);
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getTaskData() {
  const raw = localStorage.getItem(TASKS_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveTaskData(data) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(data));
}

async function syncTasksToServer(tasks) {
  if (!currentUser || !currentMode) return;
  try {
    await fetchJson('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ user: currentUser, mode: currentMode, tasks }),
    });
  } catch (error) {
    console.warn('タスクのDB保存に失敗しました', error);
  }
}

async function loadTasksFromServer(user, mode) {
  try {
    const result = await fetchJson(`/api/tasks?user=${encodeURIComponent(user)}&mode=${encodeURIComponent(mode)}`);
    if (result.tasks) {
      const allTasks = getTaskData();
      allTasks[`${user}_${mode}`] = result.tasks;
      saveTaskData(allTasks);
      return result.tasks;
    }
  } catch (error) {
    console.warn('タスク取得に失敗しました', error);
  }
  return getTaskData()[`${user}_${mode}`] || {};
}

function getProjectData() {
  const raw = localStorage.getItem(PROJECTS_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveProjectData(data) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(data));
}

async function syncProjectsToServer(projects) {
  if (!currentUser || !currentMode) return;
  try {
    await fetchJson('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ user: currentUser, mode: currentMode, projects }),
    });
  } catch (error) {
    console.warn('プロジェクトのDB保存に失敗しました', error);
  }
}

async function loadProjectsFromServer(user, mode) {
  if (!user || !mode) return [];
  try {
    const result = await fetchJson(`/api/projects?user=${encodeURIComponent(user)}&mode=${encodeURIComponent(mode)}`);
    if (Array.isArray(result.projects)) {
      const allProjects = getProjectData();
      const key = `${user}_${mode}`;
      allProjects[key] = result.projects;
      saveProjectData(allProjects);
      return result.projects;
    }
  } catch (error) {
    console.warn('プロジェクト取得に失敗しました', error);
  }
  const all = getProjectData();
  return all[`${user}_${mode}`] || [];
}

function getProjects() {
  if (!currentUser || !currentMode) return [];
  const allProjects = getProjectData();
  const key = `${currentUser}_${currentMode}`;
  if (!allProjects[key]) {
    allProjects[key] = ["個人", "業務", "研究", "その他"];
    saveProjectData(allProjects);
    syncProjectsToServer(allProjects[key]).catch(() => {});
  }
  return allProjects[key];
}

function saveProjects(projects) {
  if (!currentUser || !currentMode) return;
  const allProjects = getProjectData();
  const key = `${currentUser}_${currentMode}`;
  allProjects[key] = projects;
  saveProjectData(allProjects);
  syncProjectsToServer(projects).catch(() => {});
}

function getTasks() {
  if (!currentUser || !currentMode) return {};
  const allTasks = getTaskData();
  const userKey = `${currentUser}_${currentMode}`;
  return allTasks[userKey] || {};
}

function saveTasks(tasks) {
  if (!currentUser || !currentMode) return;
  const allTasks = getTaskData();
  const userKey = `${currentUser}_${currentMode}`;
  allTasks[userKey] = tasks;
  saveTaskData(allTasks);
  syncTasksToServer(tasks).catch(() => {});
}

function appendLocalLog(entry) {
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    logs.push(entry);
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error("appendLocalLog error", e);
  }
}

async function logTaskEvent(action, payload) {
  const logPayload = {
    ...payload,
    device: getDeviceLabel(),
  };

  const entry = {
    timestamp: new Date().toISOString(),
    user: currentUser,
    mode: currentMode,
    action,
    payload: logPayload,
  };

  // まずサーバへ送る（失敗したら localStorage に保存）
  try {
    await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
  } catch (err) {
    console.warn("Sending log to server failed, saving locally", err);
    appendLocalLog(entry);
  }
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDeviceLabel() {
  const platform = navigator.platform || "不明なプラットフォーム";
  const userAgent = navigator.userAgent || "不明なユーザーエージェント";
  return `${platform} / ${userAgent}`;
}

function showMessage(message, type = "info") {
  if (!authMessage) return;
  authMessage.textContent = message;
  authMessage.style.color = type === "error" ? "#dc2626" : type === "success" ? "#065f46" : "#475569";
}

function showView(isAuthenticated) {
  if (authPanel) {
    if (isAuthenticated) authPanel.classList.add("hidden");
    else authPanel.classList.remove("hidden");
  }
  if (modePanel) {
    if (isAuthenticated) modePanel.classList.remove("hidden");
    else modePanel.classList.add("hidden");
  }
  if (appContent) appContent.classList.add("hidden");
  if (gmailPanel) gmailPanel.classList.add("hidden");
}

function showModeSelectionView() {
  if (authPanel) authPanel.classList.add("hidden");
  if (modePanel) modePanel.classList.remove("hidden");
  if (appContent) appContent.classList.add("hidden");
  if (gmailPanel) gmailPanel.classList.add("hidden");
  currentMode = null;
}

function showAppView() {
  if (authPanel) authPanel.classList.add("hidden");
  if (modePanel) modePanel.classList.add("hidden");
  
  // appContent内の各セクションを表示
  const projectPanel = document.querySelector(".project-panel");
  const calendarPanel = document.querySelector(".calendar-panel");
  const taskPanel = document.querySelector(".task-panel");
  
  if (projectPanel) projectPanel.classList.remove("hidden");
  if (calendarPanel) calendarPanel.classList.add("hidden");
  if (taskPanel) taskPanel.classList.remove("hidden");
  
  if (gmailPanel) gmailPanel.classList.add("hidden");
  
  hideTaskRegistrationView();
  renderProjectList();
  renderCalendar();
  renderTaskPanel();
  if (appContent) {
    appContent.classList.remove("single-column");
    appContent.classList.remove("todo-layout");
  }
  initializeReminderService();
}

async function renderAttachmentsPage() {
  const attachmentsPage = document.getElementById("attachmentsPage");
  const attachmentsList = document.getElementById("attachmentsList");
  const attachmentsMessage = document.getElementById("attachmentsMessage");
  if (!attachmentsPage || !attachmentsList || !attachmentsMessage) return;

  const tasks = getTasks();
  const entries = Object.entries(tasks);
  const attachmentRows = [];

  // ローカルストレージのタスク添付を取得
  entries.forEach(([date, taskItems]) => {
    taskItems.forEach((task, taskIndex) => {
      const attachments = task.attachments || [];
      attachments.forEach((attachment) => {
        attachmentRows.push({
          source: 'task',
          date,
          title: task.title || "(タイトルなし)",
          project: task.project || "未設定",
          name: attachment.name,
          url: attachment.dataUrl,
          size: attachment.size,
          type: attachment.type,
          taskIndex,
        });
      });
    });
  });

  // サーバー保存の資料を取得
  const serverAttachments = await fetchServerAttachments();
  serverAttachments.forEach((att) => {
    attachmentRows.push({
      source: 'server',
      date: att.date || '',
      title: att.taskTitle || '',
      project: att.project || '',
      name: att.filename,
      url: att.filepath,
      size: att.size || 0,
      type: att.type || '',
      createdAt: att.createdAt,
      filename: att.filename,
    });
  });

  if (attachmentRows.length === 0) {
    attachmentsList.innerHTML = "";
    attachmentsMessage.textContent = "このモードではまだ添付資料は登録されていません。";
    return;
  }

  attachmentsMessage.textContent = `全 ${attachmentRows.length} 件の添付資料`;
  attachmentsList.innerHTML = attachmentRows
    .map(
      (row) =>
        `<li class="attachment-list-item">
          <div class="attachment-info">
            <div class="attachment-name">${row.name}</div>
            <div class="attachment-meta">${row.date || row.createdAt || ''} | ${row.project || ''} | ${row.taskTitle || ''}</div>
          </div>
          <div class="attachment-actions">
            <button type="button" class="download-button" data-filename="${row.name}" data-url="${row.url || ''}" data-source="${row.source}" title="ダウンロード">📥 DL</button>
            <button type="button" class="delete-button" data-filename="${row.name}" data-source="${row.source}" data-taskdate="${row.date}" data-taskindex="${row.taskIndex}" title="削除">🗑️</button>
          </div>
          <div class="attachment-size">${Math.round((row.size || 0) / 1024)} KB</div>
        </li>`
    )
    .join("");
}

// fetch attachments saved on server
async function fetchServerAttachments() {
  if (!currentUser || !currentMode) return [];
  try {
    const res = await fetch(`/api/attachments?user=${encodeURIComponent(currentUser)}&mode=${encodeURIComponent(currentMode)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.attachments || [];
  } catch (e) {
    console.warn('Failed to fetch server attachments', e);
    return [];
  }
}

async function uploadAttachmentsFromInput() {
  const input = document.getElementById('attachmentsFileInput');
  const message = document.getElementById('attachmentsMessage');
  if (!input || !input.files || input.files.length === 0) {
    if (message) message.textContent = 'ファイルを選択してください。';
    return;
  }
  if (!currentUser || !currentMode) {
    if (message) message.textContent = 'ログイン/モードが必要です。';
    return;
  }
  const files = Array.from(input.files);
  const payloadFiles = await Promise.all(
    files.map((file) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result || '').toString().split(',')[1] || '';
          resolve({ name: file.name, type: file.type, base64, size: file.size });
        };
        reader.readAsDataURL(file);
      })
    )
  );

  try {
    const res = await fetch('/api/attachments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: currentUser, mode: currentMode, files: payloadFiles }),
    });
    const result = await res.json();
    if (res.ok) {
      if (message) message.textContent = `アップロード成功: ${result.files.length} 件`;
      input.value = '';
      renderAttachmentsPage();
    } else {
      if (message) message.textContent = `アップロード失敗: ${result.error || 'エラー'}`;
    }
  } catch (e) {
    console.error('Upload error', e);
    if (message) message.textContent = 'アップロード中にエラーが発生しました。';
  }
}

async function downloadAttachmentFile(filename, url, source) {
  if (!currentUser || !currentMode) {
    alert('ログイン/モードが必要です。');
    return;
  }

  if (source === 'task' && url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  try {
    const downloadUrl = `/api/download?user=${encodeURIComponent(currentUser)}&mode=${encodeURIComponent(currentMode)}&filename=${encodeURIComponent(filename)}`;
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      const error = await response.json();
      alert(`ダウンロード失敗: ${error.error || 'エラー'}`);
      return;
    }
    const blob = await response.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch (e) {
    console.error('Download error', e);
    alert('ダウンロード中にエラーが発生しました。');
  }
}

async function deleteAttachmentFile(filename) {
  if (!currentUser || !currentMode) {
    alert('ログイン/モードが必要です。');
    return;
  }
  if (!confirm(`「${filename}」を削除しますか？`)) return;
  try {
    const url = `/api/attachments?user=${encodeURIComponent(currentUser)}&mode=${encodeURIComponent(currentMode)}&filename=${encodeURIComponent(filename)}`;
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok) {
      const error = await response.json();
      alert(`削除失敗: ${error.error || 'エラー'}`);
      return;
    }
    alert(`「${filename}」を削除しました。`);
    renderAttachmentsPage();
  } catch (e) {
    console.error('Delete error', e);
    alert('削除中にエラーが発生しました。');
  }
}

// attach upload handlers when attachments page loads
document.addEventListener('DOMContentLoaded', () => {
  const uploadBtn = document.getElementById('uploadAttachmentsButton');
  if (uploadBtn) uploadBtn.addEventListener('click', uploadAttachmentsFromInput);
  
  const attachmentsList = document.getElementById('attachmentsList');
  if (attachmentsList) {
    attachmentsList.addEventListener('click', (e) => {
      const downloadBtn = e.target.closest('.download-button');
      if (downloadBtn) {
        const filename = downloadBtn.getAttribute('data-filename');
        const url = downloadBtn.getAttribute('data-url');
        const source = downloadBtn.getAttribute('data-source');
        if (filename) downloadAttachmentFile(filename, url, source);
        return;
      }
      const deleteBtn = e.target.closest('.delete-button');
      if (deleteBtn) {
        const filename = deleteBtn.getAttribute('data-filename');
        const source = deleteBtn.getAttribute('data-source');
        const taskdate = deleteBtn.getAttribute('data-taskdate');
        const taskindex = Number(deleteBtn.getAttribute('data-taskindex'));
        if (source === 'task') {
          deleteTaskAttachmentFromList(filename, taskdate, taskindex);
        } else {
          deleteAttachmentFile(filename);
        }
      }
    });
  }
});

async function deleteTaskAttachmentFromList(filename, date, taskIndex) {
  if (!confirm(`「${filename}」を削除しますか？`)) return;
  try {
    const tasks = getTasks();
    const taskItems = tasks[date];
    if (!taskItems || !taskItems[taskIndex]) return;
    const task = taskItems[taskIndex];
    task.attachments = (task.attachments || []).filter((att) => att.name !== filename);
    saveTasks(tasks);
    alert(`「${filename}」を削除しました。`);
    renderAttachmentsPage();
  } catch (e) {
    console.error('Delete task attachment error', e);
    alert('削除中にエラーが発生しました。');
  }
}

function showTodoListView() {
  const projectPanel = document.querySelector(".project-panel");
  const calendarPanel = document.querySelector(".calendar-panel");
  const taskPanel = document.querySelector(".task-panel");

  if (projectPanel) projectPanel.classList.remove("hidden");
  if (taskPanel) taskPanel.classList.remove("hidden");
  if (calendarPanel) calendarPanel.classList.add("hidden");
  
  // モーダルを閉じる
  hideDailyScheduleModal();
}

function showCalendarView() {
  const projectPanel = document.querySelector(".project-panel");
  const calendarPanel = document.querySelector(".calendar-panel");
  const taskPanel = document.querySelector(".task-panel");

  if (projectPanel) projectPanel.classList.add("hidden");
  if (taskPanel) taskPanel.classList.add("hidden");
  if (calendarPanel) calendarPanel.classList.remove("hidden");
}

function showTaskRegistrationView() {
  if (taskEntryPanel) taskEntryPanel.classList.remove("hidden");
  if (showTaskRegisterButton) showTaskRegisterButton.classList.add("hidden");
  // 編集フラグをリセット（新規追加モード）
  isEditingTask = false;
  editingTaskIndex = null;
  editingTaskDateKey = null;
  // ボタンテキストを「追加」に設定
  if (addTaskButton) addTaskButton.textContent = "追加";
  // フォームをリセット
  if (taskDateInput) taskDateInput.value = formatDateKey(selectedDate);
  if (taskTitleInput) taskTitleInput.value = "";
  if (taskDetailInput) taskDetailInput.value = "";
  if (taskStartInput) taskStartInput.value = "";
  if (taskEndInput) taskEndInput.value = "";
  if (taskProjectSelect) taskProjectSelect.value = "個人";
  if (taskPrioritySelect) taskPrioritySelect.value = "normal";
  currentTaskAttachments = [];
  if (taskAttachmentInput) taskAttachmentInput.value = "";
  if (taskAttachmentList) taskAttachmentList.innerHTML = "";
  if (voiceInputStatus) voiceInputStatus.textContent = "";
  if (startVoiceInputButton) {
    startVoiceInputButton.textContent = "🎙 音声入力";
    startVoiceInputButton.disabled = false;
  }
  if (voiceDateInputStatus) voiceDateInputStatus.textContent = "";
  if (startVoiceDateInputButton) {
    startVoiceDateInputButton.disabled = false;
  }
  if (voiceStartTimeInputStatus) voiceStartTimeInputStatus.textContent = "";
  if (startVoiceStartTimeInputButton) {
    startVoiceStartTimeInputButton.disabled = false;
  }
  if (voiceEndTimeInputStatus) voiceEndTimeInputStatus.textContent = "";
  if (startVoiceEndTimeInputButton) {
    startVoiceEndTimeInputButton.disabled = false;
  }
  renderProjectList();
}

function hideTaskRegistrationView() {
  if (taskEntryPanel) taskEntryPanel.classList.add("hidden");
  if (showTaskRegisterButton) showTaskRegisterButton.classList.remove("hidden");
  // 編集フラグをリセット
  isEditingTask = false;
  editingTaskIndex = null;
  editingTaskDateKey = null;
  // ボタンテキストをリセット
  if (addTaskButton) addTaskButton.textContent = "追加";
  if (taskAttachmentInput) taskAttachmentInput.value = "";
  if (taskAttachmentList) taskAttachmentList.innerHTML = "";
  if (voiceInputStatus) voiceInputStatus.textContent = "";
  if (startVoiceInputButton) {
    startVoiceInputButton.textContent = "🎙 音声入力";
    startVoiceInputButton.disabled = false;
  }
  if (voiceDateInputStatus) voiceDateInputStatus.textContent = "";
  if (startVoiceDateInputButton) {
    startVoiceDateInputButton.disabled = false;
  }
  if (voiceStartTimeInputStatus) voiceStartTimeInputStatus.textContent = "";
  if (startVoiceStartTimeInputButton) {
    startVoiceStartTimeInputButton.disabled = false;
  }
  if (voiceEndTimeInputStatus) voiceEndTimeInputStatus.textContent = "";
  if (startVoiceEndTimeInputButton) {
    startVoiceEndTimeInputButton.disabled = false;
  }
}

function renderProjectList() {
  if (!projectList || !taskProjectSelect) return;
  const projects = getProjects();
  projectList.innerHTML = "";
  taskProjectSelect.innerHTML = "";

  projects.forEach((project) => {
    const li = document.createElement("li");
    li.className = "project-item";
    li.innerHTML = `
      <span>${project}</span>
      <button type="button" class="remove-project-button">×</button>
    `;

    const removeButton = li.querySelector(".remove-project-button");
    removeButton.addEventListener("click", () => {
      removeProject(project);
    });

    projectList.appendChild(li);

    const option = document.createElement("option");
    option.value = project;
    option.textContent = project;
    taskProjectSelect.appendChild(option);
  });
}

function addProject() {
  const name = newProjectName?.value.trim();
  if (!name) {
    alert("プロジェクト名を入力してください。");
    return;
  }

  const projects = getProjects();
  if (projects.includes(name)) {
    alert("そのプロジェクトは既に存在します。");
    return;
  }

  projects.push(name);
  saveProjects(projects);
  renderProjectList();
  if (newProjectName) newProjectName.value = "";
}

function removeProject(projectName) {
  const projects = getProjects().filter((item) => item !== projectName);
  saveProjects(projects);
  renderProjectList();
}

async function showGmailView() {
  console.log("showGmailView called", {
    gmailAuthorizeButton: gmailAuthorizeButton,
    gmailRefreshButton: gmailRefreshButton,
    gmailPanel: gmailPanel,
  });

  if (authPanel) authPanel.classList.add("hidden");
  if (modePanel) modePanel.classList.add("hidden");
  
  // appContent全体を隠すのではなく、appContent内の各セクションを個別に隠す
  const projectPanel = document.querySelector(".project-panel");
  const calendarPanel = document.querySelector(".calendar-panel");
  const taskPanel = document.querySelector(".task-panel");
  
  if (projectPanel) projectPanel.classList.add("hidden");
  if (calendarPanel) calendarPanel.classList.add("hidden");
  if (taskPanel) taskPanel.classList.add("hidden");
  
  if (gmailPanel) {
    gmailPanel.classList.remove("hidden");
    console.log("gmailPanel classList:", gmailPanel.classList);
  }

  if (gmailAuthorizeButton) {
    console.log("Setting gmailAuthorizeButton display");
    gmailAuthorizeButton.classList.remove("hidden");
    gmailAuthorizeButton.style.display = "inline-block";
    gmailAuthorizeButton.textContent = "Gmailに接続";
    console.log("gmailAuthorizeButton classList after update:", gmailAuthorizeButton.classList);
  } else {
    console.error("gmailAuthorizeButton is null or undefined");
  }

  if (gmailRefreshButton) {
    console.log("Setting gmailRefreshButton display");
    gmailRefreshButton.classList.remove("hidden");
    gmailRefreshButton.style.display = "inline-block";
    gmailRefreshButton.textContent = "更新";
  } else {
    console.error("gmailRefreshButton is null or undefined");
  }

  clearGmailDetail();
  if (gmailList) gmailList.innerHTML = "";

  updateGmailStatus("Google API と認証状態を確認しています...", "info");

  await initGapiClient();

  if (gmailAccessToken) {
    updateGmailStatus("Gmail を取得しています...", "info");
    await loadGmailMessages();
  } else {
    updateGmailStatus("Gmail 連携を開始してください。Gmailに接続ボタンを押してください。", "info");
  }
}

function updateGmailStatus(message, type = "info") {
  if (!gmailStatus) return;
  gmailStatus.textContent = message;
  gmailStatus.style.color = type === "error" ? "#dc2626" : type === "success" ? "#065f46" : "#475569";
}

async function initGapiClient() {
  if (gapiInitialized) return;
  if (!window.gapi) {
    updateGmailStatus("Google API ライブラリを読み込めませんでした。gapi.js の読み込みを確認してください。", "error");
    console.error("window.gapi is not available", window.gapi);
    return;
  }

  try {
    await new Promise((resolve) => gapi.load("client", resolve));
    await gapi.client.init({
      discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest"],
    });
    gapiInitialized = true;
  } catch (error) {
    updateGmailStatus("Gmail クライアントの初期化に失敗しました。", "error");
    console.error("initGapiClient error", error);
  }
}

function initGmailTokenClient() {
  if (gmailTokenClient) return;
  if (!window.google?.accounts?.oauth2) {
    updateGmailStatus(
      "Google Identity Services が読み込まれていません。ブラウザをリロードし、GSI スクリプトが読み込まれているか確認してください。",
      "error"
    );
    console.error("google.accounts.oauth2 is not available", window.google);
    return;
  }

  gmailTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GMAIL_CLIENT_ID,
    scope: GMAIL_SCOPES,
    callback: async (tokenResponse) => {
      if (tokenResponse.error) {
        updateGmailStatus("Gmail 認証に失敗しました。", "error");
        console.error("tokenResponse error", tokenResponse);
        return;
      }
      gmailAccessToken = tokenResponse.access_token;
      if (gapiInitialized) {
        gapi.client.setToken({ access_token: gmailAccessToken });
      }
      updateGmailStatus("Gmail に接続しました。メールを読み込みます...", "success");
      await loadGmailMessages();
    },
  });
}

async function authorizeGmail() {
  if (!GMAIL_CLIENT_ID) {
    updateGmailStatus("GMAIL_CLIENT_ID を app.js に設定してください。", "error");
    return;
  }

  try {
    console.log("authorizeGmail start", {
      hasGoogle: !!window.google,
      hasGoogleAccounts: !!window.google?.accounts,
      hasOauth2: !!window.google?.accounts?.oauth2,
      hasGapi: !!window.gapi,
      gapiInitialized,
    });

    await initGapiClient();
    initGmailTokenClient();

    if (!gmailTokenClient) {
      updateGmailStatus(
        "Google OAuth クライアントを初期化できませんでした。ブラウザの拡張機能または Cookie 設定を確認してください。",
        "error"
      );
      return;
    }

    gmailTokenClient.requestAccessToken({ prompt: "consent" });
  } catch (error) {
    updateGmailStatus(
      "Gmail 認証処理中にエラーが発生しました。コンソールのエラーメッセージを確認してください。",
      "error"
    );
    console.error("authorizeGmail error", error);
  }
}

function decodeBase64Url(base64Url) {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  try {
    const decoded = atob(base64);
    return decodeURIComponent(
      decoded
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch (error) {
    return atob(base64);
  }
}

function findPayloadPart(part, mimeType) {
  if (part.mimeType === mimeType && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  if (part.parts) {
    for (const child of part.parts) {
      const value = findPayloadPart(child, mimeType);
      if (value) return value;
    }
  }
  return null;
}

function htmlToText(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

function getMessageBody(payload) {
  const plain = findPayloadPart(payload, "text/plain");
  if (plain) return plain;
  const html = findPayloadPart(payload, "text/html");
  if (html) return htmlToText(html);
  return "";
}

function parseEmailToTask(message) {
  const titleSource = message.subject || "Gmailからのタスク";
  const rawBody = message.bodyText || message.snippet || "";
  const firstLine = rawBody.split(/\r?\n/).find((line) => line.trim());
  const title = titleSource || (firstLine ? firstLine.trim().slice(0, 60) : "Gmailからのタスク");

  const projectKeywords = {
    業務: /請求|見積|納品|契約|業務|会議|打ち合わせ|請求書|納期|期限/,
    個人: /買い物|予約|申込|支払い|郵便|イベント|チケット|プライベート/,
  };
  let project = "個人";
  if (projectKeywords.業務.test(titleSource) || projectKeywords.業務.test(rawBody)) project = "業務";

  const parsedDate = new Date(message.date);
  const isValidDate = !isNaN(parsedDate);
  const dateKey = isValidDate ? formatDateKey(parsedDate) : formatDateKey(new Date());
  const startTime = isValidDate
    ? parsedDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
    : "";
  const reminder = isValidDate;
  const reminderMinutesBefore = reminder ? 1440 : 0;

  return {
    title,
    details: rawBody,
    project,
    priority: "normal",
    startTime,
    endTime: "",
    dateKey,
    reminder,
    reminderMinutesBefore,
    reminderNotified: false,
  };
}

function createTaskFromEmail() {
  if (!currentGmailDetailMessageId) {
    updateGmailStatus("現在のメールが選択されていません。", "error");
    return;
  }

  const message = gmailMessageCache[currentGmailDetailMessageId];
  if (!message) {
    updateGmailStatus("メール情報を取得できませんでした。", "error");
    return;
  }

  const newTask = parseEmailToTask(message);
  const tasks = getTasks();
  if (!tasks[newTask.dateKey]) tasks[newTask.dateKey] = [];
  tasks[newTask.dateKey].push({
    title: newTask.title,
    details: newTask.details,
    startTime: newTask.startTime,
    endTime: newTask.endTime,
    project: newTask.project,
    priority: newTask.priority,
    done: false,
    attachments: [],
  });
  saveTasks(tasks);

  updateGmailStatus("メール内容からタスクを自動登録しました。", "success");
  renderCalendar();
  renderTaskPanel();
  clearGmailDetail();
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function requestReminderPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch((error) => {
      console.warn("Notification permission request failed", error);
    });
  }
}

function getTaskReminderTime(task, dateKey) {
  if (!task.reminder || !task.startTime) return null;
  const [hours, minutes] = task.startTime.split(":");
  if (!hours || !minutes) return null;

  const reminderDate = new Date(`${dateKey}T${hours.padStart(2, "0")}:${minutes}:00`);
  reminderDate.setMinutes(reminderDate.getMinutes() - (task.reminderMinutesBefore || 0));
  return reminderDate;
}

function getReminderLabel(minutesBefore) {
  const labels = {
    5: "5分前",
    10: "10分前",
    15: "15分前",
    30: "30分前",
    60: "1時間前",
    1440: "1日前",
  };
  return labels[minutesBefore] || `${minutesBefore}分前`;
}

function notifyTaskReminder(task, dateKey) {
  const title = task.title || "リマインドタスク";
  const body = `${dateKey} ${task.startTime || "時間未設定"} のタスクを確認してください。`;

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("タスクリマインド", {
      body,
    });
  } else {
    alert(`リマインド: ${title}\n${body}`);
  }
}

function checkTaskReminders() {
  if (!currentUser || !currentMode) return;
  if (!("Notification" in window) || Notification.permission === "denied") return;

  const tasks = getTasks();
  let changed = false;
  const now = new Date();

  Object.entries(tasks).forEach(([dateKey, taskItems]) => {
    taskItems.forEach((task) => {
      if (!task.reminder || task.reminderNotified || !task.startTime) return;
      const reminderTime = getTaskReminderTime(task, dateKey);
      if (!reminderTime) return;
      if (now >= reminderTime) {
        notifyTaskReminder(task, dateKey);
        task.reminderNotified = true;
        changed = true;
      }
    });
  });

  if (changed) {
    saveTasks(tasks);
  }
}

function initializeReminderService() {
  if (reminderCheckTimer) return;
  requestReminderPermission();
  checkTaskReminders();
  reminderCheckTimer = window.setInterval(checkTaskReminders, REMINDER_CHECK_INTERVAL_MS);
}

function renderGmailDetailHeaders(headers) {
  if (!gmailDetailHeaders) return;
  gmailDetailHeaders.innerHTML = headers
    .map((header) => `<div class="gmail-detail-header-item"><strong>${escapeHtml(header.name)}:</strong> ${escapeHtml(header.value)}</div>`)
    .join("");
}

/*元 修正1回目*/
/*function clearGmailDetail() {
  if (!gmailDetailPanel || !gmailDetailSubject || !gmailDetailFrom || !gmailDetailDate || !gmailDetailBody || !gmailDetailHeaders) return;
  gmailDetailPanel.classList.add("hidden");
  gmailDetailSubject.textContent = "";
  gmailDetailFrom.textContent = "";
  gmailDetailDate.textContent = "";
  gmailDetailHeaders.innerHTML = "";
  gmailDetailBody.textContent = "";
}

function showGmailDetail(messageId) {
  const message = gmailMessageCache[messageId];
  if (!message || !gmailDetailPanel) return;

  const headers = message.payload.headers || [];
  const subject = headers.find((h) => h.name === "Subject")?.value || "(件名なし)";
  const from = headers.find((h) => h.name === "From")?.value || "(送信者不明)";
  const date = headers.find((h) => h.name === "Date")?.value || "";
  const bodyText = getMessageBody(message.payload) || message.snippet || "(本文なし)";

  if (gmailDetailSubject) gmailDetailSubject.textContent = subject;
  if (gmailDetailFrom) gmailDetailFrom.textContent = from;
  if (gmailDetailDate) gmailDetailDate.textContent = date;
  if (gmailDetailBody) gmailDetailBody.textContent = bodyText;
  renderGmailDetailHeaders(headers);
  gmailDetailPanel.classList.remove("hidden");
}*/

// メール詳細（ウィンドウ）を表示する関数 修正2回目
/*function showGmailDetail(message) {
  // ウィンドウを表示する
  if (gmailDetailPanel) gmailDetailPanel.classList.remove("hidden");

  // ★ 一覧（gmailList）は裏側に残すため、classList.add("hidden") は「書かない」

  // データを流し込む処理
  if (gmailDetailSubject) gmailDetailSubject.textContent = message.subject;
  if (gmailDetailFrom) gmailDetailFrom.textContent = `差出人: ${message.from}`;
  if (gmailDetailDate) gmailDetailDate.textContent = `日時: ${message.date}`;
  if (gmailDetailBody) gmailDetailBody.textContent = message.body;
}*/

let currentGmailDetailMessageId = null;

function showGmailDetail(messageId) {
  // キャッシュからメッセージデータを取得
  const message = gmailMessageCache[messageId];
  if (!message) {
    console.error("Message not found in cache:", messageId);
    return;
  }

  currentGmailDetailMessageId = messageId;
  console.log("showGmailDetail called:", messageId, message);

  if (gmailDetailPanel) gmailDetailPanel.classList.remove("hidden");

  // 差出人・日時・本文のみを表示する
  const from = message.from || "(送信者不明)";
  const rawDate = message.date || "";
  const bodyText = message.bodyText || message.snippet || "(本文なし)";

  // 日付を日本語表記に変換
  let japaneseDate = rawDate;
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed)) {
      japaneseDate = parsed.toLocaleString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  if (gmailDetailSubject) gmailDetailSubject.style.display = "none";
  if (gmailDetailHeaders) gmailDetailHeaders.style.display = "none";

  if (gmailDetailFrom) {
    gmailDetailFrom.textContent = `差出人: ${from}`;
    gmailDetailFrom.style.display = "block";
  }
  if (gmailDetailDate) {
    gmailDetailDate.textContent = `日時: ${japaneseDate}`;
    gmailDetailDate.style.display = "block";
  }

  if (gmailDetailBody) {
    gmailDetailBody.textContent = bodyText;
  }
}

// ウィンドウを閉じる関数
function clearGmailDetail() {
  console.log("clearGmailDetail called");
  // ウィンドウを隠す
  if (gmailDetailPanel) {
    gmailDetailPanel.classList.add("hidden");
    console.log("gmailDetailPanel hidden");
  }
  
  // 中身を空にする
  if (gmailDetailSubject) {
    gmailDetailSubject.textContent = "";
    gmailDetailSubject.style.display = "block";
  }
  if (gmailDetailFrom) gmailDetailFrom.textContent = "";
  if (gmailDetailDate) gmailDetailDate.textContent = "";
  if (gmailDetailBody) gmailDetailBody.textContent = "";
  if (gmailDetailHeaders) {
    gmailDetailHeaders.innerHTML = "";
    gmailDetailHeaders.style.display = "block";
  }
  currentGmailDetailMessageId = null;
}

async function signOutGmail() {
  if (!gmailAccessToken) return;
  gmailAccessToken = null;
  if (gapiInitialized) {
    gapi.client.setToken({ access_token: null });
  }
  updateGmailStatus("Gmail からサインアウトしました。", "success");
  if (gmailList) gmailList.innerHTML = "";
}

async function loadGmailMessages() {
  clearGmailDetail();
  gmailMessageCache = {};
  if (gmailList) gmailList.innerHTML = "";

  await initGapiClient();
  if (!gapiInitialized) {
    updateGmailStatus("Gmail クライアントを初期化してください。", "error");
    return;
  }

  if (!gmailAccessToken) {
    updateGmailStatus("Gmail に接続してください。", "error");
    return;
  }

  try {
    const response = await gapi.client.gmail.users.messages.list({
      userId: "me",
      labelIds: ["INBOX"],
      maxResults: 50,
    });

    const messages = response.result.messages || [];

    if (messages.length === 0) {
      if (gmailList) gmailList.innerHTML = "<p>受信トレイにメールがありません。</p>";
      return;
    }

    for (const message of messages) {
      const messageData = await gapi.client.gmail.users.messages.get({
        userId: "me",
        id: message.id,
        format: "full",
      });

      const payload = messageData.result.payload;
      const headers = payload.headers || [];
      const subject = headers.find((h) => h.name === "Subject")?.value || "(件名なし)";
      const from = headers.find((h) => h.name === "From")?.value || "(送信者不明)";
      const date = headers.find((h) => h.name === "Date")?.value || "";
      const bodyText = getMessageBody(payload) || messageData.result.snippet || "(本文なし)";
      
      const searchText = `${subject} ${from} ${date} ${bodyText} ${messageData.result.snippet || ""} ${(payload.headers || [])
        .map((h) => h.value || "")
        .join(" ")}`;
      const cachedMessage = {
        id: message.id,
        subject,
        from,
        date,
        bodyText,
        payload: payload,
        snippet: messageData.result.snippet,
        fullData: messageData.result,
        searchText,
      };
      
      gmailMessageCache[message.id] = cachedMessage;
      console.log("Gmail message cached:", message.id, {
        subject,
        from,
        date,
        bodyText: bodyText.substring(0, 50),
        searchText: searchText.substring(0, 80),
      });
    }

    if (getGmailSearchWords().length) {
      filterGmailMessages();
    } else {
      renderGmailList();
    }
  } catch (error) {
    updateGmailStatus("Gmail メッセージの取得に失敗しました。", "error");
    console.error(error);
  }
}

function getGmailSearchWords() {
  const value = gmailSearchInput?.value?.trim() || "";
  const words = value
    .split(/\s+/)
    .map((word) => word.toLowerCase())
    .filter(Boolean);
  console.log("Gmail search words:", words, "raw:", value);
  return words;
}

function gmailMessageMatches(message, words) {
  if (!words.length) return true;
  const text = (message.searchText || `${message.subject || ""} ${message.from || ""} ${message.bodyText || ""} ${message.snippet || ""} ${message.date || ""}`)
    .toLowerCase();
  return words.every((word) => text.includes(word));
}

function renderGmailList(messages = null) {
  if (!gmailList) return;
  const allMessages = messages || Object.values(gmailMessageCache);
  gmailList.innerHTML = "";

  if (allMessages.length === 0) {
    const query = gmailSearchInput?.value?.trim();
    gmailList.innerHTML = query ? "<p>検索結果がありません。</p>" : "<p>受信トレイにメールがありません。</p>";
    return;
  }

  allMessages.forEach((message) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "gmail-item gmail-item-button";
    item.dataset.messageId = message.id;
    item.innerHTML = `
      <h3>${escapeHtml(message.subject)}</h3>
      <p><strong>From:</strong> ${escapeHtml(message.from)}</p>
      <small>${escapeHtml(message.date)}</small>
    `;
    item.addEventListener("click", () => showGmailDetail(message.id));
    gmailList.appendChild(item);
  });
}

function filterGmailMessages() {
  const words = getGmailSearchWords();
  const messages = Object.values(gmailMessageCache).filter((message) => gmailMessageMatches(message, words));
  console.log("Gmail filter result count:", messages.length);
  if (words.length === 0) {
    updateGmailStatus("検索キーワードが空です。すべてのメールを表示しています。", "info");
  } else {
    updateGmailStatus(`検索ワード: ${words.join(" ")} → ${messages.length} 件`, "success");
  }
  renderGmailList(messages);
}

function updateUserState() {
  if (!userState || !currentUserName) return;
  if (currentUser) {
    currentUserName.textContent = `${currentUser}でログイン中`;
    userState.classList.remove("hidden");
  } else {
    userState.classList.add("hidden");
  }
}

function showLoginForm() {
  registerForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
  showMessage("アカウントを作成するか、既存アカウントでログインしてください。");
}

function showRegisterForm() {
  loginForm.classList.add("hidden");
  registerForm.classList.remove("hidden");
  showMessage("新しいアカウントを登録してください。");
}

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function handleLogin() {
  const username = loginUsername.value.trim();
  const password = loginPassword.value.trim();

  if (!username || !password) {
    showMessage("ユーザー名とパスワードを入力してください。", "error");
    return;
  }

  const users = getUsers();
  let account = users[username];
  if (!account) {
    account = await fetchUserFromServer(username);
  }
  if (!account) {
    showMessage("ユーザーが見つかりません。アカウントを作成してください。", "error");
    return;
  }

  const hashed = await hashPassword(password);
  if (hashed !== account.password) {
    showMessage("パスワードが正しくありません。", "error");
    return;
  }

  currentUser = username;
  saveSession(currentUser);
  selectedDate = new Date();
  currentDate = new Date();
  updateUserState();
  clearMode();
  window.location.href = "mode.html";
}

async function handleRegister() {
  const username = registerUsername.value.trim();
  const password = registerPassword.value.trim();
  const confirmPassword = registerConfirmPassword.value.trim();

  if (!username || !password || !confirmPassword) {
    showMessage("すべての項目を入力してください。", "error");
    return;
  }
  if (password.length < 6) {
    showMessage("パスワードは6文字以上にしてください。", "error");
    return;
  }
  if (password !== confirmPassword) {
    showMessage("パスワードが一致しません。", "error");
    return;
  }

  const users = getUsers();
  if (users[username]) {
    showMessage("そのユーザー名は既に使用されています。", "error");
    return;
  }
  const existingUser = await fetchUserFromServer(username);
  if (existingUser) {
    showMessage("そのユーザー名は既に使用されています。", "error");
    return;
  }

  const hashed = await hashPassword(password);
  users[username] = { password: hashed };
  await saveUsers(users);

  currentUser = username;
  saveSession(currentUser);
  registerUsername.value = "";
  registerPassword.value = "";
  registerConfirmPassword.value = "";
  selectedDate = new Date();
  currentDate = new Date();
  updateUserState();
  clearMode();
  window.location.href = "mode.html";
}

function logout() {
  clearSession();
  clearMode();
  currentUser = null;
  currentMode = null;
  selectedDate = new Date();
  currentDate = new Date();
  updateUserState();
  window.location.href = "index.html";
}

function renderCalendar() {
  if (!calendarGrid) return;
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const startDay = firstDayOfMonth.getDay();
  const totalDays = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const prevTotalDays = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();

  const days = [];

  for (let i = startDay - 1; i >= 0; i -= 1) {
    days.push({
      date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevTotalDays - i),
      active: false,
    });
  }

  for (let i = 1; i <= totalDays; i += 1) {
    days.push({
      date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i),
      active: true,
    });
  }

  const nextDays = 42 - days.length;
  for (let i = 1; i <= nextDays; i += 1) {
    days.push({
      date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i),
      active: false,
    });
  }

  monthLabel.textContent = `${currentDate.getMonth() + 1}月`;
  yearLabel.textContent = `${currentDate.getFullYear()}年`;

  calendarGrid.innerHTML = "";

  dayNames.forEach((name) => {
    const headerCell = document.createElement("div");
    headerCell.className = "day-name";
    headerCell.textContent = name;
    calendarGrid.appendChild(headerCell);
  });

  const tasks = getTasks();
  const selectedKey = formatDateKey(selectedDate);

  days.forEach((day) => {
    const key = formatDateKey(day.date);
    const taskCount = tasks[key] ? tasks[key].length : 0;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = `day-cell ${day.active ? "active" : "inactive"}`;
    if (key === selectedKey) cell.classList.add("selected");

    // 日付ラベル
    const label = document.createElement("div");
    label.className = "day-label";
    label.textContent = day.date.getDate();

    const count = document.createElement("div");
    count.className = "task-count";
    count.textContent = taskCount > 0 ? `${taskCount}件` : "";
    cell.title = taskCount > 0 ? `${taskCount}件の予定があります` : "予定なし";

    cell.appendChild(label);
    if (taskCount > 0) cell.appendChild(count);

    cell.addEventListener("click", () => {
      selectedDate = new Date(day.date);
      renderCalendar();
      renderTaskPanel();
      // 日別スケジュールモーダルを開く
      showDailyScheduleModal(selectedDate);
    });

    calendarGrid.appendChild(cell);
  });
}

function renderTaskPanel() {
  if (!taskList || !selectedDateLabel) return;
  const tasks = getTasks();
  const key = formatDateKey(selectedDate);
  const taskItems = tasks[key] || [];

  selectedDateLabel.textContent = `${selectedDate.getFullYear()}年 ${selectedDate.getMonth() + 1}月 ${selectedDate.getDate()}日`;
  if (taskDateInput) taskDateInput.value = formatDateKey(selectedDate);
  taskList.innerHTML = "";

  if (taskItems.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "task-item";
    emptyItem.textContent = "タスクがありません。追加してください。";
    taskList.appendChild(emptyItem);
    return;
  }

  taskItems.forEach((task, index) => {
    const item = document.createElement("li");
    item.className = `task-item ${task.done ? "completed" : ""} priority-${task.priority || "normal"}`;

    const title = task.title || task.text || "(タイトルなし)";
    const details = task.details || "";
    const startTime = task.startTime || "--:--";
    const endTime = task.endTime || "--:--";
    const project = task.project || "未設定";
    const priority = task.priority || "normal";
    const reminderText = task.reminder ? `⏰ ${getReminderLabel(task.reminderMinutesBefore)}` : "";

    // 優先度ラベル
    const priorityLabel = {
      low: "低",
      normal: "通常",
      high: "高",
      urgent: "緊急",
    }[priority];

    const header = document.createElement("div");
    header.className = "task-item-header";
    header.innerHTML = `
      <div class="task-item-title">${title}</div>
      <div class="task-item-meta"><span class="priority-badge">${priorityLabel}</span> ${project} | ${startTime} 〜 ${endTime}${reminderText ? ` | ${reminderText}` : ""}</div>
    `;

    const detail = document.createElement("p");
    detail.className = "task-item-detail";
    detail.textContent = details;

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "complete";
    toggleButton.textContent = task.done ? "未完" : "完了";
    toggleButton.addEventListener("click", () => {
      const tasksForDay = getTasks();
      tasksForDay[key][index].done = !tasksForDay[key][index].done;
      saveTasks(tasksForDay);
      renderCalendar();
      renderTaskPanel();
    });

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit";
    editButton.textContent = "編集";
    editButton.addEventListener("click", () => {
      startEditTask(key, index);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", () => {
      const tasksForDay = getTasks();
      const removedTask = tasksForDay[key] ? tasksForDay[key][index] : null;
      if (tasksForDay[key]) tasksForDay[key].splice(index, 1);
      if (tasksForDay[key] && tasksForDay[key].length === 0) delete tasksForDay[key];
      saveTasks(tasksForDay);
      if (removedTask) logTaskEvent("delete", { task: removedTask, date: key }).catch(() => {});
      renderCalendar();
      renderTaskPanel();
    });

    actions.appendChild(toggleButton);
    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    item.appendChild(header);
    if (details) item.appendChild(detail);
    if (task.attachments && task.attachments.length > 0) {
      const attachmentContainer = document.createElement("div");
      attachmentContainer.className = "task-attachments";
      attachmentContainer.innerHTML = `<strong>添付資料：</strong>${task.attachments
        .map(
          (attachment, attachmentIndex) =>
            `<a href="${attachment.dataUrl}" download="${attachment.name}" class="attachment-link">${attachment.name}</a>${attachmentIndex < task.attachments.length - 1 ? "、" : ""}`
        )
        .join("")}`;
      item.appendChild(attachmentContainer);
    }
    item.appendChild(actions);
    taskList.appendChild(item);
  });
}

function startEditTask(dateKey, taskIndex) {
  isEditingTask = true;
  editingTaskIndex = taskIndex;
  editingTaskDateKey = dateKey;

  const tasks = getTasks();
  const task = tasks[dateKey]?.[taskIndex];
  if (!task) return;

  // モーダルを開く
  if (taskEntryPanel) taskEntryPanel.classList.remove("hidden");
  if (showTaskRegisterButton) showTaskRegisterButton.classList.add("hidden");

  currentTaskAttachments = task.attachments ? JSON.parse(JSON.stringify(task.attachments)) : [];

  // フォームにタスク情報を埋める
  if (taskDateInput) taskDateInput.value = dateKey;
  if (taskTitleInput) taskTitleInput.value = task.title || "";
  if (taskDetailInput) taskDetailInput.value = task.details || "";
  if (taskStartInput) taskStartInput.value = task.startTime || "";
  if (taskEndInput) taskEndInput.value = task.endTime || "";
  if (taskProjectSelect) taskProjectSelect.value = task.project || "個人";
  if (taskPrioritySelect) taskPrioritySelect.value = task.priority || "normal";
  if (taskAttachmentInput) taskAttachmentInput.value = "";
  if (taskAttachmentList) renderTaskAttachmentList(currentTaskAttachments || []);
  if (voiceInputStatus) voiceInputStatus.textContent = "";
  if (startVoiceInputButton) {
    startVoiceInputButton.textContent = "🎙 音声入力";
    startVoiceInputButton.disabled = false;
  }
  if (voiceDateInputStatus) voiceDateInputStatus.textContent = "";
  if (startVoiceDateInputButton) {
    startVoiceDateInputButton.disabled = false;
  }
  if (voiceStartTimeInputStatus) voiceStartTimeInputStatus.textContent = "";
  if (startVoiceStartTimeInputButton) {
    startVoiceStartTimeInputButton.disabled = false;
  }
  if (voiceEndTimeInputStatus) voiceEndTimeInputStatus.textContent = "";
  if (startVoiceEndTimeInputButton) {
    startVoiceEndTimeInputButton.disabled = false;
  }

  // ボタンテキストを「更新」に変更
  if (addTaskButton) addTaskButton.textContent = "更新";
}

function renderTaskAttachmentList(attachments) {
  if (!taskAttachmentList) return;
  if (!attachments || attachments.length === 0) {
    taskAttachmentList.innerHTML = "";
    return;
  }

  taskAttachmentList.innerHTML = attachments
    .map(
      (attachment, index) =>
        `<div class="attachment-item">
          <a href="${attachment.dataUrl}" download="${attachment.name}" class="attachment-link">${attachment.name}</a>
          <small>${Math.round(attachment.size / 1024)} KB</small>
          <button type="button" class="attachment-remove-button" data-index="${index}">削除</button>
        </div>`
    )
    .join("");
}

function removeTaskAttachment(index) {
  currentTaskAttachments.splice(index, 1);
  renderTaskAttachmentList(currentTaskAttachments);
}

async function appendTaskAttachments(files) {
  if (!files || files.length === 0) return;
  const attachments = await readAttachments(files);
  currentTaskAttachments = currentTaskAttachments.concat(attachments);
  renderTaskAttachmentList(currentTaskAttachments);
  if (taskAttachmentInput) taskAttachmentInput.value = "";
}

function initializeTaskAttachmentEvents() {
  if (taskAttachmentInput) {
    taskAttachmentInput.addEventListener("change", async (event) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        await appendTaskAttachments(files);
      }
    });
  }

  if (taskAttachmentList) {
    taskAttachmentList.addEventListener("click", (event) => {
      const removeBtn = event.target.closest(".attachment-remove-button");
      if (!removeBtn) return;
      const index = Number(removeBtn.getAttribute("data-index"));
      if (!Number.isNaN(index)) {
        removeTaskAttachment(index);
      }
    });
  }
}

function readAttachments(files) {
  if (!files || files.length === 0) return Promise.resolve([]);
  return Promise.all(
    Array.from(files).map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              name: file.name,
              type: file.type,
              size: file.size,
              dataUrl: reader.result,
            });
          };
          reader.readAsDataURL(file);
        })
    )
  );
}

async function addTask() {
  const taskDate = taskDateInput?.value || formatDateKey(selectedDate);
  const title = taskTitleInput?.value.trim() || "";
  const details = taskDetailInput?.value.trim() || "";
  const startTime = taskStartInput?.value || "";
  const endTime = taskEndInput?.value || "";
  const project = taskProjectSelect?.value || "未設定";
  const priority = taskPrioritySelect?.value || "normal";
  const newAttachments = currentTaskAttachments;

  if (!title) {
    alert("タイトルを入力してください。");
    return;
  }

  const tasks = getTasks();
  const taskDateObj = new Date(taskDate);
  selectedDate = taskDateObj;
  const key = formatDateKey(taskDateObj);

  const createTaskObject = (existingTask) => ({
    title,
    details,
    startTime,
    endTime,
    project,
    priority,
    reminder: existingTask?.reminder || false,
    reminderMinutesBefore: existingTask?.reminderMinutesBefore || 0,
    reminderNotified: existingTask?.reminderNotified || false,
    done: existingTask?.done || false,
    attachments: newAttachments !== null ? newAttachments : existingTask?.attachments || [],
  });

  if (isEditingTask && editingTaskIndex !== null && editingTaskDateKey !== null) {
    // 更新モード: 既存タスクを置き換える
    if (editingTaskDateKey === key) {
      // 同じ日付での更新
      const oldTask = JSON.parse(JSON.stringify(tasks[key][editingTaskIndex]));
      const newTask = createTaskObject(tasks[key][editingTaskIndex]);
      tasks[key][editingTaskIndex] = newTask;
      // ログ記録
      logTaskEvent("update", { before: oldTask, after: newTask, date: key }).catch(() => {});
    } else {
      // 日付が変わった場合：元の日付から削除して新しい日付に追加
      const oldKeyTasks = tasks[editingTaskDateKey] || [];
      const existingTask = oldKeyTasks[editingTaskIndex];
      oldKeyTasks.splice(editingTaskIndex, 1);
      if (oldKeyTasks.length === 0) delete tasks[editingTaskDateKey];

      if (!tasks[key]) tasks[key] = [];
      const newTask = createTaskObject(existingTask);
      tasks[key].push(newTask);
      // ログ記録（移動＝update として記録）
      logTaskEvent("update", { before: existingTask, after: newTask, from: editingTaskDateKey, to: key }).catch(() => {});
    }
  } else {
    // 新規追加モード
    if (!tasks[key]) tasks[key] = [];
    const newTask = createTaskObject();
    tasks[key].push(newTask);
    // ログ記録
    logTaskEvent("add", { task: newTask, date: key }).catch(() => {});
  }

  saveTasks(tasks);

  // フォームをリセット
  if (taskDateInput) taskDateInput.value = formatDateKey(selectedDate);
  if (taskTitleInput) taskTitleInput.value = "";
  if (taskDetailInput) taskDetailInput.value = "";
  if (taskStartInput) taskStartInput.value = "";
  if (taskEndInput) taskEndInput.value = "";
  if (taskProjectSelect) taskProjectSelect.value = "個人";
  if (taskPrioritySelect) taskPrioritySelect.value = "normal";
  if (taskAttachmentInput) taskAttachmentInput.value = "";
  if (taskAttachmentList) taskAttachmentList.innerHTML = "";
  if (addTaskButton) addTaskButton.textContent = "追加";
  if (voiceInputStatus) voiceInputStatus.textContent = "";
  if (voiceDateInputStatus) voiceDateInputStatus.textContent = "";
  if (voiceStartTimeInputStatus) voiceStartTimeInputStatus.textContent = "";
  if (voiceEndTimeInputStatus) voiceEndTimeInputStatus.textContent = "";

  hideTaskRegistrationView();
  renderCalendar();
  renderTaskPanel();
}

function isSpeechRecognitionSupported() {
  return typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
}

function updateVoiceStatus(message) {
  if (voiceInputStatus) {
    voiceInputStatus.textContent = message;
  }
}

function startTaskTitleVoiceInput() {
  if (!taskTitleInput || !startVoiceInputButton) return;

  if (!isSpeechRecognitionSupported()) {
    updateVoiceStatus("このブラウザは音声入力に対応していません。Chromeなど対応ブラウザでお試しください。");
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = "ja-JP";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  updateVoiceStatus("話してください... 音声認識中です。");
  startVoiceInputButton.textContent = "停止";
  startVoiceInputButton.disabled = true;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim();
    taskTitleInput.value = transcript;
    updateVoiceStatus(`認識結果: ${transcript}`);
  };

  recognition.onerror = (event) => {
    const message = event.error === "no-speech" ? "音声が検出されませんでした。もう一度お試しください。" : `音声認識エラー: ${event.error}`;
    updateVoiceStatus(message);
  };

  recognition.onend = () => {
    updateVoiceStatus("音声入力を停止しました。");
    startVoiceInputButton.textContent = "🎙 音声入力";
    startVoiceInputButton.disabled = false;
  };

  recognition.start();
}

function parseVoiceDateText(text) {
  // 例：「2026年6月7日」「2026-06-07」「6月7日」「明日」など
  const trimmed = text.trim();
  
  // 「今日」の場合
  if (trimmed === "今日") {
    return formatDateKey(new Date());
  }
  
  // 「明日」の場合
  if (trimmed === "明日") {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateKey(tomorrow);
  }
  
  // YYYY-MM-DD 形式の場合（そのまま返す）
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  // 「2026年6月7日」「2026年06月07日」パターン
  const yearMonthDayMatch = trimmed.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (yearMonthDayMatch) {
    const year = yearMonthDayMatch[1];
    const month = String(yearMonthDayMatch[2]).padStart(2, "0");
    const day = String(yearMonthDayMatch[3]).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  
  // 「6月7日」パターン（今年と仮定）
  const monthDayMatch = trimmed.match(/(\d{1,2})月(\d{1,2})日/);
  if (monthDayMatch) {
    const year = new Date().getFullYear();
    const month = String(monthDayMatch[1]).padStart(2, "0");
    const day = String(monthDayMatch[2]).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

function parseVoiceTimeText(text) {
  // 例：「09時30分」「9:30」「9時30」「9時」など
  const trimmed = text.trim();
  
  // HH:MM 形式の場合（そのまま返す）
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [hours, minutes] = trimmed.split(":");
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }
  
  // 「09時30分」「9時30分」パターン
  const hourMinuteMatch = trimmed.match(/(\d{1,2})時(\d{1,2})分/);
  if (hourMinuteMatch) {
    const hours = String(hourMinuteMatch[1]).padStart(2, "0");
    const minutes = String(hourMinuteMatch[2]).padStart(2, "0");
    return `${hours}:${minutes}`;
  }
  
  // 「9時30」パターン
  const hourMinuteAltMatch = trimmed.match(/(\d{1,2})時(\d{1,2})$/);
  if (hourMinuteAltMatch) {
    const hours = String(hourMinuteAltMatch[1]).padStart(2, "0");
    const minutes = String(hourMinuteAltMatch[2]).padStart(2, "0");
    return `${hours}:${minutes}`;
  }
  
  // 「9時」パターン
  const hourOnlyMatch = trimmed.match(/(\d{1,2})時$/);
  if (hourOnlyMatch) {
    const hours = String(hourOnlyMatch[1]).padStart(2, "0");
    return `${hours}:00`;
  }
  
  return null;
}

// --- 日別スケジュールモーダル関連 ---
function renderDailyScheduleModal(dateKey) {
  const container = document.getElementById("dailyScheduleList");
  const label = document.getElementById("dailyScheduleDateLabel");
  if (!container || !label) return;
  const tasks = getTasks();
  const items = tasks[dateKey] || [];
  label.textContent = `${dateKey}`;
  container.innerHTML = "";

  if (items.length === 0) {
    container.innerHTML = `<div class="daily-empty">この日に登録されたタスクはありません。</div>`;
    return;
  }

  items.forEach((task, idx) => {
    const row = document.createElement("div");
    row.className = "daily-task-row";
    row.dataset.index = idx;

    const main = document.createElement("div");
    main.className = "daily-task-main";

    const title = document.createElement("div");
    title.className = "daily-task-title";
    title.textContent = task.title || "(タイトルなし)";

    const reminderText = task.reminder ? ` ⏰${getReminderLabel(task.reminderMinutesBefore)}` : "";
    const meta = document.createElement("div");
    meta.className = "daily-task-meta";
    meta.textContent = `${task.project || ""} ${task.startTime || ""}〜${task.endTime || ""}${reminderText}`;

    main.appendChild(title);
    main.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "daily-task-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "secondary-button";
    editBtn.textContent = "編集";
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      hideDailyScheduleModal();
      startEditTask(dateKey, idx);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete";
    deleteBtn.textContent = "削除";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const tasksData = getTasks();
      if (!tasksData[dateKey]) return;
      const removed = tasksData[dateKey].splice(idx, 1)[0];
      if (tasksData[dateKey].length === 0) delete tasksData[dateKey];
      saveTasks(tasksData);
      if (removed) logTaskEvent("delete", { task: removed, date: dateKey }).catch(() => {});
      renderCalendar();
      // 再描画（同じ日付キー）
      renderDailyScheduleModal(dateKey);
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    row.appendChild(main);
    row.appendChild(actions);

    // 行クリックで編集
    row.addEventListener("click", () => {
      hideDailyScheduleModal();
      startEditTask(dateKey, idx);
    });

    container.appendChild(row);
  });
}

function showDailyScheduleModal(date) {
  const modal = document.getElementById("dailyScheduleModal");
  if (!modal) {
    console.log("Error: dailyScheduleModal element not found");
    return;
  }
  const key = formatDateKey(date instanceof Date ? date : new Date(date));
  console.log("Opening daily schedule modal for:", key);
  renderDailyScheduleModal(key);
  modal.classList.remove("hidden");
  console.log("Modal visible:", !modal.classList.contains("hidden"));
}

function hideDailyScheduleModal() {
  const modal = document.getElementById("dailyScheduleModal");
  if (!modal) return;
  modal.classList.add("hidden");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 日別モーダルのボタンイベントを登録
document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.getElementById("dailyScheduleCloseButton");
  const addBtn = document.getElementById("dailyScheduleAddButton");
  const modal = document.getElementById("dailyScheduleModal");
  if (closeBtn) closeBtn.addEventListener("click", () => hideDailyScheduleModal());
  if (modal) {
    if (modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }
    modal.addEventListener("click", (e) => {
      if (e.target === modal) hideDailyScheduleModal();
    });
  }
  if (addBtn) addBtn.addEventListener("click", () => {
    hideDailyScheduleModal();
    if (taskDateInput) taskDateInput.value = formatDateKey(selectedDate);
    showTaskRegistrationView();
  });
});

function startVoiceDateInput() {
  if (!taskDateInput || !startVoiceDateInputButton) return;

  if (!isSpeechRecognitionSupported()) {
    if (voiceDateInputStatus) {
      voiceDateInputStatus.textContent = "このブラウザは音声入力に対応していません。";
    }
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = "ja-JP";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  if (voiceDateInputStatus) {
    voiceDateInputStatus.textContent = "日付を話してください...（例：6月7日）";
  }
  startVoiceDateInputButton.disabled = true;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim();
    const dateStr = parseVoiceDateText(transcript);
    if (dateStr) {
      taskDateInput.value = dateStr;
      if (voiceDateInputStatus) {
        voiceDateInputStatus.textContent = `認識結果: ${transcript} → ${dateStr}`;
      }
    } else {
      if (voiceDateInputStatus) {
        voiceDateInputStatus.textContent = `解析失敗: ${transcript} は日付形式として認識できません。`;
      }
    }
  };

  recognition.onerror = (event) => {
    const message = event.error === "no-speech" ? "音声が検出されませんでした。" : `エラー: ${event.error}`;
    if (voiceDateInputStatus) {
      voiceDateInputStatus.textContent = message;
    }
  };

  recognition.onend = () => {
    startVoiceDateInputButton.disabled = false;
  };

  recognition.start();
}

function startVoiceStartTimeInput() {
  if (!taskStartInput || !startVoiceStartTimeInputButton) return;

  if (!isSpeechRecognitionSupported()) {
    if (voiceStartTimeInputStatus) {
      voiceStartTimeInputStatus.textContent = "このブラウザは音声入力に対応していません。";
    }
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = "ja-JP";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  if (voiceStartTimeInputStatus) {
    voiceStartTimeInputStatus.textContent = "開始時刻を話してください...（例：9時30分）";
  }
  startVoiceStartTimeInputButton.disabled = true;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim();
    const timeStr = parseVoiceTimeText(transcript);
    if (timeStr) {
      taskStartInput.value = timeStr;
      if (voiceStartTimeInputStatus) {
        voiceStartTimeInputStatus.textContent = `認識結果: ${transcript} → ${timeStr}`;
      }
    } else {
      if (voiceStartTimeInputStatus) {
        voiceStartTimeInputStatus.textContent = `解析失敗: ${transcript} は時刻形式として認識できません。`;
      }
    }
  };

  recognition.onerror = (event) => {
    const message = event.error === "no-speech" ? "音声が検出されませんでした。" : `エラー: ${event.error}`;
    if (voiceStartTimeInputStatus) {
      voiceStartTimeInputStatus.textContent = message;
    }
  };

  recognition.onend = () => {
    startVoiceStartTimeInputButton.disabled = false;
  };

  recognition.start();
}

function startVoiceEndTimeInput() {
  if (!taskEndInput || !startVoiceEndTimeInputButton) return;

  if (!isSpeechRecognitionSupported()) {
    if (voiceEndTimeInputStatus) {
      voiceEndTimeInputStatus.textContent = "このブラウザは音声入力に対応していません。";
    }
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = "ja-JP";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  if (voiceEndTimeInputStatus) {
    voiceEndTimeInputStatus.textContent = "終了時刻を話してください...（例：14時30分）";
  }
  startVoiceEndTimeInputButton.disabled = true;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim();
    const timeStr = parseVoiceTimeText(transcript);
    if (timeStr) {
      taskEndInput.value = timeStr;
      if (voiceEndTimeInputStatus) {
        voiceEndTimeInputStatus.textContent = `認識結果: ${transcript} → ${timeStr}`;
      }
    } else {
      if (voiceEndTimeInputStatus) {
        voiceEndTimeInputStatus.textContent = `解析失敗: ${transcript} は時刻形式として認識できません。`;
      }
    }
  };

  recognition.onerror = (event) => {
    const message = event.error === "no-speech" ? "音声が検出されませんでした。" : `エラー: ${event.error}`;
    if (voiceEndTimeInputStatus) {
      voiceEndTimeInputStatus.textContent = message;
    }
  };

  recognition.onend = () => {
    startVoiceEndTimeInputButton.disabled = false;
  };

  recognition.start();
}

if (startVoiceInputButton) {
  startVoiceInputButton.addEventListener("click", startTaskTitleVoiceInput);
}

if (startVoiceDateInputButton) {
  startVoiceDateInputButton.addEventListener("click", startVoiceDateInput);
}

if (startVoiceStartTimeInputButton) {
  startVoiceStartTimeInputButton.addEventListener("click", startVoiceStartTimeInput);
}

if (startVoiceEndTimeInputButton) {
  startVoiceEndTimeInputButton.addEventListener("click", startVoiceEndTimeInput);
}

if (prevMonthBtn) {
  prevMonthBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
}

if (nextMonthBtn) {
  nextMonthBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
}

if (addTaskButton) {
  addTaskButton.addEventListener("click", addTask);
}

if (showCalendarViewButton) {
  showCalendarViewButton.addEventListener("click", () => {
    showCalendarView();
    renderCalendar();
    renderTaskPanel();
  });
}

if (showTodoListViewButton) {
  showTodoListViewButton.addEventListener("click", () => {
    showTodoListView();
    renderTaskPanel();
  });
}

if (showTaskRegisterButton) {
  showTaskRegisterButton.addEventListener("click", showTaskRegistrationView);
}

if (cancelTaskButton) {
  cancelTaskButton.addEventListener("click", hideTaskRegistrationView);
}

if (createProjectButton) {
  createProjectButton.addEventListener("click", addProject);
}

if (showGmailViewButton) {
  showGmailViewButton.addEventListener("click", () => {
    showGmailView();
  });
}

if (showAttachmentsPageButton) {
  showAttachmentsPageButton.addEventListener("click", () => {
    window.location.href = "attachments.html";
  });
}

const showLogsPageButton = document.getElementById("showLogsPageButton");
if (showLogsPageButton) {
  showLogsPageButton.addEventListener("click", () => {
    window.location.href = "logs.html";
  });
}

if (gmailAuthorizeButton) {
  gmailAuthorizeButton.addEventListener("click", authorizeGmail);
}

if (gmailRefreshButton) {
  gmailRefreshButton.addEventListener("click", loadGmailMessages);
}

if (gmailSearchButton) {
  gmailSearchButton.addEventListener("click", async () => {
    if (!Object.keys(gmailMessageCache).length) {
      await loadGmailMessages();
    }
    filterGmailMessages();
  });
}

if (gmailSearchInput) {
  gmailSearchInput.addEventListener("keyup", async (event) => {
    if (event.key === "Enter") {
      if (!Object.keys(gmailMessageCache).length) {
        await loadGmailMessages();
      }
      filterGmailMessages();
    }
  });
  gmailSearchInput.addEventListener("input", filterGmailMessages);
}

if (gmailCreateTaskButton) {
  gmailCreateTaskButton.addEventListener("click", createTaskFromEmail);
}

if (gmailDetailCloseButton) {
  gmailDetailCloseButton.addEventListener("click", () => {
    clearGmailDetail();
  });
}

if (backToTasksButton) {
  backToTasksButton.addEventListener("click", () => {
    showAppView();
  });
}

if (backToAppButton) {
  backToAppButton.addEventListener("click", () => {
    window.location.href = "app.html";
  });
}

if (backToModeButton) {
  backToModeButton.addEventListener("click", () => {
    clearMode();
    window.location.href = "mode.html";
  });
}

if (privateModeButton) {
  privateModeButton.addEventListener("click", () => {
    currentMode = "private";
    saveMode(currentMode);
    window.location.href = "app.html";
  });
}

initializeTaskAttachmentEvents();

if (businessModeButton) {
  businessModeButton.addEventListener("click", () => {
    currentMode = "business";
    saveMode(currentMode);
    window.location.href = "app.html";
  });
}

if (loginButton) {
  loginButton.addEventListener("click", handleLogin);
}

if (registerButton) {
  registerButton.addEventListener("click", handleRegister);
}

if (showRegisterButton) {
  showRegisterButton.addEventListener("click", showRegisterForm);
}

if (showLoginButton) {
  showLoginButton.addEventListener("click", showLoginForm);
}

if (logoutButton) {
  logoutButton.addEventListener("click", logout);
}

async function initialize() {
  const sessionUser = getSession();
  const sessionMode = getMode();
  const page = getCurrentPage();

  if (page === "index.html" || page === "") {
    if (sessionUser && getUsers()[sessionUser]) {
      currentUser = sessionUser;
      updateUserState();
      window.location.href = "mode.html";
      return;
    }
    await loadUsersFromServer();
    showView(false);
    showLoginForm();
    return;
  }

  if (page === "mode.html") {
    if (!sessionUser) {
      window.location.href = "index.html";
      return;
    }
    currentUser = sessionUser;
    await loadUsersFromServer();
    if (!getUsers()[sessionUser]) {
      window.location.href = "index.html";
      return;
    }
    currentMode = null;
    clearMode();
    updateUserState();
    showModeSelectionView();
    return;
  }

  if (page === "app.html") {
    if (!sessionUser) {
      window.location.href = "index.html";
      return;
    }
    currentUser = sessionUser;
    currentMode = sessionMode;
    await loadUsersFromServer();
    if (!getUsers()[sessionUser]) {
      window.location.href = "index.html";
      return;
    }
    if (!currentMode) {
      window.location.href = "mode.html";
      return;
    }
    await loadProjectsFromServer(currentUser, currentMode);
    await loadTasksFromServer(currentUser, currentMode);
    updateUserState();
    showAppView();
    return;
  }

  if (page === "attachments.html") {
    if (!sessionUser) {
      window.location.href = "index.html";
      return;
    }
    currentUser = sessionUser;
    currentMode = sessionMode;
    await loadUsersFromServer();
    if (!getUsers()[sessionUser]) {
      window.location.href = "index.html";
      return;
    }
    if (!currentMode) {
      window.location.href = "mode.html";
      return;
    }
    await loadProjectsFromServer(currentUser, currentMode);
    await loadTasksFromServer(currentUser, currentMode);
    updateUserState();
    await renderAttachmentsPage();
    return;
  }

  // デフォルトはログイン画面
  showView(false);
  showLoginForm();
}

initialize();
