import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDCm8jh-gz3T8OkOH2J6ls66t5QizcKwu8",
  authDomain: "app-unila.firebaseapp.com",
  projectId: "app-unila",
  storageBucket: "app-unila.firebasestorage.app",
  messagingSenderId: "574505875323",
  appId: "1:574505875323:web:fb885f0a2ae32b272fafde",
  measurementId: "G-FJT3X93608",
};

const ADMIN_EMAIL = "fernando2018a1986@gmail.com";
const CLOUDINARY_CLOUD_NAME = "dthnn5flq";
const CLOUDINARY_UPLOAD_PRESET = "ml_default";
const LANGUAGES = ["pt", "fr", "es"];
const LABEL_KEYS = [
  "home", "podcast", "music", "chatMenu", "portal", "inscreva", "sigaa", "email",
  "google", "instagram", "facebook", "library", "intercampus", "notices", "emergency",
  "addresses", "ru", "group", "developer", "privacy", "notes", "share", "internet",
  "study", "academicGoals", "studentAid", "mentalHealth", "enem", "news", "conheca",
  "desapega", "upa",
];
const CONTENT_KEYS = [
  "portal_unila", "inscreva", "sigaa", "email", "google", "instagram", "facebook",
  "biblioteca", "intercampi", "editais", "emergencia", "enderecos", "ru", "dev",
  "internet", "estude", "auxilio_estudantil", "saude_mental", "enem", "grupo_facebook",
  "noticias", "upa",
];

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const state = { currentPage: "home", cache: {} };

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

function showStatus(message, success = false) {
  $("status").innerHTML = message
    ? `<div class="status-message ${success ? "success" : ""}">${esc(message)}</div>`
    : "";
}

function showLoginError(message) {
  $("loginMsg").textContent = message;
}

function isAuthorized(user) {
  return Boolean(user && user.email === ADMIN_EMAIL && user.emailVerified !== false);
}

function firebaseErrorMessage(error) {
  const messages = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/invalid-login-credentials": "E-mail ou senha incorretos.",
    "auth/wrong-password": "A senha informada está incorreta.",
    "auth/user-not-found": "Não existe uma conta Firebase com este e-mail.",
    "auth/user-disabled": "Esta conta foi desativada no Firebase.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos.",
    "auth/network-request-failed": "Falha de conexão.",
    "auth/operation-not-allowed": "Login por e-mail e senha não está habilitado.",
    "auth/invalid-email": "O formato do e-mail é inválido.",
  };
  return messages[error?.code] || `Não foi possível entrar. Código: ${error?.code || "desconhecido"}.`;
}

function openPage(page) {
  const pageInfo = {
    home: ["Visão geral", "Conteúdos essenciais do aplicativo."],
    content: ["Textos e botões", "IDs button_label_* e button_content_* em PT, FR e ES."],
    news: ["Notícias", "Publicações exibidas no aplicativo."],
    conheca: ["Conheça a Unila", "Publicações da coleção conhecaUnila."],
    users: ["Usuários", "Visualize usuários, nicks e bloqueios globais."],
    moderation: ["Moderação", "Bloqueios e denúncias."],
  };
  state.currentPage = page;
  document.querySelectorAll(".page").forEach((element) => element.classList.add("hidden"));
  $(`${page}Page`).classList.remove("hidden");
  document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
  $("pageTitle").textContent = pageInfo[page][0];
  $("pageDescription").textContent = pageInfo[page][1];

  if (page === "home") renderHome();
  if (page === "content") renderContent();
  if (page === "news") renderCollectionEditor("news", "newsPage", "Notícias", [
    ["title", "Título do vídeo"], ["videoName", "Nome do vídeo"], ["content", "Descrição", "textarea"], ["videoUrl", "URL do vídeo"], ["videoThumbUrl", "URL da miniatura"],
  ]);
  if (page === "conheca") renderCollectionEditor("conhecaUnila", "conhecaPage", "Conheça a Unila", [
    ["title", "Título do post"], ["videoName", "Nome do arquivo"], ["content", "Descrição", "textarea"], ["videoUrl", "URL do vídeo"], ["videoThumbUrl", "URL da miniatura"],
  ]);
  if (page === "users") renderUsers();
  if (page === "moderation") renderModeration();
}

