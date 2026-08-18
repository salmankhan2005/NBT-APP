"use client";

import { motion } from "framer-motion";
import { Truck, MapPin, Navigation, Clock } from "lucide-react";

export default function ActiveRouteTelemetry() {
  return (
    <div className="bg-primary text-white p-5 rounded-card border border-primary/40 shadow-level3 relative overflow-hidden">
      {/* Decorative Grid/Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[14px_24px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-label-sm uppercase tracking-wider text-slate-300 font-bold">
            Live Route Telemetry
          </span>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-success/20 text-emerald-400 border border-emerald-500/30">
          On Schedule
        </span>
      </div>

      {/* Lorry and Route Line */}
      <div className="space-y-4 relative z-10">
        <div className="flex items-center justify-between text-body-sm">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-secondary" />
            <span className="font-bold text-white">TN 30 AA 1234</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-300 text-body-xs font-medium">22ft Container</span>
          </div>
          <span className="font-bold text-tertiary">63% Completed</span>
        </div>

        {/* Animated Progress Route Line */}
        <div className="relative pt-2 pb-1">
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative">
            <motion.div
              className="absolute top-0 left-0 h-full bg-secondary rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "63%" }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </div>
          
          {/* Animated Truck Icon on Line */}
          <motion.div
            className="absolute -top-1.5"
            style={{ left: "calc(63% - 12px)" }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shadow-lg border border-white/20">
              <Navigation className="h-3 w-3 text-white rotate-90" />
            </div>
          </motion.div>
        </div>

        {/* Route Details */}
        <div className="flex justify-between items-center text-body-sm pt-2">
          <div className="flex items-center gap-1.5 text-slate-300">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span className="font-semibold">Chennai</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300 text-right">
            <span className="font-semibold">Coimbatore</span>
            <MapPin className="h-4 w-4 text-tertiary" />
          </div>
        </div>

        {/* ETA Widget */}
        <div className="bg-slate-900/60 border border-white/5 rounded-lg p-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-tertiary" />
            <span className="text-body-xs text-slate-400 font-medium">ETA to Destination:</span>
          </div>
          <div className="text-right">
            <span className="font-bold text-tertiary text-body-sm">2h 14m</span>
          </div>
        </div>
      </div>
    </div>
  );
}
