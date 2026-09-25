window.EnglishSupabase = (function () {
  var client = null;

  function cfg() {
    return {
      url: window.SUPABASE_URL || "",
      key: window.SUPABASE_ANON_KEY || "",
    };
  }

  function configured() {
    var c = cfg();
    return !!(c.url && c.key && c.url.indexOf("YOUR_PROJECT") < 0);
  }

  function get() {
    if (!configured()) return null;
    if (!client && window.supabase) {
      client = window.supabase.createClient(cfg().url, cfg().key);
    }
    return client;
  }

  function saveLocal(url, key) {
    try {
      localStorage.setItem(
        "english-supabase",
        JSON.stringify({ url: url, key: key })
      );
    } catch (e) {}
  }

  function loadLocal() {
    try {
      var raw = localStorage.getItem("english-supabase");
      if (!raw) return false;
      var o = JSON.parse(raw);
      if (o.url && o.key) {
        window.SUPABASE_URL = o.url;
        window.SUPABASE_ANON_KEY = o.key;
        client = null;
        return true;
      }
    } catch (e) {}
    return false;
  }

  loadLocal();

  return {
    configured: configured,
    get: get,
    saveLocal: saveLocal,
    loadLocal: loadLocal,
  };
})();
