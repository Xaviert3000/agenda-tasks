"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Building2,
  Bell,
  Palette,
  Users,
  CreditCard,
  Shield,
  KeyRound,
  Globe,
  ChevronRight,
  Camera,
  Check,
  Trash2,
  Plus,
  Mail,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Sections ── */
const NAV_SECTIONS = [
  {
    label: "Cuenta",
    items: [
      { id: "perfil",          label: "Perfil",                icon: User },
      { id: "seguridad",       label: "Seguridad",             icon: Shield },
      { id: "notificaciones",  label: "Notificaciones",        icon: Bell },
      { id: "apariencia",      label: "Apariencia",            icon: Palette },
    ],
  },
  {
    label: "Workspace",
    items: [
      { id: "workspace",       label: "General",               icon: Building2 },
      { id: "miembros",        label: "Miembros",              icon: Users },
      { id: "facturacion",     label: "Facturación",           icon: CreditCard },
      { id: "integraciones",   label: "Integraciones",         icon: Globe },
    ],
  },
];

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  Admin:     "bg-[#2F3988]/10 text-[#2F3988]",
  Moderador: "bg-amber-50 text-amber-700",
  Miembro:   "bg-gray-100 text-gray-600",
};

/* ── Notification toggles ── */
interface NotiToggle { id: string; label: string; desc: string; }
const NOTI_TOGGLES: NotiToggle[] = [
  { id: "task_assigned",   label: "Tarea asignada",         desc: "Cuando se te asigna una nueva tarea" },
  { id: "task_comment",    label: "Comentarios en tareas",  desc: "Cuando alguien comenta en tus tareas" },
  { id: "task_due",        label: "Fechas de vencimiento",  desc: "Recordatorios antes del vencimiento" },
  { id: "mention",         label: "Menciones",              desc: "Cuando alguien te menciona (@)" },
  { id: "message",         label: "Mensajes directos",      desc: "Nuevos mensajes en el chat" },
  { id: "doc_share",       label: "Documentos compartidos", desc: "Cuando comparten un documento contigo" },
];

