/**
 * Vehicle Document Processing Routes
 * 
 * Handles:
 * - Document OCR processing
 * - Expiry date management
 * - Reminder generation
 * - WhatsApp notifications
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sql } from '../db/client';
import {
  processDocumentOCR,
  detectDocumentType,
  extractExpiryDate,
  extractVehicleNumber,
  checkVehicleNumberMatch,
  OCRExtractionResult,
} from '../services/ocrService';

export async function vehicleDocumentRoutes(app: FastifyInstance) {
  const adminHook = { preHandler: [app.authenticate, app.requireAdmin] };

  /**
   * POST /api/vehicles/process-document
   * Process a vehicle document with OCR
   * 
   * Body:
   * {
   *   imageBase64: string,
   *   imageUrl: string,
   *   docType: string,           // Expected document type (INSURANCE, POLLUTION, etc.)
   *   vehicleNumber?: string,    // Optional vehicle number to verify
   * }
   */
  app.post<{ Body: { imageBase64?: string; imageUrl?: string; docType: string; vehicleNumber?: string } }>(
    '/process-document',
    adminHook,
    async (req: FastifyRequest<{ Body: { imageBase64?: string; imageUrl?: string; docType: string; vehicleNumber?: string } }>, reply: FastifyReply) => {
      try {
        const { imageBase64, imageUrl, docType, vehicleNumber } = req.body;

        if (!imageBase64 && !imageUrl) {
          return reply.code(400).send({ error: 'Image data required (imageBase64 or imageUrl)' });
        }

        const imageData = imageBase64 || imageUrl || '';

        // Process document with OCR
        const ocrResult: OCRExtractionResult = await processDocumentOCR(imageData, docType, vehicleNumber);

        return reply.code(200).send({
          success: true,
          ocrResult,
          recommendations: generateRecommendations(ocrResult),
        });
      } catch (error: any) {
        app.log.error('Document processing error:', error);
        return reply.code(500).send({
          error: 'Document processing failed',
          message: error?.message || 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /api/vehicles/:vehicleId/documents/:docId/set-expiry
   * Set or update document expiry date
   * 
   * Body:
   * {
   *   expiryDate: string,    // YYYY-MM-DD format
   *   notes?: string
   * }
   */
  app.post<{ Params: { vehicleId: string; docId: string }; Body: { expiryDate: string; notes?: string } }>(
    '/vehicles/:vehicleId/documents/:docId/set-expiry',
    adminHook,
    async (req: FastifyRequest<{ Params: { vehicleId: string; docId: string }; Body: { expiryDate: string; notes?: string } }>, reply: FastifyReply) => {
      try {
        const { vehicleId, docId } = req.params as { vehicleId: string; docId: string };
        const { expiryDate, notes } = req.body;

        if (!expiryDate || !isValidDate(expiryDate)) {
          return reply.code(400).send({ error: 'Invalid expiry date format (use YYYY-MM-DD)' });
        }

        // Update document expiry date
        // This would be done in the admin app's database layer
        // Here we just validate and calculate reminder date

        const reminderDate = calculateReminderDate(expiryDate, 15);
        const status = getExpiryStatus(expiryDate);

        return reply.code(200).send({
          success: true,
          expiryDate,
          reminderDate,
          status,
          daysRemaining: calculateDaysRemaining(expiryDate),
        });
      } catch (error: any) {
        app.log.error('Expiry update error:', error);
        return reply.code(500).send({
          error: 'Failed to update expiry date',
          message: error?.message,
        });
      }
    }
  );

  /**
   * GET /api/vehicles/expiry-alerts
   * Get all documents approaching or past expiry
   * 
   * Query params:
   * - daysThreshold: number (default 15)
   */
  app.get<{ Querystring: { daysThreshold?: string } }>(
    '/expiry-alerts',
    adminHook,
    async (req: FastifyRequest<{ Querystring: { daysThreshold?: string } }>, reply: FastifyReply) => {
      try {
        const daysThreshold = parseInt((req.query as { daysThreshold?: string }).daysThreshold || '15') || 15;

        // Fetch vehicles and their documents with expiry dates from the admin database
        // This is a placeholder - actual implementation would query the admin's vehicle/document data

        return reply.code(200).send({
          success: true,
          alerts: [],
          generatedAt: new Date().toISOString(),
        });
      } catch (error: any) {
        app.log.error('Expiry alerts error:', error);
        return reply.code(500).send({
          error: 'Failed to fetch expiry alerts',
          message: error?.message,
        });
      }
    }
  );

  /**
   * POST /api/vehicles/:vehicleId/documents/:docId/send-whatsapp
   * Send WhatsApp reminder for document expiry
   * 
   * Body:
   * {
   *   phoneNumber: string,   // WhatsApp recipient
   *   message?: string       // Custom message (optional)
   * }
   */
  app.post<{ Params: { vehicleId: string; docId: string }; Body: { phoneNumber: string; message?: string } }>(
    '/vehicles/:vehicleId/documents/:docId/send-whatsapp',
    adminHook,
    async (req: FastifyRequest<{ Params: { vehicleId: string; docId: string }; Body: { phoneNumber: string; message?: string } }>, reply: FastifyReply) => {
      try {
        const { vehicleId, docId } = req.params as { vehicleId: string; docId: string };
        const { phoneNumber, message } = req.body;

        if (!phoneNumber) {
          return reply.code(400).send({ error: 'Phone number required' });
        }

        // Send WhatsApp message
        const result = await sendWhatsAppReminder(phoneNumber, message);

        return reply.code(200).send({
          success: result.success,
          messageId: result.messageId,
          status: result.status,
          sentAt: new Date().toISOString(),
        });
      } catch (error: any) {
        app.log.error('WhatsApp send error:', error);
        return reply.code(500).send({
          error: 'Failed to send WhatsApp reminder',
          message: error?.message,
        });
      }
    }
  );
}

/**
 * Helper: Validate date format
 */
function isValidDate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Helper: Calculate 15-day reminder date
 */
function calculateReminderDate(expiryDate: string, daysBeforeExpiry: number): string {
  const date = new Date(expiryDate);
  date.setDate(date.getDate() - daysBeforeExpiry);
  return date.toISOString().split('T')[0];
}

/**
 * Helper: Calculate days remaining
 */
function calculateDaysRemaining(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Helper: Get expiry status
 */
function getExpiryStatus(expiryDate: string): 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'EXPIRES_TODAY' {
  const daysRemaining = calculateDaysRemaining(expiryDate);

  if (daysRemaining < 0) return 'EXPIRED';
  if (daysRemaining === 0) return 'EXPIRES_TODAY';
  if (daysRemaining <= 15) return 'EXPIRING_SOON';

  return 'VALID';
}

/**
 * Helper: Generate recommendations based on OCR result
 */
function generateRecommendations(result: OCRExtractionResult): string[] {
  const recommendations: string[] = [];

  if (result.mismatchDetected) {
    recommendations.push(
      `⚠️ Document Type Mismatch: Expected ${result.expectedType}, but detected ${result.documentType}. Please verify the uploaded document.`
    );
  }

  if (result.warnings.length > 0) {
    recommendations.push(...result.warnings);
  }

  if (!result.extractedData.expiryDate) {
    recommendations.push('⚠️ Expiry date could not be automatically detected. Please enter it manually.');
  }

  if (!result.extractedData.vehicleNumber) {
    recommendations.push('ℹ️ Vehicle number could not be extracted. Please verify manually if required.');
  }

  return recommendations;
}

/**
 * Helper: Send WhatsApp reminder
 * 
 * Note: This is a placeholder implementation.
 * In production, integrate with:
 * - Twilio WhatsApp Business API
 * - MessageBird
 * - Vonage
 * - Or custom WhatsApp Business solution
 */
async function sendWhatsAppReminder(
  phoneNumber: string,
  message?: string
): Promise<{ success: boolean; messageId?: string; status: string }> {
  try {
    // Check if WhatsApp API is configured
    const whatsappApiKey = process.env.WHATSAPP_API_KEY;
    const whatsappApiUrl = process.env.WHATSAPP_API_URL;

    if (!whatsappApiKey || !whatsappApiUrl) {
      return {
        success: false,
        status: 'PENDING',
        // messageId: `PENDING_${Date.now()}`,
      };
    }

    // Send via WhatsApp API (example using fetch)
    const response = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        message: message || 'Vehicle document expiry reminder',
      }),
    });

    if (response.ok) {
      const data = await response.json() as any;
      return {
        success: true,
        messageId: data.messageId || `MSG_${Date.now()}`,
        status: 'SENT',
      };
    }

    return {
      success: false,
      status: 'FAILED',
    };
  } catch (error: any) {
    console.error('WhatsApp API error:', error);
    return {
      success: false,
      status: 'ERROR',
    };
  }
}
