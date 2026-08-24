"use client";

import { useEffect } from "react";
import "@/styles/vaxeron-motion.css";

export default function VaxeronMotion() {
  useEffect(() => {
    const root = document.querySelector(".vx2");
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const intro = root.querySelector(".vx-intro");
    try {
      if (sessionStorage.getItem("vaxeron-intro-seen")) intro?.classList.add("is-skipped");
      else sessionStorage.setItem("vaxeron-intro-seen", "true");
    } catch {}

    const children = [...root.querySelectorAll("[data-reveal]")];
    const revealGroups = [...root.querySelectorAll("section, footer")];
    revealGroups.forEach((group) => [...group.querySelectorAll("[data-reveal]")].forEach((element, index) => {
      element.classList.add("vx-animate");
      element.style.setProperty("--vx-delay", `${Math.min(index, 4) * 75}ms`);
    }));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });
    children.forEach((element) => observer.observe(element));

    const header = root.querySelector(".vx2-nav");
    const heroVisual = root.querySelector(".vx2-device-wrap");
    const parallaxVisuals = [...root.querySelectorAll(".vx2-hero-image,.vx2-service figure img,.vx2-evening>img,.vx2-burman-room>img,.vx2-partner-image img,.vx2-proof-window img")];
    const navLinks = [...root.querySelectorAll('.vx2-nav a[href^="#"]')];
    const magneticLinks = [...root.querySelectorAll(".vx2-nav-cta,.vx2-signin,.vx2-access a")];
    let scrollFrame = 0;
    const updateScroll = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight;
      root.style.setProperty("--vx-scroll", available > 0 ? window.scrollY / available : 0);
      header?.classList.toggle("is-scrolled", window.scrollY > 36);
      if (!reduceMotion) parallaxVisuals.forEach((visual) => {
        const rect = visual.getBoundingClientRect();
        const distance = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
        visual.style.setProperty("--vx-parallax-y", `${Math.max(-22, Math.min(22, distance * -18))}px`);
      });
      scrollFrame = 0;
    };
    const requestScrollUpdate = () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
    };
    const updatePointer = (event) => {
      if (!heroVisual || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const rect = heroVisual.getBoundingClientRect();
      heroVisual.style.setProperty("--vx-pointer-x", `${((event.clientX - rect.left) / rect.width - .5) * 6}px`);
      heroVisual.style.setProperty("--vx-pointer-y", `${((event.clientY - rect.top) / rect.height - .5) * 6}px`);
    };

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || !entry.target.id) return;
        navLinks.forEach((link) => link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`));
      });
    }, { rootMargin: "-38% 0px -54% 0px", threshold: 0 });
    [...root.querySelectorAll("section[id]")].forEach((section) => sectionObserver.observe(section));

    const magneticHandlers = magneticLinks.map((link) => {
      const move = (event) => {
        if (reduceMotion) return;
        const rect = link.getBoundingClientRect();
        link.style.setProperty("--vx-magnet-x", `${(event.clientX - rect.left - rect.width / 2) * .12}px`);
        link.style.setProperty("--vx-magnet-y", `${(event.clientY - rect.top - rect.height / 2) * .12}px`);
      };
      const leave = () => {
        link.style.setProperty("--vx-magnet-x", "0px");
        link.style.setProperty("--vx-magnet-y", "0px");
      };
      link.addEventListener("pointermove", move, { passive: true });
      link.addEventListener("pointerleave", leave, { passive: true });
      return { link, move, leave };
    });

    window.addEventListener("scroll", requestScrollUpdate, { passive: true });
    heroVisual?.addEventListener("pointermove", updatePointer, { passive: true });
    requestAnimationFrame(() => {
      root.classList.add("vx-motion-ready");
      updateScroll();
    });

    return () => {
      observer.disconnect();
      sectionObserver.disconnect();
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      window.removeEventListener("scroll", requestScrollUpdate);
      heroVisual?.removeEventListener("pointermove", updatePointer);
      magneticHandlers.forEach(({link,move,leave}) => {
        link.removeEventListener("pointermove", move);
        link.removeEventListener("pointerleave", leave);
      });
    };
  }, []);

  return <>
    <div className="vx-intro" aria-hidden="true"><img src="/selectoros-logo.png" alt=""/><i /></div>
    <div className="vx-scroll-progress" aria-hidden="true" />
    <div className="vx-signal" aria-hidden="true"><i/><b/><span/><span/><span/><span/></div>
  </>;
}
