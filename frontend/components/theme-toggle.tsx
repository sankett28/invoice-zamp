"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon, Desktop } from "@phosphor-icons/react";

type ThemeMode = "light" | "dark" | "system";

export function ThemeToggle({ className }: { className?: string } = {}) {
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
      <div className="w-8 h-8 rounded-full border border-white/20 bg-white/10 animate-pulse" />
    );
  }

  return (
    <button
      onClick={cycleTheme}
      className={
        className ||
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/35 bg-black/30 hover:bg-black/45 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
      }
      title={`Theme: ${theme}. Click to switch.`}
      type="button"
    >
      {theme === "light" && <Sun size={15} weight="bold" className="text-amber-400 shrink-0" />}
      {theme === "dark" && <Moon size={15} weight="bold" className="text-emerald-300 shrink-0" />}
      {theme === "system" && <Desktop size={15} weight="bold" className="text-white/80 shrink-0" />}
      <span className="capitalize text-xs font-semibold text-white drop-shadow-2xs hidden sm:inline">{theme}</span>
    </button>
  );
}
