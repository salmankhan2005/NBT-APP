import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
  Platform,
  Linking,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme';
import { VehicleDocumentItem, VehicleDetailsItem } from '../db/database';

interface VehicleDocumentsModalProps {
  visible: boolean;
  onClose: () => void;
  vehicleDetails?: VehicleDetailsItem;
  documents?: VehicleDocumentItem[];
}

type DocFilter = 'ALL' | 'RC' | 'INSURANCE' | 'POLLUTION' | 'PERMIT' | 'FC';

export default function VehicleDocumentsModal({
  visible,
  onClose,
  vehicleDetails,
  documents = [],
}: VehicleDocumentsModalProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [activeFilter, setActiveFilter] = useState<DocFilter>('ALL');
  const [selectedDoc, setSelectedDoc] = useState<VehicleDocumentItem | null>(null);
  const [zoomModalVisible, setZoomModalVisible] = useState(false);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  const isTablet = windowWidth >= 768;
  const isDesktop = windowWidth >= 1024;

  const handleImageError = (docId: string) => {
    setImageError((prev) => ({ ...prev, [docId]: true }));
  };

  const getDocTypeLabel = (type: string, customLabel?: string) => {
    if (customLabel && customLabel.trim()) {
      return customLabel.trim();
    }

    switch (type.toUpperCase()) {
      case 'RC':
      case 'RC_FRONT':
      case 'RC_BACK':
        return 'Registration Certificate (RC)';
      case 'INSURANCE':
        return 'Commercial Insurance';
      case 'POLLUTION':
        return 'Pollution Under Control (PUC)';
      case 'PERMIT':
        return 'National/State Permit';
      case 'FC':
      case 'FITNESS':
        return 'Fitness Certificate (FC)';
      default:
        return 'Vehicle Document';
    }
  };

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return { text: 'NO EXPIRY DATE', color: COLORS.outline, badgeBg: '#f1f5f9' };
    const exp = new Date(expiryDate);
    const now = new Date();
    const diffTime = exp.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: 'EXPIRED', color: COLORS.error, badgeBg: '#fee2e2' };
    } else if (diffDays <= 30) {
      return { text: `EXPIRING SOON (${diffDays} DAYS)`, color: COLORS.orangeAccent, badgeBg: '#fff3e0' };
    } else {
      const years = (diffDays / 365.25).toFixed(1);
      const months = (diffDays / 30.43).toFixed(0);
      let expiryText = `VALID (${months} MONTHS LEFT)`;
      if (diffDays > 365) {
        expiryText = `VALID (${years} YEARS LEFT)`;
      }
      return { text: expiryText, color: '#16a34a', badgeBg: '#dcfce7' };
    }
  };

  // Harmonized document filters
  const filteredDocs = documents.filter((doc) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'RC') {
      return ['RC', 'RC_FRONT', 'RC_BACK'].includes(doc.docType.toUpperCase());
    }
    return doc.docType.toUpperCase() === activeFilter;
  });

  // Extract explicit document links from vehicle details in case documents array is empty
  const fallbackDocs: VehicleDocumentItem[] = [];
  if (documents.length === 0 && vehicleDetails) {
    const addFallback = (type: string, label: string, url?: string, expiry?: string) => {
      if (url) {
        fallbackDocs.push({
          docId: `FALLBACK-${type}`,
          docType: type,
          docLabel: label,
          docNumber: 'Verified',
          expiryDate: expiry,
          fileUri: url,
          fileName: `${type.toLowerCase()}.jpg`,
          fileType: 'image/jpeg',
          uploadedAt: new Date().toISOString(),
          isActive: true,
        });
      }
    };

    addFallback('RC', 'Registration Certificate (RC)', vehicleDetails.rcFrontUrl || vehicleDetails.rcBackUrl);
    addFallback('INSURANCE', 'Vehicle Insurance', vehicleDetails.insuranceUrl, vehicleDetails.insuranceExpiryDate);
    addFallback('POLLUTION', 'Pollution Certificate (PUC)', vehicleDetails.pollutionUrl, vehicleDetails.pollutionExpiryDate);
    addFallback('PERMIT', 'Road Permit', vehicleDetails.permitUrl, vehicleDetails.permitExpiryDate);
    addFallback('FC', 'Fitness Certificate (FC)', vehicleDetails.fcUrl, vehicleDetails.fcExpiryDate);
  }

  const finalDocsList = documents.length > 0 ? filteredDocs : fallbackDocs.filter((doc) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'RC') return doc.docType === 'RC';
    return doc.docType === activeFilter;
  });

  const activeDocDetail = selectedDoc || finalDocsList[0];

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Vehicle Documents</Text>
              <Text style={styles.modalSubtitle}>
                {vehicleDetails?.vehicleNumber || 'Assigned Vehicle'} • {vehicleDetails?.vehicleType || 'Fleet truck'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <MaterialIcons name="close" size={24} color={COLORS.outline} />
            </TouchableOpacity>
          </View>

          {/* Quick Filter Bar */}
          <View style={styles.filterBarContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
              {(['ALL', 'RC', 'INSURANCE', 'POLLUTION', 'PERMIT', 'FC'] as DocFilter[]).map((filter) => {
                const isActive = activeFilter === filter;
                return (
                  <TouchableOpacity
                    key={filter}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setActiveFilter(filter)}
                  >
                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                      {filter}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Main Grid View */}
          <View style={[styles.mainBody, isDesktop && styles.desktopLayout]}>
            {/* Sidebar list or full list */}
            <ScrollView
              style={[styles.listContainer, isDesktop && styles.desktopList]}
              contentContainerStyle={styles.listContent}
            >
              {finalDocsList.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="folder-open" size={64} color={COLORS.outline} />
                  <Text style={styles.emptyTitle}>No Documents Found</Text>
                  <Text style={styles.emptySubtitle}>
                    There are no documents uploaded for this vehicle under this category.
                  </Text>
                </View>
              ) : (
                finalDocsList.map((doc) => {
                  const status = getExpiryStatus(doc.expiryDate);
                  const isSelected = selectedDoc?.docId === doc.docId;
                  return (
                    <TouchableOpacity
                      key={doc.docId}
                      style={[
                        styles.docCard,
                        isSelected && styles.docCardSelected,
                        isDesktop && { marginBottom: 12 },
                      ]}
                      onPress={() => setSelectedDoc(doc)}
                    >
                      <View style={styles.docCardHeader}>
                        <View style={styles.iconContainer}>
                          <MaterialIcons
                            name={doc.docType === 'RC' ? 'drive-eta' : 'verified-user'}
                            size={24}
                            color={COLORS.primary}
                          />
                        </View>
                        <View style={styles.docMeta}>
                          <Text style={styles.docLabel} numberOfLines={1}>
                            {getDocTypeLabel(doc.docType, doc.docLabel)}
                          </Text>
                          <Text style={styles.docNumber}>No. {doc.docNumber || 'Verified'}</Text>
                        </View>
                      </View>

                      <View style={styles.docCardFooter}>
                        <View style={[styles.statusBadge, { backgroundColor: status.badgeBg }]}>
                          <Text style={[styles.statusBadgeText, { color: status.color }]}>
                            {status.text}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Document Details & Viewer Panel */}
            {activeDocDetail && (
              <View style={[styles.viewerContainer, isDesktop && styles.desktopViewer]}>
                <ScrollView contentContainerStyle={styles.viewerContent}>
                  <View style={styles.viewerCard}>
                    <Text style={styles.viewerDocTitle}>{getDocTypeLabel(activeDocDetail.docType, activeDocDetail.docLabel)}</Text>
                    <View style={styles.viewerMetaRow}>
                      <View style={styles.metaCol}>
                        <Text style={styles.metaLabel}>DOCUMENT NUMBER</Text>
                        <Text style={styles.metaVal}>{activeDocDetail.docNumber || 'Verified'}</Text>
                      </View>
                      {activeDocDetail.expiryDate && (
                        <View style={styles.metaCol}>
                          <Text style={styles.metaLabel}>EXPIRY DATE</Text>
                          <Text style={styles.metaVal}>
                            {new Date(activeDocDetail.expiryDate).toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Fully Responsive Image container */}
                    <View style={styles.imageContainer}>
                      {imageError[activeDocDetail.docId] ? (
                        <View style={styles.imagePlaceholder}>
                          <MaterialIcons name="broken-image" size={48} color={COLORS.outline} />
                          <Text style={styles.imagePlaceholderText}>Image Preview Unavailable</Text>
                          <TouchableOpacity
                            style={styles.openBrowserBtn}
                            onPress={() => Linking.openURL(activeDocDetail.fileUri)}
                          >
                            <Text style={styles.openBrowserBtnText}>OPEN IN BROWSER ↗</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          activeOpacity={0.9}
                          style={styles.imageTouch}
                          onPress={() => {
                            setSelectedDoc(activeDocDetail);
                            setZoomModalVisible(true);
                          }}
                        >
                          <Image
                            source={{ uri: activeDocDetail.fileUri }}
                            style={styles.docImage}
                            resizeMode="contain"
                            onError={() => handleImageError(activeDocDetail.docId)}
                          />
                          <View style={styles.zoomOverlay}>
                            <MaterialIcons name="zoom-in" size={24} color="#ffffff" />
                            <Text style={styles.zoomText}>TAP TO ZOOM</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Action Panel */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.fullSizeBtn}
                        onPress={() => Linking.openURL(activeDocDetail.fileUri)}
                      >
                        <MaterialIcons name="open-in-new" size={20} color={COLORS.primary} />
                        <Text style={styles.fullSizeBtnText}>OPEN FULL RESOLUTION</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>

      {/* Zoom Modal for Responsive High-Resolution Image Viewer */}
      {selectedDoc && (
        <Modal
          visible={zoomModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setZoomModalVisible(false)}
        >
          <View style={styles.zoomContainer}>
            <SafeAreaView style={styles.zoomSafeArea}>
              <View style={styles.zoomHeader}>
                <View>
                  <Text style={styles.zoomDocTitle}>{getDocTypeLabel(selectedDoc.docType)}</Text>
                  <Text style={styles.zoomDocSub}>No. {selectedDoc.docNumber || 'Verified'}</Text>
                </View>
                <TouchableOpacity style={styles.zoomCloseBtn} onPress={() => setZoomModalVisible(false)}>
                  <MaterialIcons name="close" size={28} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <View style={styles.zoomImageContainer}>
                <Image
                  source={{ uri: selectedDoc.fileUri }}
                  style={{ width: windowWidth, height: windowHeight * 0.75 }}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.zoomFooter}>
                <TouchableOpacity
                  style={styles.zoomFooterBtn}
                  onPress={() => Linking.openURL(selectedDoc.fileUri)}
                >
                  <MaterialIcons name="cloud-download" size={22} color="#ffffff" />
                  <Text style={styles.zoomFooterBtnText}>DOWNLOAD FILE</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    marginTop: Platform.OS === 'ios' ? 24 : 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  filterBarContainer: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  mainBody: {
    flex: 1,
  },
  desktopLayout: {
    flexDirection: 'row',
  },
  listContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  desktopList: {
    flex: 2 / 5,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 24,
  },
  docCard: {
    padding: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    ...SHADOWS.light,
  },
  docCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#f8fafc',
  },
  docCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docMeta: {
    flex: 1,
  },
  docLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  docNumber: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  docCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  desktopViewer: {
    flex: 3 / 5,
  },
  viewerContent: {
    padding: 16,
  },
  viewerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...SHADOWS.light,
  },
  viewerDocTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  viewerMetaRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 3,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  imageTouch: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  docImage: {
    width: '100%',
    height: '100%',
  },
  zoomOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zoomText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  imagePlaceholderText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  openBrowserBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  openBrowserBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  fullSizeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  fullSizeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  zoomContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  zoomSafeArea: {
    flex: 1,
  },
  zoomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  zoomDocTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
  },
  zoomDocSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  zoomCloseBtn: {
    padding: 6,
  },
  zoomImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomFooter: {
    padding: 16,
    alignItems: 'center',
  },
  zoomFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  zoomFooterBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
