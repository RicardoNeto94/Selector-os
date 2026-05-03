"use client";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import "@/styles/burman.css";

import BurmanWeather from "@/components/BurmanWeather";
import BurmanPillowMenu from "@/components/BurmanPillowMenu";

export default function BurmanLanding({ menu }) {
  
const supabase = createClientComponentClient();  
const base = `/menu/${menu?.public_slug}`;

const [experiences, setExperiences] = useState([]);
const [openSpa, setOpenSpa] = useState(false);
const [openRoomService, setOpenRoomService] = useState(false);
const [menuOpen, setMenuOpen] = useState(false);
const [openSection, setOpenSection] = useState(null);
const [openDining, setOpenDining] = useState(false);
const [openDiningVenue, setOpenDiningVenue] = useState(null);

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
        position,
        experience_sections (
          id,
          name,
          position,
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

    if (!error) {
      setExperiences(data);
    } else {
      console.error(error);
    }
  };

  // 🔥 ONLY RUN WHEN DINING OPENS
  if (openDining) {
    loadExperiences();
  }

}, [openDining]);

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

      {/* HEADER */}
      <div className="burman-header">
        <div>HOTEL</div>
        <div className="burman-header-center">THE BURMAN</div>
        <div>TALLINN</div>
      </div>

      {/* HERO */}
      <div className="burman-hero">
        <BurmanWeather />

        <div className="burman-image-wrapper">
          <img
            src="https://theburmanhotel.com/wp-content/webp-express/webp-images/uploads/2025/05/Hero-1920x1440.jpg.webp"
            alt="Burman Hotel"
            className="burman-image"
          />
        </div>

        <div className="burman-overlay">
          <h1>
            EXTRAORDINARY<br />
            LIVING, <span>crafted for you</span>
          </h1>

          <p className="burman-award">
            MICHELIN Opening of the Year Award 2025
          </p>

          <div className="burman-michelin">
            <img src="/Clefs_Michelin-1.svg" />
            <img src="/Clefs_Michelin-1.svg" />
          </div>
        </div>
      </div>

      {/* NAV */}
      {!openSpa && !openRoomService && (
  <div className={`burman-nav ${menuOpen ? "menu-open" : ""}`}>

          <button onClick={() => setOpenRoomService(true)} className="burman-primary">
            Room Service
          </button>

          <div className="burman-links">
            <a href={`${base}?type=services`}>Rooms</a>
            <button onClick={() => setOpenDining(true)}>Dining</button>
            <button onClick={() => setOpenSpa(true)}>Spa</button>
            <a href={`${base}?type=services`}>Club</a>
          </div>

          <button className="burman-menu" onClick={() => setMenuOpen(prev => !prev)}>
            ☰
          </button>

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
                  IN ROOM <span className="of">SERVICE</span>
                </span>
                <span className="line-bottom">MENU</span>
              </h2>
            </div>

            <div className="burman-modal-body">

              {/* SNACKS */}
              <div className="burman-spa-section">
                <div className="burman-section-toggle" onClick={() => toggleSection("snacks")}>
                  Room Snacks {openSection === "snacks" ? "–" : "+"}
                </div>

                <div className={`burman-section-content ${openSection === "snacks" ? "open" : ""}`}>
                  <div className="burman-spa-item">
                    <h4>Club Sandwich</h4>
                    <span className="burman-price">€18</span>
                  </div>
                </div>
              </div>

              {/* BEVERAGES */}
              <div className="burman-spa-section">
                <div className="burman-section-toggle" onClick={() => toggleSection("bev")}>
                  Room Beverages {openSection === "bev" ? "–" : "+"}
                </div>

                <div className={`burman-section-content ${openSection === "bev" ? "open" : ""}`}>
                  <div className="burman-spa-item">
                    <h4>Champagne</h4>
                    <span className="burman-price">€16</span>
                  </div>
                </div>
              </div>

              {/* PILLOW */}
              <div className="burman-spa-section">
                <div className="burman-section-toggle" onClick={() => toggleSection("pillow")}>
                  Pillow Menu {openSection === "pillow" ? "–" : "+"}
                </div>

                <div className={`burman-section-content ${openSection === "pillow" ? "open" : ""}`}>
                  <BurmanPillowMenu />
                </div>
              </div>

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

            </div>

          </div>
        </div>
      )}

      {/* DINING MODAL */}
      {openDining && (
        <div className="burman-modal">

          <div
            className="burman-modal-backdrop"
            onClick={() => setOpenDining(false)}
          />

          <div className="burman-modal-content">

            <button
              className="burman-modal-close"
              onClick={() => setOpenDining(false)}
            >
              ✕
            </button>

            <div className="burman-modal-title">
              <h2 className="burman-heading">
                <span className="line-top">Dining</span>
                <span className="line-bottom">EXPERIENCES</span>
              </h2>
            </div>

            <div className="burman-modal-body">

  <div className="burman-modal-body">

  {experiences
    .filter(exp => exp.type === "dining")
    .map(exp => {

      const isOpen = openDiningVenue === exp.id;

      return (
        <div key={exp.id} className="burman-dining-card-wrapper">

          {/* CARD */}
          <div
            className="burman-dining-card"
            onClick={() =>
              setOpenDiningVenue(isOpen ? null : exp.id)
            }
          >
            <img
  src={
    exp.image_url && exp.image_url.startsWith("http")
      ? exp.image_url
      : exp.name?.toLowerCase().includes("koyo")
      ? "/koyo.jpg"
      : exp.name?.toLowerCase().includes("shang")
      ? "/shang.jpg"
      : exp.name?.toLowerCase().includes("lumen")
      ? "/lumen1.jpg"
      : "/placeholder.jpg"
  }
  className="burman-dining-img"
/>

            <div className="burman-dining-overlay">
              <h3>{exp.name}</h3>
            </div>
          </div>

          {/* CONTENT */}
          <div className={`burman-section-content ${isOpen ? "open" : ""}`}>

            {exp.experience_sections?.map(section => (
              <div key={section.id} className="burman-spa-section">

                <h3>{section.name}</h3>

                {section.experience_items?.map(item => {
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
            ))}

          </div>

        </div>
      );
    })}

</div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}