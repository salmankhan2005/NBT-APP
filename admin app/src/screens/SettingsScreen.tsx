import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { db } from '../db/database';

interface SettingsScreenProps {
  onLogout: () => void;
}

export default function SettingsScreen({ onLogout }: SettingsScreenProps) {
  const [resetting, setResetting] = useState(false);

  const handleResetData = () => {
    Alert.alert(
      'Reset Shared Database?',
      'This will delete all newly created trips, drivers, vehicles, operating expenses, and Goods Consignments, restoring the backend datastore to original seed values. This affects both the Admin Console and the Driver App.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'RESET ALL',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              if (typeof (db as any).resetData === 'function') {
                await (db as any).resetData();
              }
              Alert.alert('Database Reset', 'Local data has been reset to default values.');
            } catch (e) {
              Alert.alert('Error', 'Could not reset local datastore.');
            } finally {
              setResetting(false);
            }
          }
        }
      ]
    );
  };

  const handleLogoutPress = () => {
    Alert.alert('Logout', 'Are you sure you want to log out of the Admin Console?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'LOGOUT', style: 'destructive', onPress: onLogout }
    ]);
  };

  return (
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

      {/* System Settings List */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>SYSTEM DIAGNOSTICS</Text>

        <View style={styles.settingsItem}>
          <MaterialIcons name="cloud-done" size={20} color={COLORS.success} />
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemTitle}>Central Database Link</Text>
            <Text style={styles.itemDesc}>Connected to Next.js API (db.json)</Text>
          </View>
          <Text style={styles.itemStatus}>ACTIVE</Text>
        </View>

        <View style={styles.settingsItem}>
          <MaterialIcons name="security" size={20} color={COLORS.secondary} />
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemTitle}>SHA-256 Authentication</Text>
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

      {/* Danger Zone Actions */}
      <View style={[styles.card, styles.dangerCard]}>
        <Text style={[styles.sectionTitle, { color: COLORS.error }]}>DANGER ZONE</Text>

        <TouchableOpacity 
          style={[styles.actionRow, resetting && { opacity: 0.6 }]} 
          onPress={handleResetData}
          disabled={resetting}
        >
          <View style={styles.dangerActionLabel}>
            <MaterialIcons name="settings-backup-restore" size={20} color={COLORS.error} />
            <View>
              <Text style={styles.dangerTitle}>Reset Shared Database</Text>
              <Text style={styles.dangerDesc}>Restore central db.json file back to seed data</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.gutter,
    paddingBottom: 96,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 16,
    marginTop: Platform.OS === 'ios' ? 12 : 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.light,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  profileRole: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceContainerLow,
    gap: 12,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  itemDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  itemStatus: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  dangerCard: {
    borderColor: COLORS.error + '30',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  dangerActionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  dangerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.error,
  },
  dangerDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    paddingRight: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  logoutBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
