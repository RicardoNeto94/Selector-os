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
          0: "Clear sky",
          1: "Mainly clear",
          2: "Partly cloudy",
          3: "Cloudy",
          45: "Fog",
          48: "Fog",
          51: "Light drizzle",
          61: "Rain",
          71: "Snow",
          80: "Rain showers",
          95: "Thunderstorm",
        };

        setWeather({
          temp: Math.round(data.current_weather.temperature),
          wind: Math.round(data.current_weather.windspeed),
          condition: conditionMap[data.current_weather.weathercode] || "Clear",
        });

      } catch (err) {
        console.error(err);
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeather(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        // fallback Tallinn
        fetchWeather(59.437, 24.7536);
      }
    );

  }, []);

  if (!weather) return null;

  return (
    <div className="burman-weather">

      <div className="burman-weather-top">
        <span className="burman-weather-location">TALLINN</span>
      </div>

      <div className="burman-weather-main">
        <div className="burman-weather-icon">❄</div>

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