(function () {
  "use strict";

  var CFG = window.APP_CONFIG || {};
  var APP_NAME = "رؤيا في التاريخ";

  // الأقسام الرئيسية بالترتيب المطلوب
  var SECTIONS = [
    "الأنبياء", "الدول والممالك", "القبائل", "الخلفاء", "الملوك",
    "القادة", "شخصيات من التاريخ", "حضارة", "مدن", "معارك وحروب"
  ];

  var LOGO_SVG =
    '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0d77a"/><stop offset="1" stop-color="#c79a22"/></linearGradient></defs>' +
    '<rect width="100" height="100" fill="url(#g)"/>' +
    '<path d="M50 80 C42 70 28 66 14 68 L14 32 C28 30 42 34 50 44 Z" fill="#000"/>' +
    '<path d="M50 80 C58 70 72 66 86 68 L86 32 C72 30 58 34 50 44 Z" fill="#000"/>' +
    '<path d="M22 44 C30 43 38 46 44 52 M22 54 C30 53 38 56 44 62 M78 44 C70 43 62 46 56 52 M78 54 C70 53 62 56 56 62" stroke="#d9b648" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '</svg>';

  var ICON = {
    search: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2.2" fill="none"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4M18 4l3 3-3 3M18 14l3 3-3 3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    save: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 3h12v18l-6-4-6 4z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/></svg>',
    saveOn: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 3h12v18l-6-4-6 4z" stroke="currentColor" stroke-width="2" fill="currentColor" stroke-linejoin="round"/></svg>',
    share: '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="6" cy="12" r="2.6" fill="currentColor"/><circle cx="18" cy="6" r="2.6" fill="currentColor"/><circle cx="18" cy="18" r="2.6" fill="currentColor"/><path d="M8 11l8-4M8 13l8 4" stroke="currentColor" stroke-width="1.8"/></svg>'
  };

  /* ============ أدوات صغيرة ============ */

  function h(tag, props) {
    var e = document.createElement(tag);
    props = props || {};
    for (var k in props) {
      var v = props[k];
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k === "html") e.innerHTML = v; // لا يُستخدم إلا مع ثوابت داخلية
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (var i = 2; i < arguments.length; i++) append(e, arguments[i]);
    return e;
  }
  function append(e, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(e, x); }); return; }
    if (c.nodeType) e.appendChild(c); else e.appendChild(document.createTextNode(String(c)));
  }
  function $(id) { return document.getElementById(id); }

  var LS = {
    get: function (k, def) {
      try { var v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
    }
  };

  function openDB() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) { rej(new Error("no idb")); return; }
      var r = indexedDB.open("ryt", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("kv"); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function kvGet(k) {
    return openDB().then(function (db) {
      return new Promise(function (res, rej) {
        var q = db.transaction("kv", "readonly").objectStore("kv").get(k);
        q.onsuccess = function () { res(q.result); };
        q.onerror = function () { rej(q.error); };
      });
    });
  }
  function kvSet(k, v) {
    return openDB().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction("kv", "readwrite");
        tx.objectStore("kv").put(v, k);
        tx.oncomplete = function () { res(); };
        tx.onerror = function () { rej(tx.error); };
        tx.onabort = function () { rej(tx.error); };
      });
    });
  }

  // يجلب النص الخام: يفشل فقط عند مشكلة شبكة أو خطأ HTTP
  function fetchRaw(url, timeoutMs) {
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, timeoutMs || 12000) : null;
    return fetch(url, { cache: "no-store", signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function (t) { if (timer) clearTimeout(timer); return t; },
            function (e) { if (timer) clearTimeout(timer); throw e; });
  }
  function fetchJSON(url, timeoutMs) {
    return fetchRaw(url, timeoutMs).then(function (t) { return JSON.parse(t); });
  }

  // توحيد الحروف العربية للبحث
  function norm(s) {
    return String(s == null ? "" : s)
      .replace(/[ً-ٰٟـ]/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function excerpt(text) {
    var t = String(text).replace(/\s+/g, " ").trim();
    return t.length > 140 ? t.slice(0, 140) + "…" : t;
  }

  function cmpVer(a, b) {
    var pa = String(a).replace(/^v/i, "").split(".").map(function (x) { return parseInt(x, 10) || 0; });
    var pb = String(b).replace(/^v/i, "").split(".").map(function (x) { return parseInt(x, 10) || 0; });
    for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
      var x = pa[i] || 0, y = pb[i] || 0;
      if (x > y) return 1;
      if (x < y) return -1;
    }
    return 0;
  }

  /* ============ الحالة العامة ============ */

  var state = {
    stories: [],
    byId: {},
    sections: [],      // أسماء الأقسام بالترتيب
    index: {},         // قسم -> { all:[], subs:{اسم:[]} }
    dataVersion: 0,
    saved: LS.get("ryt.saved", []),
    progress: LS.get("ryt.progress", {}),
    drawer: false,
    appUpdate: null,
    homeIds: null,
    checking: false,
    loadError: null
  };
  if (!Array.isArray(state.saved)) state.saved = [];
  if (!state.progress || typeof state.progress !== "object") state.progress = {};

  /* ============ تحميل البيانات ============ */

  // يتحقق من ملف قصص واحد ويتجاهل أي قصة معيبة بدل أن يفشل كل شيء
  function normalizeFile(json, fileName) {
    var out = [];
    if (!json || !Array.isArray(json.stories)) {
      console.warn("ملف غير صالح:", fileName);
      return out;
    }
    json.stories.forEach(function (s, i) {
      if (!s || typeof s !== "object") return;
      var id = s.id != null ? String(s.id).trim() : "";
      var title = s.title != null ? String(s.title).trim() : "";
      var text = s.text != null ? String(s.text) : "";
      if (!id || !title || !text.trim()) {
        console.warn("قصة ناقصة تم تجاهلها:", fileName, "#" + (i + 1));
        return;
      }
      var cats = [];
      (Array.isArray(s.categories) ? s.categories : []).forEach(function (c) {
        if (!c || !c.section) return;
        var subs = Array.isArray(c.subs) ? c.subs.map(String).map(function (x) { return x.trim(); }).filter(Boolean) : [];
        cats.push({ section: String(c.section).trim(), subs: subs });
      });
      if (!cats.length && json.section) cats.push({ section: String(json.section).trim(), subs: [] });
      if (!cats.length) cats.push({ section: "أخرى", subs: [] });
      var story = {
        id: id, title: title, text: text,
        figure: s.figure ? String(s.figure).trim() : "",
        categories: cats
      };
      var bag = [title, story.figure];
      cats.forEach(function (c) { bag.push(c.section); c.subs.forEach(function (x) { bag.push(x); }); });
      story.search = norm(bag.join(" "));
      out.push(story);
    });
    return out;
  }

  function applyPack(pack) {
    var byId = {};
    var list = [];
    Object.keys(pack.files).forEach(function (name) {
      normalizeFile(pack.files[name], name).forEach(function (s) {
        if (byId[s.id]) { console.warn("رقم مكرر تم تجاهله:", s.id); return; }
        byId[s.id] = s;
        list.push(s);
      });
    });
    var index = {};
    var names = SECTIONS.slice();
    list.forEach(function (s) {
      s.categories.forEach(function (c) {
        if (names.indexOf(c.section) === -1) names.push(c.section);
        var sec = index[c.section] || (index[c.section] = { all: [], subs: {} });
        if (sec.all.indexOf(s) === -1) sec.all.push(s);
        (c.subs.length ? c.subs : ["عام"]).forEach(function (sub) {
          var arr = sec.subs[sub] || (sec.subs[sub] = []);
          if (arr.indexOf(s) === -1) arr.push(s);
        });
      });
    });
    names.forEach(function (n) { if (!index[n]) index[n] = { all: [], subs: {} }; });
    state.stories = list;
    state.byId = byId;
    state.index = index;
    state.sections = names;
    state.pack = pack;
    state.dataVersion = Number(pack.dataVersion) || 0;
  }

  function loadPack(base) {
    return fetchJSON(base + "manifest.json", 12000).then(function (m) {
      var files = Array.isArray(m.files) ? m.files.filter(function (f) { return /^[\w.\-]+\.json$/.test(f); }) : [];
      return { manifest: m, files: files };
    });
  }

  function loadBundled() {
    return loadPack("data/").then(function (r) {
      var pack = { dataVersion: Number(r.manifest.dataVersion) || 0, files: {} };
      return Promise.all(r.files.map(function (f) {
        return fetchJSON("data/" + f, 12000).then(
          function (j) { pack.files[f] = j; },
          function () { console.warn("تعذر قراءة", f); }
        );
      })).then(function () { return pack; });
    });
  }

  function initData() {
    return Promise.all([
      loadBundled().catch(function (e) { console.warn("bundled", e); return null; }),
      kvGet("data").catch(function () { return null; })
    ]).then(function (r) {
      var bundled = r[0], cached = r[1];
      if (cached && (!cached.files || typeof cached.files !== "object")) cached = null;
      var pick = null;
      if (bundled && cached) pick = cached.dataVersion > bundled.dataVersion ? cached : bundled;
      else pick = bundled || cached;
      if (!pick) throw new Error("no data");
      applyPack(pick);
    });
  }

  /* ============ التحديث (القصص تلقائياً + التطبيق بالزر) ============ */

  function remoteOn() {
    return !!CFG.REPO && CFG.REPO.indexOf("__") !== 0;
  }
  function rawBase() {
    return "https://raw.githubusercontent.com/" + CFG.REPO + "/" + CFG.BRANCH + "/" + CFG.DATA_PATH;
  }

  function updateData() {
    var stamp = "?t=" + Date.now();
    return fetchJSON(rawBase() + "manifest.json" + stamp, 12000).then(function (m) {
      var v = Number(m.dataVersion) || 0;
      if (v <= state.dataVersion) return { changed: false };
      var files = (Array.isArray(m.files) ? m.files : []).filter(function (f) { return /^[\w.\-]+\.json$/.test(f); });
      if (!files.length) throw new Error("manifest empty");
      var pack = { dataVersion: v, files: {} };
      // مشكلة شبكة أو ملف مفقود: يُلغى التحديث كله ويبقى القديم سليماً.
      // ملف وصل لكن محتواه JSON تالف: نُبقي نسخته القديمة ولا نوقف باقي التحديث.
      return Promise.all(files.map(function (f) {
        return fetchRaw(rawBase() + f + stamp, 15000).then(function (t) {
          try {
            pack.files[f] = JSON.parse(t);
          } catch (e) {
            console.warn("ملف تالف على الخادم، تم إبقاء نسخته القديمة:", f);
            pack.files[f] = (state.pack && state.pack.files[f]) || { stories: [] };
          }
        });
      })).then(function () {
        var before = state.stories.length;
        return kvSet("data", pack).catch(function () { /* حتى لو فشل الحفظ نعرض الجديد */ }).then(function () {
          applyPack(pack);
          state.homeIds = null;
          return { changed: true, added: Math.max(0, state.stories.length - before) };
        });
      });
    });
  }

  function checkAppUpdate() {
    return fetchJSON("https://api.github.com/repos/" + CFG.REPO + "/releases/latest", 12000).then(function (rel) {
      var tag = rel && rel.tag_name ? String(rel.tag_name) : "";
      if (!tag) return null;
      if (cmpVer(tag, CFG.APP_VERSION || "0.0.0") <= 0) { state.appUpdate = null; return null; }
      var asset = (rel.assets || []).filter(function (a) { return /\.apk$/i.test(a.name || ""); })[0];
      state.appUpdate = {
        version: tag.replace(/^v/i, ""),
        url: asset ? asset.browser_download_url : (rel.html_url || "https://github.com/" + CFG.REPO + "/releases/latest")
      };
      return state.appUpdate;
    });
  }

  // manual=false: فحص صامت عند الفتح
  function runChecks(manual) {
    if (state.checking) return Promise.resolve();
    if (!remoteOn()) {
      if (manual) toast("التحديث غير مفعّل في نسخة التجربة");
      return Promise.resolve();
    }
    state.checking = true;
    paintUpdateUi();
    var result = { data: null, app: null, dataErr: false, appErr: false };
    return updateData().then(function (r) { result.data = r; }, function () { result.dataErr = true; })
      .then(function () { return checkAppUpdate().then(function (r) { result.app = r; }, function () { result.appErr = true; }); })
      .then(function () {
        state.checking = false;
        paintUpdateUi();
        if (result.data && result.data.changed) {
          if (isHome()) route(); // يعرض القصص الجديدة
          toast(result.data.added ? "تمت إضافة " + result.data.added + " قصة جديدة" : "تم تحديث القصص");
        } else if (manual) {
          if (result.dataErr && result.appErr) toast("تعذر الاتصال بالإنترنت");
          else if (result.app) { /* يظهر زر التحديث الأحمر */ toast("يتوفر إصدار جديد من التطبيق"); }
          else if (result.dataErr) toast("تعذر تحديث القصص الآن");
          else toast("أنت على أحدث إصدار");
        }
        if (state.drawer) buildDrawer();
      });
  }

  function paintUpdateUi() {
    $("burger-dot").hidden = !state.appUpdate;
  }

  var browserPlugin = null;
  function openExternal(url) {
    try {
      var C = window.Capacitor;
      if (C && C.isNativePlatform && C.isNativePlatform() && C.registerPlugin) {
        browserPlugin = browserPlugin || C.registerPlugin("Browser");
        browserPlugin.open({ url: url }).catch(function () { window.location.href = url; });
        return;
      }
    } catch (e) { /* نكمل بالطريقة العادية */ }
    window.open(url, "_blank");
  }

  /* ============ المشاركة ============ */

  var sharePlugin = null;
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (res, rej) {
      try {
        var ta = h("textarea", { style: "position:fixed;opacity:0;top:0" });
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        ok ? res() : rej(new Error("copy"));
      } catch (e) { rej(e); }
    });
  }
  function shareStory(s) {
    var text = s.title + "\n\n" + s.text + "\n\n— تطبيق " + APP_NAME;
    try {
      var C = window.Capacitor;
      if (C && C.isNativePlatform && C.isNativePlatform() && C.registerPlugin) {
        sharePlugin = sharePlugin || C.registerPlugin("Share");
        sharePlugin.share({ title: s.title, text: text, dialogTitle: "مشاركة القصة" }).catch(function () {});
        return;
      }
    } catch (e) { /* نكمل */ }
    if (navigator.share) {
      navigator.share({ title: s.title, text: text }).catch(function () {});
      return;
    }
    copyText(text).then(function () { toast("تم نسخ القصة"); }, function () { toast("تعذرت المشاركة"); });
  }

  /* ============ المحفوظات والتقدم ============ */

  function isSaved(id) { return state.saved.indexOf(id) !== -1; }
  function toggleSaved(id) {
    var i = state.saved.indexOf(id);
    if (i === -1) state.saved.unshift(id); else state.saved.splice(i, 1);
    LS.set("ryt.saved", state.saved);
    return i === -1;
  }
  function saveProgress() { LS.set("ryt.progress", state.progress); }

  /* ============ واجهات صغيرة ============ */

  var toastTimer = null;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  function modal(title, text, okLabel, onOk) {
    var m = $("modal");
    m.innerHTML = "";
    function close() { m.hidden = true; m.innerHTML = ""; }
    m.appendChild(h("div", { class: "dlg" },
      h("h4", { text: title }),
      h("p", { text: text }),
      h("div", { class: "acts" },
        h("button", { type: "button", text: "لاحقاً", onclick: close }),
        h("button", { type: "button", class: "pri", text: okLabel, onclick: function () { close(); onOk(); } })
      )
    ));
    m.hidden = false;
  }

  function storyHref(s) { return "#/story/" + encodeURIComponent(s.id); }

  function card(s) {
    var p = state.progress[s.id];
    var chips = [];
    s.categories.forEach(function (c) {
      chips.push(h("span", { class: "chip", text: c.section }));
    });
    var bar = null;
    if (p && !p.read && p.pos > 0.02) {
      bar = h("div", { class: "mini-bar" }, h("i", { style: "width:" + Math.round(p.pos * 100) + "%" }));
    }
    return h("a", { class: "card", href: storyHref(s) },
      p && p.read ? h("span", { class: "badge", text: "مقروءة ✓" }) : null,
      h("div", { class: "card-title", text: s.title }),
      s.figure ? h("div", { class: "card-fig", text: s.figure }) : null,
      h("div", { class: "chips" }, chips),
      h("div", { class: "excerpt", text: excerpt(s.text) }),
      bar
    );
  }

  /* ============ التوجيه (يعمل معه زر الرجوع في أندرويد) ============ */

  var view = null;
  var scrollCleanup = null;

  function isHome() {
    var hsh = location.hash || "#/";
    return hsh === "#/" || hsh === "#" || hsh === "";
  }

  function go(hash) {
    if (state.drawer) {
      state.drawer = false;
      hideDrawer();
      history.replaceState(null, "", hash);
      route();
    } else if (location.hash === hash) {
      route();
    } else {
      location.hash = hash;
    }
  }

  function route() {
    if (scrollCleanup) { scrollCleanup(); scrollCleanup = null; }
    setProgressBar(0);
    var parts = (location.hash || "#/").replace(/^#\/?/, "").split("/");
    try { parts = parts.map(decodeURIComponent); } catch (e) { parts = [""]; }
    view.innerHTML = "";
    window.scrollTo(0, 0);

    if (state.loadError) { renderError(); return; }
    if (parts[0] === "story" && parts[1]) renderStory(parts[1]);
    else if (parts[0] === "section" && parts[1]) renderSection(parts[1], parts[2]);
    else renderHome();
  }

  function renderError() {
    view.appendChild(h("div", { class: "empty" },
      h("p", { text: "تعذر قراءة بيانات التطبيق." }),
      h("button", { type: "button", class: "btn-main", text: "إعادة المحاولة", onclick: start })
    ));
  }

  /* ---------- الرئيسية ---------- */

  function renderHome() {
    var results = h("div", { id: "results" });
    var input = h("input", {
      type: "search", placeholder: "ابحث عن قصة أو شخصية أو قسم…", autocomplete: "off", enterkeyhint: "search"
    });
    var timer = null;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { fill(input.value); }, 120);
    });

    function randomIds() {
      if (!state.homeIds) state.homeIds = shuffle(state.stories).slice(0, 10).map(function (s) { return s.id; });
      return state.homeIds;
    }

    function fill(q) {
      results.innerHTML = "";
      var nq = norm(q);
      if (!state.stories.length) {
        results.appendChild(h("div", { class: "empty", text: "لا توجد قصص بعد. ستظهر هنا عند إضافتها." }));
        return;
      }
      if (!nq) {
        results.appendChild(h("div", { class: "row-head" },
          h("h3", { text: "قصص مختارة" }),
          h("button", { type: "button", class: "icon-btn", "aria-label": "قصص أخرى", html: ICON.shuffle, onclick: function () { state.homeIds = null; fill(""); } })
        ));
        randomIds().forEach(function (id) { if (state.byId[id]) results.appendChild(card(state.byId[id])); });
        return;
      }
      var tokens = nq.split(" ");
      var found = state.stories.filter(function (s) {
        return tokens.every(function (t) { return s.search.indexOf(t) !== -1; });
      });
      results.appendChild(h("p", { class: "sub-note", text: found.length ? "عدد النتائج: " + found.length : "" }));
      if (!found.length) {
        results.appendChild(h("div", { class: "empty", text: "لا توجد نتائج مطابقة." }));
        return;
      }
      found.slice(0, 60).forEach(function (s) { results.appendChild(card(s)); });
    }

    view.appendChild(h("div", { class: "search-box" }, input, h("span", { html: ICON.search })));
    view.appendChild(results);
    fill("");
  }

  /* ---------- صفحة قسم ---------- */

  function renderSection(name, sub) {
    var sec = state.index[name];
    view.appendChild(h("h2", { class: "page-title", text: name }));
    if (!sec || !sec.all.length) {
      view.appendChild(h("div", { class: "empty", text: "لا توجد قصص في هذا القسم بعد." }));
      return;
    }
    view.appendChild(h("p", { class: "sub-note", text: sec.all.length + " قصة" }));
    var subNames = Object.keys(sec.subs);
    var target = null;
    subNames.forEach(function (sn) {
      var d = h("details", { class: "fold" },
        h("summary", {}, h("span", {}, sn, h("span", { class: "count", text: "(" + sec.subs[sn].length + ")" }))),
        h("div", { class: "fold-body" }, sec.subs[sn].map(card))
      );
      if (sn === sub || subNames.length === 1) { d.open = true; if (sn === sub) target = d; }
      view.appendChild(d);
    });
    if (target) setTimeout(function () { target.scrollIntoView({ block: "start" }); window.scrollBy(0, -70); }, 30);
  }

  /* ---------- القراءة ---------- */

  function setProgressBar(p) {
    $("progress-bar").style.width = Math.max(0, Math.min(1, p)) * 100 + "%";
  }

  function fontSize() {
    var v = Number(LS.get("ryt.font", 20));
    return v >= 15 && v <= 34 ? v : 20;
  }
  function applyFont(px) {
    document.documentElement.style.setProperty("--read-size", px + "px");
  }

  function renderStory(id) {
    var s = state.byId[id];
    if (!s) {
      view.appendChild(h("div", { class: "empty" },
        h("p", { text: "هذه القصة غير موجودة." }),
        h("a", { class: "btn-main", href: "#/", style: "display:block;line-height:48px", text: "الرئيسية" })
      ));
      return;
    }
    applyFont(fontSize());

    var saveBtn = h("button", { type: "button", class: "icon-btn", "aria-label": "حفظ" });
    function paintSave() {
      var on = isSaved(s.id);
      saveBtn.className = "icon-btn" + (on ? " on" : "");
      saveBtn.innerHTML = on ? ICON.saveOn : ICON.save;
    }
    paintSave();
    saveBtn.addEventListener("click", function () {
      var on = toggleSaved(s.id);
      paintSave();
      toast(on ? "تمت إضافتها إلى المحفوظات" : "أُزيلت من المحفوظات");
    });

    function bump(d) {
      var v = Math.max(15, Math.min(34, fontSize() + d));
      LS.set("ryt.font", v);
      applyFont(v);
      setTimeout(onScroll, 50);
    }

    view.appendChild(h("div", { class: "reader-bar" },
      h("button", { type: "button", class: "icon-btn", "aria-label": "رجوع", html: ICON.back, onclick: function () {
        if (history.length > 1) history.back(); else go("#/");
      } }),
      h("div", { class: "grp" },
        h("button", { type: "button", class: "icon-btn", "aria-label": "تصغير الخط", text: "أ-", onclick: function () { bump(-2); } }),
        h("button", { type: "button", class: "icon-btn", "aria-label": "تكبير الخط", text: "أ+", onclick: function () { bump(2); } }),
        saveBtn,
        h("button", { type: "button", class: "icon-btn", "aria-label": "مشاركة", html: ICON.share, onclick: function () { shareStory(s); } })
      )
    ));

    var meta = s.categories.map(function (c) {
      return c.section + (c.subs.length ? " ‹ " + c.subs.join("، ") : "");
    }).join("  •  ");

    var paras = s.text.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    view.appendChild(h("article", { class: "paper" },
      h("h1", { text: s.title }),
      s.figure ? h("div", { class: "meta", text: s.figure }) : null,
      h("div", { class: "meta", text: meta }),
      h("div", { class: "orn", text: "❖ ❖ ❖" }),
      h("div", { class: "body" }, paras.map(function (p) { return h("p", { text: p }); })),
      h("div", { class: "end", text: "❖" })
    ));

    // استرجاع آخر موضع قراءة
    var prev = state.progress[s.id];
    var ticking = false, saveTimer = null, active = true, raf = 0;

    function maxScroll() {
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }
    function onScroll() {
      if (ticking || !active) return;
      ticking = true;
      raf = requestAnimationFrame(function () {
        ticking = false;
        // بعد مغادرة القصة قد يُصفَّر التمرير تلقائياً؛ لا نسجّل ذلك
        if (!active) return;
        var m = maxScroll();
        var p = m <= 4 ? 1 : window.scrollY / m;
        p = Math.max(0, Math.min(1, p));
        setProgressBar(p);
        var rec = state.progress[s.id] || (state.progress[s.id] = { pos: 0, read: false, t: 0 });
        rec.pos = p;
        rec.t = Date.now();
        if (p >= 0.97) rec.read = true;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveProgress, 600);
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    scrollCleanup = function () {
      active = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      clearTimeout(saveTimer);
      saveProgress();
    };
    // أول ما يبدأ التنقل خارج القصة نوقف التسجيل (قبل أن يعيد المتصفح التمرير)
    var stopOnLeave = function () {
      if (!/^#\/story\//.test(location.hash)) active = false;
    };
    window.addEventListener("popstate", stopOnLeave);
    var oldCleanup = scrollCleanup;
    scrollCleanup = function () { window.removeEventListener("popstate", stopOnLeave); oldCleanup(); };

    setTimeout(function () {
      if (prev && prev.pos > 0.02 && prev.pos < 0.97) window.scrollTo(0, prev.pos * maxScroll());
      onScroll();
    }, 60);
  }

  /* ============ القائمة الجانبية ============ */

  function dLink(hash, label, small) {
    return h("a", { class: "d-link", href: hash, onclick: function (e) { e.preventDefault(); go(hash); } },
      label, small ? h("small", { text: small }) : null);
  }

  function buildDrawer() {
    var d = $("drawer");
    d.innerHTML = "";

    // المكتبة
    var savedItems = state.saved.map(function (id) { return state.byId[id]; }).filter(Boolean);
    var continuing = Object.keys(state.progress).map(function (id) {
      var p = state.progress[id];
      return state.byId[id] && p && !p.read && p.pos > 0.02 ? { s: state.byId[id], p: p } : null;
    }).filter(Boolean).sort(function (a, b) { return b.p.t - a.p.t; });

    var savedBody = savedItems.length
      ? savedItems.map(function (s) { return dLink(storyHref(s), s.title); })
      : [h("div", { class: "d-muted", text: "لا توجد قصص محفوظة." })];
    var contBody = continuing.length
      ? continuing.map(function (c) { return dLink(storyHref(c.s), c.s.title, Math.round(c.p.pos * 100) + "%"); })
      : [h("div", { class: "d-muted", text: "لا توجد قصص قيد القراءة." })];

    var scroll = h("div", { class: "d-scroll" },
      h("div", { class: "d-title", text: "المكتبة" }),
      h("details", { class: "fold" },
        h("summary", {}, h("span", {}, "المحفوظات", h("span", { class: "count", text: "(" + savedItems.length + ")" }))),
        h("div", { class: "fold-body" }, savedBody)),
      h("details", { class: "fold" },
        h("summary", {}, h("span", {}, "متابعة القراءة", h("span", { class: "count", text: "(" + continuing.length + ")" }))),
        h("div", { class: "fold-body" }, contBody)),
      h("div", { class: "d-title", text: "الأقسام" }),
      state.sections.map(function (name) {
        var sec = state.index[name];
        var subs = Object.keys(sec.subs);
        return h("details", { class: "fold" },
          h("summary", {}, h("span", {}, name, h("span", { class: "count", text: "(" + sec.all.length + ")" }))),
          h("div", { class: "fold-body" },
            sec.all.length
              ? [dLink("#/section/" + encodeURIComponent(name), "عرض كل القصص")].concat(
                  subs.map(function (sn) {
                    return dLink("#/section/" + encodeURIComponent(name) + "/" + encodeURIComponent(sn), sn, "(" + sec.subs[sn].length + ")");
                  }))
              : [h("div", { class: "d-muted", text: "لا توجد قصص بعد." })])
        );
      })
    );

    var theme = document.documentElement.getAttribute("data-theme");
    var updBtn = h("button", {
      type: "button",
      class: "btn-main" + (state.appUpdate ? " alert" : ""),
      disabled: state.checking ? true : null,
      text: state.checking ? "جارٍ الفحص…" : (state.appUpdate ? "تحديث التطبيق إلى " + state.appUpdate.version : "التحقق من التحديثات"),
      onclick: function () {
        if (state.appUpdate) {
          var u = state.appUpdate;
          modal("تحديث جديد", "يتوفر الإصدار " + u.version + ". سيتم تنزيله ثم اضغط عليه لتثبيته فوق النسخة الحالية.", "تنزيل", function () { openExternal(u.url); });
        } else {
          runChecks(true);
        }
      }
    });

    var foot = h("div", { class: "d-foot" },
      h("div", { class: "theme-row" },
        h("button", { type: "button", class: "theme-btn" + (theme === "night" ? " on" : ""), onclick: function () { setTheme("night"); } }, h("span", { class: "sw night" }), "كحلي وذهبي"),
        h("button", { type: "button", class: "theme-btn" + (theme === "milk" ? " on" : ""), onclick: function () { setTheme("milk"); } }, h("span", { class: "sw milk" }), "حليبي وأسود")
      ),
      updBtn,
      h("div", { class: "ver", text: "الإصدار " + (CFG.APP_VERSION || "") + " · نسخة القصص " + state.dataVersion })
    );

    d.appendChild(h("div", { class: "d-head" },
      h("b", { text: "القائمة" }),
      h("button", { type: "button", class: "icon-btn", "aria-label": "إغلاق", html: ICON.close, onclick: function () { history.back(); } })
    ));
    d.appendChild(scroll);
    d.appendChild(foot);
  }

  function showDrawer() {
    buildDrawer();
    $("overlay").hidden = false;
    var d = $("drawer");
    d.setAttribute("aria-hidden", "false");
    requestAnimationFrame(function () { d.classList.add("open"); });
  }
  function hideDrawer() {
    $("overlay").hidden = true;
    var d = $("drawer");
    d.classList.remove("open");
    d.setAttribute("aria-hidden", "true");
  }
  function openDrawer() {
    if (state.drawer) return;
    state.drawer = true;
    history.pushState({ menu: true }, "", location.href);
    showDrawer();
  }

  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    LS.set("ryt.theme", t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "milk" ? "#faf6ec" : "#0a1122");
    if (state.drawer) buildDrawer();
  }

  /* ============ التشغيل ============ */

  function start() {
    state.loadError = null;
    return initData().then(function () {
      state.homeIds = null;
      route();
      runChecks(false);
    }, function () {
      state.loadError = true;
      route();
    });
  }

  function boot() {
    view = $("view");
    // نتحكم نحن بموضع التمرير، فلا نترك المتصفح يستعيده تلقائياً
    try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) { /* لا شيء */ }
    $("logo").innerHTML = LOGO_SVG;
    var t = LS.get("ryt.theme", "night");
    setTheme(t === "milk" ? "milk" : "night");
    applyFont(fontSize());

    $("burger").addEventListener("click", openDrawer);
    $("overlay").addEventListener("click", function () { if (state.drawer) history.back(); });
    $("logo").addEventListener("click", function (e) { e.preventDefault(); go("#/"); });

    window.addEventListener("hashchange", function () { if (!state.drawer) route(); });
    window.addEventListener("popstate", function () {
      var menu = history.state && history.state.menu;
      if (menu && !state.drawer) { state.drawer = true; showDrawer(); }
      else if (!menu && state.drawer) { state.drawer = false; hideDrawer(); }
    });

    // قد يفتح التطبيق وفي العنوان بقايا حالة القائمة
    if (history.state && history.state.menu) history.replaceState(null, "", location.href);

    start();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
