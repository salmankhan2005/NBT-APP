"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function VideoIntro() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Parallax: video zooms in slightly and fades as user scrolls
  const videoScale   = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const videoOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const contentY     = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);

  return (
    /* ── Outer wrapper: min-h-[85vh] on mobile so it doesn't squish, 16:9 on desktop ── */
    <section
      ref={containerRef}
      className="relative w-full overflow-hidden bg-black flex items-center justify-center min-h-[85vh] md:min-h-0 md:aspect-video max-h-screen"
    >
      {/* ── Cinematic letterbox bars (top & bottom) ── */}
      <div className="absolute top-0 left-0 right-0 h-[8%] bg-black z-20 pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 right-0 h-[8%] bg-black z-20 pointer-events-none" aria-hidden="true" />

      {/* ── 16:9 video layer ── */}
      <motion.div
        style={{ scale: videoScale, opacity: videoOpacity }}
        className="absolute inset-0 w-full h-full flex items-center justify-center"
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>

        {/* Reduced-opacity cinematic overlays */}
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />

        {/* Vignette */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)",
          }}
        />
      </motion.div>

      {/* ── Centred Brand Content (sits between the bars) ── */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="absolute inset-x-0 top-[8%] bottom-[8%] z-10 flex flex-col items-center justify-center gap-4 md:gap-5 text-center px-6"
      >
        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
        >
          <span className="inline-flex items-center gap-1.5 md:gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-white/80 text-[10px] sm:text-xs md:text-sm font-medium tracking-wider md:tracking-widest uppercase whitespace-nowrap">
            <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-green-500" />
            </span>
            Live Fleet Operations · Pan-India
          </span>
        </motion.div>

        {/* Logo / Brand Name */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1, ease: [0.25, 1, 0.5, 1] }}
          className="flex flex-col items-center"
        >
          <h1
            className="text-white font-black leading-none tracking-[-0.03em] select-none"
            style={{ fontSize: "clamp(4rem, 12vw, 10rem)" }}
          >
            NBT
          </h1>
          <p className="text-white/60 text-xs md:text-xl font-medium tracking-[0.25em] uppercase mt-2">
            New Balaji Transports
          </p>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.9, ease: [0.25, 1, 0.5, 1] }}
          className="text-white/50 text-xs md:text-lg max-w-2xl leading-relaxed mt-2"
        >
          India's most trusted freight network.<br />
          <span className="text-white/70 font-semibold">500+ GPS-tracked vehicles. 28 states. 24×7 dispatch.</span>
        </motion.p>

        {/* CTA Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
          className="flex flex-wrap gap-3 md:gap-4 justify-center mt-2 md:mt-4"
        >
          <a
            href="#quote"
            className="px-6 md:px-8 py-2.5 md:py-3 rounded-full bg-white text-black font-bold text-xs md:text-sm tracking-wider hover:bg-secondary hover:text-white transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            Get a Quote
          </a>
          <a
            href="#main-content"
            className="px-6 md:px-8 py-2.5 md:py-3 rounded-full border border-white/30 text-white font-semibold text-xs md:text-sm tracking-wider hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
          >
            Explore Platform
          </a>
        </motion.div>
      </motion.div>

      {/* ── Scroll Indicator ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.8 }}
        style={{ opacity: useTransform(scrollYProgress, [0, 0.2], [1, 0]) }}
        className="absolute bottom-[10%] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 md:gap-2"
      >
        <span className="text-white/40 text-[9px] md:text-[10px] font-medium tracking-[0.3em] uppercase">Scroll</span>
        <div className="w-4 h-6 md:w-5 md:h-8 border border-white/30 rounded-full flex justify-center pt-1">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="w-1 h-1 bg-white rounded-full"
          />
        </div>
      </motion.div>

      {/* ── Orange accent strip ── */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1.5, duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
        className="absolute bottom-[8%] left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent origin-left z-20"
      />
    </section>
  );
}
