import { Shield, Map, Award, Headset } from "lucide-react";

export default function StatsBar() {
  const stats = [
    {
      label: "Fleet Vehicles Managed",
      value: "500+",
      icon: Shield,
      description: "Verified multi-axle lorries",
    },
    {
      label: "States & UTs Served",
      value: "28",
      icon: Map,
      description: "Comprehensive Pan-India routing",
    },
    {
      label: "On-Time Delivery Rate",
      value: "99.2%",
      icon: Award,
      description: "Direct point-to-point speed",
    },
    {
      label: "Live Dispatch Support",
      value: "24/7",
      icon: Headset,
      description: "Constant operational backup",
    },
  ];

  return (
    <div className="bg-primary text-white py-10 border-y border-primary/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-4 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`flex flex-col items-center text-center space-y-1 ${
                i > 1 ? "pt-8 md:pt-0" : ""
              } ${i === 1 ? "pt-0" : ""} md:px-4`}
            >
              <div className="p-2 bg-slate-900 rounded-full mb-1">
                <stat.icon className="h-6 w-6 text-tertiary" />
              </div>
              <span className="text-headline-xl font-bold text-white tracking-tight leading-none">
                {stat.value}
              </span>
              <span className="text-label-md font-semibold text-slate-200">
                {stat.label}
              </span>
              <span className="text-body-xs text-slate-400">
                {stat.description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
