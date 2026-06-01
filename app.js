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
const gmailDetailPanel = document.getElementById("gmailDetailPanel");
const gmailDetailSubject = document.getElementById("gmailDetailSubject");
const gmailDetailFrom = document.getElementById("gmailDetailFrom");
const gmailDetailDate = document.getElementById("gmailDetailDate");
const gmailDetailHeaders = document.getElementById("gmailDetailHeaders");
const gmailDetailBody = document.getElementById("gmailDetailBody");
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
let gmailMessageCache = {};

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

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
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

function getProjectData() {
  const raw = localStorage.getItem(PROJECTS_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveProjectData(data) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(data));
}

function getProjects() {
  if (!currentUser) return [];
  const allProjects = getProjectData();
  if (!allProjects[currentUser]) {
    allProjects[currentUser] = ["個人", "業務", "研究", "その他"];
    saveProjectData(allProjects);
  }
  return allProjects[currentUser];
}

function saveProjects(projects) {
  if (!currentUser) return;
  const allProjects = getProjectData();
  allProjects[currentUser] = projects;
  saveProjectData(allProjects);
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
  const entry = {
    timestamp: new Date().toISOString(),
    user: currentUser,
    mode: currentMode,
    action,
    payload,
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
  return date.toISOString().slice(0, 10);
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
  if (calendarPanel) calendarPanel.classList.remove("hidden");
  if (taskPanel) taskPanel.classList.remove("hidden");
  
  if (gmailPanel) gmailPanel.classList.add("hidden");
  
  hideTaskRegistrationView();
  renderProjectList();
  renderCalendar();
  renderTaskPanel();
  showTodoListView();
}

function renderAttachmentsPage() {
  const attachmentsPage = document.getElementById("attachmentsPage");
  const attachmentsList = document.getElementById("attachmentsList");
  const attachmentsMessage = document.getElementById("attachmentsMessage");
  if (!attachmentsPage || !attachmentsList || !attachmentsMessage) return;

  const tasks = getTasks();
  const entries = Object.entries(tasks);
  const attachmentRows = [];

  entries.forEach(([date, taskItems]) => {
    taskItems.forEach((task) => {
      const attachments = task.attachments || [];
      attachments.forEach((attachment, index) => {
        attachmentRows.push({
          date,
          title: task.title || "(タイトルなし)",
          project: task.project || "未設定",
          name: attachment.name,
          url: attachment.dataUrl,
          size: attachment.size,
          type: attachment.type,
          index,
        });
      });
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
            <div class="attachment-name"><a href="${row.url}" download="${row.name}">${row.name}</a></div>
            <div class="attachment-meta">${row.date} | ${row.project} | ${row.title}</div>
          </div>
          <div class="attachment-size">${Math.round(row.size / 1024)} KB</div>
        </li>`
    )
    .join("");
}

function showTodoListView() {
  const calendarPanel = document.querySelector(".calendar-panel");
  if (calendarPanel) {
    calendarPanel.classList.add("hidden");
  }
  if (appContent) appContent.classList.add("single-column");
}

function showCalendarView() {
  const calendarPanel = document.querySelector(".calendar-panel");
  if (calendarPanel) {
    calendarPanel.classList.remove("hidden");
  }
  appContent.classList.remove("single-column");
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
  if (taskAttachmentInput) taskAttachmentInput.value = "";
  if (taskAttachmentList) taskAttachmentList.innerHTML = "";
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

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function showGmailDetail(messageId) {
  // キャッシュからメッセージデータを取得
  const message = gmailMessageCache[messageId];
  if (!message) {
    console.error("Message not found in cache:", messageId);
    return;
  }

  console.log("showGmailDetail called:", messageId, message);

  if (gmailDetailPanel) gmailDetailPanel.classList.remove("hidden");

  // キャッシュの整形済みデータを使用
  const subject = message.subject || "(件名なし)";
  const from = message.from || "(送信者不明)";
  const date = message.date || "";
  const bodyText = message.bodyText || message.snippet || "(本文なし)";

  // 1. 各要素にデータを流し込む
  if (gmailDetailSubject) gmailDetailSubject.textContent = subject;
  if (gmailDetailFrom) gmailDetailFrom.textContent = `差出人: ${from}`;
  if (gmailDetailDate) gmailDetailDate.textContent = `日時: ${date}`;

  // 2. 本文を流し込む
  if (gmailDetailBody) {
    gmailDetailBody.textContent = bodyText;
  }

  // 3. ヘッダー詳細を表示
  const headers = message.payload?.headers || [];
  renderGmailDetailHeaders(headers);
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
  if (gmailDetailSubject) gmailDetailSubject.textContent = "";
  if (gmailDetailFrom) gmailDetailFrom.textContent = "";
  if (gmailDetailDate) gmailDetailDate.textContent = "";
  if (gmailDetailBody) gmailDetailBody.textContent = "";
  if (gmailDetailHeaders) gmailDetailHeaders.innerHTML = "";
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
      maxResults: 10,
    });

    const messages = response.result.messages || [];
    const listContainer = gmailList;
    listContainer.innerHTML = "";

    if (messages.length === 0) {
      listContainer.innerHTML = "<p>受信トレイにメールがありません。</p>";
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
      
      // メッセージデータを整形して保存
      const cachedMessage = {
        id: message.id,
        subject,
        from,
        date,
        bodyText,
        payload: payload,
        snippet: messageData.result.snippet,
        fullData: messageData.result
      };
      
      gmailMessageCache[message.id] = cachedMessage;
      console.log("Gmail message cached:", message.id, {
        subject,
        from,
        date,
        bodyText: bodyText.substring(0, 50)
      });

      const item = document.createElement("button");
      item.type = "button";
      item.className = "gmail-item gmail-item-button";
      item.dataset.messageId = message.id;
      item.innerHTML = `
        <h3>${escapeHtml(subject)}</h3>
        <p><strong>From:</strong> ${escapeHtml(from)}</p>
        <small>${escapeHtml(date)}</small>
      `;
      item.addEventListener("click", () => showGmailDetail(message.id));
      listContainer.appendChild(item);
    }
  } catch (error) {
    updateGmailStatus("Gmail メッセージの取得に失敗しました。", "error");
    console.error(error);
  }
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
  const account = users[username];
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

  const hashed = await hashPassword(password);
  users[username] = { password: hashed };
  saveUsers(users);

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

    // イベント一覧コンテナ
    const eventsContainer = document.createElement("div");
    eventsContainer.className = "events-container";

    if (tasks[key] && tasks[key].length > 0) {
      // 上位3件を表示（必要なら増やす）
      tasks[key].slice(0, 3).forEach((t) => {
        const ev = document.createElement("div");
        ev.className = "event";
        const title = t.title || t.text || "(タイトルなし)";
        let meta = "";
        if (t.project) meta += `[${t.project}] `;
        if (t.startTime) meta += `${t.startTime}`;
        if (t.endTime) meta += t.endTime ? `-${t.endTime} ` : " ";
        ev.textContent = `${meta}${title}`;
        eventsContainer.appendChild(ev);
      });
    }

    const count = document.createElement("div");
    count.className = "task-count";
    count.textContent = `${taskCount} 件`;

    cell.appendChild(label);
    cell.appendChild(eventsContainer);
    cell.appendChild(count);

    cell.addEventListener("click", () => {
      selectedDate = new Date(day.date);
      renderCalendar();
      renderTaskPanel();
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
      <div class="task-item-meta"><span class="priority-badge">${priorityLabel}</span> ${project} | ${startTime} 〜 ${endTime}</div>
    `;

    const detail = document.createElement("p");
    detail.className = "task-item-detail";
    detail.textContent = details;

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "complete";
    toggleButton.textContent = task.done ? "未完了" : "完了";
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

  // フォームにタスク情報を埋める
  if (taskDateInput) taskDateInput.value = dateKey;
  if (taskTitleInput) taskTitleInput.value = task.title || "";
  if (taskDetailInput) taskDetailInput.value = task.details || "";
  if (taskStartInput) taskStartInput.value = task.startTime || "";
  if (taskEndInput) taskEndInput.value = task.endTime || "";
  if (taskProjectSelect) taskProjectSelect.value = task.project || "個人";
  if (taskPrioritySelect) taskPrioritySelect.value = task.priority || "normal";
  if (taskAttachmentInput) taskAttachmentInput.value = "";
  if (taskAttachmentList) renderTaskAttachmentList(task.attachments || []);

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
      (attachment) =>
        `<div class="attachment-item"><span>${attachment.name}</span> <small>${Math.round(
          attachment.size / 1024
        )} KB</small></div>`
    )
    .join("");
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
  const newAttachments = taskAttachmentInput?.files && taskAttachmentInput.files.length > 0 ? await readAttachments(taskAttachmentInput.files) : null;

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

  hideTaskRegistrationView();
  renderCalendar();
  renderTaskPanel();
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
    showView(false);
    showLoginForm();
    return;
  }

  if (page === "mode.html") {
    if (!sessionUser || !getUsers()[sessionUser]) {
      window.location.href = "index.html";
      return;
    }
    currentUser = sessionUser;
    currentMode = null;
    clearMode();
    updateUserState();
    showModeSelectionView();
    return;
  }

  if (page === "app.html") {
    if (!sessionUser || !getUsers()[sessionUser]) {
      window.location.href = "index.html";
      return;
    }
    currentUser = sessionUser;
    currentMode = sessionMode;
    if (!currentMode) {
      window.location.href = "mode.html";
      return;
    }
    updateUserState();
    showAppView();
    return;
  }

  if (page === "attachments.html") {
    if (!sessionUser || !getUsers()[sessionUser]) {
      window.location.href = "index.html";
      return;
    }
    currentUser = sessionUser;
    currentMode = sessionMode;
    if (!currentMode) {
      window.location.href = "mode.html";
      return;
    }
    updateUserState();
    renderAttachmentsPage();
    return;
  }

  // デフォルトはログイン画面
  showView(false);
  showLoginForm();
}

initialize();
