/**
 * openStreetMapService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * OpenStreetMap (Nominatim + OSRM) Service Layer
 * NBT + ARS Fleet Transit — Admin App
 *
 * Replaces Google Maps Platform APIs with free, open-source alternatives:
 *   • Nominatim Search          – as-you-type place suggestions (replaces Places Autocomplete)
 *   • Nominatim Lookup          – full place info by OSM ID (replaces Place Details)
 *   • Nominatim Reverse         – reverse geocoding from coordinates
 *   • OSRM                      – real route distance + duration + route summary
 *   • OpenStreetMap Static Maps – small map tile preview with pin
 *
 * NO API KEY REQUIRED — all endpoints are free and open.
 *
 * Nominatim Usage Policy:
 *   - Max 1 request/second
 *   - Must set a valid User-Agent header
 *   - See: https://operations.osmfoundation.org/policies/nominatim/
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── DATA TYPES ───────────────────────────────────────────────────────────────

export interface PlaceAutocompleteResult {
  placeId: string;
  mainText: string;       // Primary part of the description (e.g. "Lumen Technologies")
  secondaryText: string;  // Secondary part (e.g. "Whitefield, Bengaluru, Karnataka, India")
  fullDescription: string;
}

export interface PlaceDetails {
  placeName: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId: string;
  mapsUrl: string;
  plusCode?: string;
  viewport?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
}

export interface DirectionsResult {
  distanceKm: number;
  distanceText: string;
  durationText: string;
  routeSummary: string;
  startAddress: string;
  endAddress: string;
}

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
const isWeb = Platform.OS === 'web';

// ─── API ENDPOINTS ────────────────────────────────────────────────────────────

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OSRM_BASE = 'https://router.project-osrm.org';
const USER_AGENT = 'NBT-ARS-FleetTransit-AdminApp/1.0';

const getApiHost = (): string => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3001';
  }
  return 'http://localhost:3001';
};
const PROXY_BASE = `${getApiHost()}/api/maps`;

// OpenStreetMap services are always available — no API key needed
export const isApiKeyConfigured = () => true;

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const token = await SecureStore.getItemAsync('admin_session_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

function getFallbackAutocomplete(query: string): PlaceAutocompleteResult[] {
  const q = query.toLowerCase().trim();
  const mockPlaces: PlaceAutocompleteResult[] = [
    {
      placeId: 'mock-blr-majestic',
      mainText: 'KSR Bengaluru City Junction (Majestic)',
      secondaryText: 'Kempegowda Bus Station, Sevashrama, Bengaluru, Karnataka',
      fullDescription: 'KSR Bengaluru City Junction (Majestic), Bengaluru, Karnataka, India',
    },
    {
      placeId: 'mock-blr-airport',
      mainText: 'Kempegowda International Airport (BLR)',
      secondaryText: 'Devanahalli, Bengaluru, Karnataka 560300',
      fullDescription: 'Kempegowda International Airport (BLR), Devanahalli, Bengaluru, Karnataka, India',
    },
    {
      placeId: 'mock-blr-whitefield',
      mainText: 'Whitefield IT Park',
      secondaryText: 'EPIP Zone, Whitefield, Bengaluru, Karnataka',
      fullDescription: 'Whitefield IT Park, EPIP Zone, Whitefield, Bengaluru, Karnataka, India',
    },
    {
      placeId: 'mock-blr-ecity',
      mainText: 'Electronic City Phase 1',
      secondaryText: 'Hosur Road, Bengaluru, Karnataka 560100',
      fullDescription: 'Electronic City Phase 1, Hosur Road, Bengaluru, Karnataka, India',
    },
    {
      placeId: 'mock-blr-yeshwanthpur',
      mainText: 'Yeshwantpur Railway Station',
      secondaryText: 'Industrial Suburb, Yeswanthpur, Bengaluru, Karnataka',
      fullDescription: 'Yeshwantpur Railway Station, Bengaluru, Karnataka, India',
    },
    {
      placeId: 'mock-delhi-cp',
      mainText: 'Connaught Place',
      secondaryText: 'New Delhi, Delhi 110001',
      fullDescription: 'Connaught Place, New Delhi, Delhi, India',
    },
    {
      placeId: 'mock-mumbai-bkc',
      mainText: 'Bandra Kurla Complex (BKC)',
      secondaryText: 'Bandra East, Mumbai, Maharashtra 400051',
      fullDescription: 'Bandra Kurla Complex (BKC), Mumbai, Maharashtra, India',
    },
    {
      placeId: 'mock-chennai-central',
      mainText: 'Chennai Central Railway Station',
      secondaryText: 'Kannappar Thidal, Periyamet, Chennai, Tamil Nadu',
      fullDescription: 'Chennai Central Railway Station, Chennai, Tamil Nadu, India',
    },
  ];

  return mockPlaces.filter(
    (p) =>
      p.mainText.toLowerCase().includes(q) ||
      p.secondaryText.toLowerCase().includes(q) ||
      p.fullDescription.toLowerCase().includes(q)
  );
}

function getMockPlaceDetails(placeId: string): PlaceDetails | null {
  const mocks: Record<string, PlaceDetails> = {
    'mock-blr-majestic': {
      placeName: 'KSR Bengaluru City Junction (Majestic)',
      formattedAddress: 'Kempegowda Bus Station, Sevashrama, Bengaluru, Karnataka 560023',
      latitude: 12.9784,
      longitude: 77.5684,
      placeId: 'mock-blr-majestic',
      mapsUrl: 'https://www.google.com/maps/?q=12.9784,77.5684',
    },
    'mock-blr-airport': {
      placeName: 'Kempegowda International Airport (BLR)',
      formattedAddress: 'KIAL Rd, Devanahalli, Bengaluru, Karnataka 560300',
      latitude: 13.1986,
      longitude: 77.7066,
      placeId: 'mock-blr-airport',
      mapsUrl: 'https://www.google.com/maps/?q=13.1986,77.7066',
    },
    'mock-blr-whitefield': {
      placeName: 'Whitefield IT Park',
      formattedAddress: 'EPIP Zone, Whitefield, Bengaluru, Karnataka 560066',
      latitude: 12.9698,
      longitude: 77.7499,
      placeId: 'mock-blr-whitefield',
      mapsUrl: 'https://www.google.com/maps/?q=12.9698,77.7499',
    },
    'mock-blr-ecity': {
      placeName: 'Electronic City Phase 1',
      formattedAddress: 'Hosur Road, Electronic City, Bengaluru, Karnataka 560100',
      latitude: 12.8452,
      longitude: 77.6602,
      placeId: 'mock-blr-ecity',
      mapsUrl: 'https://www.google.com/maps/?q=12.8452,77.6602',
    },
  };

  return mocks[placeId] || null;
}

// ─── PLACES AUTOCOMPLETE (Nominatim Search) ──────────────────────────────────
/**
 * Fetches place suggestions using Nominatim search API.
 * Uses local backend proxy first to avoid browser CORS issues.
 */
