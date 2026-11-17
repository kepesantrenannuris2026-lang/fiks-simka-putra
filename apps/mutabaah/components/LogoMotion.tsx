"use client";
import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { asset } from "@/lib/base";

type Layer = { src: string; from: { x?: number; y?: number; scale?: number; rotate?: number }; delay: number; spring?: boolean };

/* Urutan perakitan logo: bingkai hijau tumbuh dari bawah, chevron turun, lalu dua titik jatuh seperti tetesan. */
const LAYERS: Layer[] = [
  { src: asset("/logo/g-utama.png"), from: { y: 60, scale: 0.9 }, delay: 0.25 },
  { src: asset("/logo/g-kiri.png"), from: { x: -70, rotate: -12 }, delay: 0.45 },
  { src: asset("/logo/g-titik.png"), from: { scale: 0, rotate: 90 }, delay: 0.75, spring: true },
  { src: asset("/logo/o-chevron.png"), from: { y: -80 }, delay: 0.95, spring: true },
  { src: asset("/logo/o-bawah.png"), from: { y: -140, scale: 0.4 }, delay: 1.25, spring: true },
  { src: asset("/logo/o-atas.png"), from: { y: -170, scale: 0.4 }, delay: 1.45, spring: true },
];
const DONE = 2.1;

function DiamondRing({ inset, dur, reverse, dash, color, delay }: { inset: string; dur: number; reverse?: boolean; dash?: string; color: string; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.svg viewBox="0 0 100 100" className="absolute" style={{ inset }} aria-hidden
      animate={reduce ? undefined : { rotate: reverse ? -360 : 360 }} transition={{ duration: dur, repeat: Infinity, ease: "linear" }}>
      <motion.path d="M50 2 L98 50 L50 98 L2 50 Z" fill="none" stroke={color} strokeWidth="0.6" strokeDasharray={dash} vectorEffect="non-scaling-stroke"
        initial={reduce ? false : { pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.6, delay, ease: [0.65, 0, 0.35, 1] }} />
      {!dash && [0, 1, 2, 3].map((i) => {
        const pts = [[50, 2], [98, 50], [50, 98], [2, 50]][i];
        return <motion.rect key={i} x={pts[0] - 1.8} y={pts[1] - 1.8} width="3.6" height="3.6" fill={i % 2 ? "#EE8A35" : "#17873F"} transform={`rotate(45 ${pts[0]} ${pts[1]})`}
          initial={reduce ? false : { opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: delay + 1.2 + i * 0.12 }} style={{ transformOrigin: `${pts[0]}px ${pts[1]}px` }} />;
      })}
    </motion.svg>
  );
}

export default function LogoMotion({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={"relative aspect-square " + className} role="img" aria-label="Logo Pesantren Nurul Islam Tengaran">
      {/* cahaya latar yang bernapas */}
      <motion.div aria-hidden className="absolute inset-[8%] rounded-full blur-2xl"
        style={{ background: "radial-gradient(circle, rgba(23,135,63,.55) 0%, rgba(238,138,53,.18) 45%, transparent 70%)" }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={reduce ? { opacity: 0.8, scale: 1 } : { opacity: [0.55, 0.9, 0.55], scale: [0.95, 1.06, 0.95] }}
        transition={reduce ? { duration: 0.4 } : { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} />

      <DiamondRing inset="0%" dur={60} color="rgba(255,255,255,.22)" delay={0} />
      <DiamondRing inset="9%" dur={45} reverse dash="1.5 3" color="rgba(238,138,53,.55)" delay={0.3} />

      {/* logo yang dirakit */}
      <motion.div className="absolute inset-[15%]"
        animate={reduce ? undefined : { y: [0, -6, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: DONE }}>
        <div className="relative size-full drop-shadow-[0_10px_24px_rgba(0,0,0,.35)]">
          {LAYERS.map((l) => (
            <motion.img key={l.src} src={l.src} alt="" draggable={false} className="absolute inset-0 size-full select-none"
              initial={reduce ? false : { opacity: 0, x: 0, y: 0, scale: 1, rotate: 0, ...l.from }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
              transition={l.spring ? { type: "spring", stiffness: 260, damping: 14, delay: l.delay } : { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: l.delay }} />
          ))}
          {/* kilau yang menyapu permukaan logo */}
          {!reduce && (
            <motion.div aria-hidden className="absolute inset-0 mix-blend-screen"
              style={{
                WebkitMaskImage: `url(${asset("/logo/full.png")})`, maskImage: `url(${asset("/logo/full.png")})`,
                WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
                background: "linear-gradient(115deg, transparent 35%, rgba(255,255,255,.75) 50%, transparent 65%)", backgroundSize: "250% 100%",
              }}
              initial={{ backgroundPosition: "150% 0" }} animate={{ backgroundPosition: ["150% 0", "-50% 0"] }}
              transition={{ duration: 1.6, ease: "easeInOut", delay: DONE, repeat: Infinity, repeatDelay: 4.5 }} />
          )}
        </div>
      </motion.div>

      {/* serpih belah ketupat yang melayang naik */}
      {!reduce && [18, 34, 66, 82].map((left, i) => (
        <motion.span key={left} aria-hidden className="absolute bottom-[12%] block size-1.5 rotate-45 rounded-[2px]"
          style={{ left: left + "%", background: i % 2 ? "#EE8A35" : "#4ade80" }}
          initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 0.9, 0], y: [-4, -90] }}
          transition={{ duration: 4.5, repeat: Infinity, delay: DONE + i * 1.1, ease: "easeOut" }} />
      ))}
    </div>
  );
}
