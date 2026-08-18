"use client";

/**
 * LogisticsNav - Production-ready animated navigation bar
 * =========================================================
 * Brand: B2B + B2C Logistics (India)
 * Stack: React 18 + Tailwind CSS + Framer Motion + lucide-react
 *
 * 8 Animations Implemented:
 *  1. ROUTE PATH REVEAL      - underline draws left-to-right on link hover (300ms)
 *  2. TRUCK PROGRESS BAR     - truck slides to active link with layoutId
 *  3. WAREHOUSE SHELF SLIDE  - mobile drawer slides from left; each item lifts 4px on hover
 *  4. GLOBE PIN DROP         - pin bounces on "Network" hover
 *  5. SHIPMENT STATUS DOT    - pulsing green dot on "Track Shipment"
 *  6. CONTAINER STACK MORPH  - logo containers compress into X on mobile menu open
 *  7. SPEED LINE SWIPE       - white streak sweeps across "Get Quote" button on hover
 *  8. MEGA MENU MAP          - dropdown with hub cities fades+slides on "Network" hover
 */

import { useState, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const PAGE_SECTIONS = [
  { id: "section-intro",      label: "Intro" },
  { id: "section-hero",       label: "Overview" },
  { id: "section-stats",      label: "Stats" },
  { id: "section-industries", label: "Industries" },
  { id: "section-services",   label: "Services" },
  { id: "section-milestones", label: "Milestones" },
  { id: "quote",              label: "Get Quote" },
];

const NAV_ITEMS = [
  { label: "Home",           href: "/",          id: "home" },
  { label: "Services",       href: "/services",  id: "services" },
  { label: "Network",        href: "#network",   id: "network",  hasMega: true },
  { label: "Track Shipment", href: "/tracking",  id: "tracking", hasStatusDot: true },
  { label: "About",          href: "/about",     id: "about" },
  { label: "Contact",        href: "/contact",   id: "contact" },
];

const HUBS = ["Delhi", "Mumbai", "Chennai", "Kolkata", "Bangalore"];
const SPRING = { type: "spring" as const, stiffness: 380, damping: 30 };
const EASE_OUT = { duration: 0.28, ease: [0.25, 1, 0.5, 1] as const };

export default function LogisticsNav() {
  const pathname       = usePathname();
  const prefersReduced = useReducedMotion();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredId, setHoveredId]   = useState<string | null>(null);
  const [megaOpen, setMegaOpen]     = useState(false);
  const [activeId, setActiveId]     = useState(() => {
    const match = NAV_ITEMS.find((n) => n.href !== "/" && pathname.startsWith(n.href));
    return match?.id ?? "home";
  });
  const megaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeSectionName, setActiveSectionName] = useState<string | null>(null);

  // Track scroll position to update the section name in the navbar
  useGSAP(() => {
    if (pathname !== "/") {
      setActiveSectionName(null);
      return;
    }
    
    PAGE_SECTIONS.forEach(({ id, label }) => {
      const el = document.getElementById(id);
      if (el) {
        ScrollTrigger.create({
          trigger: el,
          start: "top center",
          end: "bottom center",
          onToggle: (self) => {
            if (self.isActive) setActiveSectionName(label);
          }
        });
      }
    });
  }, [pathname]);

  const openMega  = () => { if (megaTimer.current) clearTimeout(megaTimer.current); setMegaOpen(true); };
  const closeMega = () => { megaTimer.current = setTimeout(() => setMegaOpen(false), 120); };
  const handleNavClick = (id: string) => { setActiveId(id); setMobileOpen(false); };

  // [ANIMATION 6] CONTAINER STACK MORPH
  // Three orange rectangles (containers) that morph into an X when mobile menu opens.
  const ContainerLogo = ({ size = "md" }: { size?: "sm" | "md" }) => {
    const w = size === "sm" ? "w-5" : "w-6";
    const h = size === "sm" ? "h-[3px]" : "h-[4px]";
    return (
      <div className="flex flex-col gap-[4px]" aria-hidden="true">
        <motion.div className={`${w} ${h} bg-orange-500 rounded-full origin-center`}
          animate={mobileOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
          transition={prefersReduced ? { duration: 0 } : EASE_OUT}
        />
        <motion.div className={`${w} ${h} bg-orange-400 rounded-full`}
          animate={mobileOpen ? { scaleX: 0, opacity: 0 } : { scaleX: 1, opacity: 1 }}
          transition={prefersReduced ? { duration: 0 } : { duration: 0.2 }}
        />
        <motion.div className={`${w} ${h} bg-orange-600 rounded-full origin-center`}
          animate={mobileOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
          transition={prefersReduced ? { duration: 0 } : EASE_OUT}
        />
      </div>
    );
  };

  return (
    <>
      <nav role="navigation" aria-label="Main navigation"
        className="fixed top-0 left-0 right-0 z-50 bg-[#0B1D3A] border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">

          {/* LOGO */}
          <Link href="/" onClick={() => handleNavClick("home")} aria-label="NBT Home"
            className="flex items-center gap-2 shrink-0 group"
          >
            <div className="hidden lg:block">
              <ContainerLogo />
            </div>
            <span className="flex items-center text-white font-black text-lg tracking-tight leading-none select-none">
              <span className="flex flex-col">
                NBT
                <span className="block text-[9px] font-medium text-white/40 tracking-[0.15em] uppercase">New Balaji Transport</span>
              </span>
              
              {/* Dynamic Section Name (only on homepage) */}
              <AnimatePresence mode="wait">
                {activeSectionName && pathname === "/" && (
                  <motion.span 
                    key={activeSectionName}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="ml-2 pl-2 border-l border-white/20 text-orange-400 font-bold text-[10px] sm:text-xs tracking-widest uppercase"
                  >
                    {activeSectionName}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </Link>

          {/* DESKTOP NAV */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center" role="menubar">
            {NAV_ITEMS.map((item) => {
              const isActive = activeId === item.id;
              return (
                <div key={item.id} className="relative"
                  onMouseEnter={() => { setHoveredId(item.id); if (item.hasMega) openMega(); }}
                  onMouseLeave={() => { setHoveredId(null);  if (item.hasMega) closeMega(); }}
                >
                  <Link href={item.href} role="menuitem"
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => handleNavClick(item.id)}
                    className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium text-white/70 hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  >
                    {/* [ANIMATION 5] SHIPMENT STATUS DOT */}
                    {item.hasStatusDot && (
                      <span className="relative flex h-2 w-2 shrink-0" aria-label="Live tracking">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                      </span>
                    )}

                    {/* [ANIMATION 4] GLOBE PIN DROP */}
                    {item.hasMega && (
                      <motion.span aria-hidden="true" className="text-sm"
                        animate={hoveredId === item.id ? { y: [0, -5, 0] } : { y: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      >📍</motion.span>
                    )}

                    <span className="relative">
                      {item.label}
                      {/* [ANIMATION 1] ROUTE PATH REVEAL */}
                      <motion.span aria-hidden="true"
                        className="absolute left-0 -bottom-0.5 h-[2px] bg-orange-500 rounded-full"
                        style={{ width: "100%" }}
                        initial={{ scaleX: 0, originX: 0 }}
                        animate={{ scaleX: hoveredId === item.id ? 1 : 0 }}
                        transition={prefersReduced ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }}
                      />
                    </span>

                    {/* [ANIMATION 2] TRUCK PROGRESS BAR */}
                    {isActive && (
                      <motion.span layoutId="truck-indicator" aria-hidden="true"
                        className="absolute -bottom-[2px] left-0 right-0 flex justify-center text-[10px] leading-none"
                        transition={prefersReduced ? { duration: 0 } : SPRING}
                      >🚚</motion.span>
                    )}
                  </Link>

                  {/* [ANIMATION 8] MEGA MENU MAP */}
                  {item.hasMega && (
                    <AnimatePresence>
                      {megaOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                          transition={prefersReduced ? { duration: 0 } : EASE_OUT}
                          onMouseEnter={openMega} onMouseLeave={closeMega}
                          className="absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2 w-72 bg-[#0d2348] border border-white/10 rounded-xl shadow-2xl p-5 z-50"
                          role="region" aria-label="Network hubs"
                        >
                          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-3">🌐 Hubs: Pan-India</p>
                          <div className="flex flex-wrap gap-2">
                            {HUBS.map((hub) => (
                              <span key={hub} className="inline-flex items-center gap-1 px-3 py-1 bg-orange-500/10 border border-orange-500/25 text-orange-300 text-xs font-medium rounded-full">
                                📍 {hub}
                              </span>
                            ))}
                          </div>
                          <p className="mt-4 text-white/30 text-[10px]">Pan-India coverage · 500+ routes · Real-time tracking</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              );
            })}
          </div>

          {/* [ANIMATION 7] SPEED LINE SWIPE — CTA button */}
          <div className="hidden lg:block shrink-0">
            <Link href="/contact">
              <motion.button whileHover="hovered" aria-label="Get a freight quote"
                className="relative overflow-hidden flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-full shadow-[0_0_20px_rgba(249,115,22,0.35)] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1D3A]"
              >
                <motion.span aria-hidden="true"
                  className="absolute inset-y-0 w-[35%] bg-white/20 skew-x-[-20deg]"
                  variants={{ hovered: { x: ["−60%", "220%"], transition: { duration: 0.4, ease: "easeIn" } } }}
                  initial={{ x: "-60%" }}
                />
                <span className="relative">Get Quote</span>
                <motion.span aria-hidden="true" className="relative" variants={{ hovered: { x: 3 } }} transition={{ duration: 0.2 }}>⚡</motion.span>
              </motion.button>
            </Link>
          </div>

          {/* HAMBURGER */}
          <button className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg border border-white/10 bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen} aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            <ContainerLogo size="sm" />
          </button>
        </div>
      </nav>

      {/* [ANIMATION 3] WAREHOUSE SHELF SLIDE — Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)} aria-hidden="true"
            />
            <motion.div id="mobile-menu" key="drawer"
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={prefersReduced ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 32 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#0B1D3A] border-r border-white/10 shadow-2xl lg:hidden flex flex-col"
              role="dialog" aria-modal="true" aria-label="Mobile navigation"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <Link href="/" onClick={() => handleNavClick("home")} className="flex items-center gap-2.5">
                  <ContainerLogo />
                  <span className="text-white font-black text-base">NBT</span>
                </Link>
                <button onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-white/5 text-white/50 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  aria-label="Close navigation menu"
                >✕</button>
              </div>

              <nav className="flex-1 overflow-y-auto py-4 px-3" role="menu">
                {NAV_ITEMS.map((item, i) => {
                  const isActive = activeId === item.id;
                  return (
                    <motion.div key={item.id}
                      initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.25 }}
                    >
                      <Link href={item.href} role="menuitem" aria-current={isActive ? "page" : undefined} onClick={() => handleNavClick(item.id)}>
                        {/* 4px lift on hover — part of Warehouse Shelf Slide */}
                        <motion.div
                          whileHover={prefersReduced ? {} : { y: -4 }}
                          transition={{ duration: 0.18 }}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-colors duration-150 ${isActive ? "bg-orange-500/15 text-orange-400 border border-orange-500/25" : "text-white/60 hover:text-white hover:bg-white/5"}`}
                        >
                          {item.hasStatusDot && (
                            <span className="relative flex h-2 w-2 shrink-0" aria-label="Live">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                            </span>
                          )}
                          {item.hasMega && <span aria-hidden="true">📍</span>}
                          <span className="text-sm font-medium">{item.label}</span>
                          {isActive && <span className="ml-auto text-orange-400 text-xs" aria-hidden="true">🚚</span>}
                        </motion.div>
                      </Link>
                      {item.hasMega && (
                        <div className="mx-4 mb-2 p-3 bg-[#0d2348] rounded-lg border border-white/5">
                          <p className="text-white/30 text-[9px] uppercase tracking-widest mb-2">Hubs</p>
                          <div className="flex flex-wrap gap-1.5">
                            {HUBS.map((hub) => (
                              <span key={hub} className="text-[10px] px-2 py-0.5 bg-orange-500/10 text-orange-300 border border-orange-500/20 rounded-full">{hub}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-white/10">
                <Link href="/contact" onClick={() => setMobileOpen(false)}>
                  <motion.button
                    whileHover={prefersReduced ? {} : { scale: 1.02 }}
                    whileTap={prefersReduced ? {} : { scale: 0.97 }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                    aria-label="Get a freight quote"
                  >⚡ Get Quote</motion.button>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer for fixed nav (only on subpages, so home video is truly fullscreen) */}
      {pathname !== "/" && <div className="h-16" aria-hidden="true" />}
    </>
  );
}
