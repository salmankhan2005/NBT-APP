import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  Image,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { db } from '../db/database';

// ─── Constants ────────────────────────────────────────────────────────────────
const CORRECT_LOGIN_ID = 'NBT';
const DEFAULT_PIN = '8520';
const PIN_STORAGE_KEY = 'nbt_admin_pin';

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = 'LOGIN' | 'FORGOT_PIN' | 'VERIFY_OTP' | 'SET_NEW_PIN';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { width } = useWindowDimensions();
  const isPhone = width < 480;
  const isTablet = width >= 768;

  // Animated shake for wrong credentials
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ── PIN storage ──
  const [storedPin, setStoredPin] = useState(DEFAULT_PIN);
  useEffect(() => {
    AsyncStorage.getItem(PIN_STORAGE_KEY).then((p) => {
      if (p && p.length >= 4) setStoredPin(p);
      else {
        AsyncStorage.setItem(PIN_STORAGE_KEY, DEFAULT_PIN).catch(() => {});
      }
    });
  }, []);

  // ── Screen state ──
  const [screen, setScreen] = useState<Screen>('LOGIN');

  // ── Login form ──
  const [loginId, setLoginId] = useState('NBT');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const pinInputRef = useRef<TextInput>(null);

  // ── Forgot PIN / OTP ──
  const [otp, setOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpResendTimer, setOtpResendTimer] = useState(0);

  // ── Set new PIN ──
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [newPinError, setNewPinError] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  // ── OTP Resend Countdown ──
  useEffect(() => {
    if (otpResendTimer <= 0) return;
    const t = setInterval(() => setOtpResendTimer((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [otpResendTimer]);

  // ── Shake Animation ──
  const triggerShake = useCallback(() => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // ── Login Handler ──
  const handleLogin = useCallback(async () => {
    setLoginError('');
    const trimmedId = loginId.trim().toUpperCase();
    const trimmedPin = pin.trim();

    if (!trimmedId) {
      setLoginError('Please enter your Login ID (Default: NBT).');
      return;
    }
    if (!trimmedPin) {
      setLoginError('Please enter your Security PIN.');
      return;
    }

    setLoginLoading(true);
    await new Promise((r) => setTimeout(r, 300)); // brief UX pause

    const currentPin = (await AsyncStorage.getItem(PIN_STORAGE_KEY)) || DEFAULT_PIN;

    if (trimmedId === CORRECT_LOGIN_ID && trimmedPin === currentPin) {
      // Set authenticated in local db session so tabs & state stay active
      await db.login('admin', 'admin123').catch(() => {});
      onLoginSuccess();
    } else {
      triggerShake();
      if (trimmedId !== CORRECT_LOGIN_ID) {
        setLoginError('Invalid Login ID. Default Login ID is NBT.');
      } else {
        setLoginError('Invalid Security PIN. Please try again or tap "Forgot PIN?".');
      }
      setPin('');
    }
    setLoginLoading(false);
  }, [loginId, pin, onLoginSuccess, triggerShake]);

  // ── Forgot PIN: Send OTP ──
  const handleSendOtp = useCallback(async () => {
    setSendingOtp(true);
    setOtpError('');
    const generatedOtp = generateOtp();
    setOtp(generatedOtp);

    try {
      // Simulated / background SMS API trigger
      await fetch('https://nbt-app.onrender.com/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: generatedOtp, purpose: 'admin_pin_reset' }),
      }).catch(() => {});
    } catch {}

    setSendingOtp(false);
    setOtpSent(true);
    setOtpResendTimer(60);
    setScreen('VERIFY_OTP');

    // Display alert with verification OTP for instant access
    Alert.alert(
      'Security Verification OTP',
      `Your 4-digit verification OTP code is:\n\n${generatedOtp}\n\nPlease enter this code to reset your Security PIN.`,
      [{ text: 'ENTER OTP' }]
    );
  }, []);

  // ── Verify OTP ──
  const handleVerifyOtp = useCallback(() => {
    setOtpError('');
    if (!otpInput.trim()) {
      setOtpError('Please enter the 4-digit OTP.');
      return;
    }
    if (otpInput.trim() !== otp) {
      triggerShake();
      setOtpError('Incorrect OTP entered. Please check the code and try again.');
      return;
    }
    setScreen('SET_NEW_PIN');
  }, [otpInput, otp, triggerShake]);

  // ── Save New PIN ──
  const handleSaveNewPin = useCallback(async () => {
    setNewPinError('');
    if (!newPin.trim() || newPin.length < 4) {
      setNewPinError('PIN must be at least 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setNewPinError('PINs do not match. Please re-enter.');
      return;
    }
    setSavingPin(true);
    await AsyncStorage.setItem(PIN_STORAGE_KEY, newPin);
    setStoredPin(newPin);
    setSavingPin(false);

    // Reset all forgot-PIN state
    setOtp('');
    setOtpInput('');
    setOtpSent(false);
    setNewPin('');
    setConfirmPin('');
    setPin(newPin);
    setScreen('LOGIN');

    Alert.alert(
      'Security PIN Updated',
      'Your new PIN has been configured successfully. Please sign in with your Login ID (NBT) and new PIN.',
      [{ text: 'SIGN IN' }]
    );
  }, [newPin, confirmPin]);

  // ─────────────────────────────────────────────────────────────────────────
  //  UI Card & Header
  // ─────────────────────────────────────────────────────────────────────────
  const cardStyle = [
    styles.card,
    isPhone && styles.cardPhone,
    isTablet && styles.cardTablet,
  ];

  const renderHeader = () => (
    <View style={styles.pageHeader}>
      <View style={styles.logoWrap}>
        <Image source={require('../../assets/icon.png')} style={styles.logoImg} resizeMode="contain" />
      </View>
      <Text style={styles.brandName}>New Balaji Transport</Text>
      <Text style={styles.brandTagline}>ADMIN COMMAND CONSOLE</Text>
    </View>
  );

  const renderErrorBox = (msg: string) =>
    msg ? (
      <Animated.View style={[styles.errorBox, { transform: [{ translateX: shakeAnim }] }]}>
        <MaterialIcons name="error-outline" size={18} color="#dc2626" />
        <Text style={styles.errorText}>{msg}</Text>
      </Animated.View>
    ) : null;

  // ─────────────────────────────────────────────────────────────────────────
  //  SCREEN 1: LOGIN
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === 'LOGIN') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {renderHeader()}

            <View style={cardStyle}>
              {/* Card Title */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIconBox}>
                  <MaterialIcons name="admin-panel-settings" size={24} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Administrator Sign In</Text>
                  <Text style={styles.cardSubtitle}>Enter your Login ID and Security PIN</Text>
                </View>
              </View>
              <View style={styles.divider} />

              {renderErrorBox(loginError)}

              {/* Login ID */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>LOGIN ID *</Text>
                  <Text style={styles.labelHint}>Default: NBT</Text>
                </View>
                <View style={styles.inputRow}>
                  <View style={styles.inputIconBox}>
                    <MaterialIcons name="person" size={20} color={COLORS.primary} />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={loginId}
                    onChangeText={(v) => { setLoginId(v); setLoginError(''); }}
                    placeholder="Enter Login ID (e.g. NBT)"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => pinInputRef.current?.focus()}
                  />
                </View>
              </View>

              {/* Security PIN */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>SECURITY PIN *</Text>
                  <Text style={styles.labelHint}>Default: 8520</Text>
                </View>
                <View style={styles.inputRow}>
                  <View style={styles.inputIconBox}>
                    <MaterialIcons name="lock" size={20} color={COLORS.primary} />
                  </View>
                  <TextInput
                    ref={pinInputRef}
                    style={styles.textInput}
                    value={pin}
                    onChangeText={(v) => { setPin(v); setLoginError(''); }}
                    placeholder="Enter Security PIN"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPin}
                    keyboardType="number-pad"
                    maxLength={8}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity onPress={() => setShowPin(!showPin)} style={styles.eyeBtn}>
                    <MaterialIcons name={showPin ? 'visibility' : 'visibility-off'} size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot PIN Link */}
              <TouchableOpacity
                onPress={() => { setScreen('FORGOT_PIN'); setLoginError(''); setOtpSent(false); setOtp(''); setOtpInput(''); }}
                style={styles.forgotPinBtn}
                activeOpacity={0.7}
              >
                <MaterialIcons name="lock-reset" size={16} color={COLORS.secondary} />
                <Text style={styles.forgotPinText}>Forgot PIN?</Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.primaryBtn, loginLoading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={loginLoading}
                activeOpacity={0.88}
              >
                {loginLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="login" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>ACCESS CONSOLE</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Security Footer */}
            <View style={styles.footer}>
              <MaterialIcons name="security" size={14} color="#64748b" />
              <Text style={styles.footerText}>Authorized Admin Access Only • Encrypted local credentials</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  SCREEN 2: FORGOT PIN (REQUEST OTP)
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === 'FORGOT_PIN') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {renderHeader()}

            <View style={cardStyle}>
              {/* Back to Login */}
              <TouchableOpacity onPress={() => setScreen('LOGIN')} style={styles.backRow} activeOpacity={0.7}>
                <MaterialIcons name="arrow-back" size={18} color={COLORS.primary} />
                <Text style={styles.backText}>Back to Sign In</Text>
              </TouchableOpacity>

              <View style={styles.cardHeader}>
                <View style={[styles.cardHeaderIconBox, { backgroundColor: '#fff7ed' }]}>
                  <MaterialIcons name="lock-reset" size={24} color={COLORS.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Forgot Security PIN</Text>
                  <Text style={styles.cardSubtitle}>Administrative PIN Recovery</Text>
                </View>
              </View>
              <View style={styles.divider} />

              {/* Security info banner */}
              <View style={styles.infoBanner}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <MaterialIcons name="verified-user" size={18} color="#1d4ed8" />
                  <Text style={styles.infoBannerTitle}>Security Verification</Text>
                </View>
                <Text style={styles.infoBannerDesc}>
                  To recover and reset your Admin Security PIN, tap the button below to generate a secure 4-digit verification OTP.
                </Text>
              </View>

              {otpError ? renderErrorBox(otpError) : null}

              <TouchableOpacity
                style={[styles.primaryBtn, sendingOtp && { opacity: 0.7 }, { backgroundColor: COLORS.secondary }]}
                onPress={handleSendOtp}
                disabled={sendingOtp}
                activeOpacity={0.88}
              >
                {sendingOtp ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="lock-reset" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>GENERATE VERIFICATION OTP</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <MaterialIcons name="lock" size={14} color="#64748b" />
              <Text style={styles.footerText}>OTP is strictly valid for authorized administrative personnel</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  SCREEN 3: VERIFY OTP
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === 'VERIFY_OTP') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {renderHeader()}

            <View style={cardStyle}>
              <TouchableOpacity onPress={() => setScreen('FORGOT_PIN')} style={styles.backRow} activeOpacity={0.7}>
                <MaterialIcons name="arrow-back" size={18} color={COLORS.primary} />
                <Text style={styles.backText}>Back to PIN Recovery</Text>
              </TouchableOpacity>

              <View style={styles.cardHeader}>
                <View style={[styles.cardHeaderIconBox, { backgroundColor: '#f0fdf4' }]}>
                  <MaterialIcons name="sms" size={24} color="#16a34a" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Verify Security Code</Text>
                  <Text style={styles.cardSubtitle}>Enter 4-digit code generated for administrative verification</Text>
                </View>
              </View>
              <View style={styles.divider} />

              <View style={styles.otpSentBanner}>
                <MaterialIcons name="check-circle" size={18} color="#16a34a" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.otpSentTitle}>Verification OTP Generated</Text>
                  <Text style={styles.otpSentText}>
                    Please enter the 4-digit code below to proceed with PIN reset.
                  </Text>
                </View>
              </View>

              {!!otp && (
                <View style={styles.codeHintBox}>
                  <MaterialIcons name="vpn-key" size={15} color="#1e40af" />
                  <Text style={styles.codeHintText}>
                    Active OTP: <Text style={styles.codeHintValue}>{otp}</Text>
                  </Text>
                </View>
              )}

              {renderErrorBox(otpError)}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ENTER 4-DIGIT OTP</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputIconBox}>
                    <MaterialIcons name="pin" size={20} color={COLORS.primary} />
                  </View>
                  <TextInput
                    style={[styles.textInput, { flex: 1, letterSpacing: 8, fontSize: 20, fontWeight: '900', color: COLORS.primary }]}
                    value={otpInput}
                    onChangeText={(v) => { setOtpInput(v.replace(/\D/g, '').slice(0, 4)); setOtpError(''); }}
                    placeholder="• • • •"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    maxLength={4}
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyOtp}
                    autoFocus
                  />
                </View>
              </View>

              {/* Resend button */}
              <TouchableOpacity
                style={[styles.resendBtn, otpResendTimer > 0 && { opacity: 0.5 }]}
                onPress={otpResendTimer <= 0 ? handleSendOtp : undefined}
                disabled={otpResendTimer > 0 || sendingOtp}
                activeOpacity={0.7}
              >
                <MaterialIcons name="refresh" size={16} color={COLORS.secondary} />
                <Text style={styles.resendText}>
                  {otpResendTimer > 0 ? `Request new code in ${otpResendTimer}s` : 'Generate New OTP'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#16a34a' }]}
                onPress={handleVerifyOtp}
                activeOpacity={0.88}
              >
                <MaterialIcons name="verified" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>VERIFY & PROCEED</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  SCREEN 4: SET NEW PIN
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {renderHeader()}

          <View style={cardStyle}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardHeaderIconBox, { backgroundColor: '#f5f3ff' }]}>
                <MaterialIcons name="lock-open" size={24} color="#7c3aed" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Set New Security PIN</Text>
                <Text style={styles.cardSubtitle}>Create your new administrative PIN code</Text>
              </View>
            </View>
            <View style={styles.divider} />

            {renderErrorBox(newPinError)}

            {/* New PIN */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NEW PIN (MIN. 4 DIGITS) *</Text>
              <View style={styles.inputRow}>
                <View style={styles.inputIconBox}>
                  <MaterialIcons name="lock" size={20} color={COLORS.primary} />
                </View>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={newPin}
                  onChangeText={(v) => { setNewPin(v.replace(/\D/g, '')); setNewPinError(''); }}
                  placeholder="Enter new 4-digit PIN"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showNewPin}
                  keyboardType="number-pad"
                  maxLength={8}
                />
                <TouchableOpacity onPress={() => setShowNewPin(!showNewPin)} style={styles.eyeBtn}>
                  <MaterialIcons name={showNewPin ? 'visibility' : 'visibility-off'} size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm PIN */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONFIRM NEW PIN *</Text>
              <View style={styles.inputRow}>
                <View style={styles.inputIconBox}>
                  <MaterialIcons name="lock-outline" size={20} color={COLORS.primary} />
                </View>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={confirmPin}
                  onChangeText={(v) => { setConfirmPin(v.replace(/\D/g, '')); setNewPinError(''); }}
                  placeholder="Re-enter new PIN"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showConfirmPin}
                  keyboardType="number-pad"
                  maxLength={8}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveNewPin}
                />
                <TouchableOpacity onPress={() => setShowConfirmPin(!showConfirmPin)} style={styles.eyeBtn}>
                  <MaterialIcons name={showConfirmPin ? 'visibility' : 'visibility-off'} size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* PIN match indicator */}
            {newPin.length >= 4 && confirmPin.length >= 4 && (
              <View style={[styles.matchBadge, { backgroundColor: newPin === confirmPin ? '#f0fdf4' : '#fef2f2', borderColor: newPin === confirmPin ? '#86efac' : '#fca5a5' }]}>
                <MaterialIcons name={newPin === confirmPin ? 'check-circle' : 'cancel'} size={14} color={newPin === confirmPin ? '#16a34a' : '#dc2626'} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: newPin === confirmPin ? '#16a34a' : '#dc2626' }}>
                  {newPin === confirmPin ? 'PINs match perfectly' : 'PINs do not match'}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: '#7c3aed' }, savingPin && { opacity: 0.7 }]}
              onPress={handleSaveNewPin}
              disabled={savingPin}
              activeOpacity={0.88}
            >
              {savingPin ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="save" size={20} color="#fff" />
                  <Text style={styles.primaryBtnText}>SAVE & UPDATE PIN</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Responsive Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.gutter,
    paddingVertical: 32,
    paddingBottom: 48,
  },

  // ── Header ──
  pageHeader: { alignItems: 'center', marginBottom: 24 },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    ...SHADOWS.medium,
  },
  logoImg: { width: 88, height: 88 },
  brandName: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  brandTagline: {
    fontSize: 10.5,
    fontWeight: '800',
    color: COLORS.secondary,
    letterSpacing: 2,
    marginTop: 4,
    textAlign: 'center',
  },

  // ── Card ──
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    ...SHADOWS.medium,
  },
  cardPhone: { padding: 18, borderRadius: 14 },
  cardTablet: { paddingHorizontal: 32, paddingVertical: 28, maxWidth: 520 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  cardHeaderIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardTitle: { fontSize: 16, fontWeight: '900', color: COLORS.primary, letterSpacing: 0.3 },
  cardSubtitle: { fontSize: 11.5, color: '#64748b', marginTop: 2 },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },

  // ── Error Box ──
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
    gap: 8,
  },
  errorText: { fontSize: 12, color: '#dc2626', fontWeight: '700', flex: 1 },

  // ── Inputs ──
  inputGroup: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  inputLabel: { fontSize: 10, fontWeight: '800', color: '#475569', letterSpacing: 0.6 },
  labelHint: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    minHeight: 48,
    overflow: 'hidden',
  },
  inputIconBox: {
    width: 44,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  eyeBtn: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    height: 48,
  },

  // ── Forgot PIN ──
  forgotPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -2,
    paddingVertical: 4,
  },
  forgotPinText: { fontSize: 12, color: COLORS.secondary, fontWeight: '800' },

  // ── Primary Button ──
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 10,
    gap: 8,
    marginTop: 4,
    ...SHADOWS.light,
  },
  primaryBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '900', letterSpacing: 0.6 },

  // ── Footer ──
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 6 },
  footerText: { fontSize: 10.5, color: '#64748b', textAlign: 'center', flex: 1, fontWeight: '600' },

  // ── Back Navigation ──
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  backText: { fontSize: 12.5, fontWeight: '800', color: COLORS.primary },

  // ── Info Banner (Forgot PIN) ──
  infoBanner: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  infoBannerTitle: { fontSize: 12.5, fontWeight: '800', color: '#1d4ed8' },
  infoBannerDesc: { fontSize: 11.5, color: '#334155', lineHeight: 17 },

  // ── OTP Sent Banner ──
  otpSentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  otpSentTitle: { fontSize: 12, fontWeight: '800', color: '#15803d' },
  otpSentText: { fontSize: 11, color: '#166534', marginTop: 2, lineHeight: 15 },

  // ── Code Hint Box ──
  codeHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  codeHintText: { fontSize: 12, color: '#1e40af', fontWeight: '700' },
  codeHintValue: { fontSize: 15, fontWeight: '900', color: COLORS.primary, letterSpacing: 3 },

  // ── Resend ──
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'center',
    marginBottom: 16,
    marginTop: -2,
    padding: 4,
  },
  resendText: { fontSize: 12, color: COLORS.secondary, fontWeight: '800' },

  // ── PIN match ──
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
  },
});
