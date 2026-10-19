// The secret code (type "glitch" anywhere outside a field, or click the logo 5 times fast):
// a 1.5 s page glitch, every Glitchy reacts, and the Secret code badge unlocks.
import { unlock } from "./achievements";
import { sfx } from "./sound";

export const GLITCH_EVENT = "gl1tch:glitch";
export const TOAST_EVENT = "gl1tch:toast";
export interface ToastDetail { kicker: string; title: string; text: string }

export function toast(detail: ToastDetail) {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail }));
}

let busy = false;
export function bigGlitch() {
  sfx("glitch");
  unlock("secret");
  // reduced motion: the badge and its toast only
  if (busy || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  busy = true;
  const root = document.documentElement;
  root.classList.add("glitching");
  window.dispatchEvent(new CustomEvent(GLITCH_EVENT));
  window.setTimeout(() => { root.classList.remove("glitching"); busy = false; }, 1500);
}
