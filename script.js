const apiKeyInput = document.getElementById("apiKey");
const apiEndpointInput = document.getElementById("apiEndpoint");
const modelNameInput = document.getElementById("modelName");
const characterGrid = document.getElementById("characterGrid");
const selectView = document.getElementById("selectView");
const chatView = document.getElementById("chatView");
const chatName = document.getElementById("chatName");
const chatMeta = document.getElementById("chatMeta");
const chatProfile = document.getElementById("chatProfile");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const backBtn = document.getElementById("backBtn");
const newChatBtn = document.getElementById("newChatBtn");
const apiModal = document.getElementById("apiModal");
const saveApiBtn = document.getElementById("saveApiBtn");

const STORAGE_KEYS = {
  apiKey: "ai_popin_api_key",
  apiEndpoint: "ai_popin_api_endpoint",
  model: "ai_popin_model",
  chats: "ai_popin_chats"
};

const ASSET_VERSION = "20260317";
const withVersion = (url) => `${url}${url.includes("?") ? "&" : "?"}v=${ASSET_VERSION}`;

let characters = [];
let currentCharacter = null;
let chatHistory = [];
let activeStream = null;
let worldData = null;
let exampleData = null;

const localReplies = (character) => [
  character.quote,
  character.intro,
  `我们可以聊聊${character.hobby}。`,
  `今天的心情适合${character.favorite_food}。`
];

const escapeHtml = (text) => {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

const scrollToBottom = (behavior = "auto") => {
  if (!chatMessages) return;
  const top = chatMessages.scrollHeight;
  try {
    chatMessages.scrollTo({ top, behavior });
  } catch {
    chatMessages.scrollTop = top;
  }
};

const scrollToBottomSoon = () => {
  requestAnimationFrame(() => {
    scrollToBottom("auto");
    setTimeout(() => scrollToBottom("auto"), 80);
  });
};

const addMessage = (role, content, options = {}) => {
  const message = document.createElement("div");
  message.className = `message ${role}${options.streaming ? " streaming" : ""}`;
  const textEl = document.createElement("div");
  textEl.className = "message-text";
  textEl.innerHTML = escapeHtml(content);
  message.appendChild(textEl);

  if (role === "user" && options.enableRollback) {
    const rollbackBtn = document.createElement("button");
    rollbackBtn.className = "rollback-btn";
    rollbackBtn.type = "button";
    rollbackBtn.textContent = "↩";
    rollbackBtn.title = "回退";
    rollbackBtn.dataset.index = String(options.index);
    rollbackBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      rollbackToIndex(Number(rollbackBtn.dataset.index));
    });
    message.appendChild(rollbackBtn);
  }
  chatMessages.appendChild(message);
  scrollToBottom("auto");
  return message;
};

const updateMessage = (element, content) => {
  const textEl = element.querySelector(".message-text") || element;
  textEl.innerHTML = escapeHtml(content);
  scrollToBottom("auto");
};

const getStoredChats = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.chats)) || {};
  } catch {
    return {};
  }
};

const saveChatHistory = () => {
  if (!currentCharacter) return;
  const allChats = getStoredChats();
  allChats[currentCharacter.id] = chatHistory;
  localStorage.setItem(STORAGE_KEYS.chats, JSON.stringify(allChats));
};

const loadChatHistory = (characterId) => {
  const allChats = getStoredChats();
  return allChats[characterId] || [];
};

const showApiModal = () => {
  if (apiModal) {
    apiModal.classList.remove("hidden");
  }
};

const hideApiModal = () => {
  if (apiModal) {
    apiModal.classList.add("hidden");
  }
};

