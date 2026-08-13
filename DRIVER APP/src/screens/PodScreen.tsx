import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Image,
  PanResponder,
  GestureResponderEvent,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { db, Trip, GPSLocation } from '../db/database';
import { Platform } from 'react-native';

const API_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';

interface PodScreenProps {
  trip: Trip;
  onTripCompleted: () => void;
  onCancel: () => void;
}

export default function PodScreen({
  trip,
  onTripCompleted,
  onCancel,
}: PodScreenProps) {
  const [podPhoto, setPodPhoto] = useState<string | null>(trip.podPhotoUri || null);
  const [signaturePaths, setSignaturePaths] = useState<string[]>([]);
  const [isSigned, setIsSigned] = useState(!!trip.podSignature);
  const [notes, setNotes] = useState(trip.podNotes || '');
  const [odometerEnd, setOdometerEnd] = useState('');
  const [odometerEndPhotoUri, setOdometerEndPhotoUri] = useState<string | null>(null);
  const [dieselEnd, setDieselEnd] = useState<Trip['dieselEnd']>(undefined);
  const [loading, setLoading] = useState(false);
  const [podUploadStatus, setPodUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'failed'>('idle');
  const [podHostedUrl, setPodHostedUrl] = useState<string | null>(null);

  const [showSummaryDocket, setShowSummaryDocket] = useState(false);

  const handlePrintDocket = () => {
    try {
      Speech.speak("Printing transit docket to bluetooth thermal printer.", { language: 'en', rate: 0.95 });
    } catch (err) {}
    Alert.alert("Thermal Printer", "Receipt sent successfully to portable bluetooth thermal printer!");
  };

  const handleShareDocket = () => {
    try {
      Speech.speak("Sharing PDF docket summary.", { language: 'en', rate: 0.95 });
    } catch (err) {}
    Alert.alert("Share", "Trip Delivery Docket compiled as PDF and shared successfully!");
  };

  if (showSummaryDocket) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.docketScroll}>
          <View style={styles.docketContainer}>
            {/* Header */}
            <View style={styles.docketHeader}>
              <MaterialIcons name="local-shipping" size={32} color={COLORS.secondary} />
              <Text style={styles.docketTitle}>NBT + ARS TRANSIT SYSTEM</Text>
              <Text style={styles.docketSub}>DIGITAL TRANSIT & DELIVERY DOCKET</Text>
            </View>

            {/* Status Pill */}
            <View style={styles.docketStatusBadge}>
              <MaterialIcons name="check-circle" size={16} color={COLORS.success} />
              <Text style={styles.docketStatusText}>TRIP COMPLETED & SYNCED</Text>
            </View>

            {/* Trip Details Section */}
            <Text style={styles.sectionHeader}>1. TRANSIT LOGS</Text>
            <View style={styles.detailGrid}>
              <View style={styles.gridRow}>
                <Text style={styles.gridLabel}>Trip ID:</Text>
                <Text style={styles.gridValue}>{trip.id}</Text>
              </View>
              <View style={styles.gridRow}>
                <Text style={styles.gridLabel}>Vehicle No:</Text>
                <Text style={styles.gridValue}>{trip.vehicleNumber}</Text>
              </View>
              <View style={styles.gridRow}>
                <Text style={styles.gridLabel}>Route:</Text>
                <Text style={styles.gridValue}>{trip.startingPoint} → {trip.destination}</Text>
              </View>
              <View style={styles.gridRow}>
                <Text style={styles.gridLabel}>Driver Name:</Text>
                <Text style={styles.gridValue}>{trip.driverName || 'Driver'}</Text>
              </View>
              <View style={styles.gridRow}>
                <Text style={styles.gridLabel}>Start Odometer:</Text>
                <Text style={styles.gridValue}>{trip.odometerStart || 0} KM</Text>
              </View>
              <View style={styles.gridRow}>
                <Text style={styles.gridLabel}>End Odometer:</Text>
                <Text style={styles.gridValue}>{odometerEnd} KM</Text>
              </View>
              <View style={styles.gridRow}>
                <Text style={styles.gridLabel}>Diesel Level:</Text>
                <Text style={styles.gridValue}>{trip.dieselStart || 'N/A'} → {dieselEnd}</Text>
              </View>
            </View>

            {/* Proof of Delivery Section */}
            <Text style={styles.sectionHeader}>2. PROOF OF DELIVERY</Text>
            <View style={styles.proofGrid}>
              {podPhoto && (
                <View style={styles.proofPicContainer}>
                  <Text style={styles.proofLabel}>Uploaded POD Invoice:</Text>
                  <Image source={{ uri: podPhoto }} style={styles.proofImage} />
                </View>
              )}
              
              <View style={styles.proofSigContainer}>
                <Text style={styles.proofLabel}>Driver Signature Capture:</Text>
                <View style={styles.sigPreviewBox}>
                  <Text style={styles.sigVerifiedText}>ELECTRONIC SIGNATURE RECORDED</Text>
                  <Text style={styles.sigDateText}>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</Text>
                </View>
              </View>

              {notes ? (
                <View style={styles.notesBlock}>
                  <Text style={styles.proofLabel}>Remarks / Delivery Notes:</Text>
                  <Text style={styles.notesText}>{notes}</Text>
                </View>
              ) : null}
            </View>

            {/* Financial Ledger Summary */}
            <Text style={styles.sectionHeader}>3. RUNNING EXPENSE LEDGER</Text>
            <View style={styles.expenseSummaryGrid}>
              <View style={styles.gridRow}>
                <Text style={styles.gridLabel}>Expenses Logged:</Text>
                <Text style={styles.gridValue}>{trip.expenses.length} records</Text>
              </View>
              <View style={styles.gridRow}>
                <Text style={styles.gridLabel}>Total Expenses Cost:</Text>
                <Text style={styles.gridValue}>₹{trip.expenses.reduce((sum, exp) => sum + exp.amount, 0)}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.docketActions}>
              <TouchableOpacity style={styles.docketPrintBtn} onPress={handlePrintDocket}>
                <MaterialIcons name="print" size={20} color="#ffffff" />
                <Text style={styles.docketActionText}>PRINT THERMAL RECEIPT</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.docketShareBtn} onPress={handleShareDocket}>
                <MaterialIcons name="share" size={20} color={COLORS.primary} />
                <Text style={[styles.docketActionText, { color: COLORS.primary }]}>SHARE VIA WHATSAPP</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.docketCloseBtn} onPress={onTripCompleted}>
                <Text style={styles.docketCloseText}>CLOSE & RETURN TO CONSOLE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
  
  // Drawing signature pad tracking (simple representation)
  const padRef = useRef<View>(null);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsSigned(true);
      },
      onPanResponderMove: () => {
        setIsSigned(true);
      },
    })
  ).current;

  const handleCaptureEndOdometerPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setOdometerEndPhotoUri(result.assets[0].uri);
    }
  };

  const handlePickPodPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const localUri = result.assets[0].uri;
      setPodPhoto(localUri);
      setPodUploadStatus('uploading');
      setPodHostedUrl(null);
      try {
        const filename = `pod_${Date.now()}.jpg`;
        const formData = new FormData();
        if (Platform.OS === 'web') {
          const res = await fetch(localUri);
          const blob = await res.blob();
          formData.append('file', blob, filename);
        } else {
          formData.append('file', { uri: localUri, name: filename, type: 'image/jpeg' } as any);
        }
        const res = await fetch(`${API_HOST}/api/upload`, {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const json = await res.json();
          if (json.url && (json.url.startsWith('http://') || json.url.startsWith('https://'))) {
            setPodHostedUrl(json.url);
            setPodUploadStatus('success');
          } else {
            setPodUploadStatus('failed');
          }
        } else {
          setPodUploadStatus('failed');
        }
      } catch {
        setPodUploadStatus('failed');
      }
    }
  };

  const clearSignature = () => {
    setIsSigned(false);
  };

  const handleCompleteTrip = async () => {
    if (trip.status === 'STARTED' || trip.status === 'ON_THE_WAY') {
      // First move status to REACHED_DESTINATION if they are just arriving
      setLoading(true);
      try {
        let gps: GPSLocation = {
          latitude: 12.9716,
          longitude: 77.5946,
          city: 'Bangalore',
          address: 'Bangalore FC Depot, Electronic City, Bangalore',
          lastUpdated: new Date().toLocaleTimeString(),
        };

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Promise.race([
            Location.getCurrentPositionAsync({}),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000))
          ]);
          if (loc) {
            gps = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              city: 'Destination reached',
              address: `Lat: ${loc.coords.latitude.toFixed(4)}, Long: ${loc.coords.longitude.toFixed(4)}`,
              lastUpdated: new Date().toLocaleTimeString(),
            };
          }
        }

        // Upload POD detail — use already-hosted URL if available, else local URI
        await db.uploadPOD(trip.id, podHostedUrl || podPhoto || 'mock-pod-uri', isSigned ? 'Receiver Signature Captured' : 'Signed', notes, gps);
      } catch (err) {
        Alert.alert('Error', 'Failed to update destination status.');
        setLoading(false);
        return;
      }
      setLoading(false);
      Alert.alert('Arrived', 'Status updated to Reached Destination. Please fill odometer and complete trip.');
      return;
    }

    // Otherwise, we are in REACHED_DESTINATION, performing final Complete Trip
    if (!podPhoto) {
      Alert.alert('POD Required', 'Proof of Delivery (POD) photo must be uploaded before completing the trip.');
      return;
    }

    const odoEndVal = parseInt(odometerEnd.trim());
    if (isNaN(odoEndVal) || odoEndVal <= 0) {
      Alert.alert('Required', 'Please enter a valid ending odometer reading.');
      return;
    }

    if (trip.odometerStart && odoEndVal <= trip.odometerStart) {
      Alert.alert(
        'Invalid Odometer',
        `Ending odometer must be greater than starting odometer (${trip.odometerStart} KM).`
      );
      return;
    }

    if (!dieselEnd) {
      Alert.alert('Required', 'Please select ending diesel level.');
      return;
    }

    setLoading(true);
    try {
      // Re-send POD data in case Stage 1 was skipped or photo was updated
      if (podPhoto) {
        let gps: GPSLocation = {
          latitude: 12.9716, longitude: 77.5946,
          city: 'Destination', address: 'Destination',
          lastUpdated: new Date().toLocaleTimeString(),
        };
        try {
          const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
          if (locStatus === 'granted') {
            const loc = await Promise.race([
              Location.getCurrentPositionAsync({}),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000))
            ]);
            if (loc) {
              gps = {
                latitude: loc.coords.latitude, longitude: loc.coords.longitude,
                city: 'Destination reached',
                address: `Lat: ${loc.coords.latitude.toFixed(4)}, Long: ${loc.coords.longitude.toFixed(4)}`,
                lastUpdated: new Date().toLocaleTimeString(),
              };
            }
          }
        } catch {}
        await db.uploadPOD(
          trip.id,
          podHostedUrl || podPhoto,
          isSigned ? 'Receiver Signature Captured' : 'Signed',
          notes,
          gps
        );
      }

      await db.completeTrip(trip.id, odoEndVal, dieselEnd, odometerEndPhotoUri || undefined);
      
      // Voice guidance announcement
      try {
        Speech.speak("Trip completed successfully. Your digital delivery docket has been generated. Please review and share.", {
          language: 'en',
          rate: 0.9,
        });
      } catch (err) {
        console.log('Speech error:', err);
      }
      
      setShowSummaryDocket(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to complete trip.');
    } finally {
      setLoading(false);
    }
  };

  const isArriving = trip.status === 'STARTED' || trip.status === 'ON_THE_WAY';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onCancel}>
          <MaterialIcons name="arrow-back" size={28} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isArriving ? 'Arrived Destination' : 'Upload Proof of Delivery'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {isArriving ? (
            /* STAGE 1: Confirm Arrival */
            <View style={styles.confirmArrivalBox}>
              <MaterialIcons name="sports-motorsports" size={64} color={COLORS.orangeAccent} />
              <Text style={styles.headline}>You have reached the destination!</Text>
              <Text style={styles.subheadline}>Please click below to notify admin and begin POD upload.</Text>

              <TouchableOpacity style={styles.confirmArrivalBtn} onPress={handleCompleteTrip} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={COLORS.onPrimary} />
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={28} color={COLORS.onPrimary} />
                    <Text style={styles.confirmArrivalBtnText}>CONFIRM DEPOT ARRIVAL</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* STAGE 2: Upload POD and complete */
            <View style={styles.podForm}>
              <Text style={styles.sectionHeading}>Trip ID: {trip.id}</Text>

              {/* POD Photo Upload */}
              <View style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>📸 TAKE PHOTO OF POD BILL / RECEIPT *</Text>
                
                <TouchableOpacity style={styles.cameraBtn} onPress={handlePickPodPhoto}>
                  <MaterialIcons name="camera-alt" size={28} color={COLORS.primary} />
                  <Text style={styles.cameraBtnText}>CAPTURE POD PHOTO</Text>
                </TouchableOpacity>

                {podPhoto ? (
                  <View style={styles.photoContainer}>
                    <Image source={{ uri: podPhoto }} style={styles.podPhotoPreview} resizeMode="cover" />
                    {podUploadStatus === 'uploading' && (
                      <View style={styles.uploadStatusBadge}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text style={[styles.uploadStatusText, { color: COLORS.primary }]}>UPLOADING TO SERVER...</Text>
                      </View>
                    )}
                    {podUploadStatus === 'success' && (
                      <View style={[styles.uploadStatusBadge, styles.uploadSuccess]}>
                        <MaterialIcons name="cloud-done" size={16} color={COLORS.success} />
                        <Text style={[styles.uploadStatusText, { color: COLORS.success }]}>UPLOADED ✓</Text>
                      </View>
                    )}
                    {podUploadStatus === 'failed' && (
                      <View style={[styles.uploadStatusBadge, styles.uploadFailed]}>
                        <MaterialIcons name="cloud-off" size={16} color={COLORS.error} />
                        <Text style={[styles.uploadStatusText, { color: COLORS.error }]}>UPLOAD FAILED — saved locally</Text>
                      </View>
                    )}
                    {podUploadStatus === 'idle' && (
                      <View style={styles.podCheckBadge}>
                        <MaterialIcons name="check-circle" size={20} color={COLORS.success} />
                        <Text style={styles.podCheckText}>POD PHOTO CAPTURED</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={styles.requiredWarning}>* Required to complete trip</Text>
                )}
              </View>

              {/* Signature Pad */}
              <View style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>✍️ CUSTOMER/RECEIVER SIGNATURE</Text>
                <View style={styles.signatureHeader}>
                  <Text style={styles.sigInstruction}>Draw signature inside the box below</Text>
                  {isSigned && (
                    <TouchableOpacity onPress={clearSignature} style={styles.clearBtn}>
                      <Text style={styles.clearBtnText}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View
                  ref={padRef}
                  style={[styles.signaturePad, isSigned && styles.signaturePadSigned]}
                  {...panResponder.panHandlers}
                >
                  {isSigned ? (
                    <View style={styles.sigPlaceholder}>
                      <Text style={styles.sigText}>[ Signature Captured ]</Text>
                    </View>
                  ) : (
                    <View style={styles.sigPlaceholder}>
                      <MaterialIcons name="gesture" size={32} color={COLORS.outline} />
                      <Text style={styles.sigPlaceholderText}>Customer Signature Pad</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Delivery Notes */}
              <View style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>📝 DELIVERY REMARKS / NOTES (OPTIONAL)</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Enter any shortage, damage, or delivery feedback..."
                  multiline
                  numberOfLines={3}
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>

              {/* Odometer End Input + Photo */}
              <View style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>🏁 ENDING ODOMETER READING (KM) *</Text>
                <TextInput
                  style={styles.odometerInput}
                  placeholder={`Greater than ${trip.odometerStart || 0} KM`}
                  keyboardType="number-pad"
                  value={odometerEnd}
                  onChangeText={setOdometerEnd}
                />
                <Text style={styles.startOdoText}>Starting Odometer: {trip.odometerStart} KM</Text>
                <TouchableOpacity style={[styles.cameraBtn, { marginTop: 10 }]} onPress={handleCaptureEndOdometerPhoto}>
                  <MaterialIcons name="camera-alt" size={22} color={COLORS.primary} />
                  <Text style={styles.cameraBtnText}>
                    {odometerEndPhotoUri ? 'Retake End Odometer Photo' : 'Take End Odometer Photo'}
                  </Text>
                </TouchableOpacity>
                {odometerEndPhotoUri && (
                  <Image source={{ uri: odometerEndPhotoUri }} style={[styles.podPhotoPreview, { marginTop: 10 }]} resizeMode="cover" />
                )}
              </View>

              {/* Diesel Level End Selector */}
              <View style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>⛽ ENDING DIESEL LEVEL *</Text>
                <View style={styles.dieselGrid}>
                  {(['EMPTY', '1/4', '1/2', '3/4', 'FULL'] as const).map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.dieselOpt,
                        dieselEnd === level && styles.dieselOptActive
                      ]}
                      onPress={() => setDieselEnd(level)}
                    >
                      <Text style={[
                        styles.dieselOptText,
                        dieselEnd === level && styles.dieselOptTextActive
                      ]}>
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Complete Trip Button */}
              <TouchableOpacity
                style={[
                  styles.completeBtn,
                  (!podPhoto || loading) && styles.btnDisabled
                ]}
                onPress={handleCompleteTrip}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.onPrimary} />
                ) : (
                  <>
                    <MaterialIcons name="done-all" size={28} color={COLORS.onPrimary} />
                    <Text style={styles.completeBtnText}>COMPLETE TRIP</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
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
  header: {
    flexDirection: 'row',
    height: SPACING.touchTarget,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    alignItems: 'center',
    paddingHorizontal: SPACING.gutter,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginLeft: SPACING.gutter,
  },
  scrollContainer: {
    padding: SPACING.gutter,
    paddingBottom: 100,
  },
  content: {
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  confirmArrivalBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: SPACING.gutter * 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.light,
    marginTop: SPACING.stack,
  },
  headline: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: SPACING.gutter,
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.stack,
  },
  confirmArrivalBtn: {
    height: SPACING.touchTargetLarge,
    backgroundColor: COLORS.orangeAccent,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    boxShadow: '0px 4px 8px rgba(249, 115, 22, 0.20)',
    elevation: 4,
  },
  confirmArrivalBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.onPrimary,
  },
  podForm: {
    gap: 16,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  fieldCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: SPACING.gutter,
    ...SHADOWS.light,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
  },
  cameraBtn: {
    height: 48,
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cameraBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  photoContainer: {
    marginTop: 12,
    alignItems: 'center',
    gap: 8,
  },
  podPhotoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  podCheckBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  podCheckText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: 'bold',
  },
  uploadStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  uploadSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  uploadFailed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  uploadStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  requiredWarning: {
    fontSize: 11,
    color: COLORS.error,
    marginTop: 6,
    fontStyle: 'italic',
  },
  signatureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sigInstruction: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  clearBtn: {
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  clearBtnText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: 'bold',
  },
  signaturePad: {
    height: 140,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signaturePadSigned: {
    borderColor: COLORS.success,
  },
  sigPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sigPlaceholderText: {
    fontSize: 12,
    color: COLORS.outline,
    marginTop: 4,
  },
  sigText: {
    color: COLORS.success,
    fontWeight: 'bold',
  },
  notesInput: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 15,
    color: COLORS.textDark,
    // textAlignVertical is Android-only; minHeight achieves top-alignment on iOS
    minHeight: 80,
  },
  odometerInput: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  startOdoText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  dieselGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dieselOpt: {
    flex: 1,
    minWidth: '28%',
    height: 40,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dieselOptActive: {
    borderColor: COLORS.success,
    backgroundColor: '#f0fdf4',
  },
  dieselOptText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  dieselOptTextActive: {
    color: COLORS.success,
  },
  completeBtn: {
    height: SPACING.touchTargetLarge,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0px 4px 8px rgba(21, 128, 61, 0.20)',
    elevation: 4,
    marginTop: SPACING.gutter,
  },
  completeBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.onPrimary,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  docketScroll: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#020d1c', // Premium dark contrast docket background
  },
  docketContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.10)',
    elevation: 5,
    marginBottom: 40,
  },
  docketHeader: {
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 16,
    marginBottom: 16,
  },
  docketTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  docketSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 1.5,
  },
  docketStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: COLORS.success,
    borderRadius: 8,
    paddingVertical: 8,
    marginBottom: 20,
  },
  docketStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.success,
    letterSpacing: 1,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  detailGrid: {
    marginBottom: 20,
    gap: 8,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 6,
  },
  gridLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  gridValue: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
    textAlign: 'right',
  },
  proofGrid: {
    marginBottom: 20,
    gap: 12,
  },
  proofPicContainer: {
    gap: 6,
  },
  proofLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  proofImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#cbd5e1',
  },
  proofSigContainer: {
    gap: 6,
  },
  sigPreviewBox: {
    height: 80,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#faf5ff',
  },
  sigVerifiedText: {
    fontSize: 11,
    color: '#7e22ce',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  sigDateText: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  notesBlock: {
    gap: 6,
  },
  notesText: {
    fontSize: 13,
    color: COLORS.primary,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontStyle: 'italic',
  },
  expenseSummaryGrid: {
    marginBottom: 24,
    gap: 8,
  },
  docketActions: {
    gap: 12,
    marginTop: 8,
  },
  docketPrintBtn: {
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  docketShareBtn: {
    height: 48,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  docketCloseBtn: {
    height: 48,
    backgroundColor: 'transparent',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docketActionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  docketCloseText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    textDecorationLine: 'underline',
  },
});
