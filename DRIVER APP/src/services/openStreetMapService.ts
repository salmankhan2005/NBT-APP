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

const KNOWN_PLACE_COORDS: Record<string, { lat: number; lng: number }> = {
  salem: { lat: 11.6643, lng: 78.146 },
  bhavani: { lat: 11.4406, lng: 77.6824 },
  erode: { lat: 11.3410, lng: 77.7172 },
  coimbatore: { lat: 11.0168, lng: 76.9558 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  whitefield: { lat: 12.9698, lng: 77.7499 },
  'lumen technologies': { lat: 12.9698, lng: 77.7499 },
  'lumen': { lat: 12.9698, lng: 77.7499 },
};

function resolveKnownPlaceCoordinates(query: string): { lat: number; lng: number } | null {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return null;

  const directKeys = [
    normalized,
    normalized.replace(/[,/|\-]+/g, ' '),
    normalized.replace(/\s+(technologies|technology)/g, ''),
  ];

  for (const candidate of directKeys) {
    const match = Object.keys(KNOWN_PLACE_COORDS).find((key) => candidate === key || candidate.includes(key));
    if (match) return KNOWN_PLACE_COORDS[match];
  }

  return null;
}

/**
 * Validates that coordinates fall within India's geographic bounding box.
 * Prevents coordinates from foreign countries (e.g. Salem, Oregon, USA)
 * being sent to OSRM alongside Indian coordinates, which causes 400 errors.
 * India bounding box: lat 6.5-37.1, lng 68.1-97.4
 */
function isInIndia(lat: number, lng: number): boolean {
  return lat >= 6.5 && lat <= 37.1 && lng >= 68.1 && lng <= 97.4;
}

const PROXY_BASE = 'https://nbt-app.onrender.com/api/maps';

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
    let originCoords = await geocodePlace(origin);
    let destCoords = await geocodePlace(destination);

    if (!originCoords) originCoords = resolveKnownPlaceCoordinates(origin);
    if (!destCoords) destCoords = resolveKnownPlaceCoordinates(destination);

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

  const fallbackOrigin = resolveKnownPlaceCoordinates(origin) || { lat: 11.6643, lng: 78.146 };
  const fallbackDestination = resolveKnownPlaceCoordinates(destination) || { lat: 12.9716, lng: 77.5946 };
  const R = 6371;
  const dLat = ((fallbackDestination.lat - fallbackOrigin.lat) * Math.PI) / 180;
  const dLon = ((fallbackDestination.lng - fallbackOrigin.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((fallbackOrigin.lat * Math.PI) / 180) *
      Math.cos((fallbackDestination.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const approximateKm = Math.max(Math.round(R * c), 5);
  const durationMins = Math.max(Math.round((approximateKm / 45) * 60), 30);
  const hours = Math.floor(durationMins / 60);
  const mins = durationMins % 60;

  return {
    distanceKm: approximateKm,
    distanceText: `${approximateKm} km`,
    durationText: hours > 0 ? `${hours} hr ${mins} mins` : `${durationMins} mins`,
    durationMinutes: durationMins,
    startAddress: origin,
    endAddress: destination,
  };
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
function chooseBestGeocodeResult(results: any[]): any | null {
  if (!Array.isArray(results) || results.length === 0) return null;

  const prioritized = results.filter((result) => {
    const className = String(result?.class || '').toLowerCase();
    const typeName = String(result?.type || '').toLowerCase();
    const name = String(result?.name || result?.display_name || '').toLowerCase();
    const isWaterway = className === 'waterway' || typeName === 'river' || /river/.test(name);
    return !isWaterway;
  });

  const ranked = (prioritized.length ? prioritized : results)
    .slice()
    .sort((a, b) => {
      const importanceA = Number(a?.importance ?? 0);
      const importanceB = Number(b?.importance ?? 0);
      if (importanceB !== importanceA) return importanceB - importanceA;
      return Number(b?.place_rank ?? 0) - Number(a?.place_rank ?? 0);
    });

  return ranked[0] || null;
}

function generateGeocodeCandidates(query: string): string[] {
  const cleaned = query.trim().replace(/\s+/g, ' ');
  if (!cleaned) return [];

  const unique = new Set<string>();
  const add = (value?: string) => {
    const v = (value || '').trim();
    if (!v) return;
    const compact = v.replace(/\s+/g, ' ');
    if (compact.length > 0) unique.add(compact);
  };

  add(cleaned);
  add(cleaned.replace(/[,/|\-]+/g, ' '));

  const segments = cleaned.split(/[;,/|\-]+/).map((s) => s.trim()).filter(Boolean);
  for (const segment of segments) add(segment);
  if (segments.length > 1) {
    add(segments[segments.length - 1]);
    add(`${segments[0]} ${segments[segments.length - 1]}`);
  }

  const lastToken = cleaned.split(/\s+/).filter(Boolean).at(-1);
  if (lastToken) add(lastToken);
  if (segments.length > 0) {
    const lastSegment = segments[segments.length - 1];
    if (lastSegment && lastSegment.toLowerCase() !== cleaned.toLowerCase()) add(lastSegment);
  }

  return Array.from(unique).filter((value) => value.length > 1);
}

async function geocodePlace(query: string): Promise<{ lat: number; lng: number } | null> {
  // Check if already coordinates
  const coordMatch = query.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    return { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) };
  }

  const candidates = generateGeocodeCandidates(query);
  for (const candidate of candidates) {
    try {
      const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(candidate)}&format=json&limit=8&addressdetails=1&accept-language=en&countrycodes=in`;
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      });
      const data = await res.json();
      const best = chooseBestGeocodeResult(Array.isArray(data) ? data : []);
      if (best) {
        const lat = parseFloat(best.lat);
        const lng = parseFloat(best.lon);
        // Reject any result that falls outside India's bounding box
        if (isInIndia(lat, lng)) {
          return { lat, lng };
        }
        console.warn(`[DriverMaps] Geocode result for "${candidate}" is outside India (${lat}, ${lng}), skipping.`);
      }
    } catch {
      // Try next candidate
    }
  }

  const fallback = resolveKnownPlaceCoordinates(query);
  if (fallback) return fallback;

  return null;
}
