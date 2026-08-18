"use client";

import { motion, useInView, animate, Variants } from "framer-motion";
import { useEffect, useRef } from "react";

function Counter({ from, to, suffix = "", prefix = "", decimals = 0 }: { from: number, to: number, suffix?: string, prefix?: string, decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (inView && ref.current) {
      const controls = animate(from, to, {
        duration: 2.5,
        ease: "easeOut",
        onUpdate(value) {
          if (ref.current) {
            ref.current.textContent = prefix + value.toFixed(decimals) + suffix;
          }
        },
      });
      return () => controls.stop();
    }
  }, [inView, from, to, suffix, prefix, decimals]);

  return <span ref={ref}>{prefix}{from.toFixed(decimals)}{suffix}</span>;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } }
};

export default function AnimatedStats() {
  return (
    <section className="bg-primary-container border-t border-white/10 py-12 overflow-hidden">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop grid grid-cols-2 md:grid-cols-4 gap-stack-lg text-center divide-x divide-white/10"
      >
        <motion.div variants={itemVariants} className="px-4">
          <div className="text-headline-lg font-headline-lg text-tertiary-fixed-dim mb-2 flex justify-center">
            <Counter from={0} to={500} suffix="+" />
          </div>
          <div className="text-label-sm font-label-sm text-primary-fixed-dim uppercase tracking-wider">Fleet Vehicles Managed</div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="px-4">
          <div className="text-headline-lg font-headline-lg text-tertiary-fixed-dim mb-2 flex justify-center">
            <Counter from={0} to={28} suffix="+" />
          </div>
          <div className="text-label-sm font-label-sm text-primary-fixed-dim uppercase tracking-wider">States & UTs Served</div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="px-4">
          <div className="text-headline-lg font-headline-lg text-tertiary-fixed-dim mb-2 flex justify-center">
            <Counter from={0} to={99.4} suffix="%" decimals={1} />
          </div>
          <div className="text-label-sm font-label-sm text-primary-fixed-dim uppercase tracking-wider">On-Time Delivery Rate</div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="px-4">
          <div className="text-headline-lg font-headline-lg text-tertiary-fixed-dim mb-2 flex justify-center items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            24×7
          </div>
          <div className="text-label-sm font-label-sm text-primary-fixed-dim uppercase tracking-wider">Live Dispatch Support</div>
        </motion.div>
      </motion.div>
    </section>
  );
}
