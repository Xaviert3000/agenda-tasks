"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function createTask(
  listId: string,
  title: string,
  priority: "low" | "med" | "high" | "urgent" = "med"
): Promise<{ id: string } | { error: string } | null> {
  const authClient = await createClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError) {
    console.error("createTask auth error:", authError.message);
    return { error: "No autenticado" };
  }
  if (!user) return { error: "No autenticado" };

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      list_id: listId,
      title,
      priority,
      created_by: user.id,
      position: Math.floor(Date.now() / 1000),
    })
    .select("id")
    .single();

  if (error) {
    console.error("createTask error:", error.code, error.message, "listId:", listId);
    return { error: error.message };
  }
  return data;
}

export async function moveTask(taskId: string, newListId: string): Promise<void> {
  if (!taskId || taskId.startsWith("temp-")) return;
  const supabase = createServiceClient();
  await supabase.from("tasks").update({ list_id: newListId }).eq("id", taskId);
}

export async function updateTaskField(
  taskId: string,
  fields: {
    title?: string;
    description?: string;
    priority?: "low" | "med" | "high" | "urgent";
    due_date?: string | null;
    list_id?: string;
    estimation?: string | null;
  }
): Promise<void> {
  if (!taskId || taskId.startsWith("temp-")) return;
  const supabase = createServiceClient();
  const { error } = await supabase.from("tasks").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", taskId);
  if (error) console.error("[updateTaskField] error:", error.code, error.message, "taskId:", taskId, "fields:", fields);
}

export async function setTaskAssignees(taskId: string, userIds: string[]): Promise<void> {
  if (!taskId || taskId.startsWith("temp-")) return;
  const supabase = createServiceClient();
  await supabase.from("task_assignees").delete().eq("task_id", taskId);
  if (userIds.length > 0) {
    await supabase.from("task_assignees").insert(
      userIds.map((uid) => ({ task_id: taskId, user_id: uid }))
    );
  }
}

/* ── Labels ── */

async function getWorkspaceIdForTask(supabase: ReturnType<typeof createServiceClient>, taskId: string): Promise<string | null> {
  const { data: task } = await supabase.from("tasks").select("list_id").eq("id", taskId).single();
  if (!task) return null;
  const { data: col } = await supabase.from("kanban_columns").select("list_id").eq("id", task.list_id).single();
  if (!col) return null;
  const { data: list } = await supabase.from("kanban_lists").select("project_id").eq("id", col.list_id).single();
  if (!list) return null;
  const { data: proj } = await supabase.from("projects").select("workspace_id").eq("id", list.project_id).single();
  return proj?.workspace_id ?? null;
}

export async function addTaskLabel(
  taskId: string,
  label: { name: string; light: string; solid: string }
): Promise<{ labelId: string } | null> {
  if (!taskId || taskId.startsWith("temp-")) return null;
  const supabase = createServiceClient();
  const workspaceId = await getWorkspaceIdForTask(supabase, taskId);
  if (!workspaceId) return null;

  // Upsert label by name+workspace (reuse if already exists)
  const { data: existing } = await supabase
    .from("labels")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", label.name)
    .single();

  let labelId: string;
  if (existing) {
    labelId = existing.id;
  } else {
    const { data: created, error } = await supabase
      .from("labels")
      .insert({ workspace_id: workspaceId, name: label.name, light_color: label.light, solid_color: label.solid })
      .select("id")
      .single();
    if (error || !created) return null;
    labelId = created.id;
  }

  await supabase.from("task_labels").upsert({ task_id: taskId, label_id: labelId });
  return { labelId };
}

export async function removeTaskLabel(taskId: string, labelId: string): Promise<void> {
  if (!taskId || taskId.startsWith("temp-")) return;
  const supabase = createServiceClient();
  await supabase.from("task_labels").delete().eq("task_id", taskId).eq("label_id", labelId);
}

/* ── Subtasks ── */