export async function searchPlacesAutocomplete(
  query: string,
  sessionToken: string
): Promise<PlaceAutocompleteResult[]> {
  if (!query.trim()) return [];

  // 1. Try Backend Proxy (uses Nominatim internally, bypasses CORS)
  try {
    const headers = await getAuthHeaders();
    const proxyUrl = `${PROXY_BASE}/places/autocomplete?input=${encodeURIComponent(query)}&sessiontoken=${encodeURIComponent(sessionToken)}`;
    const res = await fetch(proxyUrl, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.predictions) {
        return (data.predictions || []).map((p: any): PlaceAutocompleteResult => ({
          placeId: p.place_id,
          mainText: p.structured_formatting?.main_text || p.description,
          secondaryText: p.structured_formatting?.secondary_text || '',
          fullDescription: p.description,
        }));
      }
    }
  } catch (proxyErr) {
    console.warn('[OSMMaps] Proxy fetch failed:', proxyErr);
  }

  // 2. Direct Nominatim fallback (Disabled on Web to avoid CORS)
  if (isWeb) {
    console.warn('[OSMMaps] Direct fetch to Nominatim skipped on Web (CORS). Returning fallback.');
    return getFallbackAutocomplete(query);
  }

  try {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=8&countrycodes=in&accept-language=en`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      return getFallbackAutocomplete(query);
    }

    return data.map((item: any): PlaceAutocompleteResult => ({
      placeId: `osm_${item.osm_type}_${item.osm_id}`,
      mainText: item.name || item.display_name?.split(',')[0] || '',
      secondaryText: item.display_name?.split(',').slice(1).join(',').trim() || '',
      fullDescription: item.display_name || '',
    }));
  } catch (err) {
    console.warn('[OSMMaps] Nominatim search failed:', err);
    return getFallbackAutocomplete(query);
  }
}

// ─── PLACE DETAILS (Nominatim Lookup) ─────────────────────────────────────────
/**
 * Fetches full details for a place ID using Nominatim.
 * Supports our custom osm_<type>_<id> format and mock place IDs.
 */
export async function getPlaceDetails(
  placeId: string,
  sessionToken: string
): Promise<PlaceDetails | null> {
  const mockMatch = getMockPlaceDetails(placeId);
  if (mockMatch) return mockMatch;

  // 1. Try Backend Proxy
  try {
    const headers = await getAuthHeaders();
    const proxyUrl = `${PROXY_BASE}/places/details?place_id=${encodeURIComponent(placeId)}`;
    const res = await fetch(proxyUrl, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.result) {
        const result = data.result;
        const loc = result.geometry?.location;
        return {
          placeName: result.name || result.formatted_address,
          formattedAddress: result.formatted_address || '',
          latitude: loc?.lat ?? 0,
          longitude: loc?.lng ?? 0,
          placeId: result.place_id || placeId,
          mapsUrl: result.url || `https://www.google.com/maps/search/?api=1&query=${loc?.lat},${loc?.lng}`,
          viewport: result.geometry?.viewport,
        };
      }
    }
  } catch (proxyErr) {
    console.warn('[OSMMaps] Proxy details failed:', proxyErr);
  }

  // 2. Direct Nominatim fallback (Disabled on Web)
  if (isWeb) {
    console.warn('[OSMMaps] Direct Nominatim skipped on Web (CORS).');
    return null;
  }

  // Parse OSM place_id format: osm_<type>_<id>
  const osmMatch = placeId.match(/^osm_(node|way|relation)_(\d+)$/);
  if (!osmMatch) return null;

  try {
    const osmType = osmMatch[1][0].toUpperCase(); // N, W, R
    const osmId = osmMatch[2];
    const url = `${NOMINATIM_BASE}/lookup?osm_ids=${osmType}${osmId}&format=json&addressdetails=1&accept-language=en`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) return null;

    const item = data[0];
    return {
      placeName: item.name || item.display_name?.split(',')[0] || '',
      formattedAddress: item.display_name || '',
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      placeId: placeId,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lon}`,
      viewport: item.boundingbox ? {
        northeast: { lat: parseFloat(item.boundingbox[1]), lng: parseFloat(item.boundingbox[3]) },
        southwest: { lat: parseFloat(item.boundingbox[0]), lng: parseFloat(item.boundingbox[2]) },
      } : undefined,
    };
  } catch (err) {
    console.warn('[OSMMaps] Nominatim lookup failed:', err);
    return null;
  }
}

// ─── GEOCODE / RESOLVE URL ────────────────────────────────────────────────────
/**
 * Resolves pasted Google Maps URLs into an exact place reference.
 * Supports coordinate URLs, place URLs, search URLs and share URLs.
 */
export async function resolveGoogleMapsUrl(url: string): Promise<PlaceDetails | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const candidateUrls = await collectCandidateUrls(trimmed);
  const direct = parseGoogleMapsCoordinates(candidateUrls);
  if (direct) {
    const geocoded = await reverseGeocode(direct.lat, direct.lng);
    return geocoded || buildFallbackPlaceFromCoordinates(direct.lat, direct.lng, direct.resolvedUrl || trimmed);
  }

  const addressQuery = extractSearchQuery(candidateUrls);
  if (addressQuery) {
    return await geocodeAddress(addressQuery);
  }

  return null;
}

async function collectCandidateUrls(input: string): Promise<string[]> {
  const candidates = [input];
  if (/^(https?:\/\/)/i.test(input)) {
    try {
      const response = await fetch(input, {
        redirect: 'follow' as RequestRedirect,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      const finalUrl = response.url;
      if (finalUrl && finalUrl !== input) {
        candidates.push(finalUrl);
      }
    } catch (err) {
      console.warn('[OSMMaps] Redirect resolution failed:', err);
    }
  }
  return candidates;
}

function parseGoogleMapsCoordinates(candidateUrls: string[]): { lat: number; lng: number; resolvedUrl: string } | null {
  for (const candidate of candidateUrls) {
    const normalized = candidate.trim();

    const qPattern = /[?&]q=(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/i;
    const qMatch = normalized.match(qPattern);
    if (qMatch) {
      return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]), resolvedUrl: normalized };
    }

    const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const atMatch = normalized.match(atPattern);
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]), resolvedUrl: normalized };
    }

    const placePattern = /\/(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const placeMatch = normalized.match(placePattern);
    if (placeMatch) {
      return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]), resolvedUrl: normalized };
    }

    const queryPattern = /[?&](?:query|destination|origin)=([^&]+)/i;
    const queryMatch = normalized.match(queryPattern);
    if (queryMatch) {
      const decoded = decodeURIComponent(queryMatch[1]);
      const coordPattern = /(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/;
      const coordMatch = decoded.match(coordPattern);
      if (coordMatch) {
        return { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]), resolvedUrl: normalized };
      }
    }
  }

  return null;
}

function extractSearchQuery(candidateUrls: string[]): string | null {
  for (const candidate of candidateUrls) {
    const normalized = candidate.trim();
    const queryMatch = /[?&](?:query|q)=([^&]+)/i.exec(normalized);
    if (queryMatch) {
      const decoded = decodeURIComponent(queryMatch[1]);
      if (decoded && !/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/.test(decoded)) {
        return decoded;
      }
    }

    const placePath = /maps\/place\/([^/?#]+)/i.exec(normalized);
    if (placePath) return decodeURIComponent(placePath[1].replace(/\+/g, ' '));
  }
  return null;
}

async function geocodeAddress(address: string): Promise<PlaceDetails | null> {
  try {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(address)}&format=json&addressdetails=1&limit=1&accept-language=en`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const item = data[0];
    return {
      placeName: item.name || item.display_name?.split(',')[0] || address,
      formattedAddress: item.display_name || address,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      placeId: `osm_${item.osm_type}_${item.osm_id}`,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lon}`,
    };
  } catch (err) {
    console.warn('[OSMMaps] Geocode address failed:', err);
    return null;
  }
}

function buildFallbackPlaceFromCoordinates(lat: number, lng: number, sourceUrl: string): PlaceDetails {
  return {
    placeName: 'Resolved Location',
    formattedAddress: `Coordinates ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    latitude: lat,
    longitude: lng,
    placeId: `GEO-${lat.toFixed(6)}-${lng.toFixed(6)}`,
    mapsUrl: sourceUrl,
  };
}

