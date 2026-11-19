(() => {
  const { highlights, posts, links } = window.SITE;
  const RTL = document.documentElement.dir === "rtl";
  const DEFAULT_DURATION = 5000;
  const SEEN_KEY = "prostudio-seen";

  const $ = (id) => document.getElementById(id);
  const row = $("highlights");
  const grid = $("grid");
  const story = $("story");
  const frame = $("storyFrame");
  const bars = $("storyBars");
  const media = $("storyMedia");
  const titleEl = $("storyTitle");
  const thumbEl = $("storyThumb");

  // ---------- حالة "شوهد" (تتذكرها بالمتصفح) ----------
  const seen = (() => {
    try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); }
    catch { return new Set(); }
  })();
  const markSeen = (i) => {
    seen.add(highlights[i].title);
    row.children[i]?.classList.add("seen");
    try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch {}
  };

  const setCover = (el, h) => {
    if (h.cover) el.style.backgroundImage = `url("${h.cover}")`;
    else el.textContent = h.emoji || "✨";
  };

  // ---------- رسم الدوائر ----------
  highlights.forEach((h, i) => {
    const li = document.createElement("li");
    li.className = "hl" + (seen.has(h.title) ? " seen" : "");
    li.innerHTML = `<button type="button"><div class="hl-ring"><div class="hl-cover"></div></div><span class="hl-title"></span></button>`;
    setCover(li.querySelector(".hl-cover"), h);
    li.querySelector(".hl-title").textContent = h.title;
    li.querySelector("button").addEventListener("click", () => open(i));
    row.appendChild(li);
  });

  // ---------- شبكة المنشورات ----------
  posts.forEach((p) => {
    const d = document.createElement("div");
    d.className = "post";
    d.style.background = p.src ? `center/cover url("${p.src}")` : p.bg;
    if (p.label) d.innerHTML = `<span></span>`, (d.firstChild.textContent = p.label);
    grid.appendChild(d);
  });

  // روابط التواصل
  document.querySelectorAll("[data-link]").forEach((a) => {
    const url = links[a.dataset.link];
    if (url) { a.href = url; a.target = "_blank"; a.rel = "noopener"; }
  });
  $("year").textContent = new Date().getFullYear();

  // ---------- عارض الستوري ----------
  let hi = 0, si = 0;          // رقم الهايلايت ورقم الستوري
  let duration = DEFAULT_DURATION, elapsed = 0, last = 0, raf = 0;
  let paused = false, video = null, lastFocus = null;

  function open(i) {
    lastFocus = document.activeElement;
    story.hidden = false;
    document.body.style.overflow = "hidden";
    showHighlight(i, 0);
    $("storyClose").focus({ preventScroll: true });
  }

  function close() {
    stop();
    story.hidden = true;
    media.innerHTML = "";
    frame.style.transform = "";
    frame.style.opacity = "";
    document.body.style.overflow = "";
    lastFocus?.focus?.({ preventScroll: true });
  }

  function showHighlight(i, s) {
    hi = i;
    const h = highlights[hi];
    titleEl.textContent = h.title;
    thumbEl.style.backgroundImage = "";
    thumbEl.textContent = "";
    setCover(thumbEl, h);
    bars.innerHTML = h.stories.map(() => `<div class="story-bar"><i></i></div>`).join("");
    markSeen(hi);
    showStory(s);
  }

  function showStory(s) {
    stop();
    si = s;
    const item = highlights[hi].stories[si];
    [...bars.children].forEach((b, k) => (b.firstChild.style.width = k < si ? "100%" : "0%"));
    media.innerHTML = "";
    video = null;
    elapsed = 0;
    duration = (item.duration ? item.duration * 1000 : DEFAULT_DURATION);

    if (item.type === "video") {
      video = document.createElement("video");
      Object.assign(video, { src: item.src, playsInline: true, muted: false, autoplay: true, preload: "auto" });
      video.addEventListener("loadedmetadata", () => { if (!item.duration) duration = video.duration * 1000; });
      video.addEventListener("ended", next);
      video.play().catch(() => { video.muted = true; video.play().catch(() => {}); });
      media.appendChild(video);
    } else if (item.type === "image") {
      const img = new Image();
      img.src = item.src;
      img.alt = item.alt || "";
      media.appendChild(img);
    } else {
      const t = document.createElement("div");
      t.className = "story-text";
      t.style.background = item.bg || "#222";
      t.innerHTML = `<h3></h3><p></p>`;
      t.querySelector("h3").textContent = item.title || "";
      t.querySelector("p").textContent = item.text || "";
      media.appendChild(t);
    }
    preloadNext();
    paused = false;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function preloadNext() {
    const n = highlights[hi].stories[si + 1];
    if (n?.type === "image") new Image().src = n.src;
  }

  function tick(now) {
    if (!paused) {
      elapsed = video && video.duration ? video.currentTime * 1000 : elapsed + (now - last);
      const bar = bars.children[si]?.firstChild;
      if (bar) bar.style.width = Math.min(100, (elapsed / duration) * 100) + "%";
      if (!video && elapsed >= duration) return next();
    }
    last = now;
    raf = requestAnimationFrame(tick);
  }

  function stop() { cancelAnimationFrame(raf); video?.pause(); }
  function pause() { paused = true; video?.pause(); }
  function resume() { paused = false; last = performance.now(); video?.play().catch(() => {}); }

  function next() {
    if (si < highlights[hi].stories.length - 1) showStory(si + 1);
    else if (hi < highlights.length - 1) showHighlight(hi + 1, 0);
    else close();
  }
  function prev() {
    if (si > 0) showStory(si - 1);
    else if (hi > 0) showHighlight(hi - 1, highlights[hi - 1].stories.length - 1);
    else showStory(0);
  }
  const nextHighlight = () => (hi < highlights.length - 1 ? showHighlight(hi + 1, 0) : close());
  const prevHighlight = () => (hi > 0 ? showHighlight(hi - 1, 0) : showStory(0));

  // ---------- اللمس: ضغطة = تنقل، تعليك = إيقاف، سحب لجوه = إغلاق ----------
  let down = null;
  frame.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".story-close")) return;
    down = { x: e.clientX, y: e.clientY, t: Date.now() };
    pause();
    frame.setPointerCapture(e.pointerId);
  });
  frame.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dy = e.clientY - down.y;
    if (dy > 0) {
      frame.style.transform = `translateY(${dy}px) scale(${1 - Math.min(dy, 400) / 2000})`;
      frame.style.opacity = String(1 - Math.min(dy, 400) / 800);
    }
  });
  const endPointer = (e) => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y, dt = Date.now() - down.t;
    down = null;
    frame.style.transform = "";
    frame.style.opacity = "";
    if (dy > 100 && Math.abs(dy) > Math.abs(dx)) return close();
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      // سحب لليمين أو اليسار = الهايلايت اللي بعده أو قبله
      const forward = RTL ? dx > 0 : dx < 0;
      return forward ? nextHighlight() : prevHighlight();
    }
    if (dt < 250 && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const r = frame.getBoundingClientRect();
      const fromStart = RTL ? r.right - e.clientX : e.clientX - r.left;
      return fromStart < r.width * 0.35 ? prev() : next();
    }
    resume();
  };
  frame.addEventListener("pointerup", endPointer);
  frame.addEventListener("pointercancel", () => { down = null; frame.style.transform = ""; frame.style.opacity = ""; resume(); });

  $("storyClose").addEventListener("click", close);
  story.addEventListener("click", (e) => { if (e.target === story) close(); });

  // ---------- الكيبورد ----------
  document.addEventListener("keydown", (e) => {
    if (story.hidden) return;
    const fwd = RTL ? "ArrowLeft" : "ArrowRight";
    const back = RTL ? "ArrowRight" : "ArrowLeft";
    if (e.key === "Escape") close();
    else if (e.key === fwd) next();
    else if (e.key === back) prev();
    else if (e.key === " ") { e.preventDefault(); paused ? resume() : pause(); }
  });

  // يوقف إذا طلع من التاب
  document.addEventListener("visibilitychange", () => {
    if (story.hidden) return;
    document.hidden ? pause() : resume();
  });
})();
