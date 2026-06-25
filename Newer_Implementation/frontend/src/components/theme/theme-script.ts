/**
 * Blocking inline script injected in the root layout. It runs before paint and
 * sets `<html data-theme>` from the saved choice, else the OS preference, else
 * dark — so there is no flash of the wrong colour scheme. Server-safe (a plain
 * string constant; no client-only APIs at module scope).
 */
export const themeInitScript = `(function(){try{var k='vault-theme';var t=localStorage.getItem(k);if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;
