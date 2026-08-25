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
  latitude: number | null;
  longitude: number | null;
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
import AsyncStorage from '@react-native-async-storage/async-storage';
const isWeb = Platform.OS === 'web';

// ─── API ENDPOINTS ────────────────────────────────────────────────────────────

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OSRM_BASE = 'https://router.project-osrm.org';
const USER_AGENT = 'NBT-ARS-FleetTransit-AdminApp/1.0 (admin@nbt.com)';

import { API_HOST } from '../db/database';

const PROXY_BASE = `${API_HOST}/api/maps`;

// OpenStreetMap services are always available — no API key needed
export const isApiKeyConfigured = () => true;

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const token = await AsyncStorage.getItem('admin_session_token');
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

// In-memory cache for fast, 0ms lookup of recently searched places
const placeCache = new Map<string, PlaceDetails>();

// ─── PLACES AUTOCOMPLETE (Nominatim + Photon Search) ──────────────────────────
/**
 * Fetches accurate place suggestions for Indian addresses and locations.
 * Uses Nominatim with India countrycode + Photon fallback for typo-tolerance.
 */
export async function searchPlacesAutocomplete(
  query: string,
  sessionToken?: string
): Promise<PlaceAutocompleteResult[]> {
  const cleanQuery = query?.trim();
  if (!cleanQuery || cleanQuery.length < 2) return [];

  // Strategy 1: Direct Nominatim Search (OpenStreetMap, India filtered)
  try {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(cleanQuery)}&format=json&addressdetails=1&limit=10&countrycodes=in&accept-language=en`;
    const res = await fetch(url, {
      headers: Platform.OS !== 'web' ? { 'User-Agent': USER_AGENT } : undefined,
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any): PlaceAutocompleteResult => {
          const placeId = `osm_${item.osm_type || 'node'}_${item.osm_id || item.place_id}`;
          const mainText = item.name || item.display_name?.split(',')[0]?.trim() || cleanQuery;
          const secondaryParts = item.display_name?.split(',').slice(1).map((s: string) => s.trim()).filter(Boolean) || [];
          const secondaryText = secondaryParts.join(', ');
          const fullDescription = item.display_name || `${mainText}, ${secondaryText}`;

          // Cache details immediately for 0ms lookup on select
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          if (!isNaN(lat) && !isNaN(lng)) {
            placeCache.set(placeId, {
              placeName: mainText,
              formattedAddress: fullDescription,
              latitude: lat,
              longitude: lng,
              placeId,
              mapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
              viewport: item.boundingbox ? {
                northeast: { lat: parseFloat(item.boundingbox[1]), lng: parseFloat(item.boundingbox[3]) },
                southwest: { lat: parseFloat(item.boundingbox[0]), lng: parseFloat(item.boundingbox[2]) },
              } : undefined,
            });
          }

          return {
            placeId,
            mainText,
            secondaryText,
            fullDescription,
          };
        });
      }
    }
  } catch (nomErr) {
    console.warn('[OSMMaps] Direct Nominatim search error:', nomErr);
  }

  // Strategy 2: Photon Geocoder (OSM-based by Komoot, high-speed fuzzy search)
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=10&lat=12.9716&lon=77.5946&bbox=68.1,6.5,97.4,35.5`;
    const res = await fetch(photonUrl);
    if (res.ok) {
      const data = await res.json() as any;
      if (Array.isArray(data.features) && data.features.length > 0) {
        return data.features.map((feature: any): PlaceAutocompleteResult => {
          const props = feature.properties || {};
          const coords = feature.geometry?.coordinates; // [lng, lat]
          const name = props.name || props.street || cleanQuery;
          const contextParts = [
            props.city || props.town || props.village || props.district,
            props.state,
            props.country || 'India',
          ].filter(Boolean);
          const secondaryText = contextParts.join(', ');
          const fullDescription = [name, ...contextParts].filter(Boolean).join(', ');
          const placeId = `photon_${props.osm_type || 'N'}_${props.osm_id || Math.abs(props.name?.length || 0)}_${coords ? `${coords[1].toFixed(4)}_${coords[0].toFixed(4)}` : Date.now()}`;

          if (coords && coords.length >= 2) {
            const lat = coords[1];
            const lng = coords[0];
            placeCache.set(placeId, {
              placeName: name,
              formattedAddress: fullDescription,
              latitude: lat,
              longitude: lng,
              placeId,
              mapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
            });
          }

          return {
            placeId,
            mainText: name,
            secondaryText,
            fullDescription,
          };
        });
      }
    }
  } catch (photonErr) {
    console.warn('[OSMMaps] Photon search error:', photonErr);
  }

  // Strategy 3: Backend Proxy
  try {
    const headers = await getAuthHeaders();
    const proxyUrl = `${PROXY_BASE}/places/autocomplete?input=${encodeURIComponent(cleanQuery)}&provider=osm`;
    const res = await fetch(proxyUrl, { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.predictions) && data.predictions.length > 0) {
        return (data.predictions || []).map((p: any): PlaceAutocompleteResult => {
          const item: PlaceAutocompleteResult = {
            placeId: p.place_id,
            mainText: p.structured_formatting?.main_text || p.description,
            secondaryText: p.structured_formatting?.secondary_text || '',
            fullDescription: p.description,
          };
          if (p._osm?.lat && p._osm?.lon) {
            placeCache.set(p.place_id, {
              placeName: item.mainText,
              formattedAddress: item.fullDescription,
              latitude: parseFloat(p._osm.lat),
              longitude: parseFloat(p._osm.lon),
              placeId: p.place_id,
              mapsUrl: `https://www.google.com/maps/search/?api=1&query=${p._osm.lat},${p._osm.lon}`,
            });
          } else if (p._known?.lat && p._known?.lng) {
            placeCache.set(p.place_id, {
              placeName: item.mainText,
              formattedAddress: item.fullDescription,
              latitude: p._known.lat,
              longitude: p._known.lng,
              placeId: p.place_id,
              mapsUrl: `https://www.google.com/maps/search/?api=1&query=${p._known.lat},${p._known.lng}`,
            });
          }
          return item;
        });
      }
    }
  } catch (proxyErr) {
    console.warn('[OSMMaps] Proxy fetch failed:', proxyErr);
  }

  // Strategy 4: Local freight corridors fallback
  return getFallbackAutocomplete(cleanQuery);
}

