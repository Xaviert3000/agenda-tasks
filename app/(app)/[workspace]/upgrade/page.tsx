"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Check, Zap, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const PRO_PERKS = [
  "Usuarios ilimitados",
  "Proyectos ilimitados",
  "100 GB almacenamiento",
  "Soporte prioritario 24/7",
  "Integraciones avanzadas",
  "Exportación de reportes",
];

const FREE_PERKS = [
  "Hasta 5 usuarios",
  "3 proyectos activos",
  "100 MB almacenamiento",
  "Soporte por email",
];

export default function UpgradePage() {
  const params = useParams<{ workspace: string }>();
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("checkout") === "cancelled";

  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);

    const supabase = createClient();
    const { data: ws } = await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", params.workspace)
      .single();

    if (!ws) { setLoading(false); return; }

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: ws.id, workspaceSlug: params.workspace }),
    });

    const { url } = await res.json();
    if (url) window.location.href = url;
    else setLoading(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center min-h-full">
      <div className="w-full max-w-3xl">

        {cancelled && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm flex items-center gap-2">
            <X className="w-4 h-4 flex-shrink-0" />
            Cancelaste el proceso de pago. Puedes intentarlo de nuevo cuando quieras.
          </div>
        )}

        <div className="text-center mb-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ background: "linear-gradient(135deg, #2F3988 0%, #4a51a8 100%)" }}
          >
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mejora a Pro</h1>
          <p className="text-gray-500">Desbloquea todo el potencial de tu workspace</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

          {/* Free */}
          <div className="rounded-2xl border-2 border-gray-200 bg-white p-6">
            <div className="mb-4">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Actual · Gratis</span>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-900">$0</span>
                <span className="text-gray-400 text-sm ml-1">para siempre</span>
              </div>
            </div>
            <ul className="space-y-2.5">
              {FREE_PERKS.map((p) => (
                <li key={p} className="flex items-center gap-2.5 text-sm text-gray-500">
                  <Check className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div
            className="rounded-2xl border-2 p-6 relative overflow-hidden"
            style={{ borderColor: "#2F3988", background: "linear-gradient(145deg, #f8f9ff 0%, #eef0ff 100%)" }}
          >
            <div className="absolute top-0 right-0 bg-[#2F3988] text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
              RECOMENDADO
            </div>
            <div className="mb-4">
              <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: "#2F3988" }}>Pro</span>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-900">$29</span>
                <span className="text-gray-400 text-sm ml-1">/ workspace / mes</span>
              </div>
            </div>
            <ul className="space-y-2.5">
              {PRO_PERKS.map((p) => (
                <li key={p} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <Check className="w-4 h-4 flex-shrink-0" style={{ color: "#2F3988" }} />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className={cn(
              "flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-white transition-all",
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
                Redirigiendo a Stripe...
              </>
            ) : (
              <>
                Mejorar a Pro · $29/mes
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <p className="text-xs text-gray-400">
            Pago seguro vía Stripe · Cancela cuando quieras
          </p>
        </div>

      </div>
    </div>
  );
}
