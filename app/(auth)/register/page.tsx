"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Check, Users, Zap, Shield, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { savePendingProUpgrade } from "@/components/shared/PendingProUpgrade";

const PLANS: { id: "free" | "pro"; name: string; price: string; period: string; perks: string[]; highlight: boolean }[] = [
  {
    id: "free",
    name: "Gratis",
    price: "$0",
    period: "para siempre",
    perks: ["Hasta 5 usuarios", "3 proyectos activos", "100 MB almacenamiento"],
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "/ usuario / mes",
    perks: ["Usuarios ilimitados", "Proyectos ilimitados", "100 GB almacenamiento", "Soporte prioritario"],
    highlight: true,
  },
];

function Field({
  label, id, value, onChange, type = "text", placeholder, error, right,
}: {
  label: string; id: string; value: string;
  onChange: (v: string) => void; type?: string;
  placeholder?: string; error?: string;
  right?: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-800 bg-white transition placeholder:text-gray-300",
            "focus:outline-none focus:ring-2 focus:ring-[#2F3988]/20 focus:border-[#2F3988]",
            right && "pr-10",
            error ? "border-red-300 bg-red-50/30" : "border-gray-200 hover:border-gray-300"
          )}
        />
        {right && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ caracteres",       ok: password.length >= 8 },
    { label: "Letra mayúscula",      ok: /[A-Z]/.test(password) },
    { label: "Número",               ok: /\d/.test(password) },
    { label: "Carácter especial",    ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ["bg-gray-200", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-500"];
  const labels = ["", "Débil", "Regular", "Buena", "Segura"];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn("h-1 flex-1 rounded-full transition-all duration-300", i < score ? colors[score] : "bg-gray-100")}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {checks.map((c) => (
            <span key={c.label} className={cn("text-[10px] flex items-center gap-1", c.ok ? "text-green-600" : "text-gray-400")}>
              <span className={cn("w-1.5 h-1.5 rounded-full inline-block", c.ok ? "bg-green-500" : "bg-gray-300")} />
              {c.label}
            </span>
          ))}
        </div>
        <span className={cn("text-[10px] font-semibold flex-shrink-0 ml-2", score >= 3 ? "text-green-600" : score >= 2 ? "text-yellow-500" : "text-red-500")}>
          {labels[score]}
        </span>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();

  const [step,        setStep]        = useState<1 | 2>(1);
  const [name,        setName]        = useState("");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [confirmPw,   setConfirmPw]   = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [plan,        setPlan]        = useState<"free" | "pro">("pro");
  const [workspace,   setWorkspace]   = useState("");
  const [agreed,      setAgreed]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [emailSent,   setEmailSent]   = useState(false);

  const validate1 = () => {
    const e: Record<string, string> = {};
    if (!name.trim())        e.name     = "El nombre es obligatorio.";
    if (!email.trim())       e.email    = "El correo es obligatorio.";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Correo inválido.";
    if (!password)           e.password = "La contraseña es obligatoria.";
    else if (password.length < 8) e.password = "Mínimo 8 caracteres.";
    if (password !== confirmPw) e.confirmPw = "Las contraseñas no coinciden.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validate2 = () => {
    const e: Record<string, string> = {};
    if (!workspace.trim()) e.workspace = "El nombre del workspace es obligatorio.";
    if (!agreed)           e.agreed    = "Debes aceptar los términos.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate1()) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate2()) return;
    setLoading(true);

    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (signUpError) {
      setErrors({ submit: signUpError.message });
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (!userId) { setLoading(false); return; }

    const slug = workspace
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    let finalSlug = slug;
    let workspaceId: string | null = null;

    const { data: wsData, error: wsError } = await supabase
      .from("workspaces")
      .insert({ name: workspace, slug, plan, created_by: userId })
      .select("id")
      .single();

    if (wsError) {
      // Si el error es de slug duplicado, reintentamos con uno aleatorio
      if (wsError.code === "23505") {
        finalSlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
        const { data: fallbackWs, error: fallbackError } = await supabase
          .from("workspaces")
          .insert({ name: workspace, slug: finalSlug, plan, created_by: userId })
          .select("id")
          .single();
        if (fallbackError) {
          setErrors({ submit: `Error al crear el workspace: ${fallbackError.message}` });
          setLoading(false);
          return;
        }
        workspaceId = fallbackWs?.id ?? null;
      } else {
        setErrors({ submit: `Error al crear el workspace: ${wsError.message}` });
        setLoading(false);
        return;
      }
    } else {
      workspaceId = wsData?.id ?? null;
    }

    if (!data.session) {
      // Si eligió Pro, guardar para redirigir a Stripe después de confirmar email
      if (plan === "pro" && workspaceId) {
        savePendingProUpgrade(workspaceId, finalSlug);
      }
      setEmailSent(true);
      setLoading(false);
      return;
    }

    // Si eligió Pro, redirigir a Stripe Checkout
    if (plan === "pro" && workspaceId) {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, workspaceSlug: finalSlug }),
      });
      const { url, error: checkoutError } = await res.json();
      if (checkoutError || !url) {
        router.replace(`/${finalSlug}/dashboard`);
        return;
      }
      window.location.href = url;
      return;
    }

    router.replace(`/${finalSlug}/dashboard`);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-[400px] text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
            style={{ background: "linear-gradient(135deg, #2F3988 0%, #4a51a8 100%)" }}
          >
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifica tu correo</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            Te enviamos un enlace de confirmación a{" "}
            <span className="font-semibold text-gray-700">{email}</span>.<br />
            Revisa tu bandeja y haz clic en el enlace para activar tu cuenta.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #2F3988 0%, #4a51a8 100%)" }}
          >
            Ir al inicio de sesión
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* ── LEFT: Step panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
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

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                step === s
                  ? "bg-[#2F3988] text-white shadow-md shadow-[#2F3988]/30"
                  : step > s
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-400"
              )}>
                {step > s ? <Check className="w-3.5 h-3.5" /> : s}
              </div>
              <span className={cn("text-xs font-medium", step === s ? "text-gray-800" : "text-gray-400")}>
                {s === 1 ? "Tu cuenta" : "Tu workspace"}
              </span>
              {s < 2 && <div className={cn("w-8 h-px mx-1", step > s ? "bg-green-400" : "bg-gray-200")} />}
            </div>
          ))}
        </div>

        <div className="w-full max-w-[420px]">

          {/* ── STEP 1: Account ── */}
          {step === 1 && (
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Crea tu cuenta</h2>
                <p className="text-sm text-gray-500">Comienza gratis, sin tarjeta de crédito.</p>
              </div>

              {/* Social */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { name: "Google", color: "#EA4335", icon: "G" },
                  { name: "GitHub", color: "#24292E", icon: "⬡" },
                ].map((p) => (
                  <button
                    key={p.name}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors shadow-sm"
                  >
                    <span className="font-bold text-base" style={{ color: p.color }}>{p.icon}</span>
                    {p.name}
                  </button>
                ))}
              </div>

              <div className="relative flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">o con correo</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <form onSubmit={goToStep2} className="space-y-4">
                <Field
                  label="Nombre completo" id="name"
                  value={name} onChange={setName}
                  placeholder="Carlos López" error={errors.name}
                />
                <Field
                  label="Correo electrónico" id="email"
                  type="email" value={email} onChange={setEmail}
                  placeholder="tu@empresa.com" error={errors.email}
                />
                <div>
                  <Field
                    label="Contraseña" id="password"
                    type={showPw ? "text" : "password"}
                    value={password} onChange={setPassword}
                    placeholder="Mínimo 8 caracteres" error={errors.password}
                    right={
                      <button type="button" onClick={() => setShowPw((v) => !v)} className="text-gray-400 hover:text-gray-600">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                  <PasswordStrength password={password} />
                </div>
                <Field
                  label="Confirmar contraseña" id="confirmPw"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPw} onChange={setConfirmPw}
                  placeholder="Repite tu contraseña" error={errors.confirmPw}
                  right={
                    <button type="button" onClick={() => setShowConfirm((v) => !v)} className="text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99]"
                  style={{ background: "linear-gradient(135deg, #2F3988 0%, #4a51a8 100%)" }}
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          )}

          {/* ── STEP 2: Workspace + Plan ── */}
          {step === 2 && (
            <>
              <div className="mb-7">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4 transition-colors"
                >
                  ← Volver
                </button>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Configura tu workspace</h2>
                <p className="text-sm text-gray-500">Un último paso para empezar.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Workspace name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nombre del workspace</label>
                  <input
                    value={workspace}
                    onChange={(e) => setWorkspace(e.target.value)}
                    placeholder="Mi Empresa"
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-800 bg-white transition placeholder:text-gray-300",
                      "focus:outline-none focus:ring-2 focus:ring-[#2F3988]/20 focus:border-[#2F3988]",
                      errors.workspace ? "border-red-300" : "border-gray-200 hover:border-gray-300"
                    )}
                  />
                  {errors.workspace && <p className="mt-1 text-xs text-red-500 font-medium">{errors.workspace}</p>}
                  <p className="mt-1 text-xs text-gray-400">agenda.me/<span className="font-medium text-gray-600">{workspace ? workspace.toLowerCase().replace(/\s+/g, "-") : "mi-empresa"}</span></p>
                </div>

                {/* Plan selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2.5">Elige tu plan</label>
                  <div className="grid grid-cols-2 gap-3">
                    {PLANS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPlan(p.id)}
                        className={cn(
                          "relative text-left p-4 rounded-xl border-2 transition-all",
                          plan === p.id
                            ? "border-[#2F3988] bg-[#2F3988]/4 shadow-sm"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        )}
                      >
                        {p.highlight && (
                          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-[#2F3988] px-2.5 py-0.5 rounded-full whitespace-nowrap">
                            Recomendado
                          </span>
                        )}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-gray-800">{p.name}</span>
                          {plan === p.id && (
                            <div className="w-4 h-4 rounded-full bg-[#2F3988] flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="mb-3">
                          <span className="text-xl font-bold text-gray-900">{p.price}</span>
                          <span className="text-[10px] text-gray-400 ml-1">{p.period}</span>
                        </div>
                        <ul className="space-y-1">
                          {p.perks.map((perk) => (
                            <li key={perk} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                              <Check className="w-3 h-3 text-[#2F3988] flex-shrink-0" />
                              {perk}
                            </li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Terms */}
                <div>
                  <button
                    type="button"
                    onClick={() => setAgreed((v) => !v)}
                    className="flex items-start gap-2.5"
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                      agreed ? "border-[#2F3988] bg-[#2F3988]" : "border-gray-300 bg-white"
                    )}>
                      {agreed && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="text-xs text-gray-600 text-left leading-relaxed">
                      Acepto los{" "}
                      <span className="font-semibold underline" style={{ color: "#2F3988" }}>Términos de Servicio</span>
                      {" "}y la{" "}
                      <span className="font-semibold underline" style={{ color: "#2F3988" }}>Política de Privacidad</span>
                      {" "}de agenda.ME.
                    </span>
                  </button>
                  {errors.agreed && <p className="mt-1 text-xs text-red-500 font-medium ml-6.5">{errors.agreed}</p>}
                </div>

                {errors.submit && (
                  <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                    {errors.submit}
                  </div>
                )}

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
                      Creando tu cuenta...
                    </>
                  ) : (
                    <>
                      Crear cuenta
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-xs text-gray-500 mt-6">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="font-semibold hover:underline" style={{ color: "#2F3988" }}>
              Inicia sesión
            </Link>
          </p>
        </div>

        <p className="mt-10 text-[11px] text-gray-400 text-center">
          © 2025 agenda.ME · <Link href="#" className="hover:text-gray-600">Privacidad</Link> · <Link href="#" className="hover:text-gray-600">Términos</Link>
        </p>
      </div>

      {/* ── RIGHT: Benefits panel ── */}
      <div
        className="hidden lg:flex flex-col justify-center w-[440px] flex-shrink-0 relative overflow-hidden px-12 py-16"
        style={{ background: "linear-gradient(160deg, #1e2563 0%, #2F3988 50%, #3d4aa8 100%)" }}
      >
        {/* Decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #9ACCEC 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-8"
            style={{ background: "radial-gradient(circle, #7177B4 0%, transparent 70%)" }} />
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid2" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid2)" />
          </svg>
        </div>

        <div className="relative z-10 space-y-10">
          <div>
            <h3 className="text-2xl font-bold text-white mb-3 leading-tight">
              Empieza en minutos,<br />
              <span style={{ color: "#9ACCEC" }}>crece sin límites.</span>
            </h3>
            <p className="text-white/55 text-sm leading-relaxed">
              Únete a miles de equipos que ya usan agenda.ME para gestionar sus proyectos con claridad y velocidad.
            </p>
          </div>

          {[
            {
              icon: Zap,
              title: "Configuración en 2 minutos",
              desc: "Sin instalaciones. Accede desde cualquier navegador y empieza de inmediato.",
            },
            {
              icon: Users,
              title: "Colaboración sin fricciones",
              desc: "Invita a tu equipo, asigna tareas y mantén a todos alineados en tiempo real.",
            },
            {
              icon: Shield,
              title: "Seguro y confiable",
              desc: "Tus datos están cifrados y respaldados. Cumplimos con GDPR y SOC 2.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "rgba(154,204,236,0.15)" }}
              >
                <Icon className="w-5 h-5" style={{ color: "#9ACCEC" }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">{title}</p>
                <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}

          {/* Social proof */}
          <div className="pt-8 border-t border-white/10">
            <div className="flex -space-x-2 mb-3">
              {["michael", "sofia", "daniel", "emma", "carlos"].map((s) => (
                <img
                  key={s}
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s}&backgroundColor=b6e3f4`}
                  alt={s}
                  className="w-8 h-8 rounded-full border-2 border-[#2F3988]"
                />
              ))}
              <div className="w-8 h-8 rounded-full border-2 border-[#2F3988] bg-[#3d4aa8] flex items-center justify-center text-[10px] font-bold text-white">
                +2k
              </div>
            </div>
            <p className="text-xs text-white/50">
              <span className="text-white font-semibold">+2,000 equipos</span> ya confían en agenda.ME
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
