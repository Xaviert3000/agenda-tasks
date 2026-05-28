"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const FEATURES = [
  "Gestión de tareas con tableros Kanban",
  "Colaboración en tiempo real con tu equipo",
  "Documentos y wikis integrados",
  "Notificaciones y bandeja de entrada",
  "Chat interno con referencias a tareas",
];

export default function LoginPage() {
  const router = useRouter();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Por favor, completa todos los campos.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError("Correo o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    const { data: ws } = await supabase
      .from("workspaces")
      .select("slug")
      .limit(1)
      .single();

    router.replace(ws ? `/${ws.slug}/dashboard` : "/onboarding");
  };

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT: Brand panel ── */}
      <div
        className="hidden lg:flex flex-col w-[520px] flex-shrink-0 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #1e2563 0%, #2F3988 45%, #4a51a8 100%)" }}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #9ACCEC 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #7177B4 0%, transparent 70%)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
            style={{ background: "radial-gradient(circle, #9ACCEC 0%, transparent 60%)" }} />
          {/* Grid pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-auto">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center font-bold text-white text-lg">
              A
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-tight">agenda</span>
              <span className="text-[#9ACCEC] font-bold text-lg">.ME</span>
            </div>
          </div>

          {/* Main copy */}
          <div className="mt-16 mb-10">
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Todo tu equipo,<br />
              <span style={{ color: "#9ACCEC" }}>un solo lugar.</span>
            </h1>
            <p className="text-white/60 text-base leading-relaxed">
              La plataforma de gestión de proyectos que necesitas para mantener a tu equipo enfocado, organizado y en sincronía.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3 mb-auto">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#9ACCEC" }} />
                <span className="text-sm text-white/75">{f}</span>
              </li>
            ))}
          </ul>

          {/* Testimonial */}
          <div className="mt-10 pt-8 border-t border-white/10">
            <blockquote className="text-white/60 text-sm italic leading-relaxed mb-4">
              "agenda.ME transformó la manera en que trabajamos. Pasamos de emails interminables a tener todo claro en un solo lugar."
            </blockquote>
            <div className="flex items-center gap-3">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=sofia&backgroundColor=b6e3f4"
                alt="Sofía Carter"
                className="w-8 h-8 rounded-full border border-white/20"
              />
              <div>
                <p className="text-white text-xs font-semibold">Sofía Carter</p>
                <p className="text-white/40 text-xs">Diseñadora · E-Commerce Website</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-gray-50">

        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-base" style={{ background: "#2F3988" }}>
            A
          </div>
          <span className="font-bold text-xl" style={{ color: "#2F3988" }}>agenda<span className="text-gray-500">.ME</span></span>
        </div>

        <div className="w-full max-w-[400px]">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Bienvenido de vuelta</h2>
            <p className="text-sm text-gray-500">Ingresa a tu cuenta para continuar</p>
          </div>

          {/* Social login buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { name: "Google",   color: "#EA4335", icon: "G" },
              { name: "GitHub",   color: "#24292E", icon: "⬡" },
            ].map((provider) => (
              <button
                key={provider.name}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors shadow-sm"
              >
                <span className="font-bold text-base" style={{ color: provider.color }}>{provider.icon}</span>
                {provider.name}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="relative flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">o continúa con correo</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Correo electrónico
              </label>
              <input
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
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700">Contraseña</label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium hover:underline"
                  style={{ color: "#2F3988" }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={cn(
                    "w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm text-gray-800 bg-white transition placeholder:text-gray-300",
                    "focus:outline-none focus:ring-2 focus:ring-[#2F3988]/20 focus:border-[#2F3988]",
                    error ? "border-red-300 bg-red-50/30" : "border-gray-200 hover:border-gray-300"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-500 font-medium flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />
                {error}
              </p>
            )}

            {/* Remember */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setRemember((v) => !v)}
                className={cn(
                  "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                  remember ? "border-[#2F3988] bg-[#2F3988]" : "border-gray-300 bg-white"
                )}
              >
                {remember && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
              </button>
              <span className="text-xs text-gray-600">Recordar mi sesión por 30 días</span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all",
                "focus:outline-none focus:ring-2 focus:ring-[#2F3988]/30 focus:ring-offset-2",
                loading
                  ? "opacity-70 cursor-not-allowed"
                  : "hover:opacity-90 active:scale-[0.99]"
              )}
              style={{ background: "linear-gradient(135deg, #2F3988 0%, #4a51a8 100%)" }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Ingresando...
                </>
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Register link */}
          <p className="text-center text-xs text-gray-500 mt-6">
            ¿No tienes una cuenta?{" "}
            <Link
              href="/register"
              className="font-semibold hover:underline"
              style={{ color: "#2F3988" }}
            >
              Regístrate gratis
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-12 text-[11px] text-gray-400 text-center">
          © 2025 agenda.ME · <Link href="#" className="hover:text-gray-600">Privacidad</Link> · <Link href="#" className="hover:text-gray-600">Términos</Link>
        </p>
      </div>
    </div>
  );
}
