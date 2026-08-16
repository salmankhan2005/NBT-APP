/**
 * Vehicle Document OCR Processing Modal Component
 * 
 * Displays OCR results, allows manual editing, and handles document verification
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../theme';

export interface OCRResult {
  documentType: string;
  detectedDocumentTypeConfidence: number;
  mismatchDetected: boolean;
  expectedType: string;
  extractedData: {
    vehicleNumber?: string;
    documentNumber?: string;
    issueDate?: string;
    expiryDate?: string;
    companyName?: string;
    policyNumber?: string;
  };
  warnings: string[];
  recommendations: string[];
}

interface OCRResultModalProps {
  visible: boolean;
  result: OCRResult | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (expiryDate: string, extraData: Record<string, string>) => void;
}

export function OCRResultModal({
  visible,
  result,
  loading,
  onClose,
  onConfirm,
}: OCRResultModalProps) {
  const [editedExpiryDate, setEditedExpiryDate] = useState('');
  const [editedDocNumber, setEditedDocNumber] = useState('');
  const [editedVehicleNumber, setEditedVehicleNumber] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (result) {
      setEditedExpiryDate(result.extractedData.expiryDate || '');
      setEditedDocNumber(result.extractedData.documentNumber || '');
      setEditedVehicleNumber(result.extractedData.vehicleNumber || '');
    }
  }, [result]);

  const isValidDate = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  };

  const handleConfirm = async () => {
    if (!editedExpiryDate) {
      Alert.alert('Required Field', 'Please enter the expiry date.');
      return;
    }

    if (!isValidDate(editedExpiryDate)) {
      Alert.alert('Invalid Date', 'Please use YYYY-MM-DD format (e.g., 2027-08-15).');
      return;
    }

    setConfirming(true);
    try {
      await onConfirm(editedExpiryDate, {
        documentNumber: editedDocNumber,
        vehicleNumber: editedVehicleNumber,
      });
      onClose();
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <Modal visible={visible} transparent={true} animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Processing document with OCR...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!result) {
    return null;
  }

  const documentTypeMatch = !result.mismatchDetected;
  const confidencePercentage = Math.round(result.detectedDocumentTypeConfidence * 100);

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Document OCR Analysis</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
          {/* Document Type Detection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Document Type Detection</Text>
            <View style={[styles.resultCard, documentTypeMatch ? styles.successCard : styles.warningCard]}>
              <View style={styles.resultRow}>
                <View style={styles.resultLabel}>
                  <Text style={styles.resultLabelText}>Detected Type</Text>
                </View>
                <View style={styles.resultValue}>
                  <Text style={[styles.resultValueText, documentTypeMatch ? styles.successText : styles.warningText]}>
                    {result.documentType}
                  </Text>
                  <Text style={styles.confidenceText}>Confidence: {confidencePercentage}%</Text>
                </View>
              </View>

              {result.mismatchDetected && (
                <View style={styles.warningBox}>
                <MaterialIcons name="warning" size={18} color="#d97706" />
                  <Text style={styles.warningBoxText}>
                    Expected: {result.expectedType}. Please verify the document is correct.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Extracted Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Extracted Information</Text>

            {/* Vehicle Number */}
            {result.extractedData.vehicleNumber && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Vehicle Number</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editedVehicleNumber}
                  onChangeText={setEditedVehicleNumber}
                  placeholder="Vehicle number"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            )}

            {/* Document Number */}
            {result.extractedData.documentNumber && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Document Number</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editedDocNumber}
                  onChangeText={setEditedDocNumber}
                  placeholder="Document number"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            )}

            {/* Company/Issuer Name */}
            {result.extractedData.companyName && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Issued By</Text>
                <Text style={styles.fieldValue}>{result.extractedData.companyName}</Text>
              </View>
            )}

            {/* Issue Date */}
            {result.extractedData.issueDate && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Issue Date</Text>
                <Text style={styles.fieldValue}>{result.extractedData.issueDate}</Text>
              </View>
            )}
          </View>

          {/* Expiry Date - CRITICAL FIELD */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.criticalTitle]}>Expiry Date (Required)</Text>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Expiry Date *</Text>
              <View style={styles.expiryDateInput}>
                <MaterialIcons name="event" size={20} color={COLORS.primary} />
                <TextInput
                  style={styles.expiryInput}
                  value={editedExpiryDate}
                  onChangeText={setEditedExpiryDate}
                  placeholder="YYYY-MM-DD (e.g., 2027-08-15)"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <Text style={styles.helperText}>Format: YYYY-MM-DD</Text>
            </View>
          </View>

          {/* Warnings and Recommendations */}
          {result.warnings.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Warnings</Text>
              {result.warnings.map((warning, idx) => (
                <View key={idx} style={styles.warningItem}>
                  <MaterialIcons name="error-outline" size={16} color="#d97706" />
                  <Text style={styles.warningItemText}>{warning}</Text>
                </View>
              ))}
            </View>
          )}

          {result.recommendations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              {result.recommendations.map((rec, idx) => (
                <View key={idx} style={styles.recommendationItem}>
                  <MaterialIcons name="info" size={16} color="#0ea5e9" />
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Disclaimer */}
          <View style={styles.disclaimerBox}>
            <MaterialIcons name="info" size={16} color={COLORS.secondary} />
            <Text style={styles.disclaimerText}>
              OCR extraction is automated. Please review all information carefully before confirming. The expiry date you enter will be used for all reminders and tracking.
            </Text>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={confirming}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmButton, confirming && styles.disabledButton]}
            onPress={handleConfirm}
            disabled={confirming}
          >
            {confirming ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.confirmButtonText}>Confirm & Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'web' ? 0 : 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: SPACING.gutter,
  },
  section: {
    marginBottom: SPACING.stack,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.base,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  criticalTitle: {
    color: '#dc2626',
  },
  resultCard: {
    borderRadius: 8,
    padding: SPACING.gutter,
    backgroundColor: '#f8fafc',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  successCard: {
    borderLeftColor: COLORS.success,
  },
  warningCard: {
    borderLeftColor: '#d97706',
    backgroundColor: '#fffbeb',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  resultLabel: {
    flex: 0.4,
  },
  resultLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
  },
  resultValue: {
    flex: 0.6,
    alignItems: 'flex-end',
  },
  resultValueText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  successText: {
    color: COLORS.success,
  },
  warningText: {
    color: '#d97706',
  },
  confidenceText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: SPACING.base,
    paddingTop: SPACING.base,
    borderTopWidth: 1,
    borderTopColor: '#fcd34d',
  },
  warningBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#d97706',
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: SPACING.gutter,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  fieldValue: {
    fontSize: 14,
    color: '#1e293b',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  expiryDateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fef2f2',
  },
  expiryInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  helperText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 6,
  },
  warningItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#d97706',
  },
  warningItemText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
  },
  recommendationItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#e0f2fe',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#0ea5e9',
  },
  recommendationText: {
    flex: 1,
    fontSize: 12,
    color: '#0c4a6e',
  },
  disclaimerBox: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#e0f2fe',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0ea5e9',
    marginBottom: SPACING.stack,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#0c4a6e',
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.base,
    paddingHorizontal: SPACING.gutter,
    paddingVertical: SPACING.gutter,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  cancelButton: {
    flex: 1,
    paddingHorizontal: SPACING.gutter,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  confirmButton: {
    flex: 1,
    paddingHorizontal: SPACING.gutter,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
