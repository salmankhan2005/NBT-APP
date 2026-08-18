import { ITelemetryProvider, ShipmentTelemetry } from "@/types/telemetry";

const mockShipments: Record<string, ShipmentTelemetry> = {
  "NBT-84213": {
    id: "NBT-84213",
    status: "IN_TRANSIT",
    statusText: "In Transit",
    progress: 63,
    remainingKm: 412,
    avgSpeed: 62,
    vehicleNumber: "TN 30 AA 1234",
    vehicleType: "10-Wheeler Container Truck",
    gpsPingTime: "2 mins ago",
    eta: "Oct 24, 14:00 (Coimbatore)",
    origin: "Chennai Head Office",
    destination: "Coimbatore Hub",
    milestones: [
      {
        id: "1",
        title: "Order Confirmed",
        timestamp: "Oct 21, 09:15",
        status: "completed",
        description: "Booking processed and vehicle assigned",
      },
      {
        id: "2",
        title: "Picked Up",
        timestamp: "Oct 21, 16:30",
        status: "completed",
        description: "Cargo loaded at Guindy Industrial Estate",
      },
      {
        id: "3",
        title: "In Transit",
        timestamp: "Oct 22, 11:00",
        status: "current",
        description: "Currently moving on NH44 toward Coimbatore",
      },
      {
        id: "4",
        title: "Out for Delivery",
        timestamp: null,
        status: "pending",
        description: "Local delivery dispatcher assignment",
      },
      {
        id: "5",
        title: "Delivered",
        timestamp: null,
        status: "pending",
        description: "Safe drop and proof-of-delivery signing",
      },
    ],
  },
  "NBT-99999": {
    id: "NBT-99999",
    status: "DELIVERED",
    statusText: "Delivered",
    progress: 100,
    remainingKm: 0,
    avgSpeed: 0,
    vehicleNumber: "TN 37 B 5678",
    vehicleType: "12-Wheeler Open-Body Truck",
    gpsPingTime: "1 day ago",
    eta: "Delivered on Oct 23, 16:45",
    origin: "Chennai Head Office",
    destination: "Madurai Depot",
    milestones: [
      {
        id: "1",
        title: "Order Confirmed",
        timestamp: "Oct 22, 08:00",
        status: "completed",
        description: "Booking processed and vehicle assigned",
      },
      {
        id: "2",
        title: "Picked Up",
        timestamp: "Oct 22, 12:00",
        status: "completed",
        description: "Cargo loaded and secure",
      },
      {
        id: "3",
        title: "In Transit",
        timestamp: "Oct 22, 14:00",
        status: "completed",
        description: "Moved NH38 route",
      },
      {
        id: "4",
        title: "Out for Delivery",
        timestamp: "Oct 23, 15:00",
        status: "completed",
        description: "Assigned to Madurai Hub local route",
      },
      {
        id: "5",
        title: "Delivered",
        timestamp: "Oct 23, 16:45",
        status: "completed",
        description: "Delivered successfully. POD signed by receiver.",
      },
    ],
  },
  "NBT-11111": {
    id: "NBT-11111",
    status: "DELAYED",
    statusText: "Delayed (Heavy Traffic)",
    progress: 45,
    remainingKm: 550,
    avgSpeed: 20,
    vehicleNumber: "KA 03 MM 7890",
    vehicleType: "14-Wheeler Open-Body Truck",
    gpsPingTime: "1 min ago",
    eta: "Oct 25, 18:00 (Bangalore) — Delayed",
    origin: "Chennai Head Office",
    destination: "Bangalore Hub",
    milestones: [
      {
        id: "1",
        title: "Order Confirmed",
        timestamp: "Oct 22, 10:15",
        status: "completed",
        description: "Booking processed and vehicle assigned",
      },
      {
        id: "2",
        title: "Picked Up",
        timestamp: "Oct 22, 18:00",
        status: "completed",
        description: "Cargo loaded at Guindy Industrial Estate",
      },
      {
        id: "3",
        title: "Delayed in Transit",
        timestamp: "Oct 23, 08:30",
        status: "current",
        description: "Heavy congestion near Krishnagiri toll plaza",
      },
      {
        id: "4",
        title: "Out for Delivery",
        timestamp: null,
        status: "pending",
        description: "Local route delivery allocation",
      },
      {
        id: "5",
        title: "Delivered",
        timestamp: null,
        status: "pending",
        description: "Cargo handover",
      },
    ],
  },
};

export class MockTelemetryProvider implements ITelemetryProvider {
  async getTrackingData(trackingId: string): Promise<ShipmentTelemetry | null> {
    try {
      const res = await fetch(`/api/tracking?id=${encodeURIComponent(trackingId)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success) {
        return data.shipment;
      }
    } catch (e) {
      console.error("Error fetching live tracking data", e);
    }
    return null;
  }
}

