"use client";

import { useEffect } from "react";

export default function VaxeronMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.querySelector(".vx2");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        // Content remains visible without JavaScript, with no blocking intro.
        entry.target.animate([{ transform: "translateY(12px)" }, { transform: "translateY(0)" }], { duration: 320, easing: "ease-out" });
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08 });
    root?.querySelectorAll("section:not(.vx2-hero) [data-reveal]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return null;
}
