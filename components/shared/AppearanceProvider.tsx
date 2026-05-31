"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export type Theme   = "light" | "dark" | "system";
export type Density = "compact" | "default" | "comfortable";

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    // system
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    prefersDark ? root.classList.add("dark") : root.classList.remove("dark");
  }
}

export function applyDensity(density: Density) {
  document.documentElement.setAttribute("data-density", density);
}

export async function saveAppearance(theme: Theme, density: Density, lang: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.auth.updateUser({
    data: { appearance: { theme, density, lang } },
  });
}

export function AppearanceProvider() {
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const appearance = user?.user_metadata?.appearance;
      if (appearance?.theme)   applyTheme(appearance.theme);
      if (appearance?.density) applyDensity(appearance.density);
      if (appearance?.lang) {
        document.documentElement.setAttribute("lang", appearance.lang === "en" ? "en-US" : appearance.lang === "pt" ? "pt-BR" : "es-MX");
      }
    })();

    // Watch system theme changes
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.user_metadata?.appearance?.theme === "system") applyTheme("system");
      });
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return null;
}
