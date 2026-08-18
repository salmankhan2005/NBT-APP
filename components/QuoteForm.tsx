"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quoteFormSchema, QuoteFormValues } from "@/types/forms";
import { submitQuoteForm } from "@/app/actions";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

export default function QuoteForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema) as any,
    defaultValues: {
      origin: "",
      destination: "",
      weight: undefined as any,
      truckType: undefined as any,
      serviceType: undefined as any,
      name: "",
      phone: "",
      email: "",
      message: "",
      honeypot: "",
    },
  });

  const onSubmit = async (values: QuoteFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await submitQuoteForm(values);
      if (response.success) {
        setSuccess(true);
        reset();
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
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
        <h3 className="text-headline-md font-bold text-on-surface">Quote Request Submitted</h3>
        <p className="text-body-md text-on-surface-variant max-w-sm">
          Thank you! Our dispatch team will analyze your requirements and contact you with a competitive rate within 30 minutes.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-6 px-6 py-3 bg-secondary text-on-secondary rounded font-label-md hover:bg-secondary-container transition-colors min-h-[44px]"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-gutter gap-y-stack-md">
      {error && (
        <div className="md:col-span-2 flex items-center gap-2 p-4 bg-error-container text-on-error-container rounded text-body-sm">
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

      {/* Origin */}
      <div className="md:col-span-1">
        <label className="block text-label-sm font-label-sm text-on-surface-variant mb-2">Origin City / Pin Code</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline">location_on</span>
          <input
            type="text"
            placeholder="e.g. Mumbai, 400001"
            {...register("origin")}
            className={`w-full pl-10 pr-4 py-3 border rounded focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 text-body-md font-body-md bg-surface-container-lowest ${
              errors.origin ? "border-error" : "border-surface-container"
            }`}
          />
        </div>
        {errors.origin && <p className="text-error text-xs mt-1">{errors.origin.message}</p>}
      </div>

      {/* Destination */}
      <div className="md:col-span-1">
        <label className="block text-label-sm font-label-sm text-on-surface-variant mb-2">Destination City / Pin Code</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline">flag</span>
          <input
            type="text"
            placeholder="e.g. Delhi, 110001"
            {...register("destination")}
            className={`w-full pl-10 pr-4 py-3 border rounded focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 text-body-md font-body-md bg-surface-container-lowest ${
              errors.destination ? "border-error" : "border-surface-container"
            }`}
          />
        </div>
        {errors.destination && <p className="text-error text-xs mt-1">{errors.destination.message}</p>}
      </div>

      {/* Weight */}
      <div className="md:col-span-1">
        <label className="block text-label-sm font-label-sm text-on-surface-variant mb-2">Approximate Weight (Tons)</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline">scale</span>
          <input
            type="number"
            step="0.1"
            placeholder="e.g. 15"
            {...register("weight")}
            className={`w-full pl-10 pr-4 py-3 border rounded focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 text-body-md font-body-md bg-surface-container-lowest ${
              errors.weight ? "border-error" : "border-surface-container"
            }`}
          />
        </div>
        {errors.weight && <p className="text-error text-xs mt-1">{errors.weight.message}</p>}
      </div>

      {/* Service Type */}
      <div className="md:col-span-1">
        <label className="block text-label-sm font-label-sm text-on-surface-variant mb-2">Service Type</label>
        <div className="flex gap-3 p-1.5 border border-surface-container rounded bg-surface-container-lowest h-[48px] items-center">
          <label className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer py-1 px-2 rounded hover:bg-surface-container-low transition-colors text-[11px] sm:text-xs font-semibold text-on-surface">
            <input
              type="radio"
              value="NBT (Booking Services)"
              {...register("serviceType")}
              className="w-3.5 h-3.5 text-secondary border-outline focus:ring-secondary"
            />
            <span>NBT Booking</span>
          </label>
          <label className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer py-1 px-2 rounded hover:bg-surface-container-low transition-colors text-[11px] sm:text-xs font-semibold text-on-surface">
            <input
              type="radio"
              value="Dedicated Fleet"
              {...register("serviceType")}
              className="w-3.5 h-3.5 text-secondary border-outline focus:ring-secondary"
            />
            <span>Dedicated Fleet</span>
          </label>
        </div>
        {errors.serviceType && <p className="text-error text-xs mt-1">{errors.serviceType.message}</p>}
      </div>

      {/* Truck Type */}
      <div className="md:col-span-1">
        <label className="block text-label-sm font-label-sm text-on-surface-variant mb-2">Preferred Truck Type</label>
        <select
          {...register("truckType")}
          className={`w-full px-4 py-3 border rounded focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 text-body-md font-body-md bg-surface-container-lowest appearance-none ${
            errors.truckType ? "border-error" : "border-surface-container"
          }`}
        >
          <option value="" disabled>Select vehicle type</option>
          <option value="10-Wheeler Container Truck">10-Wheeler Container Truck</option>
          <option value="12-Wheeler Open-Body Truck">12-Wheeler Open-Body Truck</option>
          <option value="14-Wheeler Open-Body Truck">14-Wheeler Open-Body Truck</option>
          <option value="16-Wheeler Open-Body Truck">16-Wheeler Open-Body Truck</option>
        </select>
        {errors.truckType && <p className="text-error text-xs mt-1">{errors.truckType.message}</p>}
      </div>

      {/* Full Name */}
      <div className="md:col-span-1">
        <label className="block text-label-sm font-label-sm text-on-surface-variant mb-2">Full Name</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline">person</span>
          <input
            type="text"
            placeholder="Your Name"
            {...register("name")}
            className={`w-full pl-10 pr-4 py-3 border rounded focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 text-body-md font-body-md bg-surface-container-lowest ${
              errors.name ? "border-error" : "border-surface-container"
            }`}
          />
        </div>
        {errors.name && <p className="text-error text-xs mt-1">{errors.name.message}</p>}
      </div>

      {/* Email */}
      <div className="md:col-span-1">
        <label className="block text-label-sm font-label-sm text-on-surface-variant mb-2">Email Address</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline">mail</span>
          <input
            type="email"
            placeholder="name@email.com"
            {...register("email")}
            className={`w-full pl-10 pr-4 py-3 border rounded focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 text-body-md font-body-md bg-surface-container-lowest ${
              errors.email ? "border-error" : "border-surface-container"
            }`}
          />
        </div>
        {errors.email && <p className="text-error text-xs mt-1">{errors.email.message}</p>}
      </div>

      {/* Contact */}
      <div className="md:col-span-2">
        <label className="block text-label-sm font-label-sm text-on-surface-variant mb-2">Contact Number</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline">call</span>
          <input
            type="tel"
            placeholder="Mobile Number"
            {...register("phone")}
            className={`w-full pl-10 pr-4 py-3 border rounded focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 text-body-md font-body-md bg-surface-container-lowest ${
              errors.phone ? "border-error" : "border-surface-container"
            }`}
          />
        </div>
        {errors.phone && <p className="text-error text-xs mt-1">{errors.phone.message}</p>}
      </div>

      {/* Message */}
      <div className="md:col-span-2">
        <label className="block text-label-sm font-label-sm text-on-surface-variant mb-2">Message (Optional)</label>
        <textarea
          rows={2}
          placeholder="Any special requirements..."
          {...register("message")}
          className={`w-full p-4 border rounded focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 text-body-md font-body-md bg-surface-container-lowest ${
            errors.message ? "border-error" : "border-surface-container"
          }`}
        />
        {errors.message && <p className="text-error text-xs mt-1">{errors.message.message}</p>}
      </div>

      <div className="md:col-span-2 pt-4">
        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="w-full bg-tertiary-fixed-dim text-on-tertiary-fixed px-6 py-3 rounded font-label-md hover:bg-tertiary-fixed transition-all min-h-[44px] flex items-center justify-center shadow-[0_4px_12px_rgba(11,29,51,0.05)] text-lg disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Calculating...
            </>
          ) : (
            <>
              Get My Rate Estimate
              <span className="material-symbols-outlined ml-2">arrow_forward</span>
            </>
          )}
        </motion.button>
      </div>
    </form>
  );
}
