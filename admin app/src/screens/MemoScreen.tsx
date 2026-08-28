import React, { type Component, type ComponentType, type PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import WebView from 'react-native-webview';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { COLORS, SHADOWS, SPACING } from '../theme';
import nbtAuthorisedSignatureBase64 from '../nbtSignatureBase64';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { db, MemoDocument } from '../db/database';

const A4_RATIO = 210 / 297;
const PAGE_FILENAME_PREFIX = 'NBT_Memo';
const isWeb = Platform.OS === 'web';
const AnyWebView = WebView as any;
const FileSystemCompat = FileSystem as unknown as {
  cacheDirectory: string;
  copyAsync(options: { from: string; to: string }): Promise<void>;
};

const formatMemoPreview = (html: string) => {
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 120 ? `${text.slice(0, 120).trim()}...` : text;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildMemoDocumentHtml = (date: string, contentHtml: string, editorMode = false) => {
  const safeDate = escapeHtml(date);
  const safeContent = contentHtml || '<div><br></div>';
  const editableAttributes = editorMode ? 'contenteditable="true" spellcheck="true"' : '';
  const editableDateAttributes = editorMode ? 'contenteditable="true" spellcheck="false"' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NBT Memo - ${safeDate}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 6mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
    }
    .page {
      width: 100%;
      max-width: 198mm;
      min-height: 278mm;
      margin: 0 auto;
      padding: 8mm;
      background: #ffffff;
      border: 2.5px solid #0f172a;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    @media print {
      body {
        background: #ffffff;
      }
      .page {
        width: 100% !important;
        max-width: none !important;
        min-height: 280mm !important;
        margin: 0 !important;
        padding: 6mm !important;
        border-width: 2px !important;
      }
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding-bottom: 8px;
    }
    .logo-area {
      width: 86px;
      min-width: 86px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-circle {
      width: 82px;
      height: 82px;
      border: 2.5px solid #0f172a;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4px;
      box-sizing: border-box;
      text-align: center;
    }
    .logo-mark {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 1px;
      color: #0f172a;
      line-height: 1;
    }
    .logo-text {
      font-size: 6.5px;
      line-height: 1.1;
      font-weight: 800;
      letter-spacing: 0.5px;
      margin-top: 3px;
      color: #0f172a;
    }
    .header-center {
      text-align: center;
      flex: 1;
      padding: 0 4px;
    }
    .signed-by {
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 3px;
      letter-spacing: 0.5px;
      color: #0f172a;
    }
    .company-name {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 1.5px;
      margin: 0;
      line-height: 1.1;
      color: #0f172a;
    }
    .company-subtitle {
      font-size: 11px;
      font-weight: 700;
      margin: 3px 0 0;
      color: #334155;
    }
    .address {
      font-size: 10px;
      line-height: 1.4;
      margin-top: 5px;
      color: #334155;
      font-weight: 500;
    }
    .contact-right {
      min-width: 140px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
      border: 1.5px solid #0f172a;
      border-radius: 6px;
      padding: 6px 8px;
    }
    .contact-block {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .contact-text {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 9.5px;
      line-height: 1.25;
      color: #0f172a;
    }
    .contact-label {
      font-weight: 800;
      color: #475569;
    }
    .contact-value {
      font-size: 10.5px;
      font-weight: 800;
      color: #0f172a;
    }
    .divider-row {
      position: relative;
      margin: 8px 0;
      text-align: center;
    }
    .divider-line {
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      border-top: 2px solid #0f172a;
      transform: translateY(-50%);
    }
    .memo-badge {
      display: inline-block;
      position: relative;
      background: #0f172a;
      color: #ffffff;
      border-radius: 4px;
      padding: 3px 18px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 1.5px;
      z-index: 1;
    }
    .memo-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 4px 0;
    }
    .date-row {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 6px;
      margin-bottom: 12px;
      font-size: 11.5px;
    }
    .date-label {
      font-weight: 800;
      color: #0f172a;
    }
    .date-value {
      min-width: 140px;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 2px;
      font-weight: 700;
      color: #0f172a;
      text-align: center;
    }
    .editable-area {
      flex: 1;
      outline: none;
      font-size: 13px;
      line-height: 1.5;
      color: #0f172a;
      min-height: 140mm;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .editable-area:empty::before {
      content: 'Type memo content here...';
      color: #94a3b8;
    }
    .footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
      padding-top: 8px;
    }
    .signature-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      width: 180px;
      border: 1px solid #0f172a;
      border-radius: 4px;
      padding: 6px 8px;
      background: #f8fafc;
    }
    .signature-caption {
      font-size: 9.5px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .signature-img {
      max-height: 40px;
      width: auto;
      display: block;
      margin: 2px auto;
    }
    .signatory-text {
      font-size: 9px;
      font-weight: 700;
      color: #475569;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="page">
    <div>
      <div class="header-top">
        <div class="logo-area">
          <div class="logo-circle">
            <div class="logo-mark">NBT</div>
            <div class="logo-text">NEW BALAJI TRANSPORT</div>
          </div>
        </div>
        <div class="header-center">
          <div class="signed-by">Sri Ramajayam</div>
          <div class="company-name">NEW BALAJI TRANSPORT</div>
          <div class="company-subtitle">(LORRY SUPPLIERS & COMMISSION AGENT)</div>
          <div class="address">
            3/131, V.K.V. Complex, 1st Floor, Bangalore Bye Pass Road,<br />
            Kandampatty (Po.), Salem - 636 005. (TN)
          </div>
        </div>
        <div class="contact-right">
          <div class="contact-block">
            <div class="contact-text">
              <span class="contact-label">Cell :</span>
              <span class="contact-value">94433 51789, 93622 51789</span>
            </div>
          </div>
          <div class="contact-block">
            <div class="contact-text">
              <span class="contact-label">Offi. :</span>
              <span class="contact-value">0427-2225575, 2225576</span>
            </div>
          </div>
        </div>
      </div>
      <div class="divider-row">
        <div class="divider-line"></div>
        <div class="memo-badge">MEMO</div>
      </div>
    </div>
    
    <div class="memo-body">
      <div class="date-row">
        <span class="date-label">Date :</span>
        <div id="dateField" class="date-value" ${editableDateAttributes}>${safeDate}</div>
      </div>
      <div id="memoEditor" class="editable-area memo-content" ${editableAttributes}>${safeContent}</div>
    </div>

    <div class="footer">
      <div class="signature-block">
        <div class="signature-caption">For NEW BALAJI TRANSPORT</div>
        <img class="signature-img" src="${nbtAuthorisedSignatureBase64}" alt="Authorised Signature" />
        <div class="signatory-text">Authorised Signatory</div>
      </div>
    </div>
  </div>
  ${
    editorMode
      ? `<script>
    const editor = document.getElementById('memoEditor');
    const dateField = document.getElementById('dateField');

    try { document.execCommand('defaultParagraphSeparator', false, 'div'); } catch(e) {}

    const sendState = () => {
      const html = editor.innerHTML;
      const memoDate = dateField.innerText.replace(/[\u200B]/g, '').trim() || '${safeDate}';
      const overflow = editor.scrollHeight > editor.clientHeight;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'contentChange', html, date: memoDate, overflow }));
    };

    const applyCommand = (command, value) => {
      document.execCommand('styleWithCSS', false, true);
      document.execCommand(command, false, value || null);
      editor.focus();
      sendState();
    };

    const handleMessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : JSON.parse(event.data.data);
        if (data.type === 'command') {
          applyCommand(data.command, data.value);
          return;
        }
        if (data.type === 'setData') {
          dateField.innerText = data.date || '${safeDate}';
          editor.innerHTML = data.html || '<div><br></div>';
          sendState();
        }
      } catch (error) {
        // ignore malformed messages
      }
    };

    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);
    editor.addEventListener('input', sendState);
    dateField.addEventListener('input', sendState);
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
  </script>`
      : ''
  }
</body>
</html>`;
};

const buildMemoHtml = (date: string, contentHtml: string) => buildMemoDocumentHtml(date, contentHtml, false);

const openWebMemoPrintPreview = async (html: string) => {
  if (!isWeb || typeof window === 'undefined') return false;
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    try {
      await Print.printAsync({ html });
    } catch (error) {
      console.warn('Memo print fallback failed', error);
      Alert.alert('Print failed', 'Unable to open memo preview.');
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
        console.warn('Memo print window failed', error);
      }
    }
  }, 100);
  return true;
};

const downloadWebMemoAsPdf = (html: string, filename: string) => {
  if (typeof window === 'undefined') return;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);

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

const MemoScreen = () => {
  const { width } = useWindowDimensions();
  const webViewRef = useRef<any>(null);
  const webEditorRef = useRef<any>(null);
  const webDateRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState<'EDITOR' | 'ARCHIVE'>('EDITOR');
  const [memoId, setMemoId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [contentHtml, setContentHtml] = useState('<div><br></div>');
  const [memoDocuments, setMemoDocuments] = useState<MemoDocument[]>([]);
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isWebReady, setIsWebReady] = useState(false);
  const [isWebTyping, setIsWebTyping] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // Delete modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingMemo, setDeletingMemo] = useState<MemoDocument | null>(null);
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
    onConfirm: () => void,
    type: 'danger' | 'success' | 'info' = 'danger',
    confirmText = 'Confirm',
    cancelText = 'Cancel'
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

  const isDesktop = width >= 880;
  const pageWidth = Math.min(Math.max(width - 24, 280), 760);
  const pageHeight = pageWidth / A4_RATIO;

  const loadMemoDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await db.getMemoDocuments();
      setMemoDocuments(docs);
    } catch (error) {
      console.warn('Failed to load memo documents', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMemoDocuments();
    createNewMemo();
  }, []);

  const generateMemoId = () => {
    const next = memoDocuments.length + 1;
    const candidate = `MEM-${String(next).padStart(4, '0')}`;
    if (memoDocuments.some((doc) => doc.memoId === candidate)) {
      return `MEM-${String(memoDocuments.length + 1).padStart(4, '0')}`;
    }
    return candidate;
  };

  const createNewMemo = () => {
    const nextId = generateMemoId();
    setSelectedMemoId(null);
    setMemoId(nextId);
    const freshDate = new Date().toISOString().split('T')[0];
    setDate(freshDate);
    setContentHtml('<div><br></div>');
    setIsOverflowing(false);
    setTimeout(() => {
      if (isWebReady) {
        sendMessageToEditor({ type: 'setData', date: freshDate, html: '<div><br></div>' });
      }
      if (isWeb && webEditorRef.current) {
        webEditorRef.current.innerHTML = '<div><br></div>';
      }
      if (isWeb && webDateRef.current) {
        webDateRef.current.innerText = freshDate;
      }
    }, 100);
  };

  const openMemoForEdit = async (memo: MemoDocument) => {
    setActiveTab('EDITOR');
    setSelectedMemoId(memo.memoId);
    setMemoId(memo.memoId);
    setDate(memo.date);
    setContentHtml(memo.contentHtml || '<div><br></div>');
    setIsOverflowing(false);
    setTimeout(() => {
      if (isWebReady) {
        sendMessageToEditor({ type: 'setData', date: memo.date, html: memo.contentHtml || '<div><br></div>' });
      }
      if (isWeb && webEditorRef.current) {
        webEditorRef.current.innerHTML = memo.contentHtml || '<div><br></div>';
      }
      if (isWeb && webDateRef.current) {
        webDateRef.current.innerText = memo.date;
      }
    }, 100);
  };

  const sendMessageToEditor = (payload: Record<string, any>) => {
    const json = JSON.stringify(payload);
    if (webViewRef.current) {
      webViewRef.current.postMessage(json);
    }
  };

  const handleEditorMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        setIsWebReady(true);
        sendMessageToEditor({ type: 'setData', date, html: contentHtml });
        return;
      }
      if (data.type === 'contentChange') {
        setContentHtml(data.html || '<div><br></div>');
        setDate(data.date || date);
        setIsOverflowing(Boolean(data.overflow));
      }
    } catch (error) {
      console.warn('Invalid editor message', error);
    }
  };

  const applyWebFontSize = (size: number) => {
    if (!isWeb || !webEditorRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!range) return;
    if (range.collapsed) {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('fontSize', false, '4');
      const editor = webEditorRef.current;
      const lastFont = editor.querySelector('font[size="4"]');
      if (lastFont) {
        lastFont.style.fontSize = `${size}px`;
        lastFont.removeAttribute('size');
      }
      setContentHtml(editor.innerHTML || '<div><br></div>');
      return;
    }
    const span = document.createElement('span');
    span.style.fontSize = `${size}px`;
    span.appendChild(range.extractContents());
    range.insertNode(span);
    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.setStartAfter(span);
    newRange.setEndAfter(span);
    selection.addRange(newRange);
    setContentHtml(webEditorRef.current.innerHTML || '<div><br></div>');
    webEditorRef.current.focus();
  };

  const executeEditorCommand = (command: string, value?: string) => {
    if (isWeb) {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand(command, false, value || undefined);
      webEditorRef.current?.focus();
      setContentHtml(webEditorRef.current?.innerHTML ?? '<div><br></div>');
      return;
    }
    sendMessageToEditor({ type: 'command', command, value });
  };

  const focusWebEditor = () => {
    if (isWeb && webEditorRef.current) {
      webEditorRef.current.focus();
    }
  };

  const handleWebEditorInput = (event: any) => {
    setContentHtml(event.currentTarget.innerHTML || '<div><br></div>');
  };

  const handleWebEditorFocus = () => setIsWebTyping(true);
  const handleWebEditorBlur = () => setIsWebTyping(false);

  const handleWebDateInput = (event: any) => {
    const value = event.currentTarget.innerText.replace(/[\u200B]/g, '').trim();
    setDate(value);
  };

  const handleWebDateFocus = () => setIsWebTyping(true);
  const handleWebDateBlur = () => setIsWebTyping(false);

  useEffect(() => {
    if (isWeb && webDateRef.current && !isWebTyping) {
      webDateRef.current.innerText = date || '';
    }
  }, [date, isWebTyping]);

  useEffect(() => {
    if (isWeb && webEditorRef.current && !isWebTyping) {
      webEditorRef.current.innerHTML = contentHtml || '<div><br></div>';
    }
  }, [contentHtml, isWebTyping]);

  const validateMemo = () => {
    if (!memoId.trim()) {
      Alert.alert('Missing Memo ID', 'Memo ID is required.');
      return false;
    }
    if (isOverflowing) {
      Alert.alert(
        'Memo too long',
        'Memo content exceeds the available A4 page space. Please shorten the memo before saving or printing.'
      );
      return false;
    }
    return true;
  };

  const persistMemo = async (memoDate?: string, memoHtml?: string) => {
    const saveDate = memoDate ?? date;
    const saveHtml = memoHtml ?? contentHtml;
    if (!validateMemo()) return null;
    setIsSaving(true);
    try {
      const currentUser = db.getUsername() || 'admin';
      const memo: MemoDocument = await db.saveMemoDocument({
        id: selectedMemoId || memoId,
        memoId: selectedMemoId || memoId,
        date: saveDate,
        contentHtml: saveHtml,
        createdBy: currentUser,
        status: 'SAVED',
      });
      await loadMemoDocuments();
      setSelectedMemoId(memo.memoId);
      setMemoId(memo.memoId);
      setDate(saveDate);
      setContentHtml(saveHtml);
      return memo;
    } catch (error) {
      console.warn('Failed to save memo', error);
      Alert.alert('Save failed', 'Unable to save memo. Please try again.');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const readWebMemoState = (currentDate: string, currentHtml: string) => {
    const dateValue = isWeb && webDateRef.current ? webDateRef.current.innerText.replace(/[\u200B]/g, '').trim() : currentDate;
    const htmlValue = isWeb && webEditorRef.current ? webEditorRef.current.innerHTML || '<div><br></div>' : currentHtml;
    return { dateValue: dateValue || currentDate, htmlValue };
  };

  const memoEditorSource = useMemo(
    () => ({ html: buildMemoDocumentHtml(date, contentHtml, true) }),
    [date, contentHtml]
  );

  const saveMemo = async () => {
    const memo = await persistMemo();
    if (!memo) return;
    Alert.alert('Memo saved', `Memo ${memo.memoId} saved successfully.`);
  };

  const downloadPdf = async () => {
    const { dateValue, htmlValue } = readWebMemoState(date, contentHtml);
    if (!validateMemo()) return;
    setIsSaving(true);
    try {
      const memo = await persistMemo(dateValue, htmlValue);
      if (!memo) return;
      const html = buildMemoHtml(dateValue, htmlValue);
      const filename = `${PAGE_FILENAME_PREFIX}_${memo.memoId}_${memo.date}.pdf`;
      if (isWeb) {
        downloadWebMemoAsPdf(html, filename);
        return;
      }
      const { uri } = await Print.printToFileAsync({ html });
      const dest = FileSystemCompat.cacheDirectory + filename;
      await FileSystemCompat.copyAsync({ from: uri, to: dest });
      await Sharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: filename });
    } catch (error) {
      console.warn('Failed to download memo PDF', error);
      Alert.alert('Download failed', 'Unable to create memo PDF.');
    } finally {
      setIsSaving(false);
    }
  };

  const printMemo = async () => {
    const { dateValue, htmlValue } = readWebMemoState(date, contentHtml);
    if (!validateMemo()) return;
    setIsSaving(true);
    try {
      const memo = await persistMemo(dateValue, htmlValue);
      if (!memo) return;
      const html = buildMemoHtml(dateValue, htmlValue);
      if (isWeb) {
        await openWebMemoPrintPreview(html);
        return;
      }
      await Print.printAsync({ html });
    } catch (error) {
      console.warn('Print failed', error);
      Alert.alert('Print failed', 'Unable to print memo.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMemo = (memo: MemoDocument) => {
    setDeletingMemo(memo);
    setDeleteModalVisible(true);
  };

  const confirmDeleteMemo = async () => {
    if (!deletingMemo) return;
    setIsDeleting(true);
    try {
      const success = await db.deleteMemoDocument(deletingMemo.memoId);
      if (success) {
        await loadMemoDocuments();
        if (selectedMemoId === deletingMemo.memoId) {
          createNewMemo();
        }
      }
    } catch (err) {
      console.error('Delete memo error:', err);
      Alert.alert('Error', 'Failed to delete memo.');
    } finally {
      setIsDeleting(false);
      setDeleteModalVisible(false);
      setDeletingMemo(null);
    }
  };

  const downloadExistingMemo = async (memo: MemoDocument) => {
    try {
      const html = buildMemoHtml(memo.date, memo.contentHtml);
      const filename = `${PAGE_FILENAME_PREFIX}_${memo.memoId}_${memo.date}`;
      if (isWeb) {
        downloadWebMemoAsPdf(html, filename);
        return;
      }
      const { uri } = await Print.printToFileAsync({ html });
      const dest = FileSystemCompat.cacheDirectory + `${filename}.pdf`;
      await FileSystemCompat.copyAsync({ from: uri, to: dest });
      await Sharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: `${filename}.pdf` });
    } catch (error) {
      console.warn('Download failed', error);
      Alert.alert('Download failed', 'Unable to generate memo PDF.');
    }
  };

  const printExistingMemo = async (memo: MemoDocument) => {
    try {
      const html = buildMemoHtml(memo.date, memo.contentHtml);
      const filename = `${PAGE_FILENAME_PREFIX}_${memo.memoId}_${memo.date}`;
      if (isWeb) {
        await openWebMemoPrintPreview(html);
        return;
      }
      await Print.printAsync({ html });
    } catch (error) {
      console.warn('Print failed', error);
      Alert.alert('Print failed', 'Unable to print memo PDF.');
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  const filteredMemos = useMemo(() => {
    let list = [...memoDocuments].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(m =>
      m.memoId.toLowerCase().includes(q) ||
      m.date.toLowerCase().includes(q) ||
      m.contentHtml.toLowerCase().includes(q) ||
      (m.createdBy && m.createdBy.toLowerCase().includes(q))
    );
  }, [memoDocuments, searchQuery]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Tabs */}
      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'EDITOR' && styles.tabButtonActive]}
          onPress={() => setActiveTab('EDITOR')}
        >
          <MaterialIcons name="edit-note" size={20} color={activeTab === 'EDITOR' ? '#ffffff' : '#cbd5e1'} />
          <Text style={[styles.tabButtonText, activeTab === 'EDITOR' && styles.tabButtonTextActive]}>
            {selectedMemoId ? 'EDIT MEMO' : 'CREATE MEMO'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'ARCHIVE' && styles.tabButtonActive]}
          onPress={() => setActiveTab('ARCHIVE')}
        >
          <MaterialIcons name="archive" size={20} color={activeTab === 'ARCHIVE' ? '#ffffff' : '#cbd5e1'} />
          <Text style={[styles.tabButtonText, activeTab === 'ARCHIVE' && styles.tabButtonTextActive]}>
            MEMO ARCHIVE ({memoDocuments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'EDITOR' ? (
        <ScrollView contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled">
          {/* Editing Status Banner */}
          {selectedMemoId && (
            <View style={[styles.editingBanner, { width: isDesktop ? pageWidth : '100%' }]}>
              <View style={styles.editingBannerLeft}>
                <MaterialIcons name="edit" size={20} color="#1e40af" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.editingBannerTitle}>Editing Saved Memo: {selectedMemoId}</Text>
                  <Text style={styles.editingBannerSub}>Modify content below and click UPDATE MEMO to save changes.</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.cancelEditBtn} onPress={createNewMemo}>
                <MaterialIcons name="close" size={16} color="#dc2626" />
                <Text style={styles.cancelEditBtnText}>New / Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Formatting Toolbar */}
          <View style={[styles.toolbarRow, { width: isDesktop ? pageWidth : '100%' }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarScroll}>
              <TouchableOpacity style={styles.toolbarButton} onPress={() => executeEditorCommand('bold')} title="Bold">
                <MaterialIcons name="format-bold" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarButton} onPress={() => executeEditorCommand('italic')} title="Italic">
                <MaterialIcons name="format-italic" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarButton} onPress={() => executeEditorCommand('underline')} title="Underline">
                <MaterialIcons name="format-underlined" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              <View style={styles.toolbarDivider} />
              <TouchableOpacity style={styles.toolbarButton} onPress={() => executeEditorCommand('justifyLeft')} title="Align Left">
                <MaterialIcons name="format-align-left" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarButton} onPress={() => executeEditorCommand('justifyCenter')} title="Align Center">
                <MaterialIcons name="format-align-center" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarButton} onPress={() => executeEditorCommand('justifyRight')} title="Align Right">
                <MaterialIcons name="format-align-right" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              <View style={styles.toolbarDivider} />
              <TouchableOpacity style={styles.toolbarButton} onPress={() => executeEditorCommand('insertUnorderedList')} title="Bullet List">
                <MaterialIcons name="format-list-bulleted" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarButton} onPress={() => executeEditorCommand('insertOrderedList')} title="Numbered List">
                <MaterialIcons name="format-list-numbered" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              <View style={styles.toolbarDivider} />
              <TouchableOpacity style={styles.toolbarButton} onPress={() => applyWebFontSize(13)}>
                <Text style={styles.toolbarLabel}>A-</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarButton} onPress={() => applyWebFontSize(16)}>
                <Text style={styles.toolbarLabel}>A</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarButton} onPress={() => applyWebFontSize(20)}>
                <Text style={styles.toolbarLabel}>A+</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Memo Page Paper Preview */}
          <View style={[styles.pageWrapper, { width: isDesktop ? pageWidth : '100%', minHeight: isDesktop ? pageHeight : undefined }]}> 
            {isWeb ? (
              <View
                style={styles.memoPage}
                onStartShouldSetResponder={() => true}
                onResponderGrant={focusWebEditor as any}
              > 
                <View style={[styles.headerTop, !isDesktop && { flexDirection: 'column', alignItems: 'center', gap: 10, paddingBottom: 10 }]}>
                  <View style={styles.logoArea}>
                    <View style={styles.logoCircle}>
                      <Text style={styles.logoMark}>NBT</Text>
                      <Text style={styles.logoText}>NEW BALAJI TRANSPORT</Text>
                    </View>
                  </View>
                  <View style={styles.headerCenter}>
                    <Text style={styles.signedBy}>Sri Ramajayam</Text>
                    <Text style={[styles.companyName, !isDesktop && { fontSize: 20, letterSpacing: 1 }]}>NEW BALAJI TRANSPORT</Text>
                    <Text style={styles.companySubtitle}>(LORRY SUPPLIERS & COMMISSION AGENT)</Text>
                    <Text style={styles.address}>
                      3/131, V.K.V. Complex, 1st Floor, Bangalore Bye Pass Road,{'\n'}
                      Kandampatty (Po.), Salem - 636 005. (TN)
                    </Text>
                  </View>
                  <View style={[styles.contactRight, !isDesktop && { minWidth: '100%', alignItems: 'center', gap: 4 }]}>
                    <View style={styles.contactBlock}>
                      <View style={[styles.contactText, !isDesktop && { alignItems: 'center' }]}>
                        <Text style={styles.contactLabel}>Cell : <Text style={styles.contactValue}>94433 51789, 93622 51789</Text></Text>
                      </View>
                    </View>
                    <View style={styles.contactBlock}>
                      <View style={[styles.contactText, !isDesktop && { alignItems: 'center' }]}>
                        <Text style={styles.contactLabel}>Offi. : <Text style={styles.contactValue}>0427-2225575, 2225576</Text></Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <View style={styles.memoBadge}><Text style={styles.memoBadgeText}>MEMO</Text></View>
                </View>
                <View style={styles.body} onPointerDown={focusWebEditor as any}>
                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Date :</Text>
                    {isWeb ? (
                      <div
                        ref={webDateRef as any}
                        style={{ ...styles.dateValue as any, outline: 'none' }}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={handleWebDateInput as any}
                        onFocus={handleWebDateFocus as any}
                        onBlur={handleWebDateBlur as any}
                      >
                        {date}
                      </div>
                    ) : (
                      <View ref={webDateRef as any} style={styles.dateValue as any}>
                        <Text style={styles.dateText}>{date}</Text>
                      </View>
                    )}
                  </View>
                  {isWeb ? (
                    <>
                      <style>{`
                        .editable-area,
                        .editable-area *,
                        .memo-content,
                        .memo-content * {
                          margin: 0 !important;
                          margin-top: 0 !important;
                          margin-bottom: 0 !important;
                          margin-block-start: 0 !important;
                          margin-block-end: 0 !important;
                          margin-inline-start: 0 !important;
                          margin-inline-end: 0 !important;
                          padding: 0 !important;
                          padding-top: 0 !important;
                          padding-bottom: 0 !important;
                          line-height: 1.5 !important;
                          box-sizing: border-box !important;
                        }
                        .editable-area p,
                        .editable-area div,
                        .editable-area span,
                        .editable-area blockquote,
                        .editable-area ul,
                        .editable-area ol,
                        .editable-area li,
                        .memo-content p,
                        .memo-content div,
                        .memo-content span,
                        .memo-content blockquote,
                        .memo-content ul,
                        .memo-content ol,
                        .memo-content li {
                          margin: 0 !important;
                          margin-top: 0 !important;
                          margin-bottom: 0 !important;
                          margin-block-start: 0 !important;
                          margin-block-end: 0 !important;
                          padding: 0 !important;
                          line-height: 1.5 !important;
                        }
                        .editable-area:empty::before {
                          content: 'Type memo content here...';
                          color: #94a3b8;
                        }
                      `}</style>
                      <div
                        ref={webEditorRef as any}
                        className="editable-area memo-content"
                        style={{
                          ...styles.editableArea as any,
                          outline: 'none',
                          display: 'block',
                          width: '100%',
                          cursor: 'text',
                          flex: 1,
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                        }}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={handleWebEditorInput as any}
                        onFocus={(e: any) => {
                          try { document.execCommand('defaultParagraphSeparator', false, 'div'); } catch(err) {}
                          handleWebEditorFocus();
                        }}
                        onBlur={handleWebEditorBlur as any}
                        tabIndex={0}
                      />
                    </>
                  ) : (
                    <View ref={webEditorRef as any} style={styles.editableArea as any}>
                      <Text style={styles.memoText}>{''}</Text>
                    </View>
                  )}
                  <View style={styles.footer}>
                    <View style={styles.signatureBlock}>
                      <Text style={styles.signatureCaption}>For NEW BALAJI TRANSPORT</Text>
                      <Image source={{ uri: nbtAuthorisedSignatureBase64 }} style={styles.signatureImgWeb} resizeMode="contain" />
                      <Text style={styles.signatureText}>Authorised Signatory</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <AnyWebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={memoEditorSource}
                style={styles.webView}
                onMessage={handleEditorMessage}
                javaScriptEnabled
                domStorageEnabled
                scalesPageToFit
                startInLoadingState
              />
            )}
            {isOverflowing && (
              <View style={styles.overflowWarning}>
                <Text style={styles.overflowText}>Memo content exceeds available A4 page space. Please shorten content.</Text>
              </View>
            )}
          </View>

          {/* Action Bar matching GC Note Style */}
          <View style={[styles.formBottomBar, { width: isDesktop ? pageWidth : '100%' }, !isDesktop && { flexDirection: 'column', gap: 10, height: 'auto', marginBottom: 32 }]}>
            <TouchableOpacity
              style={[styles.actionBtnLarge, selectedMemoId ? styles.updateBtnStyle : styles.saveBtnStyle, isSaving && { opacity: 0.6 }]}
              onPress={saveMemo}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <MaterialIcons name={selectedMemoId ? "check-circle" : "save"} size={18} color="#ffffff" />
                  <Text style={styles.actionBtnLargeText}>{selectedMemoId ? "UPDATE MEMO" : "SAVE MEMO"}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtnLarge, styles.downloadBtnStyle]}
              onPress={downloadPdf}
              disabled={isSaving}
            >
              <MaterialIcons name="file-download" size={18} color="#ffffff" />
              <Text style={styles.actionBtnLargeText}>DOWNLOAD PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtnLarge, styles.printBtnStyle]}
              onPress={printMemo}
              disabled={isSaving}
            >
              <MaterialIcons name="print" size={18} color="#ffffff" />
              <Text style={styles.actionBtnLargeText}>PRINT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtnLarge, styles.newBtnStyle]}
              onPress={createNewMemo}
              disabled={isSaving}
            >
              <MaterialIcons name="add" size={18} color={COLORS.primary} />
              <Text style={[styles.actionBtnLargeText, { color: COLORS.primary }]}>NEW MEMO</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        /* ARCHIVE TAB */
        <View style={{ flex: 1 }}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <MaterialIcons name="search" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search memos by ID, date, content..."
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialIcons name="close" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.archiveContent}>
            {isLoading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={filteredMemos}
                keyExtractor={(item) => item.memoId}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={styles.memoCard}>
                    <View style={[styles.memoCardRow, !isDesktop && { flexDirection: 'column', gap: 10 }]}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Text style={styles.memoCardId}>{item.memoId}</Text>
                          {item.isPinned && (
                            <View style={styles.pinnedBadge}>
                              <Text style={styles.pinnedBadgeText}>📌 PINNED</Text>
                            </View>
                          )}
                          <Text style={styles.memoCardDate}>{item.date}</Text>
                        </View>
                        <Text style={styles.memoCardMeta}>
                          Created by: <Text style={{ fontWeight: '600', color: COLORS.textDark }}>{item.createdBy || 'Admin'}</Text>
                          {item.updatedAt ? `  •  Updated: ${new Date(item.updatedAt).toLocaleDateString()}` : ''}
                        </Text>
                      </View>

                      {/* Action buttons */}
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.cardActionBtn}
                          onPress={async () => { await db.togglePinMemo(item.id); loadMemoDocuments(); }}
                        >
                          <MaterialIcons name="push-pin" size={16} color={item.isPinned ? '#d97706' : COLORS.textMuted} />
                          <Text style={[styles.cardActionBtnText, { color: item.isPinned ? '#d97706' : COLORS.textMuted }]}>
                            {item.isPinned ? 'UNPIN' : 'PIN'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.cardActionBtn, { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }]}
                          onPress={() => openMemoForEdit(item)}
                        >
                          <MaterialIcons name="edit" size={16} color="#2563eb" />
                          <Text style={[styles.cardActionBtnText, { color: '#2563eb' }]}>EDIT</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.cardActionBtn}
                          onPress={() => downloadExistingMemo(item)}
                        >
                          <MaterialIcons name="file-download" size={16} color="#0e7490" />
                          <Text style={[styles.cardActionBtnText, { color: '#0e7490' }]}>PDF</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.cardActionBtn}
                          onPress={() => printExistingMemo(item)}
                        >
                          <MaterialIcons name="print" size={16} color={COLORS.secondary} />
                          <Text style={[styles.cardActionBtnText, { color: COLORS.secondary }]}>PRINT</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.cardActionBtn}
                          onPress={() => deleteMemo(item)}
                        >
                          <MaterialIcons name="delete-outline" size={16} color="#ef4444" />
                          <Text style={[styles.cardActionBtnText, { color: '#ef4444' }]}>DELETE</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={styles.memoCardPreview} numberOfLines={2}>
                      {formatMemoPreview(item.contentHtml) || 'No text content.'}
                    </Text>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <MaterialIcons name="description" size={48} color="#cbd5e1" />
                    <Text style={styles.emptyText}>
                      {searchQuery ? 'No memos match your search.' : 'No saved memos yet. Create one in the editor!'}
                    </Text>
                  </View>
                }
              />
            )}
          </ScrollView>
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
        title="Delete Lorry Memo"
        message="Are you sure you want to permanently delete this memo? This action cannot be undone."
        itemLabel={deletingMemo ? `Memo ID: ${deletingMemo.memoId} (${deletingMemo.date})` : undefined}
        isDeleting={isDeleting}
        onConfirm={confirmDeleteMemo}
        onCancel={() => {
          setDeleteModalVisible(false);
          setDeletingMemo(null);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: 6,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: '#0f172a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  tabButtonText: {
    color: '#94a3b8',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
  editorContent: { alignItems: 'center', padding: SPACING.gutter, paddingBottom: 60 },
  archiveContent: { padding: SPACING.gutter, paddingBottom: 60 },
  searchContainer: {
    paddingHorizontal: SPACING.gutter,
    paddingTop: SPACING.gutter,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.outline,
    ...SHADOWS.light,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textDark,
    padding: 0,
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
    marginBottom: 12,
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
  toolbarRow: { marginBottom: 12 },
  toolbarScroll: { alignItems: 'center', gap: 6, paddingVertical: 2 },
  toolbarButton: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.outline },
  toolbarDivider: { width: 1, height: 24, backgroundColor: '#cbd5e1', marginHorizontal: 4 },
  toolbarLabel: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  pageWrapper: { backgroundColor: 'transparent', borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },
  memoPage: { flex: 1, width: '100%', backgroundColor: '#ffffff', borderRadius: 8, padding: 18, borderWidth: 2.5, borderColor: '#0f172a', overflow: 'hidden' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingBottom: 10 },
  logoArea: { width: 86, minWidth: 86, alignItems: 'center', justifyContent: 'center' },
  logoCircle: { width: 82, height: 82, borderWidth: 2.5, borderColor: '#0f172a', borderRadius: 41, alignItems: 'center', justifyContent: 'center', padding: 4 },
  logoMark: { fontSize: 24, fontWeight: '900', letterSpacing: 1, color: '#0f172a' },
  logoText: { fontSize: 6.5, lineHeight: 8, fontWeight: '800', letterSpacing: 0.5, marginTop: 2, textAlign: 'center', color: '#0f172a' },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  signedBy: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2, color: '#0f172a' },
  companyName: { fontSize: 24, fontWeight: '900', letterSpacing: 1.5, lineHeight: 28, textAlign: 'center', color: '#0f172a' },
  companySubtitle: { fontSize: 11, fontWeight: '700', marginTop: 2, textAlign: 'center', color: '#334155' },
  address: { fontSize: 10, lineHeight: 14, marginTop: 4, color: '#334155', textAlign: 'center', fontWeight: '500' },
  contactRight: { minWidth: 140, alignItems: 'flex-end', gap: 4, borderWidth: 1.5, borderColor: '#0f172a', borderRadius: 6, padding: 6 },
  contactBlock: { flexDirection: 'row', alignItems: 'center' },
  contactText: { alignItems: 'flex-end' },
  contactLabel: { fontWeight: '700', color: '#475569', fontSize: 10 },
  contactValue: { fontSize: 10.5, fontWeight: '800', color: '#0f172a' },
  dividerRow: { position: 'relative', marginVertical: 8, alignItems: 'center', justifyContent: 'center' },
  dividerLine: { position: 'absolute', left: 0, right: 0, top: '50%', borderTopWidth: 2, borderTopColor: '#0f172a' },
  memoBadge: { backgroundColor: '#0f172a', borderRadius: 4, paddingHorizontal: 18, paddingVertical: 3 },
  memoBadgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, color: '#ffffff' },
  body: { marginTop: 10, flex: 1, overflow: 'hidden' },
  dateRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: 12 },
  dateLabel: { fontWeight: '800', color: '#0f172a', fontSize: 11.5 },
  dateValue: { minWidth: 140, borderBottomWidth: 1.5, borderBottomColor: '#0f172a', paddingBottom: 2, color: '#0f172a', fontSize: 11.5, fontWeight: '700', textAlign: 'center' },
  dateText: { color: '#0f172a', fontSize: 11.5, fontWeight: '700' },
  editableArea: { flex: 1, fontSize: 13, lineHeight: 20, color: '#0f172a', padding: 4, backgroundColor: 'transparent', minHeight: 280 },
  memoText: { fontSize: 13, lineHeight: 20, color: '#0f172a' },
  footer: { width: '100%', flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, paddingBottom: 4 },
  signatureBlock: { alignItems: 'center', width: 170, borderWidth: 1, borderColor: '#0f172a', borderRadius: 4, padding: 6, backgroundColor: '#f8fafc' },
  signatureCaption: { fontSize: 9.5, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  signatureImgWeb: { width: 120, height: 40, marginVertical: 2 },
  signatureText: { fontSize: 9, fontWeight: '700', color: '#475569', marginTop: 2 },
  webView: { flex: 1, width: '100%' },
  formBottomBar: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnLarge: {
    flex: 1,
    height: 46,
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
  newBtnStyle: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  actionBtnLargeText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  overflowWarning: { position: 'absolute', bottom: 12, left: 12, right: 12, backgroundColor: '#fef3c7', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#fde68a' },
  overflowText: { color: '#92400e', fontSize: 12, textAlign: 'center' },
  memoCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.outline, ...SHADOWS.light },
  memoCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  memoCardId: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  memoCardDate: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  pinnedBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#f59e0b' },
  pinnedBadgeText: { fontSize: 9, color: '#b45309', fontWeight: 'bold' },
  memoCardMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.outline,
    backgroundColor: COLORS.surface,
  },
  cardActionBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  memoCardPreview: { marginTop: 10, fontSize: 12, color: '#475569', lineHeight: 18, backgroundColor: '#f8fafc', padding: 8, borderRadius: 6 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 48, gap: 12 },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, fontSize: 13 },
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

export default MemoScreen;
