// src/app/ServiceWorkerProvider.js
"use client";

import { useEffect } from "react";

export default function ServiceWorkerProvider() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
        // console.log("SW registered");
      } catch (err) {
        console.error("Service worker registration failed:", err);
      }
    };

    register();
  }, []);

  return null;
}
