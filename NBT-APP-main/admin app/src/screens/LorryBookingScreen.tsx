import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { COLORS, SHADOWS, SPACING } from '../theme';

type BookingFormState = {
  fromPoint: string;
  destinationPoint: string;
  loadFreight: string;
  lorryFreight: string;
  coolie: string;
  commissionFreight: string;
  expenses: string;
};

type ProfitSummaryState = {
  fromDate: string;
  toDate: string;
  totalProfit: number;
};

const getApiHost = (): string => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3001';
  }
  return 'http://localhost:3001';
};

const API_HOST = getApiHost();

const createEmptyForm = (): BookingFormState => ({
  fromPoint: '',
  destinationPoint: '',
  loadFreight: '',
  lorryFreight: '',
  coolie: '',
  commissionFreight: '',
  expenses: '',
});

function parseAmount(value: string): number {
  const normalized = value.replace(/,/g, '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function getBusinessDateLabel(): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date());
}

function getBusinessDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getDefaultDateRange(): { fromDate: string; toDate: string } {
  const today = new Date();
  const current = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const previousMonth = new Date(current);
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  return {
    fromDate: getBusinessDateString(previousMonth),
    toDate: getBusinessDateString(current),
  };
}

function formatDisplayDate(value: string): string {
  if (!value) return '';
  const parsed = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(parsed);
}

async function getAdminToken(): Promise<string> {
  const storedToken = await SecureStore.getItemAsync('admin_session_token');
  if (storedToken) {
    return storedToken;
  }

  const response = await fetch(`${API_HOST}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackingId: 'admin', pin: '9999' }),
  });

  const data = await response.json().catch(() => ({}));
  if (response.ok && typeof data?.token === 'string' && data.token.trim()) {
    await SecureStore.setItemAsync('admin_session_token', data.token);
    return data.token;
  }

  return 'local-fallback-token';
}

export default function LorryBookingScreen() {
  const [form, setForm] = useState<BookingFormState>(createEmptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [todayProfit, setTodayProfit] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [profitRange, setProfitRange] = useState<{ fromDate: string; toDate: string }>(() => getDefaultDateRange());
  const [profitSummary, setProfitSummary] = useState<ProfitSummaryState | null>(null);
  const [profitSummaryError, setProfitSummaryError] = useState<string | null>(null);
  const [isLoadingProfit, setIsLoadingProfit] = useState<boolean>(false);

  const grossFreight = useMemo(() => parseAmount(form.loadFreight) - parseAmount(form.lorryFreight), [form.loadFreight, form.lorryFreight]);
  const totalFreight = useMemo(() => grossFreight + parseAmount(form.coolie) + parseAmount(form.commissionFreight), [grossFreight, form.coolie, form.commissionFreight]);
  const profit = useMemo(() => totalFreight - parseAmount(form.expenses), [totalFreight, form.expenses]);
  const todayLabel = useMemo(() => getBusinessDateLabel(), []);

  const updateField = (field: keyof BookingFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setMessage(null);
  };

  const loadProfitSummary = async (fromDate: string, toDate: string) => {
    if (!fromDate || !toDate) {
      setProfitSummary(null);
      return;
    }

    if (fromDate > toDate) {
      setProfitSummary(null);
      setProfitSummaryError('From Date cannot be later than To Date.');
      return;
    }

    setIsLoadingProfit(true);
    setProfitSummaryError(null);

    try {
      const token = await getAdminToken();
      const response = await fetch(`${API_HOST}/api/lorry-booking/profit?fromDate=${fromDate}&toDate=${toDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Unable to load profit.');
      }

      const data = await response.json().catch(() => null);
      if (!data?.success) {
        throw new Error('Unable to load profit.');
      }

      setProfitSummary({
        fromDate: data.fromDate,
        toDate: data.toDate,
        totalProfit: Number(data.totalProfit ?? 0),
      });
    } catch {
      setProfitSummaryError('Unable to load profit. Please try again.');
      setProfitSummary(null);
    } finally {
      setIsLoadingProfit(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setMessage(null);

    if (!form.fromPoint.trim()) {
      setError('Please enter the From Point.');
      return;
    }
    if (!form.destinationPoint.trim()) {
      setError('Please enter the Destination Point.');
      return;
    }
    if (parseAmount(form.loadFreight) < 0) {
      setError('Load Freight cannot be negative.');
      return;
    }
    if (parseAmount(form.lorryFreight) < 0) {
      setError('Lorry Freight cannot be negative.');
      return;
    }
    if (parseAmount(form.coolie) < 0) {
      setError('Coolie cannot be negative.');
      return;
    }
    if (parseAmount(form.commissionFreight) < 0) {
      setError('Commission Freight cannot be negative.');
      return;
    }
    if (parseAmount(form.expenses) < 0) {
      setError('Expenses cannot be negative.');
      return;
    }

    setIsSaving(true);

    try {
      const token = await getAdminToken();
      const response = await fetch(`${API_HOST}/api/lorry-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromPoint: form.fromPoint.trim(),
          destinationPoint: form.destinationPoint.trim(),
          loadFreight: parseAmount(form.loadFreight),
          lorryFreight: parseAmount(form.lorryFreight),
          coolie: parseAmount(form.coolie),
          commissionFreight: parseAmount(form.commissionFreight),
          expenses: parseAmount(form.expenses),
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Unable to save booking. Please try again.');
      }

      const bookingProfit = Number(data.bookingProfit ?? 0);
      setTodayProfit(Number(data.dailyProfit ?? 0));
      setMessage(`Booking Profit: ${formatCurrency(bookingProfit)}`);
      setForm(createEmptyForm());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save booking. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const { fromDate, toDate } = getDefaultDateRange();
    setProfitRange({ fromDate, toDate });
    void loadProfitSummary(fromDate, toDate);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.pageHeaderCard}>
          <View style={styles.headerIconWrap}>
            <MaterialIcons name="receipt-long" size={22} color={COLORS.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Lorry Booking Agency</Text>
            <Text style={styles.pageSubtitle}>Simple daily booking entry with live profit calculation.</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.valueText}>{todayLabel}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>From Point</Text>
            <TextInput
              style={styles.input}
              value={form.fromPoint}
              onChangeText={(value) => updateField('fromPoint', value)}
              placeholder="Chennai"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Destination Point</Text>
            <TextInput
              style={styles.input}
              value={form.destinationPoint}
              onChangeText={(value) => updateField('destinationPoint', value)}
              placeholder="Coimbatore"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Load Freight</Text>
            <TextInput
              style={styles.input}
              value={form.loadFreight}
              onChangeText={(value) => updateField('loadFreight', value.replace(/[^0-9.]/g, ''))}
              placeholder="₹50,000"
              keyboardType="decimal-pad"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Lorry Freight</Text>
            <TextInput
              style={styles.input}
              value={form.lorryFreight}
              onChangeText={(value) => updateField('lorryFreight', value.replace(/[^0-9.]/g, ''))}
              placeholder="₹48,000"
              keyboardType="decimal-pad"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Gross Freight</Text>
            <Text style={styles.summaryValue}>{formatCurrency(grossFreight)}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Coolie</Text>
            <TextInput
              style={styles.input}
              value={form.coolie}
              onChangeText={(value) => updateField('coolie', value.replace(/[^0-9.]/g, ''))}
              placeholder="₹500"
              keyboardType="decimal-pad"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Commission Freight</Text>
            <TextInput
              style={styles.input}
              value={form.commissionFreight}
              onChangeText={(value) => updateField('commissionFreight', value.replace(/[^0-9.]/g, ''))}
              placeholder="₹300"
              keyboardType="decimal-pad"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Freight</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalFreight)}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Expenses</Text>
            <TextInput
              style={styles.input}
              value={form.expenses}
              onChangeText={(value) => updateField('expenses', value.replace(/[^0-9.]/g, ''))}
              placeholder="₹600"
              keyboardType="decimal-pad"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.profitHighlightCard}>
            <Text style={styles.profitHighlightLabel}>Profit</Text>
            <Text style={styles.profitHighlightValue}>{formatCurrency(profit)}</Text>
          </View>

          <TouchableOpacity style={[styles.saveButton, isSaving && styles.disabledButton]} onPress={handleSave} activeOpacity={0.85} disabled={isSaving}>
            <MaterialIcons name="save-alt" size={18} color="#ffffff" />
            <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Booking'}</Text>
          </TouchableOpacity>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {message ? <Text style={styles.successText}>{message}</Text> : null}
        </View>

        <View style={styles.todayProfitCard}>
          <Text style={styles.todayProfitHeading}>Today's Profit</Text>
          <Text style={styles.todayProfitValue}>{formatCurrency(todayProfit)}</Text>
          <Text style={styles.todayProfitNote}>Updated from the backend after each saved booking.</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Profit Summary</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>From Date</Text>
            <TextInput
              style={styles.input}
              value={profitRange.fromDate}
              onChangeText={(value) => setProfitRange((prev) => ({ ...prev, fromDate: value }))}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>To Date</Text>
            <TextInput
              style={styles.input}
              value={profitRange.toDate}
              onChangeText={(value) => setProfitRange((prev) => ({ ...prev, toDate: value }))}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <TouchableOpacity style={styles.summaryButton} onPress={() => void loadProfitSummary(profitRange.fromDate, profitRange.toDate)} activeOpacity={0.85} disabled={isLoadingProfit}>
            <MaterialIcons name="bar-chart" size={18} color="#ffffff" />
            <Text style={styles.summaryButtonText}>{isLoadingProfit ? 'Loading...' : 'View Profit'}</Text>
          </TouchableOpacity>

          {profitSummaryError ? <Text style={styles.errorText}>{profitSummaryError}</Text> : null}

          {profitSummary ? (
            <View style={styles.profitSummaryResult}>
              <Text style={styles.summaryRangeText}>{`${formatDisplayDate(profitSummary.fromDate)} → ${formatDisplayDate(profitSummary.toDate)}`}</Text>
              <Text style={styles.summaryTotalValue}>{formatCurrency(profitSummary.totalProfit)}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.gutter,
    paddingBottom: 32,
  },
  pageHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.light,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(252, 119, 40, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  pageSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    ...SHADOWS.medium,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  valueText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 12,
  },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    fontSize: 15,
    color: COLORS.textDark,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceContainerHigh,
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  profitHighlightCard: {
    marginTop: 10,
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(252, 119, 40, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(252, 119, 40, 0.2)',
  },
  profitHighlightLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.onSecondaryContainer,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  profitHighlightValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.secondary,
    marginTop: 4,
  },
  saveButton: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.7,
  },
  errorText: {
    marginTop: 10,
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '600',
  },
  successText: {
    marginTop: 10,
    color: COLORS.success,
    fontSize: 13,
    fontWeight: '600',
  },
  todayProfitCard: {
    marginTop: 16,
    backgroundColor: COLORS.primaryContainer,
    borderRadius: 18,
    padding: 16,
    ...SHADOWS.light,
  },
  summaryCard: {
    marginTop: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    ...SHADOWS.light,
  },
  summaryCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 12,
  },
  summaryButton: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  summaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  profitSummaryResult: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceContainerHigh,
  },
  summaryRangeText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  summaryTotalValue: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.secondary,
    marginTop: 6,
  },
  todayProfitHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dbeafe',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  todayProfitValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 6,
  },
  todayProfitNote: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 8,
  },
});
