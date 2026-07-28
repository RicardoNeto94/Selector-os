"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "@/styles/vaxeron-home.css";

const NAV_ITEMS = [
  { label: "Platform", href: "/product" },
  { label: "Products", href: "/product" },
  { label: "Solutions", href: "/solutions" },
  { label: "Experience", href: "/customers" },
  { label: "Company", href: "/company" },
];

const PLATFORM_PILLARS = [
  {
    number: "01",
    title: "Core",
    copy: "Foundational data, content, and operational structure.",
  },
  {
    number: "02",
    title: "Guest",
    copy: "Beautiful experiences across dining, spa, in-room, and more.",
  },
  {
    number: "03",
    title: "Cellar",
    copy: "Wine programmes, inventory, cellar operations, and movement.",
  },
  {
    number: "04",
    title: "Operations",
    copy: "Inventory, workflows, venues, reporting, and execution.",
  },
];

const FOOTER_GROUPS = [
  {
    title: "Platform",
    links: [
      { label: "Core", href: "/product#core" },
      { label: "Guest", href: "/product#guest" },
      { label: "Cellar", href: "/product#cellar" },
      { label: "Operations", href: "/product#operations" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Hotels & Resorts", href: "/solutions/hotels" },
      { label: "Restaurants", href: "/solutions/restaurants" },
      { label: "Private Clubs", href: "/solutions/private-clubs" },
      { label: "Spas & Wellness", href: "/solutions/wellness" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Case Studies", href: "/resources/case-studies" },
      { label: "Blog", href: "/resources/blog" },
      { label: "Documentation", href: "/resources/documentation" },
      { label: "Support", href: "/support" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/company" },
      { label: "Careers", href: "/company/careers" },
      { label: "Partners", href: "/company/partners" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const targets = document.querySelectorAll(".vx-reveal");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((target) => target.classList.add("is-in"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.14 }
    );

    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, []);

  return (
    <main className="vx-root">
      <header className={`vx-site-header${scrolled ? " is-scrolled" : ""}`}>
        <div className="vx-header-inner">
          <Link href="/" className="vx-brand" aria-label="VAXERON home">
            <span className="vx-brand-mark" aria-hidden="true">
              V
            </span>

            <span className="vx-brand-copy">
              <span className="vx-brand-name">VAXERON</span>
              <span className="vx-brand-sub">by Vaxeron Technologies</span>
            </span>
          </Link>

          <nav className="vx-main-nav" aria-label="Primary navigation">
            {NAV_ITEMS.map((item) => (
              <Link key={item.label} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>

          <Link href="/contact" className="vx-header-cta">
            Request access
          </Link>
        </div>
      </header>

      <section className="vx-home-hero" aria-labelledby="vx-home-hero-title">
        <div className="vx-home-hero-copy vx-reveal">
          <p className="vx-kicker">
            Operational infrastructure
            <br />
            for modern hospitality
          </p>

          <h1 id="vx-home-hero-title">
            The operating system
            <br />
            behind exceptional
            <br />
            hospitality.
          </h1>

          <p className="vx-home-hero-lead">
            Connect guest experience, operational content, wine programmes,
            inventory, and venue workflows in one considered platform.
          </p>

          <div className="vx-home-hero-actions">
            <Link href="/contact" className="vx-button vx-button-primary">
              Request early access
            </Link>

            <Link href="/product" className="vx-text-link">
              See how it works
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className="vx-home-hero-visual vx-reveal">
          <div className="vx-home-hero-backdrop" aria-hidden="true" />

          <div className="vx-device-shell">
            <div className="vx-device-bar">
              <span>VAXERON</span>
              <span>Overview</span>
            </div>

            <img
              src="/menu-dashboard.jpg"
              alt="VAXERON operations dashboard"
              className="vx-device-image"
            />
          </div>
        </div>
      </section>

      <section
        className="vx-pillars-section"
        aria-labelledby="vx-pillars-title"
      >
        <div className="vx-pillars-heading vx-reveal">
          <p className="vx-kicker" id="vx-pillars-title">
            One platform. Four pillars.
          </p>
        </div>

        <div className="vx-pillars-grid">
          {PLATFORM_PILLARS.map((pillar) => (
            <article className="vx-pillar" key={pillar.number}>
              <span className="vx-pillar-number">{pillar.number}</span>
              <h2>{pillar.title}</h2>
              <p>{pillar.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="vx-product-section"
        aria-labelledby="vx-product-title"
      >
        <div className="vx-product-media vx-reveal">
          <div className="vx-product-window">
            <img
              src="/wine-showcase.png"
              alt="VAXERON wine portfolio and cellar management interface"
            />
          </div>
        </div>

        <div className="vx-product-copy vx-reveal">
          <p className="vx-kicker">Platform in action</p>

          <h2 id="vx-product-title">
            Purpose-built tools
            <br />
            for every part of
            <br />
            your operation.
          </h2>

          <p>
            Live data, operational clarity, and connected workflows give teams
            the structure to deliver at the highest level.
          </p>

          <Link href="/product" className="vx-text-link">
            Explore the platform
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="vx-dual-section" aria-label="Guest and operations">
        <article className="vx-dual-panel vx-dual-guest">
          <div className="vx-dual-copy">
            <p className="vx-kicker">
              Presented beautifully
              <br />
              to the guest
            </p>

            <h2>Every experience, seamlessly connected.</h2>

            <p>
              Dining, wellness, in-room service, and wine presented through one
              coherent guest journey.
            </p>

            <Link href="/product#guest" className="vx-text-link">
              Explore guest experience
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="vx-dual-media vx-dual-phone">
            <img
              src="/homepage/room-service.png"
              alt="VAXERON in-room dining guest experience"
            />
          </div>
        </article>

        <article className="vx-dual-panel vx-dual-ops">
          <div className="vx-dual-copy">
            <p className="vx-kicker">
              Managed clearly
              <br />
              by the operation
            </p>

            <h2>Control every detail from one place.</h2>

            <p>
              Content, inventory, movements, venues, and workflows unified in
              one operational environment.
            </p>

            <Link href="/product#operations" className="vx-text-link">
              Explore operations
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="vx-dual-media vx-dual-laptop">
            <img
              src="/menu-dashboard.jpg"
              alt="VAXERON operations and inventory interface"
            />
          </div>
        </article>
      </section>

      <section className="vx-origin-section">
        <div className="vx-origin-inner vx-reveal">
          <div>
            <p className="vx-kicker">Built inside hospitality</p>
            <h2>Built inside hospitality, for hospitality.</h2>
          </div>

          <p>
            VAXERON is shaped by real operational experience and designed around
            the complexity of modern hospitality. Every module exists to give
            teams more clarity while preserving the human character of
            exceptional service.
          </p>
        </div>
      </section>

      <section className="vx-final-cta">
        <div className="vx-final-cta-inner">
          <span className="vx-final-mark" aria-hidden="true">
            V
          </span>

          <h2>Bring your operation into one connected system.</h2>

          <Link href="/contact" className="vx-button vx-button-primary">
            Request early access
          </Link>
        </div>
      </section>

      <footer className="vx-footer">
        <div className="vx-footer-grid">
          <div className="vx-footer-brand">
            <Link href="/" className="vx-brand" aria-label="VAXERON home">
              <span className="vx-brand-copy">
                <span className="vx-brand-name">VAXERON</span>
                <span className="vx-brand-sub">by Vaxeron Technologies</span>
              </span>
            </Link>

            <p>
              The operating system for modern hospitality, unifying guest
              experience and operational control.
            </p>

            <div className="vx-footer-social">
              <a href="#" aria-label="LinkedIn">
                in
              </a>
              <a href="#" aria-label="Instagram">
                ig
              </a>
              <a href="mailto:hello@vaxeron.com" aria-label="Email VAXERON">
                mail
              </a>
            </div>
          </div>

          {FOOTER_GROUPS.map((group) => (
            <div className="vx-footer-column" key={group.title}>
              <h3>{group.title}</h3>

              {group.links.map((link) => (
                <Link href={link.href} key={link.label}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}

          <div className="vx-footer-legal">
            <p>© 2026 Vaxeron Technologies. All rights reserved.</p>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}