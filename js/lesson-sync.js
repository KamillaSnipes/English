/** Supabase (если есть ключи) или GitHub raw + запись в папку репо */
window.LessonSync = (function () {
  var rawBase =
    window.GITHUB_RAW_BASE ||
    "https://raw.githubusercontent.com/KamilaSnipes/English/main";

  function supabase() {
    return window.EnglishSupabase && EnglishSupabase.configured()
      ? EnglishSupabase.get()
      : null;
  }

  function randomCode() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var s = "";
    for (var i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  async function createRoom() {
    var sb = supabase();
    if (sb) {
      var code = randomCode();
      var secret = crypto.randomUUID();
      var draft = "";
      var topic = { id: "live-" + code, ttl: "Урок", sub: "", rule: [], drill: [], hw: [] };
      var ins = await sb.from("live_sessions").insert({
        room_code: code,
        teacher_secret: secret,
        draft: draft,
        lesson_json: topic,
        title: topic.ttl,
      });
      if (ins.error) throw ins.error;
      return { mode: "supabase", room: code, secret: secret };
    }
    var room = randomCode();
    return { mode: "github", room: room, secret: null };
  }

  async function pushSupabase(session, draft, lessonJson) {
    var sb = supabase();
    var res = await sb.rpc("update_live_session", {
      p_room_code: session.room,
      p_teacher_secret: session.secret,
      p_draft: draft,
      p_lesson_json: lessonJson,
      p_title: lessonJson.ttl,
    });
    if (res.error) throw res.error;
  }

  async function pushGitHub(session, draft, lessonJson, fileHandle) {
    var payload = {
      room: session.room,
      updated_at: new Date().toISOString(),
      draft: draft,
      lesson_json: lessonJson,
      title: lessonJson.ttl || "",
    };
    var text = JSON.stringify(payload, null, 2);
    if (fileHandle) {
      var w = await fileHandle.createWritable();
      await w.write(text);
      await w.close();
      return;
    }
    try {
      localStorage.setItem("english-live-payload", text);
    } catch (e) {}
  }

  async function pushDraft(session, draft, lessonJson, fileHandle) {
    if (session.mode === "supabase") return pushSupabase(session, draft, lessonJson);
    return pushGitHub(session, draft, lessonJson, fileHandle);
  }

  async function archiveSupabase(session) {
    var sb = supabase();
    return sb.rpc("archive_live_session", {
      p_room_code: session.room,
      p_teacher_secret: session.secret,
    });
  }

  async function fetchArchivedSupabase() {
    var sb = supabase();
    if (!sb) return [];
    var res = await sb
      .from("archived_lessons")
      .select("lesson_json, sort_order")
      .order("sort_order", { ascending: true });
    if (res.error) return [];
    return res.data || [];
  }

  async function fetchArchivedGitHub() {
    var url = rawBase + "/data/archived-lessons.json?t=" + Date.now();
    try {
      var r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return [];
      var data = await r.json();
      return (data || []).map(function (j) {
        return { lesson_json: j };
      });
    } catch (e) {
      return [];
    }
  }

  async function fetchArchived() {
    if (supabase()) return fetchArchivedSupabase();
    return fetchArchivedGitHub();
  }

  function subscribeSupabase(room, onData) {
    var sb = supabase();
    sb.from("live_sessions")
      .select("draft, lesson_json, title, updated_at")
      .eq("room_code", room)
      .maybeSingle()
      .then(function (res) {
        if (res.data) onData(res.data);
      });
    return sb
      .channel("live-" + room)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_sessions",
          filter: "room_code=eq." + room,
        },
        function (payload) {
          if (payload.new) onData(payload.new);
        }
      )
      .subscribe();
  }

  function subscribeGitHub(room, onData) {
    var last = "";
    function poll() {
      var url = rawBase + "/live/session.json?t=" + Date.now();
      fetch(url, { cache: "no-store" })
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (data) {
          if (!data || !data.lesson_json) return;
          if (data.room && data.room !== room) return;
          var stamp = data.updated_at + (data.draft || "").length;
          if (stamp === last) return;
          last = stamp;
          onData(data);
        })
        .catch(function () {});
    }
    poll();
    return setInterval(poll, 2000);
  }

  function subscribeStudent(room, sessionMode, onData) {
    if (sessionMode === "supabase" && supabase()) return subscribeSupabase(room, onData);
    return subscribeGitHub(room, onData);
  }

  return {
    createRoom: createRoom,
    pushDraft: pushDraft,
    archive: archiveSupabase,
    fetchArchived: fetchArchived,
    subscribeStudent: subscribeStudent,
    rawBase: rawBase,
  };
})();
