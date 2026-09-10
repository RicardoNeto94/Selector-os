"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useIsPresent, useReducedMotion } from "framer-motion";

const EXIT_SECONDS = 0.18;

// Keep the existing dialog and focus/scroll lock mounted until its exit finishes.
export function useBurmanModal() {
  const [phase, setPhase] = useState("closed");
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (phase !== "closing") return;
    const timer = window.setTimeout(() => setPhase("closed"), reducedMotion ? 0 : EXIT_SECONDS * 1000);
    return () => window.clearTimeout(timer);
  }, [phase, reducedMotion]);
  return [phase !== "closed", (open) => setPhase((current) => open ? "open" : current === "closed" ? "closed" : "closing"), phase];
}

export function useBurmanMotion() {
  const reducedMotion = useReducedMotion();
  const hidden = { opacity: 0, y: reducedMotion ? 0 : 10, scale: 1 };
  return {
    panel: {
      closed: hidden,
      open: {
        opacity: 1, y: 0, scale: 1,
        transition: reducedMotion ? { duration: 0 } : { type: "spring", duration: 0.32, bounce: 0 },
      },
      closing: { ...hidden, transition: { duration: reducedMotion ? 0 : EXIT_SECONDS, ease: [0.4, 0, 1, 1] } },
    },
    backdrop: {
      closed: { opacity: 0 },
      open: {
        opacity: 1,
        transition: { duration: reducedMotion ? 0 : 0.2 },
      },
      closing: {
        opacity: 0,
        transition: { duration: reducedMotion ? 0 : EXIT_SECONDS },
      },
    },
  };
}

export function BurmanTabIndicator({ group, active }) {
  const reducedMotion = useReducedMotion();
  return active ? (
    <motion.span
      className="bh-tab-indicator"
      layoutId={`burman-tab-${group}`}
      aria-hidden="true"
      transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 36 }}
    />
  ) : null;
}

const ContentPanel = forwardRef(function ContentPanel({ children, direction, onEntered, ...props }, ref) {
  const present = useIsPresent();
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      {...props}
      layoutScroll
      ref={ref}
      inert={!present}
      aria-hidden={present ? undefined : true}
      initial={{ opacity: reducedMotion ? 1 : 0, x: reducedMotion ? 0 : direction * 14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: reducedMotion ? 1 : 0, x: 0, transition: { duration: reducedMotion ? 0 : 0.06 } }}
      transition={{ duration: reducedMotion ? 0 : 0.14, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => { if (present) onEntered?.(); }}
    >{children}</motion.div>
  );
});

// No additional DOM wrapper: retain each existing flex child and scrolling area.
export const BurmanCrossfade = forwardRef(function BurmanCrossfade({ contentKey, direction = 0, ...props }, ref) {
  return (
    <AnimatePresence initial={false} mode="wait">
      <ContentPanel key={contentKey} ref={ref} direction={direction} {...props} />
    </AnimatePresence>
  );
});

const SHARED_TRANSITION = { duration: 0.26, ease: [0.22, 1, 0.36, 1] };

export function BurmanSharedPhoto({ src, detail = false }) {
  // Fade the scene without resizing a full-screen image and its blurred layers.
  return (
    <div
      className={detail ? "vx-dining-atmosphere" : "bh-dining-shared-photo"}
      style={{ backgroundImage: `url(${JSON.stringify(src)})` }}
      aria-hidden="true"
    />
  );
}

export function BurmanSharedTitle({ venueId, detail = false, children }) {
  const reducedMotion = useReducedMotion();
  const Heading = detail ? motion.h2 : motion.h4;
  return (
    <Heading
      layout="position"
      layoutId={reducedMotion ? undefined : `venue-title-${venueId}`}
      transition={reducedMotion ? { duration: 0 } : SHARED_TRANSITION}
      style={{ width: "fit-content", maxWidth: "100%" }}
    >{children}</Heading>
  );
}

function SharedScene({ children, onEntered }) {
  const present = useIsPresent();
  const reducedMotion = useReducedMotion();
  const enteredRef = useRef(onEntered);
  enteredRef.current = onEntered;
  useEffect(() => {
    if (!present) return;
    // Focus must not depend on an animation callback (which may be skipped).
    const frame = requestAnimationFrame(() => enteredRef.current?.());
    return () => cancelAnimationFrame(frame);
  }, [present]);
  return (
    <motion.div
      className="bh-dining-shared-scene"
      inert={!present}
      aria-hidden={!present || undefined}
      initial={{ opacity: reducedMotion ? 1 : 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
    >{children}</motion.div>
  );
}

// Both scenes share one coordinate space during the handoff. Unlike a sequential
// fade, overlapping lifetimes let Motion connect titles while photos crossfade.
export function BurmanSharedStage({ contentKey, children, onEntered }) {
  return (
    <LayoutGroup id="burman-dining-restaurants">
      <div className="bh-dining-stage">
        <AnimatePresence initial={false} mode="sync">
          <SharedScene key={contentKey} onEntered={onEntered}>{children}</SharedScene>
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}

export { motion };
