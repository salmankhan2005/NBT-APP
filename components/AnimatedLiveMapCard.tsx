"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { MouseEvent } from "react";

export default function AnimatedLiveMapCard() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Smooth the mouse movement for a premium feel
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });
  
  // Transform the mouse position into rotation values
  // Max rotation is 10 degrees for a subtle, elegant effect
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Normalize mouse position between -0.5 and 0.5
    const mouseX = (e.clientX - rect.left) / width - 0.5;
    const mouseY = (e.clientY - rect.top) / height - 0.5;
    
    x.set(mouseX);
    y.set(mouseY);
  };

  const handleMouseLeave = () => {
    // Return to center when mouse leaves
    x.set(0);
    y.set(0);
  };

  return (
    <div 
      className="relative h-full min-h-[400px] w-full flex items-center justify-center lg:pl-gutter"
      style={{ perspective: "1200px" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div 
        style={{ 
          rotateX, 
          rotateY,
          transformStyle: "preserve-3d"
        }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 top-0 left-0 lg:left-gutter bg-surface-container-lowest rounded-xl shadow-[0_24px_64px_rgba(11,29,51,0.15)] border border-surface-container flex flex-col"
      >
        {/* Card Header */}
        <div 
          className="p-4 border-b border-surface-container bg-surface-bright flex justify-between items-center z-20 relative"
          style={{ transform: "translateZ(30px)" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-error animate-pulse shadow-[0_0_8px_rgba(186,26,26,0.6)]"></div>
            <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Live Route Telemetry</span>
          </div>
          <span className="material-symbols-outlined text-outline">more_horiz</span>
        </div>
        
        {/* Map Visual Area */}
        <div className="relative flex-grow bg-surface-variant overflow-hidden rounded-b-xl" style={{ transformStyle: "preserve-3d" }}>
          {/* Map Background Layer - 4K Generated Light Road Map */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-100" 
            style={{ 
              backgroundImage: "url('/salem_kochi_hwy_map.png')",
              transform: "translateZ(-20px)"
            }} 
          />
          
          {/* Animated Route SVG Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-md z-10" preserveAspectRatio="none" viewBox="0 0 400 300" style={{ transform: "translateZ(20px)" }}>
            {/* Background dotted path */}
            <motion.path 
              className="opacity-40" 
              d="M 50 250 Q 150 200 200 150 T 350 50" 
              fill="none" 
              stroke="#FF6B00" 
              strokeDasharray="6 6" 
              strokeWidth="3"
            />
            {/* Animated solid path */}
            <motion.path 
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatType: "loop", repeatDelay: 1 }}
              className="opacity-90" 
              d="M 50 250 Q 150 200 200 150 T 350 50" 
              fill="none" 
              stroke="#0350d7" 
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Origin & Destination Nodes */}
            <circle cx="50" cy="250" fill="#0b1d33" r="6" />
            <circle cx="50" cy="250" fill="#FF6B00" r="3" />
            <circle cx="350" cy="50" fill="#0b1d33" r="6" />
            <circle cx="350" cy="50" fill="#0350d7" r="3" className="animate-pulse" />
          </svg>
          
          {/* Floating Live Vehicle Indicator */}
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", delay: 0.5 }}
            style={{ transform: "translateZ(60px) translate(-50%, -50%)" }}
            className="absolute top-1/2 left-1/2 origin-center z-30"
          >
            <motion.div 
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-full shadow-[0_12px_32px_rgba(11,29,51,0.25)] border border-white/20 px-4 py-2 flex items-center gap-2 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-secondary text-[20px]">local_shipping</span>
              <span className="text-label-sm font-label-sm text-on-surface flex items-center">
                TN 30 AA 1234 · 
                <span className="relative flex h-2 w-2 mx-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
                </span>
                <span className="text-error font-bold drop-shadow-[0_0_8px_rgba(186,26,26,0.5)]">Live</span> · 63%
              </span>
            </motion.div>
          </motion.div>
          
          {/* ETA Analytics Card */}
          <motion.div 
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", delay: 0.8 }}
            style={{ transform: "translateZ(40px)" }}
            className="absolute bottom-6 right-6 z-20"
          >
            <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded-xl shadow-[0_8px_24px_rgba(11,29,51,0.15)] border border-surface-container p-4 flex flex-col gap-1 min-w-[140px]">
              <span className="text-label-sm font-label-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">schedule</span> ETA · Coimbatore
              </span>
              <span className="text-headline-md font-headline-md text-on-surface font-bold">2h 14m</span>
              <div className="w-full bg-surface-variant h-1.5 mt-2 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: "0%" }}
                  whileInView={{ width: "63%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                  className="h-full bg-secondary shadow-[0_0_8px_rgba(3,80,215,0.8)]"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
