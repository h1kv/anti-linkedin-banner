# anti-linkedin-banner

Chrome extension that hides and auto-dismisses LinkedIn's global alert banners
(for example the "There was a problem processing your job posting payment" nag)
on every page load and in-app navigation, on any `*.linkedin.com` or `linkedin.*` domain.

## Install
1. Clone or download this repo.
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and pick this folder.

## How it works
- The content script runs at `document_start` and exits immediately unless the hostname is LinkedIn.
- It injects a stylesheet that hides the alert container (identified by its
  `data-testid="global-alerts-dismissible"` dismiss button) and any wrapper divs
  that hold nothing but the alert, so no bordered strip is left behind.
- It also clicks LinkedIn's own dismiss button once per alert so the app removes it itself.
- A `MutationObserver`, history hooks (`pushState` / `replaceState` / `popstate`) and a
  2-second poll make sure it re-runs after LinkedIn's client-side navigation and lazy loading.

## Why not delete the element?
LinkedIn is a React app. Physically removing nodes it owns makes React throw during
re-render and can blank the whole page. Hiding via CSS gives the same visual result safely.

## Changing the target
Edit `CLASS_LIST` or `DISMISS_BUTTON` in `content.js`, then click the reload icon for the
extension on `chrome://extensions`. LinkedIn's hashed class names change between deploys;
the `data-testid` is the stable part.
