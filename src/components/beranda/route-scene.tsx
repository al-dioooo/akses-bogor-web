"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { hasWebGL, motionReduced, readTheme, watchPreferences } from "./preferences";
import type { mountRoute, Stop } from "./scene/mount";

/**
 * Kanvas lengket "Rute ke pintu" (ADR-0028) di layar lebar: kamera berpindah ke fasilitas yang sedang dibaca. Di
 * ponsel, saat gerak dikurangi, atau tanpa WebGL, close-up diam di tiap baris yang tampil, jadi isinya sama.
 */
export function RouteScene({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<ReturnType<typeof mountRoute> | null>(null);
  const loading = useRef(false);
  const stop = useRef<Stop>("guiding_block");
  const [live, setLive] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const wide = matchMedia("(min-width: 64rem)");
    const sync = () => {
      setAllowed(wide.matches && !motionReduced() && !document.hidden);
      scene.current?.setTheme(readTheme());
    };
    sync();
    const unwatch = watchPreferences(sync);
    wide.addEventListener("change", sync);
    const onScreen = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "25%" });
    onScreen.observe(box.current!);
    // Baris yang melewati tengah layar menjadi titik kamera.
    const reading = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          stop.current = (entry.target as HTMLElement).dataset.stop as Stop;
          scene.current?.go(stop.current);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    box.current!.querySelectorAll<HTMLElement>("[data-stop]").forEach((el) => reading.observe(el));
    return () => {
      unwatch();
      wide.removeEventListener("change", sync);
      onScreen.disconnect();
      reading.disconnect();
      scene.current?.destroy();
      scene.current = null;
    };
  }, []);

  // three.js dimuat saat bagian ini mendekati layar, dan hanya bila layar lebar dan gerak boleh.
  useEffect(() => {
    if (!allowed || !visible || loading.current || !hasWebGL()) return;
    loading.current = true;
    import("./scene/mount").then(({ mountRoute }) => {
      if (!canvas.current) return;
      scene.current = mountRoute({ canvas: canvas.current, theme: readTheme(), onReady: () => setLive(true) });
      scene.current.go(stop.current);
    });
  }, [allowed, visible]);

  const moving = live && allowed && visible;
  useEffect(() => scene.current?.setMoving(moving), [moving]);

  return (
    <div ref={box} data-live={(live && allowed) || undefined} className="route-stage">
      <div className="route-view">
        <canvas ref={canvas} aria-hidden="true" />
      </div>
      {children}
    </div>
  );
}
