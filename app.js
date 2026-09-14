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
    ["title", "Título"], ["content", "Conteúdo", "textarea"], ["imageUrl", "URL da imagem"], ["videoUrl", "URL do vídeo"],
  ]);
  if (page === "conheca") renderCollectionEditor("conhecaUnila", "conhecaPage", "Conheça a Unila", [
    ["title", "Título"], ["content", "Conteúdo", "textarea"], ["imageUrl", "URL da imagem"], ["videoUrl", "URL do vídeo"],
  ]);
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

async function saveRecord(name, id, data) {
  await setDoc(doc(db, name, id), data, { merge: true });
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

async function renderContent() {
  const items = await readCollection("admin_content");
  state.cache = Object.fromEntries(items.map((item) => [item.id, item]));
  const allIds = [...new Set([...knownContentIds(), ...items.map((item) => item.id)])];
  $("contentPage").innerHTML = `
    <div class="grid">
      <div class="card">
        <h3>Documentos <span class="muted">${items.length}</span></h3>
        <input id="contentSearch" placeholder="Filtrar por ID ou texto" aria-label="Filtrar conteúdo">
        <div id="contentList" class="list" style="margin-top:10px"></div>
      </div>
      <div class="card">
        <h3>Editar conteúdo</h3>
        <form id="contentForm">
          <label for="contentId">ID do documento</label>
          <select id="contentId"><option value="">Escolha um ID</option>${allIds.map((id) => `<option value="${esc(id)}">${esc(id)}</option>`).join("")}</select>
          <label for="customId">ID personalizado</label>
          <input id="customId" placeholder="opcional">
          <label for="contentValue">Valor</label>
          <textarea id="contentValue"></textarea>
          <div class="actions"><button class="button primary-button">Salvar</button><button type="button" id="deleteContent" class="button danger-button hidden">Excluir</button><button type="button" id="clearContent" class="button">Limpar</button></div>
        </form>
      </div>
    </div>`;

  const drawList = () => {
    const search = $("contentSearch").value.toLowerCase();
    const html = allIds.filter((id) => `${id} ${state.cache[id]?.value ?? ""}`.toLowerCase().includes(search)).map((id) => `
      <button class="row" data-id="${esc(id)}" type="button"><span><strong>${esc(id)}</strong><small>${esc(state.cache[id]?.value ?? "Sem valor")}</small></span>›</button>`).join("");
    $("contentList").innerHTML = html || '<div class="empty">Nenhum documento.</div>';
    document.querySelectorAll("#contentList .row").forEach((row) => row.addEventListener("click", () => {
      const id = row.dataset.id;
      $("contentId").value = id;
      $("contentValue").value = valueForEditor(state.cache[id]?.value);
      $("deleteContent").classList.toggle("hidden", !state.cache[id]);
    }));
  };

  $("contentSearch").addEventListener("input", drawList);
  $("contentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = $("customId").value.trim() || $("contentId").value;
    if (!id) { showStatus("Informe um ID."); return; }
    await saveRecord("admin_content", id, { value: parseValue($("contentValue").value) });
  });
  $("clearContent").addEventListener("click", () => {
    $("contentId").value = ""; $("customId").value = ""; $("contentValue").value = ""; $("deleteContent").classList.add("hidden");
  });
  $("deleteContent").addEventListener("click", () => {
    const id = $("contentId").value;
    if (id && state.cache[id]) removeRecord("admin_content", id);
  });
  drawList();
}

async function renderCollectionEditor(collectionName, sectionId, title, fields) {
  const items = await readCollection(collectionName);
  const section = $(sectionId);
  section.innerHTML = `
    <div class="grid">
      <div class="card"><h3>${title} <span class="muted">${items.length}</span></h3><div class="list">${items.map((item) => `
        <button class="row" data-id="${esc(item.id)}" type="button"><span><strong>${esc(item.title || item.id)}</strong><small>${esc(item.content || "")}</small></span>›</button>`).join("") || '<div class="empty">Nenhum registro.</div>'}</div></div>
      <div class="card"><h3>Editar registro</h3><form id="recordForm"><label for="recordId">ID</label><input id="recordId" placeholder="vazio para criar"><div>${fields.map(([key, label, type]) => `<label for="f_${key}">${label}</label>${type === "textarea" ? `<textarea id="f_${key}"></textarea>` : `<input id="f_${key}">`}`).join("")}</div><div class="actions"><button class="button primary-button">Salvar</button><button type="button" id="deleteCurrent" class="button danger-button hidden">Excluir</button><button type="button" id="clearCurrent" class="button">Limpar</button></div></form></div>
    </div>`;

  items.forEach((item) => section.querySelector(`[data-id="${CSS.escape(item.id)}"]`)?.addEventListener("click", () => {
    $("recordId").value = item.id;
    fields.forEach(([key]) => { $(`f_${key}`).value = item[key] || ""; });
    $("deleteCurrent").classList.remove("hidden");
  }));
  $("recordForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = $("recordId").value.trim() || crypto.randomUUID();
    const data = Object.fromEntries(fields.map(([key]) => [key, $(`f_${key}`).value.trim()]));
    if (collectionName === "news") { data.timestamp = serverTimestamp(); data.createdAt = serverTimestamp(); }
    await saveRecord(collectionName, id, data);
  });
  $("deleteCurrent").addEventListener("click", () => {
    const id = $("recordId").value.trim();
    if (id) removeRecord(collectionName, id);
  });
  $("clearCurrent").addEventListener("click", () => openPage(state.currentPage));
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
