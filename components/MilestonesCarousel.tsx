"use client";

import { motion } from "framer-motion";

const milestones = [
  {
    icon: "local_shipping",
    title: "500+ Fleet Vehicles",
    subtitle: "Fully GPS-tracked, operational nationwide",
    tag: "Fleet",
    tagColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  {
    icon: "location_on",
    title: "New Hub: Coimbatore",
    subtitle: "Expanded southern corridor operations",
    tag: "Expansion",
    tagColor: "bg-green-500/20 text-green-300 border-green-500/30",
  },
  {
    icon: "workspace_premium",
    title: "99.4% On-Time Delivery",
    subtitle: "Industry-leading performance benchmark",
    tag: "Achievement",
    tagColor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  },
  {
    icon: "map",
    title: "28 States & UTs Covered",
    subtitle: "Pan-India network fully operational",
    tag: "Network",
    tagColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
  {
    icon: "store",
    title: "New Hub: Hyderabad",
    subtitle: "Expanded Deccan logistics corridor",
    tag: "Expansion",
    tagColor: "bg-green-500/20 text-green-300 border-green-500/30",
  },
  {
    icon: "verified",
    title: "ISO 9001:2015 Certified",
    subtitle: "Quality management systems verified",
    tag: "Certification",
    tagColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  },
  {
    icon: "eco",
    title: "Cold-Chain Operations",
    subtitle: "Agro & pharma perishables fully activated",
    tag: "Service",
    tagColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  {
    icon: "support_agent",
    title: "24×7 Dispatch Center",
    subtitle: "Round-the-clock operations support live",
    tag: "Operations",
    tagColor: "bg-red-500/20 text-red-300 border-red-500/30",
  },
  {
    icon: "trending_up",
    title: "New Hub: Pune",
    subtitle: "Maharashtra freight hub now operational",
    tag: "Expansion",
    tagColor: "bg-green-500/20 text-green-300 border-green-500/30",
  },
  {
    icon: "route",
    title: "Express FTL Launched",
    subtitle: "Direct point-to-point full truckload service",
    tag: "New Service",
    tagColor: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  },
];

// Double the array for seamless infinite loop
const doubledMilestones = [...milestones, ...milestones];

function MilestoneCard({
  item,
}: {
  item: (typeof milestones)[0];
}) {
  return (
    <div className="flex-shrink-0 w-[300px] bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 mx-3 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group cursor-pointer">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-lg bg-secondary/20 border border-secondary/30 flex items-center justify-center flex-shrink-0 group-hover:bg-secondary/30 transition-colors duration-300">
          <span className="material-symbols-outlined text-secondary text-[22px]">
            {item.icon}
          </span>
        </div>
        <div className="min-w-0">
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border mb-2 ${item.tagColor}`}
          >
            {item.tag}
          </span>
          <h4 className="text-white font-bold text-[15px] leading-tight truncate">
            {item.title}
          </h4>
          <p className="text-white/50 text-xs mt-0.5 leading-snug">
            {item.subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MilestonesCarousel() {
  return (
    <section className="py-20 bg-[#050f1a] border-y border-white/5 overflow-hidden">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-label-sm font-label-sm mb-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
              </span>
              Live Milestones
            </span>
            <h2 className="text-headline-lg font-headline-lg text-white">
              In The News & <span className="text-tertiary-fixed-dim">Hub Expansions</span>
            </h2>
          </div>
          <p className="text-body-md text-white/40 max-w-xs text-right hidden md:block">
            Latest updates from our operations network
          </p>
        </motion.div>
      </div>

      {/* Marquee Container — Two rows scrolling in opposite directions */}
      <div className="space-y-4">
        {/* Row 1 — Left to Right */}
        <div className="relative">
          {/* Edge fade masks */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#050f1a] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#050f1a] to-transparent z-10 pointer-events-none" />
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: "linear",
            }}
            className="flex"
          >
            {doubledMilestones.slice(0, 14).map((item, i) => (
              <MilestoneCard key={i} item={item} />
            ))}
          </motion.div>
        </div>

        {/* Row 2 — Right to Left */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#050f1a] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#050f1a] to-transparent z-10 pointer-events-none" />
          <motion.div
            animate={{ x: ["-50%", "0%"] }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear",
            }}
            className="flex"
          >
            {doubledMilestones.slice(6).map((item, i) => (
              <MilestoneCard key={i} item={item} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
