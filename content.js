(() => {
  // Only act on *.linkedin.com or linkedin.<anything> (e.g. linkedin.cn, fr.linkedin.com).
  const host = location.hostname.toLowerCase();
  if (!/(^|\.)linkedin\.[a-z.]+$/.test(host)) return;

  // ---- New (React / SDUI) layout, e.g. the feed ----------------------------------
  // The hashed class names below are LinkedIn's shared utility classes and also appear on
  // page-level wrappers, so they are NOT used on their own. The alert is identified by its
  // dismiss button instead, which is unique to global alert banners.
  const CLASS_LIST =
    "_6376d83e d1b6db25 bd04e45f _78cbe4ff _9dc21ff9 _96f7ce15 _46988972 _15eb7407 _98fc876e c325c6db _93e2ccf0";
  const CLASS_SELECTOR = CLASS_LIST.split(/\s+/).map((c) => "." + CSS.escape(c)).join("");
  const REACT_DISMISS = 'button[data-testid="global-alerts-dismissible"]';
  const REACT_ALERT = `${CLASS_SELECTOR}:has(${REACT_DISMISS})`;

  // ---- Old (Ember / artdeco) layout, e.g. Jobs, Messaging, profile pages ---------
  const EMBER_CONTAINER = "#artdeco-global-alert-container";
  const EMBER_ALERT = ".artdeco-global-alert";
  const EMBER_DISMISS = "[data-test-global-alert-dismiss], .artdeco-global-alert__dismiss";

  const DISMISS_SELECTOR = `${REACT_DISMISS}, ${EMBER_DISMISS}`;

  // 1) Instant, render-safe hiding via a stylesheet (no flash, the framework never notices).
  function injectStyle() {
    if (document.getElementById("li-element-remover-style")) return;
    const style = document.createElement("style");
    style.id = "li-element-remover-style";
    style.textContent = `
      /* React layout: the alert plus up to two wrappers that contain nothing but it */
      ${REACT_ALERT},
      [class]:has(> ${REACT_ALERT}:only-child),
      [class]:has(> [class]:only-child > ${REACT_ALERT}:only-child),
      /* Ember layout: the whole global alert container */
      html body ${EMBER_CONTAINER},
      html body ${EMBER_ALERT} {
        display: none !important;
        height: 0 !important;
      }
      /* Ember layout pushes the page down by 56px while an alert is shown; undo that. */
      html::before { height: 0 !important; display: none !important; }
      html body .global-alert-offset,
      html body .global-alert-offset-top { top: 0 !important; }
      html body .global-alert-offset-translate { transform: none !important; }
      html body .global-alert-offset-margin { margin-top: 0 !important; }
    `;
    (document.head || document.documentElement).appendChild(style);
  }
  injectStyle();
  new MutationObserver(injectStyle).observe(document.documentElement, { childList: true });

  // 2) Click LinkedIn's own dismiss button so the app removes the alert (and its offsets) itself.
  const clicked = new WeakSet();
  function dismissAlerts() {
    for (const btn of document.querySelectorAll(DISMISS_SELECTOR)) {
      const alert = btn.closest(`${CLASS_SELECTOR}, ${EMBER_ALERT}, ${EMBER_CONTAINER}`);
      if (alert) {
        alert.style.setProperty("display", "none", "important");
        // Collapse ancestors that hold nothing but this alert.
        let node = alert;
        while (node.parentElement && node.parentElement.children.length === 1 &&
               node.parentElement !== document.body && node.parentElement.id !== "root") {
          node = node.parentElement;
          node.style.setProperty("display", "none", "important");
        }
      }
      if (clicked.has(btn)) continue;
      clicked.add(btn);
      try { btn.click(); } catch (_) {}
    }
    // Ember layout: strip the offset classes LinkedIn adds to push content down.
    for (const cls of ["global-alert-offset", "global-alert-offset-top",
                       "global-alert-offset-translate", "global-alert-offset-margin"]) {
      for (const el of document.querySelectorAll("." + cls)) el.classList.remove(cls);
    }
  }

  let scheduled = false;
  function tick() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      dismissAlerts();
    });
  }

  new MutationObserver(tick).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", dismissAlerts);
  window.addEventListener("load", dismissAlerts);
  window.addEventListener("popstate", tick);
  for (const method of ["pushState", "replaceState"]) {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(this, args);
      tick();
      return result;
    };
  }
  setInterval(dismissAlerts, 2000);

  console.log("[LI Remover] active on", host);
})();
