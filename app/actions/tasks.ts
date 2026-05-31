"use server";

import { createClient } from "@/lib/supabase/server";

export async function createTask(
  listId: string,
  title: string,
  priority: "low" | "med" | "high" | "urgent" = "med"
): Promise<{ id: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

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
    console.error("createTask error:", error.message);
    return null;
  }
  return data;
}

export async function moveTask(taskId: string, newListId: string): Promise<void> {
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
  // Delete existing and re-insert
  await supabase.from("task_assignees").delete().eq("task_id", taskId);
  if (userIds.length > 0) {
    await supabase.from("task_assignees").insert(
      userIds.map((uid) => ({ task_id: taskId, user_id: uid }))
    );
  }
}
