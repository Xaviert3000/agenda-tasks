"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { applyTheme, applyDensity, saveAppearance, type Theme, type Density } from "@/components/shared/AppearanceProvider";
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
  const [name,      setName]      = useState("Tú");
  const [email,     setEmail]     = useState("tu@agenda.me");
  const [role,      setRole]      = useState("Admin");
  const [bio,       setBio]       = useState("");
  const [saved,     setSaved]     = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Notificaciones */
  const [notiEnabled, setNotiEnabled] = useState<Record<string, boolean>>({
    task_assigned: true, task_comment: true, task_due: true,
    mention: true, message: true, doc_share: false,
  });
  const [emailNoti, setEmailNoti]  = useState(true);
  const [pushNoti,  setPushNoti]   = useState(false);

  /* Apariencia */
  const [theme,   setTheme]   = useState<Theme>("light");
  const [lang,    setLang]    = useState("es");
  const [density, setDensity] = useState<Density>("default");

  /* Workspace */
  const [wsName, setWsName] = useState("agenda.ME");
  const [wsDesc, setWsDesc] = useState("Plan Pro · Workspace de equipo");

  /* Miembros: invite */
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole,  setInviteRole]  = useState("Miembro");
  const [inviteSent,  setInviteSent]  = useState(false);

  interface PendingInvite { id: string; email: string; role: string; sentAt: string; }
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [resentEmail, setResentEmail] = useState<string | null>(null);

  /* Seguridad */
  const [twoFactor, setTwoFactor] = useState(false);

  /* Plan */
  const [workspacePlan, setWorkspacePlan] = useState<"free" | "pro">("free");

  /* Miembros reales */
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  /* Uso del plan real */
  const [usageUsers,    setUsageUsers]    = useState(0);
  const [usageProjects, setUsageProjects] = useState(0);

  /* Integraciones */
  interface IntegrationState { connected: boolean; meta?: Record<string, string> }
  const [integrations, setIntegrations] = useState<Record<string, IntegrationState>>({
    github: { connected: false },
    googledrive: { connected: false },
    zapier: { connected: false },
    make: { connected: false },
  });
  const [intModal, setIntModal] = useState<string | null>(null); // which integration modal is open
  const [intInput, setIntInput] = useState("");
  const [intLoading, setIntLoading] = useState(false);
  const [intError, setIntError] = useState("");
  const intInputRef = useRef<HTMLInputElement>(null);

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

      // Load appearance preferences
      const appearance = user.user_metadata?.appearance;
      if (appearance?.theme)   { setTheme(appearance.theme);     applyTheme(appearance.theme); }
      if (appearance?.density) { setDensity(appearance.density); applyDensity(appearance.density); }
      if (appearance?.lang)    setLang(appearance.lang);

      // Load integration states from user metadata
      const savedIntegrations = user.user_metadata?.integrations ?? {};
      if (Object.keys(savedIntegrations).length > 0) {
        setIntegrations((prev) => ({ ...prev, ...savedIntegrations }));
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, avatar_url, bio")
        .eq("id", user.id)
        .single();
      if (profile?.name)       setName(profile.name);
      if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
      if ((profile as { bio?: string } | null)?.bio) setBio((profile as { bio?: string }).bio ?? "");

      // Load workspace id + members
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id, created_by")
        .eq("slug", workspace)
        .single();
      if (!ws) return;
      setWorkspaceId(ws.id);

      const { data: members } = await supabase
        .from("workspace_members")
        .select("user_id, role, profiles(id, name, avatar_url)")
        .eq("workspace_id", ws.id);

      const roleMap: Record<string, string> = { owner: "Admin", admin: "Admin", member: "Miembro" };
      const loaded: TeamMember[] = (members ?? []).map((m) => {
        const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        return {
          id: p?.id ?? m.user_id,
          name: p?.name ?? "Usuario",
          email: "",
          role: roleMap[m.role] ?? "Miembro",
          avatar_url: p?.avatar_url ?? null,
        };
      });

      // Include workspace creator if not already in workspace_members
      if (ws.created_by && !loaded.find((m) => m.id === ws.created_by)) {
        const { data: creatorProfile } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .eq("id", ws.created_by)
          .single();
        loaded.unshift({
          id: ws.created_by,
          name: creatorProfile?.name ?? "Usuario",
          email: "",
          role: "Admin",
          avatar_url: creatorProfile?.avatar_url ?? null,
        });
      }

      setTeam(loaded);
      setUsageUsers(loaded.length);

      // Real project count
      const { count: projCount } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", ws.id);
      setUsageProjects(projCount ?? 0);

      // Load pending invitations
      const { data: invites } = await supabase
        .from("workspace_invitations")
        .select("id, email, role, sent_at")
        .eq("workspace_id", ws.id)
        .order("sent_at", { ascending: false });

      const roleDisplayMap: Record<string, string> = { owner: "Admin", admin: "Admin", member: "Miembro", moderator: "Moderador" };
      setPendingInvites((invites ?? []).map((i) => ({
        id: i.id,
        email: i.email,
        role: roleDisplayMap[i.role] ?? i.role,
        sentAt: i.sent_at,
      })));

      // Realtime subscription for invitations
      supabase
        .channel(`invitations:${ws.id}`)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "workspace_invitations",
          filter: `workspace_id=eq.${ws.id}`,
        }, (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const i = payload.new as { id: string; email: string; role: string; sent_at: string };
            setPendingInvites((prev) => {
              const filtered = prev.filter((p) => p.id !== i.id);
              return [{ id: i.id, email: i.email, role: roleDisplayMap[i.role] ?? i.role, sentAt: i.sent_at }, ...filtered];
            });
          } else if (payload.eventType === "DELETE") {
            const id = (payload.old as { id: string }).id;
            setPendingInvites((prev) => prev.filter((p) => p.id !== id));
          }
        })
        .subscribe();
    })();
  }, [workspace]);

  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("La imagen no puede superar 2 MB"); return; }

    setAvatarUploading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAvatarUploading(false); return; }

    const ext  = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) { console.error(uploadError); setAvatarUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

    await supabase.from("profiles").update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", user.id);
    setAvatarUrl(publicUrl);
    setAvatarUploading(false);
    // reset input so same file can be re-selected
    e.target.value = "";
  }, []);

  const handleSave = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ name, updated_at: new Date().toISOString() } as Record<string, unknown>)
        .eq("id", user.id);
    }
    // Save appearance
    if (active === "apariencia") {
      await saveAppearance(theme, density, lang);
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
            src={avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4`}
            alt="Avatar"
            className="w-20 h-20 rounded-full border-2 border-gray-200 object-cover"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute bottom-0 right-0 w-7 h-7 bg-[#2F3988] rounded-full flex items-center justify-center border-2 border-white hover:bg-[#3d4aa8] transition-colors disabled:opacity-60"
          >
            <Camera className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Foto de perfil</p>
          <p className="text-xs text-gray-400 mt-0.5">JPG, PNG o GIF · Máx. 2 MB</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="mt-2 text-xs text-[#2F3988] hover:underline font-medium disabled:opacity-60"
          >
            {avatarUploading ? "Subiendo…" : "Cambiar foto"}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
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
              onClick={() => { setTheme(t); applyTheme(t); }}
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
              onClick={() => { setDensity(d); applyDensity(d); }}
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
            onClick={async () => {
              if (!inviteEmail || !workspaceId) return;
              const supabase = createClient();
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;
              const roleDbMap: Record<string, "owner" | "admin" | "member"> = { Miembro: "member", Moderador: "member", Admin: "admin" };
              await supabase
                .from("workspace_invitations")
                .upsert({ workspace_id: workspaceId, email: inviteEmail, role: roleDbMap[inviteRole] ?? "member", invited_by: user.id, sent_at: new Date().toISOString() }, { onConflict: "workspace_id,email" });
              setInviteSent(true);
              setInviteEmail("");
              setTimeout(() => setInviteSent(false), 3000);
            }}
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

      {/* Pending invitations */}
      {pendingInvites.length > 0 && (
        <div className="border border-amber-200 bg-amber-50/40 rounded-xl divide-y divide-amber-100 overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Invitaciones pendientes ({pendingInvites.length})</p>
          </div>
          {pendingInvites.map((inv) => {
            const sentDate = new Date(inv.sentAt);
            const diffMs = Date.now() - sentDate.getTime();
            const diffMin = Math.floor(diffMs / 60000);
            const timeAgo = diffMin < 1 ? "Hace un momento" : diffMin < 60 ? `Hace ${diffMin} min` : diffMin < 1440 ? `Hace ${Math.floor(diffMin/60)}h` : `Hace ${Math.floor(diffMin/1440)}d`;
            return (
              <div key={inv.email} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-600">
                  {inv.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{inv.email}</p>
                  <p className="text-xs text-gray-400">{timeAgo} · Invitado como {inv.role}</p>
                </div>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 mr-2">Pendiente</span>
                <button
                  onClick={async () => {
                    if (!workspaceId) return;
                    const supabase = createClient();
                    await supabase
                      .from("workspace_invitations")
                      .update({ sent_at: new Date().toISOString() })
                      .eq("id", inv.id);
                    setResentEmail(inv.email);
                    setTimeout(() => setResentEmail(null), 2500);
                  }}
                  className={cn(
                    "text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap mr-1",
                    resentEmail === inv.email
                      ? "border-green-200 bg-green-50 text-green-600"
                      : "border-[#2F3988]/30 text-[#2F3988] hover:bg-[#2F3988]/5"
                  )}
                >
                  {resentEmail === inv.email ? <><Check className="w-3 h-3 inline mr-1" />Reenviado</> : "Reenviar"}
                </button>
                <button
                  onClick={async () => {
                    const supabase = createClient();
                    await supabase.from("workspace_invitations").delete().eq("id", inv.id);
                  }}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors whitespace-nowrap"
                >
                  Cancelar
                </button>
              </div>
            );
          })}
        </div>
      )}

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
          { label: "Usuarios",  used: usageUsers,    total: 999, unit: "ilimitados" },
          { label: "Proyectos", used: usageProjects, total: 999, unit: "ilimitados" },
        ]
      : [
          { label: "Usuarios",  used: usageUsers,    total: 5, unit: `de 5` },
          { label: "Proyectos", used: usageProjects, total: 3, unit: `de 3` },
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
                <p className="text-xs text-gray-400">{u.used} {u.unit === "ilimitados" ? "ilimitados" : `${u.unit}`}</p>
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

  const saveIntegration = async (key: string, state: IntegrationState) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const current = user.user_metadata?.integrations ?? {};
    await supabase.auth.updateUser({
      data: { integrations: { ...current, [key]: state } },
    });
    setIntegrations((prev) => ({ ...prev, [key]: state }));
  };

  const disconnectIntegration = async (key: string) => {
    await saveIntegration(key, { connected: false });
  };

  const handleConnectGitHub = async () => {
    setIntLoading(true);
    setIntError("");
    try {
      const res = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${intInput}`, Accept: "application/vnd.github+json" },
      });
      if (!res.ok) { setIntError("Token inválido o sin permisos. Verifica el PAT en GitHub."); setIntLoading(false); return; }
      const data = await res.json();
      await saveIntegration("github", { connected: true, meta: { login: data.login, name: data.name ?? data.login } });
      setIntModal(null);
      setIntInput("");
    } catch { setIntError("Error de red. Intenta de nuevo."); }
    setIntLoading(false);
  };

  const handleConnectZapierMake = async (key: string) => {
    await saveIntegration(key, {
      connected: true,
      meta: { webhook: `https://agenda.me/api/webhooks/${workspace}/${key}` },
    });
    setIntModal(null);
  };

  const INTEGRATIONS_CONFIG = [
    {
      key: "github",
      name: "GitHub",
      desc: "Vincula repositorios y Pull Requests a tus tareas",
      color: "#24292e",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>
      ),
    },
    {
      key: "googledrive",
      name: "Google Drive",
      desc: "Adjunta archivos de Drive directamente en tareas",
      color: "#4285F4",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#4285F4" d="M6.28 3L1 12.36l2.91 5.05L9.2 8.05 6.28 3z"/><path fill="#FBBC05" d="M17.72 3l-5.57 9.64h5.83L23 12.36 17.72 3z"/><path fill="#34A853" d="M8.14 17.41l2.92 5.05h5.88l2.92-5.05H8.14z"/></svg>
      ),
    },
    {
      key: "zapier",
      name: "Zapier",
      desc: "Automatiza flujos de trabajo con miles de apps",
      color: "#FF4A00",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-[#FF4A00]"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.25 13.125h-4.125v4.125a1.125 1.125 0 01-2.25 0v-4.125H6.75a1.125 1.125 0 010-2.25h4.125V6.75a1.125 1.125 0 012.25 0v4.125h4.125a1.125 1.125 0 010 2.25z"/></svg>
      ),
    },
    {
      key: "make",
      name: "Make",
      desc: "Crea automatizaciones visuales entre tus herramientas",
      color: "#6D0FC8",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-[#6D0FC8]"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
      ),
    },
  ];

  const renderIntegraciones = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Integraciones</h3>
        <p className="text-sm text-gray-500">Conecta agenda.ME con tus herramientas favoritas.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {INTEGRATIONS_CONFIG.map((app) => {
          const state = integrations[app.key];
          return (
            <div key={app.key} className={cn(
              "border rounded-xl p-4 flex items-start gap-3 transition-all",
              state.connected ? "border-green-200 bg-green-50/30" : "border-gray-200 hover:border-gray-300"
            )}>
              <div className="w-10 h-10 rounded-lg bg-white border border-gray-100 shadow-sm flex items-center justify-center flex-shrink-0">
                {app.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">{app.name}</p>
                  {state.connected && (
                    <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Conectado</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{app.desc}</p>
                {state.connected && state.meta?.login && (
                  <p className="text-xs text-gray-500 mt-1 font-medium">@{state.meta.login}</p>
                )}
                {state.connected && state.meta?.webhook && (
                  <p className="text-[11px] text-gray-400 mt-1 font-mono truncate">{state.meta.webhook}</p>
                )}
              </div>
              <button
                onClick={() => state.connected ? disconnectIntegration(app.key) : setIntModal(app.key)}
                className={cn(
                  "flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap",
                  state.connected
                    ? "border-red-200 text-red-500 bg-white hover:bg-red-50"
                    : "border-gray-200 text-gray-600 hover:border-[#2F3988] hover:text-[#2F3988]"
                )}
              >
                {state.connected ? "Desconectar" : "Conectar"}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Modals ── */}
      {intModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            {/* GitHub Modal */}
            {intModal === "github" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-white">
                    {INTEGRATIONS_CONFIG[0].icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Conectar GitHub</h4>
                    <p className="text-xs text-gray-400">Usa un Personal Access Token (PAT)</p>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 text-xs text-blue-700 space-y-1">
                  <p className="font-semibold">Cómo obtener tu token:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
                    <li>Ve a GitHub → Settings → Developer settings</li>
                    <li>Personal access tokens → Tokens (classic)</li>
                    <li>Generate new token → selecciona <code className="bg-blue-100 px-1 rounded">repo</code></li>
                  </ol>
                </div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Personal Access Token</label>
                <input
                  ref={intInputRef}
                  type="password"
                  value={intInput}
                  onChange={(e) => setIntInput(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-[#2F3988] focus:ring-2 focus:ring-[#2F3988]/10"
                />
                {intError && <p className="text-xs text-red-500 mt-2">{intError}</p>}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => { setIntModal(null); setIntInput(""); setIntError(""); }} className="flex-1 text-sm py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancelar</button>
                  <button
                    onClick={handleConnectGitHub}
                    disabled={!intInput.trim() || intLoading}
                    className="flex-1 text-sm py-2 rounded-xl bg-gray-900 text-white font-semibold disabled:opacity-50 hover:bg-gray-800 transition-colors"
                  >
                    {intLoading ? "Verificando…" : "Conectar"}
                  </button>
                </div>
              </>
            )}

            {/* Google Drive Modal */}
            {intModal === "googledrive" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center">
                    {INTEGRATIONS_CONFIG[1].icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Conectar Google Drive</h4>
                    <p className="text-xs text-gray-400">Autoriza el acceso a tus archivos</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Al conectar Google Drive podrás adjuntar archivos directamente desde tu Drive en cualquier tarea del workspace.
                </p>
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-4 text-xs text-amber-700">
                  Necesitas una cuenta Google activa. Se abrirá una ventana de autorización.
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setIntModal(null)} className="flex-1 text-sm py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancelar</button>
                  <button
                    onClick={async () => {
                      // Mark as connected (OAuth flow would go here with real credentials)
                      await saveIntegration("googledrive", { connected: true, meta: { scope: "drive.readonly" } });
                      setIntModal(null);
                    }}
                    className="flex-1 text-sm py-2 rounded-xl font-semibold text-white transition-colors"
                    style={{ background: "#4285F4" }}
                  >
                    Autorizar con Google
                  </button>
                </div>
              </>
            )}

            {/* Zapier Modal */}
            {intModal === "zapier" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                    {INTEGRATIONS_CONFIG[2].icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Conectar Zapier</h4>
                    <p className="text-xs text-gray-400">Webhook para automatizaciones</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                  Copia este webhook URL y pégalo en tu Zap de Zapier como trigger o action.
                </p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 mb-4">
                  <code className="text-xs text-gray-700 flex-1 truncate font-mono">
                    https://agenda.me/api/webhooks/{workspace}/zapier
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(`https://agenda.me/api/webhooks/${workspace}/zapier`)}
                    className="text-xs text-[#2F3988] font-semibold hover:underline flex-shrink-0"
                  >Copiar</button>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-xs text-orange-700 mb-4 space-y-1">
                  <p className="font-semibold">Pasos en Zapier:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Crea un nuevo Zap → elige trigger</li>
                    <li>En Action busca "Webhooks by Zapier"</li>
                    <li>Elige POST y pega el URL de arriba</li>
                  </ol>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setIntModal(null)} className="flex-1 text-sm py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancelar</button>
                  <button
                    onClick={() => handleConnectZapierMake("zapier")}
                    className="flex-1 text-sm py-2 rounded-xl font-semibold text-white transition-colors"
                    style={{ background: "#FF4A00" }}
                  >
                    Activar integración
                  </button>
                </div>
              </>
            )}

            {/* Make Modal */}
            {intModal === "make" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                    {INTEGRATIONS_CONFIG[3].icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Conectar Make</h4>
                    <p className="text-xs text-gray-400">Webhook para escenarios de automatización</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                  Copia este webhook URL y pégalo en tu escenario de Make como módulo HTTP.
                </p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 mb-4">
                  <code className="text-xs text-gray-700 flex-1 truncate font-mono">
                    https://agenda.me/api/webhooks/{workspace}/make
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(`https://agenda.me/api/webhooks/${workspace}/make`)}
                    className="text-xs text-[#6D0FC8] font-semibold hover:underline flex-shrink-0"
                  >Copiar</button>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-xs text-purple-700 mb-4 space-y-1">
                  <p className="font-semibold">Pasos en Make:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Crea un nuevo escenario</li>
                    <li>Agrega módulo "Webhooks" → Custom webhook</li>
                    <li>Pega el URL de arriba y guarda</li>
                  </ol>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setIntModal(null)} className="flex-1 text-sm py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancelar</button>
                  <button
                    onClick={() => handleConnectZapierMake("make")}
                    className="flex-1 text-sm py-2 rounded-xl font-semibold text-white transition-colors"
                    style={{ background: "#6D0FC8" }}
                  >
                    Activar integración
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
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
