"use client";

import Link from "next/link";
import "@/styles/vaxeron.css";

export default function HomePage() {

  return (
    <main className="vx-root">

      {/* AMBIENT */}
      <div className="vx-bg-glow vx-bg-glow-1" />
      <div className="vx-bg-glow vx-bg-glow-2" />
      <div className="vx-noise" />

      {/* NAVBAR */}
      <nav className="vx-nav">

        <div className="vx-logo-wrap">

          <div className="vx-logo-mark">
            V
          </div>

          <div>

            <div className="vx-logo-text">
              VAXERON
            </div>

            <div className="vx-logo-sub">
              by Vaxeron Technologies
            </div>

          </div>

        </div>

        <div className="vx-links">
          <span>Platform</span>
          <span>Products</span>
          <span>Solutions</span>
          <span>Experience</span>
          <span>Company</span>
        </div>

        <div className="vx-actions">

          <Link href="/sign-in" className="vx-login">
            Sign In
          </Link>

          <button className="vx-btn-primary">
            Get Early Access
          </button>

        </div>

      </nav>

      {/* HERO */}
      <section className="vx-hero">

        {/* LEFT */}
        <div className="vx-hero-left">

          <div className="vx-eyebrow">
            OPERATIONAL INFRASTRUCTURE FOR MODERN HOSPITALITY
          </div>

          <h1>
            Run your entire
            <br />
            hospitality operation
            <br />
            from one system.
          </h1>

          <p>
            VAXERON unifies menus, wine programmes,
            room service, guest experience, inventory,
            and operational infrastructure into one
            connected hospitality ecosystem.
          </p>

          <div className="vx-hero-actions">

            <button className="vx-btn-primary">
              Get Early Access
            </button>

            <button className="vx-btn-secondary">
              See How It Works
            </button>

          </div>

          <div className="vx-trust">

            <span>AMAN</span>
            <span>ROSEWOOD</span>
            <span>SIX SENSES</span>

          </div>

        </div>

        {/* RIGHT */}
        <div className="vx-hero-right">

          {/* MAIN IMAGE */}
          <div className="vx-hero-image">

            <div className="vx-image-overlay" />

            <div className="vx-image-content">

              <div className="vx-image-eyebrow">
                THE BURMAN
              </div>

              <h2>
                Extraordinary
                <br />
                living.
              </h2>

            </div>

          </div>

          {/* FLOATING DASHBOARD */}
          <div className="vx-dashboard-float">

            <div className="vx-dashboard-header">

              <div className="vx-dashboard-dots">
                <span />
                <span />
                <span />
              </div>

              <div className="vx-dashboard-label">
                Operations Overview
              </div>

            </div>

            <div className="vx-dashboard-body">

              <div className="vx-stat-row">

                <div className="vx-stat-box">
                  <small>Revenue</small>
                  <h3>€248K</h3>
                </div>

                <div className="vx-stat-box">
                  <small>Occupancy</small>
                  <h3>92%</h3>
                </div>

              </div>

              <div className="vx-chart" />

              <div className="vx-mini-grid">

                <div className="vx-mini-card" />
                <div className="vx-mini-card" />
                <div className="vx-mini-card" />
                <div className="vx-mini-card" />

              </div>

            </div>

          </div>

          {/* FLOATING PHONE */}
          <div className="vx-phone-float">

            <div className="vx-phone-screen">

              <div className="vx-phone-top">
                In-Room Dining
              </div>

              <div className="vx-phone-image" />

              <div className="vx-phone-menu">

                <div className="vx-phone-item">
                  <span>Salmon Donburi</span>
                  <span>€35</span>
                </div>

                <div className="vx-phone-item">
                  <span>Bluefin Tuna</span>
                  <span>€45</span>
                </div>

                <div className="vx-phone-item">
                  <span>Black Truffle</span>
                  <span>€18</span>
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* HOW IT WORKS */}
      <section className="vx-how-section">

        <div className="vx-how-top">

          <div className="vx-eyebrow">
            CENTRALIZED OPERATIONS
          </div>

          <h2>
            Built for operators,
            <br />
            not just teams.
          </h2>

        </div>

        <div className="vx-how-grid">

          <div className="vx-how-card">

            <h3>Centralized Control</h3>

            <p>
              Menus, pricing, experiences, wine programmes,
              and hospitality infrastructure managed from
              one connected ecosystem.
            </p>

          </div>

          <div className="vx-how-card">

            <h3>Real-Time Updates</h3>

            <p>
              Operational updates instantly reflected
              across every guest-facing environment
              and service layer.
            </p>

          </div>

          <div className="vx-how-card">

            <h3>Operational Precision</h3>

            <p>
              Built for hospitality groups where
              execution, consistency, atmosphere,
              and structure matter.
            </p>

          </div>

        </div>

      </section>

      {/* PLATFORM MODULES */}
      <section className="vx-modules-section">

        <div className="vx-modules-top">

          <div className="vx-eyebrow">
            THE VAXERON ECOSYSTEM
          </div>

          <h2>
            Modular infrastructure
            <br />
            for modern hospitality.
          </h2>

          <p>
            A connected hospitality ecosystem designed
            to scale across boutique hotels, fine dining,
            resorts, and multi-venue hospitality operations.
          </p>

        </div>

        <div className="vx-modules-grid">

          <div className="vx-module-card" data-accent="core">

            <div className="vx-module-label">
              CORE PLATFORM
            </div>

            <h3>
              VAXERON
              <br />
              Core
            </h3>

            <p>
              Central operational infrastructure connecting
              menus, experiences, venues, analytics,
              and hospitality execution.
            </p>

          </div>

          <div className="vx-module-card" data-accent="guest">

            <div className="vx-module-label">
              GUEST EXPERIENCE
            </div>

            <h3>
              VAXERON
              <br />
              Guest
            </h3>

            <p>
              Elevated digital hospitality journeys
              for dining, room service, QR menus,
              spa experiences, and guest interaction.
            </p>

          </div>

          <div className="vx-module-card" data-accent="cellar">

            <div className="vx-module-label">
              WINE OPERATIONS
            </div>

            <h3>
              VAXERON
              <br />
              Cellar
            </h3>

            <p>
              Wine inventory, cellar visibility,
              allocations, stock movement,
              and curated wine programme management.
            </p>

          </div>

          <div className="vx-module-card" data-accent="ops">

            <div className="vx-module-label">
              OPERATIONAL LAYER
            </div>

            <h3>
              VAXERON
              <br />
              Ops
            </h3>

            <p>
              Operational oversight for hospitality groups,
              analytics, venue coordination,
              execution, and reporting systems.
            </p>

          </div>

        </div>

      </section>

      {/* ECOSYSTEM SPLIT */}
      <section className="vx-ecosystem-split">

        {/* LEFT */}
        <div className="vx-ecosystem-guest">

          <div className="vx-eyebrow">
            GUEST EXPERIENCE
          </div>

          <h2>
            Designed for
            atmosphere,
            emotion,
            and service.
          </h2>

          <p>
            Curated hospitality interfaces designed for
            luxury hotels, destination dining, spas,
            wine programmes, and refined guest journeys.
          </p>

          <div className="vx-guest-grid">

            <div className="vx-guest-card">
              <div className="vx-guest-image dining" />
              <span>Dining Experiences</span>
            </div>

            <div className="vx-guest-card">
              <div className="vx-guest-image spa" />
              <span>Spa Journeys</span>
            </div>

            <div className="vx-guest-card">
              <div className="vx-guest-image room" />
              <span>Room Service</span>
            </div>

            <div className="vx-guest-card">
              <div className="vx-guest-image wine" />
              <span>Wine Programmes</span>
            </div>

          </div>

        </div>

        {/* RIGHT */}
        <div className="vx-ecosystem-ops">

          <div className="vx-eyebrow">
            OPERATIONS INFRASTRUCTURE
          </div>

          <h2>
            Operational clarity
            across every venue.
          </h2>

          <p>
            Inventory, analytics, cellar management,
            menus, experiences, and multi-property operations —
            unified into one operational layer.
          </p>

          <div className="vx-ops-panel">

            <div className="vx-ops-top">

              <div className="vx-ops-stat">
                <small>Properties</small>
                <h3>12</h3>
              </div>

              <div className="vx-ops-stat">
                <small>Venues</small>
                <h3>48</h3>
              </div>

            </div>

            <div className="vx-ops-chart" />

            <div className="vx-ops-list">

              <div className="vx-ops-item">
                <span>Wine Cellar</span>
                <span>Optimal</span>
              </div>

              <div className="vx-ops-item">
                <span>Menu Infrastructure</span>
                <span>Live</span>
              </div>

              <div className="vx-ops-item">
                <span>Room Service</span>
                <span>Connected</span>
              </div>

              <div className="vx-ops-item">
                <span>Inventory Sync</span>
                <span>92%</span>
              </div>

            </div>

          </div>

        </div>

      </section>

      {/* EXPERIENCE GRID */}
      <section className="vx-grid-section">

        <div className="vx-grid-card large">

          <div className="vx-card-image dining" />

          <div className="vx-card-content">

            <div className="vx-eyebrow">
              GUEST EXPERIENCE
            </div>

            <h3>
              Hospitality interfaces
              designed with atmosphere.
            </h3>

            <p>
              Editorial guest journeys inspired by
              luxury hospitality, elevated service,
              and refined digital presentation.
            </p>

          </div>

        </div>

        <div className="vx-grid-stack">

          <div className="vx-grid-card small">

            <div className="vx-card-image spa" />

            <div className="vx-card-content">

              <div className="vx-eyebrow">
                SPA
              </div>

              <h3>
                Quiet luxury,
                digitally expressed.
              </h3>

            </div>

          </div>

          <div className="vx-grid-card small">

            <div className="vx-card-image wine" />

            <div className="vx-card-content">

              <div className="vx-eyebrow">
                WINE
              </div>

              <h3>
                Cellar management
                with operational precision.
              </h3>

            </div>

          </div>

        </div>

      </section>

      {/* WINE INFRASTRUCTURE */}
      <section className="vx-showcase">

        <div className="vx-showcase-top">

          <div>

            <div className="vx-eyebrow">
              WINE INFRASTRUCTURE
            </div>

            <h2 className="vx-showcase-title">
              Cellar management
              <br />
              designed for
              <br />
              modern hospitality.
            </h2>

          </div>

          <div className="vx-showcase-copy">

            <p>
              From curated wine programmes to multi-location inventory
              visibility, VAXERON provides hospitality teams with
              operational clarity across every bottle, producer,
              allocation, and service environment.
            </p>

            <p>
              Built for boutique hotels, fine dining restaurants,
              omakase concepts, and premium hospitality groups.
            </p>

          </div>

        </div>

        <div className="vx-showcase-frame">

          <div className="vx-showcase-glow" />

          <img
            src="/wine-showcase.png"
            alt="VAXERON Wine Cellar"
            className="vx-showcase-image"
          />

        </div>

      </section>

      {/* TRUST METRICS */}
      <section className="vx-trust-section">

        <div className="vx-trust-top">

          <div className="vx-eyebrow">
            TRUSTED INFRASTRUCTURE
          </div>

          <h2>
            Built for modern
            hospitality operators.
          </h2>

        </div>

        <div className="vx-trust-grid">

          <div className="vx-trust-card">

            <h3>12+</h3>

            <p>
              Luxury properties and hospitality concepts
              operating within the ecosystem.
            </p>

          </div>

          <div className="vx-trust-card">

            <h3>48</h3>

            <p>
              Active restaurants, guest experiences,
              and operational venues managed.
            </p>

          </div>

          <div className="vx-trust-card">

            <h3>€18M+</h3>

            <p>
              Combined operational inventory and
              hospitality asset visibility.
            </p>

          </div>

          <div className="vx-trust-card">

            <h3>24/7</h3>

            <p>
              Unified infrastructure supporting
              service execution across properties.
            </p>

          </div>

        </div>

      </section>

      {/* CTA */}
      <section className="vx-cta">

        <div className="vx-eyebrow">
          BUILT FOR OPERATORS WHO DEMAND CONTROL
        </div>

        <h2>
          Operational elegance
          for modern hospitality.
        </h2>

        <p>
          Designed for hospitality teams where atmosphere,
          execution, operational visibility, and guest experience
          matter equally.
        </p>

        <div className="vx-hero-actions">

          <button className="vx-btn-primary">
            Get Early Access
          </button>

          <button className="vx-btn-secondary">
            See How It Works
          </button>

        </div>

      </section>

    </main>
  );
}