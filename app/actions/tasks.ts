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
