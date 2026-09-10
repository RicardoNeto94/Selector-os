"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { isBurmanNight, shouldShowBurmanNight } from "@/lib/burman-night.mjs";
import "@/styles/burman/night-screen.css";

const clock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Tallinn", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export default function BurmanNightScreen({ children }) {
  const [phase, setPhase] = useState("closed");
  const [preview, setPreview] = useState(false);
  const [time, setTime] = useState("");
  const active = phase !== "closed";
  const activeRef = useRef(false);
  const lastActivity = useRef(0);
  const wakeButton = useRef(null);
  const returnFocus = useRef(null);
  const content = useRef(null);
  const gesture = useRef(null);
  const reducedMotion = useReducedMotion();
  activeRef.current = active;

  const show = useCallback(() => {
    returnFocus.current = document.activeElement;
    setTime(clock.format(Date.now()));
    setPhase("open");
  }, []);

  const dismiss = useCallback(() => {
    lastActivity.current = Date.now();
    setPhase((current) => current === "closed" ? current : "closing");
  }, []);

  useEffect(() => {
    // A development-only test link never changes the live hotel's schedule.
    setPreview(process.env.NODE_ENV === "development" &&
      new URLSearchParams(window.location.search).get("nightPreview") === "1");
  }, []);

  useEffect(() => {
    if (phase !== "closing") return;
    const timer = window.setTimeout(() => setPhase("closed"), reducedMotion ? 0 : 180);
    return () => window.clearTimeout(timer);
  }, [phase, reducedMotion]);

  useEffect(() => {
    lastActivity.current = Date.now();
    const pointers = new Set();
    const activity = () => { if (!activeRef.current) lastActivity.current = Date.now(); };
    const down = (event) => { pointers.add(event.pointerId); activity(); };
    const up = (event) => { pointers.delete(event.pointerId); activity(); };
    const check = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (activeRef.current) {
        setTime(clock.format(now));
        if (!preview && !isBurmanNight(new Date(now))) dismiss();
      } else if (!pointers.size && shouldShowBurmanNight(now, lastActivity.current, preview)) {
        show();
      }
    };
    const visibility = () => { pointers.clear(); check(); };
    const events = ["pointermove", "keydown", "wheel", "scroll"];
    events.forEach((name) => document.addEventListener(name, activity, { capture: true, passive: true }));
    document.addEventListener("pointerdown", down, { capture: true, passive: true });
    document.addEventListener("pointerup", up, { capture: true, passive: true });
    document.addEventListener("pointercancel", up, { capture: true, passive: true });
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pageshow", visibility);
    const timer = window.setInterval(check, 1000);
    return () => {
      window.clearInterval(timer);
      events.forEach((name) => document.removeEventListener(name, activity, true));
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", up, true);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pageshow", visibility);
    };
  }, [preview, dismiss, show]);

  useEffect(() => {
    if (!active) return;
    wakeButton.current?.focus({ preventScroll: true });
    // Keep the underlying menu's Escape/Tab handlers dormant while covered.
    const keys = (event) => {
      event.stopImmediatePropagation();
      if (["Escape", "Enter", " ", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        dismiss();
      } else if (event.key === "Tab") {
        event.preventDefault();
        wakeButton.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("keydown", keys, true);
    return () => {
      document.removeEventListener("keydown", keys, true);
      const previousFocus = returnFocus.current;
      if (previousFocus?.isConnected && !previousFocus.closest("[inert]")) {
        previousFocus.focus({ preventScroll: true });
      } else {
        const controls = content.current?.querySelectorAll("button, a[href], [tabindex='0']");
        Array.from(controls || []).find((element) => !element.closest("[inert]") &&
          element.getClientRects().length)?.focus({ preventScroll: true });
      }
    };
  }, [active, dismiss]);

  return (
    <>
      <div ref={content} className="bh-night-content" inert={active}>{children}</div>
      {preview && !active && (
        <button className="bh-night-preview" onClick={show}>Preview night screen</button>
      )}
      {active && (
        <motion.div className="bh-night-screen" role="dialog" aria-modal="true"
          aria-label="The Burman night screen" initial={{ opacity: reducedMotion ? 1 : 0 }}
          animate={{ opacity: phase === "closing" ? 0 : 1 }}
          transition={{ duration: reducedMotion ? 0 : phase === "closing" ? 0.18 : 0.45 }}
          onPointerDown={(event) => {
            gesture.current = { x: event.clientX, y: event.clientY };
            if (!event.target.closest("button")) event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerCancel={() => { gesture.current = null; }}
          onPointerUp={(event) => {
            const start = gesture.current;
            gesture.current = null;
            if (start && start.y - event.clientY > 45 && Math.abs(start.x - event.clientX) < 100) dismiss();
          }}>
          <div className="bh-night-wordmark">The Burman</div>
          <div className="bh-night-centre">
            <span className="bh-night-location">Tallinn</span>
            <time className="bh-night-clock">{time}</time>
            <h2>Rest well.</h2>
            <p>We’re here whenever you need us.</p>
          </div>
          <button ref={wakeButton} className="bh-night-wake" onClick={dismiss}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m6 15 6-6 6 6" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <span>Swipe up to continue</span>
            <small>or tap here</small>
          </button>
        </motion.div>
      )}
    </>
  );
}
