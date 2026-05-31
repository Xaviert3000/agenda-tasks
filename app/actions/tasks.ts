"use server";

import { createClient } from "@/lib/supabase/server";

export async function createTask(
  listId: string,
  title: string,
  priority: "low" | "med" | "high" | "urgent" = "med"
): Promise<{ id: string } | { error: string } | null> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("createTask auth error:", authError.message);
    return { error: "No autenticado" };
  }
  if (!user) return { error: "No autenticado" };

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      list_id: listId,
      title,
      priority,
      created_by: user.id,
      position: Date.now(),
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
  const supabase = await createClient();
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
  }
): Promise<void> {
  if (!taskId || taskId.startsWith("temp-")) return;
  const supabase = await createClient();
  await supabase.from("tasks").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", taskId);
}

export async function setTaskAssignees(taskId: string, userIds: string[]): Promise<void> {
  if (!taskId || taskId.startsWith("temp-")) return;
  const supabase = await createClient();
  await supabase.from("task_assignees").delete().eq("task_id", taskId);
  if (userIds.length > 0) {
    await supabase.from("task_assignees").insert(
      userIds.map((uid) => ({ task_id: taskId, user_id: uid }))
    );
  }
}

/* ── Labels ── */

async function getWorkspaceIdForTask(supabase: Awaited<ReturnType<typeof createClient>>, taskId: string): Promise<string | null> {
  const { data: task } = await supabase.from("tasks").select("list_id").eq("id", taskId).single();
  if (!task) return null;
  const { data: list } = await supabase.from("kanban_lists").select("project_id").eq("id", task.list_id).single();
  if (!list) return null;
  const { data: proj } = await supabase.from("projects").select("workspace_id").eq("id", list.project_id).single();
  return proj?.workspace_id ?? null;
}

export async function addTaskLabel(
  taskId: string,
  label: { name: string; light: string; solid: string }
): Promise<{ labelId: string } | null> {
  if (!taskId || taskId.startsWith("temp-")) return null;
  const supabase = await createClient();
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
  const supabase = await createClient();
  await supabase.from("task_labels").delete().eq("task_id", taskId).eq("label_id", labelId);
}

/* ── Subtasks ── */

export async function createSubtask(taskId: string, title: string): Promise<{ id: string } | null> {
  if (!taskId || taskId.startsWith("temp-")) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subtasks")
    .insert({ task_id: taskId, title, position: Date.now() })
    .select("id")
    .single();
  if (error) return null;
  return data;
}

export async function toggleSubtask(subtaskId: string, isDone: boolean): Promise<void> {
  if (!subtaskId || subtaskId.startsWith("s")) return; // skip mock IDs
  const supabase = await createClient();
  await supabase.from("subtasks").update({ is_completed: isDone }).eq("id", subtaskId);
}

export async function deleteSubtask(subtaskId: string): Promise<void> {
  if (!subtaskId || subtaskId.startsWith("s")) return; // skip mock IDs
  const supabase = await createClient();
  await supabase.from("subtasks").delete().eq("id", subtaskId);
}
