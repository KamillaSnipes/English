(function () {
  var STORAGE_KEY = "english-teacher-session";
  var debounceTimer = null;
  var session = null;
  var previewReady = false;
  var liveFileHandle = null;
  var archiveFileHandle = null;

  var els = {
    setup: document.getElementById("setup"),
    workspace: document.getElementById("workspace"),
    urlIn: document.getElementById("sb-url"),
    keyIn: document.getElementById("sb-key"),
    saveCfg: document.getElementById("save-cfg"),
    skipSupabase: document.getElementById("skip-supabase"),
    pickFolder: document.getElementById("pick-folder"),
    draft: document.getElementById("draft"),
    preview: document.getElementById("preview"),
    roomCode: document.getElementById("room-code"),
    studentLink: document.getElementById("student-link"),
    status: document.getElementById("status"),
    newRoom: document.getElementById("new-room"),
    finish: document.getElementById("finish-lesson"),
    template: document.getElementById("load-template"),
    modeLabel: document.getElementById("mode-label"),
  };

  function setStatus(msg, ok) {
    els.status.textContent = msg;
    els.status.style.color = ok === false ? "var(--coral)" : "var(--dim)";
  }

  function loadSession() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) session = JSON.parse(raw);
    } catch (e) {
      session = null;
    }
  }

  function saveSession() {
    if (!session) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  function studentUrl(code) {
    var base = window.location.href.replace(/teacher\.html.*$/, "index.html");
    var q = "live=" + encodeURIComponent(code);
    if (session && session.mode === "github") q += "&mode=github";
    return base + (base.indexOf("?") >= 0 ? "&" : "?") + q;
  }

  function renderPreview(topic) {
    els.preview.innerHTML = "";
    var nav = document.createElement("div");
    nav.id = "nav";
    nav.hidden = true;
    var back = document.createElement("button");
    back.id = "back";
    back.type = "button";
    back.textContent = "←";
    nav.appendChild(back);
    nav.appendChild(document.createElement("div")).id = "navttl";
    var app = document.createElement("div");
    app.id = "app";
    els.preview.appendChild(nav);
    els.preview.appendChild(app);
    if (!previewReady) {
      CourseUI.init({ topics: [topic], vocab: [] });
      previewReady = true;
    }
    CourseUI.topic(topic);
  }

  function parseAndPreview() {
    var text = els.draft.value;
    var id = session && session.lessonId ? session.lessonId : undefined;
    var topic = LessonParser.parse(text, id);
    if (session) session.lessonId = topic.id;
    renderPreview(topic);
    return topic;
  }

  async function pushDraft() {
    if (!session) return;
    var topic = parseAndPreview();
    try {
      await LessonSync.pushDraft(
        session,
        els.draft.value,
        topic,
        session.mode === "github" ? liveFileHandle : null
      );
      if (session.mode === "github" && !liveFileHandle) {
        setStatus(
          "Выберите папку English (кнопка выше) + запустите scripts/watch-and-push-live.sh",
          false
        );
        return;
      }
      setStatus("Саид видит обновление · " + new Date().toLocaleTimeString(), true);
    } catch (e) {
      setStatus("Ошибка: " + (e.message || e), false);
    }
  }

  function schedulePush() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(pushDraft, 700);
  }

  async function createRoom() {
    try {
      var created = await LessonSync.createRoom();
      var draft = els.draft.value || LessonParser.TEMPLATE;
      els.draft.value = draft;
      var topic = LessonParser.parse(draft);
      session = {
        room: created.room,
        secret: created.secret,
        mode: created.mode,
        lessonId: topic.id,
      };
      saveSession();
      els.roomCode.textContent = created.room;
      els.studentLink.value = studentUrl(created.room);
      if (els.modeLabel) {
        els.modeLabel.textContent =
          created.mode === "supabase" ? "Supabase (realtime)" : "GitHub (2–5 сек)";
      }
      if (created.mode === "github") {
        await pushDraft();
      } else {
        await LessonSync.pushDraft(session, draft, topic, null);
      }
      setStatus("Комната " + created.room + " — отправьте ссылку Саиду.", true);
      parseAndPreview();
    } catch (e) {
      setStatus("Комната: " + (e.message || e), false);
    }
  }

  async function finishLesson() {
    if (!session) return;
    if (!confirm("Завершить урок и сохранить в архив?")) return;
    var topic = parseAndPreview();
    await pushDraft();

    if (session.mode === "supabase") {
      var res = await LessonSync.archive(session);
      if (res.error) {
        setStatus("Архив: " + res.error.message, false);
        return;
      }
    } else if (archiveFileHandle) {
      var file = await archiveFileHandle.getFile();
      var list = [];
      try {
        list = JSON.parse(await file.text());
      } catch (e) {
        list = [];
      }
      list.push(topic);
      var w = await archiveFileHandle.createWritable();
      await w.write(JSON.stringify(list, null, 2));
      await w.close();
      setStatus("Урок добавлен в data/archived-lessons.json — дождитесь push.", true);
    }

    localStorage.removeItem(STORAGE_KEY);
    session = null;
    setStatus("Урок сохранён. Саид увидит тему в списке после обновления GitHub.", true);
  }

  async function pickFolder() {
    if (!window.showDirectoryPicker) {
      setStatus("Нужен Chrome/Edge для выбора папки", false);
      return;
    }
    try {
      var dir = await window.showDirectoryPicker();
      liveFileHandle = await dir.getFileHandle("live/session.json", { create: true });
      archiveFileHandle = await dir.getFileHandle("data/archived-lessons.json", {
        create: true,
      });
      setStatus("Папка подключена: live/session.json будет обновляться", true);
      if (session) schedulePush();
    } catch (e) {
      if (e.name !== "AbortError") setStatus(String(e), false);
    }
  }

  function showWorkspace() {
    els.setup.hidden = true;
    els.workspace.hidden = false;
    loadSession();
    if (session) {
      els.roomCode.textContent = session.room;
      els.studentLink.value = studentUrl(session.room);
      if (els.modeLabel) {
        els.modeLabel.textContent =
          session.mode === "supabase" ? "Supabase" : "GitHub";
      }
    } else {
      els.draft.value = LessonParser.TEMPLATE;
      parseAndPreview();
    }
  }

  els.saveCfg.addEventListener("click", function () {
    var url = els.urlIn.value.trim();
    var key = els.keyIn.value.trim();
    if (!url || !key) {
      setStatus("Введите URL и anon key", false);
      return;
    }
    window.SUPABASE_URL = url;
    window.SUPABASE_ANON_KEY = key;
    EnglishSupabase.saveLocal(url, key);
    setStatus("Supabase сохранён", true);
    showWorkspace();
  });

  if (els.skipSupabase) {
    els.skipSupabase.addEventListener("click", showWorkspace);
  }
  if (els.pickFolder) {
    els.pickFolder.addEventListener("click", pickFolder);
  }

  els.draft.addEventListener("input", function () {
    parseAndPreview();
    if (session) schedulePush();
  });

  els.newRoom.addEventListener("click", createRoom);
  els.finish.addEventListener("click", finishLesson);
  els.template.addEventListener("click", function () {
    if (els.draft.value.trim() && !confirm("Заменить текст шаблоном?")) return;
    els.draft.value = LessonParser.TEMPLATE;
    parseAndPreview();
    if (session) schedulePush();
  });

  els.studentLink.addEventListener("click", function () {
    var url = els.studentLink.value;
    if (navigator.clipboard && url) {
      navigator.clipboard.writeText(url).then(function () {
        setStatus("Ссылка скопирована", true);
      });
    }
  });

  showWorkspace();
})();