/**
 * Reverse geocode lat/lng to a full place using Nominatim.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<PlaceDetails | null> {
  try {
    const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    const data = await res.json();

    if (data.error) {
      console.warn('[OSMMaps] Reverse geocode error:', data.error);
      return null;
    }

    const shortName = data.name || data.display_name?.split(',')[0]?.trim() || '';
    return {
      placeName: shortName || extractShortName(data.display_name || ''),
      formattedAddress: data.display_name || '',
      latitude: lat,
      longitude: lng,
      placeId: `osm_${data.osm_type}_${data.osm_id}`,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    };
  } catch (err) {
    console.warn('[OSMMaps] Reverse geocode fetch failed:', err);
    return null;
  }
}

function extractShortName(formattedAddress: string): string {
  // Return the first comma-delimited part as the short place name
  return formattedAddress.split(',')[0].trim();
}

// ─── DIRECTIONS API (OSRM) ───────────────────────────────────────────────────
/**
 * Calculates real route distance + travel time using OSRM.
 * Uses place_id: prefix for OSM-based routing.
 */
export async function getDirections(
  originPlaceId: string,
  destinationPlaceId: string,
  vehicleType?: string
): Promise<DirectionsResult | null> {
  // 1. Try Backend Proxy
  try {
    const headers = await getAuthHeaders();
    const proxyUrl = `${PROXY_BASE}/directions?origin=${encodeURIComponent(`place_id:${originPlaceId}`)}&destination=${encodeURIComponent(`place_id:${destinationPlaceId}`)}`;
    const res = await fetch(proxyUrl, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.routes?.length) {
        const route = data.routes[0];
        const leg = route.legs[0];
        const distanceMeters = leg.distance?.value ?? 0;
        const distanceKm = Math.round(distanceMeters / 1000);
        return {
          distanceKm,
          distanceText: leg.distance?.text ?? `${distanceKm} km`,
          durationText: leg.duration?.text ?? '',
          routeSummary: route.summary || 'via road',
          startAddress: leg.start_address || '',
          endAddress: leg.end_address || '',
        };
      }
    }
  } catch (proxyErr) {
    console.warn('[OSMMaps] Proxy directions failed:', proxyErr);
  }

  // 2. Direct OSRM fallback (Disabled on Web)
  if (isWeb) {
    console.warn('[OSMMaps] Direct OSRM skipped on Web (CORS).');
    return null;
  }

  // Resolve place IDs to coordinates
  const originCoords = await resolvePlaceIdToCoords(originPlaceId);
  const destCoords = await resolvePlaceIdToCoords(destinationPlaceId);

  if (!originCoords || !destCoords) return null;

  try {
    // OSRM expects lng,lat
    const url = `${OSRM_BASE}/route/v1/driving/${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=polyline`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    const data = await res.json();

    if (data.code !== 'Ok' || !data.routes?.length) return null;

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
      routeSummary: route.legs?.[0]?.summary || 'via road',
      startAddress: originPlaceId,
      endAddress: destinationPlaceId,
    };
  } catch (err) {
    console.warn('[OSMMaps] OSRM directions failed:', err);
    return null;
  }
}

