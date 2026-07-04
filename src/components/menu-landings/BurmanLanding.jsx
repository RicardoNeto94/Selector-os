"use client";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import "@/styles/burman.css";

import BurmanWeather from "@/components/BurmanWeather";
import BurmanPillowMenu from "@/components/BurmanPillowMenu";
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

{!openSpa && !openRoomService && (

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

    <h3>Room Service</h3>

    <p>Private Dining</p>

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
        <div className="burman-modal">
          <div className="burman-modal-backdrop" onClick={() => setOpenRoomService(false)} />

          <div className="burman-modal-content">

            <button className="burman-modal-close" onClick={() => setOpenRoomService(false)}>
              ✕
            </button>

            <div className="burman-modal-title">
              <h2 className="burman-heading">
                <span className="line-top">
                  In Room <span className="of"></span>
                </span>
                <span className="line-bottom">SELECTION</span>
              </h2>
            </div>

            <div className="burman-modal-body">
              
  <div className="burman-modal-intro" style={{ textAlign: "center", marginBottom: 30 }}>
    <p>
      A refined selection of in-room comforts, curated to elevate your stay with
    ease, privacy, and understated elegance.
    </p>

    <p>From light snacks and carefully selected beverages to a personalised pillow
    menu, each element is designed to enhance relaxation and create a sense of
    quiet indulgence within your room.
  </p>
  </div>

<div className="burman-divider" />
<div className="burman-room-subtitle">
  Curated comforts for your stay
</div>
  {/* TABS */}
  <div style={{
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginBottom: 30
  }}>
    {[
      { key: "snacks", label: "Snacks" },
      { key: "drinks", label: "Drinks" },
      { key: "amenities", label: "Amenities" },
      { key: "pillow", label: "Pillow" }
    ].map(tab => (
      <button
        key={tab.key}
        onClick={() => setRoomTab(tab.key)}
        style={{
          padding: "8px 0",
          margin: "0 14px",
          border: "none",
          background: "transparent",
          color: roomTab === tab.key ? "#3a2a24" : "#8a7a70",
          fontSize: 14,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          cursor: "pointer"
        }}
      >
        {tab.label}
      </button>
    ))}
  </div>

  {/* EMPTY STATE */}
  {!roomServiceExp && (
    <div style={{ textAlign: "center", opacity: 0.6 }}>
      No room service available
    </div>
  )}

  {/* SNACKS / DRINKS / AMENITIES */}
  {["snacks", "drinks", "amenities"].includes(roomTab) && (
    roomServiceExp?.experience_sections
  ?.filter(section =>
    section.type === roomTab &&
    section.experience_items?.length
  )
      ?.sort((a, b) => a.position - b.position)
      .map(section => (
        <div key={section.id} className="burman-spa-section">

          <h3>{section.name}</h3>

          {section.experience_items
            ?.sort((a, b) => a.position - b.position)
            .map(item => {
              const price = item.experience_prices?.[0]?.price;
              const label = item.experience_prices?.[0]?.label;

              return (
                <div key={item.id} className="burman-spa-item">
                  <div>
                    <h4>{item.name}</h4>
                    {item.description && <p>{item.description}</p>}
                  </div>

                  {price && (
                    <span className="burman-price">
                      {label && <span>{label} — </span>}€{price}
                    </span>
                  )}
                </div>
              );
            })}

        </div>
      ))
  )}

  {/* FOOTER */}
  {roomServiceExp?.footer?.trim() && (
    <div className="burman-disclaimer">
      {roomServiceExp.footer}
    </div>
  )}

</div>

            </div>

          </div>
      )}
      

      {/* SPA MODAL */}
      {openSpa && (
  <div className="burman-modal">

    <div
      className="burman-modal-backdrop"
      onClick={() => setOpenSpa(false)}
    />

    <div className="burman-modal-content">

      <button
        className="burman-modal-close"
        onClick={() => setOpenSpa(false)}
      >
        ✕
      </button>

      <div className="burman-modal-title">
       <div className="burman-modal-hero">

  <img
    src="/spa.jpg"
    alt="Burman Spa"
    className="burman-modal-hero-img"
  />

  {/* 🔥 OVERLAY TITLE */}
  <div className="burman-modal-hero-overlay">
    <h2 className="burman-heading burman-heading--hero">
      <span className="line-top">
        AN OASIS <span className="of">OF</span>
      </span>
      <span className="line-bottom">SERENITY</span>
    </h2>
  </div>

</div>

        <div className="burman-divider"></div>

        {/* 🔥 ADD YOUR 2-COLUMN TEXT HERE */}
        <div className="burman-modal-intro">
          <p>
            At the boutique Burman Spa, discover an oasis of serenity and quiet contentment; a tranquil experience for mind, body and soul. Immerse yourself in a bespoke wellness journey with customised treatments in partnership with Biologique Recherche, the prestigious Parisian brand renowned for its unique and highly effective therapies.
          </p>
          <p>
            Luxuriate in the transformative power of sensorial rejuvenation, and the elemental harmony of soothing sounds and crystal-clear waters. A haven of holistic wellbeing that will leave you with a sense of profound renewal and inner peace.
          </p>
        </div>

      </div>

      {/* 🔥 IMPORTANT */}
      <div className="burman-modal-body">

              {categories.map(cat => {
  const catItems = items.filter(i => i.category_id === cat.id);

  if (!catItems.length) return null;

  return (
    <div key={cat.id} className="burman-spa-section">

      <h3>{cat.name}</h3>

      {catItems.map(item => {
        const prices = pricesMap[item.id] || [];

        return (
          <div key={item.id} className="burman-spa-item">
            <div>
              <h4>{item.name}</h4>
              {item.description && <p>{item.description}</p>}
            </div>

            <div className="burman-pricing-vertical">
              {prices.map(p => (
                <div key={p.id} className="burman-price-row">
                  <span>{p.label || p.duration}</span>
                  <span>€{p.price}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

    </div>
  );
})}
<div
className="
burman-spa-info-trigger-wrap
"
style={{
marginTop:"70px",
marginBottom:"20px",
display:"flex",
justifyContent:"center"
}}
>

<button
onClick={() => setOpenSpaInfo(true)}
style={{

padding:"18px 34px",

background:"rgba(255,255,255,.03)",

border:"1px solid rgba(138,122,112,.15)",

borderRadius:"999px",

backdropFilter:"blur(25px)",

color:"#8a3a2c",

fontSize:"11px",

letterSpacing:"0.32em",

textTransform:"uppercase",

cursor:"pointer",

transition:"all .4s ease",

boxShadow:
"0 10px 40px rgba(0,0,0,.06)"

}}
>

Wellness Information

</button>

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
            }}
          />

          <div className="burman-modal-content">
            <button
              className="burman-modal-close"
              onClick={() => {
                setOpenDining(false);
                setOpenDiningVenue(null);
              }}
            >
              ✕
            </button>

            <div className="vx-dining-shell">
              {!openDiningVenue ? (
                <>
                  <section className="vx-dining-intro">
                    <img
                      src="/homepage/dining.jpg"
                      alt="Dining at The Burman"
                      className="vx-dining-intro-image"
                    />

                    <div className="vx-dining-intro-copy">
                      <span className="vx-dining-kicker">
                        THE BURMAN · TALLINN
                      </span>

                      <h2>Dining</h2>

                      <p>
                        A collection of distinctive culinary experiences,
                        shaped by craft, character and exceptional hospitality.
                      </p>
                    </div>
                  </section>

                  <section className="vx-dining-body">
                    <div className="vx-dining-section-head">
                      <div>
                        <span>MICHELIN SELECTED EXPERIENCES</span>
                        <h3>Choose your experience</h3>
                      </div>
                    </div>

                    <div className="vx-dining-venues">
                      {experiences
                        .filter(
                          exp => exp.type?.toLowerCase() === "dining"
                        )
                        .sort((a, b) => a.position - b.position)
                        .map(exp => {
                          const image =
                            exp.image_url &&
                            exp.image_url.startsWith("http")
                              ? exp.image_url
                              : exp.name?.toLowerCase().includes("koyo")
                              ? "/koyo.jpg"
                              : exp.name?.toLowerCase().includes("shang")
                              ? "/shang.jpg"
                              : exp.name?.toLowerCase().includes("lumen")
                              ? "/lumen1.jpg"
                              : "/placeholder.jpg";

                          return (
                            <button
                              key={exp.id}
                              className="vx-dining-venue"
                              onClick={() => {
                                setSelectedDining(exp.id);
                                setOpenDiningVenue(exp.id);
                              }}
                            >
                              <img src={image} alt={exp.name} />

                              <div className="vx-dining-venue-copy">
                                <small>DINING EXPERIENCE</small>
                                <h4>{exp.name}</h4>

                                {exp.schedule && <p>{exp.schedule}</p>}

                                <span className="vx-dining-explore">
                                  Explore <span aria-hidden="true">→</span>
                                </span>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </section>
                </>
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

                    return (
                      <div key={exp.id} className="vx-dining-detail">
                        <section className="vx-dining-detail-hero">
                          <img src={image} alt={exp.name} />

                          <button
                            className="vx-dining-back"
                            onClick={() => setOpenDiningVenue(null)}
                          >
                            ← Dining
                          </button>

                          <div className="vx-dining-detail-copy">
                            <span className="vx-dining-kicker">
                              THE BURMAN · DINING
                            </span>

                            <h2>{exp.name}</h2>

                            {exp.schedule && (
                              <div className="vx-dining-schedule">
                                {exp.schedule}
                              </div>
                            )}
                          </div>
                        </section>

                        <section className="vx-dining-menu">
                          {exp.experience_sections
                            ?.filter(
                              section =>
                                section.experience_items?.length
                            )
                            ?.sort((a, b) => a.position - b.position)
                            .map(section => (
                              <div
                                key={section.id}
                                className="burman-spa-section"
                              >
                                <h3>{section.name}</h3>

                                {section.experience_items
                                  ?.sort(
                                    (a, b) => a.position - b.position
                                  )
                                  .map(item => {
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