import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { db, Trip, Expense, GPSLocation } from '../db/database';
import { reverseGeocodeLocation } from '../services/openStreetMapService';

interface AddExpenseScreenProps {
  trip: Trip;
  onExpenseSaved: () => void;
  onBackToTrip: () => void;
}

type ExpenseCategory = 'FUEL' | 'TOLL' | 'RTO' | 'POLICE' | 'LORRY' | 'OTHER';
type VoiceLanguage = 'en-IN' | 'ta-IN';

export default function AddExpenseScreen({
  trip,
  onExpenseSaved,
  onBackToTrip,
}: AddExpenseScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Form common states
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [capturedLocation, setCapturedLocation] = useState<GPSLocation | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [loadingGps, setLoadingGps] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fuel specific states
  const [liters, setLiters] = useState('');
  const [bunkLocation, setBunkLocation] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('0.00');

  // Voice recognition states
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [voiceLanguage, setVoiceLanguage] = useState<VoiceLanguage>('ta-IN');

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setVoiceError('');
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript?.trim();
    if (transcript) setReason(transcript);
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    if (event.error !== 'aborted') {
      setVoiceError(event.error === 'no-speech'
        ? 'No speech detected. Tap the microphone and speak again.'
        : 'Voice input was not available. Please try again or type the note.');
    }
  });

  // Auto calculate price per liter for fuel
  useEffect(() => {
    const amt = parseFloat(amount);
    const lit = parseFloat(liters);
    if (!isNaN(amt) && !isNaN(lit) && lit > 0) {
      setPricePerLiter((amt / lit).toFixed(2));
    } else {
      setPricePerLiter('0.00');
    }
  }, [amount, liters]);

  // Auto-capture accurate GPS position on screen load
  useEffect(() => {
    handleCaptureLocation();
  }, []);

  const handleCaptureLocation = async () => {
    setLoadingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'GPS location access is required to record expense location.');
        setLoadingGps(false);
        return;
      }

      // Try last known position first for instant high-accuracy retrieval
      let loc = await Location.getLastKnownPositionAsync({});

      // If no cached position, get fresh high accuracy position with an 8-second timeout
      if (!loc || !loc.coords) {
        loc = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
          new Promise<Location.LocationObject | null>((resolve) => setTimeout(() => resolve(null), 8000))
        ]);
      }

      if (loc && loc.coords) {
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        const gps: GPSLocation = {
          latitude: lat,
          longitude: lng,
          city: 'Current Location',
          address: `Lat: ${lat.toFixed(5)}, Long: ${lng.toFixed(5)}`,
          lastUpdated: new Date().toLocaleTimeString(),
        };

        try {
          const geoRes = await reverseGeocodeLocation(lat, lng);
          if (geoRes) {
            gps.city = geoRes.city || 'Current Location';
            gps.address = geoRes.formattedAddress || gps.address;
          }
        } catch (err) {
          // fallback to exact lat/lng address format
        }

        setCapturedLocation(gps);
        if (selectedCategory === 'FUEL') {
          setBunkLocation(gps.address);
        }
      } else {
        Alert.alert('GPS Notice', 'Unable to acquire location lock. Please ensure GPS/location services are enabled on your device.');
      }
    } catch (e) {
      console.warn('GPS location capture error:', e);
    } finally {
      setLoadingGps(false);
    }
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setReceiptImage(result.assets[0].uri);
    }
  };

  const handleChooseGalleryImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setReceiptImage(result.assets[0].uri);
    }
  };

  const handleVoiceInput = async () => {
    setVoiceError('');
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined' && !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setVoiceError('Voice input is not supported in this browser. Please type the note.');
      return;
    }

    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setVoiceError(Platform.OS === 'web'
          ? 'Microphone is blocked for this local page. Allow microphone access in the browser site settings, then reload.'
          : 'Microphone permission is blocked. Allow microphone access in Android Settings, then try again.');
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: voiceLanguage,
        interimResults: true,
        continuous: false,
        maxAlternatives: 3,
        addsPunctuation: true,
        contextualStrings: ['RTO', 'police', 'lorry', 'toll', 'parking', 'fuel', 'expense'],
      });
    } catch {
      setIsListening(false);
      setVoiceError('Could not start voice input. Please try again or type the note.');
    }
  };

  const handleSaveExpense = async () => {
    const amtNum = parseFloat(amount.trim());
    if (isNaN(amtNum) || amtNum <= 0) {
      Alert.alert('Required', 'Please enter a valid expense amount.');
      return;
    }

    if (selectedCategory === 'FUEL') {
      const litNum = parseFloat(liters.trim());
      if (isNaN(litNum) || litNum <= 0) {
        Alert.alert('Required', 'Please enter liters for Fuel expense.');
        return;
      }
    }

    if (!capturedLocation) {
      Alert.alert('Required', 'Please click [📍 GIVE LOCATION] to capture GPS coordinates.');
      return;
    }

    setSubmitting(true);
    try {
      const newExpense: Omit<Expense, 'id' | 'timestamp'> = {
        category: selectedCategory!,
        amount: amtNum,
        reason: selectedCategory === 'FUEL' ? `Fuel Bunk: ${bunkLocation}` : reason,
        liters: selectedCategory === 'FUEL' ? parseFloat(liters) : undefined,
        location: capturedLocation,
        receiptUri: receiptImage || undefined,
      };

      await db.addExpense(trip.id, newExpense);
      
      // Voice guidance announcement
      try {
        const speechMsg = `Expense of ${amtNum} rupees for ${selectedCategory} has been saved locally on device.`;
        Speech.speak(speechMsg, { language: 'en', rate: 0.95 });
      } catch (err) {
        console.log('Speech error:', err);
      }
      
      const savedCat = selectedCategory;
      resetForm();
      onExpenseSaved();
      
      setSuccessMsg(`✅ ${savedCat} expense of ₹${amtNum} submitted successfully!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e) {
      Alert.alert('Error', 'Failed to save expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedCategory(null);
    setAmount('');
    setReason('');
    setCapturedLocation(null);
    setReceiptImage(null);
    setLiters('');
    setBunkLocation('');
  };

  // Helper calculation for totals
  const getCategoryTotal = (cat: ExpenseCategory) => {
    return trip.expenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const getGrandTotal = () => {
    return trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={selectedCategory ? resetForm : onBackToTrip}>
          <MaterialIcons name="arrow-back" size={28} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectedCategory ? `${selectedCategory} Expense` : 'Trip Expenses'}
        </Text>
      </View>

      {selectedCategory === null ? (
        /* CATEGORY PICKER & EXPENSES SUMMARY LIST */
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {!!successMsg && (
            <View style={{ backgroundColor: '#dcfce7', padding: 12, borderRadius: 8, marginBottom: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }}>
              <Text style={{ color: '#166534', fontWeight: 'bold', fontSize: 14 }}>{successMsg}</Text>
            </View>
          )}
          <Text style={styles.sectionTitle}>Add New Expense</Text>
          
          <View style={styles.grid}>
            {(['FUEL', 'TOLL', 'RTO', 'POLICE', 'LORRY', 'OTHER'] as const).map((cat) => {
              const iconMap: Record<ExpenseCategory, string> = {
                FUEL: 'local-gas-station',
                TOLL: 'toll',
                RTO: 'verified-user',
                POLICE: 'security',
                LORRY: 'build',
                OTHER: 'payments',
              };
              
              return (
                <TouchableOpacity
                  key={cat}
                  style={styles.gridCard}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <View style={styles.cardIconBox}>
                    <MaterialIcons name={iconMap[cat] as any} size={32} color={COLORS.primary} />
                  </View>
                  <Text style={styles.cardText}>{cat === 'FUEL' ? 'FUEL / DIESEL' : cat}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Running Totals Summary */}
          <Text style={styles.sectionTitle}>Expense Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fuel Total:</Text>
              <Text style={styles.summaryVal}>₹{getCategoryTotal('FUEL')}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Toll Total:</Text>
              <Text style={styles.summaryVal}>₹{getCategoryTotal('TOLL')}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>RTO Total:</Text>
              <Text style={styles.summaryVal}>₹{getCategoryTotal('RTO')}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Police/PC Total:</Text>
              <Text style={styles.summaryVal}>₹{getCategoryTotal('POLICE')}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Lorry Expense:</Text>
              <Text style={styles.summaryVal}>₹{getCategoryTotal('LORRY')}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Other Expense:</Text>
              <Text style={styles.summaryVal}>₹{getCategoryTotal('OTHER')}</Text>
            </View>
            <View style={styles.grandTotalDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.grandTotalLabel}>GRAND TOTAL:</Text>
              <Text style={styles.grandTotalVal}>₹{getGrandTotal()}</Text>
            </View>
          </View>

          {/* Recorded Expenses List */}
          {trip.expenses.length > 0 ? (
            <View style={styles.expensesList}>
              <Text style={styles.listTitle}>Recorded Entries</Text>
              {trip.expenses.map((exp) => (
                <View key={exp.id} style={styles.expenseEntry}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryCategory}>{exp.category}</Text>
                    <Text style={styles.entryAmount}>₹{exp.amount}</Text>
                  </View>
                  {exp.liters ? (
                    <Text style={styles.entrySub}>
                      {exp.liters} L • Price/L: ₹{(exp.amount / exp.liters).toFixed(2)}
                    </Text>
                  ) : null}
                  {exp.reason ? <Text style={styles.entryReason}>{exp.reason}</Text> : null}
                  {exp.location ? (
                    <Text style={styles.entryLocation}>
                      📍 {exp.location.city} ({exp.location.lastUpdated})
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      ) : (
        /* EXPENSE SUB-FORMS */
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.formContent}>
              {/* Category label indicator */}
              <View style={styles.categoryHeader}>
                <Text style={styles.categorySubText}>RECORDING CATEGORY</Text>
                <Text style={styles.categoryMainText}>
                  {selectedCategory === 'FUEL' ? '⛽ FUEL / DIESEL' : selectedCategory}
                </Text>
              </View>

              {/* Liters Input (Fuel only) */}
              {selectedCategory === 'FUEL' ? (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>DIESEL LITERS</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter liters"
                    keyboardType="numeric"
                    value={liters}
                    onChangeText={setLiters}
                  />
                </View>
              ) : null}

              {/* Expense Amount */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  {selectedCategory === 'FUEL' ? 'TOTAL AMOUNT (₹)' : 'EXPENSE AMOUNT (₹)'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>

              {/* Price Per Liter Info (Fuel only) */}
              {selectedCategory === 'FUEL' ? (
                <View style={styles.fuelCalcCard}>
                  <Text style={styles.calcLabel}>CALCULATED PRICE PER LITER:</Text>
                  <Text style={styles.calcVal}>₹{pricePerLiter} / Liter</Text>
                </View>
              ) : null}

              {/* Petrol Bunk Location text input (Fuel only) */}
              {selectedCategory === 'FUEL' ? (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>PETROL BUNK LOCATION</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter bunk name or location"
                    value={bunkLocation}
                    onChangeText={setBunkLocation}
                  />
                </View>
              ) : null}

              {/* Reason / Details with Voice microphone input (RTO, Police, Lorry, Other) */}
              {selectedCategory !== 'FUEL' && selectedCategory !== 'TOLL' ? (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>REASON / REMARKS</Text>
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
                  <View style={styles.voiceWrapper}>
                    <TextInput
                      style={[styles.input, styles.reasonInput]}
                      placeholder="Specify reason"
                      multiline
                      value={reason}
                      onChangeText={setReason}
                    />
                    <TouchableOpacity
                      style={[
                        styles.voiceMicBtn,
                        isListening && styles.voiceMicBtnActive
                      ]}
                      onPress={handleVoiceInput}
                    >
                      <MaterialIcons
                        name="mic"
                        size={24}
                        color={isListening ? COLORS.orangeAccent : COLORS.outline}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.voiceTip}>{isListening ? `Listening in ${voiceLanguage === 'ta-IN' ? 'Tamil' : 'English'}... speak clearly, then pause.` : `Tap the microphone to speak in ${voiceLanguage === 'ta-IN' ? 'Tamil' : 'English'}.`}</Text>
                  {voiceError ? <Text style={styles.voiceError}>{voiceError}</Text> : null}
                </View>
              ) : null}

              {/* TOLL Name (Toll only) */}
              {selectedCategory === 'TOLL' ? (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>TOLL PLAZA NAME (OPTIONAL)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter plaza name"
                    value={reason}
                    onChangeText={setReason}
                  />
                </View>
              ) : null}

              {/* Location Capture Button (GIVE LOCATION) */}
              <View style={styles.gpsCaptureContainer}>
                <TouchableOpacity
                  style={[styles.gpsBtn, capturedLocation && styles.gpsBtnSuccess]}
                  onPress={handleCaptureLocation}
                  disabled={loadingGps}
                >
                  {loadingGps ? (
                    <ActivityIndicator color={COLORS.primary} size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="place" size={24} color={capturedLocation ? COLORS.onPrimary : COLORS.primary} />
                      <Text style={[styles.gpsBtnText, capturedLocation && styles.gpsBtnTextSuccess]}>
                        {capturedLocation ? '📍 LOCATION RECORDED' : '📍 GIVE LOCATION'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {capturedLocation ? (
                  <View style={styles.capturedLocationCard}>
                    <Text style={styles.locationCity}>City/Town: {capturedLocation.city}</Text>
                    <Text style={styles.locationAddr} numberOfLines={2}>Addr: {capturedLocation.address}</Text>
                    <Text style={styles.locationTime}>Time: {capturedLocation.lastUpdated}</Text>
                  </View>
                ) : (
                  <Text style={styles.gpsWarning}>*GPS location coordinates must be captured to submit expense</Text>
                )}
              </View>

              {/* Receipt Image Upload Button */}
              <View style={styles.imagePickerContainer}>
                <TouchableOpacity style={styles.uploadBtn} onPress={handlePickImage}>
                  <MaterialIcons name="photo-camera" size={24} color={COLORS.primary} />
                  <Text style={styles.uploadBtnText}>TAKE BILL PHOTO</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.uploadBtn} onPress={handleChooseGalleryImage}>
                  <MaterialIcons name="photo-library" size={24} color={COLORS.primary} />
                  <Text style={styles.uploadBtnText}>CHOOSE FROM GALLERY</Text>
                </TouchableOpacity>

                {receiptImage ? (
                  <View style={styles.imageWrapper}>
                    <Image source={{ uri: receiptImage }} style={styles.receiptThumb} />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setReceiptImage(null)}
                    >
                      <MaterialIcons name="cancel" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.uploadInfo}>Optional: Upload fuel invoice or expense receipt</Text>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  submitting && styles.btnDisabled
                ]}
                onPress={handleSaveExpense}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.onPrimary} />
                ) : (
                  <>
                    <MaterialIcons name="save" size={24} color={COLORS.onPrimary} />
                    <Text style={styles.saveBtnText}>SUBMIT EXPENSE</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
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
  keyboardView: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.gutter,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: SPACING.stack,
  },
  gridCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.light,
  },
  cardIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: SPACING.gutter,
    ...SHADOWS.light,
    marginBottom: SPACING.stack,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  grandTotalDivider: {
    height: 1,
    backgroundColor: COLORS.outlineVariant,
    marginVertical: 8,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  grandTotalVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.orangeAccent,
  },
  expensesList: {
    marginTop: 8,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
  },
  expenseEntry: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 12,
    marginBottom: 8,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  entryCategory: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  entryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  entrySub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  entryReason: {
    fontSize: 13,
    color: COLORS.textDark,
    marginVertical: 4,
  },
  entryLocation: {
    fontSize: 11,
    color: COLORS.success,
  },
  formContent: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  categoryHeader: {
    backgroundColor: COLORS.primary,
    padding: SPACING.gutter,
    borderRadius: 12,
    marginBottom: SPACING.gutter * 1.5,
  },
  categorySubText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.outlineVariant,
  },
  categoryMainText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.onPrimary,
    marginTop: 4,
  },
  inputContainer: {
    marginBottom: SPACING.gutter,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.textDark,
  },
  fuelCalcCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    marginBottom: SPACING.gutter,
  },
  calcLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  calcVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
    marginTop: 4,
  },
  reasonInput: {
    height: 80,
    paddingTop: 8,
    paddingBottom: 8,
    flex: 1,
    // textAlignVertical is Android-only and ignored on iOS;
    // height + multiline achieves the same top-alignment on iOS
  },
  voiceWrapper: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  voiceLanguageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 7,
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
  voiceMicBtn: {
    width: 48,
    height: 80,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceMicBtnActive: {
    borderColor: COLORS.orangeAccent,
    backgroundColor: '#fff7ed',
  },
  voiceTip: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  voiceError: {
    fontSize: 11,
    color: COLORS.error,
    marginTop: 4,
  },
  gpsCaptureContainer: {
    marginBottom: SPACING.gutter,
  },
  gpsBtn: {
    height: 48,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  gpsBtnSuccess: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  gpsBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  gpsBtnTextSuccess: {
    color: COLORS.onPrimary,
  },
  capturedLocationCard: {
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginTop: 6,
  },
  locationCity: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  locationAddr: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  locationTime: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'right',
  },
  gpsWarning: {
    fontSize: 11,
    color: COLORS.error,
    marginTop: 4,
    fontStyle: 'italic',
  },
  imagePickerContainer: {
    marginBottom: SPACING.stack,
  },
  uploadBtn: {
    height: 48,
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  imageWrapper: {
    position: 'relative',
    marginTop: 8,
    alignSelf: 'center',
  },
  receiptThumb: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
  },
  uploadInfo: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  saveBtn: {
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.onPrimary,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
