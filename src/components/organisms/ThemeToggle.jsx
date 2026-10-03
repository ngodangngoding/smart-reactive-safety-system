"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

function subscribe(callback) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const getTheme = () => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");

function setTheme(theme) {
  if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  try {
    window.localStorage.setItem("theme", theme);
  } catch {
  }
}

const OPTIONS = [
  { value: "light", label: "Light mode", icon: Sun },
  { value: "dark", label: "Dark mode", icon: Moon },
];

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light");

  return (
    <div role="group" aria-label="Theme" className="inline-flex gap-0.5 rounded-full bg-segment-track-page p-[3px]">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={active}
            onClick={() => setTheme(value)}
            className={`flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full transition-colors ${
              active ? "bg-primary text-white" : "text-text-secondary hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
