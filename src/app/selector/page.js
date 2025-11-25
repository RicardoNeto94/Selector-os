'use client';

import { useEffect, useState } from 'react';

// 🔥 THEME INJECTION FUNCTION — added at top
function applyTheme(theme) {
  if (!theme) return;

  const root = document.documentElement;

  if (theme.theme_primary_color)
    root.style.setProperty("--primary", theme.theme_primary_color);

  if (theme.theme_secondary_color)
    root.style.setProperty("--secondary", theme.theme_secondary_color);

  if (theme.theme_accent_color)
    root.style.setProperty("--accent", theme.theme_accent_color);

  if (theme.theme_font)
    root.style.setProperty("--font", theme.theme_font);

  if (theme.theme_card_style)
    root.style.setProperty("--card-style", theme.theme_card_style);

  // Background image
  if (theme.theme_background_url) {
    document.body.style.backgroundImage = `url(${theme.theme_background_url})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
  }

  // Optional logo element
  const logoEl = document.getElementById("restaurant-logo");
  if (logoEl && theme.theme_logo_url) {
    logoEl.src = theme.theme_logo_url;
  }
}

export default function SelectorPage() {
  const [restaurant, setRestaurant] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [dishAllergens, setDishAllergens] = useState({});
  const [allergenCatalog, setAllergenCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Guest's selected allergies (codes like ['GA','GL'])
  const [activeAllergies, setActiveAllergies] = useState([]);

  useEffect(() =>
