"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Por favor ingresa tu correo electrónico.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (resetError) {
      setError("No pudimos enviar el correo. Verifica que la dirección sea correcta.");
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-[400px] text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
            style={{ background: "linear-gradient(135deg, #2F3988 0%, #4a51a8 100%)" }}
          >
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Revisa tu correo</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            Enviamos un enlace de recuperación a{" "}
            <span className="font-semibold text-gray-700">{email}</span>.<br />
            Haz clic en el enlace para crear una nueva contraseña.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #2F3988 0%, #4a51a8 100%)" }}
          >
            Volver al inicio de sesión
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* ── LEFT: Brand panel ── */}
      <div
        className="hidden lg:flex flex-col w-[520px] flex-shrink-0 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #1e2563 0%, #2F3988 45%, #4a51a8 100%)" }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #9ACCEC 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #7177B4 0%, transparent 70%)" }} />
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col justify-center h-full px-12">
          <div className="flex items-center gap-2.5 mb-10">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-sm"
              style={{ background: "linear-gradient(135deg, #2F3988 0%, #7177B4 100%)" }}
            >
              A
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              agenda<span className="text-white/50">.ME</span>
            </span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            ¿Olvidaste tu<br />
            <span style={{ color: "#9ACCEC" }}>contraseña?</span>
          </h2>
          <p className="text-white/55 text-sm leading-relaxed">
            No te preocupes. Te enviamos un enlace a tu correo para que puedas crear una nueva contraseña de forma segura.
          </p>
        </div>
      </div>

      {/* ── RIGHT: Form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Logo (mobile) */}
        <div className="flex items-center gap-2.5 mb-8 lg:hidden">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-sm"
            style={{ background: "linear-gradient(135deg, #2F3988 0%, #7177B4 100%)" }}
          >
            A
          </div>
          <span className="font-bold text-xl tracking-tight" style={{ color: "#2F3988" }}>
            agenda<span className="text-gray-400">.ME</span>
          </span>
        </div>

        <div className="w-full max-w-[420px]">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-7 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al inicio de sesión
          </Link>

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Recupera tu cuenta</h2>
            <p className="text-sm text-gray-500">
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                autoComplete="email"
                className={cn(
                  "w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-800 bg-white transition placeholder:text-gray-300",
                  "focus:outline-none focus:ring-2 focus:ring-[#2F3988]/20 focus:border-[#2F3988]",
                  error ? "border-red-300 bg-red-50/30" : "border-gray-200 hover:border-gray-300"
                )}
              />
              {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all",
                "focus:outline-none focus:ring-2 focus:ring-[#2F3988]/30 focus:ring-offset-2",
                loading ? "opacity-70 cursor-not-allowed" : "hover:opacity-90 active:scale-[0.99]"
              )}
              style={{ background: "linear-gradient(135deg, #2F3988 0%, #4a51a8 100%)" }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Enviando...
                </>
              ) : (
                <>
                  Enviar enlace de recuperación
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            ¿Recordaste tu contraseña?{" "}
            <Link href="/login" className="font-semibold hover:underline" style={{ color: "#2F3988" }}>
              Inicia sesión
            </Link>
          </p>
        </div>

        <p className="mt-10 text-[11px] text-gray-400 text-center">
          © 2025 agenda.ME ·{" "}
          <Link href="#" className="hover:text-gray-600">Privacidad</Link> ·{" "}
          <Link href="#" className="hover:text-gray-600">Términos</Link>
        </p>
      </div>
    </div>
  );
}
