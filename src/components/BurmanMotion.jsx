"use client";

import { forwardRef, useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useIsPresent, useReducedMotion } from "framer-motion";

const EXIT_SECONDS = 0.24;

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
  const hidden = { opacity: 0, y: reducedMotion ? 0 : 20, scale: reducedMotion ? 1 : 0.98 };
  return {
    panel: {
      closed: hidden,
      open: {
        opacity: 1, y: 0, scale: 1,
        transition: reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 32, mass: 0.85 },
      },
      closing: { ...hidden, transition: { duration: reducedMotion ? 0 : EXIT_SECONDS, ease: [0.4, 0, 1, 1] } },
    },
    backdrop: {
      closed: { backgroundColor: "rgba(18,14,11,0)", backdropFilter: "blur(0px)", WebkitBackdropFilter: "blur(0px)" },
      open: {
        backgroundColor: "rgba(18,14,11,0.42)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        transition: { duration: reducedMotion ? 0 : 0.3 },
      },
      closing: {
        backgroundColor: "rgba(18,14,11,0)", backdropFilter: "blur(0px)", WebkitBackdropFilter: "blur(0px)",
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
      exit={{ opacity: reducedMotion ? 1 : 0, x: 0, transition: { duration: reducedMotion ? 0 : 0.1 } }}
      transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
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

const SHARED_TRANSITION = { type: "spring", stiffness: 240, damping: 30, mass: 0.9 };

export function BurmanSharedPhoto({ venueId, src, detail = false }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className={detail ? "vx-dining-atmosphere" : "bh-dining-shared-photo"}
      layoutId={reducedMotion ? undefined : `venue-photo-${venueId}`}
      transition={reducedMotion ? { duration: 0 } : SHARED_TRANSITION}
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
      layoutId={reducedMotion ? undefined : `venue-title-${venueId}`}
      transition={reducedMotion ? { duration: 0 } : SHARED_TRANSITION}
      style={{ width: "fit-content", maxWidth: "100%" }}
    >{children}</Heading>
  );
}

function SharedScene({ children, onEntered }) {
  const present = useIsPresent();
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className="bh-dining-shared-scene"
      inert={!present}
      aria-hidden={!present || undefined}
      initial={{ opacity: reducedMotion ? 1 : 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.48, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => { if (present) onEntered?.(); }}
    >{children}</motion.div>
  );
}

// Both scenes share one coordinate space during the handoff. Unlike a sequential
// fade, overlapping lifetimes let Motion match each photograph and title.
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
