import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  Animated,
  Easing,
  Image,
  ImageBackground,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

interface LandingPageProps {
  onEnterDashboard: () => void;
}

export default function LandingPage({ onEnterDashboard }: LandingPageProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const isTablet = width >= 600 && width < 900;
  const isMobile = width < 600;

  const scrollViewRef = useRef<ScrollView>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // Pulse animation for status dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();

    // Subtle floating breathing effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 8,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();

    // Ambient glow pulsing
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.85,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, []);

  const scrollToFeatures = () => {
    scrollViewRef.current?.scrollTo({ y: isMobile ? 650 : 720, animated: true });
  };

  const scrollToShowcase = () => {
    scrollViewRef.current?.scrollTo({ y: isMobile ? 1200 : 1100, animated: true });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── TOP NAVIGATION BAR ─── */}
        <Animated.View style={[styles.navBar, { opacity: fadeAnim }]}>
          <View style={styles.navInner}>
            {/* Brand Logo */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
              style={styles.brandContainer}
            >
              <Text style={styles.brandTitleLine1}>Logistics</Text>
              <Text style={styles.brandTitleLine2}>Command</Text>
            </TouchableOpacity>

            {/* Nav Menu Links */}
            <View style={styles.navRightGroup}>
              {!isMobile && (
                <View style={styles.navLinksRow}>
                  <TouchableOpacity
                    style={styles.navLinkItem}
                    onPress={scrollToShowcase}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.navLinkText}>Product</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.navLinkItem}
                    onPress={scrollToFeatures}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.navLinkText}>Features</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.navLinkItem}
                    onPress={() => setActiveModal('Pricing')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.navLinkText}>Pricing</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Login Button */}
              <TouchableOpacity
                style={styles.loginNavBtn}
                onPress={onEnterDashboard}
                activeOpacity={0.85}
              >
                <Text style={styles.loginNavBtnText}>LOGIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* ─── HERO SECTION ─── */}
        <View style={styles.heroWrapper}>
          {/* Hero Truck Background Image */}
          <ImageBackground
            source={require('../../assets/hero_truck_bg.jpg')}
            style={styles.heroBgImage}
            resizeMode="cover"
          >
            {/* Deep dark gradient overlay */}
            <View style={styles.heroOverlayGradientTop} />
            <View style={styles.heroOverlayGradientBottom} />

            {/* Central Hero Content */}
            <Animated.View
              style={[
                styles.heroContent,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* System Online Badge */}
              <View style={styles.statusPill}>
                <Animated.View
                  style={[
                    styles.statusDot,
                    {
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                />
                <Text style={styles.statusPillText}>
                  SYSTEM ONLINE • GLOBAL FLEET ACTIVE
                </Text>
              </View>

              {/* Decorative Accent Dash */}
              <View style={styles.heroAccentDash} />

              {/* Headline */}
              <Text style={styles.heroHeadlineMain}>The Future of</Text>
              <Text style={styles.heroHeadlineGradient}>Fleet Command</Text>

              {/* Subtitle */}
              <Text style={styles.heroSubText}>
                Real-time monitoring, intelligent routing, and automated expense
                management for modern logistics. Absolute reliability and
                real-time clarity designed for high-level fleet operators.
              </Text>

              {/* CTA Buttons */}
              <View
                style={[
                  styles.ctaRow,
                  isMobile && styles.ctaRowMobile,
                ]}
              >
                <TouchableOpacity
                  style={styles.primaryCtaBtn}
                  onPress={onEnterDashboard}
                  activeOpacity={0.88}
                >
                  <Text style={styles.primaryCtaText}>Explore the Dashboard</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryCtaBtn}
                  onPress={() => setActiveModal('CaseStudies')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryCtaText}>View Case Studies</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ImageBackground>
        </View>

        {/* ─── 3 FEATURE CARDS SECTION ─── */}
        <View style={styles.featuresContainer}>
          <View style={styles.featuresInner}>
            <View
              style={[
                styles.featureGrid,
                isDesktop ? styles.featureGridDesktop : styles.featureGridStacked,
              ]}
            >
              {/* Card 1: Live Tracking */}
              <FeatureCard
                iconName="location-on"
                iconColor="#00F2FF"
                iconBg="rgba(0, 242, 255, 0.12)"
                iconBorder="rgba(0, 242, 255, 0.4)"
                title="Live Tracking"
                description="Integrated GPS visualization with sub-second latency. Monitor your entire fleet across global dark-mode maps with dynamic electric routing."
              />

              {/* Card 2: Profit Max */}
              <FeatureCard
                iconName="trending-up"
                iconColor="#FC7728"
                iconBg="rgba(252, 119, 40, 0.14)"
                iconBorder="rgba(252, 119, 40, 0.45)"
                title="Profit Max"
                description="Automated expense vs. revenue analytics. Advanced algorithms calculate optimal load balancing and fuel efficiency in real-time."
              />

              {/* Card 3: Assign & Sync */}
              <FeatureCard
                iconName="swap-horiz"
                iconColor="#818CF8"
                iconBg="rgba(129, 140, 248, 0.14)"
                iconBorder="rgba(129, 140, 248, 0.4)"
                title="Assign & Sync"
                description="Instant driver-to-admin communication protocols. Seamlessly push mission-critical updates and routing changes directly to the cab."
              />
            </View>
          </View>
        </View>

        {/* ─── COMMAND CENTER SHOWCASE SECTION ─── */}
        <View style={styles.showcaseSection}>
          <View style={styles.showcaseHeader}>
            <Text style={styles.showcaseTitle}>Total Operational Control</Text>
            <Text style={styles.showcaseSubtitle}>
              A cinematic command center interface designed for clarity under pressure. Experience logistics intelligence visualized.
            </Text>
          </View>

          {/* Ambient Glow behind showcase */}
          <View style={styles.showcaseCardWrapper}>
            <Animated.View
              style={[
                styles.showcaseAmbientGlow,
                { opacity: glowAnim },
              ]}
            />

            {/* Showcase Mockup Frame */}
            <View style={styles.showcaseFrame}>
              {/* Header inside frame */}
              <View style={styles.showcaseFrameHeader}>
                <View style={styles.windowControls}>
                  <View style={[styles.windowDot, { backgroundColor: '#FF5F56' }]} />
                  <View style={[styles.windowDot, { backgroundColor: '#FFBD2E' }]} />
                  <View style={[styles.windowDot, { backgroundColor: '#27C93F' }]} />
                </View>
                <Text style={styles.showcaseFrameTitle}>
                  Logistics Command - Cinematic Landing Page
                </Text>
                <View style={{ width: 44 }} />
              </View>

              {/* Image Preview / Mockup Screen */}
              <ImageBackground
                source={require('../../assets/ops_command_mockup.jpg')}
                style={styles.showcaseImage}
                resizeMode="cover"
              >
                <View style={styles.showcaseInnerOverlay}>
                  <TouchableOpacity
                    style={styles.showcaseInteractiveBtn}
                    onPress={onEnterDashboard}
                    activeOpacity={0.9}
                  >
                    <MaterialIcons name="fullscreen" size={20} color="#FFFFFF" />
                    <Text style={styles.showcaseInteractiveBtnText}>
                      LAUNCH LIVE COMMAND
                    </Text>
                  </TouchableOpacity>
                </View>
              </ImageBackground>
            </View>
          </View>
        </View>

        {/* ─── FOOTER SECTION ─── */}
        <View style={styles.footer}>
          <View style={styles.footerInner}>
            {/* Left Brand Column */}
            <View style={styles.footerBrandCol}>
              <Text style={styles.footerBrandName}>Logistics Command</Text>
              <Text style={styles.footerCopyright}>© 2026 Logistics Command.</Text>
              <Text style={styles.footerCopyright}>All rights reserved.</Text>
            </View>

            {/* Right Links Column */}
            <View style={styles.footerLinksCol}>
              <TouchableOpacity
                onPress={() => setActiveModal('Privacy')}
                activeOpacity={0.7}
              >
                <Text style={styles.footerLinkText}>Privacy Policy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveModal('Terms')}
                activeOpacity={0.7}
              >
                <Text style={styles.footerLinkText}>Terms of Service</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveModal('Support')}
                activeOpacity={0.7}
              >
                <Text style={styles.footerLinkText}>Contact Support</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveModal('Careers')}
                activeOpacity={0.7}
              >
                <Text style={styles.footerLinkText}>Careers</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ─── POPUP MODAL (For Pricing, Case Studies, Policies) ─── */}
      <Modal
        visible={activeModal !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeModal === 'Pricing' && 'Enterprise Logistics Pricing'}
                {activeModal === 'CaseStudies' && 'Fleet Operations Case Studies'}
                {activeModal === 'Privacy' && 'Privacy Policy'}
                {activeModal === 'Terms' && 'Terms of Service'}
                {activeModal === 'Support' && '24/7 Priority Support'}
                {activeModal === 'Careers' && 'Join the Command Team'}
              </Text>
              <TouchableOpacity
                onPress={() => setActiveModal(null)}
                style={styles.modalCloseBtn}
              >
                <MaterialIcons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {activeModal === 'Pricing' && (
                <View style={styles.modalContentGroup}>
                  <Text style={styles.modalText}>
                    Logistics Command provides unified fleet orchestration for mid-to-enterprise transport operators.
                  </Text>
                  <View style={styles.pricingCard}>
                    <Text style={styles.pricingTier}>Enterprise Command Plan</Text>
                    <Text style={styles.pricingAmount}>₹4,999 / truck / yr</Text>
                    <Text style={styles.pricingDesc}>
                      Includes sub-second GPS tracking, automated fuel analytics, GC/Memo issuance, driver app pairing, and unlimited offline caching.
                    </Text>
                  </View>
                </View>
              )}

              {activeModal === 'CaseStudies' && (
                <View style={styles.modalContentGroup}>
                  <Text style={styles.modalText}>
                    <Text style={{ fontWeight: '700', color: '#FC7728' }}>
                      NBT Transport Network:
                    </Text>{' '}
                    Reduced empty transit runs by 28% and cut driver route delays by 42 minutes per 500km journey using dynamic route recalculations.
                  </Text>
                  <Text style={[styles.modalText, { marginTop: 14 }]}>
                    <Text style={{ fontWeight: '700', color: '#00F2FF' }}>
                      Express Cargo Lines:
                    </Text>{' '}
                    Automated GC dispatch and instant payment reconciliation, saving 18 admin hours every week.
                  </Text>
                </View>
              )}

              {activeModal === 'Privacy' && (
                <Text style={styles.modalText}>
                  Your telemetry, driver coordinates, and trip consignment logs are encrypted end-to-end using AES-256 standards with strict role-based access control.
                </Text>
              )}

              {activeModal === 'Terms' && (
                <Text style={styles.modalText}>
                  Authorized enterprise use only. Real-time GPS pings and driver records are synchronized in compliance with Indian Motor Vehicles regulations.
                </Text>
              )}

              {activeModal === 'Support' && (
                <View style={styles.modalContentGroup}>
                  <Text style={styles.modalText}>
                    Direct 24/7 Operations Helpdesk:
                  </Text>
                  <Text style={[styles.modalText, { color: '#00F2FF', marginTop: 8 }]}>
                    📧 ops-support@logisticscommand.com
                  </Text>
                  <Text style={[styles.modalText, { color: '#FC7728', marginTop: 4 }]}>
                    📞 1800-NBT-FLEET
                  </Text>
                </View>
              )}

              {activeModal === 'Careers' && (
                <Text style={styles.modalText}>
                  We are hiring Distributed Systems Engineers, React Native specialists, and Fleet Telematics experts. Submit your portfolio to careers@logisticscommand.com.
                </Text>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalActionBtn}
                onPress={() => {
                  setActiveModal(null);
                  onEnterDashboard();
                }}
              >
                <Text style={styles.modalActionBtnText}>ACCESS ADMIN PORTAL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── REUSABLE FEATURE CARD ───
interface FeatureCardProps {
  iconName: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  iconBg: string;
  iconBorder: string;
  title: string;
  description: string;
}

function FeatureCard({
  iconName,
  iconColor,
  iconBg,
  iconBorder,
  title,
  description,
}: FeatureCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <View
      style={[
        styles.featureCard,
        isHovered && styles.featureCardHovered,
      ]}
      // @ts-ignore
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Icon Box */}
      <View
        style={[
          styles.featureIconBox,
          {
            backgroundColor: iconBg,
            borderColor: iconBorder,
          },
        ]}
      >
        <MaterialIcons name={iconName} size={28} color={iconColor} />
      </View>

      {/* Card Title */}
      <Text style={styles.featureCardTitle}>{title}</Text>

      {/* Card Description */}
      <Text style={styles.featureCardDesc}>{description}</Text>
    </View>
  );
}

