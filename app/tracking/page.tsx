"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import TrackingBar from "@/components/TrackingBar";
import { MockTelemetryProvider } from "@/services/MockTelemetryProvider";
import { ShipmentTelemetry, Milestone } from "@/types/telemetry";

function TrackingResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const trackingId = searchParams.get("id") || "";

  const [isLoading, setIsLoading] = useState(false);
  const [shipment, setShipment] = useState<ShipmentTelemetry | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (trackingId) {
      fetchTrackingData(trackingId);
    } else {
      setShipment(null);
      setSearched(false);
    }
  }, [trackingId]);

  const fetchTrackingData = async (id: string) => {
    setIsLoading(true);
    setError(null);
    setSearched(true);
    try {
      const provider = new MockTelemetryProvider();
      const data = await provider.getTrackingData(id);
      setShipment(data);
    } catch (err) {
      setError("Failed to fetch tracking details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getMilestoneIcon = (status: Milestone["status"]) => {
    if (status === "completed") {
      return (
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-on-secondary shadow-sm">
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
        </div>
      );
    } else if (status === "current") {
      return (
        <div className="relative">
          <div className="absolute inset-0 bg-tertiary-fixed-dim/30 rounded-full blur-md animate-pulse"></div>
          <div className="w-10 h-10 rounded-full bg-tertiary-fixed-dim flex items-center justify-center text-on-tertiary shadow-[0px_4px_12px_rgba(255,185,85,0.4)] z-10 border-2 border-surface-container-lowest relative">
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
          </div>
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline">
        <span className="material-symbols-outlined text-[18px]">radio_button_unchecked</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-grow w-full pt-20">
      {/* Tracking Sub-Header */}
      {searched && (
        <div className="bg-surface-container-lowest border-b border-surface-variant w-full">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-outline">local_shipping</span>
              <span className="text-label-md font-label-md text-on-surface-variant">Tracking ID:</span>
              <span className="text-body-md font-body-md font-semibold">{trackingId}</span>
            </div>
            <button 
              onClick={() => router.push("/tracking")}
              className="text-secondary text-label-sm font-label-sm hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">search</span>
              Track another shipment
            </button>
          </div>
        </div>
      )}

      {/* Main Content Canvas */}
      {!searched && (
        <div className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12">
          <div className="bg-surface-container-lowest p-8 md:p-12 rounded-xl border border-surface-variant shadow-[0px_4px_12px_rgba(11,29,51,0.05)] text-center space-y-6 max-w-2xl mx-auto">
            <span className="material-symbols-outlined text-[64px] text-surface-variant">search</span>
            <h1 className="text-headline-lg font-headline-lg text-primary">Live Shipment Tracking</h1>
            <p className="text-body-md font-body-md text-on-surface-variant">
              Enter your New Balaji Transports tracking ID or consignment note number to monitor your freight in transit.
            </p>
            <TrackingBar initialValue={trackingId} placeholder="e.g. NBT-84213" size="lg" />
          </div>
        </div>
      )}

      {searched && isLoading && (
        <div className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 flex justify-center items-center">
          <div className="flex flex-col items-center gap-4 text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] animate-spin text-secondary">autorenew</span>
            <p className="text-body-md font-body-md">Fetching real-time GPS coordinates...</p>
          </div>
        </div>
      )}

      {searched && !isLoading && !shipment && (
        <div className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12">
          <div className="bg-error-container/20 p-8 md:p-12 rounded-xl border border-error/20 text-center space-y-6 max-w-2xl mx-auto">
            <span className="material-symbols-outlined text-[64px] text-error">warning</span>
            <h1 className="text-headline-md font-headline-md text-on-surface">Consignment Not Found</h1>
            <p className="text-body-md font-body-md text-on-surface-variant">
              We could not find a shipment matching <strong>"{trackingId}"</strong>.
            </p>
            <div className="bg-surface-container-lowest p-6 rounded-lg text-left border border-surface-variant space-y-3">
              <h4 className="text-label-md font-label-md text-on-surface">Suggested Steps:</h4>
              <ul className="list-disc pl-5 space-y-2 text-body-sm text-on-surface-variant">
                <li>Verify the format matches <span className="font-mono bg-surface-container px-1 rounded">NBT-XXXXX</span></li>
                <li>Check if the consignment note was issued in the last 2 hours (system sync delay)</li>
                <li>Confirm details with your corporate dispatch manager</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {searched && !isLoading && shipment && (
        <main className="flex-grow relative w-full h-[calc(100vh-140px)] min-h-[600px] overflow-hidden">
          {/* Live Map Background (Placeholder) */}
          <div className="absolute inset-0 w-full h-full bg-surface-container-low flex flex-col justify-center items-center">
            <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCeiyrKY_Rl5oN6QaRSK4y-5yKwYO4G5WKPUsmlSWZ9GQBTMt7grRDDUW4Z8EUa86k9qcbqPGHXQBU4JxsWBDcjD52ZoIfU6O2m4g14OCbULzShsekyznkpqAWIz9Yv_ozX71Qob-9DVvrgCWaKWebTnmjEHjopnH6IFj87kdzFctD30JK_8bttnju9GwfxZjspaiqv1RLkU85e55sVk8gRJPthAt-CXVEl6cJdb3aQxztrF4fl2VoN')" }}></div>
          </div>

          {/* Floating UI Overlay Container */}
          <div className="absolute inset-0 w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pointer-events-none flex flex-col justify-between py-stack-lg z-10">
            {/* Top Right: Status Card (Bento Style) */}
            <div className="self-end pointer-events-auto max-w-sm w-full bg-surface-container-lowest rounded-xl border border-surface-variant shadow-[0px_12px_32px_rgba(11,29,51,0.12)] p-6 flex flex-col gap-stack-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-headline-md font-headline-md text-on-surface">{shipment.statusText}</h2>
                  <p className="text-label-sm font-label-sm text-on-surface-variant mt-1">Expected Delivery: {shipment.eta}</p>
                </div>
                <div className={`px-3 py-1 rounded-full border ${
                  shipment.status === "DELIVERED"
                    ? "bg-[#E6F4EA] border-[#137333]/20"
                    : shipment.status === "DELAYED"
                    ? "bg-error-container border-error/20"
                    : "bg-tertiary-fixed-dim/10 border-tertiary-fixed-dim/20"
                }`}>
                  <span className={`text-label-sm font-label-sm font-semibold uppercase tracking-wider flex items-center gap-1 ${
                    shipment.status === "DELIVERED" ? "text-[#137333]" : shipment.status === "DELAYED" ? "text-error" : "text-tertiary-fixed-dim"
                  }`}>
                    {shipment.status === "IN_TRANSIT" && <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim animate-pulse"></span>}
                    {shipment.status}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full mt-4">
                <div className="flex justify-between text-label-sm font-label-sm text-on-surface-variant mb-1">
                  <span>Progress</span>
                  <span className="text-on-surface font-semibold">{shipment.progress}%</span>
                </div>
                <div className="h-2 bg-surface-container rounded-full overflow-hidden w-full">
                  <div className="h-full bg-secondary rounded-full transition-all duration-1000" style={{ width: `${shipment.progress}%` }}></div>
                </div>
              </div>

              {/* Logistics Data Grid */}
              <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-surface-variant">
                <div className="flex flex-col">
                  <span className="text-label-sm font-label-sm text-outline mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">route</span> Remaining</span>
                  <span className="text-body-md font-body-md font-semibold">{shipment.remainingKm > 0 ? `${shipment.remainingKm} km` : "N/A"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-label-sm font-label-sm text-outline mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">speed</span> Avg Speed</span>
                  <span className="text-body-md font-body-md font-semibold">{shipment.avgSpeed > 0 ? `${shipment.avgSpeed} km/h` : "N/A"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-label-sm font-label-sm text-outline mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">local_shipping</span> Vehicle</span>
                  <span className="text-body-md font-body-md font-semibold">{shipment.vehicleType}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-label-sm font-label-sm text-outline mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">satellite_alt</span> GPS Ping</span>
                  <span className="text-body-md font-body-md font-semibold">{shipment.gpsPingTime}</span>
                </div>
              </div>
            </div>

            {/* Bottom: Shipment Timeline (Glassmorphism/Card) */}
            <div className="w-full pointer-events-auto mt-auto bg-surface-container-lowest/90 backdrop-blur-md rounded-xl border border-surface-variant shadow-[0px_4px_12px_rgba(11,29,51,0.05)] p-6 overflow-x-auto">
              <div className="flex items-center justify-between gap-4 relative min-w-max px-4">
                {/* Progress Line Background */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-surface-container -z-10 -translate-y-1/2"></div>
                {/* Progress Line Active */}
                <div className="absolute top-1/2 left-0 h-1 bg-secondary -z-10 -translate-y-1/2 transition-all duration-1000" style={{ width: `${Math.max(0, shipment.progress - 10)}%` }}></div>
                
                {shipment.milestones.map((milestone, idx) => (
                  <div key={milestone.id} className={`flex flex-col items-center gap-2 z-10 w-24 ${milestone.status === 'pending' ? 'opacity-50' : ''}`}>
                    {getMilestoneIcon(milestone.status)}
                    <div className="text-center mt-[-4px]">
                      <p className={`text-label-sm font-label-sm font-semibold ${milestone.status === 'current' ? 'text-tertiary-container' : 'text-on-surface'}`}>{milestone.title}</p>
                      <p className="text-[10px] text-outline mt-0.5">{milestone.timestamp || 'Pending'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col flex-grow w-full items-center justify-center min-h-[60vh]">
        <span className="material-symbols-outlined text-[48px] animate-spin text-secondary">autorenew</span>
      </div>
    }>
      <TrackingResultsContent />
    </Suspense>
  );
}
