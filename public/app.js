const apiBase = "/api";

let currentProject = null;

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

// --- projects ---

async function refreshProjects() {
  try {
    const data = await fetchJSON(`${apiBase}/projects`);
    const list = document.getElementById("project-list");
    list.innerHTML = "";
    (data.projects || []).forEach((p) => {
      const div = document.createElement("div");
      div.className = "project-item" + (currentProject === p.id ? " active" : "");
      div.textContent = p.id;
      div.onclick = () => {
        currentProject = p.id;
        refreshProjects();
      };
      list.appendChild(div);
    });
  } catch (err) {
    console.error("refreshProjects error:", err);
  }
}

async function useOrCreateProject() {
  const input = document.getElementById("project-name");
  const name = input.value.trim() || "default-project";
  const data = await fetchJSON(`${apiBase}/projects`, {
    method: "POST",
    body: JSON.stringify({ name })
  });
  currentProject = data.project.name;
  input.value = "";
  refreshProjects();
}

// --- style ---

async function loadStyle() {
  try {
    const data = await fetchJSON(`${apiBase}/ai/style`);
    const p = data.profile;
    if (!p) return;
    document.getElementById("style-tone").value = p.tone || "friendly";
    document.getElementById("style-detail").value = p.detail || "medium";
    document.getElementById("style-emojis").value = p.emojis || "some";
    document.getElementById("style-formatting").value = p.formatting || "markdown";
  } catch (err) {
    console.error("loadStyle error:", err);
  }
}

async function saveStyle() {
  try {
    const body = {
      tone: document.getElementById("style-tone").value,
      detail: document.getElementById("style-detail").value,
      emojis: document.getElementById("style-emojis").value,
      formatting: document.getElementById("style-formatting").value
    };
    await fetchJSON(`${apiBase}/ai/style`, {
      method: "POST",
      body: JSON.stringify(body)
    });
    const s = document.getElementById("style-status");
    s.textContent = "Saved!";
    setTimeout(() => (s.textContent = ""), 1500);
  } catch (err) {
    console.error("saveStyle error:", err);
  }
}

// --- chat ---

function addChatMessage(role, text) {
  const log = document.getElementById("chat-log");
  const div = document.createElement("div");
  div.className = "msg " + role;
  const safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  div.innerHTML = `<div class="msg-bubble"><div class="msg-header">${role === "user" ? "You" : "AI"}</div><div class="msg-body">${safe}</div></div>`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function setLoading(loading) {
  const el = document.getElementById("chat-loading");
  if (loading) el.classList.remove("hidden");
  else el.classList.add("hidden");
}

async function sendChat() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  addChatMessage("user", text);
  setLoading(true);

  const mode = document.getElementById("mode").value;

  try {
    const data = await fetchJSON(`${apiBase}/ai/chat`, {
      method: "POST",
      body: JSON.stringify({
        message: text,
        mode,
        projectName: currentProject
      })
    });
    addChatMessage("ai", data.reply || "(no reply)");
  } catch (err) {
    addChatMessage("ai", "Error: " + err.message);
  } finally {
    setLoading(false);
  }
}

// --- schematic ---

async function generateSchematic() {
  const input = document.getElementById("schem-input");
  const text = input.value.trim();
  if (!text) return;

  const out = document.getElementById("schem-output");
  out.textContent = "Generating schematic JSON with Gemini Flash...";

  try {
    const data = await fetchJSON(`${apiBase}/ai/schematic`, {
      method: "POST",
      body: JSON.stringify({
        instructions: text,
        projectName: currentProject
      })
    });
    out.textContent = JSON.stringify(data.schematic, null, 2);
  } catch (err) {
    out.textContent = "Error: " + err.message;
  }
}

// --- chat reset ---

function newChat() {
  const log = document.getElementById("chat-log");
  log.innerHTML = "";
  addChatMessage(
    "ai",
    "👋 New chat started. Ask me about Create factories, modding, or anything else."
  );
}

// --- init ---

function init() {
  document.getElementById("create-project").onclick = useOrCreateProject;
  document.getElementById("save-style").onclick = saveStyle;
  document.getElementById("send-chat").onclick = sendChat;
  document.getElementById("gen-schem").onclick = generateSchematic;
  document.getElementById("new-chat").onclick = newChat;

  document
    .getElementById("chat-input")
    .addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChat();
      }
    });

  refreshProjects();
  loadStyle();
  newChat();
}

window.addEventListener("DOMContentLoaded", init);
