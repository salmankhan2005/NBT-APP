"use client";

import Link from "next/link";
import { motion, Variants } from "framer-motion";
import TrackingBar from "@/components/TrackingBar";
import AnimatedLiveMapCard from "@/components/AnimatedLiveMapCard";

const heroContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const heroItemVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden text-on-primary py-24 lg:py-32 bg-primary-container min-h-[600px] flex items-center">
      {/* Background Video Layer */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute top-1/2 left-1/2 min-w-full min-h-full -translate-x-1/2 -translate-y-1/2 object-cover opacity-35"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        {/* Contrast Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-container via-primary-container/90 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-container via-transparent to-transparent z-10" />
      </div>

      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop relative z-20 grid grid-cols-1 lg:grid-cols-2 gap-stack-lg items-center">
        {/* Left Column */}
        <motion.div
          variants={heroContainerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-stack-lg"
        >
          <motion.div variants={heroItemVariants} className="space-y-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-label-sm font-label-sm mb-2">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="material-symbols-outlined text-[16px] mr-1">local_shipping</span>
              PAN-INDIA FREIGHT &amp; FLEET LOGISTICS
            </span>
            <h1 className="text-headline-xl font-headline-xl text-gradient mb-4 leading-tight">
              Interstate freight done reliably.
            </h1>
            <p className="text-body-lg font-body-lg text-primary-fixed-dim max-w-xl">
              From 32ft MXL containers and 12–16 wheeler open-body trucks to FTL, PTL and heavy-haul logistics, we move crop produce, industrial goods and commercial cargo with consistent route discipline.
            </p>
          </motion.div>

          {/* Floating Tracking Card */}
          <motion.div
            variants={heroItemVariants}
            className="bg-surface-container-lowest rounded-lg p-6 shadow-[0_12px_32px_rgba(11,29,51,0.12)] border border-surface-container text-on-surface max-w-md relative z-20"
          >
            <label className="block text-label-md font-label-md text-on-surface mb-2">
              Track Your Shipment — No login required
            </label>
            <TrackingBar size="md" />
          </motion.div>

          <motion.div variants={heroItemVariants} className="flex flex-wrap gap-stack-md pt-4">
            <Link
              href="#quote"
              className="bg-secondary text-on-secondary px-6 py-3 rounded font-label-md hover:bg-secondary-container transition-colors min-h-[44px] flex items-center justify-center shadow-[0_4px_12px_rgba(11,29,51,0.05)]"
            >
              Get a Freight Quote
            </Link>
            <a
              href="tel:+919789271721"
              className="px-6 py-3 border border-outline text-on-primary rounded font-label-md hover:bg-white/10 transition-colors min-h-[44px] flex items-center justify-center"
            >
              <span className="material-symbols-outlined mr-2">phone_in_talk</span>
              Call Emergency Dispatch
            </a>
          </motion.div>
        </motion.div>

        {/* Right Column (Live Map Card) */}
        <AnimatedLiveMapCard />
      </div>
    </section>
  );
}