/**
 * Resolve an OSM place_id (osm_<type>_<id>) to coordinates
 */
async function resolvePlaceIdToCoords(placeId: string): Promise<{ lat: number; lng: number } | null> {
  const osmMatch = placeId.match(/^osm_(node|way|relation)_(\d+)$/);
  if (!osmMatch) {
    // Try geocoding the placeId as a text query
    return geocodePlaceToCoords(placeId);
  }

  try {
    const osmType = osmMatch[1][0].toUpperCase();
    const osmId = osmMatch[2];
    const url = `${NOMINATIM_BASE}/lookup?osm_ids=${osmType}${osmId}&format=json&accept-language=en`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // Fall through
  }
  return null;
}

async function geocodePlaceToCoords(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=en`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // Failed
  }
  return null;
}

// ─── STATIC MAPS URL BUILDER (OpenStreetMap) ──────────────────────────────────
/**
 * Builds a Static Map URL with a pin at the given coordinates.
 * Uses OpenStreetMap's static map service — no API key needed.
 */
export function buildStaticMapUrl(
  lat: number,
  lng: number,
  pinColor: 'green' | 'red' | 'blue' = 'red',
  zoom: number = 14,
  width: number = 600,
  height: number = 200
): string {
  return `${PROXY_BASE}/staticmap?lat=${lat}&lng=${lng}&zoom=${zoom}&width=${width}&height=${height}&color=${pinColor}`;
}

// ─── SESSION TOKEN GENERATOR ──────────────────────────────────────────────────
/**
 * Generates a random session token for search session grouping.
 * Used for batching autocomplete requests (not billing-related for OSM).
 */
export function generateSessionToken(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// ─── TOLL ESTIMATION ─────────────────────────────────────────────────────────
/**
 * Estimates toll plazas and costs based on distance and vehicle wheel type.
 * Real-world toll data would require a dedicated Toll API (e.g., TollGuru).
 * This provides a realistic estimate using per-km toll density for Indian NH routes.
 */
export interface TollEstimate {
  isAvailable: boolean;
  count: number;
  estimatedCost: number;
  plazas: { name: string; cost: number }[];
  message?: string;
}

export function estimateTolls(distanceKm: number, wheelType: string): TollEstimate {
  // If no distance or very short route, return zero tolls
  if (!distanceKm || distanceKm <= 30) {
    return {
      isAvailable: true,
      count: 0,
      estimatedCost: 0,
      plazas: [],
    };
  }

  // Toll plaza spacing: approximately one every 65km on national highways
  const count = Math.max(1, Math.round(distanceKm / 65));
  
  // Cost per plaza based on vehicle wheel type (realistic NHAI rates for axle configs)
  let baseCostPerPlaza = 200; // Default
  switch (wheelType) {
    case '6 Wheel':
      baseCostPerPlaza = 220;
      break;
    case '10 Wheel':
      baseCostPerPlaza = 350;
      break;
    case '12 Wheel':
      baseCostPerPlaza = 440;
      break;
    case '14 Wheel':
      baseCostPerPlaza = 550;
      break;
    case '16 Wheel':
      baseCostPerPlaza = 660;
      break;
  }

  // Generate plazas with realistic names and slightly varied costs
  const plazas: { name: string; cost: number }[] = [];
  let totalCost = 0;
  
  for (let i = 0; i < count; i++) {
    // Generate a simulated cost with small variation (+/- 10%)
    const variation = 0.9 + (i * 0.07 % 0.2); // deterministic pseudo-random variation
    const cost = Math.round((baseCostPerPlaza * variation) / 5) * 5; // round to nearest 5
    
    // Names of mock plazas along the route
    const distanceMarker = Math.round((i + 1) * (distanceKm / (count + 1)));
    const plazaName = `NH Toll Plaza (Km ${distanceMarker})`;
    
    plazas.push({ name: plazaName, cost });
    totalCost += cost;
  }

  return {
    isAvailable: true,
    count,
    estimatedCost: totalCost,
    plazas,
  };
}
