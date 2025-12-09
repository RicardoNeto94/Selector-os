// src/app/dashboard/settings/AppearanceSettingsForm.jsx
'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AppearanceSettingsForm({
  restaurantId,
  initialPrimaryColor,
  initialBackgroundStyle,
  initialCardStyle,
  initialDensity,
}) {
  const supabase = createClientComponentClient();

  const [primaryColor, setPrimaryColor] = useState(
    initialPrimaryColor || '#d4af37'
  );
  const [backgroundStyle, setBackgroundStyle] = useState(
    initialBackgroundStyle || 'light'
  );
  const [cardStyle, setCardStyle] = useState(initialCardStyle || 'glass');
  const [density, setDensity] = useState(initialDensity || 'cozy');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from('restaurants')
      .update({
        theme_primary_color: primaryColor,
        theme_background_style: backgroundStyle,
        theme_card_style: cardStyle,
        theme_density: density,
      })
      .eq('id', restaurantId);

    if (error) {
      console.error('Failed to save appearance settings', error);
      setMessage({ type: 'error', text: 'Could not save settings. Try again.' });
    } else {
      setMessage({ type: 'success', text: 'Appearance saved.' });
    }

    setSaving(false);
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 text-slate-900">
      {/* Title & section label – match logo card hierarchy */}
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-slate-900">
          Appearance
        </h2>
        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
          Theme &amp; layout
        </p>
      </div>

      {/* Primary color */}
      <div className="space-y-1 text-sm">
        <label className="text-xs font-medium text-slate-800">
          Primary color
        </label>
        <p className="text-[11px] text-slate-500">
          Used for highlights, buttons and key accents across SelectorOS.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <div
            className="h-8 w-10 rounded-lg border border-slate-200 shadow-sm"
            style={{ backgroundColor: primaryColor }}
          />
          <input
            type="text"
            className="so-input w-40"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            placeholder="#d4af37"
          />
        </div>
      </div>

      {/* Background style */}
      <div className="space-y-1 text-sm">
        <label className="text-xs font-medium text-slate-800">
          Background style
        </label>
        <p className="text-[11px] text-slate-500">
          Light is brighter for tablets; Dark feels more cinematic for night
          service.
        </p>
        <select
          className="so-select mt-2 w-40"
          value={backgroundStyle}
          onChange={(e) => setBackgroundStyle(e.target.value)}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      {/* Card style */}
      <div className="space-y-1 text-sm">
        <label className="text-xs font-medium text-slate-800">
          Card style
        </label>
        <p className="text-[11px] text-slate-500">
          Glass gives a frosted, premium feel. Solid is higher contrast and
          easier to scan quickly.
        </p>
        <select
          className="so-select mt-2 w-40"
          value={cardStyle}
          onChange={(e) => setCardStyle(e.target.value)}
        >
          <option value="glass">Glass</option>
          <option value="solid">Solid</option>
        </select>
      </div>

      {/* Layout density */}
      <div className="space-y-1 text-sm">
        <label className="text-xs font-medium text-slate-800">
          Layout density
        </label>
        <p className="text-[11px] text-slate-500">
          Cozy keeps things airy for fine dining. Compact lets you see more rows
          at once on busier services.
        </p>
        <select
          className="so-select mt-2 w-40"
          value={density}
          onChange={(e) => setDensity(e.target.value)}
        >
          <option value="cozy">Cozy</option>
          <option value="compact">Compact</option>
        </select>
      </div>

      {/* Save */}
      <div className="pt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="so-button-primary disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save appearance'}
        </button>
        {message && (
          <span
            className={`text-xs ${
              message.type === 'success'
                ? 'text-emerald-600'
                : 'text-red-600'
            }`}
          >
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}
