import { useEffect, useRef } from "react";
import { animate } from "animejs";

export function isReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Animate an element cleanly on mount with entrance fade & subtle slide-up.
 * Automatically respects prefers-reduced-motion and cleans up on unmount.
 */
export function useEntranceAnimation<T extends HTMLElement>(delayMs = 0) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || isReducedMotion()) return;

    let cleanup: (() => void) | undefined;
    try {
      const anim = animate(el, {
        opacity: [0, 1],
        translateY: [8, 0],
        duration: 350,
        delay: delayMs,
        ease: "outQuad",
      });

      cleanup = () => {
        try {
          if (
            anim &&
            "pause" in anim &&
            typeof (anim as { pause?: () => void }).pause === "function"
          ) {
            (anim as { pause: () => void }).pause();
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // Fallback: Ensure element remains fully visible if anime fails
      el.style.opacity = "1";
      el.style.transform = "none";
    }
    return cleanup;
  }, [delayMs]);

  return ref;
}

/**
 * Pulse a security alert or verification badge once cleanly to confirm an action.
 */
export function pulseVerifyBadge(target: HTMLElement) {
  if (isReducedMotion() || !target) return;
  try {
    animate(target, {
      scale: [1, 1.06, 1],
      duration: 300,
      ease: "outQuad",
    });
  } catch {
    // ignore
  }
}