export async function createSubtask(taskId: string, title: string): Promise<{ id: string } | null> {
  if (!taskId || taskId.startsWith("temp-")) return null;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("subtasks")
    .insert({ task_id: taskId, title, position: Date.now() })
    .select("id")
    .single();
  if (error) { console.error("[createSubtask] error:", error.message); return null; }
  return data;
}

export async function toggleSubtask(subtaskId: string, isDone: boolean): Promise<void> {
  if (!subtaskId || subtaskId.startsWith("s")) return;
  const supabase = createServiceClient();
  await supabase.from("subtasks").update({ is_completed: isDone }).eq("id", subtaskId);
}

export async function deleteSubtask(subtaskId: string): Promise<void> {
  if (!subtaskId || subtaskId.startsWith("s")) return;
  const supabase = createServiceClient();
  await supabase.from("subtasks").delete().eq("id", subtaskId);
}

/* ── Comments ── */

export async function getTaskComments(taskId: string): Promise<
  { id: string; userId: string; body: string; createdAt: string; author: { name: string; avatar: string } }[]
> {
  if (!taskId || taskId.startsWith("temp-")) return [];
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("task_comments")
    .select("id, user_id, body, created_at, profiles(name, avatar_url)")
    .eq("task_id", taskId)
    .order("created_at");
  if (!data) return [];
  return data.map((c) => {
    const p = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
    return {
      id: c.id,
      userId: c.user_id,
      body: c.body,
      createdAt: c.created_at,
      author: {
        name: p?.name ?? "Usuario",
        avatar: p?.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.user_id}`,
      },
    };
  });
}

export async function addTaskComment(
  taskId: string,
  body: string
): Promise<{ id: string; createdAt: string } | null> {
  if (!taskId || taskId.startsWith("temp-")) return null;
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("task_comments")
    .insert({ task_id: taskId, user_id: user.id, body })
    .select("id, created_at")
    .single();
  if (error || !data) return null;
  return { id: data.id, createdAt: data.created_at };
}

export async function deleteTaskComment(commentId: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("task_comments").delete().eq("id", commentId);
}

/* ── Attachments ── */

export async function getTaskAttachments(taskId: string): Promise<
  { id: string; name: string; sizeBytes: number; mimeType: string; storagePath: string; url: string | null }[]
> {
  if (!taskId || taskId.startsWith("temp-")) return [];
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("task_attachments")
    .select("id, name, size_bytes, mime_type, storage_path")
    .eq("task_id", taskId)
    .order("created_at");
  if (!data) return [];
  return await Promise.all(
    data.map(async (a) => {
      const { data: signed } = await supabase.storage
        .from("task-attachments")
        .createSignedUrl(a.storage_path, 3600);
      return {
        id: a.id,
        name: a.name,
        sizeBytes: a.size_bytes,
        mimeType: a.mime_type,
        storagePath: a.storage_path,
        url: signed?.signedUrl ?? null,
      };
    })
  );
}

export async function uploadTaskAttachment(
  taskId: string,
  file: File
): Promise<{ id: string; url: string | null } | null> {
  if (!taskId || taskId.startsWith("temp-")) return null;
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;
  const supabase = createServiceClient();

  const ext = file.name.split(".").pop() ?? "bin";
  const storagePath = `${taskId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("task-attachments")
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) return null;

  const { data: record, error: dbError } = await supabase
    .from("task_attachments")
    .insert({
      task_id: taskId,
      created_by: user.id,
      name: file.name,
      size_bytes: file.size,
      mime_type: file.type || "application/octet-stream",
      storage_path: storagePath,
    })
    .select("id")
    .single();
  if (dbError || !record) return null;

  const { data: signed } = await supabase.storage
    .from("task-attachments")
    .createSignedUrl(storagePath, 3600);

  return { id: record.id, url: signed?.signedUrl ?? null };
}

export async function deleteTaskAttachment(attachmentId: string, storagePath: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("task_attachments").delete().eq("id", attachmentId);
  await supabase.storage.from("task-attachments").remove([storagePath]);
}
