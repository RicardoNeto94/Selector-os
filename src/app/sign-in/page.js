"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; // ⬅️ add this
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import "../../styles/auth.css";

export default function SignInPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in both fields.");
      return;
    }

    try {
      setLoading(true);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to sign in.");
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      {/* center card */}
      <div className="auth-card">
        {/* floating SelectorOS logo i*
