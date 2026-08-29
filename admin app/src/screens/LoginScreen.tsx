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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { db, API_HOST } from '../db/database';

// ─── Constants ────────────────────────────────────────────────────────────────
const CORRECT_LOGIN_ID = 'NBT';
const REGISTERED_ADMIN_EMAILS = [
  'krithickpranav906@gmail.com',
  'newbalajitransports1@gmail.com',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const masked = user.slice(0, 3) + '***';
  const domainParts = domain.split('.');
  const maskedDomain = domainParts[0].slice(0, 2) + '***.' + domainParts.slice(1).join('.');
  return `${masked}@${maskedDomain}`;
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

  // ── State ──
  const [loginId, setLoginId] = useState('NBT');
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

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

  // ── Send Verification PIN ──
  const handleSendOtp = useCallback(async () => {
    setLoginError('');
    const trimmedId = loginId.trim().toUpperCase();
    const cleanEmail = emailInput.trim().toLowerCase();

    if (trimmedId !== CORRECT_LOGIN_ID) {
      triggerShake();
      setLoginError('Invalid Login ID. Default Login ID is NBT.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      triggerShake();
      setLoginError('Please enter a valid registered admin email address.');
      return;
    }

    if (!REGISTERED_ADMIN_EMAILS.includes(cleanEmail)) {
      triggerShake();
      setLoginError('Email not registered. Please use a valid registered Admin email address.');
      return;
    }

    setLoginLoading(true);
    const generatedOtp = generateOtp();
    setOtp(generatedOtp);
    console.log('🔑 [Admin OTP Debug] Generated Verification PIN:', generatedOtp);

    try {
      const url = `${API_HOST}/api/auth/send-otp`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, otp: generatedOtp, purpose: 'admin_pin_reset' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginLoading(false);
        setLoginError(data?.error || 'Failed to send OTP email. Please try again.');
        return;
      }
    } catch {
      setLoginLoading(false);
      setLoginError('Network error. Please check your connection and try again.');
      return;
    }

    setLoginLoading(false);
    setOtpSent(true);
    setOtpResendTimer(60);
  }, [loginId, emailInput, triggerShake]);

  // ── Verify PIN and Login ──
  const handleVerifyAndLogin = useCallback(async () => {
    setLoginError('');
    const trimmedOtpInput = otpInput.trim();

    if (!trimmedOtpInput) {
      setLoginError('Please enter the 4-digit security PIN.');
      return;
    }

    if (trimmedOtpInput !== otp) {
      triggerShake();
      setLoginError('Incorrect Security PIN entered. Please check the code in your email.');
      return;
    }

    setLoginLoading(true);
    
    // Login to backend to fetch real JWT token
    const success = await db.login('admin', '9999').catch(() => false);
    setLoginLoading(false);

    if (success) {
      onLoginSuccess();
    } else {
      triggerShake();
      setLoginError('Authentication failed. Server could not authenticate this session.');
    }
  }, [otpInput, otp, onLoginSuccess, triggerShake]);

  // ── Styles Helper ──
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {renderHeader()}

          <View style={cardStyle}>
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIconBox}>
                <MaterialIcons name="admin-panel-settings" size={24} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Administrator Sign In</Text>
                <Text style={styles.cardSubtitle}>
                  {otpSent ? 'Enter the security code sent to email' : 'Sign in using NBT ID and registered email'}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />

            {renderErrorBox(loginError)}

            {!otpSent ? (
              // ─── STAGE 1: Admin ID & Email ───
              <View>
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
                    />
                  </View>
                </View>

                {/* Email Address */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>REGISTERED EMAIL ADDRESS *</Text>
                  </View>
                  <View style={styles.inputRow}>
                    <View style={styles.inputIconBox}>
                      <MaterialIcons name="email" size={20} color={COLORS.primary} />
                    </View>
                    <TextInput
                      style={styles.textInput}
                      value={emailInput}
                      onChangeText={(v) => { setEmailInput(v.trim()); setLoginError(''); }}
                      placeholder="Enter registered admin email"
                      placeholderTextColor="#94a3b8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleSendOtp}
                    />
                  </View>
                </View>

                {/* Submit Action */}
                <TouchableOpacity
                  style={[styles.primaryBtn, loginLoading && { opacity: 0.7 }]}
                  onPress={handleSendOtp}
                  disabled={loginLoading}
                  activeOpacity={0.88}
                >
                  {loginLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="send" size={20} color="#fff" />
                      <Text style={styles.primaryBtnText}>GET SECURITY PIN</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              // ─── STAGE 2: OTP Verification ───
              <View>
                <View style={styles.otpSentBanner}>
                  <MaterialIcons name="email" size={20} color="#16a34a" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.otpSentTitle}>Email Sent to {maskEmail(emailInput)}</Text>
                    <Text style={styles.otpSentText}>
                      Please check your inbox and enter the 4-digit verification code.
                    </Text>
                  </View>
                </View>

                {/* OTP Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>ENTER 4-DIGIT SECURITY PIN *</Text>
                  <View style={styles.inputRow}>
                    <View style={styles.inputIconBox}>
                      <MaterialIcons name="vpn-key" size={20} color={COLORS.primary} />
                    </View>
                    <TextInput
                      style={[styles.textInput, { flex: 1, letterSpacing: 8, fontSize: 20, fontWeight: '900', color: COLORS.primary }]}
                      value={otpInput}
                      onChangeText={(v) => { setOtpInput(v.replace(/\D/g, '').slice(0, 4)); setLoginError(''); }}
                      placeholder="• • • •"
                      placeholderTextColor="#94a3b8"
                      keyboardType="number-pad"
                      maxLength={4}
                      returnKeyType="done"
                      onSubmitEditing={handleVerifyAndLogin}
                      autoFocus
                    />
                  </View>
                </View>

                {/* Resend button */}
                <TouchableOpacity
                  style={[styles.resendBtn, otpResendTimer > 0 && { opacity: 0.5 }]}
                  onPress={otpResendTimer <= 0 ? handleSendOtp : undefined}
                  disabled={otpResendTimer > 0 || loginLoading}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="refresh" size={16} color={COLORS.secondary} />
                  <Text style={styles.resendText}>
                    {otpResendTimer > 0 ? `Resend Email in ${otpResendTimer}s` : 'Resend Security PIN'}
                  </Text>
                </TouchableOpacity>

                {/* Submit Action */}
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: '#16a34a' }, loginLoading && { opacity: 0.7 }]}
                  onPress={handleVerifyAndLogin}
                  disabled={loginLoading}
                  activeOpacity={0.88}
                >
                  {loginLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="verified" size={20} color="#fff" />
                      <Text style={styles.primaryBtnText}>VERIFY & SIGN IN</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Go Back / Change Email */}
                <TouchableOpacity
                  onPress={() => { setOtpSent(false); setOtpInput(''); setLoginError(''); }}
                  style={[styles.forgotPinBtn, { alignSelf: 'center', marginTop: 16 }]}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="arrow-back" size={16} color={COLORS.secondary} />
                  <Text style={styles.forgotPinText}>Change Email / Go Back</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Security Footer */}
          <View style={styles.footer}>
            <MaterialIcons name="security" size={14} color="#64748b" />
            <Text style={styles.footerText}>Authorized Admin Access Only • Verification PIN required</Text>
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
