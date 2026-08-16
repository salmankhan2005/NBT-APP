import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { db } from '../db/database';

interface SettingsScreenProps {
  onLogout: () => void;
}

export default function SettingsScreen({ onLogout }: SettingsScreenProps) {
  const [resetting, setResetting] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Animations
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const warningShakeAnim = useRef(new Animated.Value(0)).current;

  // Open warning modal with shake animation
  const handleResetPress = () => {
    setShowWarning(true);
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(warningShakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(warningShakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(warningShakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(warningShakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(warningShakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }, 100);
  };

  // Run reset
  const handleConfirmReset = async () => {
    setShowWarning(false);
    setResetting(true);
    try {
      await db.resetData();
      setResetting(false);
      showSuccessModal();
    } catch (e: any) {
      setResetting(false);
      setErrorMsg(e?.message || 'Could not reset the shared database. Check your connection and try again.');
      setShowError(true);
    }
  };

  const showSuccessModal = () => {
    scaleAnim.setValue(0);
    checkAnim.setValue(0);
    pulseAnim.setValue(1);
    setShowSuccess(true);

    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(checkAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    });

    setTimeout(() => {
      setShowSuccess(false);
    }, 3500);
  };

  const handleLogoutPress = () => {
    setShowWarning(false);
    // small delay so warning modal closes first if open
    setTimeout(() => {
      setShowWarning(false);
    }, 50);
    // Use a simple inline confirm via Alert for logout (not resetting)
    const { Alert } = require('react-native');
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'LOGOUT', style: 'destructive', onPress: onLogout },
    ]);
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>Settings & Diagnostics</Text>

        {/* Admin Profile */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={28} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.profileName}>NBT+ARS Administrator</Text>
              <Text style={styles.profileRole}>Role: Super Admin (Read & Write)</Text>
            </View>
          </View>
        </View>

        {/* System Diagnostics */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>SYSTEM DIAGNOSTICS</Text>
          <View style={styles.settingsItem}>
            <MaterialIcons name="cloud-done" size={20} color={COLORS.success} />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemTitle}>Central Database Link</Text>
              <Text style={styles.itemDesc}>Connected to Neon Postgres via REST API</Text>
            </View>
            <Text style={styles.itemStatus}>ACTIVE</Text>
          </View>
          <View style={styles.settingsItem}>
            <MaterialIcons name="security" size={20} color={COLORS.secondary} />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemTitle}>Argon2id Authentication</Text>
              <Text style={styles.itemDesc}>Passwords and driver PINs hashed</Text>
            </View>
            <Text style={styles.itemStatus}>SECURED</Text>
          </View>
          <View style={styles.settingsItem}>
            <MaterialIcons name="info" size={20} color={COLORS.primary} />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemTitle}>Application Version</Text>
              <Text style={styles.itemDesc}>NBT+ARS Admin Console Mobile</Text>
            </View>
            <Text style={styles.itemStatus}>V2.4.1</Text>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={[styles.card, styles.dangerCard]}>
          <Text style={[styles.sectionTitle, { color: COLORS.error }]}>DANGER ZONE</Text>

          <TouchableOpacity
            style={[styles.actionRow, resetting && { opacity: 0.6 }]}
            onPress={handleResetPress}
            disabled={resetting}
          >
            <View style={styles.dangerActionLabel}>
              <MaterialIcons name="settings-backup-restore" size={20} color={COLORS.error} />
              <View>
                <Text style={styles.dangerTitle}>Reset Shared Database</Text>
                <Text style={styles.dangerDesc}>
                  Permanently delete all trips, vehicles, drivers, expenses, GC notes, memos & logs
                </Text>
              </View>
            </View>
            {resetting ? (
              <ActivityIndicator size="small" color={COLORS.error} />
            ) : (
              <MaterialIcons name="chevron-right" size={20} color={COLORS.error} />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogoutPress}>
            <MaterialIcons name="logout" size={20} color="#ffffff" />
            <Text style={styles.logoutBtnText}>LOGOUT SESSION</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── RESETTING OVERLAY ─────────────────────────────────────────── */}
      <Modal visible={resetting} transparent animationType="fade">
        <View style={styles.overlayCenter}>
          <View style={styles.progressBox}>
            <ActivityIndicator size="large" color={COLORS.error} />
            <Text style={styles.progressTitle}>Resetting Database...</Text>
            <Text style={styles.progressDesc}>Deleting all trips, vehicles, drivers & logs</Text>
          </View>
        </View>
      </Modal>

      {/* ── WARNING MODAL ─────────────────────────────────────────────── */}
      <Modal visible={showWarning} transparent animationType="fade">
        <View style={styles.overlayCenter}>
          <Animated.View style={[styles.warningBox, { transform: [{ translateX: warningShakeAnim }] }]}>
            {/* Icon */}
            <View style={styles.warningIconCircle}>
              <MaterialIcons name="warning" size={36} color="#dc2626" />
            </View>

            <Text style={styles.warningTitle}>⚠️ Confirm Full Reset</Text>
            <Text style={styles.warningBody}>
              This will <Text style={styles.warningBold}>permanently delete</Text> all data from the shared database:
            </Text>

            <View style={styles.warningList}>
              {['All Trips & GPS history', 'All Drivers & Vehicles', 'All Expenses & Receipts', 'GC Notes, Memos & Lorry Bookings', 'Activity Logs & Documents'].map((item) => (
                <View key={item} style={styles.warningListItem}>
                  <MaterialIcons name="remove-circle" size={14} color="#dc2626" />
                  <Text style={styles.warningListText}>{item}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.warningFootnote}>
              This affects both the Admin Console and the Driver App. This action cannot be undone.
            </Text>

            <View style={styles.warningBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowWarning(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmResetBtn} onPress={handleConfirmReset}>
                <MaterialIcons name="delete-forever" size={16} color="#ffffff" />
                <Text style={styles.confirmResetBtnText}>RESET ALL DATA</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ── SUCCESS MODAL ─────────────────────────────────────────────── */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.overlayCenter}>
          <Animated.View style={[styles.successBox, { transform: [{ scale: scaleAnim }] }]}>
            <Animated.View style={[styles.successIconCircle, { transform: [{ scale: pulseAnim }] }]}>
              <Animated.View style={{ opacity: checkAnim, transform: [{ scale: checkAnim }] }}>
                <MaterialIcons name="check-circle" size={64} color="#16a34a" />
              </Animated.View>
            </Animated.View>

            <Text style={styles.successTitle}>Database Reset!</Text>
            <Text style={styles.successSubtitle}>All data has been permanently deleted.</Text>

            <View style={styles.successTagRow}>
              {['Trips', 'Vehicles', 'Drivers', 'Expenses', 'Logs'].map((tag) => (
                <View key={tag} style={styles.successTag}>
                  <MaterialIcons name="check" size={10} color="#16a34a" />
                  <Text style={styles.successTagText}>{tag}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.successFootnote}>The shared database is now empty.</Text>

            <TouchableOpacity style={styles.successDismissBtn} onPress={() => setShowSuccess(false)}>
              <Text style={styles.successDismissBtnText}>DONE</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* ── ERROR MODAL ───────────────────────────────────────────────── */}
      <Modal visible={showError} transparent animationType="slide">
        <View style={styles.overlayCenter}>
          <View style={styles.errorBox}>
            <MaterialIcons name="error" size={40} color="#dc2626" />
            <Text style={styles.errorTitle}>Reset Failed</Text>
            <Text style={styles.errorMsg}>{errorMsg}</Text>
            <TouchableOpacity style={styles.errorDismissBtn} onPress={() => setShowError(false)}>
              <Text style={styles.errorDismissBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.gutter, paddingBottom: 96 },
  screenTitle: {
    fontSize: 20, fontWeight: '900', color: COLORS.primary,
    marginBottom: 16, marginTop: Platform.OS === 'ios' ? 12 : 8,
  },
  card: {
    backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1,
    borderColor: COLORS.outlineVariant, padding: 16, marginBottom: 16, ...SHADOWS.light,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  profileName: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary },
  profileRole: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },
  sectionTitle: {
    fontSize: 10, fontWeight: 'bold', color: COLORS.textMuted,
    marginBottom: 12, letterSpacing: 0.5,
  },
  settingsItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.surfaceContainerLow, gap: 12,
  },
  itemTextContainer: { flex: 1 },
  itemTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.textDark },
  itemDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  itemStatus: { fontSize: 11, fontWeight: 'bold', color: COLORS.textMuted },
  dangerCard: { borderColor: COLORS.error + '30' },
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 12,
  },
  dangerActionLabel: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  dangerTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.error },
  dangerDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, paddingRight: 16 },
  logoutBtn: {
    flexDirection: 'row', backgroundColor: COLORS.primary, height: 48,
    borderRadius: 6, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20,
  },
  logoutBtnText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold', letterSpacing: 0.5 },

  // Overlay
  overlayCenter: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },

  // Progress box
  progressBox: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 32,
    alignItems: 'center', gap: 12, width: '100%', maxWidth: 320,
  },
  progressTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  progressDesc: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },

  // Warning modal
  warningBox: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 24,
    width: '100%', maxWidth: 380, alignItems: 'center',
    borderTopWidth: 4, borderTopColor: '#dc2626',
  },
  warningIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  warningTitle: { fontSize: 18, fontWeight: '900', color: '#dc2626', marginBottom: 8 },
  warningBody: { fontSize: 13, color: '#374151', textAlign: 'center', marginBottom: 12 },
  warningBold: { fontWeight: '900', color: '#dc2626' },
  warningList: { width: '100%', gap: 6, marginBottom: 14 },
  warningListItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warningListText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  warningFootnote: {
    fontSize: 11, color: '#6b7280', textAlign: 'center',
    marginBottom: 20, fontStyle: 'italic',
  },
  warningBtnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: {
    flex: 1, height: 46, borderRadius: 10, borderWidth: 1.5,
    borderColor: COLORS.outlineVariant, alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
  confirmResetBtn: {
    flex: 1, height: 46, borderRadius: 10, backgroundColor: '#dc2626',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  confirmResetBtnText: { fontSize: 12, fontWeight: '900', color: '#ffffff', letterSpacing: 0.5 },

  // Success modal
  successBox: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 28,
    width: '100%', maxWidth: 340, alignItems: 'center',
    borderTopWidth: 4, borderTopColor: '#16a34a',
  },
  successIconCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  successTitle: { fontSize: 22, fontWeight: '900', color: '#15803d', marginBottom: 6 },
  successSubtitle: { fontSize: 13, color: '#374151', textAlign: 'center', marginBottom: 16 },
  successTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 14 },
  successTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  successTagText: { fontSize: 11, fontWeight: '700', color: '#15803d' },
  successFootnote: { fontSize: 11, color: '#6b7280', marginBottom: 20 },
  successDismissBtn: {
    width: '100%', height: 46, borderRadius: 10,
    backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center',
  },
  successDismissBtnText: { fontSize: 14, fontWeight: '900', color: '#ffffff', letterSpacing: 1 },

  // Error modal
  errorBox: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 28,
    width: '100%', maxWidth: 340, alignItems: 'center', gap: 10,
    borderTopWidth: 4, borderTopColor: '#dc2626',
  },
  errorTitle: { fontSize: 18, fontWeight: '900', color: '#dc2626' },
  errorMsg: { fontSize: 12, color: '#374151', textAlign: 'center' },
  errorDismissBtn: {
    marginTop: 8, width: '100%', height: 44, borderRadius: 10,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  errorDismissBtnText: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
});
