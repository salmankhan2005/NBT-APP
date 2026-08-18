import Link from "next/link";
import { BookOpen, Truck, Route, ClipboardCheck, ArrowRight } from "lucide-react";

export default function ServicesPreview() {
  const services = [
    {
      title: "Lorry Booking Agency",
      description: "Rapid procurement of verified vehicles matching your specific load requirements across all major commercial hubs.",
      icon: BookOpen,
      href: "/services#lorry-booking",
    },
    {
      title: "Full Truckload (FTL)",
      description: "Dedicated high-capacity transport ensuring direct, secure, and uninterrupted point-to-point delivery for bulk freight.",
      icon: Truck,
      href: "/services#ftl",
    },
    {
      title: "Freight Transit Solutions",
      description: "Optimized multi-modal routing algorithms to reduce transit times and mitigate supply chain bottlenecks.",
      icon: Route,
      href: "/services#transit",
    },
    {
      title: "Compliance & Licensing",
      description: "Strict adherence to national transport regulations, handling all e-way bills, permits, and toll compliances seamlessly.",
      icon: ClipboardCheck,
      href: "/compliance",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {services.map((service) => (
        <div
          key={service.title}
          className="bg-white p-6 rounded-card border border-border shadow-level1 hover:shadow-level2 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
              <service.icon className="h-6 w-6" />
            </div>
            <h3 className="text-headline-sm font-bold text-primary">{service.title}</h3>
            <p className="text-body-sm text-slate-600 leading-relaxed">{service.description}</p>
          </div>
          <div className="pt-6">
            <Link
              href={service.href}
              className="inline-flex items-center gap-1 text-label-sm font-bold text-secondary hover:text-secondary/80 transition-colors"
            >
              Explore Service
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
