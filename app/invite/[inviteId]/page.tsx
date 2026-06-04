"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, ArrowRight, Check, Loader2, AlertCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface InviteInfo {
  id: string;
  email: string;
  role: string;
  workspace_id: string;
  workspaceName: string;
  inviterName: string;
}

type Mode = "loading" | "invalid" | "already_member" | "login" | "register" | "accepting" | "done";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  member: "Miembro",
  moderator: "Moderador",
};

export default function InvitePage() {
  const { inviteId } = useParams<{ inviteId: string }>();
  const router = useRouter();

  const [mode, setMode]       = useState<Mode>("loading");
  const [invite, setInvite]   = useState<InviteInfo | null>(null);
  const [error, setError]     = useState("");

  /* form state */
  const [tab,      setTab]      = useState<"login" | "register">("login");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  /* ── 1. Load invite details ── */
  useEffect(() => {
    (async () => {
      // Use API route (service role) so RLS doesn't block unauthenticated reads
      const res = await fetch(`/api/workspace/invite?id=${inviteId}`);
      if (!res.ok) { setMode("invalid"); return; }

      const inv: InviteInfo = await res.json();
      setInvite(inv);
      setEmail(inv.email);

      // Check if user is already logged in
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if already a member
        const { data: membership } = await supabase
          .from("workspace_members")
          .select("user_id")
          .eq("workspace_id", inv.workspace_id)
          .eq("user_id", user.id)
          .single();

        if (membership) {
          setMode("already_member");
          return;
        }

        // Auto-accept
        await acceptInvite(inv.id, user.id);
        return;
      }

      setMode("login");
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteId]);

  /* ── 2. Accept invite ── */
  async function acceptInvite(id: string, userId: string) {
    setMode("accepting");
    const res = await fetch("/api/workspace/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId: id, userId }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Error al aceptar la invitación");
      setMode("login");
      return;
    }
    setMode("done");
    setTimeout(() => {
      router.replace(json.workspaceSlug ? `/${json.workspaceSlug}/dashboard` : "/onboarding");
    }, 1800);
  }

  /* ── 3. Auth handlers ── */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr || !data.user) {
      setError("Correo o contraseña incorrectos.");
      setLoading(false);
      return;
    }
    setLoading(false);
    await acceptInvite(invite.id, data.user.id);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;
    setError("");
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    setLoading(true);
    const supabase = createClient();

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (signUpErr || !data.user) {
      setError(signUpErr?.message ?? "Error al crear la cuenta.");
      setLoading(false);
      return;
    }
    // Create profile
    await supabase.from("profiles").upsert({
      id: data.user.id,
      name: name || email.split("@")[0],
      updated_at: new Date().toISOString(),
    });
    setLoading(false);
    await acceptInvite(invite.id, data.user.id);
  }

  /* ── Render ── */
  const BrandPanel = () => (
    <div
      className="hidden lg:flex flex-col w-[420px] flex-shrink-0 relative overflow-hidden p-10"
      style={{ background: "linear-gradient(145deg,#1e2563 0%,#2F3988 45%,#4a51a8 100%)" }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle,#9ACCEC 0%,transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle,#7177B4 0%,transparent 70%)" }} />
      </div>
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-12">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-white font-bold text-lg">SellPulse</span>
        </div>
        {invite && (
          <div className="flex-1 flex flex-col justify-center">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/20">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 leading-tight">
              {invite.inviterName} te invitó a colaborar
            </h2>
            <p className="text-white/70 text-sm leading-relaxed mb-6">
              Únete a <strong className="text-white">{invite.workspaceName}</strong> como{" "}
              <span className="bg-white/10 px-2 py-0.5 rounded-full text-white text-xs font-medium">
                {ROLE_LABEL[invite.role] ?? invite.role}
              </span>
            </p>
            <div className="bg-white/10 border border-white/20 rounded-xl p-4">
              <p className="text-xs text-white/60 mb-1">Invitación para</p>
              <p className="text-sm text-white font-medium">{invite.email}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (mode === "loading") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-[#2F3988]" />
    </div>
  );

  if (mode === "invalid") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm px-6">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Invitación inválida</h2>
        <p className="text-gray-500 text-sm mb-6">
          Este enlace de invitación ya fue usado, expiró o no existe.
        </p>
        <a href="/login" className="text-sm text-[#2F3988] font-semibold hover:underline">
          Ir al inicio de sesión →
        </a>
      </div>
    </div>
  );

  if (mode === "accepting") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2F3988] mx-auto mb-3" />
        <p className="text-sm text-gray-500">Uniéndote al workspace…</p>
      </div>
    </div>
  );

  if (mode === "done") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">¡Bienvenido a {invite?.workspaceName}!</h2>
        <p className="text-sm text-gray-400">Redirigiendo al workspace…</p>
      </div>
    </div>
  );

  if (mode === "already_member") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm px-6">
        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Check className="w-7 h-7 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Ya eres miembro</h2>
        <p className="text-gray-500 text-sm mb-6">
          Ya perteneces a <strong>{invite?.workspaceName}</strong>.
        </p>
        <button
          onClick={() => router.replace(`/${invite?.workspace_id}/dashboard`)}
          className="px-5 py-2.5 bg-[#2F3988] text-white text-sm font-semibold rounded-xl hover:bg-[#3d4aa8] transition-colors"
        >
          Ir al workspace →
        </button>
      </div>
    </div>
  );

  /* Login / Register */
  return (
    <div className="min-h-screen flex">
      <BrandPanel />

      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-[400px]">

          {/* Mobile header */}
          <div className="lg:hidden mb-8 text-center">
            <p className="text-sm text-gray-500">
              <strong className="text-gray-800">{invite?.inviterName}</strong> te invitó a{" "}
              <strong className="text-[#2F3988]">{invite?.workspaceName}</strong>
            </p>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {tab === "login" ? "Inicia sesión para continuar" : "Crea tu cuenta"}
          </h1>
          <p className="text-sm text-gray-400 mb-7">
            {tab === "login"
              ? "Entra con tu cuenta y acepta la invitación"
              : "Regístrate y únete al workspace al instante"}
          </p>

          {/* Tab switch */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                className={cn(
                  "flex-1 py-2 text-sm font-semibold rounded-lg transition-all",
                  tab === t ? "bg-white text-[#2F3988] shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {t === "login" ? "Iniciar sesión" : "Registrarse"}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2F3988]/20 focus:border-[#2F3988] transition placeholder:text-gray-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2F3988]/20 focus:border-[#2F3988] transition placeholder:text-gray-300"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2F3988] hover:bg-[#3d4aa8] text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Iniciar sesión y unirme <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nombre completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2F3988]/20 focus:border-[#2F3988] transition placeholder:text-gray-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">El correo está fijo por la invitación</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2F3988]/20 focus:border-[#2F3988] transition placeholder:text-gray-300"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2F3988] hover:bg-[#3d4aa8] text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Crear cuenta y unirme <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          <p className="text-xs text-center text-gray-400 mt-6">
            © 2025 SellPulse · <a href="/privacy" className="hover:underline">Privacidad</a>
          </p>
        </div>
      </div>
    </div>
  );
}
