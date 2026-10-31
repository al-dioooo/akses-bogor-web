// Lapisan 3D hero (ADR-0027) tanpa library: gambar lingkungan digambar di WebGL dengan paralaks menurut
// kedalaman (bagian bawah gambar dekat, bagian atas jauh), hujan tipis di sisi kanan, dan pin yang
// mengikuti titik fasilitas di gambar. Pemanggil yang memutuskan kapan gerak boleh berjalan.

export type ScenePin = { el: HTMLElement; u: number; v: number };

type Options = {
  canvas: HTMLCanvasElement;
  /** Gambar statis yang sama; posisi potongnya (object-position) dibaca dari CSS-nya. */
  still: HTMLImageElement;
  src: string;
  pins: ScenePin[];
  onReady: () => void;
};

const ZOOM = 1.045; // sedikit diperbesar supaya tepi gambar tidak terlihat saat bergeser
const NEAR = 0.02; // pergeseran UV maksimum untuk latar depan
const FAR = 0.004; // dan untuk latar belakang
const DROPS = 170;

const VERTEX = "attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}";
const FRAGMENT = `precision mediump float;varying vec2 v;uniform sampler2D t;uniform vec2 sc,of,ptr;uniform float zoom;
void main(){vec2 uv=((v-.5)/zoom+.5)*sc+of;float d=smoothstep(.12,1.,uv.y);uv+=ptr*(${FAR}+d*${NEAR - FAR});
gl_FragColor=texture2D(t,clamp(uv,0.,1.));}`;
const RAIN_VERTEX = "attribute vec3 a;varying float al;void main(){al=a.z;gl_Position=vec4(a.x*2.-1.,1.-a.y*2.,0.,1.);}";
const RAIN_FRAGMENT = "precision mediump float;varying float al;void main(){gl_FragColor=vec4(.95,.94,1.,al);}";

function program(gl: WebGLRenderingContext, vertex: string, fragment: string) {
  const p = gl.createProgram()!;
  for (const [type, code] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    gl.attachShader(p, shader);
  }
  gl.linkProgram(p);
  return p;
}

