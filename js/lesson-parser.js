/* Парсер текста урока → объект темы (как в static-lessons) */
window.LessonParser = (function () {
  function slug(s) {
    return (
      "live-" +
      s
        .toLowerCase()
        .replace(/[^a-z0-9\u0400-\u04ff]+/gi, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 24) +
      "-" +
      Date.now().toString(36).slice(-4)
    );
  }

  function splitRow(line) {
    var m = line.match(/^(.+?)\s*[—–\-|]\s*(.+)$/);
    if (!m) return null;
    return [m[1].trim(), m[2].trim()];
  }

  function parseTable(lines) {
    var rows = [];
    lines.forEach(function (ln) {
      ln = ln.trim();
      if (!ln || /^[\|\-\s]+$/.test(ln)) return;
      if (ln.indexOf("|") >= 0) {
        var cells = ln
          .split("|")
          .map(function (c) {
            return c.trim();
          })
          .filter(Boolean);
        if (cells.length) rows.push(cells);
      }
    });
    if (rows.length < 2) return null;
    return { head: rows[0], rows: rows.slice(1) };
  }

  function parseDrillLine(line) {
    var m = line.match(/^\[(выбор|c|choice)\]\s*(.+)$/i);
    if (m) {
      var rest = m[2];
      var parts = rest.split("|").map(function (p) {
        return p.trim();
      });
      if (parts.length < 2) return null;
      var q = parts[0];
      var opts = parts[1].split("/").map(function (o) {
        return o.trim();
      });
      var key = parts[2];
      var k = 0;
      if (key !== undefined && key !== "") {
        var ki = parseInt(key, 10);
        if (!isNaN(ki) && ki >= 1) k = ki - 1;
        else {
          var idx = opts.findIndex(function (o) {
            return o.toLowerCase() === key.toLowerCase();
          });
          if (idx >= 0) k = idx;
        }
      }
      return { t: "c", q: q, o: opts, k: k };
    }
    m = line.match(/^\[(письмо|i|input)\]\s*(.+)$/i);
    if (m) {
      var p2 = m[2].split("|").map(function (p) {
        return p.trim();
      });
      var qq = p2[0];
      var ru = "";
      var answers = [];
      if (p2.length === 2) answers = p2[1].split("/").map(function (a) {
        return a.trim();
      });
      else if (p2.length >= 3) {
        ru = p2[1];
        answers = p2.slice(2).join("|").split("/").map(function (a) {
          return a.trim();
        });
      }
      return { t: "i", q: qq, ru: ru, a: answers.filter(Boolean) };
    }
    return null;
  }

  function parse(text, existingId) {
    var lines = (text || "").replace(/\r\n/g, "\n").split("\n");
    var ttl = "Урок";
    var sub = "";
    var rule = [];
    var drill = [];
    var hw = [];
    var section = "";
    var buf = [];
    var i = 0;

    function flushParagraph() {
      var t = buf.join(" ").trim();
      buf = [];
      if (t) rule.push({ t: "p", x: t });
    }

    function flushTable() {
      var tb = parseTable(buf);
      buf = [];
      if (tb) rule.push({ t: "table", head: tb.head, rows: tb.rows });
    }

    function flushList(kind) {
      var rows = [];
      buf.forEach(function (ln) {
        if (kind === "vlist") {
          var p = ln.split("|").map(function (x) {
            return x.trim();
          });
          if (p.length >= 3) rows.push([p[0], p[1], p[2]]);
          else {
            var r = splitRow(ln);
            if (r) rows.push([r[0], "", r[1]]);
          }
        } else {
          var r2 = splitRow(ln);
          if (r2) rows.push(r2);
        }
      });
      buf = [];
      if (!rows.length) return;
      if (kind === "vlist") rule.push({ t: "vlist", rows: rows });
      else rule.push({ t: "list", rows: rows });
    }

    for (; i < lines.length; i++) {
      var line = lines[i];
      var trim = line.trim();
      if (!trim) {
        if (section === "rule" && buf.length && buf[0].indexOf("|") < 0) flushParagraph();
        continue;
      }

      if (/^#\s+/.test(trim)) {
        flushParagraph();
        flushTable();
        ttl = trim.replace(/^#\s+/, "").trim();
        section = "meta";
        continue;
      }
      if (/^>\s+/.test(trim)) {
        sub = trim.replace(/^>\s+/, "").trim();
        continue;
      }
      if (/^##\s+/.test(trim)) {
        flushParagraph();
        flushTable();
        if (buf.length) flushList(section === "words" ? "list" : "list");
        var h = trim.replace(/^##\s+/, "").trim();
        var hl = h.toLowerCase();
        if (/домаш|homework/.test(hl)) {
          section = "hw";
          continue;
        }
        if (/на занят|тренаж|практик|упражн/.test(hl)) {
          section = "drill";
          rule.push({ t: "h", x: h });
          continue;
        }
        if (/^слова|vocab|лексик/.test(hl)) {
          section = "words";
          rule.push({ t: "h", x: h });
          continue;
        }
        section = "rule";
        rule.push({ t: "h", x: h });
        continue;
      }
      if (/^###\s+/.test(trim)) {
        flushParagraph();
        rule.push({ t: "h", x: trim.replace(/^###\s+/, "").trim() });
        section = "rule";
        continue;
      }

      if (section === "hw") {
        var hwLine = trim.replace(/^[-*•]\s*/, "");
        if (hwLine) hw.push(hwLine);
        continue;
      }

      if (section === "drill") {
        var d = parseDrillLine(trim);
        if (d) drill.push(d);
        else if (/^\[/.test(trim)) {
          /* skip malformed */
        } else {
          rule.push({ t: "note", x: trim });
        }
        continue;
      }

      if (section === "words") {
        if (trim.indexOf("|") >= 0) buf.push(trim);
        else {
          var row = splitRow(trim);
          if (row) buf.push(row[0] + " | | " + row[1]);
        }
        if (i + 1 >= lines.length || !lines[i + 1].trim() || /^#/.test(lines[i + 1].trim())) {
          flushList("vlist");
        }
        continue;
      }

      section = section || "rule";
      if (trim.indexOf("|") >= 0 && trim.split("|").length >= 2) {
        if (buf.length && buf[0].indexOf("|") < 0) flushParagraph();
        buf.push(trim);
        if (i + 1 >= lines.length || !lines[i + 1].trim() || /^#/.test(lines[i + 1].trim())) {
          flushTable();
        }
      } else {
        if (buf.length && buf[0].indexOf("|") >= 0) flushTable();
        var listRow = splitRow(trim);
        if (listRow && section !== "rule") {
          buf.push(trim);
        } else if (listRow && !trim.match(/^[A-Za-z]/)) {
          buf.push(trim);
        } else {
          buf.push(trim);
          if (i + 1 >= lines.length || !lines[i + 1].trim() || /^#/.test(lines[i + 1].trim())) {
            if (buf.every(function (b) {
              return splitRow(b);
            })) flushList("list");
            else flushParagraph();
          }
        }
      }
    }

    flushParagraph();
    flushTable();
    if (buf.length) flushList(section === "words" ? "vlist" : "list");

    if (!sub) sub = "Урок с занятия";

    return {
      id: existingId || slug(ttl),
      ttl: ttl,
      sub: sub,
      rule: rule.length ? rule : [{ t: "p", x: "Добавьте правило в разделе ## Правило" }],
      drill: drill,
      hw: hw,
    };
  }

  var TEMPLATE =
    "# Название урока\n" +
    "> Коротко: о чём тема (подзаголовок для Саида)\n\n" +
    "## Слова\n" +
    "kitchen — кухня\n" +
    "bedroom — спальня\n\n" +
    "## Правило\n" +
    "There is — один предмет. There are — несколько.\n\n" +
    "| Форма | Пример |\n" +
    "| There is | There is a lamp on the desk. |\n" +
    "| There are | There are two beds. |\n\n" +
    "## На занятии\n" +
    "[выбор] There ___ a lamp on the desk. | is / are | is\n" +
    "[выбор] There ___ two beds in the room. | is / are | are\n" +
    "[письмо] There isn't a book on the table. | нет книги | there isn't a book on the table\n\n" +
    "## Домашка\n" +
    "- 8 предложений о своей комнате\n" +
    "- 2 отрицания и 1 вопрос\n";

  return { parse: parse, TEMPLATE: TEMPLATE };
})();
