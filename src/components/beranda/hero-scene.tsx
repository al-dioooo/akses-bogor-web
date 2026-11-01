"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import posterGelap from "@/assets/ilustrasi/halte-ke-pintu-gelap.webp";
import posterPins from "@/assets/ilustrasi/halte-ke-pintu.json";
import poster from "@/assets/ilustrasi/halte-ke-pintu.webp";
import { Icon } from "@/ui/icon";
import { IconPlayerPause, IconPlayerPlay } from "@/ui/icons";
import { hasWebGL, motionReduced, readTheme, watchPreferences } from "./preferences";
import { coverCrop, objectPosition, toBox } from "./scene/crop";
import type { mountHero } from "./scene/mount";

/**
 * Hero "Halte ke pintu" (ADR-0028). Poster yang dirender dari adegan tampil dulu; three.js dimuat hanya bila gerak
 * boleh dan WebGL ada, lalu kanvas menggantikan poster pada bingkai yang sama. Hiasan saja: fasilitasnya dijelaskan
 * di teks halaman.
 */
export function HeroScene() {
  const t = useTranslations("Beranda.hero");
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const still = useRef<HTMLImageElement>(null);
  const pins = useRef<(HTMLSpanElement | null)[]>([]);
  const scene = useRef<ReturnType<typeof mountHero> | null>(null);
  const loading = useRef(false);
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Pin di atas poster, dari koordinat yang ditulis skrip render, dipotong seperti object-position poster.
    const placePins = () => {
      const box = stage.current!.getBoundingClientRect();
      if (!box.width) return;
      const crop = coverCrop(posterPins.width / posterPins.height, box.width / box.height, ...objectPosition(still.current!));
      posterPins.pins.forEach(([u, v], i) => {
        const [x, y] = toBox(crop, u, v);
        pins.current[i]?.style.setProperty("transform", `translate(${x}cqw, ${y}cqh)`);
      });
      setReady(true);
    };
    const resized = new ResizeObserver(placePins);
    resized.observe(stage.current!);
    const sync = () => {
      setAllowed(!motionReduced() && !document.hidden);
      scene.current?.setTheme(readTheme());
    };
    sync();
    const unwatch = watchPreferences(sync);
    const onScreen = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    onScreen.observe(stage.current!);
    return () => {
      resized.disconnect();
      unwatch();
      onScreen.disconnect();
      scene.current?.destroy();
      scene.current = null;
    };
  }, []);

  // three.js dimuat sekali, setelah hero tampil, dan hanya bila gerak boleh.
  useEffect(() => {
    if (!allowed || loading.current || !hasWebGL()) return;
    loading.current = true;
    import("./scene/mount").then(({ mountHero }) => {
      if (!canvas.current || !still.current) return;
      scene.current = mountHero({
        canvas: canvas.current,
        still: still.current,
        pins: pins.current.filter((el) => el != null),
        theme: readTheme(),
        onReady: () => setLive(true),
      });
    });
  }, [allowed]);

  const moving = live && allowed && visible && !paused;
  useEffect(() => scene.current?.setMoving(moving), [moving]);

  return (
    <div ref={stage} data-ready={ready || undefined} data-live={live || undefined} className="hero-stage">
      <Image ref={still} src={poster} alt="" priority unoptimized fill sizes="100vw" data-mode="terang" className="hero-still" />
      <Image src={posterGelap} alt="" loading="lazy" unoptimized fill sizes="100vw" data-mode="gelap" className="hero-still" />
      <canvas ref={canvas} aria-hidden="true" className="hero-canvas" />
      <span aria-hidden="true" className="hero-veil" />
      {posterPins.pins.map((_, i) => (
        <span key={i} ref={(el) => void (pins.current[i] = el)} aria-hidden="true" className="hero-pin">
          <span>
            <b>{String(i + 1).padStart(2, "0")}</b>
          </span>
        </span>
      ))}
      {live && allowed && (
        <button type="button" onClick={() => setPaused(!paused)} className="hero-toggle">
          <Icon icon={paused ? IconPlayerPlay : IconPlayerPause} className="size-4.5" />
          {t(paused ? "play" : "pause")}
        </button>
      )}
    </div>
  );
}