// ─── PLACE DETAILS (Nominatim Lookup) ─────────────────────────────────────────
/**
 * Fetches full details for a place ID using cached memory, Nominatim lookup, or backend proxy.
 */
export async function getPlaceDetails(
  placeId: string,
  sessionToken?: string
): Promise<PlaceDetails | null> {
  if (!placeId) return null;

  // 1. Check in-memory cache from search step (Instant 0ms!)
  const cached = placeCache.get(placeId);
  if (cached) return cached;

  const mockMatch = getMockPlaceDetails(placeId);
  if (mockMatch) return mockMatch;

  // 2. Parse direct coordinates from placeId
  const coordMatch = placeId.match(/^(?:GEO-|photon_.*_)(-?\d+\.\d+)[_,](-?\d+\.\d+)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    return {
      placeName: 'Selected Location',
      formattedAddress: `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      latitude: lat,
      longitude: lng,
      placeId,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    };
  }

  // 3. Direct Nominatim Lookup
  const osmMatch = placeId.match(/^osm_([a-z]+)_(\d+)$/i);
  if (osmMatch) {
    try {
      const typeLetter = osmMatch[1][0].toUpperCase(); // N, W, R
      const osmId = osmMatch[2];
      const url = `${NOMINATIM_BASE}/lookup?osm_ids=${typeLetter}${osmId}&format=json&addressdetails=1&accept-language=en`;
      const res = await fetch(url, {
        headers: Platform.OS !== 'web' ? { 'User-Agent': USER_AGENT } : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const item = data[0];
          const mainText = item.name || item.display_name?.split(',')[0]?.trim() || '';
          const details: PlaceDetails = {
            placeName: mainText,
            formattedAddress: item.display_name || '',
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            placeId,
            mapsUrl: `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lon}`,
            viewport: item.boundingbox ? {
              northeast: { lat: parseFloat(item.boundingbox[1]), lng: parseFloat(item.boundingbox[3]) },
              southwest: { lat: parseFloat(item.boundingbox[0]), lng: parseFloat(item.boundingbox[2]) },
            } : undefined,
          };
          placeCache.set(placeId, details);
          return details;
        }
      }
    } catch (nomErr) {
      console.warn('[OSMMaps] Direct Nominatim lookup error:', nomErr);
    }
  }

  // 4. Try Backend Proxy
  try {
    const headers = await getAuthHeaders();
    const proxyUrl = `${PROXY_BASE}/places/details?place_id=${encodeURIComponent(placeId)}&provider=osm`;
    const res = await fetch(proxyUrl, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.result) {
        const result = data.result;
        const loc = result.geometry?.location;
        const details: PlaceDetails = {
          placeName: result.name || result.formatted_address,
          formattedAddress: result.formatted_address || '',
          latitude: loc?.lat ?? 0,
          longitude: loc?.lng ?? 0,
          placeId: result.place_id || placeId,
          mapsUrl: result.url || `https://www.google.com/maps/search/?api=1&query=${loc?.lat},${loc?.lng}`,
          viewport: result.geometry?.viewport,
        };
        placeCache.set(placeId, details);
        return details;
      }
    }
  } catch (proxyErr) {
    console.warn('[OSMMaps] Proxy details failed:', proxyErr);
  }

  return null;
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
  // 1. Try Backend Proxy
  try {
    const headers = await getAuthHeaders();
    const proxyUrl = `${PROXY_BASE}/places/autocomplete?input=${encodeURIComponent(address)}`;
    const res = await fetch(proxyUrl, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.predictions && data.predictions.length > 0) {
        const first = data.predictions[0];
        return await getPlaceDetails(first.place_id, 'session');
      }
    }
  } catch (proxyErr) {
    console.warn('[OSMMaps] Proxy geocode address failed:', proxyErr);
  }

  // 2. Direct Nominatim fallback (Disabled on Web to prevent CORS error)
  if (isWeb) {
    console.warn('[OSMMaps] Direct Nominatim geocode address skipped on Web (CORS).');
    return null;
  }

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
  // 1. Try Backend Proxy
  try {
    const headers = await getAuthHeaders();
    const proxyUrl = `${PROXY_BASE}/geocode?latlng=${lat},${lng}`;
    const res = await fetch(proxyUrl, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        const shortName = item.formatted_address?.split(',')[0]?.trim() || '';
        return {
          placeName: shortName || extractShortName(item.formatted_address || ''),
          formattedAddress: item.formatted_address || '',
          latitude: lat,
          longitude: lng,
          placeId: item.place_id || `GEO-${lat.toFixed(6)}-${lng.toFixed(6)}`,
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        };
      }
    }
  } catch (proxyErr) {
    console.warn('[OSMMaps] Proxy reverse geocode failed:', proxyErr);
  }

  // Direct Nominatim reverse geocode
  try {
    const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en`;
    const res = await fetch(url, {
      headers: Platform.OS !== 'web' ? { 'User-Agent': USER_AGENT } : undefined,
    });
    const data = await res.json();

    if (data && !data.error) {
      const shortName = data.name || data.display_name?.split(',')[0]?.trim() || '';
      return {
        placeName: shortName || extractShortName(data.display_name || ''),
        formattedAddress: data.display_name || '',
        latitude: lat,
        longitude: lng,
        placeId: `osm_${data.osm_type || 'node'}_${data.osm_id || '0'}`,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      };
    }
  } catch (err) {
    console.warn('[OSMMaps] Reverse geocode fetch failed:', err);
  }

  return null;
}

function extractShortName(formattedAddress: string): string {
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
  // Resolve place IDs to coordinates
  const originCoords = await resolvePlaceIdToCoords(originPlaceId);
  const destCoords = await resolvePlaceIdToCoords(destinationPlaceId);

  if (originCoords && destCoords) {
    try {
      // OSRM expects lng,lat
      const url = `${OSRM_BASE}/route/v1/driving/${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=polyline`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.code === 'Ok' && data.routes?.length) {
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
        }
      }
    } catch (osrmErr) {
      console.warn('[OSMMaps] Direct OSRM directions error:', osrmErr);
    }
  }

  // Fallback to Backend Proxy
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

  return null;
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
  return `${PROXY_BASE}/staticmap?lat=${lat}&lng=${lng}&zoom=${zoom}&width=${width}&height=${height}&color=${pinColor}&format=svg`;
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