function renderHome() {
  $("homePage").innerHTML = `
    <div class="metric-grid">
      <div class="metric"><span class="muted">Conta</span><strong>ADMIN</strong></div>
      <div class="metric"><span class="muted">Rótulos disponíveis</span><strong>${LABEL_KEYS.length * 3}</strong></div>
      <div class="metric"><span class="muted">Conteúdos disponíveis</span><strong>${CONTENT_KEYS.length * 3}</strong></div>
    </div>
    <div class="card" style="margin-top:15px">
      <h3>Segurança</h3>
      <p class="muted">A configuração Web do Firebase pode aparecer no navegador. A proteção real deve estar nas regras do Firebase. Nunca coloque senha ou chave privada neste arquivo.</p>
    </div>`;
}

function knownContentIds() {
  const labelIds = LABEL_KEYS.flatMap((key) => LANGUAGES.map((language) => `button_label_${key}_${language}`));
  const contentIds = CONTENT_KEYS.flatMap((key) => LANGUAGES.map((language) => `button_content_${key}_${language}`));
  return [...labelIds, ...contentIds];
}

function parseValue(value) {
  try { return JSON.parse(value); } catch { return value; }
}

async function readCollection(name) {
  const snapshot = await getDocs(query(collection(db, name), limit(300)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

async function saveRecord(name, id, data, refresh = true) {
  await setDoc(doc(db, name, id), data, { merge: true });
  if (!refresh) return;
  showStatus("Registro salvo com sucesso.", true);
  openPage(state.currentPage);
}

async function removeRecord(name, id) {
  if (!window.confirm("Excluir este registro?")) return;
  await deleteDoc(doc(db, name, id));
  showStatus("Registro excluído.", true);
  openPage(state.currentPage);
}

function valueForEditor(value) {
  return typeof value === "object" ? JSON.stringify(value, null, 2) : String(value ?? "");
}

function safeMediaUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

function recordVideoUrl(item) {
  if (safeMediaUrl(item.videoUrl)) return item.videoUrl;
  if (item.mediaType === "video" && safeMediaUrl(item.mediaUrl)) return item.mediaUrl;
  return "";
}

function recordImageUrl(item) {
  if (safeMediaUrl(item.imageUrl)) return item.imageUrl;
  if (item.mediaType === "image" && safeMediaUrl(item.mediaUrl)) return item.mediaUrl;
  return "";
}

function recordVideoLabel(item, index = 0) {
  return String(item.title || item.videoName || item.videoTitle || item.caption || `Vídeo ${String(index + 1).padStart(2, "0")}`).trim();
}

function recordVideoName(item, index = 0) {
  return String(item.videoName || item.videoTitle || `Arquivo ${String(index + 1).padStart(2, "0")}`).trim();
}

function renderMediaPreview(imageUrl, videoUrl) {
  const image = safeMediaUrl(imageUrl);
  const video = safeMediaUrl(videoUrl);
  if (!image && !video) return "<div class=\"muted\">Nenhuma mídia informada.</div>";
  return `${image ? `<img src="${esc(image)}" alt="Pré-visualização da imagem" loading="lazy">` : ""}${video ? `<video src="${esc(video)}" controls preload="metadata"></video>` : ""}<a href="${esc(image || video)}" target="_blank" rel="noopener">Abrir mídia em nova aba</a>`;
}

function renderVideoListItem(item, index = 0) {
  const video = safeMediaUrl(recordVideoUrl(item));
  const image = safeMediaUrl(recordImageUrl(item));
  const poster = safeMediaUrl(item.videoThumbUrl);
  const title = recordVideoLabel(item, index);
  const name = recordVideoName(item, index);
  const preview = video ? `<video src="${esc(video)}"${poster ? ` poster="${esc(poster)}"` : ""} controls preload="metadata" playsinline></video>` : image ? `<img src="${esc(image)}" alt="${esc(title)}" loading="lazy">` : "<div class=\"video-missing\">Sem mídia</div>";
  return `<div class="video-list-item">${preview}<div class="video-list-info"><strong>${esc(title)}</strong><small>${esc(name)}</small></div></div>`;
}

async function uploadMediaFile(file) {
  if (!file) return "";
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const maxBytes = isVideo ? 120 * 1024 * 1024 : 10 * 1024 * 1024;
  if ((!isImage && !isVideo) || file.size > maxBytes) {
    throw new Error(isVideo ? "Selecione um vídeo de até 120 MB." : "Selecione uma imagem de até 10 MB.");
  }
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: "POST", body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.secure_url) throw new Error(data.error?.message || "O upload foi rejeitado.");
  return data.secure_url;
}

async function renderContent() {
  const items = await readCollection("admin_content");
  state.cache = Object.fromEntries(items.map((item) => [item.id, item]));
  const buttons = [
    ["portal_unila", "Portal Oficial da Unila"], ["inscreva", "Portal Inscreva"],
    ["sigaa", "Sistema Acadêmico SIGAA"], ["email", "E-mail Institucional"],
    ["google", "Pesquisa Google"], ["instagram", "Instagram Unila"], ["facebook", "Facebook Unila"],
    ["biblioteca", "Biblioteca Unila"], ["intercampi", "Transporte Intercampi"], ["editais", "Editais Oficiais"],
    ["emergencia", "Telefones de Emergência"], ["enderecos", "Endereços dos Campus"],
    ["ru", "Restaurantes Universitários"], ["grupo_facebook", "Grupo no Facebook"],
    ["dev", "Desenvolvedor"], ["privacy", "Privacidade e exclusão"], ["notes", "Anotações"],
    ["share", "Compartilhar App"], ["internet", "Internet Unila"], ["estude", "Estude na Unila"],
    ["academicGoals", "Meta Acadêmica"], ["studentAid", "Auxílio Estudantil"], ["mentalHealth", "Saúde Mental"],
    ["enem", "ENEM"], ["news", "Notícias"], ["conheca", "Conheça a Unila"],
    ["desapega", "Achados e Perdidos e Desapega"], ["upa", "Hospitais de Emergência 24h (UPA)"],
  ];
  const languageNames = { pt: "Português", fr: "Français", es: "Español" };
  const selectedKey = { value: buttons[0][0] };
  const selectedLanguage = { value: "pt" };

  $("contentPage").innerHTML = `
    <div class="grid">
      <div class="card">
        <h3>Botões do aplicativo <span class="muted">${buttons.length}</span></h3>
        <input id="contentSearch" placeholder="Filtrar botões" aria-label="Filtrar botões">
        <div id="contentList" class="list" style="margin-top:10px"></div>
      </div>
      <div class="card">
        <h3>Editar botão</h3>
        <p class="muted">Cada botão aparece uma única vez. O rótulo e o conteúdo completo são salvos juntos.</p>
        <label for="contentLanguage">Idioma</label>
        <select id="contentLanguage">${Object.entries(languageNames).map(([id, name]) => `<option value="${id}">${name}</option>`).join("")}</select>
        <label for="contentLabel">Texto exibido no botão</label>
        <input id="contentLabel">
        <label for="contentValue">Conteúdo completo</label>
        <textarea id="contentValue" rows="12"></textarea>
        <div class="actions"><button id="saveButtonContent" class="button primary-button" type="button">Salvar botão</button><button id="clearContent" class="button" type="button">Limpar</button></div>
        <p class="muted" style="margin-bottom:0">Os IDs técnicos ficam ocultos e são gerenciados automaticamente.</p>
      </div>
    </div>`;

  function idsFor(key, language) {
    return { label: `button_label_${key}_${language}`, content: `button_content_${key}_${language}` };
  }
  function currentButton() { return buttons.find(([key]) => key === selectedKey.value) || buttons[0]; }
  function loadEditor() {
    const [key, fallbackLabel] = currentButton();
    const ids = idsFor(key, selectedLanguage.value);
    $("contentLabel").value = String(state.cache[ids.label]?.value ?? fallbackLabel);
    $("contentValue").value = valueForEditor(state.cache[ids.content]?.value);
    $("contentLanguage").value = selectedLanguage.value;
  }
  function drawList() {
    const search = $("contentSearch").value.toLowerCase();
    const visible = buttons.filter(([key, label]) => `${key} ${label}`.toLowerCase().includes(search));
    $("contentList").innerHTML = visible.map(([key, label]) => `<button class="row ${key === selectedKey.value ? "active" : ""}" data-key="${esc(key)}" type="button"><span><strong>${esc(label)}</strong><small>${esc(key)}</small></span>›</button>`).join("") || '<div class="empty">Nenhum botão encontrado.</div>';
    document.querySelectorAll("#contentList .row").forEach((row) => row.addEventListener("click", () => {
      selectedKey.value = row.dataset.key;
      drawList();
      loadEditor();
    }));
  }
  $("contentSearch").addEventListener("input", drawList);
  $("contentLanguage").addEventListener("change", () => { selectedLanguage.value = $("contentLanguage").value; loadEditor(); });
  $("saveButtonContent").addEventListener("click", async () => {
    const [key] = currentButton();
    const ids = idsFor(key, selectedLanguage.value);
    const label = $("contentLabel").value.trim();
    if (!label) { showStatus("Informe o texto do botão."); return; }
    await Promise.all([
      saveRecord("admin_content", ids.label, { value: label }, false),
      saveRecord("admin_content", ids.content, { value: $("contentValue").value }, false),
    ]);
    showStatus("Botão salvo com sucesso.", true);
    openPage(state.currentPage);
  });
  $("clearContent").addEventListener("click", loadEditor);
  drawList();
  loadEditor();
}

async function renderCollectionEditor(collectionName, sectionId, title, fields) {
  const items = await readCollection(collectionName);
  const section = $(sectionId);
  section.innerHTML = `
    <div class="grid">
      <div class="card"><h3>${title} <span class="muted">${items.length}</span></h3><div class="video-list">${items.map((item, index) => `<div class="video-row" data-id="${esc(item.id)}" role="button" tabindex="0">${renderVideoListItem(item, index)}</div>`).join("") || '<div class="empty">Nenhum vídeo cadastrado.</div>'}</div></div>
      <div class="card"><h3>Vídeo</h3><p class="muted">Selecione um vídeo na lista ou envie um novo. Informe somente o título e o nome.</p><form id="recordForm"><input id="recordId" type="hidden"><div>${fields.map(([key, label, type]) => `<label for="f_${key}">${label}</label>${type === "textarea" ? `<textarea id="f_${key}"></textarea>` : `<input id="f_${key}">`}`).join("")}</div><div class="upload-row"><label for="videoFile">Enviar vídeo</label><input id="videoFile" type="file" accept="video/mp4,video/webm,video/quicktime"><small class="muted">Até 120 MB. O nome do arquivo será preenchido automaticamente.</small></div><div class="upload-row"><label for="videoThumbFile">Enviar miniatura (opcional)</label><input id="videoThumbFile" type="file" accept="image/*"><small class="muted">A URL será preenchida automaticamente.</small></div><div id="mediaPreview" class="media-preview hidden"></div><div class="actions"><button class="button primary-button">Salvar vídeo</button><button type="button" id="deleteCurrent" class="button danger-button hidden">Excluir</button><button type="button" id="clearCurrent" class="button">Limpar</button></div></form></div>
    </div>`;

  items.forEach((item) => section.querySelector(`[data-id="${CSS.escape(item.id)}"]`)?.addEventListener("click", () => {
    $("recordId").value = item.id;
    fields.forEach(([key]) => {
      const value = key === "title" ? (item.title || item.caption || "") : key === "videoUrl" ? (item.videoUrl || (item.mediaType === "video" ? item.mediaUrl : "")) : key === "videoName" ? recordVideoName(item) : item[key];
      $(`f_${key}`).value = value || "";
    });
    updateMediaPreview();
    $("deleteCurrent").classList.remove("hidden");
  }));
  function updateMediaPreview() {
    const preview = $("mediaPreview");
    if (!preview) return;
    const image = $("f_imageUrl")?.value;
    const video = $("f_videoUrl")?.value;
    preview.innerHTML = renderMediaPreview(image, video);
    preview.classList.toggle("hidden", !safeMediaUrl(image) && !safeMediaUrl(video));
  }
  [$("f_imageUrl"), $("f_videoUrl"), $("f_videoThumbUrl")].filter(Boolean).forEach((field) => field.addEventListener("input", updateMediaPreview));
  async function bindUpload(inputId, targetId, nameTargetId = "") {
    const input = $(inputId);
    if (!input || !$(targetId)) return;
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      input.disabled = true;
      try {
        showStatus("Enviando mídia...", true);
        $(targetId).value = await uploadMediaFile(file);
        if (nameTargetId && $(nameTargetId) && !$(nameTargetId).value.trim()) $(nameTargetId).value = file.name;
        updateMediaPreview();
        showStatus("Mídia enviada. Revise e clique em Salvar.", true);
      } catch (error) {
        showStatus(error instanceof Error ? error.message : "Falha ao enviar mídia.");
      } finally { input.disabled = false; }
    });
  }
  bindUpload("videoFile", "f_videoUrl", "f_videoName");
  bindUpload("videoThumbFile", "f_videoThumbUrl");
  $("recordForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = $("recordId").value.trim() || crypto.randomUUID();
    const data = Object.fromEntries(fields.map(([key]) => [key, $(`f_${key}`).value.trim()]));
    if (collectionName === "conhecaUnila") data.caption = data.title || "";
    if (collectionName === "news") { data.timestamp = serverTimestamp(); data.createdAt = serverTimestamp(); }
    await saveRecord(collectionName, id, data);
  });
  $("deleteCurrent").addEventListener("click", () => {
    const id = $("recordId").value.trim();
    if (id) removeRecord(collectionName, id);
  });
  $("clearCurrent").addEventListener("click", () => openPage(state.currentPage));
}

