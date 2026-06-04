import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// POST /api/workspace/invite/accept
export async function POST(req: NextRequest) {
  try {
    const { inviteId, userId } = await req.json();
    if (!inviteId || !userId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch the invitation
    const { data: invite, error: inviteError } = await supabase
      .from("workspace_invitations")
      .select("id, workspace_id, email, role")
      .eq("id", inviteId)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: "Invitation not found or already used" }, { status: 404 });
    }

    // Verify user email matches invite email
    const { data: { user } } = await supabase.auth.admin.getUserById(userId);
    if (!user || user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json({ error: "Email does not match the invitation" }, { status: 403 });
    }

    // Add user to workspace_members (ignore conflict if already a member)
    const { error: memberError } = await supabase
      .from("workspace_members")
      .upsert(
        { workspace_id: invite.workspace_id, user_id: userId, role: invite.role },
        { onConflict: "workspace_id,user_id" }
      );

    if (memberError) {
      console.error("[invite/accept] member error:", memberError);
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    // Delete the invitation so it can't be reused
    await supabase.from("workspace_invitations").delete().eq("id", inviteId);

    // Get workspace slug for redirect
    const { data: ws } = await supabase
      .from("workspaces")
      .select("slug")
      .eq("id", invite.workspace_id)
      .single();

    return NextResponse.json({ success: true, workspaceSlug: ws?.slug ?? null });
  } catch (err) {
    console.error("[invite/accept] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
