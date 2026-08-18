"use server";

import { headers } from "next/headers";
import { quoteFormSchema, contactFormSchema } from "@/types/forms";
import { Resend } from "resend";

// Simple in-memory rate limiter to prevent form abuse
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string, limit = 5, windowMs = 60 * 1000): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  
  // Keep only requests in the active window
  const activeTimestamps = timestamps.filter((t) => now - t < windowMs);
  
  if (activeTimestamps.length >= limit) {
    return true;
  }
  
  activeTimestamps.push(now);
  rateLimitMap.set(ip, activeTimestamps);
  return false;
}

/**
 * Server Action for Freight Quote Form Submission
 */
export async function submitQuoteForm(formData: any) {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";

  // 1. Rate Limiting Check
  if (isRateLimited(ip, 3, 60 * 1000)) {
    return { success: false, error: "Too many requests. Please try again in a minute." };
  }

  // 2. Validate input server-side with Zod
  const result = quoteFormSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const data = result.data;

  // 3. Honeypot check (spam protection)
  if (data.honeypot) {
    // Silently succeed to trick the bot
    console.warn(`Spam bot caught via honeypot from IP ${ip}`);
    return { success: true, spam: true };
  }

  console.log("Processing quote request:", data);

  // 4. Send Email Notification (Resend)
  let emailSent = false;
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "NBT Alerts <alerts@newbalajitransport.com>",
        to: process.env.SALES_EMAIL || "sales@newbalajitransport.com",
        subject: `New Freight Quote Request from ${data.name}`,
        html: `
          <h3>New Quote Request Received</h3>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone}</p>
          <p><strong>Route:</strong> ${data.origin} &rarr; ${data.destination}</p>
          <p><strong>Cargo Weight:</strong> ${data.weight} Tons</p>
          <p><strong>Service Type:</strong> ${data.serviceType}</p>
          <p><strong>Truck Type:</strong> ${data.truckType}</p>
          <p><strong>Message:</strong> ${data.message || "N/A"}</p>
        `,
      });
      emailSent = true;
    } catch (err) {
      console.error("Failed to send quote email:", err);
    }
  } else {
    console.log("RESEND_API_KEY not configured. Logging mock email notification.");
  }

  // 5. POST to CRM Webhook if configured
  let crmSynced = false;
  if (process.env.CRM_WEBHOOK_URL) {
    try {
      const response = await fetch(process.env.CRM_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "Quote Form",
          ipAddress: ip,
          lead: data,
          timestamp: new Date().toISOString(),
        }),
      });
      crmSynced = response.ok;
    } catch (err) {
      console.error("Failed to post lead to CRM webhook:", err);
    }
  }

  return {
    success: true,
    emailSent,
    crmSynced,
  };
}

/**
 * Server Action for Contact Us Form Submission
 */
export async function submitContactForm(formData: any) {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";

  // 1. Rate Limiting Check
  if (isRateLimited(ip, 3, 60 * 1000)) {
    return { success: false, error: "Too many requests. Please try again in a minute." };
  }

  // 2. Validate input server-side with Zod
  const result = contactFormSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const data = result.data;

  // 3. Honeypot check
  if (data.honeypot) {
    console.warn(`Spam bot caught via honeypot from IP ${ip}`);
    return { success: true, spam: true };
  }

  console.log("Processing contact inquiry:", data);

  // 4. Send Email Notification (Resend)
  let emailSent = false;
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "NBT Alerts <alerts@newbalajitransport.com>",
        to: process.env.SALES_EMAIL || "sales@newbalajitransport.com",
        subject: `New Contact Inquiry from ${data.name}`,
        html: `
          <h3>New Contact Inquiry Received</h3>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone}</p>
          <p><strong>Message:</strong> ${data.message}</p>
        `,
      });
      emailSent = true;
    } catch (err) {
      console.error("Failed to send contact email:", err);
    }
  } else {
    console.log("RESEND_API_KEY not configured. Logging mock email notification.");
  }

  // 5. POST to CRM Webhook
  let crmSynced = false;
  if (process.env.CRM_WEBHOOK_URL) {
    try {
      const response = await fetch(process.env.CRM_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "Contact Form",
          ipAddress: ip,
          lead: data,
          timestamp: new Date().toISOString(),
        }),
      });
      crmSynced = response.ok;
    } catch (err) {
      console.error("Failed to post lead to CRM webhook:", err);
    }
  }

  return {
    success: true,
    emailSent,
    crmSynced,
  };
}
