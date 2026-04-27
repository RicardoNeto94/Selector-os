"use client";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import "@/styles/burman.css";

// OPTIONAL (safe — remove if not created yet)
import BurmanWeather from "@/components/BurmanWeather";

export default function BurmanLanding({ menu }) {

  const base = `/menu/${menu.public_slug}`;
  const supabase = createClientComponentClient();

  const [openSpa, setOpenSpa] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [pricesMap, setPricesMap] = useState({});

  // 🔥 FIX: allow scroll when modal/menu is open
  useEffect(() => {
    if (openSpa || menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [openSpa, menuOpen]);

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

  return (
    <div className="burman-root">

      {/* HEADER */}
      <div className="burman-header">
        <div>HOTEL</div>
        <div className="burman-header-center">THE BURMAN</div>
        <div>TALLINN</div>
      </div>

      {/* HERO */}
      <div className="burman-hero">

        {/* WEATHER (safe optional) */}
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
        </div>
      </div>

      {/* FLOATING NAV */}
      {!openSpa && !menuOpen && (
        <div className="burman-nav">

          <a
            href="https://your-booking-link.com"
            target="_blank"
            rel="noopener noreferrer"
            className="burman-primary"
          >
            Check availability
          </a>

          <div className="burman-links">
            <a href={`${base}?type=services`}>Rooms</a>
            <a href={`${base}?type=food`}>Dining</a>
            <button onClick={() => setOpenSpa(true)}>Spa</button>
            <a href={`${base}?type=services`}>Club</a>
          </div>

          {/* 🔥 FIX: ensure button is always clickable */}
          <button
            className="burman-menu"
            onClick={() => setMenuOpen(true)}
            style={{ zIndex: 6000 }}
          >
            ☰
          </button>

        </div>
      )}

      {/* FULLSCREEN MENU */}
      {menuOpen && (
        <div className="burman-fullscreen-menu" style={{ zIndex: 5000 }}>

          <button
            className="burman-fullscreen-close"
            onClick={() => setMenuOpen(false)}
          >
            ✕
          </button>

          <div className="burman-fullscreen-links">

            <a href={`${base}?type=services`}>Rooms</a>
            <a href={`${base}?type=food`}>Dining</a>

            <button
              onClick={() => {
                setOpenSpa(true);
                setMenuOpen(false);
              }}
            >
              Spa
            </button>

            <a href={`${base}?type=services`}>Club</a>

            <a href="https://maps.google.com" target="_blank">
              Location
            </a>

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

              <h2 className="burman-heading">
                <span className="line-top">
                  AN OASIS <span className="of">OF</span>
                </span>

                <span className="line-bottom">
                  SERENITY
                </span>
              </h2>

              <div className="burman-divider"></div>

              <div className="burman-modal-intro">
                <p>
                  At the boutique Burman Spa, discover an oasis of serenity and quiet contentment.
                </p>

                <p>
                  Luxuriate in the transformative power of sensorial rejuvenation.
                </p>
              </div>

            </div>

            <div className="burman-modal-body">

              {/* 🔥 SAFE GUARD */}
              {categories.length === 0 && (
                <p style={{ textAlign: "center" }}>No services available</p>
              )}

              {categories.map(cat => {

                const catItems = items.filter(
                  i => i.category_id === cat.id
                );

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
                                <span className="burman-duration">
                                  {p.label || p.duration}
                                </span>
                                <span className="burman-price">
                                  €{p.price}
                                </span>
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

    </div>
  );
}