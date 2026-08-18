"use client";

import { motion } from "framer-motion";
import QuoteForm from "@/components/QuoteForm";

export default function QuoteSectionClient() {
  return (
    <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop grid grid-cols-1 lg:grid-cols-12 gap-stack-lg">
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, type: "spring", stiffness: 100, damping: 15 }}
        className="lg:col-span-5 flex flex-col justify-center"
      >
        <h2 className="text-headline-lg font-headline-lg text-on-surface mb-4">
          Request a Freight Quote
        </h2>
        <p className="text-body-md font-body-md text-on-surface-variant mb-8">
          Get accurate pricing for your logistical needs. Our dispatch team will analyze your
          requirements and provide a competitive rate within 30 minutes.
        </p>
        <div className="bg-secondary-fixed/20 p-6 rounded-lg border border-secondary-fixed/50">
          <div className="flex items-start gap-4">
            <span className="material-symbols-outlined text-secondary mt-1">support_agent</span>
            <div>
              <h4 className="text-label-md font-label-md text-on-surface mb-1">
                Need immediate assistance?
              </h4>
              <p className="text-body-sm font-body-sm text-on-surface-variant">
                Call our 24/7 Operations Center at <br />
                <strong>+91 98765 43210</strong>
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, type: "spring", stiffness: 100, damping: 15 }}
        className="lg:col-span-7 bg-surface-container-lowest p-6 md:p-8 rounded-xl shadow-sm border border-surface-container"
      >
        <QuoteForm />
      </motion.div>
    </div>
  );
}
