"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import "@/styles/burman.css";

import BurmanWeather from "@/components/BurmanWeather";
import BurmanNightScreen from "@/components/BurmanNightScreen";
import BurmanPillowMenu from "@/components/BurmanPillowMenu";
import BurmanDiningWine from "@/components/BurmanDiningWine";
import BurmanSpaOffer from "@/components/BurmanSpaOffer";
import { motion, useBurmanModal, useBurmanMotion, BurmanTabIndicator, BurmanCrossfade, BurmanSharedStage, BurmanSharedPhoto, BurmanSharedTitle } from "@/components/BurmanMotion";
const BURMAN_HOME_PHOTO = "https://theburmanhotel.com/wp-content/webp-express/webp-images/uploads/2025/05/Hero-1920x1440.jpg.webp";
export default function BurmanLanding({ menu }) {
  const base = `/menu/${menu?.public_slug}`;
  const [roomTab, setRoomTab] = useState("snacks");

  const [experiences, setExperiences] = useState([]);
  const [openSpa, setOpenSpa, spaPhase] = useBurmanModal();
  const [openSpaInfo, setOpenSpaInfo] = useState(false);
  const [openRoomService, setOpenRoomService, roomPhase] = useBurmanModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openSection, setOpenSection] = useState(null);
  const [openDining, setOpenDining, diningPhase] = useBurmanModal();
  const modalMotion = useBurmanMotion();
  const [openDiningVenue, setOpenDiningVenue] = useState(null);
  const [selectedDining, setSelectedDining] = useState(null);
  const [diningTab, setDiningTab] = useState("overview");
  const [spaTab, setSpaTab] = useState("overview");
  const spaDialogRef = useRef(null);
  const spaBodyRef = useRef(null);
  const roomDialogRef = useRef(null);
  const roomBodyRef = useRef(null);
  const diningDialogRef = useRef(null);
  const diningBodyRef = useRef(null);
  const diningListScroll = useRef(0);
  const restoreDiningList = useCallback((node) => {
    if (node) node.scrollTop = diningListScroll.current;
  }, []);

  useEffect(() => {
    if (!openSpa && !openRoomService && !openDining) return;
    const previousFocus = document.activeElement;
    const dialog = openSpa ? spaDialogRef.current : openRoomService ? roomDialogRef.current : diningDialogRef.current;
    dialog?.querySelector("button")?.focus();
    const handleKeys = (event) => {
      if (event.key === "Escape") {
        setOpenSpa(false);
        setOpenRoomService(false);
        setOpenDining(false);
      }
      if (event.key !== "Tab" || !dialog) return;
      const controls = Array.from(dialog.querySelectorAll("button:not([disabled]), a[href], [tabindex='0']"))
        .filter((element) => element.getClientRects().length && !element.closest("[inert]"));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKeys);
    return () => {
      document.removeEventListener("keydown", handleKeys);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [openSpa, openRoomService, openDining]);

  // Reset only after dismissal, so the visible page does not jump during exit.
  useEffect(() => { if (!openSpa) setSpaTab("overview"); }, [openSpa]);
  useEffect(() => { if (!openRoomService) setRoomTab("snacks"); }, [openRoomService]);
  useEffect(() => {
    if (!openDining) { setOpenDiningVenue(null); setDiningTab("overview"); diningListScroll.current = 0; }
  }, [openDining]);

  // Keyed content mounts at scrollTop 0; leave the outgoing page still as it fades.
  const changeTab = (setTab, key, dialogRef) => {
    setTab(key);
    // Links inside a page can also change tabs. Move focus before that page exits.
    requestAnimationFrame(() => dialogRef.current?.querySelector("nav button[aria-pressed='true']")?.focus());
  };
  useEffect(() => {
    if (openDiningVenue) diningDialogRef.current?.querySelector("[data-dining-return]")?.focus();
  }, [openDiningVenue]);
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
      if (!menu?.public_slug) return;
      const response = await fetch(
        `/api/pwa-refresh?menu=${encodeURIComponent(menu.public_slug)}`,
        { cache: "no-store" },
      );
      if (!response.ok) return;
      const data = await response.json();

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
    };
  }, [menu?.public_slug]);

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
    if (!menu?.public_slug) return;

    const loadData = async () => {
      try {
        const response = await fetch(
          `/api/public-menu/${encodeURIComponent(menu.public_slug)}/experience-content`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error(`Guest content failed (${response.status})`);

        const data = await response.json();
        setCategories(data.categories || []);
        setItems(data.items || []);
        setExperiences(data.experiences || []);

        const grouped = {};
        (data.prices || []).forEach((price) => {
          if (!grouped[price.menu_item_id]) grouped[price.menu_item_id] = [];
          grouped[price.menu_item_id].push(price);
        });
        setPricesMap(grouped);
      } catch (error) {
        console.error("BURMAN GUEST CONTENT ERROR:", error);
      }
    };

    loadData();
  }, [menu, pwaRefreshVersion]);

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
    <BurmanNightScreen>
    <div className="burman-root">
      {/* ========================= HOME ========================= */}
      <div id="burman-home" inert={openDining || openSpa || openRoomService || openSpaInfo}>
        <header className="bh-masthead">
          <span>Hotel</span>
          <div className="bh-wordmark">The Burman</div>
          <span>Tallinn</span>
        </header>
        <main className="bh-scene">
          <img className="bh-photograph" src={BURMAN_HOME_PHOTO} alt="The Burman hotel interior" fetchPriority="high" />
          <img className="bh-photograph bh-photograph-blur" src={BURMAN_HOME_PHOTO} alt="" aria-hidden="true" />
          <div className="bh-shade" aria-hidden="true" />
          <div className="bh-home-scroll" tabIndex={0} aria-label="Your stay at The Burman">
            <div className="bh-home-content">
              <BurmanWeather floating />
              <div className="bh-welcome">
                <span className="bh-eyebrow">Your stay, considered.</span>
                <h1>Welcome to<br /><em>The Burman.</em></h1>
                <p>Exceptional dining, quiet moments and thoughtful comforts.<br className="bh-desktop-break" /> Discover the experiences that make your stay yours.</p>
              </div>
              <nav className="bh-experiences" aria-label="Hotel experiences">
                <button type="button" className="bh-experience" aria-haspopup="dialog" onClick={() => setOpenDining(true)}>
                  <span className="bh-experience-label">Michelin selected</span>
                  <strong>Dining</strong>
                  <span className="bh-experience-description">Restaurants &amp; wine</span>
                  <ArrowUpRightIcon className="bh-experience-arrow" aria-hidden="true" focusable="false" />
                </button>
                <button type="button" className="bh-experience" aria-haspopup="dialog" onClick={() => setOpenRoomService(true)}>
                  <span className="bh-experience-label">Available 24 hours</span>
                  <strong>Room Delicacies</strong>
                  <span className="bh-experience-description">Comforts delivered to your room</span>
                  <ArrowUpRightIcon className="bh-experience-arrow" aria-hidden="true" focusable="false" />
                </button>
                <button type="button" className="bh-experience" aria-haspopup="dialog" onClick={() => setOpenSpa(true)}>
                  <span className="bh-experience-label">The Burman Spa</span>
                  <strong>Wellness</strong>
                  <span className="bh-experience-description">Spa, treatments &amp; renewal</span>
                  <ArrowUpRightIcon className="bh-experience-arrow" aria-hidden="true" focusable="false" />
                </button>
              </nav>
            </div>
          </div>
        </main>
      </div>

      {/* ROOM SERVICE MODAL */}
      {openRoomService && (
        <motion.div className="burman-modal vx-room-modal" id="burman-room-delicacies" data-motion="spring" initial="closed" animate={roomPhase}>
          <motion.div variants={modalMotion.backdrop}
            className="burman-modal-backdrop"
            onClick={() => {
              setOpenRoomService(false);
            }}
          />

          <motion.div variants={modalMotion.panel} className="burman-modal-content" ref={roomDialogRef} role="dialog" aria-modal="true" aria-labelledby="burman-room-title">
            <div className="vx-room-shell">
              <div className="vx-room-atmosphere" aria-hidden="true" />
              <header className="vx-room-masthead">
                <span className="vx-room-masthead-label">Room Delicacies</span>
                <h2 id="burman-room-title">The Burman</h2>
                <button type="button" className="vx-room-close" aria-label="Close room service" onClick={() => {
                  setOpenRoomService(false);
                }}>Close <span aria-hidden="true">×</span></button>
              </header>

              {/* TABS */}
              <motion.nav layoutScroll
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
                    onClick={() => changeTab(setRoomTab, key, roomDialogRef)}
                    aria-pressed={roomTab === key}
                  >
                    {label}
                    <BurmanTabIndicator group="room" active={roomTab === key} />
                  </button>
                ))}
              </motion.nav>

              {/* CONTENT */}
              <BurmanCrossfade contentKey={roomTab} className="vx-room-body" ref={roomBodyRef} tabIndex={0} aria-label="Room delicacies content">
                {/* SNACKS / DRINKS / AMENITIES */}
                {["snacks", "drinks"].includes(roomTab) && (
                  <section className="vx-room-menu">
                    <div className="vx-room-menu-heading">
                      <span className="vx-room-section-label">
                        {roomTab === "snacks"
                          ? "IN ROOM DINING · AVAILABLE 24 HOURS"
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
              </BurmanCrossfade>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* SPA MODAL */}
      {openSpa && (
        <motion.div className="burman-modal vx-spa-modal" id="burman-wellness" data-spa-tab={spaTab} data-motion="spring" initial="closed" animate={spaPhase}>
          <motion.div variants={modalMotion.backdrop}
            className="burman-modal-backdrop"
            onClick={() => {
              setOpenSpa(false);
            }}
          />

          <motion.div variants={modalMotion.panel} className="burman-modal-content" ref={spaDialogRef} role="dialog" aria-modal="true" aria-labelledby="burman-wellness-title">
            <div className="vx-spa-shell">
              <div className="vx-spa-atmosphere" aria-hidden="true" />
              <header className="vx-spa-masthead">
                <span className="vx-spa-masthead-label">Wellness</span>
                <h2 id="burman-wellness-title">The Burman</h2>
                <button type="button" className="vx-spa-close" aria-label="Close spa" onClick={() => {
                  setOpenSpa(false);
                }}>Close <span aria-hidden="true">×</span></button>
              </header>

              {/* TABS */}
              <motion.nav layoutScroll className="vx-spa-tabs" aria-label="Spa sections">
                {[
                  ["overview", "Overview"],
                  ["treatments", "Treatments"],
                  ["summer", "September Offer"],
                  ["information", "Information"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={
                      spaTab === key ? "vx-spa-tab active" : "vx-spa-tab"
                    }
                    onClick={() => changeTab(setSpaTab, key, spaDialogRef)}
                    aria-pressed={spaTab === key}
                  >
                    {label}
                    <BurmanTabIndicator group="spa" active={spaTab === key} />
                  </button>
                ))}
              </motion.nav>

              {/* BODY */}
              <BurmanCrossfade contentKey={spaTab} className="vx-spa-body" ref={spaBodyRef} tabIndex={0} aria-label="Spa content">
                {/* OVERVIEW */}
                {spaTab === "overview" && (
                  <section className="vx-spa-editorial-overview">
                    <div className="vx-spa-editorial-main">
                      <div className="vx-spa-editorial-intro">
                        <h3>
                          An oasis of
                          <br />
                          <em>serenity.</em>
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
                          onClick={() => changeTab(setSpaTab, "treatments", spaDialogRef)}
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

                {/* SEPTEMBER OFFER */}
                {spaTab === "summer" && (
                  <BurmanSpaOffer />
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
              </BurmanCrossfade>
            </div>
          </motion.div>
        </motion.div>
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
        <motion.div className="burman-modal vx-dining-modal" id="burman-dining" data-motion="spring" initial="closed" animate={diningPhase}>
          <motion.div variants={modalMotion.backdrop}
            className="burman-modal-backdrop"
            onClick={() => {
              setOpenDining(false);
            }}
          />

          <motion.div layoutRoot variants={modalMotion.panel} className="burman-modal-content" ref={diningDialogRef} role="dialog" aria-modal="true" aria-labelledby="burman-dining-title">
            <div className="vx-dining-shell">
              <header className="vx-dining-masthead">
                {openDiningVenue ? (
                  <button type="button" className="vx-dining-return" data-dining-return onClick={() => {
                    setOpenDiningVenue(null);
                    setDiningTab("overview");
                  }}>← Dining</button>
                ) : <span className="vx-dining-masthead-label">Dining</span>}
                <h2 id="burman-dining-title">The Burman</h2>
                <button type="button" className="vx-dining-close" aria-label="Close dining" onClick={() => {
                  setOpenDining(false);
                }}>Close <span aria-hidden="true">×</span></button>
              </header>
              <BurmanSharedStage contentKey={openDiningVenue || "discovery"} onEntered={() => {
                if (openDiningVenue) diningDialogRef.current?.querySelector("[data-dining-return]")?.focus();
                else diningDialogRef.current?.querySelector(`[data-venue-id="${CSS.escape(selectedDining || "")}"]`)?.focus();
              }}>
              {!openDiningVenue ? (
                <motion.div layoutScroll className="vx-dining-discovery" ref={restoreDiningList} onScroll={(event) => { diningListScroll.current = event.currentTarget.scrollTop; }} tabIndex={0} aria-label="Choose a restaurant">
                  <div className="vx-dining-atmosphere vx-dining-discovery-atmosphere" aria-hidden="true" />
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
                            data-venue-id={exp.id}
                            onClick={() => {
                              setSelectedDining(exp.id);
                              setDiningTab("overview");
                              setOpenDiningVenue(exp.id);
                            }}
                          >
                            <BurmanSharedPhoto venueId={exp.id} src={image} />

                            <div className="vx-dining-venue-copy">
                              <small>{cuisine}</small>
                              <BurmanSharedTitle venueId={exp.id}>{exp.name}</BurmanSharedTitle>

                              {exp.schedule && <p>{exp.schedule}</p>}

                              <span className="vx-dining-explore">
                                Explore <span aria-hidden="true">→</span>
                              </span>
                            </div>
                          </button>
                        );
                      })}
                  </section>
                </motion.div>
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
                        <BurmanSharedPhoto venueId={exp.id} src={image} detail />
                        <motion.nav layoutScroll
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
                              onClick={() => changeTab(setDiningTab, key, diningDialogRef)}
                              aria-pressed={diningTab === key}
                            >
                              {label}
                              <BurmanTabIndicator group="dining" active={diningTab === key} />
                            </button>
                          ))}
                        </motion.nav>

                        <BurmanCrossfade contentKey={diningTab} className="vx-dining-hub-body" ref={diningBodyRef} tabIndex={0} aria-label={`${exp.name} information`}>
                          <section className="vx-dining-identity">
                            <span className="vx-dining-kicker">{cuisine}</span>
                            <BurmanSharedTitle venueId={exp.id} detail>{exp.name}</BurmanSharedTitle>
                            <p>{overviewCopy}</p>
                            <div className="vx-dining-hours">{exp.schedule || "The Burman · Tallinn"}</div>
                          </section>
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
                                        changeTab(setDiningTab, "experience", diningDialogRef)
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
                                      onClick={() => changeTab(setDiningTab, "menu", diningDialogRef)}
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
                        </BurmanCrossfade>
                      </div>
                    );
                  })
              )}
              </BurmanSharedStage>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
    </BurmanNightScreen>
  );
}