// ─── STYLESHEET ───
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#040711',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#040711',
  },

  // ─── NAVIGATION BAR ───
  navBar: {
    width: '100%',
    backgroundColor: 'rgba(4, 7, 17, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    zIndex: 100,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  navInner: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  brandTitleLine1: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FC7728',
    letterSpacing: 0.5,
    lineHeight: 22,
  },
  brandTitleLine2: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FC7728',
    letterSpacing: 0.5,
    lineHeight: 22,
  },
  navRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  navLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  navLinkItem: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  navLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.3,
  },
  loginNavBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 8,
  },
  loginNavBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },

  // ─── HERO SECTION ───
  heroWrapper: {
    width: '100%',
    minHeight: 640,
    position: 'relative',
    backgroundColor: '#040711',
  },
  heroBgImage: {
    width: '100%',
    minHeight: 640,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOverlayGradientTop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(4, 7, 17, 0.45)',
  },
  heroOverlayGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(4, 7, 17, 0.95)',
  },
  heroContent: {
    maxWidth: 780,
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 60,
    alignItems: 'center',
    zIndex: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 11, 23, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#00F2FF',
    marginRight: 9,
    shadowColor: '#00F2FF',
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
    letterSpacing: 1.1,
  },
  heroAccentDash: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#00F2FF',
    marginBottom: 16,
    opacity: 0.8,
  },
  heroHeadlineMain: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 56,
  },
  heroHeadlineGradient: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FC7728',
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 60,
    marginBottom: 20,
    textShadowColor: 'rgba(252, 119, 40, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
  },
  heroSubText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 640,
    marginBottom: 36,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
  },
  ctaRowMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  primaryCtaBtn: {
    backgroundColor: '#FC7728',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FC7728',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  primaryCtaText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  secondaryCtaBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E2E8F0',
    letterSpacing: 0.3,
  },

  // ─── FEATURES SECTION ───
  featuresContainer: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 60,
    backgroundColor: '#040711',
    alignItems: 'center',
  },
  featuresInner: {
    maxWidth: 1200,
    width: '100%',
  },
  featureGrid: {
    width: '100%',
    gap: 24,
  },
  featureGridDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featureGridStacked: {
    flexDirection: 'column',
  },
  featureCard: {
    flex: 1,
    minHeight: 220,
    backgroundColor: '#0A101D',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  featureCardHovered: {
    borderColor: 'rgba(252, 119, 40, 0.35)',
    backgroundColor: '#0E1626',
  },
  featureIconBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureCardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  featureCardDesc: {
    fontSize: 14,
    fontWeight: '400',
    color: '#94A3B8',
    lineHeight: 22,
  },

  // ─── SHOWCASE SECTION ───
  showcaseSection: {
    width: '100%',
    paddingHorizontal: 24,
    paddingVertical: 60,
    backgroundColor: '#040711',
    alignItems: 'center',
  },
  showcaseHeader: {
    maxWidth: 720,
    width: '100%',
    alignItems: 'center',
    marginBottom: 44,
  },
  showcaseTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  showcaseSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
  },
  showcaseCardWrapper: {
    maxWidth: 1040,
    width: '100%',
    position: 'relative',
    alignItems: 'center',
  },
  showcaseAmbientGlow: {
    position: 'absolute',
    top: -20,
    left: '10%',
    right: '10%',
    bottom: -20,
    borderRadius: 30,
    backgroundColor: 'rgba(252, 119, 40, 0.18)',
    shadowColor: '#FC7728',
    shadowOpacity: 0.5,
    shadowRadius: 50,
  },
  showcaseFrame: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: '#0B111E',
    shadowColor: '#000000',
    shadowOpacity: 0.6,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },
  showcaseFrameHeader: {
    height: 42,
    backgroundColor: '#0E172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  windowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  windowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  showcaseFrameTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
    letterSpacing: 0.3,
  },
  showcaseImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  showcaseInnerOverlay: {
    paddingBottom: 24,
  },
  showcaseInteractiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(252, 119, 40, 0.5)',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: '#FC7728',
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  showcaseInteractiveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  // ─── FOOTER ───
  footer: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#03050B',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  footerInner: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 28,
  },
  footerBrandCol: {
    gap: 4,
  },
  footerBrandName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FC7728',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  footerCopyright: {
    fontSize: 13,
    fontWeight: '400',
    color: '#64748B',
    lineHeight: 18,
  },
  footerLinksCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 24,
  },
  footerLinkText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
    letterSpacing: 0.2,
  },

  // ─── MODAL STYLES ───
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: 380,
  },
  modalContentGroup: {
    gap: 12,
  },
  modalText: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 22,
  },
  pricingCard: {
    backgroundColor: 'rgba(252, 119, 40, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(252, 119, 40, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    gap: 6,
  },
  pricingTier: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FC7728',
    letterSpacing: 0.5,
  },
  pricingAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  pricingDesc: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginTop: 4,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0B111E',
  },
  modalActionBtn: {
    backgroundColor: '#FC7728',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
