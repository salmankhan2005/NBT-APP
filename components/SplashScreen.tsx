"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Lottie from "lottie-react";
import phoneAnimation from "../phone.json";
import truckAnimation from "../truck.json";

export default function SplashScreen() {
  const [show, setShow] = useState(true);
  const [stage, setStage] = useState(0); // 0 = call, 1 = truck, 2 = finish

  useEffect(() => {
    // Prevent scrolling while splash screen is active
    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);

    // Stage 0: Initial call animation (0 to 2.5s)
    const timer1 = setTimeout(() => {
      setStage(1);
    }, 2500);

    // Stage 1: Truck animation (2.5s to 7.5s - exactly 5 seconds of truck)
    const timer2 = setTimeout(() => {
      setStage(2);
      setShow(false);
      // Restore scrolling after exit animation finishes
      setTimeout(() => {
        document.body.style.overflow = "auto";
      }, 800);
    }, 5000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050f1a] overflow-hidden"
        >
          {/* Radial subtle glow background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(3,80,215,0.15)_0%,transparent_70%)]" />

          {/* Stage 0: Dispatch Call */}
          <AnimatePresence>
            {stage === 0 && (
              <motion.div
                key="dispatch-call"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -50, filter: "blur(5px)" }}
                transition={{ duration: 0.5 }}
                className="absolute flex flex-col items-center justify-center"
              >
                <div className="relative flex items-center justify-center w-64 h-64 mb-8">
                  {/* Ripples */}
                  <motion.div
                    animate={{ scale: [1, 2], opacity: [0.8, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full border-2 border-secondary"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.6], opacity: [0.8, 0] }}
                    transition={{ duration: 1.5, delay: 0.4, repeat: Infinity, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full border border-secondary/50"
                  />
                  {/* Phone Icon */}
                  <div className="relative z-10 flex items-center justify-center w-[280px] h-[280px]">
                    <Lottie animationData={phoneAnimation} loop={true} />
                  </div>
                </div>
                <motion.h2 
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-white text-xl md:text-2xl font-bold tracking-widest uppercase"
                >
                  Initiating Dispatch
                </motion.h2>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stage 1: Fleet Deployed (Truck) */}
          <AnimatePresence>
            {stage === 1 && (
              <motion.div
                key="fleet-deployed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, filter: "blur(10px)" }}
                transition={{ duration: 0.5 }}
                className="absolute w-full h-full flex flex-col items-center justify-center"
              >
                {/* Road Line appearing */}
                <div className="absolute top-1/2 w-full h-[2px] bg-white/5 -translate-y-1/2">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: "100%" }}
                     transition={{ duration: 0.6, ease: "easeOut" }}
                     className="h-full bg-secondary shadow-[0_0_15px_rgba(3,80,215,0.8)]"
                   />
                </div>
                
                {/* Truck driving past rapidly */}
                <motion.div
                  initial={{ x: "-100vw", rotate: -2 }}
                  animate={{ x: "100vw", rotate: -2 }}
                  transition={{ duration: 4.8, delay: 0.2, ease: "easeInOut" }}
                  className="absolute top-1/2 -translate-y-[80%] flex items-center"
                >
                  {/* Motion Blur Trail */}
                  <div className="absolute right-[60%] w-96 h-24 bg-gradient-to-r from-transparent to-secondary/60 blur-xl" />
                  <div className="w-[300px] h-[300px] drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
                    <Lottie animationData={truckAnimation} loop={true} />
                  </div>
                </motion.div>
                
                <motion.h2 
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                  className="absolute top-[60%] text-white text-3xl md:text-5xl font-bold tracking-[0.2em] uppercase drop-shadow-[0_0_20px_rgba(3,80,215,0.8)]"
                >
                  Fleet Deployed
                </motion.h2>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
