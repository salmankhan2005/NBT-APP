import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS, SPACING } from '../theme';
import { db, API_HOST } from '../db/database';

type BookingEntry = {
  id: string;
  profit_date: string;
  name?: string;
  vehicle_number?: string;
  from_point: string;
  destination_point: string;
  load_freight: number;
  lorry_freight: number;
  gross_freight: number;
  coolie: number;
  commission_freight: number;
  total_freight: number;
  expenses: number;
  profit: number;
  created_at: string;
};

type BookingFormState = {
  name: string;
  vehicleNumber: string;
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



const createEmptyForm = (): BookingFormState => ({
  name: '',
  vehicleNumber: '',
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
  // Accept both YYYY-MM-DD and full ISO timestamps
  const parsed = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(parsed);
}

function getAdminToken(): string {
  const token = db.getToken();
  if (!token) {
    throw new Error('User not authenticated. Please log in to access this feature.');
  }
  return token;
}

export default function LorryBookingScreen() {
  const [form, setForm] = useState<BookingFormState>(createEmptyForm);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [todayProfit, setTodayProfit] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [entries, setEntries] = useState<BookingEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
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

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const token = getAdminToken();
      const res = await fetch(`${API_HOST}/api/lorry-booking/entries?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setEntries(data.entries || []);
      }
    } catch {}
    finally { setLoadingEntries(false); }
  }, []);

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
      const token = getAdminToken();
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
      const token = getAdminToken();
      const isEditing = editingBookingId !== null;
      const url = isEditing
        ? `${API_HOST}/api/lorry-booking/${editingBookingId}`
        : `${API_HOST}/api/lorry-booking`;
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          vehicleNumber: form.vehicleNumber.trim().toUpperCase(),
          fromPoint: form.fromPoint.trim(),
          destinationPoint: form.destinationPoint.trim(),
          loadFreight: parseAmount(form.loadFreight),
          lorryFreight: parseAmount(form.lorryFreight),
          coolie: parseAmount(form.coolie),
          commissionFreight: parseAmount(form.commissionFreight),
          expenses: parseAmount(form.expenses),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `Unable to ${isEditing ? 'update' : 'save'} booking. Please try again.`);
      }

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || `Unable to ${isEditing ? 'update' : 'save'} booking. Please try again.`);
      }

      const bookingProfit = Number(data.bookingProfit ?? 0);
      setTodayProfit(Number(data.dailyProfit ?? 0));
      setMessage(isEditing ? 'Booking updated successfully.' : `Booking Profit: ${formatCurrency(bookingProfit)}`);
      setForm(createEmptyForm());
      setEditingBookingId(null);
      void loadEntries();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save booking. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditBooking = (entry: BookingEntry) => {
    setEditingBookingId(entry.id);
    setForm({
      name: entry.name || '',
      vehicleNumber: entry.vehicle_number || '',
      fromPoint: entry.from_point,
      destinationPoint: entry.destination_point,
      loadFreight: String(entry.load_freight),
      lorryFreight: String(entry.lorry_freight),
      coolie: String(entry.coolie),
      commissionFreight: String(entry.commission_freight),
      expenses: String(entry.expenses),
    });
    setError(null);
    setMessage(null);
  };

  const handleDeleteBooking = async (id: string) => {
    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm('Are you sure you want to delete this lorry booking?');
      if (!confirmDelete) return;
      await executeDelete(id);
    } else {
      Alert.alert(
        'Delete Booking',
        'Are you sure you want to delete this lorry booking?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => executeDelete(id),
          },
        ]
      );
    }
  };

  const executeDelete = async (id: string) => {
    try {
      const token = getAdminToken();
      const response = await fetch(`${API_HOST}/api/lorry-booking/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Unable to delete booking.');
      }

      const data = await response.json().catch(() => null);
      if (data?.success) {
        if (editingBookingId === id) {
          setEditingBookingId(null);
          setForm(createEmptyForm());
        }
        setMessage('Booking deleted successfully.');
        void loadEntries();
        if (data.dailyProfit !== undefined) {
          setTodayProfit(Number(data.dailyProfit || 0));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete booking.');
    }
  };

  useEffect(() => {
    const { fromDate, toDate } = getDefaultDateRange();
    setProfitRange({ fromDate, toDate });
    void loadProfitSummary(fromDate, toDate);
    void loadEntries();
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
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(value) => updateField('name', value)}
              placeholder="e.g. Rajan / NBT Transports"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vehicle Number</Text>
            <TextInput
              style={styles.input}
              value={form.vehicleNumber}
              onChangeText={(value) => updateField('vehicleNumber', value.toUpperCase())}
              placeholder="e.g. TN 38 AB 1234"
              autoCapitalize="characters"
              placeholderTextColor={COLORS.textMuted}
            />
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

          {editingBookingId !== null && (
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: '#64748b', marginBottom: 10 }]}
              onPress={() => {
                setEditingBookingId(null);
                setForm(createEmptyForm());
                setError(null);
                setMessage(null);
              }}
              activeOpacity={0.85}
            >
              <MaterialIcons name="cancel" size={18} color="#ffffff" />
              <Text style={styles.saveButtonText}>Cancel Edit</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.saveButton, isSaving && styles.disabledButton]} onPress={handleSave} activeOpacity={0.85} disabled={isSaving}>
            <MaterialIcons name={editingBookingId !== null ? 'check-circle' : 'save-alt'} size={18} color="#ffffff" />
            <Text style={styles.saveButtonText}>
              {isSaving ? (editingBookingId !== null ? 'Updating...' : 'Saving...') : (editingBookingId !== null ? 'Update Booking' : 'Save Booking')}
            </Text>
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
        <View style={styles.summaryCard}>
          <View style={styles.entriesHeader}>
            <Text style={styles.summaryCardTitle}>Recent Bookings</Text>
            <TouchableOpacity onPress={loadEntries} style={styles.refreshBtn}>
              <MaterialIcons name="refresh" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {loadingEntries ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 16 }} />
          ) : entries.length === 0 ? (
            <Text style={styles.emptyText}>No bookings saved yet.</Text>
          ) : (
            entries.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryTopRow}>
                  <View style={styles.entryRouteBox}>
                    <Text style={styles.entryRoute}>{entry.from_point}</Text>
                    <MaterialIcons name="arrow-forward" size={12} color={COLORS.textMuted} />
                    <Text style={styles.entryRoute}>{entry.destination_point}</Text>
                  </View>
                  <View style={[styles.entryProfitBadge, { backgroundColor: entry.profit >= 0 ? '#dcfce7' : '#fee2e2' }]}>
                    <Text style={[styles.entryProfitText, { color: entry.profit >= 0 ? '#15803d' : '#dc2626' }]}>
                      {entry.profit >= 0 ? '+' : ''}{formatCurrency(entry.profit)}
                    </Text>
                  </View>
                </View>

                {(entry.name || entry.vehicle_number) ? (
                  <View style={styles.entryMetaRow}>
                    {entry.name ? (
                      <View style={styles.entryMetaChip}>
                        <MaterialIcons name="person" size={11} color={COLORS.primary} />
                        <Text style={styles.entryMetaText}>{entry.name}</Text>
                      </View>
                    ) : null}
                    {entry.vehicle_number ? (
                      <View style={styles.entryMetaChip}>
                        <MaterialIcons name="local-shipping" size={11} color={COLORS.primary} />
                        <Text style={styles.entryMetaText}>{entry.vehicle_number}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.entryGrid}>
                  <View style={styles.entryGridItem}>
                    <Text style={styles.entryGridLabel}>Load Freight</Text>
                    <Text style={styles.entryGridValue}>{formatCurrency(entry.load_freight)}</Text>
                  </View>
                  <View style={styles.entryGridItem}>
                    <Text style={styles.entryGridLabel}>Lorry Freight</Text>
                    <Text style={styles.entryGridValue}>{formatCurrency(entry.lorry_freight)}</Text>
                  </View>
                  <View style={styles.entryGridItem}>
                    <Text style={styles.entryGridLabel}>Coolie</Text>
                    <Text style={styles.entryGridValue}>{formatCurrency(entry.coolie)}</Text>
                  </View>
                  <View style={styles.entryGridItem}>
                    <Text style={styles.entryGridLabel}>Commission</Text>
                    <Text style={styles.entryGridValue}>{formatCurrency(entry.commission_freight)}</Text>
                  </View>
                  <View style={styles.entryGridItem}>
                    <Text style={styles.entryGridLabel}>Expenses</Text>
                    <Text style={[styles.entryGridValue, { color: '#dc2626' }]}>{formatCurrency(entry.expenses)}</Text>
                  </View>
                  <View style={styles.entryGridItem}>
                    <Text style={styles.entryGridLabel}>Date</Text>
                    <Text style={styles.entryGridValue}>{formatDisplayDate(entry.profit_date)}</Text>
                  </View>
                </View>

                <View style={styles.entryActionRow}>
                  <TouchableOpacity
                    style={styles.entryActionBtn}
                    onPress={() => handleEditBooking(entry)}
                  >
                    <MaterialIcons name="edit" size={14} color={COLORS.primary} />
                    <Text style={styles.entryActionBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <View style={styles.actionDivider} />
                  <TouchableOpacity
                    style={styles.entryActionBtn}
                    onPress={() => handleDeleteBooking(entry.id)}
                  >
                    <MaterialIcons name="delete" size={14} color="#dc2626" />
                    <Text style={[styles.entryActionBtnText, { color: '#dc2626' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
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
    paddingBottom: 48,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
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
  entriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshBtn: {
    padding: 4,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
    fontStyle: 'italic',
  },
  entryCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  entryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  entryRouteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    flexWrap: 'wrap',
  },
  entryRoute: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  entryProfitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  entryProfitText: {
    fontSize: 13,
    fontWeight: '800',
  },
  entryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  entryGridItem: {
    minWidth: '30%',
    flex: 1,
  },
  entryGridLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  entryGridValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  entryMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  entryMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  entryMetaText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  entryActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    marginTop: 10,
    paddingTop: 8,
    gap: 16,
  },
  entryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  entryActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  actionDivider: {
    width: 1,
    height: 12,
    backgroundColor: COLORS.outlineVariant,
  },
});