const hydrateApiSettings = (data) => {
  const storedKey = localStorage.getItem(STORAGE_KEYS.apiKey) || "";
  const storedEndpoint = localStorage.getItem(STORAGE_KEYS.apiEndpoint);
  const storedModel = localStorage.getItem(STORAGE_KEYS.model);
  const defaultEndpoint = data.site?.api?.endpoint || "";
  const legacyEndpoints = new Set([
    "https://api.deepseek.com",
    "https://api.deepseek.com/v1",
    "https://api.deepseek.com/v1/chat/completions"
  ]);
  const finalEndpoint =
    storedEndpoint && !legacyEndpoints.has(storedEndpoint) ? storedEndpoint : defaultEndpoint;

  apiKeyInput.value = storedKey;
  apiEndpointInput.value = finalEndpoint;
  modelNameInput.value = storedModel || data.site?.api?.model || "";

  if (finalEndpoint) {
    localStorage.setItem(STORAGE_KEYS.apiEndpoint, finalEndpoint);
  }

  if (!apiKeyInput.value.trim()) {
    showApiModal();
  } else {
    hideApiModal();
  }

  apiKeyInput.addEventListener("input", () => {
    localStorage.setItem(STORAGE_KEYS.apiKey, apiKeyInput.value.trim());
  });

  apiEndpointInput.addEventListener("input", () => {
    localStorage.setItem(STORAGE_KEYS.apiEndpoint, apiEndpointInput.value.trim());
  });

  modelNameInput.addEventListener("input", () => {
    localStorage.setItem(STORAGE_KEYS.model, modelNameInput.value.trim());
  });
};

const renderCards = () => {
  characterGrid.innerHTML = "";
  characters.forEach((character) => {
    const card = document.createElement("div");
    card.className = "character-card";
    card.style.setProperty("--accent", character.accent);
    card.style.backgroundImage = `url(${withVersion(character.select_image)})`;
    card.innerHTML = `
      <div class="card-title-row">
        <div class="en">${character.name_en}</div>
        <div class="divider"></div>
        <div class="cn">${character.name_cn}</div>
      </div>
    `;
    card.addEventListener("click", () => selectCharacter(character.id));
    characterGrid.appendChild(card);
  });
};

const formatWorld = (data) => {
  if (!data) return "无";
  return JSON.stringify(data, null, 2);
};

const formatExamples = (data) => {
  if (!data || !Array.isArray(data.dialogues)) return "无";
  return data.dialogues
    .map((dialogue) => {
      const lines = (dialogue.conversation || [])
        .map((item) => `${item.speaker}: ${item.text}`)
        .join("\n");
      return `[场景] ${dialogue.scene}\n${lines}`;
    })
    .join("\n\n");
};

const buildSystemPrompt = (character) => {
  const base = `你是${character.display_name}，说话温柔自然，保持${character.role}的语气和性格。`;
  const world = `世界观设定:\n${formatWorld(worldData)}`;
  const examples = `示例对话:\n${formatExamples(exampleData)}`;
  return `${base}\n\n${world}\n\n${examples}`;
};

const renderChatMessages = () => {
  chatMessages.innerHTML = "";
  chatHistory.forEach((item, index) => {
    if (item.role === "user") {
      addMessage("user", item.content, { enableRollback: true, index });
    } else {
      addMessage("bot", item.content);
    }
  });
  scrollToBottom("auto");
};

const rollbackToIndex = (index) => {
  if (!currentCharacter || Number.isNaN(index)) return;
  if (activeStream) {
    activeStream.abort();
    activeStream = null;
  }
  chatHistory = chatHistory.slice(0, index);
  saveChatHistory();
  renderChatMessages();
};

const startNewChat = () => {
  if (!currentCharacter) return;
  if (activeStream) {
    activeStream.abort();
    activeStream = null;
  }
  chatHistory = [];
  saveChatHistory();
  renderChatMessages();
};

const selectCharacter = (id) => {
  const character = characters.find((item) => item.id === id);
  if (!character) return;
  currentCharacter = character;

  chatName.textContent = character.display_name;
  chatMeta.textContent = `${character.band} · ${character.role}`;
  chatProfile.classList.add("hidden");

  chatView.style.backgroundImage = `url(${withVersion(character.select_image)})`;
  chatView.classList.add("has-bg");

  chatHistory = loadChatHistory(character.id);
  renderChatMessages();

  selectView.classList.add("hidden");
  chatView.classList.remove("hidden");

  scrollToBottomSoon();
};

