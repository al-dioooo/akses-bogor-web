"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import heroImage from "@/assets/ilustrasi/halte-ke-pintu.webp";
import { Icon } from "@/ui/icon";
import { IconPlayerPause, IconPlayerPlay } from "@/ui/icons";
import { mountScene } from "./scene-gl";

// Titik fasilitas di gambar (0..1 dari kiri dan atas), urut seperti bagian "Rute ke pintu".
const PINS = [
  { id: "01", u: 0.582, v: 0.745 }, // guiding block di zebra cross
  { id: "02", u: 0.832, v: 0.64 }, // ramp
  { id: "03", u: 0.745, v: 0.535 }, // pintu masuk, toilet di dalam
  { id: "04", u: 0.905, v: 0.36 }, // lift
];

const motionReduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "off";

/** Ilustrasi hero dengan lapisan 3D. Hiasan saja: fasilitasnya dijelaskan di teks halaman. */
export function HeroScene() {
  const t = useTranslations("Beranda.hero");
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const still = useRef<HTMLImageElement>(null);
  const pins = useRef<(HTMLSpanElement | null)[]>([]);
  const scene = useRef<ReturnType<typeof mountScene>>(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!canvas.current || !still.current) return;
    scene.current = mountScene({
      canvas: canvas.current,
      still: still.current,
      src: heroImage.src,
      pins: PINS.map((pin, i) => ({ ...pin, el: pins.current[i]! })),
      onReady: () => setReady(true),
    });
    // Gerak mengikuti preferensi perangkat dan pengaturan "Kurangi gerakan" di header.
    const sync = () => setAllowed(!motionReduced() && !document.hidden);
    sync();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    const attributes = new MutationObserver(sync);
    attributes.observe(document.documentElement, { attributeFilter: ["data-motion"] });
    const onScreen = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    onScreen.observe(stage.current!);
    return () => {
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      attributes.disconnect();
      onScreen.disconnect();
      scene.current?.destroy();
    };
  }, []);

  const moving = ready && allowed && visible && !paused;
  useEffect(() => scene.current?.setMoving(moving), [moving]);

  return (
    <div ref={stage} data-ready={ready || undefined} data-moving={moving || undefined} className="hero-stage">
      <Image ref={still} src={heroImage} alt="" priority unoptimized fill sizes="100vw" className="hero-still" />
      <canvas ref={canvas} aria-hidden="true" className="hero-canvas" />
      <span aria-hidden="true" className="hero-veil" />
      {PINS.map((pin, i) => (
        <span key={pin.id} ref={(el) => void (pins.current[i] = el)} aria-hidden="true" className="hero-pin">
          <span>
            <b>{pin.id}</b>
          </span>
        </span>
      ))}
      {ready && allowed && (
        <button type="button" onClick={() => setPaused(!paused)} className="hero-toggle">
          <Icon icon={paused ? IconPlayerPlay : IconPlayerPause} className="size-4.5" />
          {t(paused ? "play" : "pause")}
        </button>
      )}
    </div>
  );
}
