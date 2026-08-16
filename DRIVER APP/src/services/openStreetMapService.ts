/**
 * openStreetMapService.ts - Driver App
 * OpenStreetMap (Nominatim + OSRM) API integration layer
 * Replaces Google Maps Platform APIs with free, open-source alternatives.
 *
 * APIs used:
 *   • Nominatim Reverse Geocoding – coordinates to address/city
 *   • OSRM (Open Source Routing Machine) – route distance & duration
 *   • OpenStreetMap Static Map – map tile preview with pin
 */

import { Platform } from 'react-native';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OSRM_BASE = 'https://router.project-osrm.org';
const USER_AGENT = 'NBT-ARS-FleetTransit-DriverApp/1.0';

const getApiHost = (): string => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3001';
  }
  return 'http://localhost:3001';
};
const PROXY_BASE = `${getApiHost()}/api/maps`;

export interface RouteInfo {
  distanceKm: number;
  distanceText: string;
  durationText: string;
  durationMinutes: number;
  startAddress: string;
  endAddress: string;
  polylinePoints?: string;
}

export interface LocationDetails {
  formattedAddress: string;
  city: string;
  latitude: number;
  longitude: number;
}

/**
 * Reverse geocodes coordinates to a human-readable city & address using Nominatim
 */
export async function reverseGeocodeLocation(lat: number, lng: number): Promise<LocationDetails | null> {
  // 1. Try backend proxy (which now uses Nominatim internally)
  try {
    const proxyUrl = `${PROXY_BASE}/geocode?latlng=${lat},${lng}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.results?.length) {
        const first = data.results[0];
        let city = 'In Transit';
        for (const comp of first.address_components || []) {
          if (comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')) {
            city = comp.long_name;
            break;
          }
        }
        return {
          formattedAddress: first.formatted_address || '',
          city,
          latitude: lat,
          longitude: lng,
        };
      }
    }
  } catch (proxyErr) {
    console.warn('[DriverMaps] Proxy geocode failed:', proxyErr);
  }

  // 2. Direct Nominatim fallback
  try {
    const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    const data = await res.json();

    if (data && !data.error) {
      const address = data.address || {};
      const city = address.city || address.town || address.village || address.state_district || 'In Transit';

      return {
        formattedAddress: data.display_name || '',
        city,
        latitude: lat,
        longitude: lng,
      };
    }
  } catch (err) {
    console.warn('[DriverMaps] Nominatim reverse geocode failed:', err);
  }
  return null;
}

/**
 * Calculates live route distance & duration between starting point & destination
 * Uses OSRM (Open Source Routing Machine)
 */
export async function getLiveRouteDetails(origin: string, destination: string): Promise<RouteInfo | null> {
  // 1. Try backend proxy (which now uses OSRM internally)
  try {
    const proxyUrl = `${PROXY_BASE}/directions?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.routes?.length) {
        const leg = data.routes[0].legs[0];
        const distMeters = leg.distance?.value || 0;
        const durationSecs = leg.duration?.value || 0;

        return {
          distanceKm: Math.round(distMeters / 1000),
          distanceText: leg.distance?.text || `${Math.round(distMeters / 1000)} km`,
          durationText: leg.duration?.text || `${Math.round(durationSecs / 60)} mins`,
          durationMinutes: Math.round(durationSecs / 60),
          startAddress: leg.start_address || origin,
          endAddress: leg.end_address || destination,
          polylinePoints: data.routes[0].overview_polyline?.points,
        };
      }
    }
  } catch (proxyErr) {
    console.warn('[DriverMaps] Proxy directions failed:', proxyErr);
  }

  // 2. Direct OSRM fallback — first geocode origin/destination to coordinates
  try {
    const originCoords = await geocodePlace(origin);
    const destCoords = await geocodePlace(destination);

    if (!originCoords || !destCoords) return null;

    // OSRM expects lng,lat
    const url = `${OSRM_BASE}/route/v1/driving/${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=polyline`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    const data = await res.json();

    if (data.code === 'Ok' && data.routes?.length > 0) {
      const route = data.routes[0];
      const distMeters = Math.round(route.distance);
      const durationSecs = Math.round(route.duration);
      const distanceKm = Math.round(distMeters / 1000);
      const durationMins = Math.round(durationSecs / 60);

      let durationText: string;
      if (durationMins >= 60) {
        const hrs = Math.floor(durationMins / 60);
        const mins = durationMins % 60;
        durationText = mins > 0 ? `${hrs} hr ${mins} mins` : `${hrs} hr`;
      } else {
        durationText = `${durationMins} mins`;
      }

      return {
        distanceKm,
        distanceText: `${distanceKm} km`,
        durationText,
        durationMinutes: durationMins,
        startAddress: origin,
        endAddress: destination,
        polylinePoints: route.geometry,
      };
    }
  } catch (err) {
    console.warn('[DriverMaps] OSRM directions failed:', err);
  }
  return null;
}

/**
 * Generates a static map image URL centered at (lat, lng) using OpenStreetMap
 */
export function getStaticMapPreviewUrl(
  lat: number,
  lng: number,
  zoom: number = 14,
  width: number = 600,
  height: number = 340
): string {
  return `${PROXY_BASE}/staticmap?lat=${lat}&lng=${lng}&zoom=${zoom}&width=${width}&height=${height}&color=red`;
}

/**
 * Helper: geocode a place name to coordinates via Nominatim
 */
async function geocodePlace(query: string): Promise<{ lat: number; lng: number } | null> {
  // Check if already coordinates
  const coordMatch = query.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    return { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) };
  }

  try {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=en`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // Failed to geocode
  }
  return null;
}
