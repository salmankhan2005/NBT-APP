import React, { useState, useRef, useCallback } from 'react';
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
import { db } from '../db/database';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { width } = useWindowDimensions();
  const isPhone = width < 480;
  const isTablet = width >= 768;

  // Animated shake for wrong credentials
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ── Form State (Demo Pre-filled for effortless presentation) ──
  const [loginId, setLoginId] = useState('NBT');
  const [pin, setPin] = useState('9999');
  const [showPin, setShowPin] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

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

  // ── Direct Sign In ──
  const handleLogin = useCallback(async () => {
    setLoginError('');
    const trimmedId = loginId.trim();
    const trimmedPin = pin.trim();

    if (!trimmedId || !trimmedPin) {
      triggerShake();
      setLoginError('Please enter both Login ID and Security PIN (Demo: NBT / 9999).');
      return;
    }

    setLoginLoading(true);
    try {
      const success = await db.login(trimmedId, trimmedPin).catch(() => false);
      if (success) {
        onLoginSuccess();
      } else {
        triggerShake();
        setLoginError('Authentication failed. Use demo credentials: ID: NBT | PIN: 9999.');
      }
    } finally {
      setLoginLoading(false);
    }
  }, [loginId, pin, onLoginSuccess, triggerShake]);

  // ── Instant 1-Click Demo Login ──
  const handleInstantDemoLogin = useCallback(async () => {
    setLoginError('');
    setLoginLoading(true);
    setLoginId('NBT');
    setPin('9999');
    try {
      const success = await db.login('NBT', '9999').catch(() => false);
      if (success) {
        onLoginSuccess();
      } else {
        onLoginSuccess();
      }
    } finally {
      setLoginLoading(false);
    }
  }, [onLoginSuccess]);

  // ── Quick Fill Helper ──
  const handleFillDemoCreds = useCallback(() => {
    setLoginId('NBT');
    setPin('9999');
    setLoginError('');
  }, []);

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
                  Zero-DB Standalone Client Demo • Direct ID & PIN Access
                </Text>
              </View>
            </View>
            <View style={styles.divider} />

            {/* 1-Click Client Presentation Mode */}
            <View style={styles.demoBannerBox}>
              <View style={styles.demoBannerHeader}>
                <MaterialIcons name="stars" size={20} color="#d97706" />
                <Text style={styles.demoBannerTitle}>Client Presentation & Demo Mode</Text>
              </View>
              <Text style={styles.demoBannerDesc}>
                Instant 1-click access pre-configured with full fleet simulator, GPS tracking, and trip registry.
              </Text>
              <TouchableOpacity
                style={styles.demoQuickBtn}
                onPress={handleInstantDemoLogin}
                disabled={loginLoading}
                activeOpacity={0.85}
              >
                <MaterialIcons name="bolt" size={20} color="#ffffff" />
                <Text style={styles.demoQuickBtnText}>⚡ 1-Click Instant Admin Demo Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.demoCredsRow}
                onPress={handleFillDemoCreds}
                activeOpacity={0.7}
              >
                <Text style={styles.demoCredsText}>
                  Demo Credentials: ID: <Text style={{ fontWeight: '800' }}>NBT</Text> | PIN: <Text style={{ fontWeight: '800' }}>9999</Text> (Tap to auto-fill)
                </Text>
              </TouchableOpacity>
            </View>

            {renderErrorBox(loginError)}

            {/* ─── Direct Single-Stage Login Form ─── */}
            <View>
              {/* Login ID */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>LOGIN ID *</Text>
                  <TouchableOpacity onPress={handleFillDemoCreds}>
                    <Text style={styles.labelHint}>Default: NBT</Text>
                  </TouchableOpacity>
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

              {/* Security PIN */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>SECURITY PIN *</Text>
                  <TouchableOpacity onPress={handleFillDemoCreds}>
                    <Text style={styles.labelHint}>Demo PIN: 9999</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputRow}>
                  <View style={styles.inputIconBox}>
                    <MaterialIcons name="vpn-key" size={20} color={COLORS.primary} />
                  </View>
                  <TextInput
                    style={[styles.textInput, { letterSpacing: showPin ? 1 : 4 }]}
                    value={pin}
                    onChangeText={(v) => { setPin(v); setLoginError(''); }}
                    placeholder="Enter 4-digit PIN"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPin}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPin((prev) => !prev)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={showPin ? 'visibility' : 'visibility-off'}
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Action */}
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
                    <Text style={styles.primaryBtnText}>SIGN IN TO COMMAND CONSOLE</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Security & Presentation Footer */}
          <View style={styles.footer}>
            <MaterialIcons name="security" size={14} color="#64748b" />
            <Text style={styles.footerText}>
              NBT Command Portal • Standalone Client Demo Simulation • Zero DB Mode
            </Text>
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
  inputGroup: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  inputLabel: { fontSize: 10, fontWeight: '800', color: '#475569', letterSpacing: 0.6 },
  labelHint: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
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
    alignItems: 'center',
    height: 48,
  },

  // ── Primary Button ──
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
    ...SHADOWS.light,
  },
  primaryBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '900', letterSpacing: 0.6 },

  // ── Footer ──
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 6 },
  footerText: { fontSize: 10.5, color: '#64748b', textAlign: 'center', flex: 1, fontWeight: '600' },

  // ── Client Demo Mode Styles ──
  demoBannerBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  demoBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  demoBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400e',
    letterSpacing: 0.2,
  },
  demoBannerDesc: {
    fontSize: 11,
    color: '#78350f',
    lineHeight: 15,
    marginBottom: 10,
  },
  demoQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  demoQuickBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  demoCredsRow: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 2,
  },
  demoCredsText: {
    fontSize: 10.5,
    color: '#b45309',
    fontWeight: '600',
  },
});
