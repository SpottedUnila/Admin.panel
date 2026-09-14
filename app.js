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
  getDoc,
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
const DEFAULT_CONTENT = {
  portal_unila: "https://portal.unila.edu.br/",
  inscreva: "https://inscreva.unila.edu.br/",
  sigaa: "https://sig.unila.edu.br/sigaa/verTelaLogin.do",
  email: "https://mail.google.com/",
  google: "https://www.google.com/",
  instagram: "https://www.instagram.com/instaunila/",
  facebook: "https://www.facebook.com/unila.oficial",
  biblioteca: "https://portal.unila.edu.br/biblioteca",
  intercampi: "https://portal.unila.edu.br/proagi/delog/arquivos/horario-intercampi/quadro-de-horario-intercampi.pdf",
  editais: "https://documentos.unila.edu.br/",
  emergencia: "Polícia Militar: 190\nSAMU (Ambulância): 192\nBombeiros: 193\n\nHospital Municipal: (45) 2105-4100\nGuarda Municipal: (45) 2105-5100\nDelegacia da Mulher: (45) 3521-9200\nDefesa Civil: 199",
  enderecos: "Unila - Campus PTI\nAv. Tancredo Neves, 6731 - PTI, Foz do Iguaçu - PR\n\nUnila - Campus Juarez Távora\nAv. Silvio Américo Sasdelli, 1000 - Vila A, Foz do Iguaçu - PR\n\nUnila - Campus Jardim Universitário (JU)\nAv. Tarquínio Joslin dos Santos, 1000 - Lot. Universitário das Américas, Foz do Iguaçu - PR\n\nUnila - Campus Integração\nAv. Tancredo Neves, 3147 - Foz do Iguaçu - PR",
  ru: "RU PTI: Segunda a Sexta (11:00 - 14:00 e 17:30 - 20:00)\nRU JU: Segunda a Sexta (11:00 - 14:00 e 17:30 - 20:00)\n\nPreço para Estudantes: R$ 3,50\nPreço para Servidores: R$ 12,00",
  dev: "Equipe Spotted Unila\nContato: universecreativepixel@gmail.com",
  internet: "Rede: Unila-WIFI\nLogin: Seu CPF ou E-mail Institucional\nSenha: A mesma senha do SIGAA",
  estude: "Ingresso para Brasileiros: Via ENEM/SISU\nIngresso para Estrangeiros: Seleção Internacional Própria\n\nCursos: Mais de 29 opções de graduação.\n\nMais informações: portal.unila.edu.br/ingresso",
  auxilio_estudantil: "https://portal.unila.edu.br/prae/assistencia-estudantil/auxilios",
  saude_mental: "https://portal.unila.edu.br/saude-mental",
  enem: "https://enem.inep.gov.br/participante/",
  grupo_facebook: "https://www.facebook.com/groups/unila/",
  noticias: "https://portal.unila.edu.br/noticias",
  upa: "UPA João Samek (Vila A): (45) 3524-8800\nUPA Morumbi: (45) 3521-1350\n\nEm emergências, ligue 192 (SAMU).",
};

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
    ["title", "Título do post"], ["videoName", "Nome do arquivo"], ["content", "Descrição", "textarea"], ["imageUrl", "URL da imagem"], ["videoUrl", "URL do vídeo"], ["videoThumbUrl", "URL da miniatura"],
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

