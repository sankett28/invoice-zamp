"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon, Desktop } from "@phosphor-icons/react";

type ThemeMode = "light" | "dark" | "system";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = (localStorage.getItem("ledgerflow-theme") as ThemeMode) || "system";
    setTheme(stored);
    applyTheme(stored);
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    const root = document.documentElement;
    if (mode === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else if (mode === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.remove("dark");
      root.classList.remove("light");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark");
      }
    }
  };

  const cycleTheme = () => {
    const next: ThemeMode = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
    localStorage.setItem("ledgerflow-theme", next);
    applyTheme(next);
  };

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-xl border border-border bg-card animate-pulse" />
    );
  }

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-medium transition shadow-xs cursor-pointer"
      title={`Theme: ${theme}. Click to switch.`}
      type="button"
    >
      {theme === "light" && <Sun size={15} weight="regular" className="text-secondary-foreground" />}
      {theme === "dark" && <Moon size={15} weight="regular" className="text-primary" />}
      {theme === "system" && <Desktop size={15} weight="regular" className="text-muted-foreground" />}
      <span className="capitalize text-xs font-medium hidden sm:inline text-muted-foreground">{theme}</span>
    </button>
  );
}
