"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Check, Building2, ListTodo, UserCheck, Rocket,
  ChevronLeft, Users, Zap,
} from "lucide-react";
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

const STEPS = [
  { id: 1, label: "Tu espacio",     icon: Building2 },
  { id: 2, label: "Primera tarea",  icon: ListTodo  },
  { id: 3, label: "Asigna",         icon: UserCheck },
  { id: 4, label: "¡Listo!",        icon: Rocket    },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-10">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center gap-1.5">
          <div className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
            current === s.id
              ? "bg-[#2F3988] text-white shadow-md shadow-[#2F3988]/30"
              : current > s.id
              ? "bg-green-500 text-white"
              : "bg-gray-100 text-gray-400"
          )}>
            {current > s.id ? <Check className="w-3.5 h-3.5" /> : s.id}
          </div>
          <span className={cn(
            "text-xs font-medium hidden sm:block",
            current === s.id ? "text-gray-800" : "text-gray-400"
          )}>
            {s.label}
          </span>
          {i < STEPS.length - 1 && (
            <div className={cn("w-6 h-px mx-1", current > s.id ? "bg-green-400" : "bg-gray-200")} />
          )}
        </div>
      ))}
    </div>
  );
}

function RightPanel({ step }: { step: number }) {
  const content = {
    1: {
      emoji: "🏢",
      title: "Tu espacio de trabajo, tu identidad.",
      body: "El workspace es donde tu equipo colabora. Elige un nombre claro para que todos sepan dónde están.",
      preview: (
        <div className="bg-white/10 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg font-bold text-white">M</div>
            <div>
              <p className="text-white text-sm font-semibold">Mi Empresa</p>
              <p className="text-white/50 text-xs">mi-empresa.sellpulse.com</p>
            </div>
          </div>
          <div className="h-px bg-white/10" />
          <div className="space-y-2">
            {["Proyectos", "Tareas", "Mensajes"].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-white/60 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                {item}
              </div>
            ))}
          </div>
        </div>
      ),
    },
    2: {
      emoji: "✅",
      title: "Las tareas son el corazón del proyecto.",
      body: "Crea tu primera tarea y dale un título claro. Después podrás añadir descripción, fechas y más.",
      preview: (
        <div className="bg-white/10 rounded-2xl p-5 space-y-3">
          <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wide">Por hacer</p>
          {["Diseñar la landing", "Revisar propuesta", "Llamar al cliente"].map((t, i) => (
            <div key={t} className={cn("flex items-center gap-3 py-2 px-3 rounded-xl transition-all", i === 0 ? "bg-white/20" : "bg-white/5")}>
              <div className={cn("w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center", i === 0 ? "border-[#9ACCEC] bg-[#9ACCEC]" : "border-white/20")}>
                {i === 0 && <Check className="w-2.5 h-2.5 text-[#1e2563]" />}
              </div>
              <span className={cn("text-sm", i === 0 ? "text-white font-medium" : "text-white/40 line-through")}>{t}</span>
            </div>
          ))}
        </div>
      ),
    },
    3: {
      emoji: "👥",
      title: "El trabajo en equipo empieza aquí.",
      body: "Asigna tareas a los miembros de tu equipo para mantener la responsabilidad y visibilidad clara.",
      preview: (
        <div className="bg-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-white/20">
            <div className="w-4 h-4 rounded border-2 border-[#9ACCEC] flex-shrink-0" />
            <span className="text-sm text-white font-medium flex-1">Diseñar la landing</span>
          </div>
          <div>
            <p className="text-white/40 text-[11px] mb-2.5">Asignar a:</p>
            <div className="flex items-center gap-2 flex-wrap">
              {["sofia", "daniel", "emma"].map((s, i) => (
                <div key={s} className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all", i === 0 ? "bg-[#9ACCEC] text-[#1e2563]" : "bg-white/10 text-white/60")}>
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s}&backgroundColor=b6e3f4`} alt={s} className="w-4 h-4 rounded-full" />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                  {i === 0 && <Check className="w-3 h-3" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    4: {
      emoji: "🎉",
      title: "¡Todo está listo para despegar!",
      body: "Tu espacio está configurado. Ahora puedes invitar a tu equipo, crear proyectos y empezar a colaborar.",
      preview: (
        <div className="bg-white/10 rounded-2xl p-5 space-y-3">
          {[
            { icon: "✓", label: "Cuenta creada",        done: true },
            { icon: "✓", label: "Workspace configurado", done: true },
            { icon: "✓", label: "Primera tarea lista",   done: true },
            { icon: "✓", label: "Tarea asignada",        done: true },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-green-400/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-3.5 h-3.5 text-green-400" />
              </div>
              <span className="text-sm text-white/80">{item.label}</span>
            </div>
          ))}
        </div>
      ),
    },
  }[step] ?? { emoji: "", title: "", body: "", preview: null };

  return (
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
            <pattern id="grid-ob" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-ob)" />
        </svg>
      </div>

      <div className="relative z-10 space-y-6">
        <div className="text-4xl">{content.emoji}</div>
        <div>
          <h3 className="text-xl font-bold text-white mb-2 leading-snug">{content.title}</h3>
          <p className="text-white/50 text-sm leading-relaxed">{content.body}</p>
        </div>
        {content.preview}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();

  const [step,         setStep]         = useState(1);
  const [workspace,    setWorkspace]    = useState("");
  const [plan,         setPlan]         = useState<"free" | "pro">("pro");
  const [agreed,       setAgreed]       = useState(false);
  const [taskTitle,    setTaskTitle]    = useState("");
  const [taskDesc,     setTaskDesc]     = useState("");
  const [assignee,     setAssignee]     = useState<string | null>(null);
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [loading,      setLoading]      = useState(false);
  const [workspaceSlug, setWorkspaceSlug] = useState("");

  const slug = workspace.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const teamMembers = [
    { id: "me",     name: "Yo mismo",  seed: "me"     },
    { id: "sofia",  name: "Sofía",     seed: "sofia"  },
    { id: "daniel", name: "Daniel",    seed: "daniel" },
    { id: "emma",   name: "Emma",      seed: "emma"   },
  ];

  /* ── Step 1: create workspace ── */
  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    const e2: Record<string, string> = {};
    if (!workspace.trim()) e2.workspace = "El nombre del workspace es obligatorio.";
    if (!agreed)           e2.agreed    = "Debes aceptar los términos.";
    if (Object.keys(e2).length) { setErrors(e2); return; }

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }

    try {
      const res  = await fetch("/api/workspace/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workspace, slug, plan, userId: user.id }),
      });
      const json = await res.json();
      if (json.error) { setErrors({ submit: `Error: ${json.error}` }); setLoading(false); return; }

      const finalSlug = json.workspace?.slug ?? slug;
      setWorkspaceSlug(finalSlug);

      if (plan === "pro" && json.workspace?.id) {
        savePendingProUpgrade(json.workspace.id, finalSlug);
      }
    } catch (err) {
      setErrors({ submit: String(err) });
      setLoading(false);
      return;
    }

    setLoading(false);
    setErrors({});
    setStep(2);
  };

  /* ── Step 2: task title ── */
  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    const e2: Record<string, string> = {};
    if (!taskTitle.trim()) e2.taskTitle = "Escribe un título para la tarea.";
    if (Object.keys(e2).length) { setErrors(e2); return; }
    setErrors({});
    setStep(3);
  };

  /* ── Step 3: assign ── */
  const handleStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setStep(4);
  };

  /* ── Step 4: go to workspace ── */
  const handleFinish = async () => {
    if (plan === "pro" && workspaceSlug) {
      setLoading(true);
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug }),
      });
      const { url, error } = await res.json();
      if (!error && url) { window.location.href = url; return; }
    }
    router.replace(`/${workspaceSlug}/dashboard`);
  };

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* LEFT */}
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
            SellPulse
          </span>
        </div>

        <StepIndicator current={step} />

        <div className="w-full max-w-[420px]">

          {/* ── STEP 1: Workspace ── */}
          {step === 1 && (
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Configura tu espacio</h2>
                <p className="text-sm text-gray-500">Dale un nombre a tu workspace y elige tu plan.</p>
              </div>

              <form onSubmit={handleStep1} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nombre del workspace</label>
                  <input
                    value={workspace}
                    onChange={(e) => { setWorkspace(e.target.value); setErrors({}); }}
                    placeholder="Mi Empresa"
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-800 bg-white transition placeholder:text-gray-300",
                      "focus:outline-none focus:ring-2 focus:ring-[#2F3988]/20 focus:border-[#2F3988]",
                      errors.workspace ? "border-red-300" : "border-gray-200 hover:border-gray-300"
                    )}
                  />
                  {errors.workspace && <p className="mt-1 text-xs text-red-500 font-medium">{errors.workspace}</p>}
                  <p className="mt-1 text-xs text-gray-400">
                    sellpulse.com/<span className="font-medium text-gray-600">{slug || "mi-empresa"}</span>
                  </p>
                </div>

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
                          plan === p.id ? "border-[#2F3988] bg-[#2F3988]/[0.04] shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
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
                    {" "}de SellPulse.
                  </span>
                </button>
                {errors.agreed && <p className="mt-1 text-xs text-red-500 font-medium">{errors.agreed}</p>}

                {errors.submit && (
                  <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{errors.submit}</div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all",
                    loading ? "opacity-70 cursor-not-allowed" : "hover:opacity-90 active:scale-[0.99]"
                  )}
                  style={{ background: "linear-gradient(135deg, #2F3988 0%, #4a51a8 100%)" }}
                >
                  {loading ? (
                    <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Creando workspace...</>
                  ) : (
                    <>Continuar <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── STEP 2: First task ── */}
          {step === 2 && (
            <>
              <div className="mb-7">
                <button onClick={() => setStep(1)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4 transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" /> Volver
                </button>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Crea tu primera tarea</h2>
                <p className="text-sm text-gray-500">¿Qué necesitas hacer primero?</p>
              </div>

              <form onSubmit={handleStep2} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Título de la tarea</label>
                  <input
                    value={taskTitle}
                    onChange={(e) => { setTaskTitle(e.target.value); setErrors({}); }}
                    placeholder="Ej: Diseñar la landing page"
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-800 bg-white transition placeholder:text-gray-300",
                      "focus:outline-none focus:ring-2 focus:ring-[#2F3988]/20 focus:border-[#2F3988]",
                      errors.taskTitle ? "border-red-300" : "border-gray-200 hover:border-gray-300"
                    )}
                  />
                  {errors.taskTitle && <p className="mt-1 text-xs text-red-500 font-medium">{errors.taskTitle}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Descripción <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <textarea
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    placeholder="Añade más contexto sobre esta tarea..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 text-sm text-gray-800 bg-white transition placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2F3988]/20 focus:border-[#2F3988] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setErrors({}); setStep(3); }}
                    className="py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Omitir por ahora
                  </button>
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 active:scale-[0.99] transition-all"
                    style={{ background: "linear-gradient(135deg, #2F3988 0%, #4a51a8 100%)" }}
                  >
                    Continuar <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── STEP 3: Assign ── */}
          {step === 3 && (
            <>
              <div className="mb-7">
                <button onClick={() => setStep(2)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4 transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" /> Volver
                </button>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Asigna la tarea</h2>
                <p className="text-sm text-gray-500">¿Quién se encargará de "{taskTitle || "tu primera tarea"}"?</p>
              </div>

              <form onSubmit={handleStep3} className="space-y-4">
                <div className="space-y-2">
                  {teamMembers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAssignee(m.id === assignee ? null : m.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left",
                        assignee === m.id
                          ? "border-[#2F3988] bg-[#2F3988]/[0.04]"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      )}
                    >
                      {m.id === "me" ? (
                        <div className="w-9 h-9 rounded-full bg-[#2F3988]/10 flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4 text-[#2F3988]" />
                        </div>
                      ) : (
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.seed}&backgroundColor=b6e3f4`}
                          alt={m.name}
                          className="w-9 h-9 rounded-full flex-shrink-0"
                        />
                      )}
                      <span className="text-sm font-medium text-gray-800 flex-1">{m.name}</span>
                      {assignee === m.id && (
                        <div className="w-5 h-5 rounded-full bg-[#2F3988] flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setErrors({}); setStep(4); }}
                    className="py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Omitir
                  </button>
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 active:scale-[0.99] transition-all"
                    style={{ background: "linear-gradient(135deg, #2F3988 0%, #4a51a8 100%)" }}
                  >
                    Continuar <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── STEP 4: Done ── */}
          {step === 4 && (
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg text-3xl"
                style={{ background: "linear-gradient(135deg, #2F3988 0%, #4a51a8 100%)" }}
              >
                🚀
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Todo listo!</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-8">
                Tu workspace <span className="font-semibold text-gray-700">{workspace}</span> está creado y listo para usar.<br />
                Empieza a colaborar con tu equipo ahora mismo.
              </p>

              <div className="space-y-2.5 text-left mb-8">
                {[
                  { label: "Cuenta creada",           done: true  },
                  { label: "Workspace configurado",    done: true  },
                  { label: "Primera tarea lista",      done: !!taskTitle },
                  { label: "Tarea asignada",           done: !!assignee  },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                      item.done ? "bg-green-500" : "bg-gray-200"
                    )}>
                      <Check className={cn("w-3 h-3", item.done ? "text-white" : "text-gray-400")} />
                    </div>
                    <span className={cn("text-sm", item.done ? "text-gray-800 font-medium" : "text-gray-400")}>{item.label}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleFinish}
                disabled={loading}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all",
                  loading ? "opacity-70 cursor-not-allowed" : "hover:opacity-90 active:scale-[0.99]"
                )}
                style={{ background: "linear-gradient(135deg, #2F3988 0%, #4a51a8 100%)" }}
              >
                {loading ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Preparando...</>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Ir a mi workspace
                  </>
                )}
              </button>
            </div>
          )}

        </div>

        <p className="mt-10 text-[11px] text-gray-400 text-center">
          © 2025 SellPulse
        </p>
      </div>

      {/* RIGHT */}
      <RightPanel step={step} />
    </div>
  );
}
