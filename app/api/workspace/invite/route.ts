import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "invitaciones@sellpulse.com";

function buildEmailHtml(opts: {
  inviterName: string;
  workspaceName: string;
  role: string;
  inviteUrl: string;
}) {
  const roleLabel = opts.role === "admin" ? "Administrador" : opts.role === "member" ? "Miembro" : "Moderador";
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#2F3988;padding:28px 40px;text-align:center;">
            <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">SellPulse</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1a1f36;">
              Te han invitado a unirte
            </h1>
            <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
              <strong style="color:#1a1f36;">${opts.inviterName}</strong> te ha invitado a colaborar en
              <strong style="color:#2F3988;">${opts.workspaceName}</strong> como <strong>${roleLabel}</strong>.
            </p>
            <a href="${opts.inviteUrl}"
               style="display:inline-block;background:#2F3988;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
              Aceptar invitación
            </a>
            <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
              O copia y pega este enlace en tu navegador:<br/>
              <a href="${opts.inviteUrl}" style="color:#2F3988;word-break:break-all;">${opts.inviteUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f3f4f6;background:#fafafa;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
              Si no esperabas esta invitación puedes ignorar este correo.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// GET /api/workspace/invite?id=xxx — fetch invite details publicly (uses service role)
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = createServiceClient();

  const { data: inv } = await supabase
    .from("workspace_invitations")
    .select("id, email, role, workspace_id, invited_by")
    .eq("id", id)
    .single();

  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: ws }, { data: profile }] = await Promise.all([
    supabase.from("workspaces").select("name").eq("id", inv.workspace_id).single(),
    supabase.from("profiles").select("name").eq("id", inv.invited_by).single(),
  ]);

  return NextResponse.json({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    workspace_id: inv.workspace_id,
    workspaceName: ws?.name ?? "el workspace",
    inviterName: profile?.name ?? "Un miembro del equipo",
  });
}

// POST /api/workspace/invite — create invitation + send email
export async function POST(req: NextRequest) {
  try {
    const { workspaceId, workspaceSlug, email, role, invitedBy } = await req.json();
    if (!workspaceId || !email || !role || !invitedBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Upsert invitation record
    const { data: invite, error: dbError } = await supabase
      .from("workspace_invitations")
      .upsert(
        { workspace_id: workspaceId, email, role, invited_by: invitedBy, sent_at: new Date().toISOString() },
        { onConflict: "workspace_id,email" }
      )
      .select("id")
      .single();

    if (dbError) {
      console.error("[invite] DB error:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Fetch inviter profile and workspace name
    const [{ data: profile }, { data: workspace }] = await Promise.all([
      supabase.from("profiles").select("name").eq("id", invitedBy).single(),
      supabase.from("workspaces").select("name").eq("id", workspaceId).single(),
    ]);

    const inviterName = profile?.name ?? "Un miembro del equipo";
    const workspaceName = workspace?.name ?? "el workspace";
    const inviteUrl = `${APP_URL}/invite/${invite?.id ?? ""}?ws=${workspaceSlug ?? workspaceId}`;

    // Send email if Resend is configured
    if (resend) {
      const { error: emailError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `${inviterName} te invitó a ${workspaceName} en SellPulse`,
        html: buildEmailHtml({ inviterName, workspaceName, role, inviteUrl }),
      });
      if (emailError) {
        console.error("[invite] Email error:", emailError);
        // Don't fail the request — invite was saved, email just didn't go out
        return NextResponse.json({ success: true, emailSent: false, warning: emailError.message });
      }
    } else {
      console.warn("[invite] RESEND_API_KEY not configured — invitation saved but no email sent.");
      return NextResponse.json({ success: true, emailSent: false, warning: "RESEND_API_KEY not configured" });
    }

    return NextResponse.json({ success: true, emailSent: true });
  } catch (err) {
    console.error("[invite] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/workspace/invite — resend invitation email
export async function PUT(req: NextRequest) {
  try {
    const { inviteId, workspaceSlug } = await req.json();
    if (!inviteId) {
      return NextResponse.json({ error: "Missing inviteId" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: invite, error } = await supabase
      .from("workspace_invitations")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", inviteId)
      .select("id, email, role, workspace_id, invited_by")
      .single();

    if (error || !invite) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const [{ data: profile }, { data: workspace }] = await Promise.all([
      supabase.from("profiles").select("name").eq("id", invite.invited_by).single(),
      supabase.from("workspaces").select("name").eq("id", invite.workspace_id).single(),
    ]);

    const inviterName = profile?.name ?? "Un miembro del equipo";
    const workspaceName = workspace?.name ?? "el workspace";
    const inviteUrl = `${APP_URL}/invite/${invite.id}?ws=${workspaceSlug ?? invite.workspace_id}`;

    if (resend) {
      const { error: emailError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: invite.email,
        subject: `Recordatorio: ${inviterName} te invitó a ${workspaceName} en SellPulse`,
        html: buildEmailHtml({ inviterName, workspaceName, role: invite.role, inviteUrl }),
      });
      if (emailError) {
        return NextResponse.json({ success: true, emailSent: false, warning: emailError.message });
      }
    } else {
      return NextResponse.json({ success: true, emailSent: false, warning: "RESEND_API_KEY not configured" });
    }

    return NextResponse.json({ success: true, emailSent: true });
  } catch (err) {
    console.error("[invite/resend] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
