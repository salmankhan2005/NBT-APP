/**
 * CreateTripScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * NBT + ARS Fleet Transit — Admin App
 * Trip Creation Module with Unified OpenStreetMap Location Search
 *
 * Each location field uses a SINGLE intelligent search bar that supports:
 *   • Place name / business name search (Places Autocomplete)
 *   • Full address search
 *   • Landmark search
 *   • Plus Code search
 *   • Maps URL paste (auto-resolves via Geocoding API)
 *
 * After selection stores: placeName, formattedAddress, lat, lng, placeId, mapsUrl
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
  Linking,
  Clipboard,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { db, ManagedVehicle, Trip, TollPlazaDetail } from '../db/database';
import {
  isApiKeyConfigured,
  searchPlacesAutocomplete,
  getPlaceDetails,
  resolveGoogleMapsUrl,
  getDirections,
  buildStaticMapUrl,
  estimateTolls,
  generateSessionToken,
  PlaceAutocompleteResult,
  PlaceDetails,
} from '../services/openStreetMapService';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type LocationDetails = PlaceDetails;

interface CreateTripScreenProps {
  onTripCreated: () => void;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 1000;

// Expanded offline fallback database — covers common freight corridors in Tamil Nadu / Karnataka.
// Used ONLY when the API key is not configured or network call fails.
const OFFLINE_PLACES: (PlaceDetails & { keywords: string[] })[] = [
  {
    placeName: 'Salem A2B Restaurant (Ayar Bhavan)',
    formattedAddress: 'NH544 Bypass Road, Seelanaickenpatti, Salem, Tamil Nadu 636005',
    latitude: 11.6643, longitude: 78.1460,
    placeId: 'ChIJ3x98a_SalemA2B_001',
    mapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJ3x98a_SalemA2B_001',
    plusCode: '8J3V+W9 Salem',
    keywords: ['salem', 'salem a2b', 'a2b salem', 'a to b', 'salem bypass', 'nh544'],
  },
  {
    placeName: 'Lumen Technologies, Bengaluru',
    formattedAddress: 'EPIP Zone, Phase 2, Whitefield, Bengaluru, Karnataka 560066',
    latitude: 12.9716, longitude: 77.5946,
    placeId: 'ChIJ8_LumenTechBengaluru_003',
    mapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJ8_LumenTechBengaluru_003',
    plusCode: 'XFC+7V Bengaluru',
    keywords: ['lumen', 'lumen technologies', 'whitefield', 'bangalore', 'bengaluru'],
  },
  {
    placeName: 'Make India Private Limited',
    formattedAddress: 'Industrial Suburb, Stage 2, Peenya, Bengaluru, Karnataka 560058',
    latitude: 13.0305, longitude: 77.5186,
    placeId: 'ChIJ_MakeIndiaPvtLtd_004',
    mapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJ_MakeIndiaPvtLtd_004',
    plusCode: '2GJC+6P Bengaluru',
    keywords: ['make india', 'make india private limited', 'peenya', 'bangalore'],
  },
  {
    placeName: 'Chennai Port Container Terminal (CITPL)',
    formattedAddress: 'Rajaji Salai, George Town, Chennai, Tamil Nadu 600001',
    latitude: 13.0827, longitude: 80.2707,
    placeId: 'ChIJ_ChennaiPortTerminal_005',
    mapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJ_ChennaiPortTerminal_005',
    plusCode: '37MC+37 Chennai',
    keywords: ['chennai', 'chennai port', 'container terminal', 'citpl'],
  },
  {
    placeName: 'Coimbatore Cargo Terminal, Peelamedu',
    formattedAddress: 'Avinashi Road, Peelamedu, Coimbatore, Tamil Nadu 641014',
    latitude: 11.0168, longitude: 76.9558,
    placeId: 'ChIJ_CoimbatoreCargo_006',
    mapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJ_CoimbatoreCargo_006',
    plusCode: '2884+R8 Coimbatore',
    keywords: ['coimbatore', 'cargo', 'peelamedu', 'avinashi road'],
  },
  {
    placeName: 'Hosur SIPCOT Industrial Complex',
    formattedAddress: 'Phase 1 SIPCOT, Hosur, Tamil Nadu 635126',
    latitude: 12.7409, longitude: 77.8253,
    placeId: 'ChIJ_HosurSipcot_008',
    mapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJ_HosurSipcot_008',
    plusCode: 'PRR2+94 Hosur',
    keywords: ['hosur', 'sipcot', 'hosur industrial', 'hosur bypass'],
  },
  {
    placeName: 'Erode Industrial Estate (Perundurai SIPCOT)',
    formattedAddress: 'Perundurai SIPCOT, Erode, Tamil Nadu 638052',
    latitude: 11.2750, longitude: 77.5833,
    placeId: 'ChIJ_ErodeSipcot_009',
    mapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJ_ErodeSipcot_009',
    plusCode: '7HVM+28 Erode',
    keywords: ['erode', 'perundurai', 'erode bypass', 'erode industrial'],
  },
  {
    placeName: 'Namakkal Trucking & Poultry Zone',
    formattedAddress: 'Tiruchengode Road, Namakkal, Tamil Nadu 637001',
    latitude: 11.2189, longitude: 78.1674,
    placeId: 'ChIJ_NamakkalZone_007',
    mapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJ_NamakkalZone_007',
    plusCode: '6598+H9 Namakkal',
    keywords: ['namakkal', 'namakkal trucking', 'namakkal zone'],
  },
  {
    placeName: 'Madurai Kappalur Industrial Estate',
    formattedAddress: 'Kappalur Industrial Estate, Madurai, Tamil Nadu 625008',
    latitude: 9.8711, longitude: 78.0416,
    placeId: 'ChIJ_MaduraiLogistics_010',
    mapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJ_MaduraiLogistics_010',
    plusCode: 'V2CR+JR Madurai',
    keywords: ['madurai', 'kappalur', 'madurai industrial'],
  },
  {
    placeName: 'Bengaluru Goods Terminal (Yelahanka)',
    formattedAddress: 'Yelahanka New Town, Bengaluru, Karnataka 560064',
    latitude: 13.1005, longitude: 77.5963,
    placeId: 'ChIJ_BengaluruGoods_011',
    mapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJ_BengaluruGoods_011',
    plusCode: '5GJC+8Q Bengaluru',
    keywords: ['bangalore', 'bengaluru', 'yelahanka', 'goods terminal'],
  },
  {
    placeName: 'Tiruchirappalli (Trichy) Cargo Hub',
    formattedAddress: 'Thuvakudi, Tiruchirappalli, Tamil Nadu 620015',
    latitude: 10.8050, longitude: 78.6856,
    placeId: 'ChIJ_TrichyCargo_012',
    mapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJ_TrichyCargo_012',
    plusCode: 'Q8P7+RV Tiruchirappalli',
    keywords: ['trichy', 'tiruchirappalli', 'trichy cargo', 'thuvakudi'],
  },
];

// ─── UNIFIED LOCATION SEARCH COMPONENT ───────────────────────────────────────

interface UnifiedLocationSearchProps {
  title: string;
  iconColor: string;
  pinColor: 'green' | 'red';
  placeholder: string;
  selectedLocation: LocationDetails | null;
  onSelectLocation: (loc: LocationDetails) => void;
  onClearLocation: () => void;
  zIndex?: number;
}

function UnifiedLocationSearch({
  title,
  iconColor,
  pinColor,
  placeholder,
  selectedLocation,
  onSelectLocation,
  onClearLocation,
  zIndex = 10,
}: UnifiedLocationSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceAutocompleteResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);
  const [urlDetected, setUrlDetected] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [lastResolvedLocation, setLastResolvedLocation] = useState<LocationDetails | null>(null);
  const [sessionToken, setSessionToken] = useState(generateSessionToken());
  const [googleMapsInput, setGoogleMapsInput] = useState('');
  const [showGoogleMapsInput, setShowGoogleMapsInput] = useState(false);
  const [isApplyingGoogleMaps, setIsApplyingGoogleMaps] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const apiAvailable = isApiKeyConfigured();

  // ── Detect if the pasted text is a Google Maps URL ──────────────────────────
  const detectUrl = (text: string) =>
    /maps\.google\.com|goo\.gl|maps\.app\.goo\.gl/i.test(text) ||
    (text.includes('http') && text.includes('maps'));

  const openGoogleMaps = useCallback(() => {
    const locationText = query.trim();
    const finalQuery = locationText || 'India';
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(finalQuery)}`;
    setGoogleMapsInput(locationText);
    setShowGoogleMapsInput(true);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    Linking.openURL(googleMapsUrl).catch(() => {
      Alert.alert('Could not open Google Maps', 'Please check that you have a web browser available.');
    });
  }, [query]);

  const applyGoogleMapsSelection = useCallback(async () => {
    const pastedText = googleMapsInput.trim();
    if (!pastedText) {
      Alert.alert('Missing Google Maps Location', 'Paste a Google Maps link or exact location to continue.');
      return;
    }

    setIsApplyingGoogleMaps(true);
    try {
      let resolvedLocation: LocationDetails | null = null;

      if (detectUrl(pastedText)) {
        resolvedLocation = await resolveGoogleMapsUrl(pastedText);
      }

      if (!resolvedLocation) {
        const coordMatch = pastedText.match(/(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/);
        if (coordMatch) {
          const lat = parseFloat(coordMatch[1]);
          const lng = parseFloat(coordMatch[2]);
          if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            resolvedLocation = {
              placeName: 'Google Maps Coordinates',
              formattedAddress: pastedText,
              latitude: lat,
              longitude: lng,
              placeId: `gm-coords-${Date.now()}`,
              mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pastedText)}`,
            };
          }
        }
      }

      if (!resolvedLocation) {
        const results = await searchPlacesAutocomplete(pastedText, sessionToken);
        const firstMatch = results[0];
        if (firstMatch) {
          resolvedLocation = await getPlaceDetails(firstMatch.placeId, sessionToken);
        }
      }

      if (!resolvedLocation) {
        resolvedLocation = {
          placeName: pastedText.split(',')[0]?.trim() || 'Google Maps Location',
          formattedAddress: pastedText,
          latitude: null,
          longitude: null,
          placeId: `gm-manual-${Date.now()}`,
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pastedText)}`,
        };
      }

      onSelectLocation(resolvedLocation);
      setQuery('');
      setGoogleMapsInput('');
      setShowGoogleMapsInput(false);
      setSessionToken(generateSessionToken());
    } catch (error) {
      console.warn('[GM] Manual Google Maps selection failed:', error);
      Alert.alert('Could Not Use This Location', 'Please paste a clearer Google Maps link or exact address and try again.');
    } finally {
      setIsApplyingGoogleMaps(false);
    }
  }, [googleMapsInput, onSelectLocation, sessionToken]);

  // ── Handle text input changes ────────────────────────────────────────────────
  const handleInputChange = useCallback(
    (text: string) => {
      setQuery(text);
      setUrlDetected(false);

      if (!text.trim()) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      // ── If it looks like a Google Maps URL ──────────────────────────────────
      if (detectUrl(text)) {
        setUrlDetected(true);
        setSuggestions([]);
        setShowDropdown(false);

        // Debounce the URL resolution
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(async () => {
          setIsResolvingUrl(true);
          try {
            const resolved = await resolveGoogleMapsUrl(text);
            if (resolved) {
              setLastResolvedLocation(resolved);
              onSelectLocation(resolved);
              setQuery('');
              setUrlDetected(false);
              setSessionToken(generateSessionToken());
            } else {
              Alert.alert(
                'Could Not Resolve URL',
                'Could not extract an exact location from this Google Maps link. Please search by name instead.',
              );
            }
          } finally {
            setIsResolvingUrl(false);
          }
        }, 600);
        return;
      }

      // ── Regular text search ─────────────────────────────────────────────────
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(async () => {
        if (!text.trim()) return;

        if (apiAvailable) {
          // Nominatim Place Search
          setIsSearching(true);
          try {
            const results = await searchPlacesAutocomplete(text, sessionToken);
            setSuggestions(results);
            setShowDropdown(results.length > 0);
          } finally {
            setIsSearching(false);
          }
        } else {
          // Offline fallback
          const lower = text.toLowerCase().trim();
          const matched = OFFLINE_PLACES.filter((p) => {
            const haystacks = [
              p.placeName.toLowerCase(),
              p.formattedAddress.toLowerCase(),
              p.plusCode?.toLowerCase() || '',
              ...p.keywords,
            ];
            const exactWordMatches = haystacks.filter((entry) => entry.includes(lower)).length;
            const contextBoost = lower.split(/\s+/).filter(Boolean).every((token) =>
              haystacks.some((entry) => entry.includes(token)),
            );
            return exactWordMatches > 0 && (contextBoost || lower.length >= 4);
          }).map((p) => ({
            placeId: p.placeId,
            mainText: p.placeName,
            secondaryText: p.formattedAddress,
            fullDescription: `${p.placeName}, ${p.formattedAddress}`,
          }));

          // If no offline match, add a generic suggestion so search always returns something
          if (matched.length === 0) {
            matched.push({
              placeId: `OFFLINE-SEARCH-${Date.now()}`,
              mainText: text.trim(),
              secondaryText: 'Tamil Nadu / Karnataka, India (configure API key for accurate results)',
              fullDescription: text.trim(),
            });
          }

          setSuggestions(matched.slice(0, 8));
          setShowDropdown(true);
        }
      }, DEBOUNCE_MS);
    },
    [apiAvailable, sessionToken, onSelectLocation],
  );

  // ── Handle suggestion selection ──────────────────────────────────────────────
  const handleSuggestionSelect = async (item: PlaceAutocompleteResult) => {
    setShowDropdown(false);
    setSuggestions([]);
    setLastResolvedLocation(null);

    if (apiAvailable) {
      // Fetch full place details from Places API
      setIsSearching(true);
      try {
        const details = await getPlaceDetails(item.placeId, sessionToken);
        if (details) {
          onSelectLocation(details);
          setQuery('');
          setSessionToken(generateSessionToken()); // New token for next search
        } else {
          Alert.alert('Error', 'Could not fetch place details. Please try again.');
        }
      } finally {
        setIsSearching(false);
      }
    } else {
      // Offline mode — find from local database
      const offline = OFFLINE_PLACES.find((p) => p.placeId === item.placeId);
      if (offline) {
        onSelectLocation(offline);
      } else {
        // Generic fallback for user-typed location
        onSelectLocation({
          placeName: item.mainText,
          formattedAddress: item.secondaryText || `${item.mainText}, India`,
          latitude: 12.0,
          longitude: 78.0,
          placeId: item.placeId,
          mapsUrl: `https://www.google.com/maps/search/?q=${encodeURIComponent(item.mainText)}`,
        });
      }
      setQuery('');
    }
  };

  const handleClearQuery = () => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    setUrlDetected(false);
    setLastResolvedLocation(null);
  };

  const handleOpenInMaps = (loc: LocationDetails) => {
    if (loc.latitude != null && loc.longitude != null) {
      const uri = Platform.select({
        ios: `maps:0,0?q=${loc.latitude},${loc.longitude}`,
        android: `geo:0,0?q=${loc.latitude},${loc.longitude}(${encodeURIComponent(loc.placeName)})`,
        default: loc.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`,
      });
      Linking.openURL(uri!).catch(() =>
        Linking.openURL(
          `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`,
        ),
      );
      return;
    }

    Linking.openURL(loc.mapsUrl || 'https://www.google.com/maps').catch(() => {
      Alert.alert('Location Link', 'This location is stored as a Google Maps link/address only. Please review it before continuing.');
    });
  };

  // Static map image URL
  const selectedLocationHasCoordinates = selectedLocation && selectedLocation.latitude != null && selectedLocation.longitude != null;
  const staticMapUrl = selectedLocationHasCoordinates
    ? buildStaticMapUrl(selectedLocation.latitude as number, selectedLocation.longitude as number, pinColor, 14, 600, 220)
    : null;

  return (
    <View style={[styles.locationCard, { zIndex }]}>
      {/* ── Card Header ── */}
      <View style={styles.locationCardHeader}>
        <View style={[styles.locationIconBadge, { backgroundColor: iconColor + '18' }]}>
          <MaterialIcons
            name={pinColor === 'green' ? 'trip-origin' : 'flag'}
            size={18}
            color={iconColor}
          />
        </View>
        <Text style={styles.locationCardTitle}>{title}</Text>
        {!apiAvailable && (
          <View style={styles.offlineBadge}>
            <MaterialIcons name="cloud-off" size={11} color="#b45309" />
            <Text style={styles.offlineBadgeText}>OFFLINE MODE</Text>
          </View>
        )}
      </View>

      {/* ── SELECTED STATE: show place card ── */}
      {selectedLocation ? (
        <View style={styles.selectedPlaceContainer}>
          {/* Map Preview */}
          {staticMapUrl ? (
            <View style={styles.staticMapContainer}>
              <Image
                source={{ uri: staticMapUrl }}
                style={styles.staticMapImage}
                resizeMode="cover"
              />
              <View style={styles.staticMapOverlayBadge}>
                <MaterialIcons name="location-on" size={12} color="#ffffff" />
                <Text style={styles.staticMapOverlayText}>MAP PREVIEW</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.graphicMapPreview, { borderColor: iconColor + '30' }]}>
              <MaterialIcons name="location-on" size={28} color={iconColor} />
              <Text style={styles.graphicMapPlaceName}>{selectedLocation.placeName}</Text>
              <Text style={styles.graphicMapCoords}>
                {selectedLocation.latitude != null && selectedLocation.longitude != null
                  ? `${selectedLocation.latitude.toFixed(5)}, ${selectedLocation.longitude.toFixed(5)}`
                  : 'Coordinates unavailable'}
              </Text>
            </View>
          )}

          {/* Place Info */}
          <View style={styles.selectedPlaceInfo}>
            <View style={styles.selectedPlaceNameRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedConfirmedLabel}>✅ LOCATION CONFIRMED</Text>
                <Text style={styles.selectedPlaceName} numberOfLines={2}>
                  {selectedLocation.placeName}
                </Text>
              </View>
              <TouchableOpacity style={styles.changeLocationBtn} onPress={onClearLocation}>
                <MaterialIcons name="edit" size={14} color={COLORS.primary} />
                <Text style={styles.changeLocationBtnText}>Change</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.selectedPlaceAddress}>{selectedLocation.formattedAddress}</Text>

            <View style={styles.selectedMetaGrid}>
              {selectedLocation.latitude != null && selectedLocation.longitude != null ? (
                <View style={styles.metaChip}>
                  <MaterialIcons name="gps-fixed" size={11} color="#64748b" />
                  <Text style={styles.metaChipText}>
                    {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
                  </Text>
                </View>
              ) : (
                <View style={styles.metaChip}>
                  <MaterialIcons name="info-outline" size={11} color="#64748b" />
                  <Text style={styles.metaChipText}>Coordinates unavailable</Text>
                </View>
              )}
              <View style={styles.metaChip}>
                <MaterialIcons name="fingerprint" size={11} color="#64748b" />
                <Text style={styles.metaChipText} numberOfLines={1}>
                  {selectedLocation.placeId}
                </Text>
              </View>
              {selectedLocation.plusCode && (
                <View style={styles.metaChip}>
                  <MaterialIcons name="grid-on" size={11} color="#64748b" />
                  <Text style={styles.metaChipText}>{selectedLocation.plusCode}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.openMapsButton}
              onPress={() => handleOpenInMaps(selectedLocation)}
            >
              <MaterialIcons name="open-in-new" size={13} color={iconColor} />
              <Text style={[styles.openMapsButtonText, { color: iconColor }]}>
                Open in Google Maps
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* ── SEARCH STATE: unified input ── */
        <View style={{ zIndex: 100 }}>
          {/* API Key Notice */}
          {!apiAvailable && (
            <View style={styles.apiKeyNotice}>
              <MaterialIcons name="info-outline" size={14} color="#0369a1" />
              <Text style={styles.apiKeyNoticeText}>
                Location search is powered by OpenStreetMap (Nominatim).
                Using offline database as fallback.
              </Text>
            </View>
          )}

          {/* Single Unified Search Field */}
          <View style={styles.searchRow}>
            <View
              style={[
                styles.searchInputWrapper,
                { flex: 1 },
                isSearching || isResolvingUrl ? styles.searchInputWrapperActive : null,
              ]}
            >
              {isSearching || isResolvingUrl ? (
                <ActivityIndicator size="small" color={iconColor} style={{ marginRight: 10 }} />
              ) : (
                <MaterialIcons name="search" size={20} color="#64748b" style={{ marginRight: 10 }} />
              )}

              <TextInput
                style={styles.searchInput}
                placeholder={placeholder}
                placeholderTextColor="#94a3b8"
                value={query}
                onChangeText={handleInputChange}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="search"
              />

              {query.length > 0 && (
                <TouchableOpacity onPress={handleClearQuery} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons name="cancel" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.googleMapsButton} onPress={openGoogleMaps} activeOpacity={0.8}>
              <MaterialIcons name="map" size={14} color={iconColor} />
              <Text style={[styles.googleMapsButtonText, { color: iconColor }]}>Google Maps</Text>
            </TouchableOpacity>
          </View>

          {/* Search Hint */}
          <Text style={styles.searchHint}>
            Search any place, company, address, or{' '}
            <Text style={styles.searchHintAccent}>paste a Maps link</Text> to resolve the exact location.
          </Text>

          {showGoogleMapsInput && (
            <View style={styles.googleMapsManualBox}>
              <Text style={styles.googleMapsManualText}>
                Find the exact location in Google Maps, then copy the location/address or Google Maps link and paste it below.
              </Text>
              <TextInput
                style={styles.googleMapsInput}
                placeholder="Paste Google Maps location/link"
                placeholderTextColor="#94a3b8"
                value={googleMapsInput}
                onChangeText={setGoogleMapsInput}
                autoCorrect={false}
                autoCapitalize="sentences"
                multiline
              />
              <TouchableOpacity
                style={styles.googleMapsUseBtn}
                onPress={applyGoogleMapsSelection}
                disabled={isApplyingGoogleMaps}
                activeOpacity={0.85}
              >
                {isApplyingGoogleMaps ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.googleMapsUseBtnText}>Use This Location</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* URL Detected Banner */}
          {urlDetected && (
            <View style={styles.urlDetectedBanner}>
              {isResolvingUrl ? (
                <ActivityIndicator size="small" color="#0369a1" />
              ) : (
                <MaterialIcons name="link" size={14} color="#0369a1" />
              )}
              <Text style={styles.urlDetectedText}>
                {isResolvingUrl
                  ? 'Resolving Maps URL...'
                  : 'Maps URL detected — extracting exact location...'}
              </Text>
            </View>
          )}

          {/* OpenStreetMap Places Autocomplete Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <View style={styles.suggestionsDropdown}>
              {/* Dropdown Header */}
              <View style={styles.dropdownHeader}>
                <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '600' }}>© OpenStreetMap contributors</Text>
              </View>

              {suggestions.map((item, idx) => (
                <TouchableOpacity
                  key={`${item.placeId}-${idx}`}
                  style={[
                    styles.suggestionRow,
                    idx === suggestions.length - 1 && styles.suggestionRowLast,
                  ]}
                  onPress={() => handleSuggestionSelect(item)}
                  activeOpacity={0.65}
                >
                  <View style={[styles.suggestionIcon, { backgroundColor: iconColor + '15' }]}>
                    <MaterialIcons name="place" size={16} color={iconColor} />
                  </View>
                  <View style={styles.suggestionTextBlock}>
                    <Text style={styles.suggestionMainText} numberOfLines={1}>
                      {item.mainText}
                    </Text>
                    {item.secondaryText ? (
                      <Text style={styles.suggestionSecondaryText} numberOfLines={1}>
                        {item.secondaryText}
                      </Text>
                    ) : null}
                  </View>
                  <MaterialIcons name="north-west" size={13} color="#94a3b8" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

export default function CreateTripScreen({ onTripCreated }: CreateTripScreenProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 880;

  const [formStep, setFormStep] = useState<'FORM' | 'SUMMARY' | 'CONFIRMED'>('FORM');
  const [saving, setSaving] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);

  // Vehicles
  const [vehicles, setVehicles] = useState<ManagedVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [vehicleDocsModalVisible, setVehicleDocsModalVisible] = useState(false);
  const [selectedVehicleDocs, setSelectedVehicleDocs] = useState<any[]>([]);

  // 1. Customer Details
  const [customerCompany, setCustomerCompany] = useState('');
  const [loaderName, setLoaderName] = useState('');
  const [loaderPhone, setLoaderPhone] = useState('');

  // 2. Locations
  const [startingLocation, setStartingLocation] = useState<LocationDetails | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<LocationDetails | null>(null);

  // 3. Route
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationText, setDurationText] = useState<string>('');
  const [routeSummary, setRouteSummary] = useState<string>('');
  const [routeLoaded, setRouteLoaded] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);

  // 4. Vehicle
  const [wheelType, setWheelType] = useState<'6 Wheel' | '10 Wheel' | '12 Wheel' | '14 Wheel' | '16 Wheel'>('12 Wheel');
  const [vehicleNumber, setVehicleNumber] = useState('');

  // 5. Tolls
  const [tollsCount, setTollsCount] = useState(0);
  const [tollCost, setTollCost] = useState(0);
  const [tollPlazas, setTollPlazas] = useState<TollPlazaDetail[]>([]);

  // Handlers for manual toll adjustments
  const handleUpdatePlazaCost = (index: number, newCostText: string) => {
    const cleaned = newCostText.replace(/[^0-9.]/g, '');
    const numericCost = parseFloat(cleaned) || 0;
    const updated = [...tollPlazas];
    updated[index] = { ...updated[index], cost: numericCost };
    setTollPlazas(updated);
    
    // Re-sum costs
    const total = updated.reduce((sum, plaza) => sum + plaza.cost, 0);
    setTollCost(total);
  };

  const handleUpdatePlazaName = (index: number, newName: string) => {
    const updated = [...tollPlazas];
    updated[index] = { ...updated[index], name: newName };
    setTollPlazas(updated);
  };

  const handleDeletePlaza = (index: number) => {
    const updated = tollPlazas.filter((_, i) => i !== index);
    setTollPlazas(updated);
    setTollsCount(updated.length);
    const total = updated.reduce((sum, plaza) => sum + plaza.cost, 0);
    setTollCost(total);
  };

  const handleAddPlaza = () => {
    const newPlaza: TollPlazaDetail = { name: `NH Toll Plaza (Manual)`, cost: 150 };
    const updated = [...tollPlazas, newPlaza];
    setTollPlazas(updated);
    setTollsCount(updated.length);
    const total = updated.reduce((sum, plaza) => sum + plaza.cost, 0);
    setTollCost(total);
  };

  // 6. Freight
  const [agreedFreight, setAgreedFreight] = useState('');

  // Confirmation
  const [createdTrip, setCreatedTrip] = useState<Trip | null>(null);

  // ── Helper to match wheel types flexibly ──────────────────────────────────
  const isWheelTypeMatch = (v?: ManagedVehicle, targetWt?: string) => {
    if (!v || !targetWt) return false;
    const wt = targetWt.trim().toLowerCase();
    const vType = (v.vehicleType || '').trim().toLowerCase();
    const wType = (v.wheelType || '').trim().toLowerCase();
    return vType === wt || wType === wt || vType.startsWith(wt.slice(0, 4)) || wType.startsWith(wt.slice(0, 4));
  };

  // ── Load vehicles and subscribe to database updates ───────────────────────
  useEffect(() => {
    const loadVehicles = async (force = false) => {
      const available = await db.getAvailableManagedVehicles();
      setVehicles(available);
      const match = available.find(v => isWheelTypeMatch(v, wheelType));
      const first = match || available[0];
      if (first && !selectedVehicleId) {
        setSelectedVehicleId(first.vehicle_id);
        setVehicleNumber(first.vehicleNumber);
      }
    };
    loadVehicles();

    // Subscribe to live database updates (e.g. when vehicle is added in Vehicle Management)
    const unsubscribe = db.subscribe(() => {
      loadVehicles(true);
    });

    return () => {
      unsubscribe();
    };
  }, [wheelType]);

  // ── When wheel type changes, auto-select first matching vehicle ────────────
  useEffect(() => {
    if (vehicles.length === 0) return;
    const match = vehicles.find(v => isWheelTypeMatch(v, wheelType));
    if (match) {
      setSelectedVehicleId(match.vehicle_id);
      setVehicleNumber(match.vehicleNumber);
    } else {
      setSelectedVehicleId('');
      setVehicleNumber('');
    }
  }, [wheelType, vehicles]);

  // ── Fetch real route once both locations are confirmed ─────────────────────
  useEffect(() => {
    if (!startingLocation || !destinationLocation) {
      setDistanceKm(null);
      setDurationText('');
      setRouteSummary('');
      setRouteLoaded(false);
      return;
    }

    if (startingLocation.latitude == null || startingLocation.longitude == null || destinationLocation.latitude == null || destinationLocation.longitude == null) {
      setDistanceKm(null);
      setDurationText('');
      setRouteSummary('');
      setRouteLoaded(false);
      return;
    }

    let cancelled = false;

    const fetchRoute = async () => {
      setRouteLoading(true);
      setRouteLoaded(false);

      try {
        let km: number;
        let duration: string;
        let summary: string;

        if (isApiKeyConfigured()) {
          // Real Directions API
          const directions = await getDirections(
            startingLocation.placeId,
            destinationLocation.placeId,
            wheelType,
          );

          if (directions && !cancelled) {
            km = directions.distanceKm;
            duration = directions.durationText;
            summary = directions.routeSummary;
          } else {
            // Directions failed → haversine fallback
            ({ km, duration, summary } = haversineFallback(startingLocation, destinationLocation));
          }
        } else {
          // No API key → haversine fallback
          ({ km, duration, summary } = haversineFallback(startingLocation, destinationLocation));
        }

        if (cancelled) return;

        setDistanceKm(km);
        setDurationText(duration);
        setRouteSummary(summary);

        // Toll estimation
        const tollEst = estimateTolls(km, wheelType);
        setTollsCount(tollEst.count);
        setTollCost(tollEst.estimatedCost);
        setTollPlazas(tollEst.plazas);
        setRouteLoaded(true);
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    };

    fetchRoute();
    return () => { cancelled = true; };
  }, [startingLocation, destinationLocation, wheelType]);

  // ── Haversine fallback for offline distance calc ───────────────────────────
  const haversineFallback = (
    origin: LocationDetails,
    dest: LocationDetails,
  ): { km: number; duration: string; summary: string } => {
    if (origin.latitude == null || origin.longitude == null || dest.latitude == null || dest.longitude == null) {
      return {
        km: 0,
        duration: 'N/A',
        summary: 'Coordinates unavailable',
      };
    }

    const R = 6371;
    const dLat = ((dest.latitude - origin.latitude) * Math.PI) / 180;
    const dLon = ((dest.longitude - origin.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((origin.latitude * Math.PI) / 180) *
        Math.cos((dest.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const km = Math.max(Math.round(R * c * 1.28), 5);
    const mins = Math.round((km / 50) * 60);
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return {
      km,
      duration: hrs > 0 ? `${hrs} hr ${rem} min` : `${rem} min`,
      summary: 'via NH (estimated)',
    };
  };

  // ── Form validation ────────────────────────────────────────────────────────
  const handleProceedToSummary = () => {
    if (!customerCompany.trim()) {
      Alert.alert('Missing Field', 'Please enter the Transport / Customer Company Name.');
      return;
    }
    if (!loaderName.trim()) {
      Alert.alert('Missing Field', 'Please enter the Loader / Contact Person Name.');
      return;
    }
    if (!startingLocation) {
      Alert.alert('Missing Starting Point', 'Please search and select an exact Starting Location.');
      return;
    }
    if (!destinationLocation) {
      Alert.alert('Missing Destination', 'Please search and select an exact Destination.');
      return;
    }
    if (startingLocation.latitude == null || startingLocation.longitude == null || destinationLocation.latitude == null || destinationLocation.longitude == null) {
      Alert.alert('Location Coordinates Needed', 'Please provide a Google Maps result with usable coordinates or choose an OpenStreetMap result before continuing.');
      return;
    }
    if (!agreedFreight.trim() || isNaN(parseFloat(agreedFreight)) || parseFloat(agreedFreight) <= 0) {
      Alert.alert('Invalid Freight', 'Please enter a valid Agreed Freight amount in ₹.');
      return;
    }
    setFormStep('SUMMARY');
  };

  // ── Create Trip ────────────────────────────────────────────────────────────
  const handleCreateTrip = async () => {
    if (!startingLocation || !destinationLocation) return;
    if (startingLocation.latitude == null || startingLocation.longitude == null || destinationLocation.latitude == null || destinationLocation.longitude == null) {
      Alert.alert('Location Coordinates Needed', 'Please provide a Google Maps result with usable coordinates or choose an OpenStreetMap result before creating the trip.');
      return;
    }
    setSaving(true);
    try {
      const trip = await db.createTrip({
        customerCompany: customerCompany.trim(),
        loaderName: loaderName.trim(),
        loaderPhone: loaderPhone.trim(),

        startingPoint: startingLocation.placeName,
        startingAddress: startingLocation.formattedAddress,
        startingLat: startingLocation.latitude,
        startingLng: startingLocation.longitude,
        startingPlaceId: startingLocation.placeId,
        startingMapsUrl: startingLocation.mapsUrl,

        destination: destinationLocation.placeName,
        destinationAddress: destinationLocation.formattedAddress,
        destinationLat: destinationLocation.latitude,
        destinationLng: destinationLocation.longitude,
        destinationPlaceId: destinationLocation.placeId,
        destinationMapsUrl: destinationLocation.mapsUrl,

        distanceKm: distanceKm ?? 0,
        estimatedTravelTime: durationText,
        recommendedRoute: routeSummary,

        tollsCount,
        estimatedTollCost: tollCost,
        tollPlazas,

        vehicleId: selectedVehicleId || undefined,
        vehicleNumber,
        vehicleType: wheelType,

        agreedFreight: parseFloat(agreedFreight) || 0,
      });
      setCreatedTrip(trip);
      setFormStep('CONFIRMED');
    } catch {
      Alert.alert('Error', 'Failed to save trip. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  const resetForm = () => {
    setCustomerCompany('');
    setLoaderName('');
    setLoaderPhone('');
    setStartingLocation(null);
    setDestinationLocation(null);
    setDistanceKm(null);
    setDurationText('');
    setRouteSummary('');
    setRouteLoaded(false);
    setWheelType('12 Wheel');
    const match = vehicles.find(v => v.vehicleType === '12 Wheel' || v.wheelType === '12 Wheel');
    const first = match || vehicles[0];
    if (first) {
      setSelectedVehicleId(first.vehicle_id);
      setVehicleNumber(first.vehicleNumber);
    } else {
      setSelectedVehicleId('');
      setVehicleNumber('');
    }
    setAgreedFreight('');
    setCreatedTrip(null);
    setFormStep('FORM');
  };

  // ── Static map for route preview ───────────────────────────────────────────
  const startStaticMap = startingLocation && startingLocation.latitude != null && startingLocation.longitude != null
    ? buildStaticMapUrl(startingLocation.latitude, startingLocation.longitude, 'green', 13, 400, 160)
    : null;
  const destStaticMap = destinationLocation && destinationLocation.latitude != null && destinationLocation.longitude != null
    ? buildStaticMapUrl(destinationLocation.latitude, destinationLocation.longitude, 'red', 13, 400, 160)
    : null;

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: CONFIRMED
  // ══════════════════════════════════════════════════════════════════════════════
  if (formStep === 'CONFIRMED' && createdTrip) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
        {/* Success Banner */}
        <View style={styles.successBanner}>
          <MaterialIcons name="check-circle" size={52} color="#16a34a" />
          <Text style={styles.successTitle}>TRIP CREATED SUCCESSFULLY</Text>
          <Text style={styles.successSubtitle}>
            Credentials generated. Share Driver ID + PIN with the assigned driver.
          </Text>
        </View>

        {/* Credentials */}
        <View style={styles.credBox}>
          <Text style={styles.credBoxTitle}>🔑 TRIP CREDENTIALS</Text>

          {[
            { label: 'TRIP ID', value: createdTrip.id, color: '#f8fafc' },
            { label: 'DRIVER ID (Trip-Specific)', value: createdTrip.driverId, color: '#93c5fd' },
            { label: 'DRIVER PIN (Trip-Specific)', value: createdTrip.driverPin || '', color: '#fcd34d' },
            { label: 'CUSTOMER TRACKING ID', value: createdTrip.trackingId, color: '#6ee7b7' },
          ].map((item) => (
            <View key={item.label} style={styles.credRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.credLabel}>{item.label}</Text>
                <Text style={[styles.credValue, { color: item.color }]}>{item.value}</Text>
              </View>
              <TouchableOpacity
                style={styles.credCopyBtn}
                onPress={() => copyToClipboard(item.value, item.label)}
              >
                <MaterialIcons name="content-copy" size={14} color={item.color} />
                <Text style={[styles.credCopyText, { color: item.color }]}>COPY</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Route Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>TRIP SUMMARY</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status</Text>
            <View style={styles.notStartedPill}>
              <Text style={styles.notStartedText}>{createdTrip.status}</Text>
            </View>
          </View>
          <SummaryRow label="Customer" value={createdTrip.customerCompany || ''} />
          <SummaryRow
            label="Starting Point"
            value={`📍 ${createdTrip.startingPoint}`}
            subValue={`Place ID: ${createdTrip.startingPlaceId}`}
          />
          <SummaryRow
            label="Destination"
            value={`🏁 ${createdTrip.destination}`}
            subValue={`Place ID: ${createdTrip.destinationPlaceId}`}
          />
          <SummaryRow
            label="Distance / Duration"
            value={`${createdTrip.distanceKm} km · ${createdTrip.estimatedTravelTime}`}
          />
          <SummaryRow
            label="Agreed Freight"
            value={`₹${(createdTrip.agreedFreight || 0).toLocaleString()}`}
            highlight
          />
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={onTripCreated}>
          <MaterialIcons name="list-alt" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>VIEW ALL TRIPS</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={resetForm}>
          <MaterialIcons name="add-circle-outline" size={18} color={COLORS.primary} />
          <Text style={styles.secondaryBtnText}>CREATE ANOTHER TRIP</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: SUMMARY REVIEW
  // ══════════════════════════════════════════════════════════════════════════════
  if (formStep === 'SUMMARY') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>REVIEW BEFORE CREATING</Text>
          <Text style={styles.pageSubtitle}>Verify exact map locations and financials</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>1. CUSTOMER</Text>
          <SummaryRow label="Company" value={customerCompany} />
          <SummaryRow label="Loader" value={`${loaderName} ${loaderPhone ? `· ${loaderPhone}` : ''}`} />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>2. EXACT STARTING POINT</Text>
          <SummaryRow label="Place" value={startingLocation?.placeName || ''} />
          <SummaryRow label="Address" value={startingLocation?.formattedAddress || ''} />
          <SummaryRow
            label="Coordinates"
            value={
              startingLocation && startingLocation.latitude != null && startingLocation.longitude != null
                ? `${startingLocation.latitude.toFixed(5)}, ${startingLocation.longitude.toFixed(5)}`
                : 'Not available — address/link only'
            }
          />
          <SummaryRow label="Place ID" value={startingLocation?.placeId || ''} mono />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>3. EXACT DESTINATION</Text>
          <SummaryRow label="Place" value={destinationLocation?.placeName || ''} />
          <SummaryRow label="Address" value={destinationLocation?.formattedAddress || ''} />
          <SummaryRow
            label="Coordinates"
            value={
              destinationLocation && destinationLocation.latitude != null && destinationLocation.longitude != null
                ? `${destinationLocation.latitude.toFixed(5)}, ${destinationLocation.longitude.toFixed(5)}`
                : 'Not available — address/link only'
            }
          />
          <SummaryRow label="Place ID" value={destinationLocation?.placeId || ''} mono />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>4. ROUTE & FINANCIALS</Text>
          <SummaryRow label="Distance" value={distanceKm ? `${distanceKm} km` : '—'} />
          <SummaryRow label="Est. Travel Time" value={durationText || '—'} />
          <SummaryRow label="Route" value={routeSummary || '—'} />
          <SummaryRow label="Toll Plazas" value={`${tollsCount} plazas · Est. ₹${tollCost.toLocaleString()}`} />
          <SummaryRow label="Vehicle" value={`${vehicleNumber} (${wheelType})`} />
          <SummaryRow label="Agreed Freight" value={`₹${parseFloat(agreedFreight || '0').toLocaleString()}`} highlight />
        </View>

        <View style={styles.reviewActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => setFormStep('FORM')}>
            <MaterialIcons name="edit" size={16} color={COLORS.primary} />
            <Text style={styles.editBtnText}>EDIT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, { flex: 2 }]}
            onPress={handleCreateTrip}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="check" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>CONFIRM & CREATE TRIP</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: MAIN FORM
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.screenContent,
          isDesktop && { maxWidth: 860, alignSelf: 'center', width: '100%' },
        ]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {/* ── Page Header ── */}
        <View style={styles.pageHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialIcons name="alt-route" size={22} color={COLORS.primary} />
            <Text style={styles.pageTitle}>TRIP CREATION</Text>
          </View>
          <Text style={styles.pageSubtitle}>
            Fill in all details and select exact map locations
          </Text>
        </View>


        <View style={styles.sectionCard}>
          <SectionHeader icon="business" label="1. Load / Customer Details" />

          <FieldLabel>Transport / Customer Company Name *</FieldLabel>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. RKB Transport, Apex Retail Pvt Ltd"
            placeholderTextColor="#94a3b8"
            value={customerCompany}
            onChangeText={setCustomerCompany}
          />

          <View style={[styles.rowTwo, !isDesktop && { flexDirection: 'column' }]}>
            <View style={{ flex: 1 }}>
              <FieldLabel>Loader / Contact Person *</FieldLabel>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Sairam"
                placeholderTextColor="#94a3b8"
                value={loaderName}
                onChangeText={setLoaderName}
              />
            </View>
            <View style={!isDesktop ? { height: 10 } : styles.rowTwoSpacer} />
            <View style={{ flex: 1 }}>
              <FieldLabel>Phone (Optional)</FieldLabel>
              <TextInput
                style={styles.textInput}
                placeholder="9842011223"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={loaderPhone}
                onChangeText={setLoaderPhone}
              />
            </View>
          </View>
        </View>


        <UnifiedLocationSearch
          title="2. Starting Point"
          iconColor="#16a34a"
          pinColor="green"
          placeholder="Search place, business, address - or paste a Maps link"
          selectedLocation={startingLocation}
          onSelectLocation={setStartingLocation}
          onClearLocation={() => setStartingLocation(null)}
          zIndex={20}
        />


        <UnifiedLocationSearch
          title="3. Destination Point"
          iconColor="#dc2626"
          pinColor="red"
          placeholder="Search destination place, business, address - or paste a Maps link"
          selectedLocation={destinationLocation}
          onSelectLocation={setDestinationLocation}
          onClearLocation={() => setDestinationLocation(null)}
          zIndex={10}
        />


        {(startingLocation || destinationLocation) && (
          <View style={styles.sectionCard}>
            <SectionHeader icon="map" label="4. Route & Distance Calculation" color="#0284c7" />

            {(!startingLocation || !destinationLocation) ? (
              <View style={styles.routeWaiting}>
                <MaterialIcons name="directions" size={28} color="#94a3b8" />
                <Text style={styles.routeWaitingText}>
                  Select both Starting Point and Destination to calculate the exact route.
                </Text>
              </View>
            ) : routeLoading ? (
              <View style={styles.routeWaiting}>
                <ActivityIndicator color="#0284c7" size="large" />
                <Text style={styles.routeWaitingText}>
                  Calculating route{isApiKeyConfigured() ? ' via OSRM' : ' (offline estimate)'}...
                </Text>
              </View>
            ) : routeLoaded ? (
              <>
                {/* Route Path Visual */}
                <View style={styles.routePath}>
                  <View style={styles.routeNode}>
                    <View style={[styles.routeDot, { backgroundColor: '#16a34a' }]} />
                    <Text style={styles.routeNodeText} numberOfLines={1}>
                      {startingLocation.placeName}
                    </Text>
                  </View>
                  <View style={styles.routeConnector}>
                    <View style={styles.routeConnectorLine} />
                    <View style={styles.routeConnectorBubble}>
                      <Text style={styles.routeDistanceBadge}>{distanceKm} km</Text>
                    </View>
                    <View style={styles.routeConnectorLine} />
                  </View>
                  <View style={styles.routeNode}>
                    <View style={[styles.routeDot, { backgroundColor: '#dc2626' }]} />
                    <Text style={styles.routeNodeText} numberOfLines={1}>
                      {destinationLocation.placeName}
                    </Text>
                  </View>
                </View>

                {/* Metrics Row */}
                <View style={styles.routeMetricsRow}>
                  <View style={styles.routeMetric}>
                    <MaterialIcons name="straighten" size={20} color={COLORS.primary} />
                    <Text style={styles.routeMetricValue}>{distanceKm} km</Text>
                    <Text style={styles.routeMetricLabel}>DISTANCE</Text>
                  </View>
                  <View style={styles.routeMetricDivider} />
                  <View style={styles.routeMetric}>
                    <MaterialIcons name="schedule" size={20} color="#0284c7" />
                    <Text style={[styles.routeMetricValue, { color: '#0284c7' }]}>{durationText}</Text>
                    <Text style={styles.routeMetricLabel}>EST. TIME</Text>
                  </View>
                  <View style={styles.routeMetricDivider} />
                  <View style={styles.routeMetric}>
                    <MaterialIcons name="alt-route" size={20} color="#7c3aed" />
                    <Text style={[styles.routeMetricValue, { color: '#7c3aed', fontSize: 11 }]} numberOfLines={2}>
                      {routeSummary}
                    </Text>
                    <Text style={styles.routeMetricLabel}>ROUTE</Text>
                  </View>
                </View>

                {isApiKeyConfigured() ? (
                  <View style={styles.apiSourceBadge}>
                    <MaterialIcons name="check-circle" size={12} color="#16a34a" />
                    <Text style={styles.apiSourceText}>
                      Calculated via OSRM routing using exact locations
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.apiSourceBadge, { backgroundColor: '#fef3c7' }]}>
                    <MaterialIcons name="info" size={12} color="#d97706" />
                    <Text style={[styles.apiSourceText, { color: '#92400e' }]}>
                      Estimated via Haversine formula (offline estimate)
                    </Text>
                  </View>
                )}

                {/* View Full Map Button */}
                <TouchableOpacity style={styles.viewFullMapBtn} onPress={() => setMapModalVisible(true)}>
                  <MaterialIcons name="map" size={16} color="#0284c7" />
                  <Text style={styles.viewFullMapBtnText}>VIEW ROUTE ON FULL MAP</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        )}


        <View style={styles.sectionCard}>
          <SectionHeader icon="local-shipping" label="5. Vehicle Details" color="#7c3aed" />

          <FieldLabel>Wheel Type *</FieldLabel>
          <View style={[styles.chipRow, !isDesktop && { flexWrap: 'wrap' }]}>
            {(['6 Wheel', '10 Wheel', '12 Wheel', '16 Wheel'] as const).map((wt) => (
              <TouchableOpacity
                key={wt}
                style={[styles.chip, wheelType === wt && styles.chipActive, !isDesktop && { flexGrow: 1, minWidth: 70 }]}
                onPress={() => setWheelType(wt)}
              >
                <Text style={[styles.chipText, wheelType === wt && styles.chipActiveText]}>{wt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <FieldLabel>SELECT VEHICLE</FieldLabel>
          {vehicles.length === 0 ? (
            <Text style={styles.routeWaitingText}>No available vehicles are currently registered. Add vehicles in Vehicle Management first.</Text>
          ) : (() => {
            const filtered = vehicles.filter(v => isWheelTypeMatch(v, wheelType));
            return filtered.length === 0 ? (
              <View style={{ backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#fde68a' }}>
                <Text style={{ fontSize: 12, color: '#92400e', fontWeight: '700' }}>
                  ⚠️ No {wheelType} vehicles registered. Change wheel type or add a vehicle in Vehicle Management.
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {filtered.map((v) => (
                  <TouchableOpacity
                    key={v.vehicle_id}
                    style={[styles.vehicleChip, vehicleNumber === v.vehicleNumber && styles.vehicleChipActive]}
                    onPress={() => {
                      setSelectedVehicleId(v.vehicle_id);
                      setVehicleNumber(v.vehicleNumber);
                    }}
                  >
                    <Text style={[styles.vehicleChipText, vehicleNumber === v.vehicleNumber && styles.vehicleChipActiveText]}>
                      🚛 {v.vehicleNumber}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            );
          })()}

          {vehicleNumber ? (
            <TouchableOpacity
              style={styles.secondaryBtnSmall}
              onPress={async () => {
                const vehicle = vehicles.find((item) => item.vehicleNumber === vehicleNumber);
                if (!vehicle) return;
                const docs = await db.getAllDocumentsForVehicle(vehicle.vehicle_id);
                setSelectedVehicleDocs(docs);
                setVehicleDocsModalVisible(true);
              }}
            >
              <MaterialIcons name="folder-open" size={14} color={COLORS.primary} />
              <Text style={styles.secondaryBtnSmallText}>VIEW VEHICLE DOCUMENTS</Text>
            </TouchableOpacity>
          ) : null}
        </View>


        {routeLoaded && (
          <View style={styles.sectionCard}>
            <SectionHeader icon="toll" label="6. Estimated Toll Information" color="#d97706" />

            <View style={styles.tollBanner}>
              <View>
                <Text style={styles.tollBannerLabel}>TOLL PLAZAS</Text>
                <Text style={styles.tollBannerValue}>{tollsCount}</Text>
              </View>
              <View style={styles.tollBannerDivider} />
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.tollBannerLabel}>APPROX. TOLL COST</Text>
                <Text style={[styles.tollBannerValue, { color: '#d97706' }]}>
                  ₹{tollCost.toLocaleString()}
                </Text>
              </View>
            </View>
            <Text style={styles.tollDisclaimer}>
              * Modeled estimate for {wheelType} vehicle. You can customize the plazas below:
            </Text>

            {tollPlazas.map((plaza, i) => (
              <View key={i} style={styles.tollEditRow}>
                <View style={styles.tollNameCol}>
                  <TextInput
                    style={styles.tollInputName}
                    value={plaza.name}
                    onChangeText={(text) => handleUpdatePlazaName(i, text)}
                    placeholder="Toll Plaza Name"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={styles.tollCostBox}>
                  <Text style={styles.tollCurrencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.tollInputCost}
                    value={plaza.cost.toString()}
                    keyboardType="numeric"
                    onChangeText={(text) => handleUpdatePlazaCost(i, text)}
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <TouchableOpacity onPress={() => handleDeletePlaza(i)} style={styles.tollDeleteBtn} activeOpacity={0.7}>
                  <MaterialIcons name="delete-outline" size={18} color="#dc2626" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity onPress={handleAddPlaza} style={styles.tollAddBtn} activeOpacity={0.7}>
              <MaterialIcons name="add" size={16} color="#d97706" />
              <Text style={styles.tollAddBtnText}>ADD TOLL PLAZA</Text>
            </TouchableOpacity>
          </View>
        )}


        <View style={styles.sectionCard}>
          <SectionHeader icon="payments" label="7. Agreed Freight / Rent" color="#16a34a" />

          <FieldLabel>Agreed Freight Amount (₹ INR) *</FieldLabel>
          <TextInput
            style={[styles.textInput, styles.freightInput]}
            placeholder="e.g. 100000"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            value={agreedFreight}
            onChangeText={setAgreedFreight}
          />
          {!!agreedFreight.trim() && !isNaN(parseFloat(agreedFreight)) && (
            <Text style={styles.freightFormatted}>
              ₹{parseFloat(agreedFreight).toLocaleString()} INR
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.proceedBtn} onPress={handleProceedToSummary}>
          <Text style={styles.proceedBtnText}>REVIEW TRIP SUMMARY →</Text>
        </TouchableOpacity>

        <Modal visible={vehicleDocsModalVisible} animationType="slide" transparent={false} onRequestClose={() => setVehicleDocsModalVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setVehicleDocsModalVisible(false)} style={styles.modalCloseBtn}>
                <MaterialIcons name="close" size={22} color={COLORS.primary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Vehicle Documents</Text>
              <View style={{ width: 40 }} />
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              {selectedVehicleDocs.length === 0 ? (
                <View style={styles.routeWaiting}>
                  <MaterialIcons name="description" size={28} color="#94a3b8" />
                  <Text style={styles.routeWaitingText}>No documents uploaded for this vehicle yet.</Text>
                </View>
              ) : (
                selectedVehicleDocs.map((doc) => (
                  <View key={doc.doc_id} style={styles.docCard}> 
                    <Text style={styles.docCardTitle}>{doc.docLabel}</Text>
                    <Text style={styles.docCardText}>Number: {doc.docNumber || '—'}</Text>
                    <Text style={styles.docCardText}>Expiry: {doc.expiryDate || '—'}</Text>
                    <Text style={styles.docCardText}>File: {doc.fileName || '—'}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </Modal>
      </ScrollView>

      {/* ── Full Map Modal ─────────────────────────────────────────────────── */}
      <Modal visible={mapModalVisible} animationType="slide" onRequestClose={() => setMapModalVisible(false)}>
        <View style={styles.mapModal}>
          <View style={styles.mapModalHeader}>
            <Text style={styles.mapModalTitle}>Route Preview</Text>
            <TouchableOpacity onPress={() => setMapModalVisible(false)}>
              <MaterialIcons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.mapModalContent}>
            {startingLocation && (
              <>
                <Text style={styles.mapModalSectionLabel}>🟢 STARTING POINT</Text>
                <Text style={styles.mapModalPlaceName}>{startingLocation.placeName}</Text>
                <Text style={styles.mapModalAddress}>{startingLocation.formattedAddress}</Text>
                {startStaticMap ? (
                  <Image source={{ uri: startStaticMap }} style={styles.mapModalImage} resizeMode="cover" />
                ) : (
                  <View style={styles.mapModalPlaceholder}>
                    <MaterialIcons name="location-on" size={32} color="#16a34a" />
                    <Text style={styles.mapModalPlaceholderText}>
                      {startingLocation.latitude != null && startingLocation.longitude != null
                        ? `${startingLocation.latitude.toFixed(5)}, ${startingLocation.longitude.toFixed(5)}`
                        : 'Coordinates unavailable'}
                    </Text>
                  </View>
                )}
              </>
            )}

            {distanceKm && (
              <View style={styles.mapModalRouteBar}>
                <Text style={styles.mapModalRouteText}>
                  ══════════ 🛣️ {distanceKm} km · {durationText} ({routeSummary}) ══════════
                </Text>
              </View>
            )}

            {destinationLocation && (
              <>
                <Text style={styles.mapModalSectionLabel}>🔴 DESTINATION</Text>
                <Text style={styles.mapModalPlaceName}>{destinationLocation.placeName}</Text>
                <Text style={styles.mapModalAddress}>{destinationLocation.formattedAddress}</Text>
                {destStaticMap ? (
                  <Image source={{ uri: destStaticMap }} style={styles.mapModalImage} resizeMode="cover" />
                ) : (
                  <View style={styles.mapModalPlaceholder}>
                    <MaterialIcons name="flag" size={32} color="#dc2626" />
                    <Text style={styles.mapModalPlaceholderText}>
                      {destinationLocation.latitude != null && destinationLocation.longitude != null
                        ? `${destinationLocation.latitude.toFixed(5)}, ${destinationLocation.longitude.toFixed(5)}`
                        : 'Coordinates unavailable'}
                    </Text>
                  </View>
                )}
              </>
            )}

            {isApiKeyConfigured() && startingLocation && destinationLocation && (
              <TouchableOpacity
                style={styles.openGoogleMapsBtn}
                onPress={() =>
                  Linking.openURL(
                    `https://www.google.com/maps/dir/?api=1&origin=place_id:${startingLocation.placeId}&destination=place_id:${destinationLocation.placeId}&travelmode=driving`,
                  )
                }
              >
                <MaterialIcons name="open-in-new" size={16} color="#fff" />
                <Text style={styles.openGoogleMapsBtnText}>OPEN FULL ROUTE IN GOOGLE MAPS APP</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── SMALL HELPER COMPONENTS ──────────────────────────────────────────────────

function SectionHeader({
  icon,
  label,
  color = COLORS.primary,
}: {
  icon: string;
  label: string;
  color?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconBadge, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.sectionTitle}>{label}</Text>
    </View>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

function SummaryRow({
  label,
  value,
  subValue,
  highlight,
  mono,
}: {
  label: string;
  value: string;
  subValue?: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <Text
          style={[
            styles.summaryValue,
            highlight && styles.summaryValueHighlight,
            mono && styles.summaryValueMono,
          ]}
          numberOfLines={2}
        >
          {value}
        </Text>
        {subValue && <Text style={styles.summarySubValue}>{subValue}</Text>}
      </View>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  screenContent: { padding: SPACING.gutter, paddingBottom: 100 },

  pageHeader: { marginBottom: 18, marginTop: 6 },
  pageTitle: { fontSize: 17, fontWeight: '900', color: COLORS.primary, letterSpacing: 0.3 },
  pageSubtitle: { fontSize: 12, color: '#64748b', marginTop: 3 },

  // Section Card
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...SHADOWS.light,
    overflow: 'visible',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a', flex: 1 },

  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 5,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    fontSize: 13,
    color: '#0f172a',
  },
  freightInput: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16a34a',
    height: 52,
  },
  freightFormatted: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '700',
    marginTop: 5,
  },
  rowTwo: { flexDirection: 'row', marginTop: 2 },
  rowTwoSpacer: { width: 10 },

  // Unified Location Search Card
  locationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...SHADOWS.light,
    overflow: 'visible',
  },
  locationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  locationIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationCardTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a', flex: 1 },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  offlineBadgeText: { fontSize: 9, fontWeight: '800', color: '#b45309' },

  // API Key Notice
  apiKeyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginBottom: 10,
  },
  apiKeyNoticeText: { flex: 1, fontSize: 11, color: '#0369a1', lineHeight: 16 },

  // Search Input
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    minHeight: 48,
  },
  searchInputWrapperActive: { borderColor: '#0284c7' },
  searchInput: { flex: 1, fontSize: 13, color: '#0f172a', paddingVertical: 8 },
  googleMapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 48,
  },
  googleMapsButtonText: { fontSize: 11, fontWeight: '800' },
  searchHint: { fontSize: 10, color: '#94a3b8', marginTop: 5 },
  searchHintAccent: { color: '#0284c7', fontWeight: '700' },
  googleMapsManualBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    marginTop: 8,
    gap: 8,
  },
  googleMapsManualText: { fontSize: 11, color: '#475569', lineHeight: 16 },
  googleMapsInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 44,
    fontSize: 12,
    color: '#0f172a',
    textAlignVertical: 'top',
  },
  googleMapsUseBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  googleMapsUseBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  urlDetectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    gap: 6,
  },
  urlDetectedText: { fontSize: 11, color: '#0369a1', fontWeight: '600', flex: 1 },

  // Suggestions Dropdown
  suggestionsDropdown: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginTop: 6,
    ...SHADOWS.medium,
    overflow: 'hidden',
  },
  dropdownHeader: {
    backgroundColor: '#f8fafc',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'flex-end',
  },
  poweredByGoogle: { width: 100, height: 14 },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 10,
  },
  suggestionRowLast: { borderBottomWidth: 0 },
  suggestionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  suggestionTextBlock: { flex: 1 },
  suggestionMainText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  suggestionSecondaryText: { fontSize: 11, color: '#64748b', marginTop: 1 },

  // Selected Place
  selectedPlaceContainer: {},
  staticMapContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  staticMapImage: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#e2e8f0' },
  staticMapOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    gap: 3,
  },
  staticMapOverlayText: { fontSize: 9, color: '#ffffff', fontWeight: '800' },
  graphicMapPreview: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    paddingVertical: 18,
    marginBottom: 12,
  },
  graphicMapPlaceName: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  graphicMapCoords: { fontSize: 11, color: '#64748b', marginTop: 2 },

  selectedPlaceInfo: {},
  selectedPlaceNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 10,
  },
  selectedConfirmedLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#16a34a',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  selectedPlaceName: { fontSize: 15, fontWeight: '900', color: '#0f172a', flex: 1 },
  changeLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
    flexShrink: 0,
  },
  changeLocationBtnText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  selectedPlaceAddress: { fontSize: 12, color: '#475569', marginBottom: 10, lineHeight: 18 },
  selectedMetaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    maxWidth: '100%',
  },
  metaChipText: { fontSize: 10, color: '#334155', fontWeight: '600', flexShrink: 1 },
  openMapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  openMapsButtonText: { fontSize: 12, fontWeight: '700' },

  // Route Section
  routeWaiting: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  routeWaitingText: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  routePath: { gap: 0, marginBottom: 16 },
  routeNode: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeDot: { width: 14, height: 14, borderRadius: 7 },
  routeNodeText: { fontSize: 13, fontWeight: '700', color: '#0f172a', flex: 1 },
  routeConnector: { flexDirection: 'row', alignItems: 'center', paddingLeft: 6, gap: 4 },
  routeConnectorLine: { width: 2, height: 18, backgroundColor: '#e2e8f0', marginLeft: 5 },
  routeConnectorBubble: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 12,
  },
  routeDistanceBadge: { fontSize: 11, fontWeight: '800', color: '#0284c7' },
  routeMetricsRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    overflow: 'hidden',
  },
  routeMetric: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 3 },
  routeMetricDivider: { width: 1, backgroundColor: '#e2e8f0' },
  routeMetricValue: { fontSize: 14, fontWeight: '900', color: COLORS.primary, textAlign: 'center' },
  routeMetricLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '700', letterSpacing: 0.5 },
  apiSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 5,
    marginBottom: 12,
  },
  apiSourceText: { fontSize: 10, color: '#15803d', fontWeight: '600', flex: 1 },
  viewFullMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  viewFullMapBtnText: { fontSize: 12, fontWeight: '800', color: '#0284c7' },

  // Vehicle / Chips
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  chipText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  chipActiveText: { color: '#fff' },
  vehicleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  vehicleChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  vehicleChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  vehicleChipActiveText: { color: '#fff' },

  // Tolls
  tollBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  tollBannerLabel: { fontSize: 10, fontWeight: '700', color: '#92400e', letterSpacing: 0.3 },
  tollBannerValue: { fontSize: 20, fontWeight: '900', color: '#78350f' },
  tollBannerDivider: { width: 1, height: 36, backgroundColor: '#fde68a' },
  tollDisclaimer: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginBottom: 10 },
  tollRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tollRowName: { fontSize: 12, color: '#334155', fontWeight: '500' },
  tollRowCost: { fontSize: 12, fontWeight: '700', color: '#b45309' },
  tollEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  tollNameCol: {
    flex: 1,
    minWidth: 0,
  },
  tollInputName: {
    width: '100%',
    minWidth: 0,
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
    height: 40,
    paddingHorizontal: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {}),
  },
  tollCostBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
    height: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 8,
    overflow: 'hidden',
    flexShrink: 0,
  },
  tollCurrencyPrefix: {
    fontSize: 13,
    fontWeight: '700',
    color: '#b45309',
    marginRight: 2,
    flexShrink: 0,
  },
  tollInputCost: {
    flex: 1,
    minWidth: 0,
    maxWidth: 70,
    fontSize: 13,
    fontWeight: '700',
    color: '#b45309',
    padding: 0,
    textAlign: 'right',
    backgroundColor: 'transparent',
    borderWidth: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {}),
  },
  tollDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tollAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#d97706',
    borderRadius: 8,
    marginTop: 6,
    backgroundColor: '#fffbeb',
  },
  tollAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
    marginLeft: 4,
  },

  // Proceed Button
  proceedBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...SHADOWS.medium,
  },
  proceedBtnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },

  // Summary Review
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...SHADOWS.light,
  },
  summaryCardTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  summaryLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', flexShrink: 0 },
  summaryValue: { fontSize: 12, fontWeight: '700', color: '#0f172a', textAlign: 'right' },
  summaryValueHighlight: { fontSize: 16, fontWeight: '900', color: '#16a34a' },
  summaryValueMono: { fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }), fontSize: 10 },
  summarySubValue: { fontSize: 10, color: '#94a3b8', textAlign: 'right', marginTop: 2 },

  reviewActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 6,
  },
  editBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },

  // Confirmation
  successBanner: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    ...SHADOWS.light,
  },
  successTitle: { fontSize: 18, fontWeight: '900', color: '#15803d', letterSpacing: 0.3, marginTop: 8 },
  successSubtitle: { fontSize: 12, color: '#4ade80', textAlign: 'center', marginTop: 4 },

  credBox: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  credBoxTitle: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginBottom: 12 },
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  credLabel: { fontSize: 9, fontWeight: '700', color: '#64748b', letterSpacing: 0.5 },
  credValue: { fontSize: 15, fontWeight: '900', color: '#f8fafc', marginTop: 2, letterSpacing: 1 },
  credCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },
  credCopyText: { fontSize: 9, fontWeight: '800' },

  notStartedPill: {
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  notStartedText: { fontSize: 11, fontWeight: '800', color: '#b45309' },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 10,
    ...SHADOWS.light,
  },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },

  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  secondaryBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '800' },
  secondaryBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  secondaryBtnSmallText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    ...SHADOWS.light,
  },
  modalCloseBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  modalContent: { padding: 20, paddingBottom: 60 },
  docCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 10,
  },
  docCardTitle: { fontSize: 13, fontWeight: '800', color: COLORS.primary, marginBottom: 4 },
  docCardText: { fontSize: 12, color: '#64748b', marginTop: 2 },

  // Full Map Modal
  mapModal: { flex: 1, backgroundColor: '#f8fafc' },
  mapModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    ...SHADOWS.light,
  },
  mapModalTitle: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  mapModalContent: { padding: 20, paddingBottom: 60 },
  mapModalSectionLabel: { fontSize: 10, fontWeight: '900', color: '#64748b', letterSpacing: 0.8, marginBottom: 4 },
  mapModalPlaceName: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 2 },
  mapModalAddress: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  mapModalImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, marginBottom: 16, backgroundColor: '#e2e8f0' },
  mapModalPlaceholder: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  mapModalPlaceholderText: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  mapModalRouteBar: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  mapModalRouteText: { color: '#94a3b8', fontSize: 11, textAlign: 'center' },
  openGoogleMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a73e8',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
  },
  openGoogleMapsBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
