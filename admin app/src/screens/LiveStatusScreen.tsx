import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { db, Trip, Expense, ActivityLog, normalizeImageUrl } from '../db/database';

export default function LiveStatusScreen() {
  const [searchId, setSearchId] = useState('5566'); // Default to Senthil Rajesh
  const [driverTrip, setDriverTrip] = useState<Trip | null>(null);
  const [allLogs, setAllLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchLiveStatus = async () => {
    if (!searchId.trim()) return;
    try {
      const [trips, logs] = await Promise.all([db.getTrips(), db.getActivityLogs()]);
      
      // Find active trip for driver
      const foundTrip = trips.find(
        t => t.driverId === searchId.trim() && t.status !== 'COMPLETED'
      ) || trips.find(t => t.driverId === searchId.trim()); // fallback to completed if no active

      setDriverTrip(foundTrip || null);
      
      // Filter logs for this driver
      const filteredLogs = logs.filter(l => l.driverId === searchId.trim());
      setAllLogs(filteredLogs);
      setSearched(true);
    } catch (e) {
      console.error('Error fetching live status:', e);
    }
  };

  useEffect(() => {
    fetchLiveStatus();
    const interval = setInterval(fetchLiveStatus, 6000); // Polling every 6s — db layer short-circuits repeated calls
    return () => clearInterval(interval);
  }, [searchId]);

  const handleSearchPress = () => {
    setLoading(true);
    fetchLiveStatus().then(() => setLoading(false));
  };

  const handleViewOnMap = (lat: number, lng: number, label: string) => {
    const query = encodeURIComponent(label);
    const url = Platform.select({
      ios: `maps:0,0?q=${query}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${query})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    });

    Linking.openURL(url).catch(() => {
      // Fallback to web maps URL
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    });
  };

  const getStatusColor = (status: Trip['status']) => {
    switch (status) {
      case 'ASSIGNED': return COLORS.textMuted;
      case 'STARTED':
      case 'ON_THE_WAY': return '#3b82f6';
      case 'REACHED_DESTINATION': return COLORS.secondary;
      case 'COMPLETED': return COLORS.success;
      default: return COLORS.textMuted;
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <View style={styles.inputWrapper}>
          <MaterialIcons name="search" size={20} color={COLORS.outline} style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Search Driver ID (e.g. 5566 or 4421)..."
            placeholderTextColor={COLORS.outline}
            keyboardType="numeric"
            value={searchId}
            onChangeText={setSearchId}
            onSubmitEditing={handleSearchPress}
          />
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearchPress}>
          <Text style={styles.searchBtnText}>TRACK</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        ) : !searched ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="my-location" size={64} color={COLORS.outline} />
            <Text style={styles.emptyTitle}>Enter Driver ID to Monitor</Text>
            <Text style={styles.emptyDesc}>Real-time GPS telemetry, status transitions, and expense logs will populate here.</Text>
          </View>
        ) : !driverTrip ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="location-off" size={64} color={COLORS.outline} />
            <Text style={styles.emptyTitle}>No Active Telemetry</Text>
            <Text style={styles.emptyDesc}>No trips assigned or recorded for Driver ID {searchId}.</Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            
            {/* 1. Driver Status Summary Card */}
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.driverName}>{driverTrip.driverName}</Text>
                  <Text style={styles.driverId}>ID: {driverTrip.driverId} | Lorry: {driverTrip.vehicleNumber}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(driverTrip.status) + '15' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(driverTrip.status) }]}>
                    {driverTrip.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              <View style={styles.routeBox}>
                <Text style={styles.routeText}><Text style={{ fontWeight: 'bold' }}>Route:</Text> {driverTrip.startingPoint} → {driverTrip.destination}</Text>
                <Text style={styles.routeText}><Text style={{ fontWeight: 'bold' }}>Trip ID:</Text> {driverTrip.id} | <Text style={{ fontWeight: 'bold' }}>Tracking ID:</Text> {driverTrip.trackingId}</Text>
              </View>

              {/* GPS coordinates panel */}
              {driverTrip.currentGPS && (
                <View style={styles.gpsPanel}>
                  <View style={styles.gpsHeader}>
                    <MaterialIcons name="gps-fixed" size={16} color={COLORS.secondary} />
                    <Text style={styles.gpsTitle}>Last GPS Telemetry Coordinates</Text>
                    <Text style={styles.gpsTime}>{driverTrip.currentGPS.lastUpdated}</Text>
                  </View>
                  <Text style={styles.gpsLocationName}>{driverTrip.currentGPS.city}</Text>
                  <Text style={styles.gpsAddress}>{driverTrip.currentGPS.address}</Text>
                  <Text style={styles.gpsCoords}>Lat: {driverTrip.currentGPS.latitude.toFixed(5)} | Lng: {driverTrip.currentGPS.longitude.toFixed(5)}</Text>
                  
                  <TouchableOpacity 
                    style={styles.mapLinkBtn}
                    onPress={() => handleViewOnMap(driverTrip.currentGPS!.latitude, driverTrip.currentGPS!.longitude, `${driverTrip.driverName} - Current Location`)}
                  >
                    <MaterialIcons name="map" size={16} color={COLORS.secondary} />
                    <Text style={styles.mapLinkText}>VIEW DRIVER POSITION ON MAP</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 2. Operations Telemetry */}
            <View style={styles.infoCard}>
              <Text style={styles.cardSectionTitle}>Vehicle Operating Readings</Text>
              <View style={styles.gridRow}>
                <View style={styles.gridCol}>
                  <Text style={styles.gridLabel}>ODOMETER START</Text>
                  <Text style={styles.gridValue}>{driverTrip.odometerStart ? `${driverTrip.odometerStart} km` : 'Pending'}</Text>
                </View>
                <View style={styles.gridCol}>
                  <Text style={styles.gridLabel}>ODOMETER END</Text>
                  <Text style={styles.gridValue}>{driverTrip.odometerEnd ? `${driverTrip.odometerEnd} km` : 'Active'}</Text>
                </View>
              </View>
              <View style={styles.gridRow}>
                <View style={styles.gridCol}>
                  <Text style={styles.gridLabel}>DIESEL START LEVEL</Text>
                  <Text style={styles.gridValue}>{driverTrip.dieselStart || 'Pending'}</Text>
                </View>
                <View style={styles.gridCol}>
                  <Text style={styles.gridLabel}>DIESEL END LEVEL</Text>
                  <Text style={styles.gridValue}>{driverTrip.dieselEnd || 'Active'}</Text>
                </View>
              </View>
              {driverTrip.odometerStartPhotoUri ? (
                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.outlineVariant }}>
                  <Text style={[styles.gridLabel, { marginBottom: 6 }]}>📸 INITIAL ODOMETER DASHBOARD PHOTO</Text>
                  <Image
                    source={{ uri: normalizeImageUrl(driverTrip.odometerStartPhotoUri) || driverTrip.odometerStartPhotoUri }}
                    style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 8 }}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={{ marginTop: 6 }}
                    onPress={() => Linking.openURL(normalizeImageUrl(driverTrip.odometerStartPhotoUri) || driverTrip.odometerStartPhotoUri!)}
                  >
                    <Text style={{ color: COLORS.secondary, fontSize: 11, fontWeight: 'bold' }}>VIEW FULL DASHBOARD IMAGE ↗</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {/* 3. Location-Enabled Expenses Logs */}
            <View style={styles.infoCard}>
              <Text style={styles.cardSectionTitle}>Operating Expenses & Coordinates</Text>
              {driverTrip.expenses?.length === 0 ? (
                <Text style={styles.emptyText}>No expenses logged on this trip.</Text>
              ) : (
                driverTrip.expenses.map((exp) => (
                  <View key={exp.id} style={styles.expenseRow}>
                    <View style={styles.expenseMain}>
                      <View style={styles.expenseHead}>
                        <Text style={styles.expenseCat}>{exp.category}</Text>
                        <Text style={styles.expenseAmount}>₹{exp.amount}</Text>
                      </View>
                      {exp.reason ? <Text style={styles.expenseReason}>{exp.reason}</Text> : null}
                      {exp.liters ? <Text style={styles.expenseReason}>{exp.liters} Liters</Text> : null}
                      <Text style={styles.expenseTime}>{exp.timestamp}</Text>
                    </View>
                    
                    {exp.location && (
                      <View style={styles.expenseLocationBlock}>
                        <View style={styles.locHeader}>
                          <MaterialIcons name="pin-drop" size={14} color={COLORS.secondary} />
                          <Text style={styles.locCity}>{exp.location.city}</Text>
                        </View>
                        <Text style={styles.locAddress}>{exp.location.address}</Text>
                        <TouchableOpacity 
                          style={styles.expenseMapBtn}
                          onPress={() => handleViewOnMap(exp.location!.latitude, exp.location!.longitude, `${exp.category} Expense - ${exp.location!.city}`)}
                        >
                          <Text style={styles.expenseMapText}>VIEW ON MAP</Text>
                          <MaterialIcons name="open-in-new" size={10} color={COLORS.secondary} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>

            {/* 4. Proof of Delivery (POD) Section */}
            {(driverTrip.podSubmitted || driverTrip.podPhotoUri || driverTrip.podSignature || driverTrip.podNotes) ? (
              <View style={styles.infoCard}>
                <Text style={styles.cardSectionTitle}>Proof of Delivery (POD)</Text>
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 'bold' }}>POD STATUS:</Text>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: COLORS.success }}>POD UPLOADED ✓</Text>
                  </View>

                  {driverTrip.podPhotoUri ? (
                    <View style={{ marginTop: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 6 }}>📸 Delivery Photo:</Text>
                      <Image
                        source={{ uri: normalizeImageUrl(driverTrip.podPhotoUri) || driverTrip.podPhotoUri }}
                        style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 8, borderWidth: 1, borderColor: COLORS.outlineVariant }}
                        resizeMode="contain"
                      />
                      <TouchableOpacity
                        style={{ marginTop: 6, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            const imageUrl = normalizeImageUrl(driverTrip.podPhotoUri);
                            if (imageUrl) window.open(imageUrl, '_blank');
                          } else {
                            const imageUrl = normalizeImageUrl(driverTrip.podPhotoUri);
                            if (imageUrl) Linking.openURL(imageUrl).catch(() => {});
                          }
                        }}
                      >
                        <MaterialIcons name="open-in-new" size={14} color={COLORS.secondary} />
                        <Text style={{ color: COLORS.secondary, fontSize: 11, fontWeight: 'bold' }}>VIEW FULL POD IMAGE ↗</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {driverTrip.podSignature ? (
                    (driverTrip.podSignature.startsWith('data:image/') ||
                     driverTrip.podSignature.startsWith('http://') ||
                     driverTrip.podSignature.startsWith('https://') ||
                     driverTrip.podSignature.startsWith('blob:') ||
                     driverTrip.podSignature.startsWith('file://') ||
                     driverTrip.podSignature.startsWith('/uploads/')) ? (
                      <View style={{ marginTop: 6 }}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 4 }}>✍️ Driver / Receiver Signature:</Text>
                        <Image
                          source={{ uri: normalizeImageUrl(driverTrip.podSignature) }}
                          style={{ maxWidth: 220, width: '100%', aspectRatio: 220 / 75, borderRadius: 6, borderWidth: 1, borderColor: COLORS.outlineVariant, backgroundColor: '#ffffff' }}
                          resizeMode="contain"
                        />
                      </View>
                    ) : (
                      <Text style={{ fontSize: 12, color: COLORS.textDark }}>
                        <Text style={{ fontWeight: 'bold' }}>Signature:</Text> {driverTrip.podSignature}
                      </Text>
                    )
                  ) : null}

                  {driverTrip.podNotes ? (
                    <Text style={{ fontSize: 12, color: COLORS.textDark }}>
                      <Text style={{ fontWeight: 'bold' }}>Delivery Notes:</Text> {driverTrip.podNotes}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* 5. Live Updates Feed for this Driver */}
            <View style={styles.infoCard}>
              <Text style={styles.cardSectionTitle}>Driver Timeline Activity</Text>
              {allLogs.length === 0 ? (
                <Text style={styles.emptyText}>Awaiting logs...</Text>
              ) : (
                allLogs.map((log) => (
                  <View key={log.id} style={styles.logItem}>
                    <View style={styles.logBullet} />
                    <View style={styles.logTextContent}>
                      <View style={styles.logMeta}>
                        <Text style={styles.logAction}>{log.action.replace('_', ' ')}</Text>
                        <Text style={styles.logTimestamp}>{log.timestamp}</Text>
                      </View>
                      {log.details ? <Text style={styles.logDetails}>{log.details}</Text> : null}
                    </View>
                  </View>
                ))
              )}
            </View>

          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchBar: {
    flexDirection: 'row',
    padding: SPACING.gutter,
    backgroundColor: COLORS.primary,
    gap: 8,
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 6,
    height: 44,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  searchBtn: {
    backgroundColor: COLORS.secondary,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.light,
  },
  searchBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: SPACING.gutter,
    paddingBottom: 96,
  },
  loader: {
    marginVertical: 48,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    ...SHADOWS.light,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    paddingBottom: 10,
    marginBottom: 10,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  driverId: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  routeBox: {
    backgroundColor: COLORS.surfaceContainerLow,
    padding: 10,
    borderRadius: 6,
    gap: 4,
    marginBottom: 12,
  },
  routeText: {
    fontSize: 12,
    color: COLORS.textDark,
  },
  gpsPanel: {
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 6,
    padding: 12,
    backgroundColor: COLORS.background,
  },
  gpsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  gpsTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.primary,
    flex: 1,
  },
  gpsTime: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  gpsLocationName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  gpsAddress: {
    fontSize: 11,
    color: COLORS.textDark,
    marginTop: 2,
  },
  gpsCoords: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
  },
  mapLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    borderRadius: 6,
    height: 36,
  },
  mapLinkText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    paddingBottom: 8,
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 12,
  },
  gridCol: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerLow,
    padding: 10,
    borderRadius: 6,
  },
  gridLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginTop: 2,
  },
  expenseRow: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    paddingVertical: 12,
  },
  expenseMain: {
    gap: 2,
  },
  expenseHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseCat: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  expenseAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#b91c1c',
  },
  expenseReason: {
    fontSize: 12,
    color: COLORS.textDark,
  },
  expenseTime: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  expenseLocationBlock: {
    marginTop: 8,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 6,
    padding: 8,
    gap: 2,
  },
  locHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locCity: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  locAddress: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  expenseMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  expenseMapText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  logItem: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
  },
  logBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.secondary,
    marginTop: 6,
  },
  logTextContent: {
    flex: 1,
  },
  logMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logAction: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  logTimestamp: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  logDetails: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginVertical: 12,
    fontStyle: 'italic',
  },
});