/** Memasang lapisan 3D. Mengembalikan null bila WebGL tidak tersedia; gambar statis tetap tampil. */
export function mountScene({ canvas, still, src, pins, onReady }: Options) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: true });
  if (!gl) return null;

  const scene = program(gl, VERTEX, FRAGMENT);
  const rain = program(gl, RAIN_VERTEX, RAIN_FRAGMENT);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const rainBuffer = gl.createBuffer();
  const texture = gl.createTexture();

  const drops = Array.from({ length: DROPS }, () => ({ x: Math.random(), y: Math.random(), z: 0.35 + Math.random() * 0.65 }));
  const vertices = new Float32Array(DROPS * 6);
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let scale = [1, 1];
  let offset = [0, 0];
  let ready = false;
  let moving = false;
  let frameId = 0;
  let last = 0;

  const image = new Image();
  image.src = src;

  function resize() {
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height || !image.naturalWidth) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    gl!.viewport(0, 0, canvas.width, canvas.height);
    // object-position gambar statis, mis. "100% 60%", supaya potongan WebGL sama dengan CSS.
    const [px, py] = getComputedStyle(still).objectPosition.split(" ").map((part) => parseFloat(part) / 100);
    const canvasRatio = box.width / box.height;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    if (canvasRatio > imageRatio) {
      scale = [1, imageRatio / canvasRatio];
      offset = [0, (1 - imageRatio / canvasRatio) * (py || 0.5)];
    } else {
      scale = [canvasRatio / imageRatio, 1];
      offset = [(1 - canvasRatio / imageRatio) * (px || 0.5), 0];
    }
  }

  // Kebalikan dari shader: posisi layar (0..1) dari titik di gambar.
  function project(u: number, v: number) {
    const d = Math.min(1, Math.max(0, (v - 0.12) / 0.88));
    const k = FAR + d * d * (3 - 2 * d) * (NEAR - FAR);
    return [
      ((u - pointer.x * k - offset[0]) / scale[0] - 0.5) * ZOOM + 0.5,
      ((v - pointer.y * k - offset[1]) / scale[1] - 0.5) * ZOOM + 0.5,
    ];
  }

  function draw(dt: number) {
    const g = gl!;
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 4);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 4);
    g.clearColor(0, 0, 0, 0);
    g.clear(g.COLOR_BUFFER_BIT);

    g.useProgram(scene);
    g.bindBuffer(g.ARRAY_BUFFER, quad);
    const position = g.getAttribLocation(scene, "p");
    g.enableVertexAttribArray(position);
    g.vertexAttribPointer(position, 2, g.FLOAT, false, 0, 0);
    g.uniform2f(g.getUniformLocation(scene, "sc"), scale[0], scale[1]);
    g.uniform2f(g.getUniformLocation(scene, "of"), offset[0], offset[1]);
    g.uniform2f(g.getUniformLocation(scene, "ptr"), pointer.x, pointer.y);
    g.uniform1f(g.getUniformLocation(scene, "zoom"), ZOOM);
    g.drawArrays(g.TRIANGLE_STRIP, 0, 4);

    if (moving) {
      drops.forEach((drop, i) => {
        drop.y += dt * (0.35 + drop.z * 0.75);
        drop.x -= dt * 0.08 * drop.z;
        if (drop.y > 1.05) {
          drop.y = -0.05 - Math.random() * 0.2;
          drop.x = 0.35 + Math.random() * 0.7;
        }
        const length = 0.018 + drop.z * 0.03;
        const x = drop.x + pointer.x * drop.z * 0.03;
        // Hujan memudar ke kiri supaya judul tetap mudah dibaca.
        const alpha = (0.1 + drop.z * 0.22) * Math.min(1, Math.max(0, (x - 0.42) / 0.14));
        vertices.set([x, drop.y, alpha, x + length * 0.18, drop.y + length, alpha * 0.15], i * 6);
      });
      g.useProgram(rain);
      g.enable(g.BLEND);
      g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA);
      g.bindBuffer(g.ARRAY_BUFFER, rainBuffer);
      g.bufferData(g.ARRAY_BUFFER, vertices, g.DYNAMIC_DRAW);
      const attribute = g.getAttribLocation(rain, "a");
      g.enableVertexAttribArray(attribute);
      g.vertexAttribPointer(attribute, 3, g.FLOAT, false, 0, 0);
      g.drawArrays(g.LINES, 0, DROPS * 2);
      g.disable(g.BLEND);
    }

    for (const pin of pins) {
      const [x, y] = project(pin.u, pin.v);
      pin.el.style.transform = `translate(${(x * 100).toFixed(2)}cqw, ${(y * 100).toFixed(2)}cqh)`;
    }
  }

  function loop(now: number) {
    draw(Math.min(0.05, (now - last) / 1000));
    last = now;
    if (moving) frameId = requestAnimationFrame(loop);
  }

  const onPointer = (event: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    pointer.tx = (event.clientX - box.left) / box.width - 0.5;
    pointer.ty = (event.clientY - box.top) / box.height - 0.5;
  };
  const onLeave = () => {
    pointer.tx = 0;
    pointer.ty = 0;
  };
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const target = canvas.parentElement!;
  if (finePointer) {
    target.addEventListener("pointermove", onPointer);
    target.addEventListener("pointerleave", onLeave);
  }

  const observer = new ResizeObserver(() => {
    resize();
    if (ready && !moving) draw(0);
  });
  observer.observe(canvas);

  image.decode().then(() => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    resize();
    ready = true;
    draw(0);
    onReady();
    if (moving) frameId = requestAnimationFrame(loop);
  }, () => undefined);

  return {
    /** Menjalankan atau menghentikan gerak; saat berhenti, gambar dan pin diam di posisi tengah. */
    setMoving(next: boolean) {
      moving = next;
      cancelAnimationFrame(frameId);
      if (!ready) return;
      if (moving) {
        last = performance.now();
        frameId = requestAnimationFrame(loop);
      } else {
        pointer.x = pointer.tx = pointer.y = pointer.ty = 0;
        draw(0);
      }
    },
    destroy() {
      moving = false;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      target.removeEventListener("pointermove", onPointer);
      target.removeEventListener("pointerleave", onLeave);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
