"use client";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import "@/styles/burman.css";


import BurmanWeather from "@/components/BurmanWeather";
import BurmanPillowMenu from "@/components/BurmanPillowMenu";
import BurmanDiningWine from "@/components/BurmanDiningWine";
export default function BurmanLanding({ menu }) {
  
const supabase = createClientComponentClient();  
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
const roomServiceExp = experiences.find(
  exp => exp.type === "room_service"
);

useEffect(() => {
  if (experiences.length && !selectedDining) {
    const firstDining = experiences.find(
      exp => exp.type?.toLowerCase() === "dining"
    );
    if (firstDining) {
      setSelectedDining(firstDining.id);
    }
  }
}, [experiences]);
const [categories, setCategories] = useState([]);
const [items, setItems] = useState([]);
const [pricesMap, setPricesMap] = useState({});

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
          .in("menu_item_id", its.map(i => i.id))
          .order("position");

        const grouped = {};
        prices.forEach(p => {
          if (!grouped[p.menu_item_id]) grouped[p.menu_item_id] = [];
          grouped[p.menu_item_id].push(p);
        });

        setPricesMap(grouped);
      }
    };

    loadData();

  }, [menu]);

  // ================= EXPERIENCES DATA =================
  useEffect(() => {

  const loadExperiences = async () => {

    const { data, error } = await supabase
      .from("experiences")
      .select(`
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
      `)
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

}, [openDining,openRoomService]);

  // ================= SCROLL LOCK =================
  useEffect(() => {
    if (openSpa || openRoomService || menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [openSpa, openRoomService, menuOpen]);

  const toggleSection = (key) => {
    setOpenSection(openSection === key ? null : key);
  };

  return (
    <div className="burman-root">

      {/* EVERYTHING BELOW REMAINS EXACTLY THE SAME */}
      {/* I DID NOT TOUCH YOUR UI */}

      {/* ========================= HOME ========================= */}

{!openSpa && (

<div className="vx-home">

    <div className="vx-container">
<header className="vx-header">

    <div className="vx-header-left">
        HOTEL
    </div>

    <div className="vx-header-center">
        THE BURMAN
    </div>

    <div className="vx-header-right">
        TALLINN
    </div>

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

            <div className="vx-eyebrow">
                THE BURMAN · TALLINN
            </div>

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

    <img
        src="/homepage/dining.jpg"
        alt="Dining"
    />

    <span>MICHELIN SELECTED</span>

    <h3>Dining</h3>

    <p>Restaurants & Wine</p>

</button>

        <button
    className="vx-service"
    onClick={() => setOpenRoomService(true)}
>

    <img
        src="/homepage/room-service.jpg"
        alt="Room Service"
    />

    <span>24 HOURS</span>

    <h3>Room Delicacies</h3>

    <p>Curated Selections</p>

</button>

        <button
    className="vx-service"
    onClick={() => setOpenSpa(true)}
>

    <img
        src="/homepage/spa.jpg"
        alt="Spa"
    />

    <span>BURMAN SPA</span>

    <h3>Wellness</h3>

    <p>Spa & Treatments</p>

</button>

       <button
    className="vx-service"
    onClick={() => window.location.href="/collection"}
>

    <img
        src="/homepage/collection.jpg"
        alt="Collection"
    />

    <span>BOUTIQUE</span>

    <h3>Collection</h3>

    <p>Luxury Retail</p>

</button>

    </div>

</section>

    </div>

</div>

)}

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
          <img
            src="/homepage/room-service.jpg"
            alt="Room Delicacies"
          />

          <div className="vx-room-hero-copy">
            <span className="vx-room-kicker">
              THE BURMAN · IN ROOM
            </span>

            <h2>Room Delicacies</h2>

            <p>
              Curated comforts, thoughtful details and refined
              in-room selections designed around your stay.
            </p>

            <div className="vx-room-hero-meta">
              <span>Available 24 hours</span>
            </div>
          </div>

          <div className="vx-room-request">
            <span>
              <small>PLACE AN ORDER</small>
              Contact Reception
            </span>

            <span aria-hidden="true">→</span>
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
                roomTab === key
                  ? "vx-room-tab active"
                  : "vx-room-tab"
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
                  section =>
                    section.type === roomTab &&
                    section.experience_items?.length
                )
                ?.sort((a, b) => a.position - b.position)
                .map(section => (
                  <div
                    key={section.id}
                    className="vx-room-menu-section"
                  >
                    <h3>{section.name}</h3>

                    {section.experience_items
                      ?.sort((a, b) => a.position - b.position)
                      .map(item => {
                        const price =
                          item.experience_prices?.[0]?.price;

                        const label =
                          item.experience_prices?.[0]?.label;

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

                <p>
                  Explore our pillow selection and choose the comfort
                  and support best suited to your sleep.
                </p>
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

          <img
            src="/spa.jpg"
            alt="The Burman Spa"
          />

          <div className="vx-spa-hero-copy">

            <span className="vx-spa-kicker">
              THE BURMAN · WELLNESS
            </span>

            <h2>
              An oasis of
              <span> serenity.</span>
            </h2>

            <p>
              A bespoke wellness journey designed around
              renewal, tranquillity and personalised care.
            </p>

            <div className="vx-spa-hero-meta">
              BIOLOGIQUE RECHERCHE · PARIS
            </div>

          </div>

          <div className="vx-spa-request">

            <span>
              <small>SPA CONCIERGE</small>
              Contact Reception
            </span>

            <span aria-hidden="true">→</span>

          </div>

        </section>


        {/* TABS */}
        <nav
          className="vx-spa-tabs"
          aria-label="Spa sections"
        >

          {[
            ["overview", "Overview"],
            ["treatments", "Treatments"],
            ["information", "Information"],
          ].map(([key, label]) => (

            <button
              key={key}
              className={
                spaTab === key
                  ? "vx-spa-tab active"
                  : "vx-spa-tab"
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

            <section className="vx-spa-overview">

              <div className="vx-spa-overview-intro">

                <span>THE BURMAN SPA</span>

                <h3>
                  Wellness,
                  <br />
                  considered.
                </h3>

                <p>
                  Discover a tranquil retreat for mind,
                  body and soul within The Burman.
                </p>

              </div>


              <div className="vx-spa-overview-content">

                <div className="vx-spa-story">

                  <span>OUR PHILOSOPHY</span>

                  <p>
                    The Burman Spa is an intimate sanctuary
                    dedicated to quiet contentment and
                    personalised wellbeing.
                  </p>

                  <p>
                    Each experience is considered around the
                    individual, combining refined treatments,
                    sensorial rejuvenation and a deeply
                    restorative atmosphere.
                  </p>

                </div>


                <div className="vx-spa-highlights">

                  <article>
                    <span>01</span>

                    <div>
                      <small>PERSONALISED CARE</small>

                      <h4>Bespoke treatments</h4>

                      <p>
                        Wellness experiences tailored around
                        your individual needs.
                      </p>
                    </div>
                  </article>


                  <article>
                    <span>02</span>

                    <div>
                      <small>PARIS · FRANCE</small>

                      <h4>Biologique Recherche</h4>

                      <p>
                        Highly effective skincare rituals
                        guided by a personalised approach.
                      </p>
                    </div>
                  </article>


                  <article>
                    <span>03</span>

                    <div>
                      <small>HOLISTIC WELLBEING</small>

                      <h4>Sensorial renewal</h4>

                      <p>
                        A calm environment shaped around
                        restoration and inner balance.
                      </p>
                    </div>
                  </article>

                </div>

              </div>

            </section>

          )}


          {/* TREATMENTS */}
          {spaTab === "treatments" && (

            <section className="vx-spa-treatments">

              <div className="vx-spa-section-heading">

                <span>SPA MENU</span>

                <h3>
                  Treatments
                </h3>

                <p>
                  Explore our collection of considered
                  wellness and beauty rituals.
                </p>

              </div>


              {categories.map(cat => {

                const catItems = items.filter(
                  i => i.category_id === cat.id
                );

                if (!catItems.length) return null;

                return (

                  <div
                    key={cat.id}
                    className="vx-spa-treatment-section"
                  >

                    <h3>{cat.name}</h3>


                    {catItems.map(item => {

                      const prices =
                        pricesMap[item.id] || [];

                      return (

                        <div
                          key={item.id}
                          className="vx-spa-treatment"
                        >

                          <div className="vx-spa-treatment-copy">

                            <h4>{item.name}</h4>

                            {item.description && (
                              <p>
                                {item.description}
                              </p>
                            )}

                          </div>


                          <div className="vx-spa-pricing">

                            {prices.map(price => (

                              <div
                                key={price.id}
                                className="vx-spa-price"
                              >

                                <span>
                                  {price.label ||
                                    price.duration}
                                </span>

                                <strong>
                                  €{price.price}
                                </strong>

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


          {/* INFORMATION */}
          {spaTab === "information" && (

            <section className="vx-spa-information">

              <div className="vx-spa-section-heading">

                <span>YOUR VISIT</span>

                <h3>
                  Spa information
                </h3>

                <p>
                  Everything you need to know before
                  your Burman Spa experience.
                </p>

              </div>


              <div className="vx-spa-info-grid">

                <article className="vx-spa-info-card">

                  <span>01</span>

                  <h4>Opening Hours</h4>

                  <div className="vx-spa-info-row">
                    <span>Spa Facilities</span>
                    <strong>08:00 — 22:00</strong>
                  </div>

                  <div className="vx-spa-info-row">
                    <span>Treatments</span>
                    <strong>10:00 — 21:00</strong>
                  </div>

                </article>


                <article className="vx-spa-info-card">

                  <span>02</span>

                  <h4>External Guests</h4>

                  <p>
                    Spa access is available for €100 per
                    person, subject to availability.
                  </p>

                  <p>
                    Treatment reservations include
                    complimentary spa facility access.
                  </p>

                </article>


                <article className="vx-spa-info-card">

                  <span>03</span>

                  <h4>Wellness Etiquette</h4>

                  <p>
                    To preserve the atmosphere of
                    tranquillity, we kindly invite guests
                    to enjoy a digital detox.
                  </p>

                  <p>
                    Bathing attire is required within
                    wellness and thermal facilities.
                  </p>

                </article>


                <article className="vx-spa-info-card">

                  <span>04</span>

                  <h4>Appointments</h4>

                  <p>
                    We recommend arriving 15 minutes
                    before your treatment.
                  </p>

                  <p>
                    Advance reservations are recommended
                    for preferred availability.
                  </p>

                </article>


                <article className="vx-spa-info-card">

                  <span>05</span>

                  <h4>Cancellation Policy</h4>

                  <p>
                    Treatments cancelled within 24 hours
                    will incur the full treatment fee.
                  </p>

                </article>


                <article className="vx-spa-info-card">

                  <span>06</span>

                  <h4>Health & Wellness</h4>

                  <p>
                    Please inform your therapist of any
                    medical conditions, pregnancy or
                    ongoing treatments before your visit.
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
marginBottom:"50px",
textAlign:"center"
}}
>
        <h2 className="burman-heading">
          <span className="line-top">
            WELLNESS
          </span>

          <span className="line-bottom">
            INFORMATION
          </span>
        </h2>

      </div>

      <div className="burman-modal-body">

        <div className="burman-spa-info-grid">

          <div className="burman-spa-info-card">
            <h4>Opening Hours</h4>

            <div className="burman-info-row">
              <span>Spa Facilities</span>
              <span>08AM — 10PM</span>
            </div>

            <div className="burman-info-row">
              <span>Treatments</span>
              <span>10AM — 9PM</span>
            </div>
          </div>

          <div className="burman-spa-info-card">
            <h4>External Guests</h4>

            <p>
              External guests may access the spa facilities
              for €100 per person, subject to availability.
            </p>

            <p>
              Guests booking a treatment receive
              complimentary access to all spa facilities.
            </p>
          </div>

          <div className="burman-spa-info-card">
            <h4>Wellness Etiquette</h4>

            <p>
              To preserve the atmosphere of tranquillity,
              guests are kindly requested to maintain
              a digital detox within the spa environment.
            </p>

            <p>
              Bathing attire is required within all
              thermal and wellness facilities.
            </p>
          </div>

          <div className="burman-spa-info-card">
            <h4>Appointments</h4>

            <p>
              We recommend arriving at least
              15 minutes prior to your treatment.
            </p>

            <p>
              Advance booking is highly recommended
              to ensure preferred availability.
            </p>
          </div>

          <div className="burman-spa-info-card">
            <h4>Cancellation Policy</h4>

            <p>
              Treatments cancelled within 24 hours
              will incur the full treatment fee.
            </p>
          </div>

          <div className="burman-spa-info-card">
            <h4>Health & Wellness</h4>

            <p>
              Please inform your therapist of any
              medical conditions, pregnancy,
              or ongoing treatments prior to arrival.
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
                      Discover our collection of distinctive restaurants,
                      each with its own character, cuisine and atmosphere.
                    </p>

                    <div className="vx-dining-assistance">
                      <span aria-hidden="true">⌂</span>
                      <p>
                        For reservations or assistance, please contact
                        <strong> Reception</strong>.
                      </p>
                    </div>
                  </section>

                  <section className="vx-dining-venues">
                    {experiences
                      .filter(exp => exp.type?.toLowerCase() === "dining")
                      .sort((a, b) => a.position - b.position)
                      .map(exp => {
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
                    exp =>
                      exp.type?.toLowerCase() === "dining" &&
                      exp.id === openDiningVenue
                  )
                  .map(exp => {
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
                              <span>{exp.schedule || "The Burman · Tallinn"}</span>
                            </div>
                          </div>

                          <div className="vx-dining-request">
                            <span>
                              <small>REQUEST A TABLE</small>
                              Contact Reception
                            </span>
                            <span aria-hidden="true">→</span>
                          </div>
                        </section>

                        <nav className="vx-dining-tabs" aria-label="Dining sections">
                          {[
                            ["overview", "Overview"],
                            ["menu", "Menu"],
                            ["wine", "Wine"],
                            ["private", "Private Dining"],
                          ].map(([key, label]) => (
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
                          {diningTab === "overview" && (
                            <section className="vx-dining-overview">
                              <div className="vx-dining-about">
  <span className="vx-dining-section-label">
    ABOUT
  </span>

  {venueName.includes("shang") ? (
    <>
      <h3>Tradition, reimagined.</h3>

      <p>
        From handcrafted Dim Sum to The Lengendary Peking Duck, dishes are prepared
        with exceptional ingredients, each experience is shaped
        by technique, generosity and a respect for tradition. 
        </p>
      <p>
        Shang Shi brings the depth and precision of Cantonese
        cuisine to Tallinn.
      </p>
    </>
  ) : (
    <p>{overviewCopy}</p>
  )}

  <div className="vx-dining-info-grid">
                                  <div className="vx-dining-info-card">
                                    <span>ATTIRE</span>
                                    <strong>Smart casual</strong>
                                  </div>

                                  <div className="vx-dining-info-card">
                                    <span>RESERVATIONS</span>
                                    <strong>Available through the hotel reception</strong>
                                  </div>
                                </div>
                              </div>

                              <div className="vx-dining-highlights">
  <span className="vx-dining-section-label">
    {venueName.includes("shang")
      ? "SIGNATURE EXPERIENCES"
      : "SIGNATURE HIGHLIGHTS"}
  </span>

  <div className="vx-dining-highlight-grid">
    {venueName.includes("shang") ? (
      <>
        <button
          className="vx-dining-highlight"
          onClick={() => setDiningTab("menu")}
        >
          <span className="vx-dining-highlight-kicker">
            SHANG SHI SIGNATURE
          </span>

          <h4>Peking Duck</h4>

          <p>
            A signature Cantonese ritual presented through
            a refined three-course experience. (Only available in Shang Shi restaurant upon 24h advance request)
          </p>

          <span className="vx-dining-highlight-action">
            Explore menu →
          </span>
        </button>

        <button
          className="vx-dining-highlight"
          onClick={() => setDiningTab("menu")}
        >
          <span className="vx-dining-highlight-kicker">
            HANDCRAFTED
          </span>

          <h4>Dim Sum</h4>

          <p>
            Delicate Cantonese craftsmanship shaped with
            precision and served for sharing.
          </p>

          <span className="vx-dining-highlight-action">
            Explore menu →
          </span>
        </button>

        <button
          className="vx-dining-highlight"
          onClick={() => setDiningTab("menu")}
        >
          <span className="vx-dining-highlight-kicker">
            SIGNATURE DISH
          </span>

          <h4>Kung Pao Prawns</h4>

          <p>
            Wok-fired prawns with cashew nuts, layered with spice, depth and classic Cantonese technique.
          </p>

          <span className="vx-dining-highlight-action">
            Explore menu →
          </span>
        </button>

        <button
          className="vx-dining-highlight"
          onClick={() => setDiningTab("wine")}
        >
          <span className="vx-dining-highlight-kicker">
            THE CELLAR
          </span>

          <h4>Wine Collection</h4>

          <p>
            Explore a curated cellar selected to complement
            the character of Cantonese cuisine.
          </p>

          <span className="vx-dining-highlight-action">
            Discover wine →
          </span>
        </button>
      </>
    ) : (
      exp.experience_sections
        ?.flatMap(section =>
          [...(section.experience_items || [])].sort(
            (a, b) => a.position - b.position
          )
        )
        .slice(0, 4)
        .map(item => (
          <button
            key={item.id}
            className="vx-dining-highlight"
            onClick={() => setDiningTab("menu")}
          >
            <h4>{item.name}</h4>

            <p>
              {item.description || "Discover on the menu"}
            </p>

            <span>View menu →</span>
          </button>
        ))
    )}
  </div>
</div>
                            </section>
                          )}

                          {diningTab === "menu" && (
                            <section className="vx-dining-menu">
                              <div className="vx-dining-menu-heading">
                                <span className="vx-dining-section-label">MENU - Available from Wednesday to Saturday from 17:00 to 22:00</span>
                                <h3>Discover the menu</h3>
                              </div>

                              {exp.experience_sections
                                ?.filter(section => section.experience_items?.length)
                                ?.sort((a, b) => a.position - b.position)
                                .map(section => (
                                  <div key={section.id} className="burman-spa-section">
                                    <h3>{section.name}</h3>

                                    {section.experience_items
                                      ?.sort((a, b) => a.position - b.position)
                                      .map(item => {
                                        const price =
                                          item.experience_prices?.[0]?.price;
                                        const label =
                                          item.experience_prices?.[0]?.label;

                                        return (
                                          <div key={item.id} className="burman-spa-item">
                                            <div>
                                              <h4>{item.name}</h4>
                                              {item.description && (
                                                <p>{item.description}</p>
                                              )}
                                            </div>

                                            {price && (
                                              <span className="burman-price">
                                                {label && <span>{label} — </span>}
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

                          {diningTab === "wine" && (
  <BurmanDiningWine venueName={exp.name} />
)}

                          {diningTab === "private" && (
                            <section className="vx-dining-placeholder">
                              <span className="vx-dining-section-label">
                                PRIVATE DINING
                              </span>
                              <h3>A more private experience</h3>
                              <p>
                                For private dining requests, celebrations or
                                tailored experiences, please contact Reception.
                              </p>
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