(function () {
  function params() {
    return new URLSearchParams(window.location.search);
  }

  function mergeTopics(staticT, archived) {
    var list = staticT.slice();
    archived.forEach(function (row) {
      var j = row.lesson_json;
      if (!j || !j.id) return;
      var idx = list.findIndex(function (s) {
        return s.id === j.id;
      });
      if (idx >= 0) list[idx] = j;
      else list.push(j);
    });
    return list;
  }

  function startLive(room, mode, topics, vocab) {
    var footer = document.querySelector("footer");
    if (footer) {
      footer.textContent =
        mode === "supabase"
          ? "Сейчас идёт урок — экран обновляется сразу."
          : "Сейчас идёт урок — обновление каждые несколько секунд.";
    }

    var inited = false;
    var lastStamp = "";

    function apply(row) {
      if (!row || !row.lesson_json) return;
      var stamp = (row.updated_at || "") + (row.draft || "").length;
      if (stamp === lastStamp) return;
      lastStamp = stamp;
      if (!inited) {
        CourseUI.init({
          topics: topics,
          vocab: vocab,
          onBack: function () {
            window.location.href = "index.html";
          },
        });
        inited = true;
      }
      CourseUI.topic(row.lesson_json);
      document.getElementById("nav").hidden = false;
    }

    LessonSync.subscribeStudent(room, mode, apply);
  }

  async function main() {
    var staticData = window.CourseData;
    var topics = staticData.T.slice();
    var vocab = staticData.V.slice();

    var liveRoom = params().get("live");
    var mode = params().get("mode") || (EnglishSupabase.configured() ? "supabase" : "github");

    var archived = await LessonSync.fetchArchived();
    topics = mergeTopics(staticData.T, archived);

    if (liveRoom) {
      startLive(liveRoom.toUpperCase(), mode, topics, vocab);
      return;
    }

    CourseUI.init({ topics: topics, vocab: vocab });
    CourseUI.home({});
  }

  main();
})();
