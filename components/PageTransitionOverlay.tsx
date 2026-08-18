"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
import truckAnimation from "./truck-green-blue.json";

export default function PageTransitionOverlay() {
  const pathname = usePathname();
  const [isAnimating, setIsAnimating] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setIsAnimating(true);
    
    // Truck drives past in 2.8 seconds
    const t = setTimeout(() => {
      setIsAnimating(false);
    }, 2800);

    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <AnimatePresence>
      {isAnimating && (
        <motion.div
          key="page-transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[150] pointer-events-none"
        >
          {/* Asphalt Road with dashed center lines */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-0 w-full h-4 md:h-6 bg-[#1a1a24] border-t border-[#2a2a36] flex items-center shadow-[0_0_20px_rgba(0,0,0,0.5)]"
          >
            {/* Dashed line down the middle of the road */}
            <div className="w-full h-[2px] bg-[repeating-linear-gradient(90deg,#ffffff_0,#ffffff_20px,transparent_20px,transparent_40px)] opacity-60" />
          </motion.div>

          {/* Truck driving across the bottom edge */}
          <motion.div
            initial={{ x: "-20vw" }}
            animate={{ x: "120vw" }}
            transition={{ duration: 2.8, ease: "easeInOut" }}
            className="absolute bottom-0 flex items-center justify-center w-[180px] h-[180px] drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] translate-y-1/4"
          >
            <Lottie animationData={truckAnimation} loop={true} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
