import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { db, Trip, GPSLocation } from '../db/database';

interface StartTripScreenProps {
  trip: Trip;
  onTripStarted: () => void;
  onCancel: () => void;
}

export default function StartTripScreen({
  trip,
  onTripStarted,
  onCancel,
}: StartTripScreenProps) {
  const [step, setStep] = useState(1);
  
  // Step 1 states: Driver Name & Voice
  const [driverName, setDriverName] = useState(trip.driverName || '');
  const [isListening, setIsListening] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState('Driver Name will appear here...');
  const [isNameConfirmed, setIsNameConfirmed] = useState(false);

  // Step 2 states: Odometer & Diesel
  const [odometer, setOdometer] = useState('');
  const [odometerPhotoUri, setOdometerPhotoUri] = useState<string | null>(null);
  const [dieselLevel, setDieselLevel] = useState<'EMPTY' | '1/4' | '1/2' | '3/4' | 'FULL' | null>(null);
  
  const [loading, setLoading] = useState(false);

  const handleCapturePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setOdometerPhotoUri(result.assets[0].uri);
    }
  };

  useEffect(() => {
    if (trip.driverName) {
      setDriverName(trip.driverName);
      setTranscriptionText(trip.driverName);
      setIsNameConfirmed(true);
    }
  }, [trip]);

  // Simulated Voice recognition
  const handleVoiceInput = () => {
    if (isListening) {
      setIsListening(false);
      setTranscriptionText('Driver Name will appear here...');
      setIsNameConfirmed(false);
      return;
    }

    setIsListening(true);
    setTranscriptionText('Listening... (Tamil/English)');
    setIsNameConfirmed(false);

    // Simulate speech-to-text
    setTimeout(() => {
      setIsListening(false);
      // Mock result
      const mockNames = ['Ramesh Kumar', 'Rajesh Balaji', 'Srinivasan', 'Karthik Raja'];
      const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
      setDriverName(randomName);
      setTranscriptionText(randomName);
      setIsNameConfirmed(true);
    }, 2000);
  };

  const handleStep1Submit = () => {
    if (!driverName.trim()) {
      Alert.alert('Required', 'Please speak or enter your name.');
      return;
    }
    setStep(2);
  };

  const handleStartTrip = async () => {
    const odoNum = parseInt(odometer.trim());
    if (isNaN(odoNum) || odoNum <= 0) {
      Alert.alert('Required', 'Please enter a valid odometer reading.');
      return;
    }
    if (!odometerPhotoUri) {
      Alert.alert('Required', 'Please take a photo of the dashboard odometer.');
      return;
    }
    if (!dieselLevel) {
      Alert.alert('Required', 'Please select the current diesel level.');
      return;
    }

    setLoading(true);
    try {
      // 1. Get GPS Location
      let gps: GPSLocation = {
        latitude: 13.0827,
        longitude: 80.2707,
        city: 'Chennai',
        address: 'Guindy Industrial Estate, Chennai, Tamil Nadu',
        lastUpdated: new Date().toLocaleTimeString(),
      };

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        // Run with a 2-second timeout to prevent emulator hangs when GPS signal is unavailable
        const loc = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000))
        ]);

        if (loc) {
          // Simple mock reverse geocode
          gps = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            city: 'Current Location',
            address: `Lat: ${loc.coords.latitude.toFixed(4)}, Long: ${loc.coords.longitude.toFixed(4)}`,
            lastUpdated: new Date().toLocaleTimeString(),
          };

          try {
            const geocode = await Location.reverseGeocodeAsync({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
            if (geocode && geocode.length > 0) {
              const place = geocode[0];
              gps.city = place.city || place.subregion || 'Current Location';
              gps.address = `${place.name || ''}, ${place.street || ''}, ${place.city || ''}, ${place.postalCode || ''}`;
            }
          } catch (e) {
            console.log('Reverse geocoding error, using fallback coordinates');
          }
        }
      }

      // 2. Start Trip in database
      await db.startTrip(trip.id, driverName, odoNum, dieselLevel, gps, odometerPhotoUri!);
      
      // Voice guidance announcement
      try {
        Speech.speak(`Trip started successfully. Odometer reading is ${odoNum} kilometers. Please drive safely from ${trip.startingPoint} to ${trip.destination}.`, {
          language: 'en',
          rate: 0.9,
        });
      } catch (err) {
        console.log('Speech error:', err);
      }

      // 3. Complete and callback
      onTripStarted();
    } catch (e) {
      Alert.alert('Error', 'Failed to start the trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header (Transactional) */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onCancel}>
            <MaterialIcons name="arrow-back" size={28} color={COLORS.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Driver Console</Text>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step {step} of 2</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          {step === 1 ? (
            /* STEP 1: VOICE / NAME ENTRY */
            <View style={styles.content}>
              <Text style={styles.headline}>Who is driving?</Text>
              <Text style={styles.subheadline}>Start Trip - Authentication</Text>

              {/* Voice Interaction Hub */}
              <View style={styles.voiceHub}>
                <TouchableOpacity
                  style={[
                    styles.micBtn,
                    isListening && styles.micBtnActive
                  ]}
                  onPress={handleVoiceInput}
                >
                  {isListening && <View style={styles.pulseRing} />}
                  <MaterialIcons
                    name="mic"
                    size={48}
                    color={isListening ? COLORS.orangeAccent : COLORS.primary}
                  />
                </TouchableOpacity>
                <Text style={styles.micLabel}>Speak your name</Text>
                <Text style={styles.micSubLabel}>(English / Tamil)</Text>
              </View>

              {/* Transcription Output */}
              <View style={styles.transcriptionBox}>
                {isListening ? (
                  <ActivityIndicator color={COLORS.orangeAccent} style={{ marginBottom: 8 }} />
                ) : null}
                <Text style={[
                  styles.transcriptionText,
                  !isNameConfirmed && styles.italic
                ]}>
                  {transcriptionText}
                </Text>
              </View>

              {/* Text fallback input */}
              <View style={styles.inputContainer}>
                <Text style={styles.textLabel}>Or type your name manually</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter driver name"
                  value={driverName}
                  onChangeText={(text) => {
                    setDriverName(text);
                    setTranscriptionText(text || 'Driver Name will appear here...');
                    setIsNameConfirmed(text.length > 0);
                  }}
                />
              </View>

              {/* Next Step Action */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  !isNameConfirmed && styles.btnDisabled
                ]}
                onPress={handleStep1Submit}
                disabled={!isNameConfirmed}
              >
                <Text style={styles.submitBtnText}>CONTINUE</Text>
                <MaterialIcons name="arrow-forward" size={24} color={COLORS.onPrimary} />
              </TouchableOpacity>
            </View>
          ) : (
            /* STEP 2: ODOMETER & DIESEL LEVEL */
            <View style={styles.content}>
              <Text style={styles.headline}>Trip Details</Text>
              <Text style={styles.subheadline}>Verify Vehicle Initial State</Text>

              {/* Odometer Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>CURRENT ODOMETER READING (KM)</Text>
                <TextInput
                  style={styles.bigInput}
                  placeholder="Enter current KM"
                  keyboardType="number-pad"
                  value={odometer}
                  onChangeText={setOdometer}
                />
                <TouchableOpacity style={styles.photoBtn} onPress={handleCapturePhoto}>
                  <MaterialIcons name="camera-alt" size={24} color={COLORS.primary} />
                  <Text style={styles.photoBtnText}>
                    {odometerPhotoUri ? 'Retake Dashboard Photo' : 'Take Dashboard Photo'}
                  </Text>
                </TouchableOpacity>
                {odometerPhotoUri && (
                  <Image source={{ uri: odometerPhotoUri }} style={styles.previewImage} resizeMode="cover" />
                )}
              </View>

              {/* Diesel Level Picker */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>CURRENT DIESEL LEVEL</Text>
                <View style={styles.dieselGrid}>
                  {(['EMPTY', '1/4', '1/2', '3/4', 'FULL'] as const).map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.dieselOpt,
                        dieselLevel === level && styles.dieselOptActive
                      ]}
                      onPress={() => setDieselLevel(level)}
                    >
                      <Text style={[
                        styles.dieselOptText,
                        dieselLevel === level && styles.dieselOptTextActive
                      ]}>
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Start Trip Action */}
              <TouchableOpacity
                style={[
                  styles.startBtn,
                  loading && styles.btnDisabled
                ]}
                onPress={handleStartTrip}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.onPrimary} />
                ) : (
                  <>
                    <MaterialIcons name="local-shipping" size={28} color={COLORS.onPrimary} />
                    <Text style={styles.startBtnText}>START ACTIVE TRIP</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
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
    flex: 1,
  },
  stepBadge: {
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: SPACING.gutter,
    justifyContent: 'center',
  },
  content: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  headline: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
  },
  subheadline: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: SPACING.stack,
  },
  voiceHub: {
    alignItems: 'center',
    marginBottom: SPACING.stack,
  },
  micBtn: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...SHADOWS.light,
  },
  micBtnActive: {
    borderColor: COLORS.orangeAccent,
    backgroundColor: '#fff7ed',
  },
  pulseRing: {
    position: 'absolute',
    left: -8,
    top: -8,
    width: 122,
    height: 122,
    borderRadius: 61,
    borderWidth: 4,
    borderColor: COLORS.orangeAccent,
    opacity: 0.4,
  },
  micLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 14,
  },
  micSubLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  transcriptionBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 12,
    padding: SPACING.gutter,
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.stack,
  },
  transcriptionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  italic: {
    fontStyle: 'italic',
    fontWeight: 'normal',
    color: COLORS.textMuted,
  },
  inputContainer: {
    marginBottom: SPACING.stack,
  },
  textLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.textDark,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
    paddingLeft: 2,
  },
  bigInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    borderRadius: 12,
    height: SPACING.touchTargetLarge,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  dieselGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dieselOpt: {
    flex: 1,
    minWidth: '28%',
    height: 48,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dieselOptActive: {
    borderColor: COLORS.orangeAccent,
    backgroundColor: '#fff7ed',
  },
  dieselOptText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  dieselOptTextActive: {
    color: COLORS.onPrimary,
    fontWeight: 'bold',
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    padding: SPACING.md,
    borderRadius: 8,
    marginTop: SPACING.md,
    justifyContent: 'center',
  },
  photoBtnText: {
    marginLeft: SPACING.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  submitBtn: {
    height: SPACING.touchTarget,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.onPrimary,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  startBtn: {
    height: SPACING.touchTargetLarge,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  startBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.onPrimary,
  },
});