async function renderUsers() {
  const [users, bans] = await Promise.all([readCollection("users"), readCollection("bannedUsers")]);
  const bannedById = Object.fromEntries(bans.map((item) => [item.id, item]));
  $("usersPage").innerHTML = `
    <div class="grid">
      <div class="card"><h3>Usuários registrados <span class="muted">${users.length}</span></h3><input id="userSearch" placeholder="Filtrar por nick ou UID" aria-label="Filtrar usuários"><div id="userList" class="list" style="margin-top:10px"></div></div>
      <div class="card"><h3>Bloqueio global</h3><p class="muted">O bloqueio usa o Firebase UID como ID e é aplicado pelo aplicativo em tempo real.</p><form id="userBanForm"><label for="userUid">UID do usuário</label><input id="userUid" required><label for="userNick">Nick de referência</label><input id="userNick"><label for="userBanReason">Motivo</label><textarea id="userBanReason"></textarea><div class="actions"><button class="button danger-button">Bloquear usuário</button><button type="button" id="unbanButton" class="button">Desbloquear UID</button></div></form></div>
    </div>`;

  const drawUsers = () => {
    const search = $("userSearch").value.toLowerCase();
    const visible = users.filter((user) => `${user.id} ${user.uid || ""} ${user.nick || ""} ${user.email || ""}`.toLowerCase().includes(search));
    $("userList").innerHTML = visible.map((user) => {
      const uid = String(user.uid || user.ownerUid || user.id);
      const ban = bannedById[uid];
      return `<button class="row" type="button" data-uid="${esc(uid)}" data-nick="${esc(user.nick || "")}"><span><strong>${esc(user.nick || user.id)}</strong><small>UID: ${esc(uid)}${ban?.banned || ban?.blocked ? " · BLOQUEADO" : ""}</small></span>›</button>`;
    }).join("") || '<div class="empty">Nenhum usuário encontrado.</div>';
    document.querySelectorAll("#userList .row").forEach((row) => row.addEventListener("click", () => {
      $("userUid").value = row.dataset.uid;
      $("userNick").value = row.dataset.nick;
      $("userBanReason").value = bannedById[row.dataset.uid]?.reason || "";
    }));
  };
  $("userSearch").addEventListener("input", drawUsers);
  $("userBanForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const uid = $("userUid").value.trim();
    if (!uid) return;
    await saveRecord("bannedUsers", uid, { uid, nick: $("userNick").value.trim(), reason: $("userBanReason").value.trim(), banned: true, blocked: true, updatedAt: serverTimestamp() });
  });
  $("unbanButton").addEventListener("click", async () => {
    const uid = $("userUid").value.trim();
    if (!uid) { showStatus("Informe o UID para desbloquear."); return; }
    if (bannedById[uid]) await removeRecord("bannedUsers", uid);
    else showStatus("Este UID não possui bloqueio registrado.");
  });
  drawUsers();
}

