import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-primary-container dark:bg-primary w-full bottom-0 flat text-on-primary-container dark:text-primary-fixed border-t border-white/10 mt-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-lg w-full px-margin-mobile md:px-margin-desktop py-stack-lg max-w-container-max mx-auto text-on-primary-container dark:text-primary-fixed">
        <div className="flex flex-col gap-stack-sm">
          <div className="text-headline-md font-headline-md font-bold text-on-primary dark:text-primary-fixed-dim mb-4">
            New Balaji Transports
          </div>
          <p className="text-body-sm font-body-sm opacity-80 mb-6 text-on-primary dark:text-primary-fixed">
            Asset-based interstate logistics and heavy-haul transport for commercial cargo, agricultural produce and industrial freight across India.
          </p>
          <p className="text-label-sm font-label-sm opacity-60 text-on-primary dark:text-primary-fixed">
            © {new Date().getFullYear()} New Balaji Transports. All rights reserved.
          </p>
        </div>
        <div className="flex flex-col md:items-end justify-start gap-3 text-label-sm font-label-sm">
          <Link href="/" className="text-on-primary/80 dark:text-outline-variant hover:text-on-primary hover:underline transition-all">Home</Link>
          <Link href="/services" className="text-on-primary/80 dark:text-outline-variant hover:text-on-primary hover:underline transition-all">Services</Link>
          <Link href="/compliance" className="text-on-primary/80 dark:text-outline-variant hover:text-on-primary hover:underline transition-all">Business Details</Link>
          <Link href="/contact" className="text-on-primary/80 dark:text-outline-variant hover:text-on-primary hover:underline transition-all">Contact</Link>
          <Link href="/tracking" className="text-on-primary/80 dark:text-outline-variant hover:text-on-primary hover:underline transition-all">Track Shipment</Link>
        </div>
      </div>
    </footer>
  );
}
