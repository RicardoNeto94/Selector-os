"use client";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import "@/styles/burman.css";

export default function BurmanLanding({ menu }) {

  const base = `/menu/${menu.public_slug}`;
  const supabase = createClientComponentClient();

  const [openSpa, setOpenSpa] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!menu?.id) return;

    const loadData = async () => {

      const { data: cats = [] } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("menu_id", menu.id)
        .eq("type", "services")
        .order("position");

      const { data: its = [] } = await supabase
        .from("menu_items")
        .select("*")
        .eq("menu_id", menu.id)
        .eq("type", "services")
        .order("position");

      setCategories(cats);
      setItems(its);
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

      {/* FLOATING NAV (DESKTOP ONLY FEEL) */}
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

        <button
          className="burman-menu"
          onClick={() => setMenuOpen(true)}
        >
          ☰
        </button>

      </div>

      {/* 🔥 AMAN STYLE FULLSCREEN MENU */}
      {menuOpen && (
        <div className="burman-fullscreen-menu">

          <button
            className="burman-fullscreen-close"
            onClick={() => setMenuOpen(false)}
          >
            ✕
          </button>

          <div className="burman-fullscreen-links">

            <a href={`${base}?type=services`}>Rooms</a>
            <a href={`${base}?type=food`}>Dining</a>

            <button onClick={() => {
              setOpenSpa(true);
              setMenuOpen(false);
            }}>
              Spa
            </button>

            <a href={`${base}?type=services`}>Bombay Club</a>

            <a href="https://maps.google.com" target="_blank">
              Location
            </a>

          </div>

        </div>
      )}

      {/* SPA MODAL stays unchanged */}
      {openSpa && (
        <div className="burman-modal">
          <div className="burman-modal-backdrop" onClick={() => setOpenSpa(false)} />
          <div className="burman-modal-content">
            <button className="burman-modal-close" onClick={() => setOpenSpa(false)}>✕</button>

            <div className="burman-modal-header">
              <h2>Burman Spa</h2>
              <p>Luxury treatments designed to restore balance.</p>
            </div>

            <div className="burman-modal-body">
              {categories.map(cat => {
                const catItems = items.filter(i => i.category_id === cat.id);
                if (!catItems.length) return null;

                return (
                  <div key={cat.id} className="burman-spa-section">
                    <h3>{cat.name}</h3>

                    {cat.description && (
                      <p className="burman-spa-description">
                        {cat.description}
                      </p>
                    )}

                    {catItems.map(item => (
                      <div key={item.id} className="burman-spa-item">
                        <div>
                          <h4>{item.name}</h4>
                          {item.description && <p>{item.description}</p>}
                          {item.duration && <span>{item.duration}</span>}
                        </div>
                        <div>{item.price ? `€${item.price}` : ""}</div>
                      </div>
                    ))}
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