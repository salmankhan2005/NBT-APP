import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS, SPACING } from '../theme';

interface LandingPageProps {
  onEnterDashboard: () => void;
}

export default function LandingPage({ onEnterDashboard }: LandingPageProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 880;

  // Animations
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>NBT</Text>
            </View>
            <View>
              <Text style={styles.brandTitle}>NEW BALAJI TRANSPORT</Text>
              <Text style={styles.brandSubtitle}>Logistics & Fleet Command Center</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.enterHeaderBtn} onPress={onEnterDashboard}>
            <Text style={styles.enterHeaderBtnText}>ENTER DASHBOARD</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <Animated.View style={[styles.heroCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.heroBadge}>
            <MaterialIcons name="verified" size={14} color="#38bdf8" />
            <Text style={styles.heroBadgeText}>Next-Gen Transport & Fleet Suite v2.5</Text>
          </View>

          <Text style={styles.heroTitle}>
            Enterprise Freight Logistics {'\n'}
            <Text style={styles.heroHighlight}>Real-Time Fleet Intelligence</Text>
          </Text>

          <Text style={styles.heroDescription}>
            Streamline lorry assignments, live GPS telemetry, trip expense settlements, automated GC & Memo printing, and driver POD tracking in one unified operations platform.
          </Text>

          <View style={styles.heroActionRow}>
            <TouchableOpacity style={styles.ctaButtonPrimary} onPress={onEnterDashboard}>
              <Text style={styles.ctaTextPrimary}>ENTER ADMIN DASHBOARD</Text>
              <MaterialIcons name="speed" size={20} color="#08124a" />
            </TouchableOpacity>

            <View style={styles.systemStatusTag}>
              <View style={styles.pulseDot} />
              <Text style={styles.systemStatusText}>Neon Database & GPS Live</Text>
            </View>
          </View>
        </Animated.View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <MaterialIcons name="local-shipping" size={28} color="#38bdf8" />
            <Text style={styles.metricValue}>500+</Text>
            <Text style={styles.metricLabel}>Managed Heavy Lorries</Text>
          </View>

          <View style={styles.metricCard}>
            <MaterialIcons name="gps-fixed" size={28} color="#4ade80" />
            <Text style={styles.metricValue}>100%</Text>
            <Text style={styles.metricLabel}>Real-Time GPS Tracking</Text>
          </View>

          <View style={styles.metricCard}>
            <MaterialIcons name="receipt-long" size={28} color="#facc15" />
            <Text style={styles.metricValue}>Instant</Text>
            <Text style={styles.metricLabel}>GC & Memo Generation</Text>
          </View>

          <View style={styles.metricCard}>
            <MaterialIcons name="account-balance-wallet" size={28} color="#c084fc" />
            <Text style={styles.metricValue}>Automated</Text>
            <Text style={styles.metricLabel}>Profit & Loss Audit</Text>
          </View>
        </View>

        {/* Core Features Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Operations Capability Suite</Text>
          <Text style={styles.sectionSubtitle}>Everything you need to manage nationwide lorry freight logistics</Text>
        </View>

        <View style={styles.featuresGrid}>
          <View style={styles.featureCard}>
            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
              <MaterialIcons name="alt-route" size={24} color="#38bdf8" />
            </View>
            <Text style={styles.featureTitle}>Trip Lifecycle Registry</Text>
            <Text style={styles.featureDesc}>
              Assign drivers, vehicles, starting depots, and destinations with auto-generated Driver PINs and live tracking IDs.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(74, 222, 128, 0.15)' }]}>
              <MaterialIcons name="my-location" size={24} color="#4ade80" />
            </View>
            <Text style={styles.featureTitle}>Live GPS Telemetry</Text>
            <Text style={styles.featureDesc}>
              Track speed, odometer logs, route progress, and live vehicle coordinates directly synced from driver apps.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(250, 204, 21, 0.15)' }]}>
              <MaterialIcons name="print" size={24} color="#facc15" />
            </View>
            <Text style={styles.featureTitle}>GC & Memo Document Suite</Text>
            <Text style={styles.featureDesc}>
              Generate, edit, print, and download official A4 Lorry Memos and Goods Consignment notes with digital signatures.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(192, 132, 252, 0.15)' }]}>
              <MaterialIcons name="calculate" size={24} color="#c084fc" />
            </View>
            <Text style={styles.featureTitle}>Financial Profit & Loss</Text>
            <Text style={styles.featureDesc}>
              Audit trip fuel, toll, police, and lorry expenses against agreed freight to calculate exact driver payments and profits.
            </Text>
          </View>
        </View>

        {/* Footer Banner */}
        <View style={styles.footerBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.footerTitle}>Ready to start fleet operations?</Text>
            <Text style={styles.footerSubtitle}>Access live dispatch metrics, trips, and lorry management.</Text>
          </View>

          <TouchableOpacity style={styles.footerCtaBtn} onPress={onEnterDashboard}>
            <Text style={styles.footerCtaText}>ENTER DASHBOARD</Text>
            <MaterialIcons name="play-arrow" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Copyright */}
        <Text style={styles.copyrightText}>
          © 2026 New Balaji Transport (NBT). All Rights Reserved. Enterprise Logistics Command Platform.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050b29',
  },
  scrollContent: {
    padding: SPACING.gutter,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#050b29',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 1,
  },
  brandTitle: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },
  brandSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
  },
  enterHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  enterHeaderBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  heroCard: {
    backgroundColor: '#0a1647',
    borderRadius: 24,
    padding: Platform.OS === 'web' ? 36 : 24,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginBottom: 24,
    ...SHADOWS.medium,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  heroBadgeText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: Platform.OS === 'web' ? 34 : 26,
    fontWeight: '900',
    lineHeight: Platform.OS === 'web' ? 44 : 34,
    marginBottom: 14,
  },
  heroHighlight: {
    color: '#38bdf8',
  },
  heroDescription: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 720,
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  ctaButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#38bdf8',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
  },
  ctaTextPrimary: {
    color: '#050b29',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.8,
  },
  systemStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  systemStatusText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 32,
  },
  metricCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#0a1647',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'flex-start',
  },
  metricValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 10,
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 32,
  },
  featureCard: {
    width: Platform.OS === 'web' ? '48%' : '100%',
    backgroundColor: '#0a1647',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  featureIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  featureTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  featureDesc: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 20,
  },
  footerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1d4ed8',
    borderRadius: 20,
    padding: 24,
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  footerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  footerSubtitle: {
    color: '#93c5fd',
    fontSize: 13,
    marginTop: 4,
  },
  footerCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#050b29',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },
  footerCtaText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 13,
  },
  copyrightText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    marginTop: 12,
  },
});
