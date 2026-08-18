"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TrackingBarProps {
  initialValue?: string;
  placeholder?: string;
  size?: "sm" | "md" | "lg";
}

export default function TrackingBar({
  initialValue = "",
  placeholder = "Enter Tracking ID (e.g. NBT-84213)",
  size = "md",
}: TrackingBarProps) {
  const [trackingId, setTrackingId] = useState(initialValue);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingId.trim()) {
      router.push(`/tracking?id=${encodeURIComponent(trackingId.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="flex gap-2">
        <input 
          className="w-full px-4 py-3 border border-surface-container rounded focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 text-body-md font-body-md bg-surface-container-lowest" 
          placeholder={placeholder} 
          type="text"
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
        />
        <button 
          type="submit"
          disabled={!trackingId.trim()}
          className="bg-tertiary-fixed-dim text-on-tertiary-fixed px-6 py-3 rounded font-label-md hover:bg-tertiary-fixed transition-colors whitespace-nowrap min-h-[44px] flex items-center justify-center disabled:opacity-50"
        >
          Track Now
        </button>
      </div>
    </form>
  );
}
