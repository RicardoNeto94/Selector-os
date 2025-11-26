"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "../globals.css";

export default function DashboardLayout({ children }) {
  const [logoSmall, setLogoSmall] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const timer = setTimeout(() => setLogoSmall(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Utility for active link highlighting
  const isActive = (href) => pathname.startsWith(href);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r shadow-sm flex flex-col px-6 py-8 space-
