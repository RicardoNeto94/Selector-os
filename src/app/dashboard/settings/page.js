// src/app/dashboard/settings/page.js
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import '../../styles/dashboard.css';
import AppearanceSettingsForm from './AppearanceSettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = createServerComponentClient({ cookies });

  // 1) Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // 2) Load this user's restaurant
  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (error || !restaurant) {
    console.error('Settings: no restaurant found', error);
    return (
      <main className="so-main">
        <div className="so-card">
          <h1 className="so-metric-main">Settings</h1>
          <p className="so-metric-sub">
            No restaurant is linked to this account yet. Create one first.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="so-main page-fade">
      <div className="so-card" style={{ marginBottom: '18px' }}>
        <h1 className="so-metric-main">Settings</h1>
        <p className="so-metric-sub">
          Tune how SelectorOS looks and behaves for this restaurant.
        </p>
      </div>

      <div className="so-grid-lg">
        {/* Left: Appearance settings */}
        <div className="so-card">
          <div className="so-card-header">
            <div className="so-card-title">
              <span className="so-card-pill">Appearance</span>
              <span>Theme & layout</span>
            </div>
          </div>

          <AppearanceSettingsForm
            restaurantId={restaurant.id}
            initialPrimaryColor={restaurant.theme_primary_color}
            initialBackgroundStyle={restaurant.theme_background_style}
            initialCardStyle={restaurant.theme_card_style}
            initialDensity={restaurant.theme_density}
          />
        </div>

        {/* Right: placeholder for future sections */}
        <div className="so-card">
          <div className="so-card-header">
            <div className="so-card-title">
              <span className="so-card-pill">Coming soon</span>
              <span>Branding & staff</span>
            </div>
          </div>
          <p className="so-metric-sub">
            Logo upload, staff roles, QR codes and integrations will live here.
          </p>
        </div>
      </div>
    </main>
  );
}
