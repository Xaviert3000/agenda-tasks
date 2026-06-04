"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ caracteres",    ok: password.length >= 8 },
    { label: "Letra mayúscula",  ok: /[A-Z]/.test(password) },
    { label: "Número",           ok: /\d/.test(password) },
    { label: "Carácter especial",ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ["bg-gray-200", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-500"];
  if (!password) return null;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn("h-1 flex-1 rounded-full transition-all duration-300", i < score ? colors[score] : "bg-gray-100")} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {checks.map((c) => (
          <span key={c.label} className={cn("text-[10px] flex items-center gap-1", c.ok ? "text-green-600" : "text-gray-400")}>
            <span className={cn("w-1.5 h-1.5 rounded-full inline-block", c.ok ? "bg-green-500" : "bg-gray-300")} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password,    setPassword]    = useState("");
  const [confirmPw,   setConfirmPw]   = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [done,        setDone]        = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [verifying,   setVerifying]   = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function exchangeCode() {
      // PKCE flow: Supabase sends ?code=xxx in the URL
      const code = searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError("El enlace de recuperación ha expirado o ya fue usado. Solicita uno nuevo.");
          setVerifying(false);
          return;
        }
        setSessionReady(true);
        setVerifying(false);
        return;
      }

      // Implicit flow fallback: token arrives in the URL hash (#access_token=...&type=recovery)
      // The Supabase client auto-processes hashes, so we just listen for the event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setSessionReady(true);
          setVerifying(false);
        }
      });

      // Check if there's already an active session (e.g. page reload)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
        setVerifying(false);
        subscription.unsubscribe();
        return;
      }

      // Give it 3 seconds for the hash event to fire, then show error
      const timeout = setTimeout(() => {
        setError("No se encontró un enlace de recuperación válido. Por favor solicita uno nuevo.");
        setVerifying(false);
        subscription.unsubscribe();
      }, 3000);

      return () => {
        clearTimeout(timeout);
        subscription.unsubscribe();
      };
    }

    exchangeCode();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPw) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!sessionReady) {
      setError("La sesión de recuperación no está lista. Por favor usa el enlace del correo nuevamente.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError("No se pudo actualizar la contraseña. " + updateError.message);
      return;
    }

    setDone(true);
    setTimeout(() => router.replace("/login"), 3000);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-[400px] text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg bg-green-500">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Contraseña actualizada!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Tu contraseña fue cambiada exitosamente. Serás redirigido al inicio de sesión en unos segundos.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all"
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-[420px]">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
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

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Nueva contraseña</h2>
            <p className="text-sm text-gray-500">Elige una contraseña segura para tu cuenta.</p>
          </div>

          {verifying ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <svg className="animate-spin w-6 h-6 text-[#2F3988]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-gray-500">Verificando enlace de recuperación...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nueva contraseña</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    disabled={!sessionReady}
                    className={cn(
                      "w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm text-gray-800 bg-white transition placeholder:text-gray-300",
                      "focus:outline-none focus:ring-2 focus:ring-[#2F3988]/20 focus:border-[#2F3988]",
                      "border-gray-200 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirmar contraseña</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Repite tu contraseña"
                    autoComplete="new-password"
                    disabled={!sessionReady}
                    className={cn(
                      "w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm text-gray-800 bg-white transition placeholder:text-gray-300",
                      "focus:outline-none focus:ring-2 focus:ring-[#2F3988]/20 focus:border-[#2F3988]",
                      "border-gray-200 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                  {error}{" "}
                  {!sessionReady && (
                    <Link href="/forgot-password" className="underline font-semibold">
                      Solicitar nuevo enlace
                    </Link>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !sessionReady}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-[#2F3988]/30 focus:ring-offset-2",
                  (loading || !sessionReady) ? "opacity-70 cursor-not-allowed" : "hover:opacity-90 active:scale-[0.99]"
                )}
                style={{ background: "linear-gradient(135deg, #2F3988 0%, #4a51a8 100%)" }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Guardando...
                  </>
                ) : (
                  <>
                    Guardar nueva contraseña
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2025 SellPulse ·{" "}
          <Link href="#" className="hover:text-gray-600">Privacidad</Link> ·{" "}
          <Link href="#" className="hover:text-gray-600">Términos</Link>
        </p>
      </div>
    </div>
  );
}

