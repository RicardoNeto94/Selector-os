"use client";

import { useEffect, useMemo, useState } from "react";
import "../../styles/guest.css";

export default function GuestMenu({ slug }) {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState(new Set());
  const [containsMode, setContainsMode] = useState(false); // false = show all dishes, true = only dishes that CONTAIN selected allergens
  const [showFilterPanel, setShowFilterPanel] = useState(true);
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Load menu JSON from our public API
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/public-menu/${slug}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();

        const normalized = (json || []).map((d) => ({
          ...d,
          allergens: Array.isArray(d.allergens) ? d.allergens : [],
        }));

        setDishes(normalized);
      } catch (err) {
        console.error("Failed to load public menu", err);
        setError("Failed to load menu. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (slug) load();
  }, [slug]);

  // Unique sorted allergen codes
  const allergenList = useMemo(() => {
    const set = new Set();
    dishes.forEach((d) => (d.allergens || []).forEach((a) => set.add(a)));
    return Array.from(set).sort();
  }, [dishes]);

  // Unique sorted category list
  const categoryList = useMemo(() => {
    const set = new Set();
    dishes.forEach((d) => {
      if (d.category) set.add(d.category);
    });
    return Array.from(set).sort();
  }, [dishes]);

  const hasFilters = selectedAllergens.size > 0;

  // Safe count for dock: how many dishes do NOT contain selected allergens,
  // respecting the current category filter (if any).
  const safeCount = useMemo(() => {
    if (!hasFilters) {
      return dishes.filter((d) =>
        selectedCategory ? d.category === selectedCategory : true
      ).length;
    }

    let safe = 0;
    dishes.forEach((d) => {
      if (selectedCategory && d.category !== selectedCategory) return;
      const hasSelected = (d.allergens || []).some((code) =>
        selectedAllergens.has(code)
      );
      if (!hasSelected) safe += 1;
    });
    return safe;
  }, [dishes, hasFilters, selectedAllergens, selectedCategory]);

  // Main dish list logic
  const filteredDishes = useMemo(() => {
    let list = dishes;

    // Apply category filter first
    if (selectedCategory) {
      list = list.filter((d) => d.category === selectedCategory);
    }

    if (!hasFilters) {
      // No allergen filters selected → show all (respecting category filter only)
      return list;
    }

    return list.filter((d) => {
      const dishAllergens = d.allergens || [];
      const hasSelected = dishAllergens.some((code) =>
        selectedAllergens.has(code)
      );

      // Contains mode ON → only dishes that contain selected allergen(s)
      if (containsMode) {
        return hasSelected;
      }

      // Contains mode OFF → show everything (we just use badges for SAFE / Contains)
      return true;
    });
  }, [dishes, hasFilters, selectedAllergens, containsMode, selectedCategory]);

  const handleToggleAllergen = (code) => {
    setSelectedAllergens((prev) => {
      const next = new Set(prev);
      if (next.
