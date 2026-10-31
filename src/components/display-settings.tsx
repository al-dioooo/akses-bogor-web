"use client";

import { useRef, useState } from "react";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconSunMoon } from "@/ui/icons";
import { DISPLAY_STORAGE_KEY } from "./display-script";

const THEMES = ["perangkat", "terang", "gelap"] as const;
const MOTIONS = ["perangkat", "off"] as const;

type Settings = { theme: (typeof THEMES)[number]; motion: (typeof MOTIONS)[number] };

export type DisplayLabels = {
  open: string;
  title: string;
  mode: string;
  modeHint: string;
  theme: Record<Settings["theme"], string>;
  motion: string;
  motionHint: string;
  motionOption: Record<Settings["motion"], string>;
  done: string;
};

function readSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(DISPLAY_STORAGE_KEY) ?? "{}") as Partial<Settings>;
    return {
      theme: THEMES.includes(saved.theme as Settings["theme"]) ? (saved.theme as Settings["theme"]) : "perangkat",
      motion: saved.motion === "off" ? "off" : "perangkat",
    };
  } catch {
    return { theme: "perangkat", motion: "perangkat" };
  }
}

function applySettings({ theme, motion }: Settings) {
  const root = document.documentElement;
  if (theme === "perangkat") delete root.dataset.theme;
  else root.dataset.theme = theme;
  if (motion === "off") root.dataset.motion = "off";
  else delete root.dataset.motion;
  try {
    localStorage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify({ theme, motion }));
  } catch {
    // Penyimpanan browser bisa ditolak (mode privat); pilihan tetap berlaku sampai halaman ditutup.
  }
}

/** Mode warna (Terang, Gelap) dan gerakan, seperti "Pengaturan gerakan" di aksesin. */
export function DisplaySettings({ labels }: { labels: DisplayLabels }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [settings, setSettings] = useState<Settings>({ theme: "perangkat", motion: "perangkat" });

  const update = (next: Settings) => {
    setSettings(next);
    applySettings(next);
  };

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setSettings(readSettings());
          dialog.current?.showModal();
        }}
        className={buttonClass("ghost", "sm", "min-w-11 px-3")}
      >
        <Icon icon={IconSunMoon} />
        <span className="sr-only xl:not-sr-only">{labels.open}</span>
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="tampilan-judul"
        className="glass-strong m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl p-6 text-text-primary backdrop:bg-surface-glass-inverse"
      >
        <form method="dialog" className="flex flex-col gap-6">
          <h2 id="tampilan-judul" className="font-heading text-xl font-bold tracking-[-0.02em]">
            {labels.title}
          </h2>
          <Choice
            name="mode"
            legend={labels.mode}
            hint={labels.modeHint}
            options={THEMES.map((value) => ({ value, label: labels.theme[value] }))}
            value={settings.theme}
            onChange={(theme) => update({ ...settings, theme })}
          />
          <Choice
            name="gerakan"
            legend={labels.motion}
            hint={labels.motionHint}
            options={MOTIONS.map((value) => ({ value, label: labels.motionOption[value] }))}
            value={settings.motion}
            onChange={(motion) => update({ ...settings, motion })}
          />
          <button className={buttonClass("primary", "md", "self-end")}>{labels.done}</button>
        </form>
      </dialog>
    </>
  );
}

function Choice<T extends string>(props: {
  name: string;
  legend: string;
  hint: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const hintId = `${props.name}-petunjuk`;
  return (
    <fieldset aria-describedby={hintId} className="flex flex-col gap-2">
      <legend className="mb-1 font-semibold">{props.legend}</legend>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-2">
        {props.options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-border-subtle px-3 text-sm font-medium has-checked:border-border-focus has-checked:bg-surface-brand-subtle"
          >
            <input
              type="radio"
              name={props.name}
              value={option.value}
              checked={props.value === option.value}
              onChange={() => props.onChange(option.value)}
              className="size-4 accent-brand-fill"
            />
            {option.label}
          </label>
        ))}
      </div>
      <p id={hintId} className="text-sm text-text-secondary">
        {props.hint}
      </p>
    </fieldset>
  );
}