const typewriter = (element, fullText, speed = 18) => {
  return new Promise((resolve) => {
    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      updateMessage(element, fullText.slice(0, index));
      if (index >= fullText.length) {
        clearInterval(timer);
        resolve();
      }
    }, speed);
  });
};

const streamChat = async (payload, messageEl, signal) => {
  const response = await fetch(apiEndpointInput.value, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKeyInput.value.trim()}`
    },
    body: JSON.stringify({ ...payload, stream: true }),
    signal
  });

  if (!response.ok || !response.body) {
    let detail = `HTTP ${response.status}`;
    try {
      const errorBody = await response.json();
      detail = errorBody?.error?.message || errorBody?.message || detail;
    } catch {
      // ignore parsing error
    }
    throw new Error(detail);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let finalText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.replace(/^data:\s*/, "");
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          finalText += delta;
          updateMessage(messageEl, finalText);
        }
      } catch {
        // ignore malformed chunks
      }
    }
  }

  return finalText;
};

const sendMessage = async () => {
  const content = chatInput.value.trim();
  if (!content || !currentCharacter) return;

  if (activeStream) {
    activeStream.abort();
    activeStream = null;
  }

  chatHistory.push({ role: "user", content });
  addMessage("user", content, { enableRollback: true, index: chatHistory.length - 1 });
  saveChatHistory();
  chatInput.value = "";

  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    const messageEl = addMessage("bot", "", { streaming: true });
    await typewriter(messageEl, "未检测到 API Key，请在左侧填写后再发送。", 12);
    messageEl.classList.remove("streaming");
    return;
  }

  const messageEl = addMessage("bot", "", { streaming: true });
  const payload = {
    model: modelNameInput.value,
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(currentCharacter)
      },
      ...chatHistory
    ]
  };

  try {
    const controller = new AbortController();
    activeStream = controller;
    const streamText = await streamChat(payload, messageEl, controller.signal);
    messageEl.classList.remove("streaming");
    if (streamText) {
      chatHistory.push({ role: "assistant", content: streamText });
      saveChatHistory();
    }
    activeStream = null;
  } catch (error) {
    messageEl.classList.remove("streaming");
    const detail = error?.message ? `连接失败：${error.message}` : "连接失败：请检查 API Key 或网络";
    await typewriter(messageEl, detail, 12);
    console.error("API error:", error);
    activeStream = null;
  }
};

Promise.allSettled([
  fetch(withVersion("character.json")).then((res) => res.json()),
  fetch(withVersion("world.json")).then((res) => res.json()),
  fetch(withVersion("eample.json")).then((res) => res.json())
]).then((results) => {
  const [characterResult, worldResult, exampleResult] = results;
  if (characterResult.status !== "fulfilled") {
    characterGrid.innerHTML = "读取角色数据失败，请检查角色文件。";
    return;
  }

  const data = characterResult.value;
  characters = data.characters || [];
  worldData = worldResult.status === "fulfilled" ? worldResult.value : null;
  exampleData = exampleResult.status === "fulfilled" ? exampleResult.value : null;
  hydrateApiSettings(data);
  renderCards();
});

sendBtn.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});

backBtn.addEventListener("click", () => {
  chatView.classList.add("hidden");
  selectView.classList.remove("hidden");
  chatView.classList.remove("has-bg");
  chatView.style.backgroundImage = "";
});

newChatBtn.addEventListener("click", startNewChat);

if (saveApiBtn) {
  saveApiBtn.addEventListener("click", () => {
    if (apiKeyInput.value.trim()) {
      hideApiModal();
    } else {
      apiKeyInput.focus();
    }
  });
}
