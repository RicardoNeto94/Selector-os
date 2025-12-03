"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AppearanceSettingsForm({
  restaurantId,
  initialPrimaryColor,
  initialBackgroundStyle,
  initialCardStyle,
  initialDensity,
}) {
  const supabase = createClientComponentClient();

  const [primaryColor, setPrimaryColor] = useState(
    initialPrimaryColor || "#d4af37"
  );
  const [backgroundStyle, setBackgroundStyle] = useState(
    initialBackgroundStyle || "dark"
  );
  const [cardStyle, setCardStyle] = useState(initialCardStyle || "glass");
  const [density, setDensity] = useState(initialDensity || "cozy");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("restaurants")
      .update({
        theme_primary_color: primaryColor,
        theme_background_style: backgroundStyle,
        theme_card_style: cardStyle,
        theme_density: density,
      })
      .eq("id", restaurantId);

    setSaving(false);

    if (error) {
      console.error(error);
      setMessage("Could not save changes. Try again.");
      return;
    }

    setMessage("Appearance updated.");
  }

  return (
    <form onSubmit={handleSubmit} className="so-settings-form">
      {/* Tabs header */}
      <div className="so-settings-tabs">
        <button
          type="button"
          className="so-settings-tab so-settings-tab--active"
        >
          Appearance
        </button>
        <button type="button" className="so-settings-tab so-settings-tab--ghost">
          Theme & layout
        </button>
      </div>

      {/* Primary color */}
      <div className="so-settings-row">
        <div className="so-settings-label-wrap">
          <div className="so-settings-label-title">Primary color</div>
          <p className="so-settings-hint">
            Used for highlights, buttons and key accents across SelectorOS.
          </p>
        </div>
        <div className="so-settings-control so-settings-control--color">
          <input
            type="color"
            value={primaryColor || "#d4af37"}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="so-color-input"
          />
          <input
            type="text"
            value={primaryColor || ""}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="so-text-input"
            placeholder="#d4af37"
          />
        </div>
      </div>

      {/* Background style */}
      <div className="so-settings-row">
        <div className="so-settings-label-wrap">
          <div className="so-settings-label-title">Background style</div>
          <p className="so-settings-hint">
            Light is brighter for tablets; Dark feels more cinematic for night
            service.
          </p>
        </div>
        <div className="so-settings-control">
          <select
            value={backgroundStyle}
            onChange={(e) => setBackgroundStyle(e.target.value)}
            className="so-select-input"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
      </div>

      {/* Card style */}
      <div className="so-settings-row">
        <div className="so-settings-label-wrap">
          <div className="so-settings-label-title">Card style</div>
          <p className="so-settings-hint">
            Glass gives a frosted, premium feel. Solid is higher contrast and
            easier to scan quickly.
          </p>
        </div>
        <div className="so-settings-control">
          <select
            value={cardStyle}
            onChange={(e) => setCardStyle(e.target.value)}
            className="so-select-input"
          >
            <option value="glass">Glass</option>
            <option value="solid">Solid</option>
          </select>
        </div>
      </div>

      {/* Density */}
      <div className="so-settings-row">
        <div className="so-settings-label-wrap">
          <div className="so-settings-label-title">Layout density</div>
          <p className="so-settings-hint">
            Cozy keeps things airy for fine dining. Compact lets you see more
            rows at once on busier services.
          </p>
        </div>
        <div className="so-settings-control">
          <select
            value={density}
            onChange={(e) => setDensity(e.target.value)}
            className="so-select-input"
          >
            <option value="cozy">Cozy</option>
            <option value="compact">Compact</option>
          </select>
        </div>
      </div>

      {/* Footer */}
      <div className="so-settings-footer">
        <button type="submit" className="so-settings-primary-btn" disabled={saving}>
          {saving ? "Saving…" : "Save appearance"}
        </button>
        {message && <span className="so-settings-message">{message}</span>}
      </div>
    </form>
  );
}
