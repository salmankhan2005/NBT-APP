import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
  FlatList,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { COLORS, SPACING, SHADOWS } from '../theme';
import nbtAuthorisedSignatureBase64 from '../nbtSignatureBase64';
import nbtLogoBase64 from '../nbtLogoBase64';
import nbtBalajiBase64 from '../nbtBalajiBase64';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { db, GcNote, GcItem } from '../db/database';

export default function GcScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 880;
  const [activeTab, setActiveTab] = useState<'CREATE' | 'ARCHIVE'>('CREATE');
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<GcNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingGcId, setEditingGcId] = useState<string | null>(null);
  
  // Create GC Form Fields
  const [noteNumber, setNoteNumber] = useState('');
  const [gcDate, setGcDate] = useState(new Date().toISOString().split('T')[0]);
  const [billNumber, setBillNumber] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [truckNumber, setTruckNumber] = useState('');
  const [consignor, setConsignor] = useState('');
  const [consignee, setConsignee] = useState('');
  const [consignorGst, setConsignorGst] = useState('');
  const [consigneeGst, setConsigneeGst] = useState('');
  const [gstinNumber, setGstinNumber] = useState('33AMTPR8487P2ZM');
  const [panNumber, setPanNumber] = useState('AMTPR8487P');
  const [paymentType, setPaymentType] = useState<'TBB' | 'TO_PAY' | 'PAID' | ''>('');
  const [bankAccountName, setBankAccountName] = useState('New Balaji Transport');
  const [bankAccountNumber, setBankAccountNumber] = useState('118715000014102');
  const [bankIfsc, setBankIfsc] = useState('KVBLO001187');
  const [bankName, setBankName] = useState('Karur Vysya Bank');
  const [bankBranch, setBankBranch] = useState('Salem - 636 002');
  const [addressLine1, setAddressLine1] = useState('3/131, V.K.V. Complex, 1st Floor, Bangalore Bye Pass Road,');
  const [addressLine2, setAddressLine2] = useState('Kandampatty (Po.), Salem - 636 005. (TN)');
  const [phone1, setPhone1] = useState('94433 51789');
  const [phone2, setPhone2] = useState('93622 51789');
  const [phone3, setPhone3] = useState('97892 71721');
  const [items, setItems] = useState<Array<{ articlesCount: string; description: string; weight: string; value: string }>>(
    Array.from({ length: 6 }, () => ({ articlesCount: '', description: '', weight: '', value: '' }))
  );

  const updateItemField = (
    index: number,
    field: 'articlesCount' | 'description' | 'weight' | 'value',
    value: string
  ) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Finance details
  const [freight, setFreight] = useState('');
  const [lessAdvance, setLessAdvance] = useState('0');
  const [taxOption, setTaxOption] = useState<'CGST_SGST' | 'IGST' | 'NONE'>('NONE');
  const [cgstPercent, setCgstPercent] = useState(0);
  const [sgstPercent, setSgstPercent] = useState(0);
  const [igstPercent, setIgstPercent] = useState(0);

  // Other details
  const [payableAt, setPayableAt] = useState('');
  const [taxPayee, setTaxPayee] = useState<'Transport' | 'Consignor' | 'Consignee' | ''>('Consignor');
  const [driverName, setDriverName] = useState('');
  const [deliveryAt, setDeliveryAt] = useState('Door Delivery');
  const [driverSignature, setDriverSignature] = useState('');
  const [dlNumber, setDlNumber] = useState('');
  const [lorryOwner, setLorryOwner] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [terms, setTerms] = useState('');

  // Delete modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingGcId, setDeletingGcId] = useState<{ id: string; label?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'danger' | 'success' | 'info';
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showConfirmDialog = (
    title: string,
    message: string,
    onConfirm?: () => void,
    type: 'danger' | 'success' | 'info' = 'danger',
    confirmText = 'OK',
    cancelText?: string
  ) => {
    setConfirmModal({
      visible: true,
      title,
      message,
      type,
      confirmText,
      cancelText,
      onConfirm,
    });
  };

  // Selected Archive Month — default to current month
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const now = new Date();
    return `${MONTHS[now.getMonth()]}-${String(now.getFullYear()).slice(-2)}`;
  });

  // Load Archive notes
  const fetchGcNotes = async () => {
    setLoading(true);
    try {
      const data = await db.getGcNotes();
      setNotes(data);
    } catch (e) {
      console.error('Error fetching GC notes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGcNotes();
    const unsubscribe = db.subscribe(() => {
      fetchGcNotes();
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!editingGcId) {
      setNoteNumber(getPreviewGcNoteNumber(gcDate));
    }
  }, [gcDate, notes, editingGcId]);

  useEffect(() => {
    if (activeTab === 'ARCHIVE') {
      fetchGcNotes();
    }
  }, [activeTab]);

  // Auto-select most recent month when notes load
  useEffect(() => {
    if (notes.length > 0) {
      const months = getMonthsFromNotes(notes);
      if (months.length > 0 && !months.includes(selectedMonth)) {
        setSelectedMonth(months[0]);
      }
    }
  }, [notes]);

  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const parseIsoDate = (dateString: string) => {
    if (!dateString) return null;
    let year = 0, month = 0, day = 1;

    if (dateString.includes('-')) {
      const parts = dateString.split('-');
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        year = Number(parts[0]);
        month = Number(parts[1]);
        day = Number(parts[2]);
      } else {
        // DD-MM-YYYY
        year = Number(parts[2]);
        month = Number(parts[1]);
        day = Number(parts[0]);
      }
    } else if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        year = Number(parts[0]);
        month = Number(parts[1]);
        day = Number(parts[2]);
      } else {
        // DD/MM/YYYY
        year = Number(parts[2]);
        month = Number(parts[1]);
        day = Number(parts[0]);
      }
    }

    if (!year || !month || isNaN(year) || isNaN(month)) {
      return new Date();
    }
    return new Date(year, month - 1, day || 1);
  };

  const getGcPrefix = (dateString: string) => {
    const date = parseIsoDate(dateString);
    if (!date) return '';
    const month = monthNames[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);
    return `${month}-${year}`;
  };

  const parseGcSequence = (value?: string) => {
    if (!value) return null;
    const match = value.match(/^[A-Z]{3}-\d{2}-(\d+)$/);
    return match ? Number(match[1]) : null;
  };

  const getNextGcSequenceForDate = (dateString: string) => {
    const prefix = getGcPrefix(dateString);
    if (!prefix) return 1;
    const sequences = notes
      .map((note) => note.noteNumber)
      .filter((num): num is string => typeof num === 'string' && num.startsWith(`${prefix}-`))
      .map(parseGcSequence)
      .filter((seq): seq is number => seq !== null);

    if (sequences.length === 0) return 1;
    return Math.max(...sequences) + 1;
  };

  const getPreviewGcNoteNumber = (dateString: string) => {
    const prefix = getGcPrefix(dateString);
    if (!prefix) return '';
    return `${prefix}-${String(getNextGcSequenceForDate(dateString)).padStart(2, '0')}`;
  };

  // Tax calculations
  const fValue = Number(freight) || 0;
  const advValue = Number(lessAdvance) || 0;

  const cgstAmount = fValue * (Number(cgstPercent) || 0) / 100;
  const sgstAmount = fValue * (Number(sgstPercent) || 0) / 100;
  const igstAmount = fValue * (Number(igstPercent) || 0) / 100;
  const totalTax = cgstAmount + sgstAmount + igstAmount;
  const grandTotal = fValue + totalTax;
  const balanceDue = grandTotal - advValue;
  const itemsTotalValue = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  const formatRupeeValue = (value: number | string) => {
    const amount = typeof value === 'string' ? Number(value) || 0 : value;
    const [rs, ps] = amount.toFixed(2).split('.');
    return { rs, ps };
  };

  const getCurrentGcNoteFromState = (): GcNote => {
    const filledItems: GcItem[] = items
      .filter(item => item.description.trim() || item.articlesCount.trim() || item.weight.trim() || item.value.trim())
      .map(item => ({
        articlesCount: Number(item.articlesCount) || 0,
        description: item.description.trim(),
        weight: Number(item.weight) || 0,
        value: Number(item.value) || 0,
      }));

    return {
      id: noteNumber.trim() || 'NBT_GC',
      noteNumber: noteNumber.trim() || 'NBT_GC',
      date: gcDate.trim() || new Date().toISOString().split('T')[0],
      billNumber: billNumber.trim(),
      from: from.trim() || 'SALEM',
      to: to.trim() || 'DESTINATION',
      truckNumber: truckNumber.trim(),
      consignor: consignor.trim(),
      consignee: consignee.trim(),
      consignorGst: consignorGst.trim(),
      consigneeGst: consigneeGst.trim(),
      gstinNumber: gstinNumber.trim(),
      items: filledItems.length > 0 ? filledItems : [{ articlesCount: 1, description: 'Goods Consignment', weight: 0, value: 0 }],
      freight: fValue,
      cgst: cgstAmount,
      sgst: sgstAmount,
      igst: igstAmount,
      total: grandTotal,
      lessAdvance: advValue,
      balance: balanceDue,
      payableAt: payableAt.trim(),
      paymentType,
      taxPayee,
      deliveryAt: deliveryAt.trim(),
      pan: panNumber.trim(),
      driverName: driverName.trim(),
      driverSignature: driverSignature.trim(),
      dlNumber: dlNumber.trim(),
      lorryOwner: lorryOwner.trim(),
      bankAccountName: bankAccountName.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      bankIfsc: bankIfsc.trim(),
      bankName: bankName.trim(),
      bankBranch: bankBranch.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      phone1: phone1.trim(),
      phone2: phone2.trim(),
      phone3: phone3.trim(),
      bankDetails: bankDetails.trim(),
      terms: terms.trim(),
      createdAt: new Date().toISOString(),
    };
  };

  const handleDownloadCurrentForm = () => {
    const note = getCurrentGcNoteFromState();
    handleDownloadPDF(note.id, note);
  };

  const handlePrintCurrentForm = () => {
    const note = getCurrentGcNoteFromState();
    handlePrintPDF(note.id, note);
  };

  const resetFormFields = () => {
    setEditingGcId(null);
    setNoteNumber(getPreviewGcNoteNumber(gcDate));
    setGcDate(new Date().toISOString().split('T')[0]);
    setBillNumber('');
    setFrom('');
    setTo('');
    setTruckNumber('');
    setConsignor('');
    setConsignee('');
    setConsignorGst('');
    setConsigneeGst('');
    setGstinNumber('33AMTPR8487P2ZM');
    setPanNumber('AMTPR8487P');
    setItems(Array.from({ length: 6 }, () => ({ articlesCount: '', description: '', weight: '', value: '' })));
    setFreight('');
    setLessAdvance('0');
    setTaxOption('NONE');
    setCgstPercent(0);
    setSgstPercent(0);
    setIgstPercent(0);
    setPayableAt('');
    setPaymentType('');
    setTaxPayee('Consignor');
    setDeliveryAt('Door Delivery');
    setDriverName('');
    setDriverSignature('');
    setDlNumber('');
    setLorryOwner('');
    setBankAccountName('New Balaji Transport');
    setBankAccountNumber('118715000014102');
    setBankIfsc('KVBLO001187');
    setBankName('Karur Vysya Bank');
    setBankBranch('Salem - 636 002');
    setAddressLine1('3/131, V.K.V. Complex, 1st Floor, Bangalore Bye Pass Road,');
    setAddressLine2('Kandampatty (Po.), Salem - 636 005. (TN)');
    setPhone1('94433 51789');
    setPhone2('93622 51789');
    setPhone3('97892 71721');
    setBankDetails('');
    setTerms('');
  };

  const handleSaveGC = async () => {
    const filledItems: GcItem[] = items
      .filter(item => item.description.trim() || item.articlesCount.trim() || item.weight.trim() || item.value.trim())
      .map(item => ({
        articlesCount: Number(item.articlesCount) || 0,
        description: item.description.trim(),
        weight: Number(item.weight) || 0,
        value: Number(item.value) || 0,
      }));

    const missing: string[] = [];
    if (!from.trim()) missing.push('Route From');
    if (!to.trim()) missing.push('Route To');
    if (!truckNumber.trim()) missing.push('Truck Number');
    if (!consignor.trim()) missing.push('Consignor (Shipper)');
    if (!consignee.trim()) missing.push('Consignee');
    if (!freight.trim()) missing.push('Freight Amount');

    if (missing.length > 0) {
      const msg = `Please fill out the following required fields to save GC Note:\n\n• ${missing.join('\n• ')}`;
      showConfirmDialog('Missing Required Fields', msg, undefined, 'info', 'Got It');
      return;
    }

    setLoading(true);
    try {
      const gcData = {
        noteNumber: noteNumber.trim(),
        date: gcDate.trim(),
        billNumber: billNumber.trim(),
        from: from.trim(),
        to: to.trim(),
        truckNumber: truckNumber.trim(),
        consignor: consignor.trim(),
        consignee: consignee.trim(),
        consignorGst: consignorGst.trim(),
        consigneeGst: consigneeGst.trim(),
        gstinNumber: gstinNumber.trim(),
        items: filledItems,
        freight: fValue,
        cgst: cgstAmount,
        sgst: sgstAmount,
        igst: igstAmount,
        total: grandTotal,
        lessAdvance: advValue,
        balance: balanceDue,
        payableAt: payableAt.trim(),
        paymentType,
        taxPayee,
        deliveryAt: deliveryAt.trim(),
        pan: panNumber.trim(),
        driverName: driverName.trim(),
        driverSignature: driverSignature.trim(),
        dlNumber: dlNumber.trim(),
        lorryOwner: lorryOwner.trim(),
        bankAccountName: bankAccountName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankIfsc: bankIfsc.trim(),
        bankName: bankName.trim(),
        bankBranch: bankBranch.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        phone1: phone1.trim(),
        phone2: phone2.trim(),
        phone3: phone3.trim(),
        bankDetails: bankDetails.trim(),
        terms: terms.trim(),
      };

      if (editingGcId) {
        const res = await db.updateGcNote(editingGcId, gcData);
        if (res.success && res.gcNote) {
          const updatedGcId = res.gcNote.noteNumber || res.gcNote.id || editingGcId;
          showConfirmDialog(
            'GC Updated Successfully!',
            `Note ${updatedGcId} has been updated in database.`,
            undefined,
            'success',
            'Great!'
          );

          resetFormFields();
          const savedMonthPrefix = getGcPrefix(gcData.date);
          if (savedMonthPrefix) {
            setSelectedMonth(savedMonthPrefix);
          }
          await fetchGcNotes();
          setActiveTab('ARCHIVE');
        } else {
          const err = res.error || 'Failed to update consignment note.';
          showConfirmDialog('Update Error', err, undefined, 'danger', 'OK');
        }
      } else {
        const res = await db.createGcNote(gcData);
        if (res.success && res.gcNote) {
          const savedGcId = res.gcNote.id || res.gcNote.noteNumber;
          showConfirmDialog(
            'GC Saved Successfully!',
            `Note ${savedGcId} has been archived & saved to database.`,
            undefined,
            'success',
            'Great!'
          );

          resetFormFields();
          const savedMonthPrefix = getGcPrefix(gcData.date);
          if (savedMonthPrefix) {
            setSelectedMonth(savedMonthPrefix);
          }
          await fetchGcNotes();
          setActiveTab('ARCHIVE');
        } else {
          const err = res.error || 'Failed to create consignment note.';
          showConfirmDialog('Save Error', err, undefined, 'danger', 'OK');
        }
      }
    } catch (e) {
      showConfirmDialog('Connection Error', 'Connection to backend failed.', undefined, 'danger', 'OK');
    } finally {
      setLoading(false);
    }
  };

  const openWebGcPrintPreview = async (html: string) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return false;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      try {
        await Print.printAsync({ html });
      } catch (error) {
        console.warn('Web print fallback failed', error);
        Alert.alert('Print failed', 'Unable to open the GC print preview.');
      }
      return false;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    const checkReady = window.setInterval(() => {
      if (printWindow.document.readyState === 'complete') {
        window.clearInterval(checkReady);
        try {
          printWindow.focus();
          printWindow.print();
        } catch (error) {
          console.warn('GC print window failed', error);
        }
      }
    }, 100);

    return true;
  };

  const downloadWebGcAsPdf = (html: string, filename: string) => {
    if (typeof window === 'undefined') return;

    // 1. Direct file download of formatted GC Note (HTML format, printable & savable as PDF)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    // 2. Open print/save-to-PDF window synchronously without popup blockage
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.title = filename;
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        try {
          printWin.print();
        } catch (e) {
          console.warn('Print preview error:', e);
        }
      }, 400);
    }
  };

  const buildGcHtml = (note: GcNote) => {
    const safeNum = (val: any): number => {
      if (val === undefined || val === null || val === '') return 0;
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };

    const safeItems = Array.isArray(note.items) ? note.items : [];

    const itemRows = Array.from({ length: 6 }).map((_, idx) => {
      const item = safeItems[idx] || { articlesCount: '', description: '', weight: '', value: '' };
      const valNum = safeNum(item.value);
      const valStr = item.value !== undefined && item.value !== null && String(item.value).trim() !== '' ? valNum.toFixed(2) : '';
      const wtStr = item.weight !== undefined && item.weight !== null && String(item.weight).trim() !== '' ? String(item.weight) : '';
      const countStr = item.articlesCount !== undefined && item.articlesCount !== null && String(item.articlesCount).trim() !== '' ? String(item.articlesCount) : '';

      return `
        <tr>
          <td style="width: 16%; text-align: center;">${countStr}</td>
          <td style="width: 50%; text-align: left; padding-left: 8px;">${item.description || ''}</td>
          <td style="width: 17%; text-align: right; padding-right: 8px;">${wtStr}</td>
          <td style="width: 17%; text-align: right; padding-right: 8px;">${valStr}</td>
        </tr>
      `;
    }).join('');

    const totalValue = safeItems.reduce((sum, item) => sum + safeNum(item?.value), 0);
    const taxPayeeLower = (note.taxPayee || (note as any).gstPayee || '').toLowerCase();
    const paymentTypeUpper = (note.paymentType || '').toUpperCase();

    const fVal = safeNum(note.freight);
    const cgstP = fVal > 0 && safeNum(note.cgst) > 0 ? `(${((safeNum(note.cgst) / fVal) * 100).toFixed(1).replace(/\.0$/, '')}%)` : '';
    const sgstP = fVal > 0 && safeNum(note.sgst) > 0 ? `(${((safeNum(note.sgst) / fVal) * 100).toFixed(1).replace(/\.0$/, '')}%)` : '';
    const igstP = fVal > 0 && safeNum(note.igst) > 0 ? `(${((safeNum(note.igst) / fVal) * 100).toFixed(1).replace(/\.0$/, '')}%)` : '';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>GC Note - ${note.noteNumber || note.id || ''}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #0f172a;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.25;
          }
          .page {
            width: 100%;
            max-width: 287mm;
            min-height: 198mm;
            margin: 0 auto;
            padding: 4mm;
            background: #ffffff;
          }
          .frame {
            border: 2.5px solid #0f172a;
            padding: 8px;
            background: #ffffff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 10px;
            padding-bottom: 6px;
            border-bottom: 2px solid #0f172a;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 175px;
          }
          .logo-mark {
            width: 76px;
            height: 76px;
            border: 2.5px solid #0f172a;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 26px;
            font-weight: 900;
            letter-spacing: 1px;
            color: #0f172a;
          }
          .header-title {
            flex: 1;
            text-align: center;
          }
          .top-name {
            font-size: 11px;
            font-weight: 700;
            margin-bottom: 2px;
            letter-spacing: 0.5px;
          }
          .main-title {
            font-size: 32px;
            font-weight: 900;
            letter-spacing: 2px;
            margin: 0;
            line-height: 1.1;
            color: #0f172a;
          }
          .subtitle {
            font-size: 11px;
            font-weight: 700;
            margin: 4px 0 0;
            color: #334155;
          }
          .badge {
            display: inline-block;
            margin-top: 6px;
            background: #0f172a;
            color: #ffffff;
            padding: 4px 14px;
            border-radius: 4px;
            font-size: 10.5px;
            font-weight: 800;
            letter-spacing: 0.8px;
          }
          .header-right {
            width: 255px;
            align-self: flex-start;
            border: 1.5px solid #0f172a;
            border-radius: 6px;
            padding: 6px 8px;
            font-size: 10px;
          }
          .header-right p {
            margin: 0;
            line-height: 1.35;
            font-weight: 600;
          }
          .phone-list {
            margin-top: 5px;
            font-size: 10px;
            font-weight: 700;
            line-height: 1.4;
          }
          .fields-grid {
            margin-top: 6px;
            border: 1.5px solid #0f172a;
          }
          .grid-row {
            display: flex;
            border-bottom: 1px solid #0f172a;
          }
          .grid-row:last-child {
            border-bottom: none;
          }
          .field-block {
            border-right: 1px solid #0f172a;
            padding: 4px 6px;
            min-height: 32px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .field-block:last-child {
            border-right: none;
          }
          .field-label {
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            color: #475569;
            margin-bottom: 2px;
          }
          .field-value {
            font-size: 11.5px;
            font-weight: 700;
            color: #0f172a;
            word-break: break-word;
          }
          .table-container {
            display: flex;
            border: 1.5px solid #0f172a;
            margin-top: 6px;
            gap: 0;
          }
          .table-left {
            flex: 1;
            display: flex;
            flex-direction: column;
            border-right: 1.5px solid #0f172a;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
          }
          .items-table th {
            background: #0f172a;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            padding: 5px 4px;
            border-right: 1px solid #334155;
            text-align: center;
          }
          .items-table th:last-child {
            border-right: none;
          }
          .items-table td {
            border-bottom: 1px solid #0f172a;
            border-right: 1px solid #0f172a;
            padding: 4px;
            height: 22px;
            font-size: 10.5px;
            font-weight: 600;
          }
          .items-table td:last-child {
            border-right: none;
          }
          .table-footer-label {
            font-weight: 800;
            text-align: right;
            padding-right: 8px !important;
            background: #f8fafc;
            border-bottom: none !important;
          }
          .table-footer-value {
            font-weight: 800;
            text-align: right;
            padding-right: 8px !important;
            background: #f8fafc;
            border-bottom: none !important;
          }
          .bank-box {
            border-top: 1.5px solid #0f172a;
            padding: 6px 8px;
            background: #f8fafc;
            flex: 1;
          }
          .bank-box-title {
            font-size: 9.5px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 4px;
            letter-spacing: 0.5px;
          }
          .bank-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2px 10px;
            font-size: 10px;
            line-height: 1.35;
          }
          .bank-row {
            display: flex;
            gap: 4px;
          }
          .bank-row strong {
            color: #334155;
            min-width: 65px;
          }
          .amount-panel {
            width: 250px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .amount-box {
            border-bottom: 1.5px solid #0f172a;
          }
          .amount-header-row {
            display: flex;
            background: #0f172a;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            padding: 5px 8px;
          }
          .amount-header-title {
            flex: 1.3;
          }
          .amount-header-rs {
            flex: 1;
            text-align: right;
          }
          .amount-row {
            display: flex;
            align-items: center;
            border-bottom: 1px solid #cbd5e1;
            padding: 3.5px 8px;
            font-size: 10.5px;
          }
          .amount-row:last-child {
            border-bottom: none;
          }
          .amount-label {
            flex: 1.3;
            font-weight: 700;
            color: #1e293b;
          }
          .amount-val-col {
            flex: 1;
            text-align: right;
            font-weight: 800;
            color: #0f172a;
          }
          .highlight-row {
            background: #f1f5f9;
            font-weight: 800;
            border-top: 1px solid #0f172a;
            border-bottom: 1px solid #0f172a;
          }
          .balance-row {
            background: #e2e8f0;
            font-weight: 900;
            border-top: 1px solid #0f172a;
          }
          .payable-row {
            background: #f8fafc;
            border-top: 1px solid #0f172a;
            font-size: 10px;
          }
          .gst-box {
            padding: 6px 8px;
            font-size: 10px;
            background: #ffffff;
          }
          .gst-title {
            font-size: 9.5px;
            font-weight: 800;
            margin-bottom: 4px;
            color: #0f172a;
            letter-spacing: 0.5px;
          }
          .gst-checkboxes {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
          }
          .gst-item {
            display: flex;
            align-items: center;
            gap: 3px;
            font-size: 9.5px;
            font-weight: 700;
          }
          .box-check {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 12px;
            height: 12px;
            border: 1.5px solid #0f172a;
            font-size: 10px;
            font-weight: 900;
            line-height: 1;
            background: #ffffff;
            color: #0f172a;
          }
          .gst-meta-row {
            font-size: 9.5px;
            line-height: 1.35;
            margin-top: 2px;
          }
          .footer-note {
            margin-top: 6px;
            border-top: 1.5px solid #0f172a;
            padding-top: 5px;
            font-size: 10px;
            line-height: 1.35;
          }
          .terms-text {
            margin-top: 3px;
            font-size: 9px;
            color: #334155;
          }
          .footer-note-secondary {
            margin-top: 3px;
            font-size: 8.5px;
            line-height: 1.25;
            color: #475569;
          }
          .bottom-bar {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 6px;
            gap: 10px;
          }
          .signature-row {
            flex: 1;
            display: flex;
            gap: 6px;
          }
          .signature-box {
            flex: 1;
            border: 1px solid #0f172a;
            border-radius: 4px;
            padding: 4px 6px;
            min-height: 52px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .signature-label {
            font-size: 8.5px;
            font-weight: 800;
            color: #475569;
          }
          .signature-line {
            border-top: 1px dashed #94a3b8;
            margin: 2px 0;
          }
          .signature-val {
            font-size: 10px;
            font-weight: 700;
            color: #0f172a;
            min-height: 14px;
          }
          .authorise-row {
            width: 220px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            border: 1px solid #0f172a;
            border-radius: 4px;
            padding: 4px;
            background: #f8fafc;
          }
          .authorise-text {
            font-size: 9.5px;
            font-weight: 800;
            color: #0f172a;
          }
          .authorise-signature {
            max-height: 38px;
            width: auto;
            display: block;
            margin: 2px auto;
          }
          .authorise-label {
            font-size: 9px;
            font-weight: 700;
            color: #475569;
          }
          @media print {
            body {
              background: #ffffff;
            }
            .page {
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .frame {
              border-width: 2px;
              padding: 6px;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="frame">
            <div class="header">
              <div class="header-left">
                ${nbtLogoBase64 ? `<img src="${nbtLogoBase64}" style="width: 76px; height: 76px; object-fit: contain;" />` : `<div class="logo-mark">NBT</div>`}
                <img src="${nbtBalajiBase64}" style="width: 76px; height: 76px; object-fit: contain; filter: grayscale(1) contrast(1.4) brightness(0.9);" />
              </div>
              <div class="header-title">
                <div class="top-name">Sri Ramajayam</div>
                <div class="main-title">NEW BALAJI TRANSPORT</div>
                <div class="subtitle">(LORRY SUPPLIERS & COMMISSION AGENT)</div>
                <div class="badge">GOODS CONSIGNMENT / CONSIGNEE COPY</div>
              </div>
              <div class="header-right">
                <p>${note.addressLine1 || '3/131, V.K.V.Complex, 1st Floor,'}<br />${note.addressLine2 || 'Bangalore Bye Pass Road, Kandampatty (Po.), Salem - 636 005. (TN)'}</p>
                <div class="phone-list">
                  <div>☎ ${note.phone1 || '94433 51789'}</div>
                  <div>☎ ${note.phone2 || '93622 51789'}</div>
                  <div>☎ ${note.phone3 || '97892 71721'}</div>
                </div>
              </div>
            </div>

            <div class="fields-grid">
              <div class="grid-row">
                <div class="field-block" style="flex: 1.2;">
                  <div class="field-label">From</div>
                  <div class="field-value">${note.from || ''}</div>
                </div>
                <div class="field-block" style="flex: 1;">
                  <div class="field-label">Truck No.</div>
                  <div class="field-value">${note.truckNumber || ''}</div>
                </div>
                <div class="field-block" style="flex: 1.1;">
                  <div class="field-label">G.C. Note No.</div>
                  <div class="field-value" style="font-weight: 800; color: #b91c1c;">${note.noteNumber || note.id || ''}</div>
                </div>
              </div>
              <div class="grid-row">
                <div class="field-block" style="flex: 1.2;">
                  <div class="field-label">To</div>
                  <div class="field-value">${note.to || ''}</div>
                </div>
                <div class="field-block" style="flex: 1;">
                  <div class="field-label">Date</div>
                  <div class="field-value">${note.date || ''}</div>
                </div>
                <div class="field-block" style="flex: 1.1;">
                  <div class="field-label">As Per Bill No.</div>
                  <div class="field-value">${note.billNumber || ''}</div>
                </div>
              </div>
              <div class="grid-row">
                <div class="field-block" style="flex: 1.5;">
                  <div class="field-label">Consignor M/s.</div>
                  <div class="field-value">${note.consignor || ''}</div>
                </div>
                <div class="field-block" style="flex: 1.5;">
                  <div class="field-label">Consignee M/s.</div>
                  <div class="field-value">${note.consignee || ''}</div>
                </div>
              </div>
              <div class="grid-row">
                <div class="field-block" style="flex: 1.1;">
                  <div class="field-label">Consignor GSTIN</div>
                  <div class="field-value">${note.consignorGst || ''}</div>
                </div>
                <div class="field-block" style="flex: 1.1;">
                  <div class="field-label">Consignee GSTIN</div>
                  <div class="field-value">${note.consigneeGst || ''}</div>
                </div>
                <div class="field-block" style="flex: 1;">
                  <div class="field-label">PAN No.</div>
                  <div class="field-value">${note.pan || ''}</div>
                </div>
              </div>
            </div>

            <div class="table-container">
              <div class="table-left">
                <table class="items-table">
                  <thead>
                    <tr>
                      <th style="width: 16%;">No. of Articles</th>
                      <th style="width: 50%;">Description of Goods<br /><span style="font-size:8.5px; font-weight:normal;">(Said to Contain)</span></th>
                      <th style="width: 17%;">Weight</th>
                      <th style="width: 17%;">Value (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemRows}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="3" class="table-footer-label">Value Rs.</td>
                      <td class="table-footer-value">${totalValue > 0 ? totalValue.toFixed(2) : '0.00'}</td>
                    </tr>
                  </tfoot>
                </table>
                
                <div class="bank-box">
                  <div class="bank-box-title">BANK DETAILS</div>
                  <div class="bank-grid">
                    <div class="bank-row"><strong>A/C Name:</strong> <span>${note.bankAccountName || 'New Balaji Transport'}</span></div>
                    <div class="bank-row"><strong>A/C No.:</strong> <span>${note.bankAccountNumber || '118715000014102'}</span></div>
                    <div class="bank-row"><strong>IFSC Code:</strong> <span>${note.bankIfsc || 'KVBLO001187'}</span></div>
                    <div class="bank-row"><strong>Bank:</strong> <span>${note.bankName || 'Karur Vysya Bank'}</span></div>
                    <div class="bank-row" style="grid-column: span 2;"><strong>Branch:</strong> <span>${note.bankBranch || 'Salem - 636 002'}</span></div>
                  </div>
                </div>
              </div>

              <div class="amount-panel">
                <div class="amount-box">
                  <div class="amount-header-row">
                    <div class="amount-header-title">AMOUNT</div>
                    <div class="amount-header-rs">Rs. &nbsp;&nbsp;&nbsp; Ps.</div>
                  </div>
                  <div class="amount-row">
                    <div class="amount-label">Freight Amount</div>
                    <div class="amount-val-col">${safeNum(note.freight) > 0 ? safeNum(note.freight).toFixed(2) : '0.00'}</div>
                  </div>
                  <div class="amount-row">
                    <div class="amount-label">CGST ${cgstP}</div>
                    <div class="amount-val-col">${safeNum(note.cgst) > 0 ? safeNum(note.cgst).toFixed(2) : '0.00'}</div>
                  </div>
                  <div class="amount-row">
                    <div class="amount-label">SGST ${sgstP}</div>
                    <div class="amount-val-col">${safeNum(note.sgst) > 0 ? safeNum(note.sgst).toFixed(2) : '0.00'}</div>
                  </div>
                  <div class="amount-row">
                    <div class="amount-label">IGST ${igstP}</div>
                    <div class="amount-val-col">${safeNum(note.igst) > 0 ? safeNum(note.igst).toFixed(2) : '0.00'}</div>
                  </div>
                  <div class="amount-row highlight-row">
                    <div class="amount-label">TOTAL AMOUNT</div>
                    <div class="amount-val-col">${safeNum(note.total) > 0 ? safeNum(note.total).toFixed(2) : '0.00'}</div>
                  </div>
                  <div class="amount-row">
                    <div class="amount-label">Less Advance</div>
                    <div class="amount-val-col">${safeNum(note.lessAdvance) > 0 ? safeNum(note.lessAdvance).toFixed(2) : '0.00'}</div>
                  </div>
                  <div class="amount-row balance-row">
                    <div class="amount-label">BALANCE DUE</div>
                    <div class="amount-val-col">${safeNum(note.balance).toFixed(2)}</div>
                  </div>
                  <div class="amount-row payable-row">
                    <div class="amount-label">Payable At</div>
                    <div class="amount-val-col" style="font-weight: 700;">${note.payableAt || ''}</div>
                  </div>
                </div>

                <div class="gst-box">
                  <div class="gst-title">GST TAX PAY</div>
                  <div class="gst-checkboxes">
                    <div class="gst-item"><span class="box-check">${taxPayeeLower === 'transport' ? '✓' : ''}</span> Transport</div>
                    <div class="gst-item"><span class="box-check">${taxPayeeLower === 'consignor' ? '✓' : ''}</span> Consignor</div>
                    <div class="gst-item"><span class="box-check">${taxPayeeLower === 'consignee' ? '✓' : ''}</span> Consignee</div>
                  </div>
                  <div class="gst-meta-row"><strong>GSTIN:</strong> ${note.gstinNumber || '33AMTPR8487P2ZM'}</div>
                  <div class="gst-meta-row"><strong>PAN No.:</strong> ${note.pan || 'AMTPR8487P'}</div>
                  <div class="gst-meta-row"><strong>Delivery At:</strong> ${note.deliveryAt || 'Door Delivery'}</div>
                </div>
              </div>
            </div>

            <div class="footer-note">
              <strong>PAYMENT TYPE:</strong>&nbsp;&nbsp;&nbsp;&nbsp;
              <span class="box-check">${paymentTypeUpper === 'TBB' ? '✓' : ''}</span> TBB&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <span class="box-check">${paymentTypeUpper === 'TO_PAY' ? '✓' : ''}</span> TO PAY&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <span class="box-check">${paymentTypeUpper === 'PAID' ? '✓' : ''}</span> PAID
              <div class="terms-text">These Goods are Booked at Owners risk and Insured by Consignor / Consignee. Subject to Salem Jurisdiction only.</div>
            </div>
            <div class="footer-note-secondary">
              Certified that the service provided is by a Goods Transport Agency (GTA). GST on this service is payable by the Recipient (Consignee) under Reverse Charge Mechanism (RCM) pursuant to Notification No. 13/2017-Central Tax (Rate), and no tax has been charged by the transporter.
            </div>

            <div class="bottom-bar">
              <div class="signature-row">
                <div class="signature-box">
                  <div class="signature-label">DRIVER'S NAME</div>
                  <div class="signature-line"></div>
                  <div class="signature-val">${note.driverName || ''}</div>
                </div>
                <div class="signature-box">
                  <div class="signature-label">DRIVER'S SIGNATURE</div>
                  <div class="signature-line"></div>
                  <div class="signature-val">${note.driverSignature || ''}</div>
                </div>
                <div class="signature-box">
                  <div class="signature-label">DL. No.</div>
                  <div class="signature-line"></div>
                  <div class="signature-val">${note.dlNumber || ''}</div>
                </div>
                <div class="signature-box">
                  <div class="signature-label">LORRY OWNER</div>
                  <div class="signature-line"></div>
                  <div class="signature-val">${note.lorryOwner || ''}</div>
                </div>
              </div>

              <div class="authorise-row">
                <div class="authorise-text">For NEW BALAJI TRANSPORT</div>
                <img class="authorise-signature" src="${nbtAuthorisedSignatureBase64}" alt="Authorised Signature" />
                <div class="authorise-label">Authorised Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrintPDF = async (gcId: string, note?: GcNote) => {
    const gcNote = note || notes.find((item) => item.id === gcId);
    if (!gcNote) {
      Alert.alert('Error', 'Cannot locate the GC note for printing.');
      return;
    }

    try {
      const html = buildGcHtml(gcNote);
      if (Platform.OS === 'web') {
        await openWebGcPrintPreview(html);
        return;
      }

      const { uri } = await Print.printToFileAsync({ html });
      if (!uri) {
        throw new Error('PDF generation failed');
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      } else {
        Alert.alert('PDF Ready', `PDF file is available at ${uri}`);
      }
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Error', 'Unable to generate or open the PDF.');
    }
  };

  const handleDownloadPDF = async (gcId: string, note?: GcNote) => {
    const gcNote = note || notes.find((item) => item.id === gcId);
    if (!gcNote) {
      Alert.alert('Error', 'Cannot locate the GC note.');
      return;
    }
    try {
      const html = buildGcHtml(gcNote);
      const filename = `GC_${gcNote.noteNumber || gcNote.id}_${gcNote.date}`;
      if (Platform.OS === 'web') {
        downloadWebGcAsPdf(html, filename);
        return;
      }
      const { uri } = await Print.printToFileAsync({ html });
      if (!uri) throw new Error('PDF generation failed');
      const pdfFilename = `${filename}.pdf`;
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: pdfFilename });
      } else {
        Alert.alert('PDF Ready', `Saved at ${uri}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Unable to generate the PDF.');
    }
  };

  const handleEditGc = (n: GcNote) => {
    setEditingGcId(n.id);
    setNoteNumber(n.noteNumber || n.id);
    setGcDate(n.date || new Date().toISOString().split('T')[0]);
    setBillNumber(n.billNumber || '');
    setFrom(n.from || '');
    setTo(n.to || '');
    setTruckNumber(n.truckNumber || '');
    setConsignor(n.consignor || '');
    setConsignee(n.consignee || '');
    setConsignorGst(n.consignorGst || '');
    setConsigneeGst(n.consigneeGst || '');
    setGstinNumber(n.gstinNumber || '33AMTPR8487P2ZM');
    setPanNumber(n.pan || 'AMTPR8487P');

    const rawItems = Array.isArray(n.items) ? n.items : [];
    const loadedItems = Array.from({ length: Math.max(6, rawItems.length) }, (_, i) => {
      const item = rawItems[i];
      return {
        articlesCount: item && item.articlesCount !== undefined && item.articlesCount !== null ? String(item.articlesCount) : '',
        description: item ? (item.description || '') : '',
        weight: item && item.weight !== undefined && item.weight !== null ? String(item.weight) : '',
        value: item && item.value !== undefined && item.value !== null ? String(item.value) : '',
      };
    });
    setItems(loadedItems);

    setFreight(n.freight ? n.freight.toString() : '');
    setLessAdvance(n.lessAdvance !== undefined && n.lessAdvance !== null ? n.lessAdvance.toString() : '0');
    
    const f = Number(n.freight) || 0;
    const cgstP = f && n.cgst ? Math.round((n.cgst / f) * 100 * 100) / 100 : 0;
    const sgstP = f && n.sgst ? Math.round((n.sgst / f) * 100 * 100) / 100 : 0;
    const igstP = f && n.igst ? Math.round((n.igst / f) * 100 * 100) / 100 : 0;

    setCgstPercent(cgstP);
    setSgstPercent(sgstP);
    setIgstPercent(igstP);
    setTaxOption(n.cgst > 0 || n.sgst > 0 ? 'CGST_SGST' : n.igst > 0 ? 'IGST' : 'NONE');

    setPayableAt(n.payableAt || '');
    setPaymentType(((n.paymentType as any) || '') as any);
    setTaxPayee(((n.taxPayee || (n as any).gstPayee || 'Consignor') as any));
    setDeliveryAt(n.deliveryAt || 'Door Delivery');
    setDriverName(n.driverName || '');
    setDriverSignature(n.driverSignature || '');
    setDlNumber(n.dlNumber || '');
    setLorryOwner(n.lorryOwner || '');
    setBankAccountName(n.bankAccountName || 'New Balaji Transport');
    setBankAccountNumber(n.bankAccountNumber || '118715000014102');
    setBankIfsc(n.bankIfsc || 'KVBLO001187');
    setBankName(n.bankName || 'Karur Vysya Bank');
    setBankBranch(n.bankBranch || 'Salem - 636 002');
    setAddressLine1(n.addressLine1 || '3/131, V.K.V. Complex, 1st Floor, Bangalore Bye Pass Road,');
    setAddressLine2(n.addressLine2 || 'Kandampatty (Po.), Salem - 636 005. (TN)');
    setPhone1(n.phone1 || '94433 51789');
    setPhone2(n.phone2 || '93622 51789');
    setPhone3(n.phone3 || '97892 71721');
    setBankDetails(n.bankDetails || '');
    setTerms(n.terms || '');

    setActiveTab('CREATE');
  };

  const handleDuplicate = (n: GcNote) => {
    setFrom(n.from);
    setTo(n.to);
    setTruckNumber(n.truckNumber);
    setConsignor(n.consignor);
    setConsignee(n.consignee);
    setConsignorGst(n.consignorGst);
    setConsigneeGst(n.consigneeGst);
    setFreight(n.freight.toString());
    setLessAdvance(n.lessAdvance.toString());
    setCgstPercent(n.freight ? (n.cgst / n.freight) * 100 : 0);
    setSgstPercent(n.freight ? (n.sgst / n.freight) * 100 : 0);
    setIgstPercent(n.freight ? (n.igst / n.freight) * 100 : 0);
    setTaxOption(n.cgst > 0 || n.sgst > 0 ? 'CGST_SGST' : n.igst > 0 ? 'IGST' : 'NONE');

    if (n.items && n.items.length > 0) {
      setItems(
        n.items.map(item => ({
          articlesCount: item.articlesCount.toString(),
          description: item.description,
          weight: item.weight.toString(),
          value: item.value.toString(),
        }))
      );
    } else {
      setItems(Array.from({ length: 6 }, () => ({ articlesCount: '', description: '', weight: '', value: '' })));
    }

    setNoteNumber(n.id);
    setBillNumber((n as any).billNumber || '');
    setGstinNumber((n as any).gstinNumber || '');
    setPaymentType((n as any).paymentType || '');
    setTaxPayee((n as any).taxPayee || (n as any).gstPayee || 'Consignor');
    setDeliveryAt(n.deliveryAt);
    setPanNumber(n.pan);
    setDriverSignature((n as any).driverSignature || '');
    setDriverName(n.driverName);
    setDlNumber(n.dlNumber);
    setLorryOwner(n.lorryOwner);
    setBankAccountName((n as any).bankAccountName || bankAccountName);
    setBankAccountNumber((n as any).bankAccountNumber || bankAccountNumber);
    setBankIfsc((n as any).bankIfsc || bankIfsc);
    setBankName((n as any).bankName || bankName);
    setBankBranch((n as any).bankBranch || bankBranch);
    setAddressLine1((n as any).addressLine1 || addressLine1);
    setAddressLine2((n as any).addressLine2 || addressLine2);
    setPhone1((n as any).phone1 || phone1);
    setPhone2((n as any).phone2 || phone2);
    setPhone3((n as any).phone3 || phone3);
    setBankDetails(n.bankDetails);
    
    setActiveTab('CREATE');
    Alert.alert('Duplicated', `Consignment form autofilled with template values from note ${n.id}.`);
  };

  const handleDeleteGcNote = (id: string, noteNumber?: string) => {
    setDeletingGcId({ id, label: noteNumber ? `GC Note #${noteNumber}` : `GC ID: ${id}` });
    setDeleteModalVisible(true);
  };

  const confirmDeleteGcNote = async () => {
    if (!deletingGcId) return;
    setIsDeleting(true);
    try {
      await db.deleteGcNote(deletingGcId.id);
      await fetchGcNotes();
    } catch (e) {
      Alert.alert('Error', 'Failed to delete GC note.');
    } finally {
      setIsDeleting(false);
      setDeleteModalVisible(false);
      setDeletingGcId(null);
    }
  };

  // Get unique months from noteNumber (format: JUL-26-01 → JUL-26)
  const getMonthsFromNotes = (noteList: GcNote[]) => {
    const months = new Set<string>();
    noteList.forEach(n => {
      const num = n.noteNumber || n.id;
      const parts = num.split('-');
      if (parts.length >= 2) {
        months.add(`${parts[0]}-${parts[1]}`);
      }
    });
    return Array.from(months).sort().reverse();
  };

  const activeMonths = getMonthsFromNotes(notes);

  // Filter notes based on selected month and search query
  const filteredNotes = notes.filter(n => {
    const num = n.noteNumber || n.id;
    const parts = num.split('-');
    const m = `${parts[0]}-${parts[1]}`;
    const matchesMonth = !selectedMonth || m === selectedMonth;
    const q = searchQuery.toLowerCase();
    const matchesQuery = !q ||
      (n.noteNumber || n.id).toLowerCase().includes(q) ||
      n.consignor.toLowerCase().includes(q) ||
      n.consignee.toLowerCase().includes(q) ||
      n.truckNumber.toLowerCase().includes(q) ||
      n.from.toLowerCase().includes(q) ||
      n.to.toLowerCase().includes(q);
    return matchesMonth && matchesQuery;
  });

  // Calculate monthly summary aggregates
  const totalFreight = filteredNotes.reduce((sum, n) => sum + n.freight, 0);
  const totalGst = filteredNotes.reduce((sum, n) => sum + n.cgst + n.sgst + n.igst, 0);
  const totalWeight = filteredNotes.reduce((sum, n) => {
    const itemWeight = n.items?.reduce((s, i) => s + i.weight, 0) || 0;
    return sum + itemWeight;
  }, 0);
  const totalAmount = filteredNotes.reduce((sum, n) => sum + n.total, 0);

  return (
    <View style={styles.container}>
      {/* Header Tabs */}
      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'CREATE' && styles.tabButtonActive]}
          onPress={() => setActiveTab('CREATE')}
        >
          <MaterialIcons name="edit-note" size={20} color={activeTab === 'CREATE' ? '#ffffff' : '#cbd5e1'} />
          <Text style={[styles.tabButtonText, activeTab === 'CREATE' && styles.tabButtonTextActive]}>CREATE GC</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'ARCHIVE' && styles.tabButtonActive]}
          onPress={() => setActiveTab('ARCHIVE')}
        >
          <MaterialIcons name="archive" size={20} color={activeTab === 'ARCHIVE' ? '#ffffff' : '#cbd5e1'} />
          <Text style={[styles.tabButtonText, activeTab === 'ARCHIVE' && styles.tabButtonTextActive]}>GC ARCHIVE</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'CREATE' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.gcWrapper}>
            {editingGcId && (
              <View style={styles.editingBanner}>
                <View style={styles.editingBannerLeft}>
                  <MaterialIcons name="edit" size={20} color="#1e40af" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.editingBannerTitle}>Editing Saved GC Note: {noteNumber || editingGcId}</Text>
                    <Text style={styles.editingBannerSub}>Modify details below and click UPDATE GC NOTE to save changes.</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.cancelEditBtn} onPress={resetFormFields}>
                  <MaterialIcons name="close" size={16} color="#dc2626" />
                  <Text style={styles.cancelEditBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={[styles.gcPage, !isDesktop && { padding: 10, borderRadius: 8 }]}>
              <View style={[styles.gcHeader, !isDesktop && { flexDirection: 'column', alignItems: 'center', gap: 16 }]}>
                <View style={[styles.gcHeaderBrand, !isDesktop && { borderRightWidth: 0, paddingRight: 0, alignItems: 'center' }]}>
                  <View style={styles.logoCircle}>
                    <Image source={require('../../assets/icon.png')} style={styles.logoImage} resizeMode="contain" />
                  </View>
                  <Text style={styles.brandTitle}>NEW BALAJI TRANSPORT</Text>
                  <Text style={styles.brandSubtitle}>(LORRY SUPPLIERS & COMMISSION AGENT)</Text>
                </View>
                <View style={[styles.gcHeaderTitle, !isDesktop && { minWidth: '100%', alignItems: 'center', marginVertical: 12 }]}>
                  <Text style={styles.gcHeaderTitleTop}>Sri Ramajayam</Text>
                  <Text style={[styles.gcHeaderMain, !isDesktop && { fontSize: 22, letterSpacing: 1 }]}>NEW BALAJI TRANSPORT</Text>
                  <Text style={styles.gcHeaderSub}>(LORRY SUPPLIERS & COMMISSION AGENT)</Text>
                  <View style={styles.gcBadge}>
                    <Text style={styles.gcBadgeText}>GOODS CONSIGNMENT / CONSIGNEE COPY</Text>
                  </View>
                </View>
                <View style={[styles.gcHeaderContact, styles.contactBox, !isDesktop && { minWidth: '100%', maxWidth: '100%', alignItems: 'center' }]}>
                  <TextInput
                    style={[styles.textInput, styles.contactAddress]}
                    value={addressLine1}
                    onChangeText={setAddressLine1}
                    placeholder="3/131, V.K.V. Complex, 1st Floor,"
                    placeholderTextColor="#94a3b8"
                  />
                  <TextInput
                    style={[styles.textInput, styles.contactAddress]}
                    value={addressLine2}
                    onChangeText={setAddressLine2}
                    placeholder="Bangalore Bye Pass Road, Kandampatty (Po.)"
                    placeholderTextColor="#94a3b8"
                  />
                  <View style={styles.contactNumbers}>
                    <View style={styles.phoneRow}>
                      <MaterialIcons name="phone" size={12} color="#172554" />
                      <TextInput
                        style={[styles.textInput, styles.phoneInput]}
                        value={phone1}
                        onChangeText={setPhone1}
                        placeholder="94433 51789"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                    <View style={styles.phoneRow}>
                      <MaterialIcons name="phone" size={12} color="#172554" />
                      <TextInput
                        style={[styles.textInput, styles.phoneInput]}
                        value={phone2}
                        onChangeText={setPhone2}
                        placeholder="93622 51789"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                    <View style={styles.phoneRow}>
                      <MaterialIcons name="phone" size={12} color="#172554" />
                      <TextInput
                        style={[styles.textInput, styles.phoneInput]}
                        value={phone3}
                        onChangeText={setPhone3}
                        placeholder="97892 71721"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.gcSectionRow}>
                <View style={[styles.gcFieldBlock, styles.gcFieldBlockWide]}>
                  <Text style={styles.fieldLabel}>From</Text>
                  <TextInput style={styles.fieldInput} value={from} onChangeText={setFrom} placeholder="From" />
                </View>
                <View style={[styles.gcFieldBlock, styles.gcFieldBlockMedium]}>
                  <Text style={styles.fieldLabel}>Truck No.</Text>
                  <TextInput style={styles.fieldInput} value={truckNumber} onChangeText={setTruckNumber} placeholder="Truck No." />
                </View>
                <View style={[styles.gcFieldBlock, styles.gcFieldBlockMedium, styles.gcFieldBlockLarge]}>
                  <Text style={styles.fieldLabel}>G.C. Note No.</Text>
                  <TextInput
                    style={[styles.fieldInput, styles.noteNumberInput, styles.readOnlyField]}
                    value={noteNumber}
                    editable={false}
                    placeholder="MAR-26-01"
                    placeholderTextColor="#c70000"
                  />
                </View>
              </View>

              <View style={styles.gcSectionRow}> 
                <View style={[styles.gcFieldBlock, styles.gcFieldBlockWide]}>
                  <Text style={styles.fieldLabel}>To</Text>
                  <TextInput style={styles.fieldInput} value={to} onChangeText={setTo} placeholder="To" />
                </View>
                <View style={[styles.gcFieldBlock, styles.gcFieldBlockMedium]}>
                  <Text style={styles.fieldLabel}>Date</Text>
                  <TextInput style={styles.fieldInput} value={gcDate} onChangeText={setGcDate} placeholder="____ / ____ / 20__" placeholderTextColor="#94a3b8" />
                </View>
                <View style={[styles.gcFieldBlock, styles.gcFieldBlockMedium]}>
                  <Text style={styles.fieldLabel}>As Per Bill No.</Text>
                  <TextInput style={styles.fieldInput} value={billNumber} onChangeText={setBillNumber} placeholder="Bill No." />
                </View>
              </View>

              <View style={styles.gcSectionRow}>
                <View style={[styles.gcFieldBlock, styles.gcFieldBlockWide]}>
                  <Text style={styles.fieldLabel}>Consignor M/s.</Text>
                  <TextInput style={styles.fieldInput} value={consignor} onChangeText={setConsignor} placeholder="Consignor" />
                </View>
                <View style={[styles.gcFieldBlock, styles.gcFieldBlockWide]}>
                  <Text style={styles.fieldLabel}>Consignee M/s.</Text>
                  <TextInput style={styles.fieldInput} value={consignee} onChangeText={setConsignee} placeholder="Consignee" />
                </View>
              </View>

              <View style={styles.gcSectionRow}>
                <View style={[styles.gcFieldBlock, styles.gcFieldBlockMedium]}>
                  <Text style={styles.fieldLabel}>Consignor GSTIN</Text>
                  <TextInput style={styles.fieldInput} value={consignorGst} onChangeText={setConsignorGst} placeholder="Consignor GSTIN" autoCapitalize="characters" />
                </View>
                <View style={[styles.gcFieldBlock, styles.gcFieldBlockMedium]}>
                  <Text style={styles.fieldLabel}>Consignee GSTIN</Text>
                  <TextInput style={styles.fieldInput} value={consigneeGst} onChangeText={setConsigneeGst} placeholder="Consignee GSTIN" autoCapitalize="characters" />
                </View>
                <View style={[styles.gcFieldBlock, styles.gcFieldBlockMedium]}>
                  <Text style={styles.fieldLabel}>PAN No.</Text>
                  <TextInput style={styles.fieldInput} value={panNumber} onChangeText={setPanNumber} placeholder="AMTPR8487P" autoCapitalize="characters" />
                </View>
              </View>

              <View style={[styles.gcTableRow, !isDesktop && { flexDirection: 'column' }]}>
                <View style={!isDesktop && { marginBottom: 16, width: '100%' }}>
                  <ScrollView horizontal={!isDesktop} showsHorizontalScrollIndicator={true} style={{ flexGrow: 0 }}>
                    <View style={[styles.gcTableMain, !isDesktop && { width: 640 }]}>
                      <View style={[styles.tableRow, styles.tableHeaderRow]}>
                        <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellSmall]}>No. of Articles</Text>
                        <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellLarge]}>Description of Goods{"\n"}(Said to Contain)</Text>
                        <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellSmall]}>Weight</Text>
                        <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellSmall]}>Value (Rs.)</Text>
                      </View>
                      {items.map((item, index) => (
                        <View key={index} style={styles.tableRow}>
                          <TextInput
                            style={[styles.tableCell, styles.tableCellInput, styles.tableCellSmall]}
                            value={item.articlesCount}
                            keyboardType="numeric"
                            onChangeText={(value) => updateItemField(index, 'articlesCount', value)}
                            placeholder=""
                          />
                          <TextInput
                            style={[styles.tableCell, styles.tableCellInput, styles.tableCellLarge]}
                            value={item.description}
                            onChangeText={(value) => updateItemField(index, 'description', value)}
                            placeholder="Description"
                          />
                          <TextInput
                            style={[styles.tableCell, styles.tableCellInput, styles.tableCellSmall]}
                            value={item.weight}
                            keyboardType="numeric"
                            onChangeText={(value) => updateItemField(index, 'weight', value)}
                            placeholder=""
                          />
                          <TextInput
                            style={[styles.tableCell, styles.tableCellInput, styles.tableCellSmall]}
                            value={item.value}
                            keyboardType="numeric"
                            onChangeText={(value) => updateItemField(index, 'value', value)}
                            placeholder=""
                          />
                        </View>
                      ))}
                      <View style={styles.tableFooterRow}>
                        <Text style={styles.tableFooterLabel}>Value Rs.</Text>
                        <TextInput style={styles.tableFooterInput} value={totalAmount.toFixed(2)} editable={false} />
                      </View>
                      <View style={styles.bankInfoBox}>
                        <Text style={styles.bankInfoTitle}>BANK DETAILS</Text>
                        <View style={styles.bankInfoRow}>
                          <Text style={styles.bankInfoLabel}>A/C Name :</Text>
                          <TextInput style={styles.bankInfoValue} value={bankAccountName} onChangeText={setBankAccountName} />
                        </View>
                        <View style={styles.bankInfoRow}>
                          <Text style={styles.bankInfoLabel}>A/C No. :</Text>
                          <TextInput style={styles.bankInfoValue} value={bankAccountNumber} onChangeText={setBankAccountNumber} keyboardType="numeric" />
                        </View>
                        <View style={styles.bankInfoRow}>
                          <Text style={styles.bankInfoLabel}>IFSC Code :</Text>
                          <TextInput style={styles.bankInfoValue} value={bankIfsc} onChangeText={setBankIfsc} autoCapitalize="characters" />
                        </View>
                        <View style={styles.bankInfoRow}>
                          <Text style={styles.bankInfoLabel}>Bank :</Text>
                          <TextInput style={styles.bankInfoValue} value={bankName} onChangeText={setBankName} />
                        </View>
                        <View style={styles.bankInfoRow}>
                          <Text style={styles.bankInfoLabel}>Branch :</Text>
                          <TextInput style={styles.bankInfoValue} value={bankBranch} onChangeText={setBankBranch} />
                        </View>
                      </View>
                    </View>
                  </ScrollView>
                </View>

                <View style={[styles.gcSummaryColumn, !isDesktop && { width: '100%', marginLeft: 0, marginTop: 16 }]}>
                  <View style={[styles.amountHeader, styles.amountHeaderTop]}>
                    <Text style={styles.amountLabel}>AMOUNT</Text>
                  </View>
                  <View style={[styles.amountHeader, styles.amountHeaderRow]}>
                    <Text style={[styles.amountLabel, styles.amountLabelSmall]}>Rs.</Text>
                    <Text style={[styles.amountLabel, styles.amountLabelSmall]}>Ps.</Text>
                  </View>
                  {[
                    { label: 'Freight Amount', value: freight, setter: setFreight },
                    { label: 'CGST (%)', value: cgstPercent.toString(), setter: (text: string) => setCgstPercent(Number(text) || 0), amount: cgstAmount.toFixed(2) },
                    { label: 'SGST (%)', value: sgstPercent.toString(), setter: (text: string) => setSgstPercent(Number(text) || 0), amount: sgstAmount.toFixed(2) },
                    { label: 'IGST (%)', value: igstPercent.toString(), setter: (text: string) => setIgstPercent(Number(text) || 0), amount: igstAmount.toFixed(2) },
                    { label: 'Total Tax', value: totalTax.toFixed(2), setter: undefined },
                    { label: 'Grand Total', value: grandTotal.toFixed(2), setter: undefined },
                    { label: 'Less Advance', value: lessAdvance, setter: setLessAdvance },
                    { label: 'Balance', value: balanceDue.toFixed(2), setter: undefined },
                  ].map((row, index) => (
                    <View key={index} style={styles.amountRow}>
                      <Text style={styles.amountRowLabel}>{row.label}</Text>
                      {row.setter ? (
                        <TextInput
                          style={[styles.amountCell, styles.amountInput]}
                          value={row.value}
                          onChangeText={row.setter}
                          editable={true}
                          keyboardType="decimal-pad"
                          placeholder=""
                        />
                      ) : (
                        <Text style={[styles.amountCell, styles.amountInput, styles.amountReadonly]}>{row.value}</Text>
                      )}
                      <Text style={[styles.amountCell, styles.amountPs]}>{row.amount ?? '00'}</Text>
                    </View>
                  ))}
                  <View style={styles.amountRow}>
                    <Text style={styles.amountRowLabel}>Payable At</Text>
                    <TextInput style={[styles.amountCell, styles.amountInput, styles.amountFullWidth]} value={payableAt} onChangeText={setPayableAt} placeholder="Payable At" />
                  </View>

                  <View style={styles.taxPaySection}>
                    <Text style={styles.taxPayLabel}>GST TAX PAY</Text>
                    {['Transport', 'Consignor', 'Consignee'].map((value) => (
                      <TouchableOpacity
                        key={value}
                        style={styles.checkboxRow}
                        onPress={() => setTaxPayee(value as 'Transport' | 'Consignor' | 'Consignee')}
                      >
                        <View style={[styles.checkbox, taxPayee === value && styles.checkboxActive]} />
                        <Text style={styles.checkboxText}>{value}</Text>
                      </TouchableOpacity>
                    ))}
                    <Text style={styles.gstinLabel}>GSTIN</Text>
                    <TextInput style={styles.gstinInput} value={gstinNumber} onChangeText={setGstinNumber} autoCapitalize="characters" />
                    <Text style={styles.panLabel}>PAN No.</Text>
                    <TextInput style={styles.gstinInput} value={panNumber} onChangeText={setPanNumber} autoCapitalize="characters" />
                    <Text style={styles.deliveryLabel}>Delivery At</Text>
                    <TextInput style={styles.gstinInput} value={deliveryAt} onChangeText={setDeliveryAt} placeholder="Delivery At" />
                  </View>
                </View>
              </View>

              <View style={styles.paymentFooter}>
                <View style={[styles.paymentTypeBlock, !isDesktop && { flexDirection: 'column', alignItems: 'stretch', gap: 16 }]}>
                  <View>
                    <Text style={styles.fieldLabel}>PAYMENT TYPE</Text>
                    <View style={styles.paymentTypeRow}>
                      {[
                        { label: 'TBB', value: 'TBB' },
                        { label: 'TO PAY', value: 'TO_PAY' },
                        { label: 'PAID', value: 'PAID' },
                      ].map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[styles.paymentCheckbox, paymentType === option.value && styles.paymentCheckboxActive]}
                          onPress={() => setPaymentType(option.value as 'TBB' | 'TO_PAY' | 'PAID')}
                        >
                          <View style={[styles.checkbox, paymentType === option.value && styles.checkboxActive]} />
                          <Text style={styles.paymentText}>{option.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={[styles.rightFooterNote, !isDesktop && { paddingLeft: 0, alignItems: 'center', marginTop: 12 }]}>
                    <Text style={styles.rightFooterTitle}>For NEW BALAJI TRANSPORT</Text>
                    <View style={styles.authorisedRow}>
                      <Image
                        source={require('../../assets/signatures/nbt-authorised-signature.png')}
                        style={styles.authorisedSignatureImage}
                        resizeMode="contain"
                      />
                      <Text style={styles.authorisedLabel}>Authorised Signatory</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.paymentNoteBlock}>
                  <Text style={styles.paymentNote}>These Goods are Booked at Owners risk and Insured by Consignor / Consignee. Subject to Salem Jurisdiction only.</Text>
                </View>

                <View style={styles.paymentNoteBlockSecondary}>
                  <Text style={styles.paymentNote}>Certified that the service provided is by a Goods Transport Agency (GTA). GST on this service is payable by the Recipient (Consignee) under Reverse Charge Mechanism (RCM) pursuant to Notification No. 13/2017-Central Tax (Rate), and no tax has been charged by the transporter.</Text>
                </View>

                <View style={[styles.footerSignatureRow, !isDesktop && { flexDirection: 'column', gap: 10 }]}>
                  <View style={styles.signatureBox}>
                    <Text style={styles.signatureLabel}>DRIVER'S NAME</Text>
                    <TextInput style={styles.signatureInput} value={driverName} onChangeText={setDriverName} placeholder="Driver's Name" />
                  </View>
                  <View style={styles.signatureBox}>
                    <Text style={styles.signatureLabel}>DRIVER'S SIGNATURE</Text>
                    <TextInput style={styles.signatureInput} value={driverSignature} onChangeText={setDriverSignature} placeholder="Signature" />
                  </View>
                  <View style={styles.signatureBox}>
                    <Text style={styles.signatureLabel}>DL. No.</Text>
                    <TextInput style={styles.signatureInput} value={dlNumber} onChangeText={setDlNumber} placeholder="DL No." autoCapitalize="characters" />
                  </View>
                  <View style={styles.signatureBox}>
                    <Text style={styles.signatureLabel}>LORRY OWNER</Text>
                    <TextInput style={styles.signatureInput} value={lorryOwner} onChangeText={setLorryOwner} placeholder="Owner Name" />
                  </View>
                </View>
              </View>
            </View>

            <View style={[styles.formBottomBar, !isDesktop && { flexDirection: 'column', gap: 10, height: 'auto', marginBottom: 32 }]}>
              <TouchableOpacity
                style={[styles.actionBtnLarge, editingGcId ? styles.updateBtnStyle : styles.saveBtnStyle, loading && { opacity: 0.6 }]}
                onPress={handleSaveGC}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <MaterialIcons name={editingGcId ? "check-circle" : "save"} size={18} color="#ffffff" />
                    <Text style={styles.actionBtnLargeText}>{editingGcId ? "UPDATE GC NOTE" : "SAVE NOTE"}</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtnLarge, styles.downloadBtnStyle]}
                onPress={handleDownloadCurrentForm}
              >
                <MaterialIcons name="file-download" size={18} color="#ffffff" />
                <Text style={styles.actionBtnLargeText}>DOWNLOAD PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtnLarge, styles.printBtnStyle]}
                onPress={handlePrintCurrentForm}
              >
                <MaterialIcons name="print" size={18} color="#ffffff" />
                <Text style={styles.actionBtnLargeText}>PRINT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : (
        // GC ARCHIVE TAB
        <View style={{ flex: 1 }}>
          {/* Search Bar inside Archive */}
          <View style={styles.archiveHeader}>
            <View style={styles.searchBox}>
              <MaterialIcons name="search" size={20} color={COLORS.outline} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by Note #, Lorry, Party..."
                placeholderTextColor={COLORS.outline}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Month Acc Chip selection */}
          <View style={styles.monthListContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthChipsRow}>
              {activeMonths.length === 0 ? (
                <Text style={styles.noDataText}>No records archived</Text>
              ) : (
                activeMonths.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.monthChip, selectedMonth === m && styles.monthChipActive]}
                    onPress={() => setSelectedMonth(m)}
                  >
                    <Text style={[styles.monthChipText, selectedMonth === m && styles.monthChipTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>

          {/* Monthly Aggregates Summary card */}
          {filteredNotes.length > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{selectedMonth} Financial aggregates</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>TOTAL NOTES</Text>
                  <Text style={styles.summaryVal}>{filteredNotes.length}</Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>TOTAL FREIGHT</Text>
                  <Text style={styles.summaryVal}>₹{totalFreight.toLocaleString()}</Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>TOTAL GST</Text>
                  <Text style={styles.summaryVal}>₹{totalGst.toLocaleString()}</Text>
                </View>
              </View>
              <View style={[styles.summaryGrid, { marginTop: 10 }]}>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>TOTAL WEIGHT</Text>
                  <Text style={styles.summaryVal}>{totalWeight.toFixed(2)} Tons</Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>TOTAL REVENUE</Text>
                  <Text style={[styles.summaryVal, { color: COLORS.success }]}>₹{totalAmount.toLocaleString()}</Text>
                </View>
              </View>
            </View>
          )}

          {/* List of GC copies */}
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 32 }} />
          ) : filteredNotes.length === 0 ? (
            <View style={styles.centerBox}>
              <MaterialIcons name="inventory" size={64} color={COLORS.outline} />
              <Text style={styles.emptyTitle}>No GC notes found</Text>
              <Text style={styles.emptyDesc}>Create a consignment copy to start the archive.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredNotes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.gcCard}>
                  <View style={styles.gcCardHeader}>
                    <Text style={styles.gcNoteId}>{item.noteNumber || item.id}</Text>
                    <Text style={styles.gcDate}>{item.date}</Text>
                  </View>
                  <View style={styles.gcRoute}>
                    <Text style={styles.gcRouteText}>{item.from} → {item.to}</Text>
                    <Text style={styles.gcTruck}>{item.truckNumber}</Text>
                  </View>
                  <View style={styles.gcParties}>
                    <Text style={styles.gcPartyText}><Text style={{ fontWeight: 'bold' }}>Shipper:</Text> {item.consignor}</Text>
                    <Text style={styles.gcPartyText}><Text style={{ fontWeight: 'bold' }}>Consignee:</Text> {item.consignee}</Text>
                  </View>
                  <View style={styles.gcFooter}>
                    <Text style={styles.gcFreight}>Freight: <Text style={{ color: COLORS.primary }}>₹{Number(item.freight || 0).toLocaleString()}</Text></Text>
                    <Text style={styles.gcFreight}>Total: <Text style={{ color: COLORS.success }}>₹{Number(item.total || 0).toLocaleString()}</Text></Text>
                    <Text style={styles.gcWeight}>
                      Wt: {(item.items || []).reduce((s, i) => s + (Number(i.weight) || 0), 0).toFixed(2)} T
                    </Text>
                    {item.paymentType ? (
                      <Text style={[styles.gcWeight, { color: COLORS.secondary, fontWeight: 'bold' }]}>{item.paymentType}</Text>
                    ) : null}
                  </View>

                  {/* Action buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionBtn} onPress={async () => { await db.togglePinGc(item.id); fetchGcNotes(); }}>
                      <MaterialIcons name="push-pin" size={16} color={item.isPinned ? '#d97706' : COLORS.textMuted} />
                      <Text style={[styles.actionBtnText, { color: item.isPinned ? '#d97706' : COLORS.textMuted }]}>{item.isPinned ? 'UNPIN' : 'PIN'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }]} onPress={() => handleEditGc(item)}>
                      <MaterialIcons name="edit" size={16} color="#2563eb" />
                      <Text style={[styles.actionBtnText, { color: '#2563eb' }]}>EDIT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDownloadPDF(item.id, item)}>
                      <MaterialIcons name="file-download" size={16} color="#0e7490" />
                      <Text style={[styles.actionBtnText, { color: '#0e7490' }]}>PDF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handlePrintPDF(item.id, item)}>
                      <MaterialIcons name="print" size={16} color={COLORS.secondary} />
                      <Text style={styles.actionBtnText}>PRINT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDuplicate(item)}>
                      <MaterialIcons name="content-copy" size={16} color={COLORS.primary} />
                      <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>DUPLICATE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteGcNote(item.id, item.noteNumber)}>
                      <MaterialIcons name="delete-outline" size={16} color="#ef4444" />
                      <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>DELETE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              contentContainerStyle={{ padding: SPACING.gutter, paddingBottom: 120 }}
            />
          )}
        </View>
      )}

      {/* Attractive Custom Modal Confirmation Dialog */}
      <Modal
        transparent
        visible={confirmModal.visible}
        animationType="fade"
        onRequestClose={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={[
              styles.modalIconCircle,
              confirmModal.type === 'danger' && { backgroundColor: '#fee2e2' },
              confirmModal.type === 'success' && { backgroundColor: '#d1fae5' },
              confirmModal.type === 'info' && { backgroundColor: '#e0f2fe' },
            ]}>
              <MaterialIcons
                name={
                  confirmModal.type === 'danger' ? 'delete-forever' :
                  confirmModal.type === 'success' ? 'check-circle' : 'info'
                }
                size={36}
                color={
                  confirmModal.type === 'danger' ? '#dc2626' :
                  confirmModal.type === 'success' ? '#059669' : '#0284c7'
                }
              />
            </View>

            <Text style={styles.modalTitle}>{confirmModal.title}</Text>
            <Text style={styles.modalMessage}>{confirmModal.message}</Text>

            <View style={styles.modalBtnRow}>
              {confirmModal.cancelText ? (
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
                >
                  <Text style={styles.modalCancelBtnText}>{confirmModal.cancelText}</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  confirmModal.type === 'danger' && { backgroundColor: '#dc2626' },
                  confirmModal.type === 'success' && { backgroundColor: '#059669' },
                  confirmModal.type === 'info' && { backgroundColor: COLORS.primary },
                ]}
                onPress={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  else setConfirmModal(prev => ({ ...prev, visible: false }));
                }}
              >
                <Text style={styles.modalConfirmBtnText}>{confirmModal.confirmText || 'OK'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        visible={deleteModalVisible}
        title="Delete GC Note"
        message="Are you sure you want to permanently delete this GC note? This action cannot be undone."
        itemLabel={deletingGcId?.label}
        isDeleting={isDeleting}
        onConfirm={confirmDeleteGcNote}
        onCancel={() => {
          setDeleteModalVisible(false);
          setDeletingGcId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: COLORS.secondary,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#cbd5e1',
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
  scrollContent: {
    padding: SPACING.gutter,
    paddingBottom: 96,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    ...SHADOWS.light,
  },
  formSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    paddingBottom: 6,
    marginTop: 12,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputCol: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  formInput: {
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 6,
    height: 44,
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: 10,
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  taxChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  taxChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 16,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  taxChipActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  taxChipText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  taxChipTextActive: {
    color: '#ffffff',
  },
  ledgerSheet: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 6,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  ledgerLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  ledgerVal: {
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  ledgerTotalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    paddingTop: 6,
    marginTop: 4,
  },
  ledgerTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  ledgerTotalVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  ledgerBalanceRow: {
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
    paddingTop: 8,
    marginTop: 6,
  },
  ledgerBalanceLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.secondary,
  },
  ledgerBalanceVal: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary,
    height: 52,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
    ...SHADOWS.light,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  gcWrapper: {
    flex: 1,
    paddingBottom: 48,
  },
  gcPage: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#0f172a',
    borderRadius: 12,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  gcHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  gcHeaderBrand: {
    flex: 0.95,
    alignItems: 'flex-start',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#172554',
    paddingRight: 16,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: '#172554',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  logoImage: {
    width: 56,
    height: 56,
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#172554',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#172554',
    textAlign: 'center',
    marginTop: 2,
  },
  gcHeaderTitle: {
    flex: 2.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gcHeaderTitleTop: {
    fontSize: 11,
    color: '#172554',
    fontWeight: '700',
    marginBottom: 4,
  },
  gcHeaderMain: {
    fontSize: 34,
    fontWeight: '900',
    color: '#172554',
    letterSpacing: 2,
    textAlign: 'center',
  },
  gcHeaderSub: {
    fontSize: 12,
    color: '#172554',
    fontWeight: '700',
    marginTop: 6,
  },
  gcBadge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#172554',
    borderRadius: 6,
  },
  gcBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  gcHeaderContact: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    maxWidth: 260,
    minWidth: 240,
  },
  contactBox: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#ffffff',
  },
  contactAddress: {
    width: '100%',
    marginBottom: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    color: '#172554',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  contactNumbers: {
    marginTop: 4,
    width: '100%',
    gap: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
    color: '#172554',
    fontSize: 11,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#172554',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#172554',
    backgroundColor: '#ffffff',
    fontSize: 11,
  },
  addressInput: {
    width: '100%',
    marginBottom: 6,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  contactInput: {
    flex: 1,
  },
  gcSectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  gcFieldBlock: {
    flex: 1,
    minWidth: 140,
    borderWidth: 1,
    borderColor: '#0f172a',
    borderRadius: 6,
    padding: 6,
    backgroundColor: '#ffffff',
  },
  gcFieldBlockLarge: {
    flex: 1.4,
    borderWidth: 1,
    borderColor: '#0f172a',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#ffffff',
  },
  gcFieldBlockMedium: {
    flex: 1,
  },
  gcFieldBlockWide: {
    flex: 1.6,
  },
  fieldLabel: {
    fontSize: 10,
    color: '#0f172a',
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  fieldInput: {
    borderWidth: 0,
    height: 32,
    paddingHorizontal: 4,
    color: '#0f172a',
    backgroundColor: 'transparent',
    fontSize: 12,
    fontWeight: '600',
  },
  noteNumberInput: {
    color: '#c70000',
    fontWeight: '900',
  },
  readOnlyField: {
    backgroundColor: '#f1f5f9',
    color: '#000000',
  },
  gcTableRow: {
    flexDirection: 'row',
  },
  gcTableMain: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#172554',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 42,
    borderBottomWidth: 1,
    borderBottomColor: '#172554',
  },
  tableHeaderRow: {
    backgroundColor: '#172554',
    minHeight: 42,
    alignItems: 'center',
  },
  tableCell: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: '#172554',
    justifyContent: 'center',
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  tableCellSmall: {
    flex: 0.9,
  },
  tableCellLarge: {
    flex: 2.4,
  },
  tableCellInput: {
    paddingVertical: 8,
    fontSize: 11,
    color: '#172554',
    backgroundColor: 'transparent',
  },
  tableFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#172554',
    padding: 10,
    backgroundColor: '#f7f9ff',
  },
  tableFooterLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#172554',
  },
  tableFooterInput: {
    flex: 1.2,
    borderWidth: 1,
    borderColor: '#172554',
    borderRadius: 4,
    paddingHorizontal: 8,
    height: 34,
    backgroundColor: '#ffffff',
    color: '#172554',
    fontSize: 11,
  },
  bankInfoBox: {
    borderWidth: 1,
    borderColor: '#172554',
    borderRadius: 6,
    padding: 10,
    margin: 10,
    backgroundColor: '#ffffff',
  },
  bankInfoTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#172554',
    marginBottom: 8,
    textAlign: 'center',
  },
  bankInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bankInfoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#172554',
    flex: 0.45,
  },
  bankInfoValue: {
    flex: 0.55,
    borderWidth: 1,
    borderColor: '#172554',
    borderRadius: 4,
    height: 32,
    paddingHorizontal: 8,
    backgroundColor: '#f7f9ff',
    color: '#172554',
    fontSize: 11,
  },
  gcSummaryColumn: {
    width: 240,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#0f172a',
    borderRadius: 6,
    backgroundColor: '#ffffff',
    padding: 10,
  },
  amountHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
    paddingVertical: 8,
    alignItems: 'center',
  },
  amountHeaderTop: {
    backgroundColor: '#0f172a',
  },
  amountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#172554',
  },
  amountLabel: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '700',
  },
  amountLabelSmall: {
    color: '#0f172a',
    fontSize: 10,
    flex: 1,
    textAlign: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 6,
  },
  amountRowLabel: {
    flex: 1.4,
    fontSize: 11,
    color: '#172554',
    fontWeight: '700',
  },
  amountCell: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#0f172a',
    borderRadius: 4,
    height: 34,
    paddingHorizontal: 8,
    marginRight: 4,
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: 11,
  },
  amountInput: {
    textAlign: 'right',
  },
  amountPs: {
    width: 28,
    fontSize: 11,
    fontWeight: '700',
    color: '#172554',
    textAlign: 'center',
  },
  amountReadonly: {
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    textAlign: 'right',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  amountFullWidth: {
    flex: 2.2,
  },
  taxPaySection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#172554',
    paddingTop: 10,
  },
  taxPayLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#172554',
    marginBottom: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: '#172554',
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  checkboxActive: {
    backgroundColor: '#172554',
  },
  checkboxText: {
    fontSize: 10,
    color: '#172554',
    fontWeight: '600',
  },
  gstinLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#172554',
    marginTop: 10,
  },
  gstinInput: {
    borderWidth: 1,
    borderColor: '#172554',
    borderRadius: 4,
    height: 34,
    paddingHorizontal: 8,
    marginTop: 4,
    backgroundColor: '#f7f9ff',
    color: '#172554',
    fontSize: 11,
  },
  panLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#172554',
    marginTop: 10,
  },
  deliveryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#172554',
    marginTop: 10,
  },
  paymentFooter: {
    marginTop: 18,
  },
  paymentTypeBlock: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 32,
    marginBottom: 12,
  },
  paymentTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentCheckboxActive: {
    backgroundColor: '#e0e7ff',
    borderColor: '#172554',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  paymentText: {
    fontSize: 10,
    color: '#172554',
    fontWeight: '700',
  },
  paymentNoteBlock: {
    borderWidth: 1,
    borderColor: '#172554',
    borderRadius: 6,
    padding: 10,
    backgroundColor: '#eff6ff',
  },
  paymentNote: {
    fontSize: 10,
    color: '#172554',
    lineHeight: 16,
  },
  rightFooterNote: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 12,
  },
  rightFooterTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#172554',
    marginBottom: 8,
  },
  authorisedRow: {
    alignItems: 'center',
    gap: 8,
  },
  authorisedLine: {
    width: 120,
    borderTopWidth: 1,
    borderTopColor: '#172554',
  },
  authorisedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#172554',
  },
  authorisedSignatureImage: {
    maxWidth: 110,
    width: '100%',
    aspectRatio: 2,
    alignSelf: 'center',
  },
  paymentNoteBlockSecondary: {
    borderWidth: 1,
    borderColor: '#172554',
    borderRadius: 6,
    padding: 10,
    backgroundColor: '#f8fafc',
    marginTop: 10,
  },
  footerSignatureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  signatureBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#172554',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#ffffff',
  },
  signatureLabel: {
    fontSize: 10,
    color: '#172554',
    fontWeight: '700',
    marginBottom: 6,
  },
  signatureInput: {
    borderWidth: 1,
    borderColor: '#172554',
    borderRadius: 4,
    height: 36,
    paddingHorizontal: 8,
    backgroundColor: '#f7f9ff',
    color: '#172554',
    fontSize: 11,
  },
  archiveHeader: {
    padding: SPACING.gutter,
    backgroundColor: COLORS.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 6,
    height: 40,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 8,
    fontSize: 13,
    color: COLORS.textDark,
  },
  monthListContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    paddingVertical: 8,
  },
  monthChipsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  monthChip: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  monthChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  monthChipText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  monthChipTextActive: {
    color: '#ffffff',
  },
  summaryCard: {
    margin: SPACING.gutter,
    marginBottom: 4,
    backgroundColor: COLORS.primaryContainer,
    borderRadius: 8,
    padding: 16,
    ...SHADOWS.light,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.onPrimary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 6,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryCol: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 2,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    marginTop: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  noDataText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  gcCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.light,
  },
  gcCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    paddingBottom: 8,
    marginBottom: 8,
  },
  gcNoteId: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  gcDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  gcRoute: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gcRouteText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  gcTruck: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  gcParties: {
    gap: 2,
    marginBottom: 8,
  },
  gcPartyText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  gcFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    paddingTop: 8,
    marginTop: 4,
  },
  gcFreight: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  gcWeight: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceContainerLow,
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  formBottomBar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 24,
  },
  actionBtnLarge: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    ...SHADOWS.light,
  },
  saveBtnStyle: {
    backgroundColor: '#047857',
  },
  updateBtnStyle: {
    backgroundColor: '#2563eb',
  },
  downloadBtnStyle: {
    backgroundColor: '#0e7490',
  },
  printBtnStyle: {
    backgroundColor: '#6d28d9',
  },
  editingBanner: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
    ...SHADOWS.light,
  },
  editingBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  editingBannerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  editingBannerSub: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 2,
  },
  cancelEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cancelEditBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  actionBtnLargeText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
