"use client";

import { motion, Variants } from "framer-motion";
import Image from "next/image";
import { useState } from "react";

const industries = [
  {
    id: "pharma",
    title: "Pharmaceuticals",
    description: "Temperature-controlled, secure transport for medicines and medical supplies across India.",
    image: "/industry-pharma.png",
    icon: "medication",
    color: "from-blue-900/80",
  },
  {
    id: "fmcg",
    title: "FMCG",
    description: "High-frequency, time-critical deliveries for fast-moving consumer goods to retail outlets nationwide.",
    image: "/industry-fmcg.png",
    icon: "inventory_2",
    color: "from-orange-900/80",
  },
  {
    id: "agro",
    title: "Agro & Perishables",
    description: "Cold-chain logistics ensuring fresh produce, dairy, and perishables reach markets with minimal wastage.",
    image: "/industry-agro.png",
    icon: "eco",
    color: "from-green-900/80",
  },
  {
    id: "construction",
    title: "Construction Materials",
    description: "Heavy-duty transport for cement, steel, and bulk building materials to project sites on time.",
    image: "/industry-construction.png",
    icon: "construction",
    color: "from-yellow-900/80",
  },
  {
    id: "textile",
    title: "Textile & Clothes",
    description: "Specialised handling for fabrics and garments with multi-modal transport options pan-India.",
    image: "/industry-textile.png",
    icon: "checkroom",
    color: "from-purple-900/80",
  },
  {
    id: "electrical",
    title: "Electrical Goods",
    description: "Safe, damage-free transport for appliances, wiring, and sensitive electronic equipment.",
    image: "/industry-electrical.png",
    icon: "bolt",
    color: "from-cyan-900/80",
  },
  {
    id: "metal",
    title: "Metal & Hardware",
    description: "End-to-end freight solutions for heavy metal tools, pipes, and industrial hardware.",
    image: "/industry-metal.png",
    icon: "hardware",
    color: "from-slate-900/80",
  },
  {
    id: "industrial",
    title: "Industrial Goods",
    description: "Dedicated fleet for large machinery, tools, and components meeting manufacturing timelines.",
    image: "/industry-industrial.png",
    icon: "precision_manufacturing",
    color: "from-red-900/80",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 18 },
  },
};

export default function IndustriesSection() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <section className="py-24 bg-primary-container relative overflow-hidden">
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
          className="mb-14 max-w-2xl"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 border border-secondary/30 text-secondary text-label-sm font-label-sm mb-4">
            <span className="material-symbols-outlined text-[16px]">category</span>
            Industries We Serve
          </span>
          <h2 className="text-headline-lg font-headline-lg text-on-primary mb-3 leading-tight">
            Responsibly Delivering Across<br />
            <span className="text-tertiary-fixed-dim">Diverse Industries</span>
          </h2>
          <p className="text-body-md font-body-md text-primary-fixed-dim max-w-xl">
            From cold-chain pharmaceuticals to heavy construction materials — our verified fleet and 24×7 operations power every sector.
          </p>
        </motion.div>

        {/* Industry Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {industries.map((industry) => (
            <motion.div
              key={industry.id}
              variants={cardVariants}
              onHoverStart={() => setHovered(industry.id)}
              onHoverEnd={() => setHovered(null)}
              className="relative rounded-xl overflow-hidden cursor-pointer group h-[260px] shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
            >
              {/* Background Image with zoom */}
              <div className="absolute inset-0 overflow-hidden">
                <Image
                  src={industry.image}
                  alt={industry.title}
                  fill
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              </div>

              {/* Base gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-t ${industry.color} via-black/40 to-transparent`} />

              {/* Hover reveal overlay */}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

              {/* Content */}
              <div className="absolute inset-0 p-5 flex flex-col justify-end z-10">
                {/* Icon badge */}
                <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  <span className="material-symbols-outlined text-white text-[20px]">
                    {industry.icon}
                  </span>
                </div>

                <h3 className="text-white font-bold text-lg leading-tight mb-1 drop-shadow-md">
                  {industry.title}
                </h3>

                {/* Description — slides in on hover */}
                <div
                  className="overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
                  style={{
                    maxHeight: hovered === industry.id ? "80px" : "0px",
                    opacity: hovered === industry.id ? 1 : 0,
                  }}
                >
                  <p className="text-white/80 text-sm leading-snug pt-1">
                    {industry.description}
                  </p>
                </div>

                {/* CTA */}
                <div className="flex items-center gap-1 mt-2 text-secondary-fixed text-sm font-semibold">
                  <span>Know more</span>
                  <span className="material-symbols-outlined text-[16px] transition-transform duration-300 group-hover:translate-x-1.5">
                    arrow_forward
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
