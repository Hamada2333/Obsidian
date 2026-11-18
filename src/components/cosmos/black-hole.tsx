"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { cn } from "@/lib/utils";

/**
 * Real-time black hole rendered with a single WebGL fragment shader.
 *
 * Physics-inspired approximations (screen space, no raymarch, cheap enough
 * for integrated GPUs):
 *  - Gravitational lensing of the background via the thin-lens equation
 *    β = θ − θE²/θ, which produces an Einstein ring and stretched stars.
 *  - Event-horizon shadow plus a thin photon ring.
 *  - Thin, inclined accretion disk with a Novikov–Thorne-like temperature
 *    profile, Keplerian differential rotation and relativistic Doppler beaming.
 *  - The far side of the disk re-imaged above and below the shadow (the
 *    "halo" seen in Interstellar) by applying the lens equation to the disk.
 */

export interface BlackHoleParams {
  zoom: number; // 1 = framing default
  exposure: number; // 0..2
  spin: number; // disk rotation speed multiplier
  tilt: number; // camera tilt in radians (small)
  offsetX: number; // horizontal framing offset in shadow radii
  offsetY: number;
}

export const DEFAULT_PARAMS: BlackHoleParams = { zoom: 1, exposure: 1, spin: 1, tilt: 0.0, offsetX: 0, offsetY: 0 };

const VERT = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uZoom;
uniform float uExposure;
uniform float uSpin;
uniform float uTilt;
uniform vec2 uOffset;
uniform vec2 uMouse;

#define PI 3.14159265

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// Procedural starfield, sampled in lensed coordinates.
vec3 stars(vec2 p) {
  vec3 col = vec3(0.0);
  for (int layer = 0; layer < 3; layer++) {
    float fl = float(layer);
    float scale = 14.0 + fl * 22.0;
    vec2 q = p * scale + fl * 17.3;
    vec2 id = floor(q);
    vec2 gv = fract(q) - 0.5;
    float h = hash(id + fl * 3.1);
    if (h > 0.72) {
      vec2 off = vec2(hash(id + 1.7), hash(id + 9.2)) - 0.5;
      float d = length(gv - off * 0.7);
      float size = mix(0.012, 0.05, pow(hash(id + 4.4), 6.0));
      float tw = 0.75 + 0.25 * sin(uTime * (1.0 + h * 3.0) + h * 40.0);
      float b = smoothstep(size, 0.0, d) * tw * (1.0 - fl * 0.25);
      vec3 tint = mix(vec3(1.0, 0.86, 0.66), vec3(0.72, 0.84, 1.0), hash(id + 2.2));
      col += tint * b * 1.4;
    }
  }
  return col;
}

vec3 nebula(vec2 p) {
  float n = fbm(p * 1.3 + vec2(uTime * 0.004, 0.0));
  float m = fbm(p * 2.6 - vec2(0.0, uTime * 0.003) + n);
  vec3 c = mix(vec3(0.05, 0.035, 0.08), vec3(0.16, 0.10, 0.06), m);
  c += vec3(0.03, 0.05, 0.10) * smoothstep(0.45, 0.9, n);
  return c * smoothstep(0.25, 0.85, m) * 0.55;
}

// Disk emission at disk-plane radius r (in shadow radii) and position d.
vec3 diskColor(vec2 d, float r, float rin, float rout, float side) {
  if (r < rin || r > rout) return vec3(0.0);
  // Temperature profile, peaked just outside the inner edge.
  float x = rin / r;
  float temp = pow(x, 0.75) * pow(max(1.0 - sqrt(x), 0.0), 0.25) * 1.9;
  // Keplerian differential rotation: inner parts spin faster.
  float omega = uSpin * 0.55 * pow(r, -1.5);
  vec2 q = rot(uTime * omega) * d;
  float rings = fbm(vec2(r * 7.0, 0.0) + 3.0);
  float clumps = fbm(q * 2.2 + 11.0);
  float streak = fbm(vec2(atan(q.y, q.x) * 1.2, r * 9.0) + 7.0);
  float detail = 0.45 + 0.75 * rings * (0.55 + 0.9 * clumps) * (0.7 + 0.6 * streak);
  // Relativistic beaming: material moving toward camera (left side) is brighter and bluer.
  float v = clamp(0.62 / sqrt(r), 0.0, 0.85);
  float cosA = -d.x / max(r, 1e-3) * side;
  float dop = pow(max(1.0 + v * cosA, 0.05), 2.4) / pow(1.0 + v * 0.3, 1.6);
  float edge = smoothstep(rin, rin * 1.12, r) * smoothstep(rout, rout * 0.55, r);
  float I = temp * detail * dop * edge;
  vec3 hot = vec3(1.0, 0.93, 0.80);
  vec3 warm = vec3(1.0, 0.62, 0.24);
  vec3 cool = vec3(0.55, 0.22, 0.07);
  vec3 c = mix(cool, warm, smoothstep(0.0, 0.6, I));
  c = mix(c, hot, smoothstep(0.75, 1.8, I));
  return c * I * 1.15;
}

vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  uv += uMouse * 0.015;
  // Units: shadow radius = 1. Default framing shows ~±6.5 radii vertically.
  vec2 p = uv * 15.0 / uZoom - uOffset;
  p = rot(uTilt) * p;
  float r = length(p);

  const float RS = 1.0;          // shadow radius
  const float E = 1.32;          // Einstein radius
  const float RIN = 1.55;        // disk inner edge (ISCO-ish, in shadow radii)
  const float ROUT = 6.2;
  const float INC = 0.105;       // disk flattening (≈ sin of viewing elevation)

  // ── Lensed background ────────────────────────────────────────────────
  vec2 src = p - p * (E * E) / max(r * r, 1e-4);
  vec2 bgp = src * 0.075 + 0.5;
  vec3 col = nebula(bgp) + stars(bgp);
  // Magnification brightening near the Einstein ring.
  float mag = 1.0 / max(abs(1.0 - pow(E / max(r, 1e-3), 4.0)), 0.15);
  col *= clamp(mag, 1.0, 3.0);

  // ── Shadow ───────────────────────────────────────────────────────────
  float shadow = smoothstep(RS * 0.98, RS * 1.06, r);
  col *= shadow;

  // ── Lensed halo: far side of disk re-imaged around the shadow ─────────
  // Lens mapping compresses the far disk into a band hugging the photon ring.
  float rl = RIN * 0.96 + (r - RS * 1.04) * 1.65;
  vec3 halo = vec3(0.0);
  if (r > RS) {
    vec2 dh = normalize(p) * rl;
    float up = smoothstep(-0.9, 0.7, p.y / r);
    float thin = mix(0.55, 1.0, up); // lower image is thinner
    float rlt = RIN * 0.96 + (rl - RIN * 0.96) / thin;
    halo = diskColor(vec2(dh.x, abs(dh.y)), rlt, RIN * 0.94, ROUT * 0.55, 1.0) * mix(0.35, 0.95, up);
    halo *= smoothstep(RS * 1.0, RS * 1.12, r);
  }
  col += halo * 0.95;

  // ── Photon ring ───────────────────────────────────────────────────────
  float pr = exp(-pow((r - RS * 1.035) / 0.022, 2.0));
  float pr2 = exp(-pow((r - RS * 1.09) / 0.06, 2.0)) * 0.35;
  col += vec3(1.0, 0.86, 0.62) * (pr * 1.6 + pr2) * (0.85 + 0.3 * (-p.x / max(r, 1e-3)));

  // ── Primary accretion disk (thin, inclined) ───────────────────────────
  vec2 d = vec2(p.x, p.y / INC);
  float rd = length(d);
  vec3 disk = diskColor(d, rd, RIN, ROUT, 1.0);
  float thick = exp(-pow(p.y / (0.06 + 0.012 * rd), 2.0)); // soft vertical profile
  disk *= mix(1.0, thick, 0.35);
  bool front = d.y < 0.0;
  float occl = front ? 1.0 : smoothstep(RS * 1.02, RS * 1.25, r);
  col = mix(col, col * 0.25, clamp(length(disk) * occl * (front ? 0.6 : 0.0), 0.0, 1.0)); // front disk occludes
  col += disk * occl * 1.15;

  // ── Glow & atmosphere ─────────────────────────────────────────────────
  float glow = exp(-max(r - RS, 0.0) * 1.1) * 0.08 + exp(-abs(p.y) * 3.0) * exp(-r * 0.28) * 0.16;
  float inside = front ? 1.0 : shadow;
  col += vec3(1.0, 0.66, 0.30) * glow * mix(shadow, 1.0, smoothstep(0.0, 0.2, length(disk * occl)));
  float smoke = fbm(uv * 2.2 + vec2(uTime * 0.012, -uTime * 0.008));
  col += vec3(0.11, 0.10, 0.12) * smoothstep(0.45, 0.95, smoke) * 0.45 * smoothstep(0.0, 1.0, length(uv) * 1.4) * inside;

  // Vignette + exposure + filmic tone map.
  float vig = smoothstep(1.25, 0.25, length(uv));
  col *= mix(0.45, 1.0, vig) * uExposure;
  col = aces(col * 1.15);
  col = pow(col, vec3(0.92));
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.012; // dither
  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(log ?? "shader compile failed");
  }
  return s;
}

