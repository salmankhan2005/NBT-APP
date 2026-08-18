"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import ScrollToPlugin from "gsap/ScrollToPlugin";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
}
const links = [
  { href: "/",           label: "Home",             icon: "home" },
  { href: "/about",      label: "About Us",         icon: "info" },
  { href: "/services",   label: "Services",         icon: "local_shipping" },
  { href: "/compliance", label: "Business Details", icon: "business" },
  { href: "/contact",    label: "Contact",          icon: "call" },
];

// Per-section accent colors — each section owns a hue
const SECTION_THEMES: Record<string, {
  active: string;       // active link color (CSS value)
  hover: string;        // tailwind bg for hover
  ring: string;         // active indicator bg
  isDark: boolean;      // determines text/icon color
}> = {
  "section-intro":      { active: "#facc15", hover: "hover:bg-yellow-400/10",  ring: "bg-yellow-400",  isDark: true  },
  "section-hero":       { active: "#60a5fa", hover: "hover:bg-blue-400/10",    ring: "bg-blue-400",    isDark: true  },
  "section-stats":      { active: "#34d399", hover: "hover:bg-emerald-400/10", ring: "bg-emerald-400", isDark: true  },
  "section-industries": { active: "#fb923c", hover: "hover:bg-orange-400/10",  ring: "bg-orange-400",  isDark: true  },
  "section-services":   { active: "#a78bfa", hover: "hover:bg-violet-400/10",  ring: "bg-violet-400",  isDark: false },
  "section-milestones": { active: "#22d3ee", hover: "hover:bg-cyan-400/10",    ring: "bg-cyan-400",    isDark: true  },
  "quote":              { active: "#f97316", hover: "hover:bg-orange-400/10",  ring: "bg-orange-400",  isDark: false },
};

const DEFAULT_THEME = SECTION_THEMES["section-intro"];

