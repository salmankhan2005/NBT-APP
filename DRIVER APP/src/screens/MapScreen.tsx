import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  Platform,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { db, Trip, GPSLocation } from '../db/database';

interface MapScreenProps {
  trip: Trip;
  onAddExpensePress: () => void;
  onArrivedPress: () => void;
}

import { reverseGeocodeLocation, getLiveRouteDetails, getStaticMapPreviewUrl } from '../services/openStreetMapService';

export default function MapScreen({
  trip,
  onAddExpensePress,
  onArrivedPress,
}: MapScreenProps) {
  const [location, setLocation] = useState<GPSLocation | null>(trip.currentGPS || null);
  const [distanceText, setDistanceText] = useState<string>(trip.distanceKm ? `${trip.distanceKm} km` : '-- km');
  const [durationText, setDurationText] = useState<string>(trip.estimatedTravelTime || '--');
  const [eta, setEta] = useState('');
  const [currentTurn, setCurrentTurn] = useState('Continue on route toward ' + trip.destination);
  const [turnIcon, setTurnIcon] = useState('navigation');
  const [mapTileUrl, setMapTileUrl] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch live directions via OpenStreetMap (OSRM)
    const fetchDirections = async () => {
      const route = await getLiveRouteDetails(trip.startingPoint, trip.destination);
      if (route) {
        setDistanceText(route.distanceText);
        setDurationText(route.durationText);
        const etaDate = new Date();
        etaDate.setMinutes(etaDate.getMinutes() + route.durationMinutes);
        setEta(etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    };
    fetchDirections();

    // 2. Request location permissions and start tracking location
    let subscription: Location.LocationSubscription | null = null;

    const startLocationTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('GPS permission denied');
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 50,
        },
        async (loc) => {
          const lat = loc.coords.latitude;
          const lng = loc.coords.longitude;
          setMapTileUrl(getStaticMapPreviewUrl(lat, lng));
          const osmGeo = await reverseGeocodeLocation(lat, lng);
          const city = osmGeo?.city || 'In Transit';
          const address = osmGeo?.formattedAddress || `Lat: ${lat.toFixed(4)}, Long: ${lng.toFixed(4)}`;
          const newGps: GPSLocation = {
            latitude: lat,
            longitude: lng,
            city,
            address,
            lastUpdated: new Date().toLocaleTimeString(),
          };
          setLocation(newGps);
          await db.updateGPS(trip.id, newGps);
        }
      );
    };

    startLocationTracking();

    return () => {
      if (subscription) subscription.remove();
    };
  }, [trip.id]);

  const openGoogleMaps = () => {
    // We deep link to Google Maps
    // Destination is Bangalore FC or Coimbatore depending on trip
    const query = encodeURIComponent(trip.destination);
    const url = Platform.select({
      ios: `maps://app?daddr=${query}&saddr=Current+Location`,
      android: `google.navigation:q=${query}`,
    }) || `https://www.google.com/maps/dir/?api=1&destination=${query}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Open standard browser link
          Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${query}`);
        }
      })
      .catch(() => {
        Alert.alert('Error', 'Cannot open navigation link.');
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Banner - Turn Guidance */}
      <View style={styles.guidanceBanner}>
        <View style={styles.guidanceIconCircle}>
          <MaterialIcons name={turnIcon as any} size={28} color={COLORS.onPrimary} style={{
            transform: turnIcon === 'navigation' ? [{ rotate: '45deg' }] : []
          }} />
        </View>
        <View style={styles.guidanceTextContainer}>
          <Text style={styles.guidanceInstruction}>{currentTurn}</Text>
          <Text style={styles.guidanceSub}>Next action in 4.2 km</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Map Content Canvas - Beautiful UI Card */}
        <View style={styles.mapCanvas}>
          {mapTileUrl ? (
            <Image
              source={{ uri: mapTileUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <>
              <View style={styles.mapGridLineH} />
              <View style={styles.mapGridLineV} />
              <View style={styles.routeLine} />
              
              <View style={[styles.mapMarker, styles.originMarker]}>
                <Text style={styles.markerText}>{trip.startingPoint[0]}</Text>
              </View>
      
              <View style={[styles.mapMarker, styles.driverMarker]}>
                <View style={styles.driverPulse} />
                <MaterialIcons name="local-shipping" size={16} color={COLORS.onPrimary} />
              </View>
      
              <View style={[styles.mapMarker, styles.destMarker]}>
                <MaterialIcons name="place" size={20} color={COLORS.surface} />
              </View>
            </>
          )}
  
          {/* GPS Info Bubble overlay */}
          <View style={styles.gpsOverlay}>
            <View style={styles.gpsRow}>
              <MaterialIcons name="gps-fixed" size={16} color={COLORS.success} />
              <Text style={styles.gpsHeading}>LIVE GPS TELEMETRY</Text>
            </View>
            <Text style={styles.gpsData}>City: {location?.city || 'Locating...'}</Text>
            <Text style={styles.gpsData}>Coord: {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Scanning satellite...'}</Text>
            <Text style={styles.gpsTime}>Last Ping: {location?.lastUpdated || 'just now'}</Text>
          </View>
        </View>
  
        {/* Bottom Panel - Navigation details & Actions */}
        <View style={styles.bottomNavPanel}>
          <View style={styles.routeStatsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>REMAINING</Text>
              <Text style={styles.statValue}>{distanceText}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>EST. TIME</Text>
              <Text style={styles.statValue}>{durationText}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>ETA (DEPO)</Text>
              <Text style={styles.statValue}>{eta || '--:--'}</Text>
            </View>
          </View>
  
          {/* Info card of trip endpoints */}
          <View style={styles.tripStrip}>
            <Text style={styles.stripText} numberOfLines={1}>
              <Text style={styles.bold}>{trip.startingPoint}</Text> &rarr; <Text style={styles.bold}>{trip.destination}</Text>
            </Text>
            <Text style={styles.truckText}>{trip.vehicleNumber} ({trip.vehicleType})</Text>
          </View>
  
          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.expenseBtn} onPress={onAddExpensePress}>
              <MaterialIcons name="add-card" size={24} color={COLORS.primary} />
              <Text style={styles.expenseBtnText}>➕ EXPENSE</Text>
            </TouchableOpacity>
  
            <TouchableOpacity style={styles.googleMapsBtn} onPress={openGoogleMaps}>
              <MaterialIcons name="map" size={24} color={COLORS.onSecondaryContainer} />
              <Text style={styles.googleMapsText}>GOOGLE MAPS</Text>
            </TouchableOpacity>
          </View>
  
          {/* Simulation help */}
          <TouchableOpacity style={styles.arrivedShortcut} onPress={onArrivedPress}>
            <MaterialIcons name="check-circle" size={16} color={COLORS.success} />
            <Text style={styles.arrivedShortcutText}>Simulate Destination Arrival</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  guidanceBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    padding: SPACING.gutter,
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.light,
  },
  guidanceIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.orangeAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidanceTextContainer: {
    flex: 1,
  },
  guidanceInstruction: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.onPrimary,
  },
  guidanceSub: {
    fontSize: 12,
    color: COLORS.outlineVariant,
    marginTop: 2,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 90, // Space for bottom navigation tab bar overlays
  },
  mapCanvas: {
    height: 340, // Fixed height inside scrollable container
    backgroundColor: '#e5e7eb', // Map gray background
    position: 'relative',
    overflow: 'hidden',
  },
  mapGridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 40,
    backgroundColor: '#d1d5db',
    transform: [{ rotate: '-15deg' }],
  },
  mapGridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '40%',
    width: 32,
    backgroundColor: '#d1d5db',
    transform: [{ rotate: '30deg' }],
  },
  routeLine: {
    position: 'absolute',
    top: '30%',
    left: '20%',
    width: '60%',
    height: 8,
    backgroundColor: COLORS.secondary,
    borderRadius: 4,
    transform: [{ rotate: '40deg' }],
  },
  mapMarker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  originMarker: {
    top: '25%',
    left: '25%',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  markerText: {
    color: COLORS.onPrimary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  driverMarker: {
    top: '45%',
    left: '42%',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.orangeAccent,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  driverPulse: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.orangeAccent,
    opacity: 0.3,
  },
  destMarker: {
    top: '65%',
    left: '65%',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.error,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  gpsOverlay: {
    position: 'absolute',
    top: SPACING.gutter,
    left: SPACING.gutter,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    width: '65%',
    maxWidth: 260,
    ...SHADOWS.light,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  gpsHeading: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  gpsData: {
    fontSize: 12,
    color: COLORS.textDark,
    marginTop: 2,
  },
  gpsTime: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'right',
  },
  bottomNavPanel: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.gutter,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    ...SHADOWS.medium,
  },
  routeStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.gutter,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.outlineVariant,
  },
  tripStrip: {
    alignItems: 'center',
    marginBottom: SPACING.gutter,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    paddingBottom: SPACING.gutter,
  },
  stripText: {
    fontSize: 15,
    color: COLORS.textDark,
  },
  bold: {
    fontWeight: 'bold',
  },
  truckText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  expenseBtn: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  expenseBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  googleMapsBtn: {
    flex: 1,
    height: 56,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  googleMapsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.onSecondaryContainer,
  },
  arrivedShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 4,
  },
  arrivedShortcutText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
});
