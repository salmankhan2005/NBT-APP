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
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { db, Trip, GPSLocation } from '../db/database';
import { reverseGeocodeLocation } from '../services/openStreetMapService';

interface StartTripScreenProps {
  trip: Trip;
  onTripStarted: () => void;
  onCancel: () => void;
}

type VoiceLanguage = 'en-IN' | 'ta-IN';

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
  const [voiceLanguage, setVoiceLanguage] = useState<VoiceLanguage>('ta-IN');
  const [voiceError, setVoiceError] = useState('');

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
      mediaTypes: ['images'],
      quality: 0.5,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setOdometerPhotoUri(result.assets[0].uri);
    }
  };

  const handleChooseOdometerPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
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

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setVoiceError('');
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript?.trim();
    if (!transcript) return;
    setDriverName(transcript);
    setTranscriptionText(transcript);
    setIsNameConfirmed(event.isFinal);
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    if (event.error !== 'aborted') {
      setVoiceError(event.error === 'no-speech'
        ? 'No speech detected. Tap the microphone and speak again.'
        : 'Voice input was not available. Allow microphone access and try again.');
    }
  });

  const handleVoiceInput = async () => {
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    setVoiceError('');
    setTranscriptionText('Listening... (Tamil/English)');
    setIsNameConfirmed(false);
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setVoiceError(Platform.OS === 'web'
          ? 'Microphone is blocked for this local page. Allow it in browser site settings, then reload.'
          : 'Microphone permission is blocked. Allow it in Android Settings, then try again.');
        setTranscriptionText('Driver Name will appear here...');
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: voiceLanguage,
        interimResults: true,
        continuous: false,
        maxAlternatives: 3,
        addsPunctuation: false,
        contextualStrings: ['driver', 'name', 'Senthil', 'Rajesh', 'Ramesh', 'Karthik'],
      });
    } catch {
      setIsListening(false);
      setVoiceError('Could not start voice input. Please try again.');
      setTranscriptionText('Driver Name will appear here...');
    }
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
        let loc = await Location.getLastKnownPositionAsync({});
        if (!loc || !loc.coords) {
          loc = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
            new Promise<Location.LocationObject | null>((resolve) => setTimeout(() => resolve(null), 8000))
          ]);
        }

        if (loc && loc.coords) {
          gps = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            city: 'Current Location',
            address: `Lat: ${loc.coords.latitude.toFixed(5)}, Long: ${loc.coords.longitude.toFixed(5)}`,
            lastUpdated: new Date().toLocaleTimeString(),
          };

          try {
            const geoRes = await reverseGeocodeLocation(loc.coords.latitude, loc.coords.longitude);
            if (geoRes) {
              gps.city = geoRes.city || 'Current Location';
              gps.address = geoRes.formattedAddress || gps.address;
            }
          } catch (e) {
            console.log('Reverse geocoding error, using fallback coordinates');
          }
        }
      }

      // 2. Start Trip in database
      const started = await db.startTrip(trip.id, driverName, odoNum, dieselLevel, gps, odometerPhotoUri!);
      if (!started) {
        throw new Error('The server did not accept the trip start request.');
      }
      
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
                <View style={styles.voiceLanguageRow}>
                  <Text style={styles.voiceLanguageLabel}>SPEAK IN</Text>
                  {(['ta-IN', 'en-IN'] as VoiceLanguage[]).map((language) => (
                    <TouchableOpacity
                      key={language}
                      style={[styles.voiceLanguageBtn, voiceLanguage === language && styles.voiceLanguageBtnActive]}
                      onPress={() => setVoiceLanguage(language)}
                      disabled={isListening}
                    >
                      <Text style={[styles.voiceLanguageText, voiceLanguage === language && styles.voiceLanguageTextActive]}>
                        {language === 'ta-IN' ? 'TAMIL' : 'ENGLISH'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
                {voiceError ? <Text style={styles.voiceError}>{voiceError}</Text> : null}
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
                <TouchableOpacity style={styles.photoBtn} onPress={handleChooseOdometerPhoto}>
                  <MaterialIcons name="photo-library" size={24} color={COLORS.primary} />
                  <Text style={styles.photoBtnText}>Choose Dashboard Photo</Text>
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
  voiceLanguageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  voiceLanguageLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '800',
    marginRight: 2,
  },
  voiceLanguageBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surface,
  },
  voiceLanguageBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  voiceLanguageText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '800',
  },
  voiceLanguageTextActive: {
    color: COLORS.onPrimary,
  },
  voiceError: {
    maxWidth: 280,
    fontSize: 11,
    color: COLORS.error,
    marginTop: 8,
    textAlign: 'center',
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
    backgroundColor: COLORS.surfaceContainerLow,
    padding: SPACING.gutter,
    borderRadius: 8,
    marginTop: SPACING.gutter,
    justifyContent: 'center',
  },
  photoBtnText: {
    marginLeft: SPACING.base,
    color: COLORS.primary,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: SPACING.gutter,
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
    boxShadow: '0px 4px 8px rgba(21, 128, 61, 0.2)',
    elevation: 4,
  },
  startBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.onPrimary,
  },
});
