"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export default function PostHogProvider({ children }) {
  useEffect(() => {
    posthog.init(
      process.env.NEXT_PUBLIC_POSTHOG_KEY,
      {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: true,
      }
    );
  }, []);

  return children;
}