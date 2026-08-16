/**
 * OCR Service for Vehicle Document Processing
 * 
 * This service handles:
 * - Document text extraction via OCR (using Tesseract.js)
 * - Document type detection
 * - Expiry date extraction
 * - Information validation
 */

import Tesseract from 'tesseract.js';

export interface OCRExtractionResult {
  rawText: string;
  documentType: DetectedDocumentType;
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
    certificateNumber?: string;
  };
  warnings: string[];
  errors: string[];
}

export type DetectedDocumentType = 'INSURANCE' | 'POLLUTION' | 'PERMIT' | 'FC' | 'RC' | 'RC_FRONT' | 'RC_BACK' | 'UNKNOWN';

/**
 * Analyze OCR text to detect document type
 */
export function detectDocumentType(text: string): { type: DetectedDocumentType; confidence: number } {
  const normalizedText = text.toUpperCase();
  
  // INSURANCE detection
  const insuranceKeywords = ['INSURANCE', 'POLICY', 'INSURER', 'INSURANCE COMPANY', 'POLICY PERIOD', 'VALID FROM', 'VALID TO', 'INSURED'];
  const insuranceMatches = insuranceKeywords.filter(kw => normalizedText.includes(kw)).length;
  
  // POLLUTION / PUC detection
  const pollutionKeywords = ['POLLUTION', 'PUC', 'POLLUTION UNDER CONTROL', 'CERTIFICATE', 'VALID TILL', 'VALIDITY', 'TEST RESULT'];
  const pollutionMatches = pollutionKeywords.filter(kw => normalizedText.includes(kw)).length;
  
  // PERMIT detection
  const permitKeywords = ['PERMIT', 'PERMIT NUMBER', 'PERMIT VALIDITY', 'TRANSPORT PERMIT'];
  const permitMatches = permitKeywords.filter(kw => normalizedText.includes(kw)).length;
  
  // FITNESS / FC detection
  const fcKeywords = ['FITNESS', 'FITNESS CERTIFICATE', 'FC', 'CERTIFICATE OF FITNESS'];
  const fcMatches = fcKeywords.filter(kw => normalizedText.includes(kw)).length;
  
  // RC detection
  const rcKeywords = ['REGISTRATION CERTIFICATE', 'REGISTRATION NUMBER', 'REGISTRATION NO', 'CHASSIS NUMBER', 'ENGINE NUMBER', 'OWNER NAME'];
  const rcMatches = rcKeywords.filter(kw => normalizedText.includes(kw)).length;

  const scores = [
    { type: 'INSURANCE' as DetectedDocumentType, score: insuranceMatches },
    { type: 'POLLUTION' as DetectedDocumentType, score: pollutionMatches },
    { type: 'PERMIT' as DetectedDocumentType, score: permitMatches },
    { type: 'FC' as DetectedDocumentType, score: fcMatches },
    { type: 'RC' as DetectedDocumentType, score: rcMatches },
  ];

  scores.sort((a, b) => b.score - a.score);
  
  if (scores[0].score === 0) {
    return { type: 'UNKNOWN', confidence: 0 };
  }

  const maxScore = scores[0].score;
  const confidence = maxScore / 5; // Normalize to 0-1
  
  return { type: scores[0].type, confidence: Math.min(confidence, 1) };
}

/**
 * Detect and parse dates from text
 */
export function extractDates(text: string): string[] {
  const datePatterns = [
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g,           // DD/MM/YYYY or DD-MM-YYYY
    /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/g,           // YYYY/MM/DD
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})(?!\d)/g,     // DD/MM/YY
  ];

  const dates: string[] = [];
  
  for (const pattern of datePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (pattern.source.includes('YYYY')) {
        dates.push(`${match[1]}-${match[2]}-${match[3]}`);
      } else if (pattern.source.includes('\\d{4}')) {
        dates.push(`${match[1]}-${match[2]}-${match[3]}`);
      } else {
        const year = parseInt(match[3]);
        const fullYear = year > 50 ? 1900 + year : 2000 + year;
        dates.push(`${match[1]}-${match[2]}-${fullYear}`);
      }
    }
  }

  return [...new Set(dates)]; // Remove duplicates
}

/**
 * Extract expiry date from OCR text based on context
 */
export function extractExpiryDate(text: string): string | null {
  const normalizedText = text.toUpperCase();
  
  // Look for "Valid Till", "Expiry", "Valid To", "Validity" patterns
  const expiryPatterns = [
    /VALID\s+T(?:IL|O)[:\s]+(\d{1,2}[\/\-\.]?\d{1,2}[\/\-\.]?\d{2,4})/i,
    /EXPIR[YE]*\s*(?:DATE)?[:\s]+(\d{1,2}[\/\-\.]?\d{1,2}[\/\-\.]?\d{2,4})/i,
    /VALIDITY[:\s]+(?:[A-Z0-9\s]+)?(\d{1,2}[\/\-\.]?\d{1,2}[\/\-\.]?\d{2,4})/i,
    /VALID\s+(?:FROM|UPTO)[:\s]+[\d\-\/.]+\s*(?:TO|TILL)[:\s]+(\d{1,2}[\/\-\.]?\d{1,2}[\/\-\.]?\d{2,4})/i,
  ];

  for (const pattern of expiryPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return normalizeDateString(match[1]);
    }
  }

  return null;
}

/**
 * Normalize date string to YYYY-MM-DD format
 */
