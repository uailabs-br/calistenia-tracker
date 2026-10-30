"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { routeDepth, travelBetween, type Travel } from "@/lib/utils/spaceTravel";

/**
 * Céu do tema espaço: nebulosa em CSS e estrelas num canvas, atrás de tudo.
 *
 * O HTML é o mesmo em qualquer tema (o CSS só mostra no espaço), então a
 * hidratação não quebra (regra 10). O canvas só anima durante a viagem entre
 * telas; parado, fica um quadro estático: estrela animando o tempo todo, com
 * vidro desfocando por cima, gasta bateria no meio do treino.
 */
export function SpaceSky() {
  const pathname = usePathname();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skyRef = useRef<Sky | null>(null);
  const prevPath = useRef(pathname);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sky = createSky(canvas);
    skyRef.current = sky;
    const html = document.documentElement;
    const sync = () => sky.setOn(html.dataset.theme === "espaco");
    sync();
    // Ajustes troca o tema escrevendo no <html>: o céu acende sem recarregar.
    const obs = new MutationObserver(sync);
    obs.observe(html, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener("resize", sky.resize);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", sky.resize);
      sky.stop();
      skyRef.current = null;
    };
  }, []);

  useEffect(() => {
    const from = prevPath.current;
    prevPath.current = pathname;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const t = from === pathname ? null : travelBetween(from, pathname);
    wrap.style.setProperty("--space-travel", `${t?.ms ?? 0}ms`);
    wrap.style.setProperty("--space-d", String(routeDepth(pathname) ?? 0));
    if (t) skyRef.current?.warp(t);
  }, [pathname]);

  return (
    <div ref={wrapRef} className="space-sky" aria-hidden="true">
      <div className="space-neb" />
      <canvas ref={canvasRef} />
    </div>
  );
}

interface Sky {
  setOn: (on: boolean) => void;
  warp: (t: Travel) => void;
  resize: () => void;
  stop: () => void;
}

interface Star {
  x: number;
  y: number;
  z: number;
  rgb: string;
  mag: number;
}

const STARS = 360;
/** Velocidade máxima no meio da viagem (fração da profundidade por quadro). */
const PEAK = 0.0056;

function newStar(z?: number): Star {
  const tint = Math.random();
  return {
    x: (Math.random() * 2 - 1) * 1.4,
    y: (Math.random() * 2 - 1) * 1.4,
    z: z ?? Math.random(),
    // a maioria branca; algumas azuladas e poucas quentes, como no céu de verdade
    rgb: tint < 0.12 ? "255,214,170" : tint < 0.3 ? "180,200,255" : "236,240,255",
    mag: 0.5 + Math.random() * 0.9,
  };
}

/** Estrelas em perspectiva: na viagem andam um pouco no eixo z, pra frente ou pra trás. */
function createSky(canvas: HTMLCanvasElement): Sky {
  const ctx = canvas.getContext("2d");
  const stars = Array.from({ length: STARS }, () => newStar());
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let on = false;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let last = 0;
  let trip: (Travel & { t0: number }) | null = null;

  const resize = () => {
    if (!on) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    draw(0);
  };

  function draw(vel: number) {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h * 0.42;
    const f = Math.min(w, h) * 0.55;
    for (const s of stars) {
      s.z -= vel;
      if (s.z <= 0.02) Object.assign(s, newStar(1));
      else if (s.z > 1) Object.assign(s, newStar(0.03 + Math.random() * 0.15));
      const k = f / s.z;
      const x = cx + s.x * k;
      const y = cy + s.y * k;
      if (x < -20 || x > w + 20 || y < -20 || y > h + 20) continue;
      const near = 1 - s.z;
      const a = Math.min(1, 0.15 + near * 1.1) * s.mag;
      ctx.fillStyle = `rgba(${s.rgb},${a})`;
      ctx.beginPath();
      ctx.arc(x, y, 0.3 + near * near * 1.7 * s.mag, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame(now: number) {
    raf = 0;
    if (!on || !trip) return;
    const dt = Math.min(48, now - (last || now)) / 16.67;
    last = now;
    const p = (now - trip.t0) / trip.ms;
    if (p >= 1) {
      trip = null;
      draw(0);
      return;
    }
    // sobe e desce como um sino: arranca, atinge o pico no meio e freia
    draw(trip.dir * PEAK * Math.sin(Math.PI * p) ** 2 * dt);
    raf = requestAnimationFrame(frame);
  }

  return {
    setOn(next) {
      if (next === on) return;
      on = next;
      if (on) resize();
      else this.stop();
    },
    warp(t) {
      if (!on || reduced.matches) return;
      trip = { ...t, t0: performance.now() };
      last = 0;
      if (!raf) raf = requestAnimationFrame(frame);
    },
    resize,
    stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      trip = null;
    },
  };
}
