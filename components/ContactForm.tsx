"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactFormSchema, ContactFormValues } from "@/types/forms";
import { submitContactForm } from "@/app/actions";
import { Loader2 } from "lucide-react";

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
      honeypot: "",
    },
  });

  const onSubmit = async (values: ContactFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await submitContactForm(values);
      if (response.success) {
        setSuccess(true);
        reset();
      } else {
        setError(response.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 space-y-4">
        <span className="material-symbols-outlined text-[64px] text-success">check_circle</span>
        <h3 className="text-headline-md font-bold text-on-surface">Inquiry Submitted</h3>
        <p className="text-body-md text-on-surface-variant max-w-sm">
          Thank you for reaching out! Our team has received your message and will get back to you shortly.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-6 px-6 py-3 bg-secondary text-on-secondary rounded-lg font-label-md hover:bg-secondary-container transition-colors min-h-[44px]"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-stack-md">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-error-container text-on-error-container rounded-lg text-body-sm">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Honeypot field (hidden from users) */}
      <div className="hidden">
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          placeholder="Leave this empty"
          {...register("honeypot")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
        <div className="flex flex-col gap-base">
          <label className="text-label-sm font-label-sm text-on-surface-variant">Full Name</label>
          <input
            {...register("name")}
            className={`w-full h-11 px-3 border rounded-lg focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-body-md ${
              errors.name ? "border-error" : "border-surface-variant"
            }`}
            placeholder="John Doe"
            type="text"
          />
          {errors.name && <p className="text-error text-xs">{errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-base">
          <label className="text-label-sm font-label-sm text-on-surface-variant">Email Address</label>
          <input
            {...register("email")}
            className={`w-full h-11 px-3 border rounded-lg focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-body-md ${
              errors.email ? "border-error" : "border-surface-variant"
            }`}
            placeholder="john@example.com"
            type="email"
          />
          {errors.email && <p className="text-error text-xs">{errors.email.message}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-base">
        <label className="text-label-sm font-label-sm text-on-surface-variant">Phone Number</label>
        <input
          {...register("phone")}
          className={`w-full h-11 px-3 border rounded-lg focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-body-md ${
            errors.phone ? "border-error" : "border-surface-variant"
          }`}
          placeholder="+91 98765 43210"
          type="tel"
        />
        {errors.phone && <p className="text-error text-xs">{errors.phone.message}</p>}
      </div>

      <div className="flex flex-col gap-base">
        <label className="text-label-sm font-label-sm text-on-surface-variant">Message</label>
        <textarea
          {...register("message")}
          className={`w-full p-3 border rounded-lg focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-body-md min-h-[120px] ${
            errors.message ? "border-error" : "border-surface-variant"
          }`}
          placeholder="How can we help you?"
        ></textarea>
        {errors.message && <p className="text-error text-xs">{errors.message.message}</p>}
      </div>

      <button
        disabled={isSubmitting}
        className="w-full h-11 mt-base bg-secondary text-on-secondary rounded-lg text-label-md font-label-md hover:bg-secondary-container transition-all flex items-center justify-center disabled:opacity-50"
        type="submit"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Sending Message...
          </>
        ) : (
          "Submit Inquiry"
        )}
      </button>
    </form>
  );
}