/* ─────────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const params    = useParams();
  const workspace = params.workspace as string;

  const searchParams = useSearchParams();
  const [active, setActive] = useState(() => searchParams.get("tab") ?? "perfil");

  /* Perfil */
  const [name,  setName]  = useState("Tú");
  const [email, setEmail] = useState("tu@agenda.me");
  const [role,  setRole]  = useState("Admin");
  const [bio,   setBio]   = useState("");
  const [saved, setSaved] = useState(false);

  /* Notificaciones */
  const [notiEnabled, setNotiEnabled] = useState<Record<string, boolean>>({
    task_assigned: true, task_comment: true, task_due: true,
    mention: true, message: true, doc_share: false,
  });
  const [emailNoti, setEmailNoti]  = useState(true);
  const [pushNoti,  setPushNoti]   = useState(false);

  /* Apariencia */
  const [theme,  setTheme]  = useState<"light" | "dark" | "system">("light");
  const [lang,   setLang]   = useState("es");
  const [density, setDensity] = useState<"compact" | "default" | "comfortable">("default");

  /* Workspace */
  const [wsName, setWsName] = useState("agenda.ME");
  const [wsDesc, setWsDesc] = useState("Plan Pro · Workspace de equipo");

  /* Miembros: invite */
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole,  setInviteRole]  = useState("Miembro");
  const [inviteSent,  setInviteSent]  = useState(false);

  /* Seguridad */
  const [twoFactor, setTwoFactor] = useState(false);

  /* Plan */
  const [workspacePlan, setWorkspacePlan] = useState<"free" | "pro">("free");

  /* Miembros reales */
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Load workspace plan
    supabase
      .from("workspaces")
      .select("plan, name")
      .eq("slug", workspace)
      .single()
      .then(({ data }) => {
        if (data?.plan === "pro") setWorkspacePlan("pro");
        if (data?.name) setWsName(data.name);
      });

    // Load real user profile and team members
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", user.id)
        .single();
      if (profile?.name) setName(profile.name);

      // Load workspace id + members
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id")
        .eq("slug", workspace)
        .single();
      if (!ws) return;
      setWorkspaceId(ws.id);

      const { data: members } = await supabase
        .from("workspace_members")
        .select("user_id, role, profiles(id, name, avatar_url)")
        .eq("workspace_id", ws.id);

      if (!members) return;

      // Get emails from auth — not directly accessible, so we use profile name + role
      const loaded: TeamMember[] = members.map((m) => {
        const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        const roleMap: Record<string, string> = { owner: "Admin", admin: "Admin", member: "Miembro" };
        return {
          id: p?.id ?? m.user_id,
          name: p?.name ?? "Usuario",
          email: "",
          role: roleMap[m.role] ?? "Miembro",
          avatar_url: p?.avatar_url ?? null,
        };
      });
      setTeam(loaded);
    })();
  }, [workspace]);

  const handleSave = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ name, updated_at: new Date().toISOString() })
        .eq("id", user.id);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  /* ── helpers ── */
  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 focus:outline-none",
        checked ? "bg-[#2F3988]" : "bg-gray-300"
      )}
    >
      <span className={cn(
        "absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
        checked ? "translate-x-5" : "translate-x-0"
      )} />
    </button>
  );

  /* ── Section renderers ── */
  const renderPerfil = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Perfil</h3>
        <p className="text-sm text-gray-500">Actualiza tu información personal y foto de perfil.</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=me&backgroundColor=b6e3f4"
            alt="Avatar"
            className="w-20 h-20 rounded-full border-2 border-gray-200"
          />
          <button className="absolute bottom-0 right-0 w-7 h-7 bg-[#2F3988] rounded-full flex items-center justify-center border-2 border-white hover:bg-[#3d4aa8] transition-colors">
            <Camera className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Foto de perfil</p>
          <p className="text-xs text-gray-400 mt-0.5">JPG, PNG o GIF · Máx. 2 MB</p>
          <button className="mt-2 text-xs text-[#2F3988] hover:underline font-medium">Cambiar foto</button>
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Nombre completo</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2F3988] focus:ring-1 focus:ring-[#2F3988]/20 transition"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Correo electrónico</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2F3988] focus:ring-1 focus:ring-[#2F3988]/20 transition"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Rol</label>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2F3988] focus:ring-1 focus:ring-[#2F3988]/20 transition"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Zona horaria</label>
          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2F3988] bg-white">
            <optgroup label="América del Norte">
              <option>América/Anchorage (UTC-9)</option>
              <option>América/Los_Ángeles (UTC-8)</option>
              <option>América/Denver (UTC-7)</option>
              <option>América/Phoenix (UTC-7)</option>
              <option>América/Chicago (UTC-6)</option>
              <option>América/Ciudad_de_México (UTC-6)</option>
              <option>América/Monterrey (UTC-6)</option>
              <option>América/New_York (UTC-5)</option>
              <option>América/Toronto (UTC-5)</option>
              <option>América/Halifax (UTC-4)</option>
              <option>América/St_Johns (UTC-3:30)</option>
            </optgroup>
            <optgroup label="América Central">
              <option>América/Guatemala (UTC-6)</option>
              <option>América/El_Salvador (UTC-6)</option>
              <option>América/Tegucigalpa (UTC-6)</option>
              <option>América/Managua (UTC-6)</option>
              <option>América/Costa_Rica (UTC-6)</option>
              <option>América/Panama (UTC-5)</option>
              <option>América/Havana (UTC-5)</option>
              <option>América/Santo_Domingo (UTC-4)</option>
              <option>América/Puerto_Rico (UTC-4)</option>
            </optgroup>
            <optgroup label="América del Sur">
              <option>América/Bogotá (UTC-5)</option>
              <option>América/Lima (UTC-5)</option>
              <option>América/Guayaquil (UTC-5)</option>
              <option>América/Caracas (UTC-4)</option>
              <option>América/La_Paz (UTC-4)</option>
              <option>América/Manaus (UTC-4)</option>
              <option>América/Asuncion (UTC-4)</option>
              <option>América/Santiago (UTC-4)</option>
              <option>América/São_Paulo (UTC-3)</option>
              <option>América/Buenos_Aires (UTC-3)</option>
              <option>América/Montevideo (UTC-3)</option>
              <option>América/Noronha (UTC-2)</option>
            </optgroup>
            <optgroup label="Europa">
              <option>Europa/Lisboa (UTC+0)</option>
              <option>Europa/Londres (UTC+0)</option>
              <option>Europa/Dublin (UTC+0)</option>
              <option>Europa/Madrid (UTC+1)</option>
              <option>Europa/París (UTC+1)</option>
              <option>Europa/Berlín (UTC+1)</option>
              <option>Europa/Roma (UTC+1)</option>
              <option>Europa/Amsterdam (UTC+1)</option>
              <option>Europa/Bruselas (UTC+1)</option>
              <option>Europa/Viena (UTC+1)</option>
              <option>Europa/Varsovia (UTC+1)</option>
              <option>Europa/Estocolmo (UTC+1)</option>
              <option>Europa/Oslo (UTC+1)</option>
              <option>Europa/Copenhague (UTC+1)</option>
              <option>Europa/Zurich (UTC+1)</option>
              <option>Europa/Budapest (UTC+1)</option>
              <option>Europa/Praga (UTC+1)</option>
              <option>Europa/Helsinki (UTC+2)</option>
              <option>Europa/Atenas (UTC+2)</option>
              <option>Europa/Bucarest (UTC+2)</option>
              <option>Europa/Kiev (UTC+2)</option>
              <option>Europa/Riga (UTC+2)</option>
              <option>Europa/Tallin (UTC+2)</option>
              <option>Europa/Vilna (UTC+2)</option>
              <option>Europa/Sofía (UTC+2)</option>
              <option>Europa/Moscú (UTC+3)</option>
              <option>Europa/Estambul (UTC+3)</option>
              <option>Europa/Minsk (UTC+3)</option>
            </optgroup>
            <optgroup label="África">
              <option>África/Abidjan (UTC+0)</option>
              <option>África/Casablanca (UTC+0)</option>
              <option>África/Lagos (UTC+1)</option>
              <option>África/Túnez (UTC+1)</option>
              <option>África/Johannesburgo (UTC+2)</option>
              <option>África/Nairobi (UTC+3)</option>
              <option>África/El_Cairo (UTC+2)</option>
              <option>África/Addis_Abeba (UTC+3)</option>
            </optgroup>
            <optgroup label="Medio Oriente">
              <option>Asia/Beirut (UTC+2)</option>
              <option>Asia/Jerusalén (UTC+2)</option>
              <option>Asia/Ammán (UTC+2)</option>
              <option>Asia/Damasco (UTC+2)</option>
              <option>Asia/Kuwait (UTC+3)</option>
              <option>Asia/Riad (UTC+3)</option>
              <option>Asia/Bagdad (UTC+3)</option>
              <option>Asia/Dubai (UTC+4)</option>
              <option>Asia/Teherán (UTC+3:30)</option>
            </optgroup>
            <optgroup label="Asia">
              <option>Asia/Karachi (UTC+5)</option>
              <option>Asia/Calcuta (UTC+5:30)</option>
              <option>Asia/Colombo (UTC+5:30)</option>
              <option>Asia/Dhaka (UTC+6)</option>
              <option>Asia/Almaty (UTC+6)</option>
              <option>Asia/Yangon (UTC+6:30)</option>
              <option>Asia/Bangkok (UTC+7)</option>
              <option>Asia/Ho_Chi_Minh (UTC+7)</option>
              <option>Asia/Yakarta (UTC+7)</option>
              <option>Asia/Hong_Kong (UTC+8)</option>
              <option>Asia/Shanghái (UTC+8)</option>
              <option>Asia/Singapur (UTC+8)</option>
              <option>Asia/Taipei (UTC+8)</option>
              <option>Asia/Manila (UTC+8)</option>
              <option>Asia/Kuala_Lumpur (UTC+8)</option>
              <option>Asia/Pyongyang (UTC+9)</option>
              <option>Asia/Seúl (UTC+9)</option>
              <option>Asia/Tokio (UTC+9)</option>
              <option>Asia/Yakutsk (UTC+9)</option>
              <option>Asia/Vladivostok (UTC+10)</option>
              <option>Asia/Sakhalin (UTC+11)</option>
              <option>Asia/Kamchatka (UTC+12)</option>
            </optgroup>
            <optgroup label="Oceanía">
              <option>Australia/Perth (UTC+8)</option>
              <option>Australia/Darwin (UTC+9:30)</option>
              <option>Australia/Adelaida (UTC+9:30)</option>
              <option>Australia/Sídney (UTC+10)</option>
              <option>Australia/Melbourne (UTC+10)</option>
              <option>Australia/Brisbane (UTC+10)</option>
              <option>Australia/Hobart (UTC+10)</option>
              <option>Pacífico/Auckland (UTC+12)</option>
              <option>Pacífico/Fiji (UTC+12)</option>
              <option>Pacífico/Honolulu (UTC-10)</option>
              <option>Pacífico/Pago_Pago (UTC-11)</option>
            </optgroup>
            <optgroup label="UTC">
              <option>UTC (UTC+0)</option>
            </optgroup>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          placeholder="Cuéntanos un poco sobre ti..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2F3988] focus:ring-1 focus:ring-[#2F3988]/20 transition resize-none placeholder:text-gray-300"
        />
        <p className="text-xs text-gray-400 mt-1">{bio.length}/200 caracteres</p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          className={cn(
            "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all",
            saved
              ? "bg-success text-white"
              : "bg-[#2F3988] hover:bg-[#3d4aa8] text-white"
          )}
        >
          {saved ? <><Check className="w-4 h-4" /> Guardado</> : "Guardar cambios"}
        </button>
        <button className="px-5 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );

  const renderSeguridad = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Seguridad</h3>
        <p className="text-sm text-gray-500">Gestiona tu contraseña y la autenticación de dos factores.</p>
      </div>

      {/* Change password */}
      <div className="border border-gray-200 rounded-xl p-5 space-y-4">
        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><KeyRound className="w-4 h-4 text-gray-400" /> Cambiar contraseña</h4>
        <div className="space-y-3">
          {["Contraseña actual", "Nueva contraseña", "Confirmar nueva contraseña"].map((label) => (
            <div key={label}>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>
              <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2F3988] focus:ring-1 focus:ring-[#2F3988]/20 transition" placeholder="••••••••" />
            </div>
          ))}
        </div>
        <button className="px-4 py-2 bg-[#2F3988] hover:bg-[#3d4aa8] text-white text-sm font-medium rounded-lg transition-colors">
          Actualizar contraseña
        </button>
      </div>

      {/* 2FA */}
      <div className="border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Autenticación de dos factores</p>
              <p className="text-xs text-gray-500 mt-0.5">Añade una capa extra de seguridad a tu cuenta</p>
            </div>
          </div>
          <Toggle checked={twoFactor} onChange={() => setTwoFactor(!twoFactor)} />
        </div>
        {twoFactor && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">Escanea el código QR con tu aplicación de autenticación (Google Authenticator, Authy, etc.)</p>
            <div className="mt-3 w-24 h-24 bg-gray-900 rounded-lg flex items-center justify-center text-white text-[10px] font-mono">QR Code</div>
          </div>
        )}
      </div>

      {/* Sessions */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-gray-800 mb-3">Sesiones activas</h4>
        {[
          { device: "MacBook Pro — Chrome", location: "Ciudad de México, MX", current: true,  time: "Activa ahora" },
          { device: "iPhone 15 — Safari",   location: "Ciudad de México, MX", current: false, time: "Hace 2 horas" },
        ].map((s, i) => (
          <div key={i} className={cn("flex items-center justify-between py-3", i > 0 && "border-t border-gray-100")}>
            <div>
              <p className="text-sm font-medium text-gray-800">{s.device}</p>
              <p className="text-xs text-gray-400">{s.location} · {s.time}</p>
            </div>
            {s.current
              ? <span className="text-[11px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">Esta sesión</span>
              : <button className="text-xs text-danger hover:underline font-medium">Cerrar</button>
            }
          </div>
        ))}
      </div>
    </div>
  );

  const renderNotificaciones = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Notificaciones</h3>
        <p className="text-sm text-gray-500">Controla qué notificaciones recibes y cómo te llegan.</p>
      </div>

      {/* Channels */}
      <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Canales de envío</p>
        </div>
        {[
          { icon: Bell,  label: "Notificaciones en la app", desc: "Recibirlas dentro de agenda.ME", checked: true, setChecked: () => {} },
          { icon: Mail,  label: "Correo electrónico",       desc: "Resumen de notificaciones por email", checked: emailNoti, setChecked: () => setEmailNoti(!emailNoti) },
          { icon: Smartphone, label: "Push / Móvil",        desc: "Notificaciones en tu dispositivo móvil", checked: pushNoti, setChecked: () => setPushNoti(!pushNoti) },
        ].map((c, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <c.icon className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{c.label}</p>
                <p className="text-xs text-gray-400">{c.desc}</p>
              </div>
            </div>
            <Toggle checked={c.checked} onChange={c.setChecked} />
          </div>
        ))}
      </div>

      {/* Events */}
      <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Eventos</p>
        </div>
        {NOTI_TOGGLES.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-medium text-gray-800">{t.label}</p>
              <p className="text-xs text-gray-400">{t.desc}</p>
            </div>
            <Toggle
              checked={notiEnabled[t.id]}
              onChange={() => setNotiEnabled((prev) => ({ ...prev, [t.id]: !prev[t.id] }))}
            />
          </div>
        ))}
      </div>
    </div>
  );

  const renderApariencia = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Apariencia</h3>
        <p className="text-sm text-gray-500">Personaliza cómo se ve la aplicación.</p>
      </div>

      {/* Theme */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Tema</p>
        <div className="grid grid-cols-3 gap-3">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                "relative border-2 rounded-xl overflow-hidden transition-all",
                theme === t ? "border-[#2F3988]" : "border-gray-200 hover:border-gray-300"
              )}
            >
              <div className={cn("h-16 w-full", t === "dark" ? "bg-gray-900" : t === "system" ? "bg-gradient-to-r from-white to-gray-900" : "bg-white")} />
              <div className={cn("px-3 py-2 text-center border-t", t === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-white")}>
                <p className={cn("text-xs font-medium", t === "dark" ? "text-gray-200" : "text-gray-700")}>
                  {t === "light" ? "Claro" : t === "dark" ? "Oscuro" : "Sistema"}
                </p>
              </div>
              {theme === t && (
                <span className="absolute top-2 right-2 w-5 h-5 bg-[#2F3988] rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Density */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Densidad de la interfaz</p>
        <div className="flex gap-2">
          {(["compact", "default", "comfortable"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDensity(d)}
              className={cn(
                "flex-1 py-2 rounded-lg border text-xs font-medium transition-all",
                density === d
                  ? "border-[#2F3988] bg-[#2F3988]/5 text-[#2F3988]"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              {d === "compact" ? "Compacta" : d === "default" ? "Normal" : "Espaciada"}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Idioma</label>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="w-64 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2F3988] bg-white"
        >
          <option value="es">Español (México)</option>
          <option value="en">English (US)</option>
          <option value="pt">Português (BR)</option>
        </select>
      </div>

      <button
        onClick={handleSave}
        className={cn(
          "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all",
          saved ? "bg-success text-white" : "bg-[#2F3988] hover:bg-[#3d4aa8] text-white"
        )}
      >
        {saved ? <><Check className="w-4 h-4" /> Guardado</> : "Guardar cambios"}
      </button>
    </div>
  );

  const renderWorkspace = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Workspace</h3>
        <p className="text-sm text-gray-500">Configura tu espacio de trabajo.</p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Nombre del workspace</label>
          <input
            value={wsName}
            onChange={(e) => setWsName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2F3988] focus:ring-1 focus:ring-[#2F3988]/20 transition"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Descripción</label>
          <input
            value={wsDesc}
            onChange={(e) => setWsDesc(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2F3988] focus:ring-1 focus:ring-[#2F3988]/20 transition"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">URL del workspace</label>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:border-[#2F3988] focus-within:ring-1 focus-within:ring-[#2F3988]/20 transition">
            <span className="px-3 py-2 bg-gray-50 text-xs text-gray-400 border-r border-gray-200">agenda.me/</span>
            <input defaultValue="agenda-me" className="flex-1 px-3 py-2 text-sm text-gray-800 focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Plan actual</label>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
            <span className="text-sm font-semibold text-[#2F3988]">{workspacePlan === "pro" ? "Plan Pro" : "Plan Gratis"}</span>
            <span className="text-xs text-gray-400">{workspacePlan === "pro" ? "· Usuarios ilimitados · 100 GB" : "· 5 usuarios · 100 MB"}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          className={cn(
            "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all",
            saved ? "bg-success text-white" : "bg-[#2F3988] hover:bg-[#3d4aa8] text-white"
          )}
        >
          {saved ? <><Check className="w-4 h-4" /> Guardado</> : "Guardar cambios"}
        </button>
      </div>

      {/* Danger zone */}
      <div className="border border-danger/30 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-danger mb-1">Zona de peligro</h4>
        <p className="text-xs text-gray-500 mb-4">Estas acciones son irreversibles. Procede con cuidado.</p>
        <button className="flex items-center gap-2 px-4 py-2 border border-danger/40 text-danger hover:bg-danger/5 rounded-lg text-sm font-medium transition-colors">
          <Trash2 className="w-4 h-4" /> Eliminar workspace
        </button>
      </div>
    </div>
  );

  const renderMiembros = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Miembros</h3>
        <p className="text-sm text-gray-500">Gestiona quién tiene acceso a tu workspace.</p>
      </div>

      {/* Invite */}
      <div className="border border-gray-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-gray-800 mb-1">Invitar miembro</p>
        <p className="text-xs text-gray-400 mb-4">El usuario recibirá un correo con el enlace de acceso.</p>
        <div className="flex gap-2">
          <input
            value={inviteEmail}
            onChange={(e) => { setInviteEmail(e.target.value); setInviteSent(false); }}
            type="email"
            placeholder="correo@ejemplo.com"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2F3988] focus:ring-1 focus:ring-[#2F3988]/20 transition placeholder:text-gray-300"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#2F3988] bg-white cursor-pointer"
          >
            <option value="Miembro">Miembro</option>
            <option value="Moderador">Moderador</option>
            <option value="Admin">Administrador</option>
          </select>
          <button
            onClick={() => { if (inviteEmail) { setInviteSent(true); setInviteEmail(""); setTimeout(() => setInviteSent(false), 3000); } }}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
              inviteSent ? "bg-success text-white" : "bg-[#2F3988] hover:bg-[#3d4aa8] text-white"
            )}
          >
            {inviteSent ? <><Check className="w-4 h-4" /> Enviado</> : <><Plus className="w-4 h-4" /> Invitar</>}
          </button>
        </div>
        {/* Role descriptions */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { role: "Miembro",    color: "bg-gray-100 text-gray-600",       desc: "Puede ver y editar tareas y documentos asignados." },
            { role: "Moderador",  color: "bg-amber-50 text-amber-700",      desc: "Puede gestionar proyectos y miembros del equipo." },
            { role: "Admin",      color: "bg-[#2F3988]/10 text-[#2F3988]",  desc: "Acceso completo a configuración y facturación." },
          ].map((r) => (
            <button
              key={r.role}
              onClick={() => setInviteRole(r.role)}
              className={cn(
                "text-left p-3 rounded-lg border transition-all",
                inviteRole === r.role
                  ? "border-[#2F3988] bg-[#2F3988]/5"
                  : "border-gray-100 hover:border-gray-200 bg-gray-50"
              )}
            >
              <span className={cn("inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mb-1.5", r.color)}>
                {r.role === "Admin" ? "Administrador" : r.role}
              </span>
              <p className="text-[11px] text-gray-400 leading-snug">{r.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Equipo ({team.length})</p>
        </div>
        {team.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            Aún no hay miembros en este workspace. Invita a alguien arriba.
          </div>
        ) : team.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
            <div className="flex-shrink-0">
              {m.avatar_url ? (
                <img src={m.avatar_url} alt={m.name} className="w-8 h-8 rounded-full border border-gray-100" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                  {m.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
              {m.email && <p className="text-xs text-gray-400 truncate">{m.email}</p>}
            </div>
            <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", ROLE_COLORS[m.role] ?? "bg-gray-100 text-gray-600")}>{m.role}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFacturacion = () => {
    const isPro = workspacePlan === "pro";

    const planFeatures = isPro
      ? ["Usuarios ilimitados", "100 GB almacenamiento", "Proyectos ilimitados", "Soporte prioritario 24/7", "Integraciones avanzadas", "Exportación de reportes"]
      : ["Hasta 5 usuarios", "100 MB almacenamiento", "3 proyectos activos", "Soporte por email"];

    const usageRows = isPro
      ? [
          { label: "Usuarios",       used: 4,  total: 999, unit: "ilimitados" },
          { label: "Almacenamiento", used: 23, total: 100, unit: "GB de 100 GB" },
          { label: "Proyectos",      used: 5,  total: 999, unit: "ilimitados" },
        ]
      : [
          { label: "Usuarios",       used: 4,  total: 5,   unit: "de 5" },
          { label: "Almacenamiento", used: 23, total: 100, unit: "MB de 100 MB" },
          { label: "Proyectos",      used: 2,  total: 3,   unit: "de 3" },
        ];

    return (
      <div className="space-y-8">
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Facturación</h3>
          <p className="text-sm text-gray-500">Gestiona tu plan y métodos de pago.</p>
        </div>

        {/* Current plan */}
        {isPro ? (
          <div className="bg-gradient-to-r from-[#2F3988] to-[#7177B4] rounded-xl p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-medium opacity-70">Plan actual</p>
                <p className="text-2xl font-bold">Plan Pro</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">$29</p>
                <p className="text-xs opacity-70">/ workspace / mes</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {planFeatures.map((f) => (
                <span key={f} className="flex items-center gap-1 text-xs bg-white/20 px-2.5 py-1 rounded-full">
                  <Check className="w-3 h-3" /> {f}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="border-2 border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Plan actual</p>
                <p className="text-2xl font-bold text-gray-800">Gratis</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-800">$0</p>
                <p className="text-xs text-gray-400">para siempre</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {planFeatures.map((f) => (
                <span key={f} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                  <Check className="w-3 h-3 text-gray-400" /> {f}
                </span>
              ))}
            </div>
            <a
              href={`/${workspace}/upgrade`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#2F3988] hover:bg-[#3d4aa8] transition-colors"
            >
              Mejorar a Pro · $29/mes
            </a>
          </div>
        )}

        {/* Usage */}
        <div className="border border-gray-200 rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-800">Uso del plan</p>
          {usageRows.map((u) => (
            <div key={u.label}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-medium text-gray-700">{u.label}</p>
                <p className="text-xs text-gray-400">{u.used} {u.unit}</p>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2F3988] rounded-full transition-all"
                  style={{ width: u.total >= 999 ? `${(u.used / 20) * 100}%` : `${Math.min((u.used / u.total) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Payment method — only shown on Pro */}
        {isPro && (
          <div className="border border-gray-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-gray-800 mb-3">Método de pago</p>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-10 h-7 bg-[#1A1F71] rounded flex items-center justify-center text-white text-[10px] font-bold">VISA</div>
              <div>
                <p className="text-sm font-medium text-gray-800">•••• •••• •••• 4242</p>
                <p className="text-xs text-gray-400">Vence 12/27</p>
              </div>
              <button className="ml-auto text-xs text-[#2F3988] hover:underline font-medium">Cambiar</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderIntegraciones = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Integraciones</h3>
        <p className="text-sm text-gray-500">Conecta agenda.ME con tus herramientas favoritas.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { name: "GitHub",   desc: "Vincula repositorios y Pull Requests",      icon: "⬡",  connected: true  },
          { name: "Slack",    desc: "Recibe notificaciones en tus canales",       icon: "#",  connected: true  },
          { name: "Figma",    desc: "Adjunta diseños directamente a las tareas",  icon: "◈",  connected: false },
          { name: "Google Drive", desc: "Adjunta archivos de Drive en tareas",   icon: "▲",  connected: false },
          { name: "Jira",     desc: "Importa issues de Jira como tareas",         icon: "⧫",  connected: false },
          { name: "Zapier",   desc: "Automatiza flujos de trabajo",               icon: "⚡", connected: false },
        ].map((app) => (
          <div key={app.name} className="border border-gray-200 rounded-xl p-4 flex items-start gap-3 hover:border-gray-300 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
              {app.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{app.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{app.desc}</p>
            </div>
            <button className={cn(
              "flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors",
              app.connected
                ? "border-success/40 text-success bg-success/5 hover:bg-success/10"
                : "border-gray-200 text-gray-600 hover:border-[#2F3988] hover:text-[#2F3988]"
            )}>
              {app.connected ? "Conectado" : "Conectar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const RENDERS: Record<string, () => React.ReactNode> = {
    perfil:         renderPerfil,
    seguridad:      renderSeguridad,
    notificaciones: renderNotificaciones,
    apariencia:     renderApariencia,
    workspace:      renderWorkspace,
    miembros:       renderMiembros,
    facturacion:    renderFacturacion,
    integraciones:  renderIntegraciones,
  };

  return (
    <div className="flex h-full overflow-hidden">
        {/* ── Sidebar nav ── */}
        <aside className="w-56 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto py-5 px-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1.5">
                {section.label}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActive(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                      isActive
                        ? "bg-[#2F3988]/8 text-[#2F3988] font-semibold"
                        : "text-gray-600 hover:bg-gray-100 font-medium"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-[#2F3988]" : "text-gray-400")} />
                    {item.label}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-[#2F3988]/50" />}
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        {/* ── Content ── */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl">
            {RENDERS[active]?.()}
          </div>
        </main>
    </div>
  );
}
