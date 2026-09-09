"use client";

import { useEffect, useState } from "react";

export default function BurmanWeather({ compact = false }) {
  const [weather, setWeather] = useState({
    loading: true,
    temp: "--",
    condition: "Loading...",
    icon: "☁️",
  });

  const [time, setTime] = useState("");

  // Live Clock
  useEffect(() => {
    const updateClock = () => {
      setTime(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Tallinn",
        })
      );
    };

    updateClock();

    const timer = setInterval(updateClock, 60000);

    return () => clearInterval(timer);
  }, []);

  // Weather
  useEffect(() => {
    async function loadWeather() {
      try {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=59.437&longitude=24.7536&current=temperature_2m,weather_code"
        );
        if (!res.ok) throw new Error("Weather unavailable");

        const data = await res.json();

        const current = data.current;

        if (!current) throw new Error("Weather unavailable");

        const conditions = {
          0: { icon: "☀️", label: "Clear Sky" },
          1: { icon: "🌤", label: "Mainly Clear" },
          2: { icon: "⛅", label: "Partly Cloudy" },
          3: { icon: "☁️", label: "Cloudy" },
          45: { icon: "🌫", label: "Fog" },
          48: { icon: "🌫", label: "Fog" },
          51: { icon: "🌦", label: "Drizzle" },
          61: { icon: "🌧", label: "Rain" },
          63: { icon: "🌧", label: "Rain" },
          65: { icon: "🌧", label: "Heavy Rain" },
          71: { icon: "❄️", label: "Snow" },
          80: { icon: "🌦", label: "Rain Showers" },
          95: { icon: "⛈", label: "Thunderstorm" },
        };

        const condition =
          conditions[current.weather_code] || {
            icon: "☁️",
            label: "Clear",
          };

        setWeather({
          loading: false,
          temp: Math.round(current.temperature_2m),
          condition: condition.label,
          icon: condition.icon,
        });
      } catch (err) {
        console.error(err);

        setWeather({
          loading: false,
          temp: "--",
          condition: "Unavailable",
          icon: "☁️",
        });
      }
    }

    loadWeather();
  }, []);

  if (compact) {
    return (
      <aside className="bh-stay-details" aria-label="Useful information for your stay">
        <div><span>Tallinn weather</span><strong>{weather.loading ? "Loading weather…" : `${weather.temp}°C · ${weather.condition}`}</strong></div>
        <div><span>Local time</span><strong>{time || "—"}</strong></div>
        <div><span>Breakfast</span><strong>Until 11:00</strong></div>
        <div><span>Dining assistance</span><strong>Reception · 800</strong></div>
      </aside>
    );
  }

  return (
    <div className="burman-weather">

      <div className="burman-weather-location">
        TALLINN
      </div>

      <div className="burman-weather-main">

        <div className="burman-weather-icon">
          {weather.icon}
        </div>

        <div className="burman-weather-temp">
          {weather.temp}°
        </div>

      </div>

      <div className="burman-weather-condition">
        {weather.condition}
      </div>

      <div className="burman-weather-divider" />

      <div className="burman-weather-section">
        <span>LOCAL TIME</span>
        <strong>{time}</strong>
      </div>

      <div className="burman-weather-divider" />

      <div className="burman-weather-section">
        <span>BREAKFAST</span>
        <strong>Until 11:00</strong>
      </div>

      <div className="burman-weather-divider" />

      <div className="burman-weather-section">
        <span>DINING</span>
        <strong>Please contact Reception</strong>
      </div>

    </div>
  );
}
