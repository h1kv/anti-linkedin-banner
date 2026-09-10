(() => {
  // Only act on *.linkedin.com or linkedin.<anything> (e.g. linkedin.cn, fr.linkedin.com).
  const host = location.hostname.toLowerCase();
  if (!/(^|\.)linkedin\.[a-z.]+$/.test(host)) return;

  // The hashed class names below are LinkedIn's shared utility classes and also appear on
  // page-level wrappers, so they are NOT used on their own. The alert is identified by its
  // dismiss button instead, which is unique to global alert banners.
  const CLASS_LIST =
    "_6376d83e d1b6db25 bd04e45f _78cbe4ff _9dc21ff9 _96f7ce15 _46988972 _15eb7407 _98fc876e c325c6db _93e2ccf0";
  const CLASS_SELECTOR = CLASS_LIST.split(/\s+/).map((c) => "." + CSS.escape(c)).join("");
  const DISMISS_BUTTON = 'button[data-testid="global-alerts-dismissible"]';

  // Selector for the alert container: the classed div that contains the dismiss button.
  const ALERT_SELECTOR = `${CLASS_SELECTOR}:has(${DISMISS_BUTTON})`;

  // 1) Instant, render-safe hiding via a stylesheet (no flash, React never notices).
  function injectStyle() {
    if (document.getElementById("li-element-remover-style")) return;
    const style = document.createElement("style");
    style.id = "li-element-remover-style";
    // Hide the alert, plus up to two wrapper levels that contain nothing but the alert
    // (LinkedIn leaves a bordered strip behind otherwise).
    style.textContent = [
      `${ALERT_SELECTOR}`,
      `[class]:has(> ${ALERT_SELECTOR}:only-child)`,
      `[class]:has(> [class]:only-child > ${ALERT_SELECTOR}:only-child)`,
    ].join(", ") + " { display: none !important; }";
    (document.head || document.documentElement).appendChild(style);
  }
  injectStyle();
  new MutationObserver(injectStyle).observe(document.documentElement, { childList: true });

  // 2) Click LinkedIn's own dismiss button so the app removes the alert itself.
  const clicked = new WeakSet();
  function dismissAlerts() {
    for (const btn of document.querySelectorAll(DISMISS_BUTTON)) {
      const alert = btn.closest(CLASS_SELECTOR);
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
