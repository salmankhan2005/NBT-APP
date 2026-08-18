"use client";

import Link from "next/link";
import { motion, Variants } from "framer-motion";

const features = [
  {
    icon: "assignment_ind",
    title: "Lorry Booking Agency",
    description: "Rapid procurement of verified vehicles matching your specific load requirements across all major commercial hubs.",
    href: "/services#lorry-booking",
  },
  {
    icon: "local_shipping",
    title: "Full Truckload (FTL)",
    description: "Dedicated high-capacity transport ensuring direct, secure, and uninterrupted point-to-point delivery for bulk freight.",
    href: "/services#ftl",
  },
  {
    icon: "swap_calls",
    title: "Freight Transit Solutions",
    description: "Optimized multi-modal routing algorithms to reduce transit times and mitigate supply chain bottlenecks.",
    href: "/services#transit",
  },
  {
    icon: "gavel",
    title: "Compliance & Licensing",
    description: "Strict adherence to national transport regulations, handling all e-way bills, permits, and toll compliances seamlessly.",
    href: "/compliance",
  }
];

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
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function AnimatedFeatures() {
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-100px" }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter"
    >
      {features.map((feature, index) => (
        <motion.div
          key={index}
          variants={itemVariants}
          whileHover={{ y: -8, transition: { duration: 0.2 } }}
          className="relative bg-surface-container-lowest p-6 rounded-lg border border-surface-container shadow-sm hover:shadow-[0_20px_25px_-5px_rgba(11,29,51,0.15)] dark:hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.5)] transition-all group flex flex-col cursor-pointer overflow-hidden h-full"
        >
          <Link href={feature.href} className="relative z-10 flex flex-col h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="relative z-10 flex flex-col h-full">
              <div className="w-12 h-12 bg-secondary-fixed/50 rounded flex items-center justify-center mb-6 text-secondary group-hover:bg-secondary group-hover:text-on-secondary group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <span className="material-symbols-outlined text-[24px]">{feature.icon}</span>
              </div>

              <h3 className="text-headline-md font-headline-md text-on-surface mb-2 text-lg">
                {feature.title}
              </h3>

              <p className="text-body-sm font-body-sm text-on-surface-variant flex-grow mb-6">
                {feature.description}
              </p>

              <div className="mt-auto pt-4 border-t border-surface-container/50 text-secondary text-label-sm font-label-sm flex items-center group-hover:text-primary transition-colors">
                Explore Service
                <span className="material-symbols-outlined text-[16px] ml-1 transition-transform duration-300 group-hover:translate-x-1.5">
                  arrow_forward
                </span>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
