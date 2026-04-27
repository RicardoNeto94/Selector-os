"use client";

import { useEffect, useState } from "react";

export default function BurmanWeather() {

  const [weather, setWeather] = useState(null);

  useEffect(() => {

    const fetchWeather = async (lat, lon) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
        );

        const data = await res.json();

        const conditionMap = {
          0: { label: "Clear sky", icon: "☀️" },
          1: { label: "Mainly clear", icon: "🌤" },
          2: { label: "Partly cloudy", icon: "⛅" },
          3: { label: "Cloudy", icon: "☁️" },
          45: { label: "Fog", icon: "🌫" },
          48: { label: "Fog", icon: "🌫" },
          51: { label: "Light drizzle", icon: "🌦" },
          61: { label: "Rain", icon: "🌧" },
          71: { label: "Snow", icon: "❄️" },
          80: { label: "Rain showers", icon: "🌦" },
          95: { label: "Thunderstorm", icon: "⛈" },
        };

        const current = data?.current_weather;

        if (!current) return;

        const mapped = conditionMap[current.weathercode] || {
          label: "Clear",
          icon: "☀️"
        };

        setWeather({
          temp: Math.round(current.temperature),
          wind: Math.round(current.windspeed),
          condition: mapped.label,
          icon: mapped.icon,
        });

      } catch (err) {
        console.error("Weather error:", err);
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeather(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        fetchWeather(59.437, 24.7536); // Tallinn fallback
      }
    );

  }, []);

  if (!weather) return null;

  return (
    <div
      className="burman-weather"
      style={{
        position: "absolute",
        top: "60px",
        left: "60px",
        zIndex: 50   // 🔥 THIS FIXES IT
      }}
    >

      <div className="burman-weather-location">
        Tallinn
      </div>

      <div className="burman-weather-main">
        <div className="burman-weather-icon">
          {weather.icon}
        </div>

        <div className="burman-weather-temp">
          {weather.temp}°C
        </div>
      </div>

      <div className="burman-weather-condition">
        {weather.condition}
      </div>

      <div className="burman-weather-feels">
        Wind {weather.wind} km/h
      </div>

    </div>
  );
}