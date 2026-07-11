import { useEffect, useRef, useState } from "react";
import logoAsset from "../assets/selam-cakes-logo.png.asset.json";
import "./splash-screen.css";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fadingOut, setFadingOut] = useState(false);

  // Prevent scrolling while splash is visible
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Glitter particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const PARTICLE_COUNT = 80;
    type Particle = {
      x: number;
      y: number;
      r: number;
      alpha: number;
      vy: number;
      vx: number;
    };

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2 + 1,
      alpha: Math.random() * 0.7 + 0.2,
      vy: -(Math.random() * 0.4 + 0.15),
      vx: (Math.random() - 0.5) * 0.15,
    }));

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.y += p.vy;
        p.x += p.vx;
        if (p.y < -5) {
          p.y = height + 5;
          p.x = Math.random() * width;
        }
        if (p.x < -5) p.x = width + 5;
        if (p.x > width + 5) p.x = -5;

        ctx.beginPath();
        ctx.fillStyle = `rgba(255,230,170,${p.alpha})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Timing: begin fade-out around 3.4s so complete fires at ~4s
  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setFadingOut(true), 3400);
    const doneTimer = window.setTimeout(() => onComplete(), 4000);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div className={`splash-root${fadingOut ? " splash-fade-out" : ""}`}>
      <div className="splash-bg" />
      <canvas ref={canvasRef} className="splash-canvas" aria-hidden="true" />
      <div className="splash-scene">
        <div className="splash-logo-wrap">
          <img
            src={logoAsset.url}
            alt="Selam Cakes — Cake Art"
            className="splash-logo"
            draggable={false}
          />
        </div>
        <p className="splash-tagline">Baked with Love, Made for You.</p>
      </div>
    </div>
  );
}