async function renderModeration() {
  $("moderationPage").innerHTML = `
    <div class="grid">
      <div class="card"><h3>Bloquear usuário</h3><form id="banForm"><label for="banId">UID ou identificador</label><input id="banId" required><label for="banReason">Motivo</label><textarea id="banReason"></textarea><button class="button danger-button">Salvar bloqueio</button></form></div>
      <div class="card"><h3>Denúncias</h3><div id="reports" class="list">Carregando...</div></div>
    </div>`;
  $("banForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveRecord("bannedUsers", $("banId").value.trim(), { reason: $("banReason").value.trim(), createdAt: serverTimestamp() });
  });
  const reports = await readCollection("ugc_reports");
  $("reports").innerHTML = reports.map((item) => `<div class="row"><span><strong>${esc(item.type || "Denúncia")}</strong><small>${esc(item.text || item.reason || item.id)}</small></span></div>`).join("") || '<div class="empty">Nenhuma denúncia.</div>';
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  showLoginError("");
  const email = $("email").value.trim();
  const password = $("password").value;
  const button = $("loginButton");
  button.disabled = true;
  button.textContent = "Verificando...";
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    if (!isAuthorized(result.user)) { await signOut(auth); throw { code: "auth/not-authorized" }; }
  } catch (error) {
    showLoginError(error?.code === "auth/not-authorized" ? "Esta conta não está autorizada para o AdminPanel." : firebaseErrorMessage(error));
  } finally {
    button.disabled = false;
    button.textContent = "Entrar no painel";
  }
});

$("logoutButton").addEventListener("click", () => signOut(auth));
document.querySelectorAll(".nav-button").forEach((button) => button.addEventListener("click", () => openPage(button.dataset.page)));
onAuthStateChanged(auth, (user) => {
  if (isAuthorized(user)) {
    $("loginView").classList.add("hidden");
    $("panelView").classList.remove("hidden");
    $("account").textContent = user.email;
    openPage("home");
  } else {
    $("loginView").classList.remove("hidden");
    $("panelView").classList.add("hidden");
    if (user) { signOut(auth); showLoginError("Esta conta não está autorizada."); }
  }
});
