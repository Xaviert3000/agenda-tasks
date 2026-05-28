"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { NewTaskModal } from "./NewTaskModal";

export function NewTaskButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
        style={{ background: "#2F3988" }}
      >
        <Plus className="w-4 h-4" />
        Nueva Tarea
      </button>
      <NewTaskModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