async function readKnownContent() {
  const ids = knownContentIds();
  const records = await Promise.all(ids.map(async (id) => {
    const snapshot = await getDoc(doc(db, "admin_content", id));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  }));
  return records.filter(Boolean);
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

function scrollToEditor(selector) {
  const target = document.querySelector(selector);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
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
  return `<div class="video-list-item">${preview}<div class="video-list-info"><strong>${esc(title)}</strong><small>${esc(name)}</small><button class="button edit-item" type="button" data-edit-id="${esc(item.id)}">Editar</button><button class="button danger-button inline-delete" type="button" data-delete-id="${esc(item.id)}">Excluir</button></div></div>`;
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
  const items = await readKnownContent();
  state.cache = Object.fromEntries(items.map((item) => [item.id, item]));
  const buttons = [
    ["portal_unila", "Portal Oficial da Unila", "portal"], ["inscreva", "Portal Inscreva", "inscreva"],
    ["sigaa", "Sistema Acadêmico SIGAA", "sigaa"], ["email", "E-mail Institucional", "email"],
    ["google", "Pesquisa Google", "google"], ["instagram", "Instagram Unila", "instagram"], ["facebook", "Facebook Unila", "facebook"],
    ["biblioteca", "Biblioteca Unila", "library"], ["intercampi", "Transporte Intercampi", "intercampus"], ["editais", "Editais Oficiais", "notices"],
    ["emergencia", "Telefones de Emergência", "emergency"], ["enderecos", "Endereços dos Campus", "addresses"],
    ["ru", "Restaurantes Universitários", "ru"], ["grupo_facebook", "Grupo no Facebook", "group"],
    ["dev", "Desenvolvedor", "developer"], ["privacy", "Privacidade e exclusão", "privacy"], ["notes", "Anotações", "notes"],
    ["share", "Compartilhar App", "share"], ["internet", "Internet Unila", "internet"], ["estude", "Estude na Unila", "study"],
    ["academicGoals", "Meta Acadêmica", "academicGoals"], ["auxilio_estudantil", "Auxílio Estudantil", "studentAid"], ["saude_mental", "Saúde Mental", "mentalHealth"],
    ["enem", "ENEM", "enem"], ["noticias", "Notícias", "news"], ["conheca", "Conheça a Unila", "conheca"],
    ["desapega", "Achados e Perdidos e Desapega", "desapega"], ["upa", "Hospitais de Emergência 24h (UPA)", "upa"],
  ].filter(([key]) => CONTENT_KEYS.includes(key));
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
      <div class="card content-editor-card">
        <h3>Editar botão</h3>
        <p class="muted">Cada botão aparece uma única vez. O rótulo e o conteúdo completo são salvos juntos.</p>
        <label for="contentLanguage">Idioma</label>
        <select id="contentLanguage">${Object.entries(languageNames).map(([id, name]) => `<option value="${id}">${name}</option>`).join("")}</select>
        <label for="contentLabel">Texto exibido no botão</label>
        <input id="contentLabel">
        <label for="contentValue">Conteúdo ou link do botão</label>
        <textarea id="contentValue" rows="12"></textarea>
        <div class="actions"><button id="saveButtonContent" class="button primary-button" type="button">Salvar botão</button><button id="clearContent" class="button" type="button">Limpar</button></div>
        <p class="muted" style="margin-bottom:0">Os IDs técnicos ficam ocultos e são gerenciados automaticamente.</p>
      </div>
    </div>`;

  function idsFor(button, language) {
    const [key, , labelKey = key] = button;
    return { label: `button_label_${labelKey}_${language}`, content: `button_content_${key}_${language}` };
  }
  function currentButton() { return buttons.find(([key]) => key === selectedKey.value) || buttons[0]; }
  async function loadEditor() {
    const button = currentButton();
    const [key, fallbackLabel] = button;
    const ids = idsFor(button, selectedLanguage.value);
    const selection = `${key}:${selectedLanguage.value}`;
    const records = await Promise.all([ids.label, ids.content].map(async (id) => {
      if (state.cache[id]) return state.cache[id];
      const snapshot = await getDoc(doc(db, "admin_content", id));
      if (!snapshot.exists()) return null;
      const record = { id: snapshot.id, ...snapshot.data() };
      state.cache[id] = record;
      return record;
    }));
    if (selection !== `${selectedKey.value}:${selectedLanguage.value}`) return;
    const [labelRecord, contentRecord] = records;
    const savedContent = String(contentRecord?.value ?? "");
    $("contentLabel").value = String(labelRecord?.value || fallbackLabel);
    $("contentValue").value = valueForEditor(savedContent.trim() ? savedContent : (DEFAULT_CONTENT[key] || ""));
    $("contentLanguage").value = selectedLanguage.value;
  }
  function drawList() {
    const search = $("contentSearch").value.toLowerCase();
    const visible = buttons.filter(([key, label]) => `${key} ${label}`.toLowerCase().includes(search));
    $("contentList").innerHTML = visible.map(([key, label]) => `<button class="row ${key === selectedKey.value ? "active" : ""}" data-key="${esc(key)}" type="button"><span><strong>${esc(label)}</strong><small>${esc(key)}</small></span>›</button>`).join("") || '<div class="empty">Nenhum botão encontrado.</div>';
    document.querySelectorAll("#contentList .row").forEach((row) => row.addEventListener("click", () => {
      selectedKey.value = row.dataset.key;
      drawList();
      void loadEditor().then(() => scrollToEditor("#contentPage .content-editor-card"));
    }));
  }
  $("contentSearch").addEventListener("input", drawList);
  $("contentLanguage").addEventListener("change", () => { selectedLanguage.value = $("contentLanguage").value; void loadEditor(); });
  $("saveButtonContent").addEventListener("click", async () => {
    const button = currentButton();
    const ids = idsFor(button, selectedLanguage.value);
    const label = $("contentLabel").value.trim();
    if (!label) { showStatus("Informe o texto do botão."); return; }
    await Promise.all([
      saveRecord("admin_content", ids.label, { value: label }, false),
      saveRecord("admin_content", ids.content, { value: $("contentValue").value }, false),
    ]);
    showStatus("Botão salvo com sucesso.", true);
    openPage(state.currentPage);
  });
  $("clearContent").addEventListener("click", () => { void loadEditor(); });
  drawList();
  void loadEditor();
}

async function renderCollectionEditor(collectionName, sectionId, title, fields) {
  const items = await readCollection(collectionName);
  const section = $(sectionId);
  const imageUpload = collectionName === "conhecaUnila" ? `<div class="upload-row"><label for="imageFile">Enviar imagem</label><input id="imageFile" type="file" accept="image/*"><small class="muted">Selecione uma imagem de até 10 MB. Ela será enviada primeiro e a URL será preenchida automaticamente.</small></div>` : "";
  section.innerHTML = `
    <div class="collection-editor-stack">
      <div class="card"><h3>Editar ${collectionName === "conhecaUnila" ? "post" : "notícia"}</h3><p class="muted">Para Conheça a Unila, selecione a imagem e toque em Enviar no topo. Depois revise e salve.</p><form id="recordForm"><input id="recordId" type="hidden"><div class="actions form-top-actions"><button class="button primary-button" type="submit">Enviar</button></div>${imageUpload}<div class="upload-row"><label for="videoFile">Enviar vídeo</label><input id="videoFile" type="file" accept="video/mp4,video/webm,video/quicktime"><small class="muted">Até 120 MB. O nome do arquivo será preenchido automaticamente.</small></div><div class="upload-row"><label for="videoThumbFile">Enviar miniatura (opcional)</label><input id="videoThumbFile" type="file" accept="image/*"><small class="muted">A URL será preenchida automaticamente.</small></div><div id="mediaPreview" class="media-preview hidden"></div><div class="form-fields">${fields.map(([key, label, type]) => `<label for="f_${key}">${label}</label>${type === "textarea" ? `<textarea id="f_${key}"></textarea>` : `<input id="f_${key}">`}`).join("")}</div><div class="actions"><button type="button" id="deleteCurrent" class="button danger-button hidden">Excluir</button><button type="button" id="clearCurrent" class="button">Limpar</button></div></form></div>
      <div class="card"><h3>${title} <span class="muted">${items.length}</span></h3><div class="video-list">${items.map((item, index) => `<div class="video-row" data-id="${esc(item.id)}" role="button" tabindex="0">${renderVideoListItem(item, index)}</div>`).join("") || '<div class="empty">Nenhum vídeo ou imagem cadastrado.</div>'}</div></div>
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
  section.querySelectorAll(".edit-item").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    section.querySelector(`[data-id="${CSS.escape(button.dataset.editId)}"]`)?.click();
    scrollToEditor(`#${sectionId} form`);
  }));
  section.querySelectorAll(".inline-delete").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    removeRecord(collectionName, button.dataset.deleteId);
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
  if (collectionName === "conhecaUnila") bindUpload("imageFile", "f_imageUrl");
  bindUpload("videoFile", "f_videoUrl", "f_videoName");
  bindUpload("videoThumbFile", "f_videoThumbUrl");
  $("recordForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const existingId = $("recordId").value.trim();
    const isNewRecord = !existingId || !items.some((item) => item.id === existingId);
    const id = existingId || crypto.randomUUID();
    const data = Object.fromEntries(fields.map(([key]) => [key, $(`f_${key}`).value.trim()]));
    if (collectionName === "conhecaUnila") {
      data.caption = data.title || "";
      data.updatedAt = serverTimestamp();
      if (isNewRecord) data.publishedAt = serverTimestamp();
    }
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
      <div class="card"><h3>Denúncias</h3><p class="muted">Exclua uma denúncia depois de analisá-la.</p><div id="reports" class="list">Carregando...</div></div>
    </div>`;
  $("banForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveRecord("bannedUsers", $("banId").value.trim(), { reason: $("banReason").value.trim(), createdAt: serverTimestamp() });
  });
  const reports = await readCollection("ugc_reports");
  $("reports").innerHTML = reports.map((item) => `<div class="row report-row"><span><strong>${esc(item.type || "Denúncia")}</strong><small>${esc(item.text || item.reason || item.id)}</small></span><button class="button danger-button report-delete" type="button" data-report-id="${esc(item.id)}">Excluir</button></div>`).join("") || '<div class="empty">Nenhuma denúncia.</div>';
  document.querySelectorAll("#reports .report-delete").forEach((button) => button.addEventListener("click", async () => {
    await removeRecord("ugc_reports", button.dataset.reportId);
  }));
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
