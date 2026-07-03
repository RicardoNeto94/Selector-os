"use client";

import { useEffect, useState } from "react";

export default function BurmanWeather() {
  const [weather, setWeather] = useState({
    loading: true,
    temp: "--",
    wind: "--",
    condition: "Loading...",
    icon: "☁️",
  });

  useEffect(() => {
    async function loadWeather() {
      try {
        // Tallinn coordinates
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=59.437&longitude=24.7536&current=temperature_2m,weather_code,wind_speed_10m"
        );

        const data = await res.json();

        console.log("Weather:", data);

        const current = data.current;

        if (!current) return;

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
          wind: Math.round(current.wind_speed_10m),
          condition: condition.label,
          icon: condition.icon,
        });
      } catch (err) {
        console.error(err);

        setWeather({
          loading: false,
          temp: "--",
          wind: "--",
          condition: "Unavailable",
          icon: "☁️",
        });
      }
    }

    loadWeather();
  }, []);

  return (
    <div className="burman-weather">
      <div className="burman-weather-location">
        Tallinn
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

      <div className="burman-weather-feels">
        Wind {weather.wind} km/h
      </div>
    </div>
  );
}