export function normalizeDateString(dateStr: string): string | null {
  const cleaned = dateStr.replace(/[^\d]/g, '');
  
  if (cleaned.length === 8) {
    // Could be DDMMYYYY or YYYYMMDD
    // Try DD/MM/YYYY first
    const day = parseInt(cleaned.substring(0, 2));
    const month = parseInt(cleaned.substring(2, 4));
    const year = parseInt(cleaned.substring(4, 8));
    
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  
  if (cleaned.length === 6) {
    // DD/MM/YY
    const day = parseInt(cleaned.substring(0, 2));
    const month = parseInt(cleaned.substring(2, 4));
    const year = parseInt(cleaned.substring(4, 6));
    
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const fullYear = year > 50 ? 1900 + year : 2000 + year;
      return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Extract vehicle number from OCR text
 */
export function extractVehicleNumber(text: string): string | null {
  // Indian vehicle number format: TN09AB1234
  const vehiclePattern = /([A-Z]{2})\s?(\d{1,2}[A-Z]{0,2})\s?([A-Z]{1,2})\s?(\d{4})/i;
  const match = text.match(vehiclePattern);
  
  if (match) {
    return `${match[1]}${match[2]}${match[3]}${match[4]}`.toUpperCase();
  }

  return null;
}

/**
 * Check if extracted vehicle number matches expected vehicle number
 */
export function checkVehicleNumberMatch(extractedNumber: string | null, expectedNumber: string | null): { match: boolean; extracted: string | null; expected: string | null } {
  if (!extractedNumber || !expectedNumber) {
    return { match: false, extracted: extractedNumber, expected: expectedNumber };
  }

  const normalizeVehicleNumber = (num: string) => num.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  return {
    match: normalizeVehicleNumber(extractedNumber) === normalizeVehicleNumber(expectedNumber),
    extracted: extractedNumber,
    expected: expectedNumber,
  };
}

/**
 * Process document with OCR using Tesseract.js
 * Extracts text from base64-encoded image and analyzes document content
 */
export async function processDocumentOCR(
  imageBase64OrUrl: string,
  expectedDocType: string,
  expectedVehicleNumber?: string
): Promise<OCRExtractionResult> {
  try {
    // Convert image to format Tesseract can process
    let imageSource: string;
    
    if (imageBase64OrUrl.startsWith('data:image/')) {
      // Already base64 encoded with data URL prefix
      imageSource = imageBase64OrUrl;
    } else if (imageBase64OrUrl.startsWith('http://') || imageBase64OrUrl.startsWith('https://')) {
      // URL - use as-is
      imageSource = imageBase64OrUrl;
    } else if (/^[A-Za-z0-9+/=]+$/.test(imageBase64OrUrl) && imageBase64OrUrl.length > 100) {
      // Looks like base64 without data: prefix
      imageSource = `data:image/jpeg;base64,${imageBase64OrUrl}`;
    } else {
      // Try as-is (could be URL or other format)
      imageSource = imageBase64OrUrl;
    }

    console.log('OCR Processing image:', imageSource.substring(0, 50) + '...');

    // Perform OCR using Tesseract.js
    const { data: { text } } = await Tesseract.recognize(imageSource, 'eng', {
      logger: m => console.log('OCR Progress:', Math.round(m.progress * 100) + '%'),
    });

    // Cleanup: terminate Tesseract worker when done
    await Tesseract.terminate();

    const rawText = text.trim();
    
    console.log('OCR Extracted text:', rawText.substring(0, 200));

    if (!rawText) {
      return {
        rawText: '',
        documentType: 'UNKNOWN',
        detectedDocumentTypeConfidence: 0,
        mismatchDetected: false,
        expectedType: expectedDocType,
        extractedData: {},
        warnings: ['Could not extract any text from document image'],
        errors: [],
      };
    }

    // Analyze extracted text
    const documentType = detectDocumentType(rawText);
    const dates = extractDates(rawText);
    const expiryDate = extractExpiryDate(rawText);
    const vehicleNumber = extractVehicleNumber(rawText);
    const vehicleMatch = checkVehicleNumberMatch(vehicleNumber, expectedVehicleNumber);

    const mismatch = documentType.type !== 'UNKNOWN' && 
                     expectedDocType && 
                     !expectedDocType.includes(documentType.type);

    const warnings: string[] = [];
    if (mismatch) {
      warnings.push(`Document type mismatch: Expected ${expectedDocType}, detected ${documentType.type}`);
    }
    if (!vehicleMatch.match && expectedVehicleNumber) {
      warnings.push(`Vehicle number mismatch: Extracted ${vehicleNumber || 'none'}, expected ${expectedVehicleNumber}`);
    }
    if (!expiryDate && ['INSURANCE', 'POLLUTION', 'PERMIT', 'FC'].includes(expectedDocType)) {
      warnings.push('Could not detect expiry date from document - please enter manually');
    }

    console.log('OCR Result:', { documentType: documentType.type, expiryDate, vehicleNumber });

    return {
      rawText,
      documentType: documentType.type,
      detectedDocumentTypeConfidence: documentType.confidence,
      mismatchDetected: mismatch,
      expectedType: expectedDocType,
      extractedData: {
        vehicleNumber: vehicleNumber || undefined,
        expiryDate: expiryDate || undefined,
      },
      warnings,
      errors: [],
    };
  } catch (error: any) {
    console.error('OCR processing error:', error);
    return {
      rawText: '',
      documentType: 'UNKNOWN',
      detectedDocumentTypeConfidence: 0,
      mismatchDetected: false,
      expectedType: expectedDocType,
      extractedData: {},
      warnings: ['OCR processing failed - please try again or enter details manually'],
      errors: [error?.message || 'OCR processing failed'],
    };
  }
}
