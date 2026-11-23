/* =========================================================================
   app.js  -  renders the site from config.js (no build step, no deps)
   ========================================================================= */
(() => {
  "use strict";

  const C = window.SITE_CONFIG;
  if (!C) { console.error("config.js failed to load."); return; }

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** Tiny DOM builder. Text is always set via textContent (safe). */
  function h(tag, props = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;      // only used with static, trusted strings
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    kids.flat().forEach(c => c != null && n.append(c.nodeType ? c : document.createTextNode(c)));
    return n;
  }

  const SVG_PLAY = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>';
  const SVG_EXPAND = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';

  /* ---------------------------------------------------------------------
     Placeholder frames (inline SVG, used when Cloudinary isn't ready)
     --------------------------------------------------------------------- */
  const PALETTES = [
    ["#5a2410", "#0d0907", "#ff6a28"], ["#4a1c0c", "#0a0706", "#ff8a4c"],
    ["#3a1612", "#0b0707", "#e0714f"], ["#3d1a14", "#0a0707", "#ffb08a"],
    ["#2a1409", "#0a0807", "#ff7a3a"], ["#4a2a1c", "#0a0807", "#ffc09a"]
  ];
  function placeholder(i = 0, w = 1600, hgt = 900, label = "") {
    const [a, b, c] = PALETTES[i % PALETTES.length];
    const bar = Math.round(hgt * 0.1);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${hgt}" preserveAspectRatio="xMidYMid slice">
      <defs><radialGradient id="g" cx="${30 + (i * 17) % 50}%" cy="40%" r="80%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>
      <radialGradient id="v" cx="50%" cy="50%" r="70%"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <ellipse cx="${w * (0.25 + ((i * 13) % 50) / 100)}" cy="${hgt * 0.45}" rx="${w * 0.22}" ry="${hgt * 0.05}" fill="${c}" opacity=".22"/>
      <rect width="100%" height="100%" fill="url(#v)"/>
      <rect width="100%" height="${bar}" fill="#000"/><rect y="${hgt - bar}" width="100%" height="${bar}" fill="#000"/>
      <text x="50%" y="${hgt - bar - 16}" fill="#fff" fill-opacity=".35" font-family="Helvetica,Arial,sans-serif" font-size="${hgt * 0.028}" letter-spacing="4" text-anchor="middle">${label}</text></svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /* ---------------------------------------------------------------------
     Cloudinary
     --------------------------------------------------------------------- */
  const CLOUD = (C.CLOUDINARY_CLOUD_NAME || "").trim();

  function cldUrl(r, transform) {
    const id = r.public_id.split("/").map(encodeURIComponent).join("/");
    return `https://res.cloudinary.com/${CLOUD}/image/upload/${transform}/v${r.version}/${id}.${r.format}`;
  }

  /** Fetch a tag list. Returns {ok, resources}. Never throws. */
  async function fetchTag(tag) {
    if (!CLOUD) return { ok: false, reason: "no-cloud", resources: [] };
    try {
      const res = await fetch(`https://res.cloudinary.com/${encodeURIComponent(CLOUD)}/image/list/${encodeURIComponent(tag)}.json`);
      if (!res.ok) return { ok: false, reason: res.status, resources: [] };
      const data = await res.json();
      return { ok: true, resources: Array.isArray(data.resources) ? data.resources : [] };
    } catch (e) {
      return { ok: false, reason: "network", resources: [] };
    }
  }

  /** Image with shimmer skeleton, fade-in and fallback. */
  function smartImg({ src, fallback, alt, loading = "lazy" }) {
    const img = h("img", { alt: alt || "", loading, decoding: "async" });
    let tried = false;
    img.addEventListener("load", () => {
      // YouTube serves a 120x90 gray stub (HTTP 200) when maxres is missing.
      if (!tried && fallback && img.naturalWidth > 0 && img.naturalWidth <= 120) { tried = true; img.src = fallback; return; }
      img.classList.add("ready"); img.parentElement && img.parentElement.classList.remove("skeleton");
    });
    img.addEventListener("error", () => {
      if (!tried && fallback) { tried = true; img.src = fallback; }
      else { img.src = placeholder(0, 1600, 900); }
    });
    img.src = src;
    return img;
  }

  /* ---------------------------------------------------------------------
     Reveal on scroll
     --------------------------------------------------------------------- */
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver(entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" })
    : null;
  function reveal(node, delay = 0) {
    node.classList.add("reveal");
    node.style.setProperty("--d", `${Math.min(delay, 0.6)}s`);
    io ? io.observe(node) : node.classList.add("in");
  }

  /* ---------------------------------------------------------------------
     Magnetic play button
     --------------------------------------------------------------------- */
  function magnetic(card) {
    const btn = $(".play", card);
    if (!btn || reduceMotion || !matchMedia("(hover: hover)").matches) return;
    card.addEventListener("pointermove", e => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2 - (parseFloat(btn.style.getPropertyValue("--mx")) || 0));
      const dy = e.clientY - (r.top + r.height / 2 - (parseFloat(btn.style.getPropertyValue("--my")) || 0));
      const lim = 22, k = 0.22;
      btn.style.setProperty("--mx", Math.max(-lim, Math.min(lim, dx * k)) + "px");
      btn.style.setProperty("--my", Math.max(-lim, Math.min(lim, dy * k)) + "px");
    });
    card.addEventListener("pointerleave", () => { btn.style.setProperty("--mx", "0px"); btn.style.setProperty("--my", "0px"); });
  }

  /* ---------------------------------------------------------------------
     Filter tabs with fade + FLIP layout animation
     --------------------------------------------------------------------- */
  function buildFilters(container, labels, onChange) {
    labels.forEach((l, i) => {
      container.append(h("button", {
        class: "pill", role: "tab", type: "button", "aria-selected": i === 0 ? "true" : "false", "data-key": l.key,
        text: l.label,
        onclick: ev => {
          $$(".pill", container).forEach(b => b.setAttribute("aria-selected", b === ev.currentTarget ? "true" : "false"));
          onChange(l.key);
        }
      }));
    });
  }

  function applyFilter(nodes, match) {
    const visibleBefore = nodes.filter(n => !n.hidden);
    const first = new Map(visibleBefore.map(n => [n, n.getBoundingClientRect()]));

    // 1) fade out non-matching
    nodes.forEach(n => { if (!match(n)) n.classList.add("out"); });
    const delay = reduceMotion ? 0 : 280;

    setTimeout(() => {
      // 2) remove them from layout, show matching
      nodes.forEach(n => {
        if (match(n)) { n.hidden = false; } else { n.hidden = true; }
      });
      // 3) FLIP: animate survivors from old to new position
      nodes.filter(match).forEach(n => {
        const was = first.get(n);
        const now = n.getBoundingClientRect();
        if (was && !reduceMotion && n.animate) {
          const dx = was.left - now.left, dy = was.top - now.top;
          if (dx || dy) n.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 520, easing: "cubic-bezier(.2,.7,.2,1)" });
        }
        n.classList.remove("out");
      });
      const anyVisible = nodes.some(n => !n.hidden);
      return anyVisible;
    }, delay);
  }

  /* ---------------------------------------------------------------------
     Theater lightbox (video + stills)
     --------------------------------------------------------------------- */
  const LB = {
    root: $("#lightbox"), stage: $("#lbStage"), cap: $("#lbCaption"),
    prev: $("#lbPrev"), next: $("#lbNext"), close: $("#lbClose"),
    items: [], i: 0, lastFocus: null, touchX: null
  };

  function lbRender() {
    const it = LB.items[LB.i];
    LB.stage.replaceChildren();
    if (it.type === "video") {
      LB.stage.append(h("iframe", {
        src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(it.id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
        title: it.title, allow: "autoplay; encrypted-media; picture-in-picture; fullscreen", allowfullscreen: true,
        referrerpolicy: "strict-origin-when-cross-origin"
      }));
    } else {
      LB.stage.append(h("img", { src: it.src, alt: it.title || "Still frame" }));
    }
    LB.cap.replaceChildren(
      h("strong", { text: it.title || "" }),
      h("span", { text: [it.role, it.camera, it.year].filter(Boolean).join("  ·  ") })
    );
    const multi = LB.items.length > 1;
    LB.prev.hidden = LB.next.hidden = !multi;
    // preload neighbours for still images
    if (multi) [1, -1].forEach(d => { const n = LB.items[(LB.i + d + LB.items.length) % LB.items.length]; if (n.type === "image") new Image().src = n.src; });
  }
  function lbOpen(items, index) {
    if (stopActivePreview) stopActivePreview();
    LB.items = items; LB.i = index; LB.lastFocus = document.activeElement;
    lbRender();
    LB.root.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => LB.root.classList.add("open"));
    LB.close.focus();
  }
  function lbClose() {
    LB.root.classList.remove("open");
    LB.stage.replaceChildren();           // stops video playback
    document.body.style.overflow = "";
    setTimeout(() => { LB.root.hidden = true; }, reduceMotion ? 0 : 300);
    LB.lastFocus && LB.lastFocus.focus && LB.lastFocus.focus();
  }
  function lbStep(d) { if (LB.items.length > 1) { LB.i = (LB.i + d + LB.items.length) % LB.items.length; lbRender(); } }

  LB.close.addEventListener("click", lbClose);
  LB.prev.addEventListener("click", () => lbStep(-1));
  LB.next.addEventListener("click", () => lbStep(1));
  LB.root.addEventListener("click", e => { if (e.target === LB.root || e.target === LB.stage) lbClose(); });
  LB.root.addEventListener("touchstart", e => { LB.touchX = e.touches[0].clientX; }, { passive: true });
  LB.root.addEventListener("touchend", e => {
    if (LB.touchX == null) return;
    const dx = e.changedTouches[0].clientX - LB.touchX; LB.touchX = null;
    if (Math.abs(dx) > 60) lbStep(dx < 0 ? 1 : -1);
  });
  document.addEventListener("keydown", e => {
    if (LB.root.hidden) return;
    if (e.key === "Escape") lbClose();
    else if (e.key === "ArrowRight") lbStep(1);
    else if (e.key === "ArrowLeft") lbStep(-1);
    else if (e.key === "Tab") {  // keep focus inside the dialog
      const f = $$("button:not([hidden]), iframe", LB.root);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------------------------------------------------------------------
     Showstopper animations
     --------------------------------------------------------------------- */
  const root = document.documentElement;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* 1. Timecode preloader + letterbox curtain ------------------------- */
  function runPreloader() {
    const pre = $("#preloader");
    const ready = () => {
      root.classList.add("ready");
      const hh = $("#heroHeadline"); if (hh) hh.classList.add("in");
    };
    if (!pre) return ready();

    const tc = $("#tc"), prog = $("#preProg");
    $("#preName").textContent = `${C.name} · ${C.subtitle}`;
    const dur = reduceMotion ? 250 : 1200;
    // 0..49 -> 00:00:00:00 .. 00:00:01:24
    const fmt = v => `00:00:${String(Math.floor(v / 25)).padStart(2, "0")}:${String(v % 25).padStart(2, "0")}`;
    let opened = false;
    const open = () => {
      if (opened) return; opened = true;
      pre.classList.add("open");        // slate fades, curtains part vertically
      ready();                          // hero content animates in underneath
      setTimeout(() => pre.remove(), reduceMotion ? 50 : 1200);
    };
    const t0 = performance.now();
    const step = now => {
      const p = clamp((now - t0) / dur, 0, 1);
      tc.textContent = fmt(Math.round(p * 49));
      prog.style.transform = `scaleX(${p})`;
      if (p < 1) requestAnimationFrame(step);
      else setTimeout(open, reduceMotion ? 0 : 180);
    };
    requestAnimationFrame(step);
    setTimeout(open, 4000);             // failsafe (e.g. background tab)
  }

  /* 2. Lagging viewfinder cursor -------------------------------------- */
  function setupCursor() {
    if (!matchMedia("(pointer: fine) and (hover: hover)").matches) return;
    const cur = $("#cursor"), label = $("#cursorLabel");
    if (!cur) return;
    root.classList.add("has-cursor");
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0, seen = false, target = null, scrollQueued = false;

    const loop = () => {
      x += (tx - x) * 0.16; y += (ty - y) * 0.16;           // lerp
      cur.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = (Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) ? requestAnimationFrame(loop) : 0;
    };
    const setTarget = t => {
      if (t === target) return;
      target = t;
      if (t) { label.textContent = t.dataset.cursor; cur.classList.add("on"); }
      else cur.classList.remove("on");
    };
    document.addEventListener("pointermove", e => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      tx = e.clientX; ty = e.clientY;
      if (!seen) { x = tx; y = ty; seen = true; }
      if (!raf) raf = requestAnimationFrame(loop);
      setTarget(e.target.closest ? e.target.closest("[data-cursor]") : null);
    }, { passive: true });
    document.addEventListener("pointerdown", () => cur.classList.add("press"));
    document.addEventListener("pointerup", () => cur.classList.remove("press"));
    root.addEventListener("mouseleave", () => setTarget(null));
    // content scrolls under a still mouse: re-test what is under the pointer
    addEventListener("scroll", () => {
      if (scrollQueued || !seen) return; scrollQueued = true;
      requestAnimationFrame(() => {
        scrollQueued = false;
        const el = document.elementFromPoint(tx, ty);
        setTarget(el && el.closest ? el.closest("[data-cursor]") : null);
      });
    }, { passive: true });
  }

  /* 3. Silent hover preview on film cards ----------------------------- */
  const canPreview = matchMedia("(hover: hover) and (pointer: fine)").matches && !reduceMotion &&
    !(navigator.connection && navigator.connection.saveData);
  let stopActivePreview = null;
  addEventListener("scroll", () => { if (stopActivePreview) stopActivePreview(); }, { passive: true });

  function attachPreview(card, media, id) {
    if (!canPreview) return;
    let timer = 0, frame = null;
    const stop = () => {
      clearTimeout(timer); timer = 0;
      if (frame) { const f = frame; frame = null; f.classList.remove("on"); setTimeout(() => f.remove(), 500); }
      if (stopActivePreview === stop) stopActivePreview = null;
    };
    card.addEventListener("pointerenter", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (stopActivePreview && stopActivePreview !== stop) stopActivePreview();
        stopActivePreview = stop;
        const f = h("iframe", {
          class: "preview", tabindex: "-1", "aria-hidden": "true", title: "",
          allow: "autoplay; encrypted-media", referrerpolicy: "strict-origin-when-cross-origin",
          src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&mute=1&controls=0&loop=1&playlist=${encodeURIComponent(id)}&modestbranding=1&playsinline=1&disablekb=1&iv_load_policy=3&rel=0`
        });
        // fade in only after the player has had a moment to start (avoids a black flash)
        f.addEventListener("load", () => setTimeout(() => { if (frame === f) f.classList.add("on"); }, 800));
        frame = f;
        media.append(f);
      }, 400);
    });
    card.addEventListener("pointerleave", stop);
    card.addEventListener("click", stop);
  }

  /* 4. Masked headline reveals + showreel expansion ------------------- */
  function maskLines(el, auto = true) {
    if (el.classList.contains("masked")) return;
    const lines = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = lines.map(l => `<span class="line"><span>${l}</span></span>`).join("");
    el.classList.add("masked");
    if (auto) { io ? io.observe(el) : el.classList.add("in"); }
  }
  function setupMasks() {
    $$(".display").forEach(el => maskLines(el, el.id !== "heroHeadline"));   // hero is released by the curtain
  }

  function setupShowreelScroll() {
    const box = $("#showreel");
    if (!box || reduceMotion) return;           // CSS default (--p: 1) = fully open
    let queued = false;
    const update = () => {
      queued = false;
      const r = box.getBoundingClientRect(), vh = innerHeight;
      let p = clamp((vh - r.top) / (vh * 0.55), 0, 1);
      p = p * p * (3 - 2 * p);                  // smoothstep
      box.style.setProperty("--p", p.toFixed(4));
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    update();
  }

  /* 5. LOG vs Final Grade wipe slider --------------------------------- */
  async function renderGrade(byTag) {
    const G = C.GRADE_COMPARE || {};
    const box = $("#grade");
    if (!box) return;
    if (G.enabled === false) { box.remove(); return; }

    const tag = G.tag || "color-grading";
    const base = G.base || "f_auto,q_auto,w_1600";
    const logT = [base, G.logLook].filter(Boolean).join("/");     // "/" = chained transformation steps
    const finT = [base, G.finalLook].filter(Boolean).join("/");
    const list = (byTag && byTag[tag]) || await fetchTag(tag);
    const res = (list.resources || []).slice(0, G.max || 4);

    const frames = res.length
      ? res.map(r => ({ log: cldUrl(r, logT), fin: cldUrl(r, finT), fake: false }))
      : [1, 2, 3].map(i => { const p = placeholder(i, 2390, 1000, `FRAME 0${i}`); return { log: p, fin: p, fake: true }; });

    const logImg = h("img", { alt: "Flat LOG look", draggable: "false" });
    const finImg = h("img", { alt: "Final graded look", draggable: "false" });
    const bar = h("div", {
      class: "ba-bar", role: "slider", tabindex: "0", "aria-label": "Reveal final grade",
      "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "50"
    }, h("span", { class: "ba-grip", html: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M9 7l-5 5 5 5M15 7l5 5-5 5"/></svg>' }));
    const ba = h("div", { class: "ba", "data-cursor": "DRAG" },
      h("div", { class: "ba-layer" }, finImg),
      h("div", { class: "ba-layer ba-log" }, logImg),
      h("span", { class: "ba-tag l", text: "LOG · Flat" }),
      h("span", { class: "ba-tag r", text: "Final Grade" }),
      bar);
    $("#baMount").append(ba);

    const setFrame = i => {
      const f = frames[i];
      logImg.src = f.log; finImg.src = f.fin;
      logImg.classList.toggle("fake", f.fake);
    };
    setFrame(0);
    if (frames.length > 1) buildFilters($("#baFrames"), frames.map((_, i) => ({ key: i, label: `Frame ${i + 1}` })), k => setFrame(+k));
    else $("#baFrames").remove();

    let pos = 50, anim = 0, dragging = false;
    const setPos = v => {
      pos = clamp(v, 0, 100);
      ba.style.setProperty("--pos", pos.toFixed(2));
      bar.setAttribute("aria-valuenow", String(Math.round(pos)));
    };
    const stopAnim = () => { cancelAnimationFrame(anim); anim = 0; };
    const fromX = x => { const r = ba.getBoundingClientRect(); setPos((x - r.left) / r.width * 100); };

    ba.addEventListener("pointerdown", e => { stopAnim(); dragging = true; ba.setPointerCapture(e.pointerId); ba.classList.add("drag"); fromX(e.clientX); });
    ba.addEventListener("pointermove", e => { if (dragging) fromX(e.clientX); });
    const end = () => { dragging = false; ba.classList.remove("drag"); };
    ba.addEventListener("pointerup", end);
    ba.addEventListener("pointercancel", end);
    bar.addEventListener("keydown", e => {
      const k = { ArrowLeft: -(e.shiftKey ? 10 : 2), ArrowRight: e.shiftKey ? 10 : 2 }[e.key];
      if (k != null) { e.preventDefault(); stopAnim(); setPos(pos + k); }
      else if (e.key === "Home") { e.preventDefault(); setPos(0); }
      else if (e.key === "End") { e.preventDefault(); setPos(100); }
    });

    setPos(50);
    if (!reduceMotion && "IntersectionObserver" in window) {
      // first time it scrolls into view, wipe from the final grade back to the midpoint
      setPos(4);
      const obs = new IntersectionObserver(es => {
        if (!es[0].isIntersecting) return;
        obs.disconnect();
        const t0 = performance.now(), d = 1800;
        const f = now => {
          const t = clamp((now - t0) / d, 0, 1);
          setPos(4 + 46 * (1 - Math.pow(1 - t, 3)));
          if (t < 1) anim = requestAnimationFrame(f);
        };
        anim = requestAnimationFrame(f);
      }, { threshold: 0.5 });
      obs.observe(ba);
    }
  }

  /* ---------------------------------------------------------------------
     Identity / static text
     --------------------------------------------------------------------- */
  function renderIdentity() {
    document.title = `${C.name} · ${C.subtitle}`;
    $("#brandMark").textContent = C.monogram || (C.name || "A")[0];
    $("#brandName").textContent = C.name;
    $("#brandSub").textContent = C.subtitle;
    $("#heroHeadline").innerHTML = C.heroHeadline;   // owner-controlled config; allows <br>/<em>
    $("#heroTagline").textContent = C.heroTagline;
    $("#heroMeta").textContent = C.heroMeta || "";
    $("#footName").textContent = `${C.name} · ${C.subtitle}`;
    $("#year").textContent = new Date().getFullYear();
    $("#locationLine").textContent = C.location || "";

    const mail = $("#mailLink"); mail.href = `mailto:${C.email}`; mail.textContent = C.email;
    const links = [
      C.whatsapp && ["WhatsApp", `https://wa.me/${C.whatsapp}`],
      C.instagram && ["Instagram", C.instagram],
      C.imdb && ["IMDb", C.imdb],
      C.vimeo && ["Vimeo", C.vimeo]
    ].filter(Boolean);
    $("#socialLinks").append(...links.map(([t, u]) => h("li", {}, h("a", { href: u, target: "_blank", rel: "noopener noreferrer", text: t }))));
  }

  /* ---------------------------------------------------------------------
     Films + Showreel
     --------------------------------------------------------------------- */
  function thumbSources(film) {
    if (film.thumb) {
      const src = /^https?:/.test(film.thumb) ? film.thumb
        : `https://res.cloudinary.com/${CLOUD}/image/upload/${C.IMG_GRID}/${film.thumb}`;
      return { src, fallback: `https://img.youtube.com/vi/${film.id}/hqdefault.jpg` };
    }
    return {
      src: `https://img.youtube.com/vi/${film.id}/maxresdefault.jpg`,
      fallback: `https://img.youtube.com/vi/${film.id}/hqdefault.jpg`
    };
  }

  function filmCard(film, { ratio = "169", badge = "" } = {}) {
    const { src, fallback } = thumbSources(film);
    const media = h("div", { class: `media skeleton ${ratio === "239" ? "r239" : "r169"}` },
      smartImg({ src, fallback, alt: `${film.title} thumbnail` }));
    const card = h("button", { class: "card", type: "button", "data-cursor": "PLAY REEL", "aria-label": `Play ${film.title}` },
      badge ? h("span", { class: "badge", text: badge }) : null,
      media,
      h("span", { class: "play", html: SVG_PLAY }),
      h("span", { class: "info" },
        h("span", { class: "role", text: film.role || "" }),
        h("h3", {}, film.title, film.year ? h("span", { class: "yr", text: film.year }) : null),
        h("span", { class: "cam", text: film.camera || "" })));
    magnetic(card);
    attachPreview(card, media, film.id);
    return card;
  }

  const toVideo = f => ({ type: "video", id: f.id, title: f.title, role: f.role, camera: f.camera, year: f.year });

  function renderShowreel() {
    const s = C.SHOWREEL;
    if (!s || !s.youtubeId) { $("#showreel").remove(); return; }
    const film = { id: s.youtubeId, title: s.title, role: s.role, camera: s.camera, year: s.year, thumb: s.thumb };
    const card = filmCard(film, { ratio: "239", badge: s.runtime ? `Showreel · ${s.runtime}` : "Showreel" });
    card.onclick = () => lbOpen([toVideo(film)], 0);
    $("#showreel").append(card);
    $("#heroShowreelBtn").addEventListener("click", e => { e.preventDefault(); lbOpen([toVideo(film)], 0); });
  }

  function renderFilms() {
    const films = (C.FILMS || []).filter(f => f && f.id);
    const grid = $("#filmGrid");
    const cats = [...new Set(films.map(f => f.category).filter(Boolean))];
    const order = ["Commercials", "Narrative", "Music Videos", "Documentary"];
    cats.sort((a, b) => (order.indexOf(a) + 99) % 99 - (order.indexOf(b) + 99) % 99);
    const tabs = [{ key: "All", label: "All" }, ...cats.map(c => ({ key: c, label: c }))];

    const nodes = films.map((f, i) => {
      const wrap = h("div", { class: "item", "data-cat": f.category || "" }, filmCard(f, { ratio: f.ratio === "2.39" ? "239" : "169" }));
      if (f.ratio === "2.39") wrap.classList.add("span2");
      reveal(wrap, (i % 3) * 0.08);
      return wrap;
    });
    grid.append(...nodes);

    const openFrom = (idx) => {
      // lightbox navigates through films currently visible
      const vis = nodes.filter(n => !n.hidden && !n.classList.contains("out"));
      const list = vis.map(n => toVideo(films[nodes.indexOf(n)]));
      lbOpen(list, vis.indexOf(nodes[idx]));
    };
    nodes.forEach((n, i) => $(".card", n).addEventListener("click", () => openFrom(i)));

    buildFilters($("#filmFilters"), tabs, key => {
      applyFilter(nodes, n => key === "All" || n.dataset.cat === key);
      setTimeout(() => { $("#filmEmpty").hidden = nodes.some(n => !n.hidden); }, 320);
    });
    if (!films.length) $("#filmEmpty").hidden = false;
  }

  /* ---------------------------------------------------------------------
     Stills (Cloudinary)
     --------------------------------------------------------------------- */
  function notice(html) {
    const n = $("#stillNotice"); n.innerHTML = html; n.hidden = false;   // static trusted strings only
  }

  async function loadStills() {
    const cats = C.STILL_CATEGORIES || [];
    const T = C.CLOUDINARY_TAGS || {};
    const tags = [T.all, ...cats.map(c => c.tag)].filter(Boolean);
    const results = await Promise.all(tags.map(async t => [t, await fetchTag(t)]));
    const byTag = Object.fromEntries(results);

    const map = new Map();                       // public_id -> still
    results.forEach(([tag, r]) => r.resources.forEach(res => {
      const cat = cats.find(c => c.tag === tag);
      if (!map.has(res.public_id)) map.set(res.public_id, { res, cats: new Set() });
      if (cat) map.get(res.public_id).cats.add(cat.key);
    }));

    const anyOk = results.some(([, r]) => r.ok);
    let stills;
    if (map.size) {
      stills = [...map.values()].map(({ res, cats: cs }, i) => ({
        grid: cldUrl(res, C.IMG_GRID), full: cldUrl(res, C.IMG_FULL),
        wide: res.width && res.height && res.width / res.height > 2,
        cats: [...cs], title: res.public_id.split("/").pop().replace(/[_-]+/g, " "), i
      }));
    } else {
      if (!CLOUD) {
        notice("<strong>Preview mode.</strong> Set <code>CLOUDINARY_CLOUD_NAME</code> in <code>config.js</code> to load your own stills. Showing placeholder frames.");
      } else if (!anyOk) {
        notice("<strong>Couldn't load stills from Cloudinary.</strong> Enable <em>Resource list</em> in Cloudinary Settings → Security, and check the cloud name and tags. Showing placeholder frames.");
      } else {
        notice("<strong>No tagged images yet.</strong> Add the tags from <code>config.js</code> to your Cloudinary images. Showing placeholder frames.");
      }
      const labels = ["Frame 01", "Frame 02", "Frame 03", "Frame 04", "Frame 05", "Frame 06", "Frame 07", "Frame 08"];
      stills = labels.map((l, i) => {
        const wide = i % 4 === 0;
        const cat = cats.length ? cats[i % cats.length].key : "";
        const w = wide ? 2390 : 1600, hh = wide ? 1000 : 900;
        return { grid: placeholder(i, w, hh, l.toUpperCase()), full: placeholder(i, w, hh, l.toUpperCase()), wide, cats: cat ? [cat] : [], title: l, i };
      });
    }
    return { stills, byTag };
  }

  async function renderStills() {
    const grid = $("#stillGrid");
    const cats = C.STILL_CATEGORIES || [];
    grid.append(...[0, 1, 2].map(() => h("div", { class: "media skeleton r169" })));
    const { stills, byTag } = await loadStills();
    grid.replaceChildren();

    const nodes = stills.map((s, i) => {
      const media = h("div", { class: `media skeleton ${s.wide ? "r239" : "r169"}` },
        smartImg({ src: s.grid, alt: s.title }));
      const catLabel = cats.filter(c => s.cats.includes(c.key)).map(c => c.label).join(" · ");
      const card = h("button", { class: "card", type: "button", "data-cursor": "INSPECT", "aria-label": `Inspect ${s.title}` },
        media, h("span", { class: "play expand", html: SVG_EXPAND }),
        catLabel ? h("span", { class: "info" }, h("span", { class: "tag", text: catLabel })) : null);
      magnetic(card);
      const item = h("div", { class: "item" + (s.wide ? " span2" : ""), "data-cats": s.cats.join(",") }, card);
      reveal(item, (i % 4) * 0.07);
      return item;
    });
    grid.append(...nodes);

    const openFrom = idx => {
      const vis = nodes.filter(n => !n.hidden && !n.classList.contains("out"));
      const list = vis.map(n => { const s = stills[nodes.indexOf(n)]; return { type: "image", src: s.full, title: s.title, role: cats.filter(c => s.cats.includes(c.key)).map(c => c.label).join(" · ") }; });
      lbOpen(list, vis.indexOf(nodes[idx]));
    };
    nodes.forEach((n, i) => $(".card", n).addEventListener("click", () => openFrom(i)));

    const usedCats = cats.filter(c => stills.some(s => s.cats.includes(c.key)) || !stills.length);
    const tabs = [{ key: "all", label: "All Stills" }, ...(usedCats.length ? usedCats : cats)];
    buildFilters($("#stillFilters"), tabs, key => {
      applyFilter(nodes, n => key === "all" || n.dataset.cats.split(",").includes(key));
      setTimeout(() => { $("#stillEmpty").hidden = nodes.some(n => !n.hidden); }, 320);
    });
    renderGrade(byTag);
  }

  /* ---------------------------------------------------------------------
     Hero background + About portrait
     --------------------------------------------------------------------- */
  async function renderHero() {
    const tag = (C.CLOUDINARY_TAGS || {}).hero;
    if (!tag) return;
    const r = await fetchTag(tag);
    if (!r.resources.length) return;
    const url = cldUrl(r.resources[0], C.IMG_HERO);
    const pre = new Image();
    pre.onload = () => {
      const bg = $("#heroBg");
      bg.style.backgroundImage = `url("${url}")`;
      bg.classList.add("has-img");
      requestAnimationFrame(() => requestAnimationFrame(() => bg.classList.add("loaded")));
    };
    pre.src = url;
  }

  async function renderAbout() {
    const A = C.ABOUT || {};
    $("#aboutHeading").textContent = A.heading || "";
    $("#aboutBio").append(...(A.bio || []).map(p => h("p", { text: p })));
    $("#aboutCredits").append(...(A.credits || []).map(c => h("li", { text: c })));
    $("#kitCards").append(...(A.cards || []).map((c, i) => {
      const card = h("article", { class: "kit" },
        h("span", { class: "num", text: String(i + 1).padStart(2, "0") }),
        h("h3", { text: c.title }),
        h("ul", {}, (c.items || []).map(t => h("li", { text: t }))));
      reveal(card, i * 0.1);
      return card;
    }));

    const fig = $("#portrait");
    const fallbackImg = h("img", { src: placeholder(0, 800, 1000, (C.name || "").toUpperCase()), alt: `${C.name} portrait placeholder`, loading: "lazy" });
    fig.append(fallbackImg);
    const tag = (C.CLOUDINARY_TAGS || {}).about;
    if (tag) {
      const r = await fetchTag(tag);
      if (r.resources.length) {
        const img = h("img", { src: cldUrl(r.resources[0], C.IMG_PORTRAIT), alt: `${C.name} portrait`, loading: "lazy" });
        img.addEventListener("load", () => fig.replaceChildren(img));
      }
    }
  }

  /* ---------------------------------------------------------------------
     Inquiry form (Web3Forms / Formspree)
     --------------------------------------------------------------------- */
  function setupForm() {
    const form = $("#inquiryForm"), status = $("#formStatus"), btn = $("#formBtn");
    const F = C.FORM || {};
    const say = (msg, cls) => { status.textContent = msg; status.className = "form-status " + (cls || ""); };

    form.addEventListener("submit", async e => {
      e.preventDefault();
      let valid = true;
      $$("[required]", form).forEach(f => {
        const bad = !f.value.trim() || (f.type === "email" && !/^\S+@\S+\.\S+$/.test(f.value));
        f.classList.toggle("invalid", bad); if (bad) valid = false;
      });
      if (!valid) return say("Please complete the highlighted fields.", "err");

      const data = new FormData(form);
      if (data.get("botcheck")) return;                     // honeypot tripped

      const web3 = F.provider === "web3forms" && F.web3formsAccessKey;
      const fs = F.provider === "formspree" && F.formspreeEndpoint;

      if (!web3 && !fs) {                                   // no provider configured: open email client
        const body = [...data.entries()].filter(([k]) => k !== "botcheck").map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join("\n");
        location.href = `mailto:${C.email}?subject=${encodeURIComponent("Production inquiry")}&body=${encodeURIComponent(body)}`;
        return say("Form service isn't configured yet, opening your email app instead.", "ok");
      }

      btn.disabled = true; say("Sending…");
      try {
        let res;
        if (web3) {
          data.append("access_key", F.web3formsAccessKey);
          data.append("subject", `New production inquiry from ${data.get("name")}`);
          data.append("from_name", `${C.name} Portfolio`);
          res = await fetch("https://api.web3forms.com/submit", { method: "POST", headers: { Accept: "application/json" }, body: data });
        } else {
          res = await fetch(F.formspreeEndpoint, { method: "POST", headers: { Accept: "application/json" }, body: data });
        }
        if (!res.ok) throw new Error(res.status);
        form.reset(); say("Thank you. Your inquiry is in, and I'll reply within 48 hours.", "ok");
      } catch (err) {
        say(`Something went wrong. Please email ${C.email} directly.`, "err");
      } finally { btn.disabled = false; }
    });
  }

  /* ---------------------------------------------------------------------
     Navbar
     --------------------------------------------------------------------- */
  function setupNav() {
    const nav = $("#nav"), toggle = $("#navToggle"), links = $("#navLinks");
    const onScroll = () => nav.classList.toggle("scrolled", scrollY > 30);
    onScroll(); addEventListener("scroll", onScroll, { passive: true });

    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    $$("a", links).forEach(a => a.addEventListener("click", () => { links.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }));

    if ("IntersectionObserver" in window) {
      const secs = ["work", "stills", "about", "contact"].map(id => document.getElementById(id));
      const spy = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) $$("a:not(.btn)", links).forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
      }), { rootMargin: "-45% 0px -50% 0px" });
      secs.forEach(s => s && spy.observe(s));
    }
  }

  /* ---------------------------------------------------------------------
     Init
     --------------------------------------------------------------------- */
  runPreloader();
  renderIdentity();
  setupNav();
  renderShowreel();
  renderFilms();
  renderStills();
  renderHero();
  renderAbout();
  setupForm();
  $$(".reveal").forEach(n => { if (!n.style.getPropertyValue("--d")) reveal(n); });
  setupMasks();
  setupShowreelScroll();
  setupCursor();
})();
