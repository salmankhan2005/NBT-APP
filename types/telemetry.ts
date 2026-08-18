export type ShipmentStatus =
  | "CONFIRMED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "DELAYED";

export interface Milestone {
  id: string;
  title: string;
  timestamp: string | null;
  status: "completed" | "current" | "pending";
  description?: string;
}

export interface ShipmentTelemetry {
  id: string;
  status: ShipmentStatus;
  statusText: string;
  progress: number;
  remainingKm: number;
  avgSpeed: number;
  vehicleNumber: string;
  vehicleType: string;
  gpsPingTime: string;
  eta: string;
  origin: string;
  destination: string;
  milestones: Milestone[];
}

export interface ITelemetryProvider {
  getTrackingData(trackingId: string): Promise<ShipmentTelemetry | null>;
}
