import { useEffect, useRef } from "react";
import { jukeboxEngine } from "../audio/engine";

/** Circular live spectrum — reads the engine analyser, or idles into a breathing pulse. */
export default function RadialEq({ playing, accent }: { playing: boolean; accent: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const accentRef = useRef(accent);
  accentRef.current = accent;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let raf = 0;
    let t = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const BARS = 84;
    const freqData = new Uint8Array(2048);

    const draw = () => {
      raf = requestAnimationFrame(draw);
      t += 0.016;
      const W = canvas.width, H = canvas.height;
      const cx = W / 2, cy = H / 2;
      const baseR = Math.min(W, H) * 0.265;
      const maxLen = Math.min(W, H) * 0.185;

      // trail fade
      ctx.fillStyle = "rgba(7, 10, 22, 0.34)";
      ctx.fillRect(0, 0, W, H);

      // guide rings
      for (const k of [0.36, 0.62, 0.88]) {
        ctx.beginPath();
        ctx.arc(cx, cy, baseR + maxLen * k, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(120, 200, 255, ${0.05 + k * 0.05})`;
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
      }

      const analyser = jukeboxEngine.getAnalyser();
      const live = playingRef.current && analyser;

      for (let i = 0; i < BARS; i++) {
        const ang = (i / BARS) * Math.PI * 2 - Math.PI / 2;
        let v: number;
        if (live) {
          analyser.getByteFrequencyData(freqData);
          const bin = Math.floor(Math.pow(i / BARS, 1.7) * (analyser.frequencyBinCount * 0.62));
          v = freqData[bin] / 255;
        } else {
          // idle breathing Lissajous of low order
          v = 0.18 + 0.13 * Math.sin(t * 1.7 + i * 0.34) * Math.sin(t * 0.9 + i * 0.11);
        }
        const len = 3 * dpr + Math.pow(Math.max(0, v), 1.45) * maxLen;
        const x1 = cx + Math.cos(ang) * baseR;
        const y1 = cy + Math.sin(ang) * baseR;
        const x2 = cx + Math.cos(ang) * (baseR + len);
        const y2 = cy + Math.sin(ang) * (baseR + len);

        const hue = 192 + (i / BARS) * 165; // cyan → amber sweep
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `hsla(${hue}, 100%, ${58 + v * 22}%, ${0.35 + v * 0.65})`;
        ctx.lineWidth = 2.4 * dpr;
        ctx.lineCap = "round";
        ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.9)`;
        ctx.shadowBlur = live ? 10 * dpr * v : 4 * dpr;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // core dot
      const pulse = live ? 0.5 + 0.5 * Math.sin(t * 4.2) : 0.5 + 0.5 * Math.sin(t * 1.4);
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 0.74, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 0.74);
      grad.addColorStop(0, "rgba(13, 20, 42, 0.95)");
      grad.addColorStop(1, "rgba(13, 20, 42, 0.0)");
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, 3.2 * dpr + pulse * 2.2 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = accentRef.current;
      ctx.shadowColor = accentRef.current;
      ctx.shadowBlur = 16 * dpr;
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    ctx.fillStyle = "#070a16";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full"
      role="img"
      aria-label="Circular real-time spectrum of the sonification. Tall bars near the top indicate bass energy; the ring shimmers with the high harmonics of the image."
    />
  );
}
