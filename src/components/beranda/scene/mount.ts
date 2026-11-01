// Memasang adegan ke kanvas (ADR-0028): hero dengan pin dan sedikit paralaks pointer, dan "Rute ke pintu" dengan
// kamera yang berpindah antar titik. Modul ini dimuat malas oleh komponennya; di sinilah three.js pertama kali masuk.
import { NeutralToneMapping, PCFShadowMap, PerspectiveCamera, WebGLRenderer } from "three";
import type { Theme } from "../preferences";
import { coverCrop, FULL, objectPosition, toBox, type Crop } from "./crop";
import { buildScene, mixView, STOP_TIME, VIEWS, type View, type ViewName } from "./index";

export type Stop = Exclude<ViewName, "hero">;

/** Kanvas, renderer, adegan, dan putaran gambar. `draw` dipanggil tiap frame dengan selisih waktu dan waktu latar. */
function createStage(canvas: HTMLCanvasElement, theme: Theme, draw: (dt: number, t: number) => void) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.toneMapping = NeutralToneMapping;
  renderer.setClearColor(0x000000, 0);
  const built = buildScene();
  built.setNight(theme.night, theme.background);
  const camera = new PerspectiveCamera();
  let moving = false;
  let frameId = 0;
  let last = 0;
  let t = 0;
  function loop(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    draw(dt, t);
    if (moving) frameId = requestAnimationFrame(loop);
  }
  return {
    renderer,
    built,
    camera,
    get moving() {
      return moving;
    },
    /** Menyamakan ukuran buffer dengan kotak kanvas di layar; mengembalikan kotaknya. */
    size() {
      const box = canvas.getBoundingClientRect();
      if (box.width && box.height) renderer.setSize(box.width, box.height, false);
      return box;
    },
    once() {
      draw(0, t);
    },
    setMoving(next: boolean) {
      moving = next;
      cancelAnimationFrame(frameId);
      if (moving) {
        last = performance.now();
        frameId = requestAnimationFrame(loop);
      } else draw(0, t);
    },
    setTheme(next: Theme) {
      built.setNight(next.night, next.background);
      if (!moving) draw(0, t);
    },
    destroy() {
      moving = false;
      cancelAnimationFrame(frameId);
      built.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

type HeroOptions = { canvas: HTMLCanvasElement; still: HTMLElement; pins: HTMLElement[]; theme: Theme; onReady: () => void };

/** Hero: bingkai 2:1 dipotong seperti poster (object-position gambar statis), pin mengikuti titik 3D, kamera sedikit mengikuti pointer. */
export function mountHero({ canvas, still, pins, theme, onReady }: HeroOptions) {
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let crop: Crop = FULL;
  const START = 21.5; // pejalan bertongkat putih sedang di zebra cross
  const stage = createStage(canvas, theme, (dt, t) => {
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 4);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 4);
    const view: View = { ...VIEWS.hero, az: VIEWS.hero.az + pointer.x * 4, el: VIEWS.hero.el - pointer.y * 2 };
    stage.built.frame(stage.camera, view, 2, crop);
    stage.built.update(t, START + t);
    stage.renderer.render(stage.built.scene, stage.camera);
    pins.forEach((el, i) => {
      const v = stage.built.pins[i].clone().project(stage.camera);
      const [x, y] = toBox(FULL, (v.x + 1) / 2, (1 - v.y) / 2);
      el.style.transform = `translate(${x}cqw, ${y}cqh)`;
    });
  });
  function resize() {
    const box = stage.size();
    if (!box.width) return;
    const [px, py] = objectPosition(still);
    crop = coverCrop(2, box.width / box.height, px, py);
    if (!stage.moving) stage.once();
  }
  const onPointer = (event: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    pointer.tx = (event.clientX - box.left) / box.width - 0.5;
    pointer.ty = (event.clientY - box.top) / box.height - 0.5;
  };
  const onLeave = () => {
    pointer.tx = pointer.ty = 0;
  };
  const target = canvas.parentElement!;
  const finePointer = matchMedia("(pointer: fine)").matches;
  if (finePointer) {
    target.addEventListener("pointermove", onPointer);
    target.addEventListener("pointerleave", onLeave);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  onReady();

  return {
    setMoving(next: boolean) {
      if (!next) pointer.x = pointer.tx = pointer.y = pointer.ty = 0;
      stage.setMoving(next);
    },
    setTheme: stage.setTheme,
    destroy() {
      observer.disconnect();
      target.removeEventListener("pointermove", onPointer);
      target.removeEventListener("pointerleave", onLeave);
      stage.destroy();
    },
  };
}

type RouteOptions = { canvas: HTMLCanvasElement; theme: Theme; onReady: () => void };

/** "Rute ke pintu": bingkai 1:1 seperti close-up, kamera meluncur 1,4 detik ke titik yang dibaca; waktu cerita dikunci per titik supaya pelakunya terlihat. */
export function mountRoute({ canvas, theme, onReady }: RouteOptions) {
  let stop: Stop = "guiding_block";
  let from: View = VIEWS[stop];
  let to = from;
  let f = 1;
  let story = STOP_TIME[stop];
  let next: number | null = null;
  let crop: Crop = FULL;
  const ease = (x: number) => x * x * (3 - 2 * x);
  const stage = createStage(canvas, theme, (dt, t) => {
    f = Math.min(1, f + dt / 1.4);
    if (next != null && f >= 0.5) {
      story = next;
      next = null;
    }
    stage.built.frame(stage.camera, mixView(from, to, ease(f)), 1, crop);
    // Di titik lift kabinnya tetap naik turun; di titik lain adegan diam seperti diorama.
    stage.built.update(t, stop === "lift" ? story + t : story);
    stage.renderer.render(stage.built.scene, stage.camera);
  });
  function resize() {
    const box = stage.size();
    if (!box.width) return;
    crop = coverCrop(1, box.width / box.height, 0.5, 0.5);
    if (!stage.moving) stage.once();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  onReady();

  return {
    go(name: Stop) {
      if (name === stop) return;
      from = mixView(from, to, ease(f));
      to = VIEWS[name];
      stop = name;
      f = 0;
      next = STOP_TIME[name];
      if (!stage.moving) {
        f = 1;
        story = next;
        next = null;
        stage.once();
      }
    },
    setMoving: stage.setMoving,
    setTheme: stage.setTheme,
    destroy() {
      observer.disconnect();
      stage.destroy();
    },
  };
}
