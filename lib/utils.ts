import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  // Parse as local date (avoid UTC-midnight timezone shift)
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const days = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (days < 0) return `Vencida hace ${Math.abs(days)}d`;
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `${date.getDate()} ${date.toLocaleString("es-MX", { month: "short" })}`;
}

export const PRIORITY_CONFIG = {
  urgent: { label: "Urgente", bg: "#FEE2E2", text: "#EF4444" },
  high: { label: "Alta", bg: "#FFEDD5", text: "#F97316" },
  med: { label: "Media", bg: "#DBEAFE", text: "#3B82F6" },
  low: { label: "Baja", bg: "#F3F4F6", text: "#6B7280" },
} as const;
