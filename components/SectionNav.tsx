"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import ScrollToPlugin from "gsap/ScrollToPlugin";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
}

const sections = [
  { id: "section-intro",      label: "Intro",      icon: "play_circle" },
  { id: "section-hero",       label: "Overview",   icon: "home" },
  { id: "section-stats",      label: "Stats",      icon: "bar_chart" },
  { id: "section-industries", label: "Industries", icon: "category" },
  { id: "section-services",   label: "Services",   icon: "local_shipping" },
  { id: "section-milestones", label: "Milestones", icon: "timeline" },
  { id: "quote",              label: "Get Quote",  icon: "request_quote" },
];

export default function SectionNav() {
  const pathname = usePathname();
  const [active, setActive] = useState<string>("section-intro");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // Use GSAP for scroll-tracking and visibility
  useGSAP(() => {
    // Only set up scroll triggers if we are on the homepage
    if (pathname !== "/") return;
    // 1. Show/hide the nav based on scroll position
    ScrollTrigger.create({
      start: "top -80",
      end: 99999,
      onToggle: (self) => setVisible(self.isActive),
    });

    // 2. Scroll-spy for each section
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) {
        ScrollTrigger.create({
          trigger: el,
          start: "top center",
          end: "bottom center",
          onToggle: (self) => {
            if (self.isActive) setActive(id);
          }
        });
      }
    });
  }, [pathname]);

  if (pathname !== "/") {
    return null;
  }

  const scrollTo = (id: string) => {
    gsap.to(window, {
      duration: 1,
      scrollTo: { y: `#${id}`, offsetY: 0 },
      ease: "power3.inOut"
    });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 30 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          aria-label="Section navigation"
          className="fixed right-5 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col gap-3 items-end"
        >
          {sections.map(({ id, label, icon }) => {
            const isActive = active === id;
            const isHovered = hoveredId === id;

            return (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                onMouseEnter={() => setHoveredId(id)}
                onMouseLeave={() => setHoveredId(null)}
                aria-label={`Scroll to ${label}`}
                className="flex items-center gap-2 group focus:outline-none"
              >
                {/* Label pill — slides in on hover */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, x: 12, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 12, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 shadow-xl"
                    >
                      <span className="material-symbols-outlined text-white/80 text-[14px]">
                        {icon}
                      </span>
                      <span className="text-white text-xs font-semibold tracking-wide whitespace-nowrap">
                        {label}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Dot indicator */}
                <div className="relative flex items-center justify-center w-6 h-6">
                  {/* Outer ring for active */}
                  {isActive && (
                    <motion.div
                      layoutId="section-nav-ring"
                      className="absolute w-5 h-5 rounded-full border-2 border-secondary"
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                  {/* Inner dot */}
                  <motion.div
                    animate={{
                      width: isActive ? 8 : isHovered ? 10 : 6,
                      height: isActive ? 8 : isHovered ? 10 : 6,
                      backgroundColor: isActive
                        ? "rgb(255,152,0)"
                        : isHovered
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(255,255,255,0.35)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="rounded-full"
                  />
                </div>
              </button>
            );
          })}

          {/* Vertical connector line */}
          <div className="absolute right-[11px] top-0 bottom-0 w-px bg-white/10 -z-10 pointer-events-none" />
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
