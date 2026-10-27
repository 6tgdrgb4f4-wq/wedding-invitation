(function () {
  "use strict";

  var CFG = window.WEDDING_CONFIG;
  var DICT = window.I18N;
  var LANG_KEY = "wedding-lang";
  var RSVP_KEY = "wedding-rsvp";
  var lang = "kk";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }

  function t(key) {
    return (DICT[lang] && DICT[lang][key]) || DICT.kk[key] || key;
  }

  /* ---------- Language ---------- */

  function initialLang() {
    var fromUrl = new URLSearchParams(location.search).get("lang");
    if (fromUrl && DICT[fromUrl]) return fromUrl;
    var saved = storageGet(LANG_KEY);
    if (saved && DICT[saved]) return saved;
    return "kk";
  }

  function applyLang(next) {
    lang = next;
    document.documentElement.lang = lang;
    document.title = t("pageTitle");

    $$("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    $$("[data-i18n-placeholder]").forEach(function (el) { el.placeholder = t(el.getAttribute("data-i18n-placeholder")); });
    $$("[data-i18n-aria]").forEach(function (el) { el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))); });
    $$(".lang-switch button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang));
    });

    $("#link-gcal").href = googleCalendarUrl();
  }

  function initLang() {
    applyLang(initialLang());
    $$(".lang-switch button").forEach(function (b) {
      b.addEventListener("click", function () {
        var next = b.getAttribute("data-lang");
        storageSet(LANG_KEY, next);
        applyLang(next);
      });
    });
  }

  /* ---------- Links ---------- */

  function toCalDate(iso) {
    return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }

  function googleCalendarUrl() {
    var params = new URLSearchParams({
      action: "TEMPLATE",
      text: t("calEventTitle"),
      dates: toCalDate(CFG.EVENT_START) + "/" + toCalDate(CFG.EVENT_END),
      location: CFG.VENUE,
      details: t("calEventDetails") + "\n\n2GIS: " + CFG.LINK_2GIS + "\nYandex: " + CFG.LINK_YANDEX,
      ctz: "Asia/Almaty"
    });
    return "https://calendar.google.com/calendar/render?" + params.toString();
  }

  function initLinks() {
    $("#link-2gis").href = CFG.LINK_2GIS;
    $("#link-yandex").href = CFG.LINK_YANDEX;
  }

  /* ---------- Intro ---------- */

  function initIntro() {
    var intro = $("#intro");
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.body.classList.add("is-locked");

    $("#intro-open").addEventListener("click", function () {
      intro.classList.add("is-open");
      document.body.classList.remove("is-locked");
      setTimeout(function () { intro.classList.add("is-gone"); }, reduced ? 0 : 1200);
    });
  }

  /* ---------- Reveal on scroll ---------- */

  function initReveal() {
    var items = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Countdown ---------- */

  function initCountdown() {
    var target = new Date(CFG.EVENT_START).getTime();
    var els = {
      d: $("#cd-days"), h: $("#cd-hours"), m: $("#cd-minutes"), s: $("#cd-seconds")
    };
    var pad = function (n) { return n < 10 ? "0" + n : String(n); };
    var timer;

    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) {
        clearInterval(timer);
        $("#countdown").hidden = true;
        $(".countdown .section-title").hidden = true;
        $("#countdown-done").hidden = false;
        return;
      }
      var sec = Math.floor(diff / 1000);
      els.d.textContent = Math.floor(sec / 86400);
      els.h.textContent = pad(Math.floor(sec % 86400 / 3600));
      els.m.textContent = pad(Math.floor(sec % 3600 / 60));
      els.s.textContent = pad(sec % 60);
    }

    tick();
    timer = setInterval(tick, 1000);
  }

  /* ---------- RSVP ---------- */

  function randomId() {
    var bytes = new Uint8Array(12);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    return Array.prototype.map.call(bytes, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }

  function loadSaved() {
    try { return JSON.parse(storageGet(RSVP_KEY)) || null; } catch (e) { return null; }
  }

  function rsvpClosed() {
    return Date.now() > new Date(CFG.RSVP_DEADLINE).getTime();
  }

  function initRsvp() {
    var form = $("#rsvp-form");
    var nameInput = $("#rsvp-name");
    var partyBlock = $("#party-block");
    var companionsBlock = $("#companions-block");
    var list = $("#companions-list");
    var addBtn = $("#add-companion");
    var errorEl = $("#rsvp-error");
    var submitBtn = $("#rsvp-submit");
    var doneEl = $("#rsvp-done");
    var doneMsg = $("#rsvp-done-msg");
    var closedEl = $("#rsvp-closed");
    var template = $("#companion-template");
    var saved = loadSaved();

    function checked(name) {
      var el = form.querySelector('input[name="' + name + '"]:checked');
      return el ? el.value : "";
    }

    function setChecked(name, value) {
      $$('input[name="' + name + '"]', form).forEach(function (r) { r.checked = r.value === value; });
    }

    function showError(key) {
      if (!key) {
        errorEl.hidden = true;
        errorEl.removeAttribute("data-i18n");
        return;
      }
      errorEl.setAttribute("data-i18n", key);
      errorEl.textContent = t(key);
      errorEl.hidden = false;
    }

    function addCompanion(value) {
      if (list.children.length >= CFG.MAX_COMPANIONS) return;
      var item = template.content.firstElementChild.cloneNode(true);
      var input = $("input", item);
      input.placeholder = t("companionPlaceholder");
      input.value = value || "";
      $(".companions__remove", item).setAttribute("aria-label", t("remove"));
      list.appendChild(item);
      addBtn.hidden = list.children.length >= CFG.MAX_COMPANIONS;
      return input;
    }

    function syncVisibility() {
      var attending = checked("attending");
      partyBlock.hidden = attending !== "yes";
      var withOthers = attending === "yes" && checked("party") === "with";
      companionsBlock.hidden = !withOthers;
      if (withOthers && list.children.length === 0) addCompanion();
    }

    function companions() {
      return $$("input", list)
        .map(function (i) { return i.value.trim(); })
        .filter(Boolean);
    }

    function showDone(messageKey) {
      form.hidden = true;
      doneEl.hidden = false;
      doneMsg.setAttribute("data-i18n", messageKey);
      doneMsg.textContent = t(messageKey);
    }

    function showForm() {
      doneEl.hidden = true;
      form.hidden = false;
      showError(null);
    }

    function prefill(data) {
      nameInput.value = data.name || "";
      setChecked("attending", data.attending);
      setChecked("party", data.party);
      list.innerHTML = "";
      (data.companions || []).forEach(function (c) { addCompanion(c); });
      syncVisibility();
    }

    if (rsvpClosed()) {
      form.hidden = true;
      closedEl.hidden = false;
      return;
    }

    form.addEventListener("change", function (e) {
      if (e.target.name === "attending" || e.target.name === "party") {
        showError(null);
        syncVisibility();
      }
    });

    nameInput.addEventListener("input", function () { nameInput.classList.remove("is-invalid"); });

    addBtn.addEventListener("click", function () {
      var input = addCompanion();
      if (input) input.focus();
    });

    list.addEventListener("click", function (e) {
      var btn = e.target.closest(".companions__remove");
      if (!btn) return;
      btn.parentNode.remove();
      addBtn.hidden = false;
      if (list.children.length === 0) addCompanion();
    });

    $("#rsvp-again").addEventListener("click", function () {
      if (saved) prefill(saved);
      showForm();
      nameInput.focus();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      showError(null);

      var name = nameInput.value.trim();
      var attending = checked("attending");
      var party = attending === "yes" ? checked("party") : "";
      var others = party === "with" ? companions() : [];

      if (!name) {
        nameInput.classList.add("is-invalid");
        nameInput.focus();
        return showError("errName");
      }
      if (!attending) return showError("errAttending");
      if (attending === "yes" && !party) return showError("errParty");
      if (party === "with" && others.length === 0) return showError("errCompanions");
      if (rsvpClosed()) return showError("errClosed");
      if (!CFG.APPS_SCRIPT_URL) return showError("errNotConfigured");

      var payload = {
        id: (saved && saved.id) || randomId(),
        name: name,
        attending: attending,
        party: party,
        companions: others,
        lang: lang
      };

      submitBtn.disabled = true;
      submitBtn.setAttribute("data-i18n", "sending");
      submitBtn.textContent = t("sending");

      fetch(CFG.APPS_SCRIPT_URL, {
        method: "POST",
        // text/plain keeps this a "simple" request, so no CORS preflight.
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      })
        .then(function (res) { return res.json(); })
        .then(function (res) {
          if (res && res.ok) {
            saved = payload;
            storageSet(RSVP_KEY, JSON.stringify(payload));
            showDone(attending === "yes" ? "thanksYes" : "thanksNo");
          } else if (res && res.error === "closed") {
            showError("errClosed");
          } else {
            showError("errNetwork");
          }
        })
        .catch(function () { showError("errNetwork"); })
        .then(function () {
          submitBtn.disabled = false;
          submitBtn.setAttribute("data-i18n", "submit");
          submitBtn.textContent = t("submit");
        });
    });

    if (saved) {
      prefill(saved);
      showDone("alreadyReplied");
    }
  }

  /* ---------- Start ---------- */

  initLinks();
  initLang();
  initIntro();
  initReveal();
  initCountdown();
  initRsvp();
})();
