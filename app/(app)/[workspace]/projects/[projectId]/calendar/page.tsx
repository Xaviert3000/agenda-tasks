"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useKanbanStore } from "@/lib/store/kanbanStore";
import { useFilteredLists } from "@/lib/hooks/useFilteredLists";
import { getProjectById } from "@/lib/data/mockData";
import { cn } from "@/lib/utils";
import type { Task, KanbanList } from "@/types/domain";

const WEEK_DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const STATUS_COLORS: Record<string, string> = {
  todo:         "#EF4444",
  "in-progress":"#3B82F6",
  review:       "#F59E0B",
  done:         "#22C55E",
};

interface CalTask extends Task { listId: string; listColor: string }

export default function CalendarPage() {
  const params    = useParams();
  const projectId = params.projectId as string;

  const project     = getProjectById(projectId);
  const lists        = useFilteredLists(project.lists);

  const today = new Date();
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() });

  // Flatten all tasks with list color
  const allTasks = useMemo<CalTask[]>(() =>
    lists.flatMap((list) =>
      list.tasks.map((t) => ({ ...t, listId: list.id, listColor: STATUS_COLORS[list.id] ?? list.color }))
    ),
    [lists]
  );

  // Tasks with a due date, keyed by YYYY-MM-DD
  const tasksByDate = useMemo(() => {
    const map: Record<string, CalTask[]> = {};
    allTasks.forEach((task) => {
      if (!task.dueDate) return;
      const key = task.dueDate.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [allTasks]);

  // Tasks without a due date
  const undatedTasks = useMemo(() => allTasks.filter((t) => !t.dueDate), [allTasks]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const { year, month } = current;
    const firstDay = new Date(year, month, 1).getDay();   // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev  = new Date(year, month, 0).getDate();

    const cells: { date: Date; isCurrentMonth: boolean }[] = [];

    // Leading days from prev month
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, month - 1, daysInPrev - i), isCurrentMonth: false });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), isCurrentMonth: true });
    }
    // Trailing days to fill 6 rows
    const remainder = 42 - cells.length;
    for (let d = 1; d <= remainder; d++) {
      cells.push({ date: new Date(year, month + 1, d), isCurrentMonth: false });
    }
    return cells;
  }, [current]);

  const prevMonth = () => setCurrent(({ year, month }) =>
    month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
  );
  const nextMonth = () => setCurrent(({ year, month }) =>
    month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
  );

  const isToday = (date: Date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth()    === today.getMonth()    &&
    date.getDate()     === today.getDate();

  const dateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Calendar grid ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-800">
            {MONTHS_ES[current.month]} {current.year}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrent({ year: today.getFullYear(), month: today.getMonth() })}
              className="px-3 h-8 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 flex-shrink-0">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-7 h-full" style={{ gridAutoRows: "minmax(90px, 1fr)" }}>
            {calendarDays.map(({ date, isCurrentMonth }, i) => {
              const key    = dateKey(date);
              const tasks  = tasksByDate[key] ?? [];
              const todayCell = isToday(date);

              return (
                <div
                  key={i}
                  className={cn(
                    "border-b border-r border-gray-100 p-1.5 overflow-hidden",
                    !isCurrentMonth && "bg-gray-50/50",
                    todayCell && "bg-blue-50/30"
                  )}
                >
                  {/* Day number */}
                  <div className="flex justify-end mb-1">
                    <span
                      className={cn(
                        "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                        todayCell
                          ? "bg-[#2F3988] text-white"
                          : isCurrentMonth
                            ? "text-gray-700"
                            : "text-gray-300"
                      )}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  {/* Tasks on this day */}
                  <div className="space-y-0.5">
                    {tasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        title={task.title}
                        className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium text-white truncate cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ background: task.listColor }}
                      >
                        <span className="truncate">{task.title}</span>
                      </div>
                    ))}
                    {tasks.length > 3 && (
                      <p className="text-[10px] text-gray-400 px-1">+{tasks.length - 3} más</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Undated tasks sidebar ── */}
      <div className="w-52 flex-shrink-0 border-l border-gray-200 flex flex-col bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-600">Sin fecha</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{undatedTasks.length} tareas</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1.5">
          {undatedTasks.length === 0 ? (
            <p className="text-[11px] text-gray-400 text-center mt-4">Todas las tareas tienen fecha 🎉</p>
          ) : (
            undatedTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-lg border border-gray-100 bg-gray-50 p-2 hover:bg-white hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: task.listColor }} />
                  <span className="text-[10px] text-gray-400 truncate">
                    {lists.find((l) => l.id === task.listId)?.name}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-gray-700 line-clamp-2 leading-snug">
                  {task.title}
                </p>
                {task.assignees.length > 0 && (
                  <div className="flex -space-x-1 mt-1.5">
                    {task.assignees.slice(0, 3).map((a) => (
                      <img key={a.id} src={a.avatar} alt={a.name}
                        className="w-4 h-4 rounded-full border border-white" />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
