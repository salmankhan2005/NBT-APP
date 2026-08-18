import { z } from "zod";

// India phone number regex: allows optional country code (+91 or 91) and 10 digits
const phoneRegex = /^(?:\+91|91)?[6789]\d{9}$/;

export const quoteFormSchema = z.object({ // wait, z.object is the standard zod syntax!
  // Let's write the correct zod schema syntax: z.object({...})
  // Wait, let's write it carefully.
  origin: z.string().min(3, "Origin must be at least 3 characters").max(100),
  destination: z.string().min(3, "Destination must be at least 3 characters").max(100),
  weight: z.coerce.number().positive("Weight must be greater than 0"),
  truckType: z.enum([
    "10-Wheeler Container Truck",
    "12-Wheeler Open-Body Truck",
    "14-Wheeler Open-Body Truck",
    "16-Wheeler Open-Body Truck",
  ]),
  serviceType: z.enum([
    "NBT (Booking Services)",
    "Dedicated Fleet",
  ]),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(phoneRegex, "Please enter a valid 10-digit Indian phone number"),
  email: z.string().email("Please enter a valid email address"),
  message: z.string().optional(),
  honeypot: z.string().max(0, { message: "Spam detected" }).optional(), // Honeypot spam protection
});

export const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().regex(phoneRegex, "Please enter a valid 10-digit Indian phone number"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  honeypot: z.string().max(0, { message: "Spam detected" }).optional(), // Honeypot spam protection
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;
export type ContactFormValues = z.infer<typeof contactFormSchema>;