export default function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [activeSection, setActiveSection] = useState("section-intro");
  const [mounted, setMounted] = useState(false);

  // Ensure server and client render the same initial HTML
  useEffect(() => { setMounted(true); }, []);


  // Use GSAP for scroll tracking and scroll spy
  useGSAP(() => {
    // 1. Track global scrollY
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    // 2. Scroll-spy for section theme
    const sectionIds = Object.keys(SECTION_THEMES);
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        ScrollTrigger.create({
          trigger: el,
          start: "top center",
          end: "bottom center",
          onToggle: (self) => {
            if (self.isActive) setActiveSection(id);
          }
        });
      }
    });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  const theme = SECTION_THEMES[activeSection] ?? DEFAULT_THEME;
  const isHomePage = pathname === "/";

  // Before mount, force the intro-state on home page so server HTML always matches client initial render
  const isOverIntro = isHomePage && (!mounted || scrollY < 80);
  const isScrolled  = mounted && scrollY > 50;
  
  // The header uses a light background (and dark text) if:
  // 1. We are scrolled over a light section on the home page (!theme.isDark)
  // 2. OR we are on any sub-page (they all have light backgrounds)
  const isLightHeader = !isHomePage || (isScrolled && !theme.isDark);

  // Non-active link text — solid black on light BG for max contrast
  const mutedText = isLightHeader
    ? "text-black/70 hover:text-black"
    : "text-white/60 hover:text-white";

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.2 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isOverIntro
            ? "bg-transparent border-transparent"
            : isLightHeader
            ? "bg-white/90 backdrop-blur-2xl border-b border-black/10 shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
            : "bg-black/55 backdrop-blur-2xl border-b border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
        }`}
      >
        <div className="flex items-center w-full px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto h-20">

          {/* Brand — color reacts to section */}
          <Link href="/" className="flex flex-col justify-center mr-auto whitespace-nowrap group">
            <motion.div whileHover={{ scale: 1.04 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
              <motion.span
                animate={{ color: isOverIntro ? "#ffffff" : isLightHeader ? "#000000" : theme.active }}
                transition={{ duration: 0.35 }}
                className="text-headline-md font-headline-md font-black leading-none mb-0.5 block"
              >
                NBT
              </motion.span>
              <span className={`text-[10px] font-semibold tracking-[0.18em] uppercase leading-none transition-colors duration-300 ${
                isLightHeader ? "text-black/40" : "text-white/40"
              }`}>
                New Balaji Transports
              </span>
            </motion.div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0.5 mr-6 relative">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 rounded-full text-label-md font-label-md transition-all duration-200 ${mutedText} ${
                    isActive ? "font-bold" : ""
                  }`}
                  style={isActive ? { color: isLightHeader ? "#000000" : theme.active } : {}}
                >
                  {/* Active pill background */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: isLightHeader ? "rgba(0,0,0,0.08)" : `${theme.active}25` }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  {/* Active underline bar */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-bar"
                      className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                      style={{ backgroundColor: isLightHeader ? "#000000" : theme.active }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex gap-2 items-center">
            <Link
              href="/contact"
              className={`whitespace-nowrap px-5 py-2 rounded-full text-label-md font-label-md transition-all duration-300 border ${
                isLightHeader ? "border-black/30 text-black font-semibold hover:bg-black/5" : ""
              }`}
              style={!isLightHeader ? {
                borderColor: `${theme.active}40`,
                color: "rgba(255,255,255,0.85)",
              } : {}}
              onMouseEnter={(e) => {
                if (!isLightHeader) (e.currentTarget as HTMLAnchorElement).style.backgroundColor = `${theme.active}18`;
              }}
              onMouseLeave={(e) => {
                if (!isLightHeader) (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
              }}
            >
              Get a Quote
            </Link>
            <Link
              href="/tracking"
              className="whitespace-nowrap px-5 py-2 rounded-full text-label-md font-label-md text-black font-bold transition-all duration-300 flex items-center gap-1.5"
              style={{
                backgroundColor: theme.active,
                boxShadow: `0 4px 18px ${theme.active}50`,
              }}
            >
              <span className="material-symbols-outlined text-[16px]">radar</span>
              Track
            </Link>
          </div>

          {/* Mobile Toggle */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="lg:hidden p-2 rounded-lg transition-colors"
            style={{ color: isOverIntro ? "white" : isLightHeader ? "#000000" : theme.active }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined block">
              {isMobileMenuOpen ? "close" : "menu"}
            </span>
          </motion.button>
        </div>

        {/* Dynamic color accent underline on header bottom */}
        <motion.div
          className="h-[1.5px] w-full origin-left"
          animate={{
            scaleX: isScrolled ? 1 : 0,
            opacity: isScrolled ? 1 : 0,
          }}
          style={{
            background: `linear-gradient(90deg, transparent, ${theme.active}, ${theme.active}80, transparent)`,
          }}
          transition={{ duration: 0.5 }}
        />
      </motion.header>

      {/* Mobile Side Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-[300px] bg-[#07111f] shadow-[0_0_60px_rgba(0,0,0,0.6)] z-50 p-6 flex flex-col gap-4 lg:hidden border-l border-white/10"
            >
              {/* Drawer header with section color accent */}
              <div
                className="flex justify-between items-center pb-4 border-b"
                style={{ borderColor: `${theme.active}30` }}
              >
                <div>
                  <span className="font-black text-xl" style={{ color: theme.active }}>NBT</span>
                  <p className="text-white/30 text-[10px] tracking-widest uppercase mt-0.5">Navigation</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-white/50 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </motion.button>
              </div>

              {/* Nav links */}
              <nav className="flex flex-col gap-1 flex-1">
                {links.map((link, i) => {
                  const isActive = pathname === link.href;
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-label-md font-label-md transition-all"
                        style={
                          isActive
                            ? {
                                backgroundColor: `${theme.active}20`,
                                color: theme.active,
                                fontWeight: "bold",
                                border: `1px solid ${theme.active}35`,
                              }
                            : { color: "rgba(255,255,255,0.55)" }
                        }
                      >
                        <span className="material-symbols-outlined text-[18px] opacity-70">{link.icon}</span>
                        {link.label}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>

              {/* CTA row */}
              <div className="flex flex-col gap-2 pt-4 border-t" style={{ borderColor: `${theme.active}20` }}>
                <Link
                  href="/contact"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-4 py-3 rounded-xl text-center text-label-md font-label-md transition-all border"
                  style={{
                    borderColor: `${theme.active}40`,
                    color: "rgba(255,255,255,0.75)",
                  }}
                >
                  Get a Quote
                </Link>
                <Link
                  href="/tracking"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-4 py-3 rounded-xl text-center text-label-md font-bold transition-all flex items-center justify-center gap-2 text-black"
                  style={{
                    backgroundColor: theme.active,
                    boxShadow: `0 4px 18px ${theme.active}45`,
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]">radar</span>
                  Track Shipment
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