export function BlackHole({
  className,
  params,
  quality = 1,
  interactive = true,
  paused = false,
  onReady,
}: {
  className?: string;
  params?: MutableRefObject<BlackHoleParams>;
  quality?: number; // resolution multiplier (0.5–1.5)
  interactive?: boolean;
  paused?: boolean;
  onReady?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
    if (!gl) {
      fallbackRef.current?.classList.remove("hidden");
      readyRef.current?.();
      return;
    }
    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link failed");
    } catch (e) {
      console.error("[BlackHole]", e);
      fallbackRef.current?.classList.remove("hidden");
      readyRef.current?.();
      return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = u("uRes"), uTime = u("uTime"), uZoom = u("uZoom"), uExp = u("uExposure"), uSpin = u("uSpin"), uTilt = u("uTilt"), uOff = u("uOffset"), uMouse = u("uMouse");

    let w = 0, h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75) * quality;
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width * dpr));
      h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (interactive) window.addEventListener("pointermove", onMove);

    let visible = true;
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(canvas);

    let raf = 0;
    let t = 0;
    let last = performance.now();
    let first = true;
    // Adaptive quality: if frames are slow, lower resolution once.
    let slowFrames = 0;
    let degraded = false;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!visible || document.hidden || pausedRef.current) return;
      if (!degraded && dt > 1 / 32) {
        if (++slowFrames > 40) {
          degraded = true;
          const dpr = Math.min(window.devicePixelRatio || 1, 1) * quality * 0.65;
          const rect = canvas.getBoundingClientRect();
          canvas.width = Math.round(rect.width * dpr);
          canvas.height = Math.round(rect.height * dpr);
          w = canvas.width;
          h = canvas.height;
          gl.viewport(0, 0, w, h);
          ro.disconnect();
        }
      }
      t += dt;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      const pr = params?.current ?? DEFAULT_PARAMS;
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uZoom, pr.zoom);
      gl.uniform1f(uExp, pr.exposure);
      gl.uniform1f(uSpin, pr.spin);
      gl.uniform1f(uTilt, pr.tilt);
      gl.uniform2f(uOff, pr.offsetX, pr.offsetY);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (first) {
        first = false;
        readyRef.current?.();
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      // Free GPU resources; don't force-lose the context (Strict Mode remounts reuse it).
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [quality, interactive, params]);

  return (
    <div className={cn("overflow-hidden bg-black", /\b(absolute|fixed)\b/.test(className ?? "") ? "" : "relative", className)}>
      <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-hidden />
      {/* CSS fallback when WebGL is unavailable */}
      <div ref={fallbackRef} className="absolute inset-0 hidden" aria-hidden>
        <div className="absolute left-1/2 top-1/2 h-[6%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(closest-side,#fff3d6,#e8b86b_40%,rgba(180,90,30,.5)_70%,transparent)] blur-[2px]" />
        <div className="absolute left-1/2 top-1/2 size-[18vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black shadow-[0_0_0_2px_rgba(255,220,160,.8),0_0_60px_10px_rgba(232,184,107,.45)]" />
      </div>
    </div>
  );
}
