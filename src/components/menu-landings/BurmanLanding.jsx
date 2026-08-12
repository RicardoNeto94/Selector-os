"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import "@/styles/burman.css";

import BurmanWeather from "@/components/BurmanWeather";
import BurmanPillowMenu from "@/components/BurmanPillowMenu";
import BurmanDiningWine from "@/components/BurmanDiningWine";
export default function BurmanLanding({ menu }) {
  const supabase = createClient();
  const base = `/menu/${menu?.public_slug}`;
  const [roomTab, setRoomTab] = useState("snacks");

  const [experiences, setExperiences] = useState([]);
  const [openSpa, setOpenSpa] = useState(false);
  const [openSpaInfo, setOpenSpaInfo] = useState(false);
  const [openRoomService, setOpenRoomService] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openSection, setOpenSection] = useState(null);
  const [openDining, setOpenDining] = useState(false);
  const [openDiningVenue, setOpenDiningVenue] = useState(null);
  const [selectedDining, setSelectedDining] = useState(null);
  const [diningTab, setDiningTab] = useState("overview");
  const [spaTab, setSpaTab] = useState("overview");
  const roomServiceExp = experiences.find((exp) => exp.type === "room_service");

  useEffect(() => {
    if (experiences.length && !selectedDining) {
      const firstDining = experiences.find(
        (exp) => exp.type?.toLowerCase() === "dining",
      );
      if (firstDining) {
        setSelectedDining(firstDining.id);
      }
    }
  }, [experiences]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [pricesMap, setPricesMap] = useState({});
  const [pwaRefreshVersion, setPwaRefreshVersion] = useState(null);

  // ================= REMOTE PWA REFRESH =================
  useEffect(() => {
    let cancelled = false;

    async function syncRefreshVersion() {
      const { data, error } = await supabase
        .from("pwa_refresh_signals")
        .select("version")
        .eq("channel", "burman_room_pwa")
        .maybeSingle();

      if (error) {
        console.error("PWA REFRESH VERSION ERROR:", error);
        return;
      }

      if (
        !cancelled &&
        data?.version !== null &&
        data?.version !== undefined
      ) {
        setPwaRefreshVersion((currentVersion) => {
          const nextVersion = Number(data.version);

          if (currentVersion === null) {
            return nextVersion;
          }

          return nextVersion !== currentVersion
            ? nextVersion
            : currentVersion;
        });
      }
    }

    syncRefreshVersion();

    const refreshChannel = supabase
      .channel("burman-room-pwa-refresh")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pwa_refresh_signals",
          filter: "channel=eq.burman_room_pwa",
        },
        (payload) => {
          const nextVersion = Number(payload.new?.version);

          if (Number.isFinite(nextVersion)) {
            setPwaRefreshVersion(nextVersion);
          }
        },
      )
      .subscribe();

    const refreshInterval = window.setInterval(() => {
      syncRefreshVersion();
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncRefreshVersion();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
      supabase.removeChannel(refreshChannel);
    };
  }, []);

  // ================= DEPLOYMENT AUTO-UPDATE =================
  // Once this version is installed on an iPad, future production deployments
  // are detected automatically and the PWA reloads itself exactly once.
  useEffect(() => {
    let cancelled = false;
    let initialVersion = null;
    let reloading = false;

    async function checkDeploymentVersion() {
      try {
        const response = await fetch("/api/app-version", {
          method: "GET",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const nextVersion = String(data?.version || "").trim();

        if (!nextVersion || nextVersion === "local") {
          return;
        }

        if (initialVersion === null) {
          initialVersion = nextVersion;
          return;
        }

        if (
          !cancelled &&
          !reloading &&
          nextVersion !== initialVersion
        ) {
          reloading = true;

          // Persist the version only as a diagnostic breadcrumb.
          try {
            window.localStorage.setItem(
              "burman_deployment_version",
              nextVersion,
            );
          } catch {
            // Storage may be unavailable in some browser modes.
          }

          window.location.reload();
        }
      } catch (error) {
        console.error("DEPLOYMENT VERSION CHECK ERROR:", error);
      }
    }

    checkDeploymentVersion();

    const deploymentInterval = window.setInterval(() => {
      checkDeploymentVersion();
    }, 30000);

    const handleDeploymentVisibility = () => {
      if (document.visibilityState === "visible") {
        checkDeploymentVersion();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleDeploymentVisibility,
    );

    window.addEventListener(
      "pageshow",
      checkDeploymentVersion,
    );

    return () => {
      cancelled = true;
      window.clearInterval(deploymentInterval);
      document.removeEventListener(
        "visibilitychange",
        handleDeploymentVisibility,
      );
      window.removeEventListener(
        "pageshow",
        checkDeploymentVersion,
      );
    };
  }, []);

  useEffect(() => {
    if (!menu?.id) return;

    const loadData = async () => {
      const { data: cats = [] } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("menu_id", menu.id)
        .order("position");

      const { data: its = [] } = await supabase
        .from("menu_items")
        .select("*")
        .eq("menu_id", menu.id)
        .order("position");

      setCategories(cats);
      setItems(its);

      if (its.length) {
        const { data: prices = [] } = await supabase
          .from("menu_item_prices")
          .select("*")
          .in(
            "menu_item_id",
            its.map((i) => i.id),
          )
          .order("position");

        const grouped = {};
        prices.forEach((p) => {
          if (!grouped[p.menu_item_id]) grouped[p.menu_item_id] = [];
          grouped[p.menu_item_id].push(p);
        });

        setPricesMap(grouped);
      }
    };

    loadData();
  }, [menu, pwaRefreshVersion]);

  // ================= EXPERIENCES DATA =================
  useEffect(() => {
    const loadExperiences = async () => {
      const { data, error } = await supabase
        .from("experiences")
        .select(
          `
        id,
        name,
        type,
        image_url,
        schedule,
        footer,
        position,
        experience_sections (
          id,
          name,
          position,
          type,
          experience_items (
            id,
            name,
            description,
            position,
            experience_prices (
              id,
              price,
              label
            )
          )
        )
      `,
        )
        .order("position", { ascending: true });

      if (error) {
        console.error("EXPERIENCES ERROR:", error);
      } else {
        console.log("EXPERIENCES DATA:", data);
        setExperiences(data);
      }
    };

    // 🔥 ONLY RUN WHEN DINING OPENS
    if (openDining || openRoomService) {
      loadExperiences();
    }
  }, [openDining, openRoomService, pwaRefreshVersion]);

  // ================= SCROLL LOCK =================
  // ================= SCROLL LOCK =================
  useEffect(() => {
    const modalIsOpen =
      openDining || openSpa || openSpaInfo || openRoomService || menuOpen;

    if (modalIsOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [openDining, openSpa, openSpaInfo, openRoomService, menuOpen]);

  const toggleSection = (key) => {
    setOpenSection(openSection === key ? null : key);
  };

  return (
    <div className="burman-root">
      {/* EVERYTHING BELOW REMAINS EXACTLY THE SAME */}
      {/* I DID NOT TOUCH YOUR UI */}

      {/* ========================= HOME ========================= */}

      <div className="vx-home">
        <div className="vx-container">
          <header className="vx-header">
            <div className="vx-header-left">HOTEL</div>

            <div className="vx-header-center">THE BURMAN</div>

            <div className="vx-header-right">TALLINN</div>
          </header>
          <section className="vx-hero">
            <img
              src="https://theburmanhotel.com/wp-content/webp-express/webp-images/uploads/2025/05/Hero-1920x1440.jpg.webp"
              alt="The Burman"
              className="vx-hero-image"
            />

            <div className="vx-hero-gradient" />

            <div className="vx-weather-floating">
              <BurmanWeather />
            </div>

            <div className="vx-hero-content">
              <div className="vx-copy">
                <div className="vx-eyebrow">THE BURMAN · TALLINN</div>

                <h1>
                  Welcome to
                  <br />
                  The Burman
                </h1>

                <p>
                  Discover Michelin dining, refined wellness and exceptional
                  experiences designed around your stay.
                </p>
              </div>
            </div>

            <div className="vx-services">
              <button
                className="vx-service"
                onClick={() => setOpenDining(true)}
              >
                <img src="/homepage/dining.jpg" alt="Dining" />

                <span>MICHELIN SELECTED</span>

                <h3>Dining</h3>

                <p>Restaurants & Wine</p>
              </button>

              <button
                className="vx-service"
                onClick={() => setOpenRoomService(true)}
              >
                <img src="/homepage/room-service.png" alt="Room Service" />

                <span>24 HOURS</span>

                <h3>Room Delicacies</h3>

                <p>Curated Selections</p>
              </button>

              <button className="vx-service" onClick={() => setOpenSpa(true)}>
                <img src="/homepage/spa.jpg" alt="Spa" />

                <span>BURMAN SPA</span>

                <h3>Wellness</h3>

                <p>Spa & Treatments</p>
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* ROOM SERVICE MODAL */}
      {openRoomService && (
        <div className="burman-modal vx-room-modal">
          <div
            className="burman-modal-backdrop"
            onClick={() => {
              setOpenRoomService(false);
              setRoomTab("snacks");
            }}
          />

          <div className="burman-modal-content">
            <button
              className="burman-modal-close"
              onClick={() => {
                setOpenRoomService(false);
                setRoomTab("snacks");
              }}
              aria-label="Close room service"
            >
              ✕
            </button>

            <div className="vx-room-shell">
              {/* HERO */}
              <section className="vx-room-hero">
                <img src="/homepage/room-service.png" alt="Room Delicacies" />

                <div className="vx-room-hero-copy">
                  <span className="vx-room-kicker">THE BURMAN · IN ROOM</span>

                  <h2>Room Delicacies</h2>

                  <p>
                    Curated comforts, thoughtful details and refined in-room
                    selections designed around your stay.
                  </p>

                  <div className="vx-room-hero-meta">
                    <span>Available 24 hours</span>
                  </div>
                </div>
              </section>

              {/* TABS */}
              <nav
                className="vx-room-tabs"
                aria-label="Room delicacies sections"
              >
                {[
                  ["snacks", "Snacks"],
                  ["drinks", "Drinks"],
                  ["pillow", "Pillow Menu"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={
                      roomTab === key ? "vx-room-tab active" : "vx-room-tab"
                    }
                    onClick={() => setRoomTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              {/* CONTENT */}
              <div className="vx-room-body">
                {/* SNACKS / DRINKS / AMENITIES */}
                {["snacks", "drinks"].includes(roomTab) && (
                  <section className="vx-room-menu">
                    <div className="vx-room-menu-heading">
                      <span className="vx-room-section-label">
                        {roomTab === "snacks"
                          ? "IN ROOM DINING"
                          : roomTab === "drinks"
                            ? "REFRESHMENTS"
                            : "CURATED COMFORTS"}
                      </span>

                      <h3>
                        {roomTab === "snacks"
                          ? "Room Delicacies"
                          : roomTab === "drinks"
                            ? "Drinks"
                            : "Amenities"}
                      </h3>

                      <p>
                        {roomTab === "snacks"
                          ? "A considered selection designed to be enjoyed in the comfort and privacy of your room."
                          : roomTab === "drinks"
                            ? "Carefully selected refreshments for quiet moments, celebrations and everything in between."
                            : "Thoughtful details and additional comforts designed around your stay."}
                      </p>
                    </div>

                    {!roomServiceExp && (
                      <div className="vx-room-empty">
                        No room service available
                      </div>
                    )}

                    {roomServiceExp?.experience_sections
                      ?.filter(
                        (section) =>
                          section.type === roomTab &&
                          section.experience_items?.length,
                      )
                      ?.sort((a, b) => a.position - b.position)
                      .map((section) => (
                        <div key={section.id} className="vx-room-menu-section">
                          <h3>{section.name}</h3>

                          {section.experience_items
                            ?.sort((a, b) => a.position - b.position)
                            .map((item) => {
                              const price = item.experience_prices?.[0]?.price;

                              const label = item.experience_prices?.[0]?.label;

                              return (
                                <div
                                  key={item.id}
                                  className="vx-room-menu-item"
                                >
                                  <div>
                                    <h4>{item.name}</h4>

                                    {item.description && (
                                      <p>{item.description}</p>
                                    )}
                                  </div>

                                  {price && (
                                    <span className="vx-room-price">
                                      {label && <span>{label} — </span>}€{price}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      ))}

                    {roomServiceExp?.footer?.trim() && (
                      <div className="vx-room-disclaimer">
                        {roomServiceExp.footer}
                      </div>
                    )}
                  </section>
                )}

                {/* PILLOW MENU */}
                {roomTab === "pillow" && (
                  <section className="vx-room-pillow">
                    <div className="vx-room-menu-heading">
                      <span className="vx-room-section-label">
                        THE BURMAN SLEEP EXPERIENCE
                      </span>

                      <h3>Your rest, personalised.</h3>

                     
                    </div>

                    <BurmanPillowMenu />
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SPA MODAL */}
      {openSpa && (
        <div className="burman-modal vx-spa-modal">
          <div
            className="burman-modal-backdrop"
            onClick={() => {
              setOpenSpa(false);
              setSpaTab("overview");
            }}
          />

          <div className="burman-modal-content">
            <button
              className="burman-modal-close"
              onClick={() => {
                setOpenSpa(false);
                setSpaTab("overview");
              }}
              aria-label="Close spa"
            >
              ✕
            </button>

            <div className="vx-spa-shell">
              {/* HERO */}
              <section className="vx-spa-hero">
                <img src="/spa.jpg" alt="The Burman Spa" />

                <div className="vx-spa-hero-copy">
                  <span className="vx-spa-kicker">THE BURMAN · WELLNESS</span>

                  <h2>
                    An oasis of
                    <span> serenity.</span>
                  </h2>

                  <p>
                    A bespoke wellness journey designed around renewal,
                    tranquillity and personalised care.
                  </p>

                  <div className="vx-spa-hero-meta">
                    BIOLOGIQUE RECHERCHE · PARIS
                  </div>
                </div>

                <div className="vx-spa-request">
                  
                </div>
              </section>

              {/* TABS */}
              <nav className="vx-spa-tabs" aria-label="Spa sections">
                {[
                  ["overview", "Overview"],
                  ["treatments", "Treatments"],
                  ["summer", "Summer Offer"],
                  ["information", "Information"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={
                      spaTab === key ? "vx-spa-tab active" : "vx-spa-tab"
                    }
                    onClick={() => setSpaTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              {/* BODY */}
              <div className="vx-spa-body">
                {/* OVERVIEW */}
                {spaTab === "overview" && (
                  <section className="vx-spa-editorial-overview">
                    <div className="vx-spa-editorial-main">
                      <div className="vx-spa-editorial-intro">
                        <h3>
                          Wellness,
                          <br />
                          considered.
                        </h3>

                        <p>
                          The Burman Spa is an intimate sanctuary dedicated to
                          quiet contentment, personalised care and restorative
                          wellbeing.
                        </p>

                        <dl className="vx-spa-editorial-facts">
                          <div>
                            <dt>APPROACH</dt>
                            <dd>Personalised treatments</dd>
                          </div>

                          <div>
                            <dt>SKINCARE</dt>
                            <dd>Biologique Recherche · Paris</dd>
                          </div>

                          <div>
                            <dt>ATMOSPHERE</dt>
                            <dd>Quiet, intimate and restorative</dd>
                          </div>

                          <div>
                            <dt>RESERVATIONS</dt>
                            <dd>Advance booking recommended</dd>
                          </div>
                        </dl>
                      </div>

                      <div className="vx-spa-editorial-story">
                        <span className="vx-spa-editorial-mark">◇</span>

                        <span className="vx-spa-editorial-label">
                          A PERSONALISED PATH TO RENEWAL
                        </span>

                        <p className="vx-spa-editorial-lead">
                          Each experience is considered around the individual,
                          combining refined treatments, sensorial rejuvenation
                          and a deeply restorative atmosphere.
                        </p>

                        <p>
                          From bespoke facial rituals to moments of holistic
                          renewal, every detail is shaped to restore balance and
                          create a lasting sense of calm.
                        </p>

                        <button
                          type="button"
                          className="vx-spa-editorial-link"
                          onClick={() => setSpaTab("treatments")}
                        >
                          EXPLORE TREATMENTS →
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                {/* TREATMENTS */}
                {spaTab === "treatments" && (
                  <section className="vx-spa-treatments">
                    <div className="vx-spa-section-heading">
                      <span>SPA MENU</span>

                      <h3>Treatments</h3>

                      <p>
                        Explore our collection of considered wellness and beauty
                        rituals.
                      </p>
                    </div>

                    {categories.map((cat) => {
                      const catItems = items.filter(
                        (i) => i.category_id === cat.id,
                      );

                      if (!catItems.length) return null;

                      return (
                        <div key={cat.id} className="vx-spa-treatment-section">
                          <h3>{cat.name}</h3>

                          {catItems.map((item) => {
                            const prices = pricesMap[item.id] || [];

                            return (
                              <div key={item.id} className="vx-spa-treatment">
                                <div className="vx-spa-treatment-copy">
                                  <h4>{item.name}</h4>

                                  {item.description && (
                                    <p>{item.description}</p>
                                  )}
                                </div>

                                <div className="vx-spa-pricing">
                                  {prices.map((price) => (
                                    <div
                                      key={price.id}
                                      className="vx-spa-price"
                                    >
                                      <span>
                                        {price.label || price.duration}
                                      </span>

                                      <strong>€{price.price}</strong>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </section>
                )}

                {/* SUMMER OFFER */}
                {spaTab === "summer" && (
                  <section className="vx-spa-summer-offer">
                    <div className="vx-spa-summer-intro">
                      <span className="vx-spa-summer-kicker">
                        LIMITED TIME OFFER
                      </span>

                      <h3>
                        Summer Glow
                        <br />
                        Rituals
                      </h3>

                      <p className="vx-spa-summer-subtitle">
                        Massage, exfoliation &amp; full spa access
                      </p>

                      <div className="vx-spa-summer-divider">
                        <span />
                        <b>◇</b>
                        <span />
                      </div>

                      <p className="vx-spa-summer-copy">
                        Our seasonal rituals are designed to leave your skin
                        radiant, your body renewed and your mind completely at
                        ease.
                      </p>

                      <div className="vx-spa-summer-booking-note">
                        <svg
                          viewBox="0 0 48 48"
                          aria-hidden="true"
                          className="vx-spa-summer-note-icon"
                        >
                          <path d="M24 7c-4 6-9 10-16 12 5 2 8 5 10 10-1 5 0 9 6 13 6-4 7-8 6-13 2-5 5-8 10-10-7-2-12-6-16-12Z" />
                          <path d="M24 7v35M13 18c5 2 8 6 11 11M35 18c-5 2-8 6-11 11" />
                        </svg>

                        <p>
                          Please book through
                          <br />
                          hotel or spa reception.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="vx-spa-summer-cta"
                        onClick={() =>
                          alert(
                            "Please contact Reception, Extension 800, to book your spa treatment.",
                          )
                        }
                      >
                        <span aria-hidden="true">⌂</span>
                        CONTACT RECEPTION
                      </button>
                    </div>

                    <div className="vx-spa-summer-options">
                      <article className="vx-spa-summer-card">
                        <div className="vx-spa-summer-ritual-icon">
                          <svg viewBox="0 0 72 72" aria-hidden="true">
                            <path d="M26 17c0-8 5-13 11-13 7 0 12 6 12 13 0 4-2 7-5 10v7c7 2 13 6 17 12M37 33v12M48 31c-3 3-7 5-11 5s-8-2-11-5M24 34c-7 2-13 6-17 12M20 44c2 7 2 13 0 20M54 44c-2 7-2 13 0 20M13 50c7 2 12 7 15 14M61 50c-7 2-12 7-15 14" />
                          </svg>
                        </div>

                        <h4>Upper Body Ritual</h4>
                        <p>
                          Back, décolletage,
                          <br />
                          head &amp; neck
                        </p>

                        <div className="vx-spa-summer-card-rule" />

                        <span className="vx-spa-summer-duration">
                          ◷ &nbsp;45 MINUTES
                        </span>

                        <div className="vx-spa-summer-card-rule" />

                        <strong>€100</strong>
                      </article>

                      <article className="vx-spa-summer-card">
                        <div className="vx-spa-summer-ritual-icon">
                          <svg viewBox="0 0 72 72" aria-hidden="true">
                            <path d="M44 8c-5 11-9 20-12 29-3 8-7 14-13 18-4 3-6 6-5 9 2 4 8 4 14 1 8-4 14-9 18-16M50 11c-2 11-2 22-1 31 1 8 5 13 11 17 4 2 5 5 4 7-2 4-7 3-12 0-7-4-12-9-15-15M16 48c-5-1-9 0-12 3M59 50c4-1 7 0 10 3" />
                          </svg>
                        </div>

                        <h4>Lower Body Ritual</h4>
                        <p>
                          Legs &amp; feet
                          <br />
                          &nbsp;
                        </p>

                        <div className="vx-spa-summer-card-rule" />

                        <span className="vx-spa-summer-duration">
                          ◷ &nbsp;45 MINUTES
                        </span>

                        <div className="vx-spa-summer-card-rule" />

                        <strong>€100</strong>
                      </article>

                      <article className="vx-spa-summer-bundle">
                        <span className="vx-spa-summer-ribbon">BEST VALUE</span>

                        <div className="vx-spa-summer-bundle-mark" aria-hidden="true">
                          ◇
                        </div>

                        <div className="vx-spa-summer-bundle-copy">
                          <h4>Both Rituals</h4>
                          <p>UPPER &amp; LOWER BODY</p>
                        </div>

                        <div className="vx-spa-summer-bundle-meta">
                          <span>◷ &nbsp;90 MINUTES</span>
                          <strong>€180</strong>
                        </div>
                      </article>
                    </div>
                  </section>
                )}

                {/* INFORMATION */}
                {spaTab === "information" && (
                  <section className="vx-spa-information">
                    <div className="vx-spa-section-heading">
                      <span>YOUR VISIT</span>

                      <h3>Spa information</h3>

                      <p>
                        Everything you need to know before your Burman Spa
                        experience.
                      </p>
                    </div>

                    <div className="vx-spa-info-grid">
                      <article className="vx-spa-info-card">
                        <span>01</span>

                        <h4>Opening Hours</h4>

                        <div className="vx-spa-info-row">
  <span>Spa Facilities</span>
  <strong>08:00 — 21:00</strong>
</div>

<div className="vx-spa-info-row">
  <span>Treatments</span>
  <strong>Mon–Thu · 15:00 — 20:00</strong>
</div>

<div className="vx-spa-info-row">
  <span></span>
  <strong>Fri–Sun · 10:00 — 20:00</strong>
</div>
                      </article>

                      <article className="vx-spa-info-card">
                        <span>02</span>

                        <h4>External Guests</h4>

                        <p>
                          Spa access is available for €100 per person, subject
                          to availability.
                        </p>

                        <p>
                          Treatment reservations include complimentary spa
                          facility access.
                        </p>
                      </article>

                      <article className="vx-spa-info-card">
                        <span>03</span>

                        <h4>Wellness Etiquette</h4>

                        <p>
                          To preserve the atmosphere of tranquillity, we kindly
                          invite guests to enjoy a digital detox.
                        </p>

                        <p>
                          Bathing attire is required within wellness and thermal
                          facilities.
                        </p>
                      </article>

                      <article className="vx-spa-info-card">
                        <span>04</span>

                        <h4>Appointments</h4>

                        <p>
                          We recommend arriving 15 minutes before your
                          treatment.
                        </p>

                        <p>
                          Advance reservations are recommended for preferred
                          availability.
                        </p>
                      </article>

                      <article className="vx-spa-info-card">
                        <span>05</span>

                        <h4>Cancellation Policy</h4>

                        <p>
                          Treatments cancelled within 24 hours will incur the
                          full treatment fee.
                        </p>
                      </article>

                      <article className="vx-spa-info-card">
                        <span>06</span>

                        <h4>Health & Wellness</h4>

                        <p>
                          Please inform your therapist of any medical
                          conditions, pregnancy or ongoing treatments before
                          your visit.
                        </p>
                      </article>
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SPA INFO MODAL */}
      {openSpaInfo && (
        <div className="burman-modal">
          <div
            className="burman-modal-backdrop"
            onClick={() => setOpenSpaInfo(false)}
          />

          <div className="burman-modal-content burman-spa-info-modal">
            <button
              className="burman-modal-close"
              onClick={() => setOpenSpaInfo(false)}
            >
              ✕
            </button>

            <div
              className="burman-modal-title"
              style={{
                marginBottom: "50px",
                textAlign: "center",
              }}
            >
              <h2 className="burman-heading">
                <span className="line-top">WELLNESS</span>

                <span className="line-bottom">INFORMATION</span>
              </h2>
            </div>

            <div className="burman-modal-body">
              <div className="burman-spa-info-grid">
                <div className="burman-spa-info-card">
                  <h4>Opening Hours</h4>

                  <div className="burman-info-row">
                    <span>Spa Facilities</span>
                    <span>08AM — 9PM</span>
                  </div>

                  <div className="burman-info-row">
                    <span>Treatments</span>
                    <span>Monday - Thursday 3PM — 8PM / </span>
                    <span>Friday - Sunday 10AM — 8PM</span>
                  </div>
                </div>

                <div className="burman-spa-info-card">
                  <h4>External Guests</h4>

                  <p>
                    External guests may access the spa facilities for €100 per
                    person, subject to availability.
                  </p>

                  <p>
                    Guests booking a treatment receive complimentary access to
                    all spa facilities.
                  </p>
                </div>

                <div className="burman-spa-info-card">
                  <h4>Wellness Etiquette</h4>

                  <p>
                    To preserve the atmosphere of tranquillity, guests are
                    kindly requested to maintain a digital detox within the spa
                    environment.
                  </p>

                  <p>
                    Bathing attire is required within all thermal and wellness
                    facilities.
                  </p>
                </div>

                <div className="burman-spa-info-card">
                  <h4>Appointments</h4>

                  <p>
                    We recommend arriving at least 15 minutes prior to your
                    treatment.
                  </p>

                  <p>
                    Advance booking is highly recommended to ensure preferred
                    availability.
                  </p>
                </div>

                <div className="burman-spa-info-card">
                  <h4>Cancellation Policy</h4>

                  <p>
                    Treatments cancelled within 24 hours will incur the full
                    treatment fee.
                  </p>
                </div>

                <div className="burman-spa-info-card">
                  <h4>Health & Wellness</h4>

                  <p>
                    Please inform your therapist of any medical conditions,
                    pregnancy, or ongoing treatments prior to arrival.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DINING MODAL */}
      {openDining && (
        <div className="burman-modal vx-dining-modal">
          <div
            className="burman-modal-backdrop"
            onClick={() => {
              setOpenDining(false);
              setOpenDiningVenue(null);
              setDiningTab("overview");
            }}
          />

          <div className="burman-modal-content">
            <button
              className="burman-modal-close"
              onClick={() => {
                setOpenDining(false);
                setOpenDiningVenue(null);
                setDiningTab("overview");
              }}
              aria-label="Close dining"
            >
              ✕
            </button>

            <div className="vx-dining-shell">
              {!openDiningVenue ? (
                <div className="vx-dining-discovery">
                  <section className="vx-dining-discovery-copy">
                    <span className="vx-dining-kicker">MICHELIN SELECTED</span>

                    <h2>
                      Exceptional
                      <br />
                      culinary experiences
                    </h2>

                    <p>
                      Discover our collection of distinctive restaurants, each
                      with its own character, cuisine and atmosphere.
                    </p>

                    <div className="vx-dining-assistance">
                      <span aria-hidden="true">⌂</span>
                      <p>
                        For reservations or assistance, please contact
                        <strong> Reception, Extension 800</strong>.
                      </p>
                    </div>
                  </section>

                  <section className="vx-dining-venues">
                    {experiences
                      .filter((exp) => exp.type?.toLowerCase() === "dining")
                      .sort((a, b) => a.position - b.position)
                      .map((exp) => {
                        const image =
                          exp.image_url && exp.image_url.startsWith("http")
                            ? exp.image_url
                            : exp.name?.toLowerCase().includes("koyo")
                              ? "/koyo.jpg"
                              : exp.name?.toLowerCase().includes("shang")
                                ? "/shang.jpg"
                                : exp.name?.toLowerCase().includes("lumen")
                                  ? "/lumen1.jpg"
                                  : "/placeholder.jpg";

                        const venueName = exp.name?.toLowerCase() || "";

                        const cuisine = venueName.includes("koyo")
                          ? "OMAKASE"
                          : venueName.includes("shang")
                            ? "CANTONESE CUISINE"
                            : venueName.includes("lumen")
                              ? "ALL DAY DINING"
                              : "DINING EXPERIENCE";

                        return (
                          <button
                            key={exp.id}
                            className="vx-dining-venue"
                            onClick={() => {
                              setSelectedDining(exp.id);
                              setDiningTab("overview");
                              setOpenDiningVenue(exp.id);
                            }}
                          >
                            <img src={image} alt={exp.name} />

                            <div className="vx-dining-venue-copy">
                              <small>{cuisine}</small>
                              <h4>{exp.name}</h4>

                              {exp.schedule && <p>{exp.schedule}</p>}

                              <span className="vx-dining-explore">
                                Explore <span aria-hidden="true">→</span>
                              </span>
                            </div>
                          </button>
                        );
                      })}
                  </section>
                </div>
              ) : (
                experiences
                  .filter(
                    (exp) =>
                      exp.type?.toLowerCase() === "dining" &&
                      exp.id === openDiningVenue,
                  )
                  .map((exp) => {
                    const image =
                      exp.image_url && exp.image_url.startsWith("http")
                        ? exp.image_url
                        : exp.name?.toLowerCase().includes("koyo")
                          ? "/koyo.jpg"
                          : exp.name?.toLowerCase().includes("shang")
                            ? "/shang.jpg"
                            : exp.name?.toLowerCase().includes("lumen")
                              ? "/lumen1.jpg"
                              : "/placeholder.jpg";

                    const venueName = exp.name?.toLowerCase() || "";

                    const cuisine = venueName.includes("koyo")
                      ? "OMAKASE"
                      : venueName.includes("shang")
                        ? "CANTONESE CUISINE"
                        : venueName.includes("lumen")
                          ? "ALL DAY DINING"
                          : "THE BURMAN · DINING";

                    const overviewCopy = venueName.includes("koyo")
                      ? "An intimate omakase experience guided by seasonality, precision and Japanese craft."
                      : venueName.includes("shang")
                        ? "An elevated interpretation of Cantonese cuisine where signature dishes, precise technique and warm hospitality define the experience."
                        : venueName.includes("lumen")
                          ? "A relaxed dining experience designed around the rhythm of the day, from unhurried mornings to elegant evenings."
                          : "A distinctive dining experience shaped by character, craft and exceptional hospitality.";

                    return (
                      <div key={exp.id} className="vx-dining-hub">
                        <section className="vx-dining-hub-hero">
                          <img src={image} alt={exp.name} />

                          <button
                            className="vx-dining-back"
                            onClick={() => {
                              setOpenDiningVenue(null);
                              setDiningTab("overview");
                            }}
                          >
                            ← Back to Dining
                          </button>

                          <div className="vx-dining-hub-copy">
                            <span className="vx-dining-kicker">{cuisine}</span>
                            <h2>{exp.name}</h2>
                            <p>{overviewCopy}</p>

                            <div className="vx-dining-hub-meta">
                              <span>
                                {exp.schedule || "The Burman · Tallinn"}
                              </span>
                            </div>
                          </div>
                        </section>

                        <nav
                          className="vx-dining-tabs"
                          aria-label="Dining sections"
                        >
                          {(venueName.includes("koyo")
                            ? [
                                ["overview", "Overview"],
                                ["experience", "The Experience"],
                                ["booking", "Before You Book"],
                              ]
                            : [
                                ["overview", "Overview"],
                                ["menu", "Menu"],
                              ]
                          ).map(([key, label]) => (
                            <button
                              key={key}
                              className={
                                diningTab === key
                                  ? "vx-dining-tab active"
                                  : "vx-dining-tab"
                              }
                              onClick={() => setDiningTab(key)}
                            >
                              {label}
                            </button>
                          ))}
                        </nav>

                        <div className="vx-dining-hub-body">
                          {diningTab === "overview" &&
                            (venueName.includes("koyo") ? (
                              <section className="vx-koyo-overview">
                                <div className="vx-koyo-overview-main">
                                  <div className="vx-koyo-overview-intro">
                                    <h3>
                                      The menu is entrusted
                                      <br />
                                      to the chef.
                                    </h3>

                                    <p>
                                      Koyo is an intimate omakase experience in
                                      which each course is prepared and served
                                      in sequence according to seasonality,
                                      ingredient quality and the chef&apos;s
                                      creative direction.
                                    </p>

                                    <dl className="vx-koyo-facts">
                                      <div>
                                        <dt>FORMAT</dt>
                                        <dd>Chef-led tasting menu</dd>
                                      </div>

                                      <div>
                                        <dt>SEATINGS</dt>
                                        <dd>18:00 &amp; 20:30</dd>
                                      </div>

                                      <div>
                                        <dt>COUNTER</dt>
                                        <dd>11 seats</dd>
                                      </div>

                                      <div>
                                        <dt>PRICE</dt>
                                        <dd>€190 per guest + 10% service charge</dd>
                                      </div>
                                    </dl>
                                  </div>

                                  <div className="vx-koyo-overview-story">
                                    <span className="vx-koyo-story-mark">
                                      ◇
                                    </span>

                                    <span className="vx-koyo-story-label">
                                      AN EVENING SHAPED BY THE SEASON
                                    </span>

                                    <p className="vx-koyo-story-lead">
                                      The progression may change according to
                                      season and availability, and the finest
                                      ingredients are selected for that evening.
                                    </p>

                                    <p>
                                      With only 11 counter seats, the experience
                                      is personal, precise and designed to be
                                      enjoyed from beginning to end.
                                    </p>

                                    <button
                                      type="button"
                                      className="vx-koyo-story-link"
                                      onClick={() =>
                                        setDiningTab("experience")
                                      }
                                    >
                                      DISCOVER THE EXPERIENCE →
                                    </button>
                                  </div>
                                </div>
                              </section>
                            ) : (
                              <section className="vx-editorial-overview">
                                <div className="vx-editorial-overview-main">
                                  <div className="vx-editorial-overview-intro">
                                    <h3>
                                      {venueName.includes("shang")
                                        ? "Cantonese tradition, expressed with precision."
                                        : venueName.includes("lumen")
                                          ? "A relaxed table, from morning into evening."
                                          : "A distinctive dining experience at The Burman."}
                                    </h3>

                                    <p>
                                      {venueName.includes("shang")
                                        ? "Shang Shi brings the depth, generosity and refinement of Cantonese cuisine to Tallinn. Each dish is shaped by exceptional ingredients, accomplished technique and respect for tradition."
                                        : venueName.includes("lumen")
                                          ? "Lumen is an all-day dining experience designed for unhurried breakfasts, considered lunches and elegant evenings within The Burman."
                                          : overviewCopy}
                                    </p>

                                    <dl className="vx-editorial-facts">
                                      {venueName.includes("shang") ? (
                                        <>
                                          <div>
                                            <dt>CUISINE</dt>
                                            <dd>Refined Cantonese</dd>
                                          </div>

                                          <div>
                                            <dt>SIGNATURE</dt>
                                            <dd>Peking Duck &amp; handcrafted Dim Sum</dd>
                                          </div>

                                          <div>
                                            <dt>SETTING</dt>
                                            <dd>Elegant evening dining</dd>
                                          </div>

                                          <div>
                                            <dt>MENU</dt>
                                            <dd>À la carte</dd>
                                          </div>
                                        </>
                                      ) : venueName.includes("lumen") ? (
                                        <>
                                          <div>
                                            <dt>STYLE</dt>
                                            <dd>All-day dining</dd>
                                          </div>

                                          <div>
                                            <dt>SETTING</dt>
                                            <dd>Relaxed and contemporary</dd>
                                          </div>

                                          <div>
                                            <dt>SERVICE</dt>
                                            <dd>Breakfast through evening</dd>
                                          </div>

                                          <div>
                                            <dt>MENU</dt>
                                            <dd>Seasonal à la carte</dd>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div>
                                            <dt>EXPERIENCE</dt>
                                            <dd>{cuisine}</dd>
                                          </div>

                                          <div>
                                            <dt>LOCATION</dt>
                                            <dd>The Burman · Tallinn</dd>
                                          </div>
                                        </>
                                      )}
                                    </dl>
                                  </div>

                                  <div className="vx-editorial-overview-story">
                                    <span className="vx-editorial-story-mark">
                                      ◇
                                    </span>

                                    <span className="vx-editorial-story-label">
                                      {venueName.includes("shang")
                                        ? "A TABLE SHAPED BY CANTONESE CRAFT"
                                        : venueName.includes("lumen")
                                          ? "DINING THROUGHOUT THE DAY"
                                          : "THE EXPERIENCE"}
                                    </span>

                                    <p className="vx-editorial-story-lead">
                                      {venueName.includes("shang")
                                        ? "From delicate Dim Sum to the theatre of Peking Duck, the experience balances precision, generosity and a sense of occasion."
                                        : venueName.includes("lumen")
                                          ? "Thoughtful dishes, comfortable surroundings and service that adapts naturally to the rhythm of your day."
                                          : overviewCopy}
                                    </p>

                                    <p>
                                      {venueName.includes("shang")
                                        ? "The menu is designed for discovery and sharing, bringing together celebrated signatures and seasonal expressions."
                                        : venueName.includes("lumen")
                                          ? "Whether beginning the morning slowly or gathering for dinner, Lumen offers an effortless setting within the hotel."
                                          : "Explore the menu to discover the current selection."}
                                    </p>

                                    <button
                                      type="button"
                                      className="vx-editorial-story-link"
                                      onClick={() => setDiningTab("menu")}
                                    >
                                      EXPLORE THE MENU →
                                    </button>
                                  </div>
                                </div>
                              </section>
                            ))}

                          {venueName.includes("koyo") &&
                            diningTab === "experience" && (
                              <section className="vx-koyo-editorial-tab">
                                <div className="vx-koyo-editorial-tab-main">
                                  <div className="vx-koyo-editorial-tab-intro">
                                    <span className="vx-koyo-editorial-eyebrow">
                                      THE OMAKASE EXPERIENCE
                                    </span>

                                    <h3>
                                      One counter.
                                      <br />
                                      One progression.
                                    </h3>

                                    <p>
                                      Omakase means placing the experience in
                                      the hands of the chef. Guests are guided
                                      through one considered sequence prepared
                                      for the entire counter.
                                    </p>

                                    <dl className="vx-koyo-editorial-facts">
                                      <div>
                                        <dt>FIRST SEATING</dt>
                                        <dd>18:00</dd>
                                      </div>

                                      <div>
                                        <dt>SECOND SEATING</dt>
                                        <dd>20:30</dd>
                                      </div>

                                      <div>
                                        <dt>DURATION</dt>
                                        <dd>Approximately 2 hours</dd>
                                      </div>

                                      <div>
                                        <dt>AVAILABILITY</dt>
                                        <dd>Wednesday–Saturday</dd>
                                      </div>
                                    </dl>
                                  </div>

                                  <div className="vx-koyo-editorial-tab-story">
                                    <span className="vx-koyo-editorial-mark">
                                      ◇
                                    </span>

                                    <span className="vx-koyo-editorial-label">
                                      WHAT TO EXPECT
                                    </span>

                                    <div className="vx-koyo-editorial-steps">
                                      <div>
                                        <span>01</span>
                                        <div>
                                          <h4>Begin together</h4>
                                          <p>
                                            Guests are encouraged to arrive
                                            10–15 minutes before the confirmed
                                            seating time.
                                          </p>
                                        </div>
                                      </div>

                                      <div>
                                        <span>02</span>
                                        <div>
                                          <h4>Courses in sequence</h4>
                                          <p>
                                            Each course is served as part of one
                                            continuous chef-led progression.
                                          </p>
                                        </div>
                                      </div>

                                      <div>
                                        <span>03</span>
                                        <div>
                                          <h4>Curated beverages</h4>
                                          <p>
                                            Sake, wine and non-alcoholic
                                            pairings may be recommended alongside
                                            the menu.
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </section>
                            )}

                          {venueName.includes("koyo") &&
                            diningTab === "booking" && (
                              <section className="vx-koyo-editorial-tab">
                                <div className="vx-koyo-editorial-tab-main">
                                  <div className="vx-koyo-editorial-tab-intro">
                                    <span className="vx-koyo-editorial-eyebrow">
                                      BEFORE YOU BOOK
                                    </span>

                                    <h3>
                                      Everything to know
                                      <br />
                                      before your visit.
                                    </h3>

                                    <p>
                                      Koyo is a fixed chef-led experience.
                                      Advance planning allows the team to prepare
                                      each seating with the care and precision
                                      the format requires.
                                    </p>

                                    <dl className="vx-koyo-editorial-facts">
                                      <div>
                                        <dt>MENU PRICE</dt>
                                        <dd>€190 per guest</dd>
                                      </div>

                                      <div>
                                        <dt>SERVICE CHARGE</dt>
                                        <dd>10%</dd>
                                      </div>

                                      <div>
                                        <dt>FORMAT</dt>
                                        <dd>No à la carte ordering</dd>
                                      </div>

                                      <div>
                                        <dt>RESERVATIONS</dt>
                                        <dd>Advance booking required</dd>
                                      </div>
                                    </dl>
                                  </div>

                                  <div className="vx-koyo-editorial-tab-story">
                                    <span className="vx-koyo-editorial-mark">
                                      ◇
                                    </span>

                                    <span className="vx-koyo-editorial-label">
                                      BOOKING GUIDANCE
                                    </span>

                                    <div className="vx-koyo-editorial-guidance">
                                      <div>
                                        <h4>Dietary requirements</h4>
                                        <p>
                                          Allergies and dietary restrictions
                                          must be shared when booking. Some
                                          requirements may not be possible to
                                          accommodate.
                                        </p>
                                      </div>

                                      <div>
                                        <h4>Late arrivals</h4>
                                        <p>
                                          The seating starts together. Late
                                          arrival may result in missed courses.
                                        </p>
                                      </div>

                                      <div>
                                        <h4>Changes and cancellations</h4>
                                        <p>
                                          Payment, cancellation, rescheduling
                                          and guest-count terms are confirmed
                                          during reservation.
                                        </p>
                                      </div>

                                      <div>
                                        <h4>Assistance</h4>
                                        <p>
                                          For availability or special requests,
                                          please contact The Burman Reception.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </section>
                            )}

                          {!venueName.includes("koyo") &&
                            diningTab === "menu" && (
                              <section className="vx-dining-menu">
                                <div className="vx-dining-menu-heading">
                                  <span className="vx-dining-section-label">
                                    - Menu - 
                                  </span>
                                  <h3>Discover the menu</h3>
                                </div>

                                {exp.experience_sections
                                  ?.filter(
                                    (section) =>
                                      section.experience_items?.length,
                                  )
                                  ?.sort((a, b) => a.position - b.position)
                                  .map((section) => (
                                    <div
                                      key={section.id}
                                      className="burman-spa-section"
                                    >
                                      <h3>{section.name}</h3>

                                      {section.experience_items
                                        ?.sort(
                                          (a, b) => a.position - b.position,
                                        )
                                        .map((item) => {
                                          const price =
                                            item.experience_prices?.[0]?.price;
                                          const label =
                                            item.experience_prices?.[0]?.label;

                                          return (
                                            <div
                                              key={item.id}
                                              className="burman-spa-item"
                                            >
                                              <div>
                                                <h4>{item.name}</h4>
                                                {item.description && (
                                                  <p>{item.description}</p>
                                                )}
                                              </div>

                                              {price && (
                                                <span className="burman-price">
                                                  {label && (
                                                    <span>{label} — </span>
                                                  )}
                                                  €{price}
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })}
                                    </div>
                                  ))}

                                {exp.footer?.trim() && (
                                  <div className="burman-disclaimer">
                                    {exp.footer}
                                  </div>
                                )}
                              </section>
                            )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}